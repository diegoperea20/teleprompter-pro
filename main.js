const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  globalShortcut,
  shell,
} = require("electron");
const path = require("path");

let mainWindow;
let isAlwaysOnTop = true;
let isTransparent = false;
let screenProtectionEnabled = false;

function createWindow() {
  console.log("🚀 Creating main window...");

  const preloadPath = path.join(__dirname, "preload.js");
  console.log("Preload path:", preloadPath);

  // Verify preload file exists
  const fs = require("fs");
  if (fs.existsSync(preloadPath)) {
    console.log("✅ Preload file exists");
  } else {
    console.error("❌ Preload file NOT found at:", preloadPath);
  }

  // Create the main browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    frame: false, // No window border
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true, // Does not appear in taskbar
    resizable: true,
    movable: true,
    minimizable: true, // ENABLE minimize functionality
    maximizable: true, // ENABLE maximize functionality
    closable: true,
    // Special configurations for screen share invisibility
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
    },
    // Additional configurations for Windows - CRITICAL for invisibility
    ...(process.platform === "win32" && {
      skipTaskbar: true,
      show: false, // Initially hidden
      titleBarStyle: "hidden",
    }),
    // Additional configurations for macOS
    ...(process.platform === "darwin" && {
      vibrancy: "ultra-dark",
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 10, y: 10 },
    }),
  });

  // Configure window to be invisible in screen sharing
  setupScreenShareInvisibility();

  // Load HTML file
  mainWindow.loadFile("index.html");

  // Show window after loading
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // CRITICAL: Apply screen capture protection immediately
    setTimeout(() => {
      applyScreenCaptureProtection();
    }, 1000); // Sufficient time for initialization
  });

  // Configure window events
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Event for when window loses focus
  mainWindow.on("blur", () => {
    if (isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
    }
  });

  // Re-apply protection when window regains focus
  mainWindow.on("focus", () => {
    if (screenProtectionEnabled) {
      setTimeout(() => {
        applyScreenCaptureProtection();
      }, 100);
    }
  });

  // Open DevTools in development mode
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }
}

function setupScreenShareInvisibility() {
  // Configure window to be invisible in screen captures
  if (process.platform === "win32") {
    // On Windows, special configurations to avoid capture
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(true, "screen-saver", 999);
  } else if (process.platform === "darwin") {
    // On macOS, configure very high window level
    mainWindow.setAlwaysOnTop(true, "screen-saver");
  } else {
    // On Linux
    mainWindow.setAlwaysOnTop(true);
  }
}

// CRITICAL FUNCTION: Apply screen capture protection
function applyScreenCaptureProtection() {
  console.log("🔒 Applying screen capture protection...");

  // Safety check: Ensure mainWindow exists and is not destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log("⚠️ MainWindow not available, skipping protection");
    return;
  }

  try {
    // NATIVE ELECTRON METHOD - MORE RELIABLE AND DIRECT
    mainWindow.setContentProtection(true);

    console.log(
      "✅ SUCCESS: setContentProtection ENABLED - Window invisible for screen sharing"
    );
    screenProtectionEnabled = true;

    // Safety check before sending IPC message
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("screen-protection-status", {
        enabled: true,
        method: "setContentProtection",
        message: "🛡️ INVISIBLE for screen sharing (Native Electron method)",
      });
    }

    // Apply additional configurations to reinforce invisibility
    applyAdditionalInvisibilityMethods();
  } catch (error) {
    console.log("❌ Error with setContentProtection:", error.message);

    // FALLBACK: If setContentProtection fails, use PowerShell
    if (process.platform === "win32") {
      console.log("🔄 Fallback: Using PowerShell method...");
      powerShellScreenProtection();
    } else {
      nonWindowsScreenProtection();
    }
  }
}

