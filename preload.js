const { contextBridge, ipcRenderer } = require("electron");

// Debug logging
console.log("🔥 Preload script started");
console.log("Context isolation:", process.contextIsolated);
console.log("Node integration:", process.nodeIntegration);

try {
  // Expose secure APIs to renderer context
  contextBridge.exposeInMainWorld("electronAPI", {
    // Application information
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),

    // Window control
    minimizeWindow: () => {
      console.log("🔍 minimizeWindow called from preload");
      return ipcRenderer.invoke("minimize-window");
    },
    closeWindow: () => {
      console.log("🔍 closeWindow called from preload");
      return ipcRenderer.invoke("close-window");
    },
    maximizeWindow: () => {
      console.log("🔍 maximizeWindow called from preload");
      return ipcRenderer.invoke("maximize-window");
    },
    toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
    toggleAlwaysOnTop: () => ipcRenderer.invoke("toggle-always-on-top"),
    setWindowOpacity: (opacity) =>
      ipcRenderer.invoke("set-window-opacity", opacity),

    // Screen capture protection control
    applyScreenProtection: () => ipcRenderer.invoke("apply-screen-protection"),

    // Events from renderer to main
    clearText: () => ipcRenderer.send("clear-text"),

    // Listen to events from main process
    onStatusUpdate: (callback) => {
      ipcRenderer.on("status-update", (event, status) => callback(status));
    },

    onTogglePlay: (callback) => {
      ipcRenderer.on("toggle-play", () => callback());
    },

    onClearText: (callback) => {
      ipcRenderer.on("clear-text", () => callback());
    },

    onScreenProtectionStatus: (callback) => {
      ipcRenderer.on("screen-protection-status", (event, status) =>
        callback(status)
      );
    },

    // Clean up listeners
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    },
  });

  console.log("✅ electronAPI successfully exposed to main world");
} catch (error) {
  console.error("❌ Error in preload script:", error);
}

// Window configurations on load
window.addEventListener("DOMContentLoaded", () => {
  console.log("Teleprompter Electron App loaded");

  // Inform that window is ready
  ipcRenderer.send("window-ready");
});
