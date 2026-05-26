// src/utils/storage.js
import { ref, get, set, update } from "firebase/database";
import { database, auth } from "../firebase";

// ----------------- Helpers -----------------
export function sanitizeShopId(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return s.length > 0 ? s : null;
}

export function randomSalt(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export async function sha256Hex(str) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("crypto.subtle not available for hashing");
  }
  const enc = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyShopPassword(passwordCandidate, salt, storedHash) {
  if (!passwordCandidate || !salt || !storedHash) return false;
  try {
    const candidateHash = await sha256Hex(passwordCandidate + salt);
    return candidateHash === storedHash;
  } catch (err) {
    console.error("verifyShopPassword error", err);
    return false;
  }
}

// ----------------- Shop Meta functions -----------------

export const loadShopMeta = async (shopId) => {
  const sid = sanitizeShopId(shopId);
  if (!sid) return null;
  try {
    const pubRef = ref(database, `shopIndex/${sid}`);
    const pubSnap = await get(pubRef);
    if (pubSnap.exists()) {
      const pub = pubSnap.val() || {};
      const publicMeta = {
        id: sid,
        name: pub.name || sid,
        ownerUid: pub.ownerUid || null,
        createdAt: pub.createdAt || null,
        protected: !!pub.protected
      };
      if (!publicMeta.protected) return publicMeta;
      try {
        const privRef = ref(database, `shops/${sid}`);
        const privSnap = await get(privRef);
        if (privSnap.exists()) {
          const priv = privSnap.val() || {};
          return {
            ...publicMeta,
            name: priv.name || publicMeta.name,
            passwordHash: priv.passwordHash || null,
            salt: priv.salt || null
          };
        }
        return publicMeta;
      } catch (innerErr) {
        return publicMeta;
      }
    }
    const fallbackRef = ref(database, `shops/${sid}`);
    const fallbackSnap = await get(fallbackRef);
    return fallbackSnap.exists() ? fallbackSnap.val() : null;
  } catch (err) {
    console.error("loadShopMeta error", err);
    return null;
  }
};

export const createNewShop = async (shopName, password = null, options = {}) => {
  try {
    let currentUser = auth && auth.currentUser;
    // Fallback for offline usage or restricted auth
    if (!currentUser) {
      console.warn("createNewShop: No currentUser. Proceeding in Offline/Local Mode.");
      currentUser = { uid: "local_" + Date.now() }; // Fake UID
    }

    const shopId = options.shopId ? sanitizeShopId(options.shopId) : `shop_${Date.now()}`;
    const now = Date.now();
    let salt = null;
    let passwordHash = null;
    if (password) {
      salt = randomSalt(16);
      passwordHash = await sha256Hex(password + salt);
    }
    const shopMeta = {
      name: shopName,
      createdAt: now,
      ownerUid: currentUser.uid,
      ...(passwordHash ? { passwordHash, salt } : {})
    };

    // Attempt Firebase Write
    // WE MUST THROW if this fails, so the user knows their shop isn't on the cloud.
    await set(ref(database, `shops/${shopId}`), shopMeta);
    await set(ref(database, `shops/${shopId}/data`), {
      customers: {},
      transactions: {},
      promises: {},
      calls: {},
      lastUpdated: now
    });
    await set(ref(database, `shopIndex/${shopId}`), {
      name: shopName,
      ownerUid: currentUser.uid,
      createdAt: now,
      protected: !!passwordHash
    });

    return { success: true, shopId, shopName };
  } catch (err) {
    console.error("createNewShop error", err);
    throw err; // Re-throw to UI
  }
};

export const getPublicShopList = async () => {
  try {
    const idxRef = ref(database, `shopIndex`);
    const snap = await get(idxRef);
    return snap.exists() ? snap.val() : {};
  } catch (err) {
    console.error("getPublicShopList error", err);
    return {};
  }
};

export const updatePublicIndex = async (shopId, payload) => {
  try {
    const idxRef = ref(database, `shopIndex/${sanitizeShopId(shopId)}`);
    await update(idxRef, payload);
    return { success: true };
  } catch (err) {
    console.error("updatePublicIndex error", err);
    return { success: false, error: err.message };
  }
};

// ----------------- Backup / Data helpers -----------------

export const exportData = async () => {
  try {
    // If shop is selected, export local shop data? 
    // Or full root? BackupRestore usage suggests full export of current shop context via database root dump is risky.
    // But aligning with previous impl:
    const rootRef = ref(database, "/");
    const snap = await get(rootRef);
    return snap.exists() ? snap.val() : {};
  } catch (err) {
    console.error("exportData error", err);
    return {};
  }
};

export const loadData = async () => {
  try {
    const shopId = localStorage.getItem('current_shop_id');
    if (!shopId) return null;
    const dataRef = ref(database, `shops/${shopId}/data`);
    const snap = await get(dataRef);
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.error("loadData error", err);
    return null;
  }
};

export const importData = async (data) => {
  try {
    const shopId = localStorage.getItem('current_shop_id');
    if (!shopId) return { success: false, message: 'No shop selected' };

    // Direct overwrite of shop data
    await set(ref(database, `shops/${shopId}/data`), {
      customers: data.customers || {},
      transactions: data.transactions || {},
      promises: data.promises || {},
      calls: data.calls || {},
      products: data.products || [],
      suppliers: data.suppliers || [],
      invoices: data.invoices || [],
      expenses: data.expenses || [],
      workers: data.workers || [],
      lastUpdated: Date.now()
    });
    return { success: true };
  } catch (err) {
    console.error("importData error", err);
    return { success: false, error: err.message };
  }
};

export const getCurrentShopInfo = () => {
  return {
    shopName: localStorage.getItem('current_shop_name'),
    shopId: localStorage.getItem('current_shop_id')
  };
};

export const exportShops = async () => {
  try {
    const idxRef = ref(database, "shopIndex");
    const shopsRef = ref(database, "shops");
    const [idxSnap, shopsSnap] = await Promise.all([get(idxRef), get(shopsRef)]);
    return {
      shopIndex: idxSnap.exists() ? idxSnap.val() : {},
      shops: shopsSnap.exists() ? shopsSnap.val() : {}
    };
  } catch (err) {
    console.error("exportShops error", err);
    throw err;
  }
};