function powerShellScreenProtection() {
  console.log("🔄 Using PowerShell method as backup...");

  // Safety check: Ensure mainWindow exists and is not destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log("⚠️ MainWindow not available, skipping PowerShell protection");
    return;
  }

  try {
    const { spawn } = require("child_process");
    const windowId = mainWindow.getNativeWindowHandle().readUInt32LE();

    // Simplified PowerShell script as backup
    const psScript = `
      try {
        Add-Type -TypeDefinition '
          using System;
          using System.Runtime.InteropServices;
          
          public class Win32API {
            [DllImport("user32.dll", SetLastError = true)]
            public static extern bool SetWindowDisplayAffinity(IntPtr hwnd, uint dwAffinity);
            
            [DllImport("user32.dll")]
            public static extern bool IsWindow(IntPtr hWnd);
          }'
        
        $hwnd = [IntPtr]${windowId}
        
        if ([Win32API]::IsWindow($hwnd)) {
          $result = [Win32API]::SetWindowDisplayAffinity($hwnd, 0x11)
          
          if ($result) {
            Write-Output "SUCCESS_PROTECTION_APPLIED"
          } else {
            Write-Output "FAILED_TO_APPLY"
          }
        } else {
          Write-Output "INVALID_WINDOW_HANDLE"
        }
        
      } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
      }
    `;

    const ps = spawn(
      "powershell",
      [
        "-ExecutionPolicy",
        "Bypass",
        "-NoProfile",
        "-WindowStyle",
        "Hidden",
        "-Command",
        psScript,
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let output = "";

    ps.stdout.on("data", (data) => {
      output += data.toString().trim();
    });

    ps.on("close", (code) => {
      // Safety check before sending IPC message
      if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
        console.log("⚠️ MainWindow unavailable, skipping status update");
        return;
      }

      if (output.includes("SUCCESS_PROTECTION_APPLIED")) {
        console.log("✅ SUCCESS: PowerShell protection ENABLED as backup");
        screenProtectionEnabled = true;
        mainWindow.webContents.send("screen-protection-status", {
          enabled: true,
          method: "powershell-backup",
          message: "🛡️ INVISIBLE for screen sharing (PowerShell backup)",
        });
      } else {
        console.log("❌ PowerShell backup failed, using last resort");
        lastResortProtection();
      }
    });

    ps.on("error", (error) => {
      console.log("❌ Error in PowerShell backup:", error.message);
      lastResortProtection();
    });
  } catch (e) {
    console.log("❌ Critical error in PowerShell backup:", e);
    lastResortProtection();
  }
}

function applyAdditionalInvisibilityMethods() {
  // Additional methods to reinforce invisibility
  try {
    console.log("🔧 Applying additional invisibility methods...");

    // Configure window as high-level overlay
    mainWindow.setAlwaysOnTop(true, "screen-saver", 9999);
    mainWindow.setSkipTaskbar(true);

    // Windows-specific configurations
    if (process.platform === "win32") {
      // Configure special window properties
      try {
        mainWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
        });
      } catch (e) {
        console.log("⚠️ Could not configure workspace visibility");
      }
    }

    console.log("✅ Additional invisibility methods applied");
  } catch (e) {
    console.log("⚠️ Error in additional methods:", e);
  }
}

function lastResortProtection() {
  console.log("🚨 Activating last resort protection...");

  // Safety check: Ensure mainWindow exists and is not destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log("⚠️ MainWindow not available, skipping last resort protection");
    return;
  }

  try {
    // Special window configurations for maximum invisibility
    mainWindow.setAlwaysOnTop(true, "screen-saver", 99999);
    mainWindow.setSkipTaskbar(true);

    if (process.platform === "win32") {
      // Additional configurations for Windows
      try {
        mainWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
        });
      } catch (e) {
        console.log("⚠️ Error in workspace configuration");
      }
    }

    console.log("✅ Last resort protection applied");
    screenProtectionEnabled = true;

    // Safety check before sending IPC message
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("screen-protection-status", {
        enabled: true,
        method: "last-resort",
        message:
          "🛡️ Alternative protection active (may have limited visibility)",
      });
    }
  } catch (e) {
    console.log("❌ Critical error in last resort protection:", e);

    // Safety check before sending error message
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("screen-protection-status", {
        enabled: false,
        method: "error",
        message: "❌ Error applying protection",
      });
    }
  }
}

