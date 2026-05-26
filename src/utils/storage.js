// src/utils/storage.js
import { ref, get, set, update } from "firebase/database";
import { database, auth } from "../firebase";
import { db } from "../db/db";

const DATA_COLLECTIONS = [
  "customers",
  "transactions",
  "promises",
  "calls",
  "products",
  "suppliers",
  "invoices",
  "payments",
  "expenses",
  "workers"
];

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
};

const getSettingsKeys = (shopId) => ({
  shopName: 'current_shop_name',
  address: `shop_${shopId}_address`,
  phone: `shop_${shopId}_phone`,
  email: `shop_${shopId}_email`,
  gst: `shop_${shopId}_gst`,
  logo: `shop_${shopId}_logo`,
  signature: `shop_${shopId}_signature`,
  billSettings: `shop_${shopId}_bill_settings`
});

const readLocalSettings = (shopId) => {
  const keys = getSettingsKeys(shopId);
  const legacy = (key) => localStorage.getItem(`${key} `);
  const read = (key) => localStorage.getItem(key) || legacy(key) || '';
  return {
    shopName: read(keys.shopName),
    shopAddress: read(keys.address),
    shopPhone: read(keys.phone),
    shopEmail: read(keys.email),
    shopGst: read(keys.gst),
    logo: read(keys.logo),
    signature: read(keys.signature),
    billSettings: JSON.parse(localStorage.getItem(keys.billSettings) || legacy(keys.billSettings) || '{}')
  };
};

const writeLocalSettings = (shopId, settings = {}) => {
  const keys = getSettingsKeys(shopId);
  if (settings.shopName !== undefined) localStorage.setItem(keys.shopName, settings.shopName || '');
  if (settings.shopAddress !== undefined) localStorage.setItem(keys.address, settings.shopAddress || '');
  if (settings.shopPhone !== undefined) localStorage.setItem(keys.phone, settings.shopPhone || '');
  if (settings.shopEmail !== undefined) localStorage.setItem(keys.email, settings.shopEmail || '');
  if (settings.shopGst !== undefined) localStorage.setItem(keys.gst, settings.shopGst || '');
  if (settings.logo !== undefined) localStorage.setItem(keys.logo, settings.logo || '');
  if (settings.signature !== undefined) localStorage.setItem(keys.signature, settings.signature || '');
  if (settings.billSettings !== undefined) {
    localStorage.setItem(keys.billSettings, JSON.stringify(settings.billSettings || {}));
  }
};

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
    const shopId = localStorage.getItem('current_shop_id');
    const shopName = localStorage.getItem('current_shop_name');
    if (!shopId) return {};

    const exported = {
      meta: {
        shopId,
        shopName,
        exportedAt: Date.now(),
        version: '3.0'
      },
      settings: readLocalSettings(shopId)
    };

    for (const collection of DATA_COLLECTIONS) {
      if (db.tables.some(table => table.name === collection)) {
        exported[collection] = await db.table(collection)
          .where('shopId')
          .equals(shopId)
          .toArray();
      }
    }

    return exported;
  } catch (err) {
    console.error("exportData error", err);
    return {};
  }
};

export const loadData = async () => {
  try {
    const shopId = localStorage.getItem('current_shop_id');
    if (!shopId) return null;
    const dataRef = ref(database, `firms/${shopId}/data`);
    const snap = await get(dataRef);
    const settingsSnap = await get(ref(database, `firms/${shopId}/settings`));
    if (!snap.exists() && !settingsSnap.exists()) return null;

    const cloudData = snap.exists() ? snap.val() : {};
    const loaded = DATA_COLLECTIONS.reduce((acc, collection) => {
      acc[collection] = asArray(cloudData[collection]);
      return acc;
    }, {});
    loaded.settings = settingsSnap.exists() ? settingsSnap.val() : {};
    return loaded;
  } catch (err) {
    console.error("loadData error", err);
    return null;
  }
};

export const importData = async (data) => {
  try {
    const shopId = localStorage.getItem('current_shop_id');
    if (!shopId) return { success: false, message: 'No shop selected' };

    if (data.settings) {
      writeLocalSettings(shopId, data.settings);
    }

    const cloudPayload = {};
    for (const collection of DATA_COLLECTIONS) {
      if (!db.tables.some(table => table.name === collection)) continue;

      const items = asArray(data[collection]).map(item => ({
        ...item,
        shopId,
        synced: 0
      }));

      await db.table(collection)
        .where('shopId')
        .equals(shopId)
        .delete();

      if (items.length > 0) {
        await db.table(collection).bulkPut(items);
        cloudPayload[collection] = items.reduce((acc, item) => {
          const { synced, ...payload } = item;
          acc[item.id] = payload;
          return acc;
        }, {});
      } else {
        cloudPayload[collection] = null;
      }
    }

    await set(ref(database, `firms/${shopId}/data`), cloudPayload);
    if (data.settings) {
      await set(ref(database, `firms/${shopId}/settings`), data.settings);
    }
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
