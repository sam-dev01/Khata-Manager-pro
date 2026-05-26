/**
 * Electron Preload Script
 *
 * Runs in an isolated context BEFORE the renderer page loads.
 * Uses contextBridge to safely expose ONLY the IPC channels the app needs —
 * nothing else from Node/Electron is accessible to the renderer.
 *
 * Security: nodeIntegration is OFF and contextIsolation is ON in main.js.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Save a backup file to disk (Electron userData directory).
     * @param {string} fileName
     * @param {object} data
     */
    backupSave: (fileName, data) =>
        ipcRenderer.invoke('backup-save', { fileName, data }),

    /**
     * List all existing backup files.
     * @returns {Promise<Array<{name: string, size: number, created: Date}>>}
     */
    backupList: () =>
        ipcRenderer.invoke('backup-list'),

    /**
     * Load a backup file by name and return parsed JSON.
     * @param {string} fileName
     * @returns {Promise<object>}
     */
    backupLoad: (fileName) =>
        ipcRenderer.invoke('backup-load', fileName),
});