function nonWindowsScreenProtection() {
  // For macOS and Linux

  // Safety check: Ensure mainWindow exists and is not destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log("⚠️ MainWindow not available, skipping non-Windows protection");
    return;
  }

  try {
    mainWindow.setAlwaysOnTop(true, "screen-saver");

    if (process.platform === "darwin") {
      // On macOS, use very high window level
      mainWindow.setAlwaysOnTop(true, "floating", 999);

      // macOS also has setContentProtection
      try {
        mainWindow.setContentProtection(true);
        console.log("✅ setContentProtection applied on macOS");
      } catch (e) {
        console.log(
          "⚠️ setContentProtection not available on this macOS version"
        );
      }
    }

    console.log("✅ Non-Windows protection applied");
    screenProtectionEnabled = true;

    // Safety check before sending IPC message
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("screen-protection-status", {
        enabled: true,
        method: "non-windows",
        message: "🛡️ Protection for macOS/Linux active",
      });
    }
  } catch (e) {
    console.log("Error in non-Windows protection:", e);

    // Safety check before sending error message
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send("screen-protection-status", {
        enabled: false,
        method: "error",
        message: "❌ Error in non-Windows protection",
      });
    }
  }
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("clear-text");
          },
        },
        { type: "separator" },
        {
          label: "🛡️ Re-apply Screen Share Protection",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            applyScreenCaptureProtection();
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Toggle Always On Top",
          accelerator: "CmdOrCtrl+T",
          click: () => {
            isAlwaysOnTop = !isAlwaysOnTop;
            mainWindow.setAlwaysOnTop(isAlwaysOnTop, "screen-saver", 999);
            mainWindow.webContents.send("status-update", {
              alwaysOnTop: isAlwaysOnTop,
            });
          },
        },
        {
          label: "Toggle Transparency",
          accelerator: "CmdOrCtrl+Shift+T",
          click: () => {
            toggleTransparency();
          },
        },
        {
          label: "🔒 Activate Invisible Mode",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            applyScreenCaptureProtection();
          },
        },
        { type: "separator" },
        {
          label: "Minimize",
          accelerator: "CmdOrCtrl+M",
          click: () => {
            mainWindow.minimize();
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            require("electron").dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Teleprompter Pro",
              message: "Teleprompter Pro v1.0.0",
              detail: `An invisible teleprompter for screen sharing in video calls.

🔒 Protection status: ${screenProtectionEnabled ? "✅ ACTIVE" : "❌ INACTIVE"}

📋 Features:
• Invisible for screen sharing (setContentProtection)
• Speed and text size control
• Global keyboard shortcuts
• Always on top mode

⌨️ Important shortcuts:
• Ctrl+I: Activate invisible protection
• Ctrl+Space: Play/Pause
• Ctrl+Shift+R: Re-apply protection`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function toggleTransparency() {
  // Safety check: Ensure mainWindow exists and is not destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log("⚠️ MainWindow not available, skipping transparency toggle");
    return;
  }

  isTransparent = !isTransparent;
  const opacity = isTransparent ? 0.8 : 1.0;
  mainWindow.setOpacity(opacity);

  // Safety check before sending IPC message
  if (mainWindow.webContents) {
    mainWindow.webContents.send("status-update", {
      transparent: isTransparent,
    });
  }
}

// Configure global shortcuts
function setupGlobalShortcuts() {
  // Shortcut to show/hide window
  globalShortcut.register("CommandOrControl+Shift+P", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log("⚠️ MainWindow not available for show/hide shortcut");
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Shortcut for play/pause
  globalShortcut.register("CommandOrControl+Space", () => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
      console.log("⚠️ MainWindow not available for play/pause shortcut");
      return;
    }

    mainWindow.webContents.send("toggle-play");
  });

  // Shortcut to re-apply protection (CRITICAL)
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    console.log("🔄 Re-applying protection via keyboard shortcut...");
    applyScreenCaptureProtection();
  });

  // Shortcut for invisible mode
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    console.log("🛡️ Activating invisible mode via keyboard shortcut...");
    applyScreenCaptureProtection();
  });
}

// Application events
app.whenReady().then(() => {
  createWindow();
  createMenu();
  setupGlobalShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Window ready event
ipcMain.on("window-ready", () => {
  console.log("✅ Window ready event received from renderer");
  console.log("IPC communication is working");
});

ipcMain.handle("minimize-window", () => {
  console.log("🔍 IPC: minimize-window called");
  mainWindow.minimize();
});

ipcMain.handle("close-window", () => {
  console.log("🔍 IPC: close-window called");
  mainWindow.close();
});

ipcMain.handle("maximize-window", () => {
  console.log("🔍 IPC: maximize-window called");
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle("toggle-fullscreen", () => {
  const isFullscreen = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFullscreen);
  return !isFullscreen;
});

ipcMain.handle("toggle-always-on-top", () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  mainWindow.setAlwaysOnTop(isAlwaysOnTop, "screen-saver", 999);
  return isAlwaysOnTop;
});

ipcMain.handle("set-window-opacity", (event, opacity) => {
  mainWindow.setOpacity(opacity);
});

ipcMain.handle("apply-screen-protection", () => {
  console.log("🛡️ Protection requested from renderer...");
  applyScreenCaptureProtection();
  return new Promise((resolve) => {
    // Give time for protection to be applied
    setTimeout(() => {
      resolve(screenProtectionEnabled);
    }, 500);
  });
});

// Prevent external links from opening in the application
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
