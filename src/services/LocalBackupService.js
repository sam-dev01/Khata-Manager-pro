// src/services/LocalBackupService.js
//
// Uses window.electronAPI (exposed by electron/preload.js via contextBridge).
// This pattern is secure: nodeIntegration is OFF, contextIsolation is ON.
// The renderer never has direct access to Node.js or Electron internals.

/**
 * Returns true if running inside Electron (window.electronAPI is injected by preload.js).
 */
const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

export const LocalBackupService = {
    isAvailable: () => isElectron(),

    /**
     * Save a backup file to the Electron userData/backups directory.
     * @param {string} fileName
     * @param {object} data
     */
    saveBackup: async (fileName, data) => {
        if (!isElectron()) return { success: false, error: 'Not in Electron' };
        try {
            return await window.electronAPI.backupSave(fileName, data);
        } catch (err) {
            console.error('LocalBackupService save error', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * List all backup files in the userData/backups directory.
     * @returns {Promise<Array<{name: string, size: number, created: Date}>>}
     */
    listBackups: async () => {
        if (!isElectron()) return [];
        try {
            return await window.electronAPI.backupList();
        } catch (err) {
            console.error('LocalBackupService list error', err);
            return [];
        }
    },

    /**
     * Load and parse a backup file by name.
     * @param {string} fileName
     * @returns {Promise<object>}
     */
    loadBackup: async (fileName) => {
        if (!isElectron()) throw new Error('Not in Electron');
        return await window.electronAPI.backupLoad(fileName);
    },
};
