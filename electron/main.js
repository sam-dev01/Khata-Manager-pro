const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removing squirrel startup check as the package is not installed and not critical for this portable usage

const isDev = !app.isPackaged;

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,       // ✅ SECURITY: renderer cannot access Node APIs
            contextIsolation: true,        // ✅ SECURITY: isolate preload from renderer world
            preload: path.join(__dirname, 'preload.js'), // ✅ Expose only whitelisted IPC channels
        },
        icon: path.join(__dirname, '../public/favicon.ico')
    });

    if (isDev) {
        // In dev, load the vite server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // In prod, load the built file
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// --- BACKUP LOGIC ---
const { ipcMain } = require('electron');
const fs = require('fs');

const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

// Ensure Backup Dir Exists
if (!fs.existsSync(BACKUP_DIR)) {
    try { fs.mkdirSync(BACKUP_DIR, { recursive: true }); } catch (e) { console.error("Backup Setup Failed", e); }
}

ipcMain.handle('backup-save', async (event, { fileName, data }) => {
    try {
        const filePath = path.join(BACKUP_DIR, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        // Retention Policy: Keep last 20
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time); // Newest first

        if (files.length > 20) {
            const toDelete = files.slice(20);
            toDelete.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f.name)));
        }

        return { success: true, path: filePath };
    } catch (err) {
        console.error("Backup Save Failed", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('backup-list', async () => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return [];
        return fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return { name: f, size: stats.size, created: stats.mtime };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (err) {
        return [];
    }
});

ipcMain.handle('backup-load', async (event, fileName) => {
    try {
        const filePath = path.join(BACKUP_DIR, fileName);
        if (!fs.existsSync(filePath)) throw new Error("File not found");
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        throw err;
    }
});

