const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 820,
    minWidth: 380,
    minHeight: 700,
    title: "Spark Dating App",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Hide the default system menu bar to give a standalone mobile-mockup look
  win.setMenuBarVisibility(false);

  // Auto-grant media permissions (webcam, mic) for video call operations
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Load from local FastAPI backend. Falls back to offline file url if offline.
  win.loadURL('http://localhost:8000/').catch(() => {
    console.warn("FastAPI server offline. Loading frontend assets from file structure.");
    win.loadFile(path.join(__dirname, '../index.html'));
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
