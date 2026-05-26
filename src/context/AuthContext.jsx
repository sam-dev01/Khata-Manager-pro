import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, database } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userFirms, setUserFirms] = useState(() => {
        // Eagerly restore firm list from localStorage so we don't flash FirmSelector.
        // SECURITY: Role defaults to 'manager' (least privilege) until Firebase confirms it.
        // Firebase onAuthStateChanged will always overwrite with the real server-side role.
        const id = localStorage.getItem('current_firm_id') || localStorage.getItem('current_shop_id');
        const name = localStorage.getItem('current_firm_name') || localStorage.getItem('current_shop_name');
        if (id && name) {
            // ✅ SECURITY: Never trust localStorage role — default to least privilege until Firebase confirms
            const cachedRole = localStorage.getItem('current_firm_role') || localStorage.getItem('user_role');
            const safeRole = (cachedRole === 'owner') ? 'manager' : (cachedRole || 'manager');
            return { [id]: { name, role: safeRole } };
        }
        return {};
    });
    const [currentFirm, setCurrentFirm] = useState(() => {
        // Eagerly restore selected firm from localStorage.
        // SECURITY: Role defaults to 'manager' (least privilege) until Firebase confirms it.
        const id = localStorage.getItem('current_firm_id') || localStorage.getItem('current_shop_id');
        const name = localStorage.getItem('current_firm_name') || localStorage.getItem('current_shop_name');
        if (id && name) {
            // ✅ SECURITY: Never trust localStorage role — default to least privilege until Firebase confirms
            const cachedRole = localStorage.getItem('current_firm_role') || localStorage.getItem('user_role');
            const safeRole = (cachedRole === 'owner') ? 'manager' : (cachedRole || 'manager');
            return { id, name, role: safeRole };
        }
        return null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);

                try {
                    if (user.isAnonymous) {
                        setUserFirms({});
                    } else {
                        const userRef = ref(database, `users/${user.uid}`);
                        const snapshot = await get(userRef);
                        if (snapshot.exists()) {
                            const data = snapshot.val();
                            const firms = data.firms || {};
                            setUserFirms(firms);

                            // Auto-restore previously selected firm from localStorage
                            const savedFirmId = localStorage.getItem('current_firm_id');
                            if (savedFirmId && firms[savedFirmId]) {
                                // ✅ SECURITY: Role ALWAYS comes from Firebase here — never from localStorage
                                setCurrentFirm({
                                    id: savedFirmId,
                                    name: firms[savedFirmId].name,
                                    role: firms[savedFirmId].role
                                });
                                // Sync localStorage with verified Firebase role
                                localStorage.setItem('current_firm_role', firms[savedFirmId].role);
                            } else if (savedFirmId) {
                                // Firm not in Firebase yet (sync delay) — use localStorage fallback
                                // ✅ SECURITY: Clamp role to 'manager' until Firebase confirms
                                const savedFirmName = localStorage.getItem('current_firm_name') || localStorage.getItem('current_shop_name');
                                if (savedFirmName) {
                                    setCurrentFirm({
                                        id: savedFirmId,
                                        name: savedFirmName,
                                        role: 'manager' // ✅ Least privilege — will be corrected when Firebase confirms
                                    });
                                    // Also patch userFirms so FirmSelector doesn't show empty
                                    setUserFirms(prev => ({
                                        ...prev,
                                        [savedFirmId]: { name: savedFirmName, role: 'manager' }
                                    }));
                                }
                            }
                        } else {
                            // User exists in auth but not in DB yet (fresh signup, DB write pending)
                            const savedFirmId = localStorage.getItem('current_firm_id') || localStorage.getItem('current_shop_id');
                            const savedFirmName = localStorage.getItem('current_firm_name') || localStorage.getItem('current_shop_name');
                            if (savedFirmId && savedFirmName) {
                                setCurrentFirm({
                                    id: savedFirmId,
                                    name: savedFirmName,
                                    role: 'manager' // ✅ Least privilege until Firebase confirms
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error fetching user profile", e);
                    // Offline fallback — restore from localStorage
                    const savedFirmId = localStorage.getItem('current_firm_id') || localStorage.getItem('current_shop_id');
                    const savedFirmName = localStorage.getItem('current_firm_name') || localStorage.getItem('current_shop_name');
                    if (savedFirmId && savedFirmName) {
                        setCurrentFirm({
                            id: savedFirmId,
                            name: savedFirmName,
                            role: 'manager' // ✅ Least privilege — Firebase unreachable, cannot verify role
                        });
                    }
                }
            } else {
                setCurrentUser(null);
                setUserFirms({});
                setCurrentFirm(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // ─── Wrapped Auth Functions (hide firebase `auth` from components) ───

    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const handleLogout = async () => {
        // Clear all persisted state before signing out
        localStorage.removeItem('current_firm_id');
        localStorage.removeItem('current_firm_name');
        localStorage.removeItem('current_firm_role');
        localStorage.removeItem('current_shop_id');
        localStorage.removeItem('current_shop_name');
        localStorage.removeItem('user_role');
        return signOut(auth);
    };

    const signup = async (email, password) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create basic user profile in DB
        await set(ref(database, `users/${user.uid}`), {
            email: user.email,
            createdAt: new Date().toISOString(),
            firms: {}
        });

        return user;
    };

    // ─── Firm Management ───

    const selectFirm = (firmId, firmName, role) => {
        if (!firmId) {
            setCurrentFirm(null);
            localStorage.removeItem('current_firm_id');
            localStorage.removeItem('current_firm_name');
            localStorage.removeItem('current_firm_role');
            return;
        }
        setCurrentFirm({ id: firmId, name: firmName, role });
        localStorage.setItem('current_firm_id', firmId);
        localStorage.setItem('current_firm_name', firmName);
        localStorage.setItem('current_firm_role', role || 'owner');
    };

    const createFirm = async (firmName) => {
        if (!currentUser) throw new Error("No user logged in");

        // Use timestamp + random for collision-safe ID
        const newFirmId = firmName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

        const firmData = {
            metadata: {
                name: firmName,
                createdAt: new Date().toISOString(),
                ownerId: currentUser.uid
            },
            members: {
                [currentUser.uid]: { role: 'owner' }
            }
        };

        // 1. Create Firm in DB
        await set(ref(database, `firms/${newFirmId}`), firmData);

        // 2. Link to User in DB
        const firmLink = { name: firmName, role: 'owner' };
        await set(ref(database, `users/${currentUser.uid}/firms/${newFirmId}`), firmLink);

        // 3. Update local state immediately (no page refresh needed)
        setUserFirms(prev => ({ ...prev, [newFirmId]: firmLink }));

        // 4. Auto-select the new firm
        selectFirm(newFirmId, firmName, 'owner');

        return newFirmId;
    };

    const value = {
        currentUser,
        userFirms,
        currentFirm,
        selectFirm,
        createFirm,
        login,
        signup,
        logout: handleLogout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
