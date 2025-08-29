// Electron Controls - Specific functionalities for desktop application

// Global variables
let isInvisibleMode = false;
let isTransparentMode = false;
let isAlwaysOnTopMode = true;

// Notification function
function showNotification(message, type = "info") {
  // Create temporary notification
  const notification = document.createElement("div");
  notification.className = `electron-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Show with animation
  setTimeout(() => notification.classList.add("show"), 100);

  // Hide after 5 seconds for important messages
  const hideTime = type === "success" || type === "error" ? 5000 : 3000;
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, hideTime);
}

// Define handler functions immediately for onclick events
function handleMinimize() {
  console.log("🔥 Direct minimize handler called");
  if (window.electronAPI && window.electronAPI.minimizeWindow) {
    window.electronAPI.minimizeWindow();
  } else {
    console.error("❌ electronAPI not available for minimize");
    showNotification("❌ Minimize not available");
  }
}

function handleMaximize() {
  console.log("🔥 Direct maximize handler called");
  if (window.electronAPI && window.electronAPI.maximizeWindow) {
    window.electronAPI
      .maximizeWindow()
      .then((isMaximized) => {
        const btn = document.getElementById("btn-maximize");
        if (btn) {
          btn.innerHTML = isMaximized ? "⧉" : "⬜";
          btn.title = isMaximized ? "Restore" : "Maximize";
        }
      })
      .catch((error) => {
        console.error("Error in maximize:", error);
        showNotification("❌ Error maximizing window");
      });
  } else {
    console.error("❌ electronAPI not available for maximize");
    showNotification("❌ Maximize not available");
  }
}

function handleClose() {
  console.log("🔥 Direct close handler called");
  if (window.electronAPI && window.electronAPI.closeWindow) {
    window.electronAPI.closeWindow();
    showNotification("❌ Closing application");
  } else {
    console.error("❌ electronAPI not available for close");
    showNotification("❌ Close not available");
  }
}

// Electron-specific control functions
async function toggleInvisibleMode() {
  if (!window.electronAPI) return;

  try {
    const result = await window.electronAPI.applyScreenProtection();
    showNotification(
      result
        ? "🔒 Invisible Mode ENABLED - Not visible in screen share"
        : "❌ Error activating invisible mode"
    );
  } catch (error) {
    showNotification("❌ Error: " + error.message);
  }
}

function toggleTransparency() {
  if (!window.electronAPI) return;

  isTransparentMode = !isTransparentMode;
  const opacity = isTransparentMode ? 0.7 : 1.0;

  window.electronAPI.setWindowOpacity(opacity);
  updateStatusIndicators({ transparent: isTransparentMode });

  // Update button visual state
  const transparencyButton = document.getElementById("transparency-toggle");
  if (transparencyButton) {
    if (isTransparentMode) {
      transparencyButton.classList.add("active");
    } else {
      transparencyButton.classList.remove("active");
    }
  }

  showNotification(
    isTransparentMode ? "👻 Transparency Enabled" : "🎭 Transparency Disabled"
  );
}

async function toggleAlwaysOnTop() {
  if (!window.electronAPI) return;

  try {
    isAlwaysOnTopMode = await window.electronAPI.toggleAlwaysOnTop();
    updateStatusIndicators({ alwaysOnTop: isAlwaysOnTopMode });

    showNotification(
      isAlwaysOnTopMode
        ? "📌 Always On Top Enabled"
        : "📌 Always On Top Disabled"
    );
  } catch (error) {
    console.error("Error toggling always on top:", error);
  }
}

function updateScreenProtectionStatus(status) {
  const statusInvisible = document.getElementById("status-invisible");

  if (statusInvisible) {
    if (status.enabled) {
      statusInvisible.classList.remove("hidden");
      statusInvisible.classList.add("active");
      statusInvisible.textContent = `🔒 Invisible (${status.method})`;
      showNotification(`✅ ${status.message}`, "success");
    } else {
      statusInvisible.classList.add("hidden");
      statusInvisible.classList.remove("active");
      showNotification(`❌ ${status.message}`, "error");
    }
  }

  isInvisibleMode = status.enabled;
}

function updateStatusIndicators(status) {
  const statusInvisible = document.getElementById("status-invisible");
  const statusTransparent = document.getElementById("status-transparent");
  const statusAlwaysTop = document.getElementById("status-always-top");

  if (status.invisibleMode !== undefined) {
    isInvisibleMode = status.invisibleMode;
    if (statusInvisible) {
      statusInvisible.classList.toggle("hidden", !isInvisibleMode);
      statusInvisible.classList.toggle("active", isInvisibleMode);
    }
  }

  if (status.transparent !== undefined) {
    isTransparentMode = status.transparent;
    if (statusTransparent) {
      statusTransparent.classList.toggle("hidden", !isTransparentMode);
      statusTransparent.classList.toggle("active", isTransparentMode);
    }
  }

  if (status.alwaysOnTop !== undefined) {
    isAlwaysOnTopMode = status.alwaysOnTop;
    if (statusAlwaysTop) {
      statusAlwaysTop.classList.toggle("active", isAlwaysOnTopMode);
    }
  }
}

function setupDragAndDrop() {
  const textArea = document.getElementById("text-area");
  if (!textArea) return;

  textArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    textArea.style.backgroundColor = "rgba(255, 88, 238, 0.1)";
  });

  textArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    textArea.style.backgroundColor = "";
  });

  textArea.addEventListener("drop", (e) => {
    e.preventDefault();
    textArea.style.backgroundColor = "";

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          textArea.value = e.target.result;
        };
        reader.readAsText(file);
      }
    }
  });
}

function toggleFullscreen() {
  const aside = document.querySelector("aside");
  const titleBar = document.getElementById("title-bar");

  if (aside && titleBar) {
    const isHidden = aside.style.display === "none";
    aside.style.display = isHidden ? "flex" : "none";
    titleBar.style.display = isHidden ? "flex" : "none";
    showNotification(isHidden ? "🖥️ Normal Mode" : "📺 Fullscreen Mode");
  }
}

async function toggleTrueFullscreen() {
  if (!window.electronAPI || !window.electronAPI.toggleFullscreen) {
    showNotification("❌ Fullscreen not available in web mode");
    return;
  }

  try {
    const isFullscreen = await window.electronAPI.toggleFullscreen();
    showNotification(
      isFullscreen ? "🔳 True Fullscreen Enabled" : "🪟 Windowed Mode"
    );
  } catch (error) {
    console.error("Error toggling fullscreen:", error);
    showNotification("❌ Error toggling fullscreen");
  }
}

// Color control functions - Sistema de paleta personalizada
let currentBgColor = "#1c1c1c";
let currentTextColor = "#e2e2e2";
let currentFont = "Nunito Sans, sans-serif";
let currentFontName = "Nunito Sans";

// Funciones para selector de fuente personalizado
function toggleFontPalette() {
  const palette = document.getElementById("font-palette");

  if (palette) {
    const isVisible = palette.style.display !== "none";

    // Cerrar todas las paletas de color primero
    document.querySelectorAll(".color-palette").forEach((p) => {
      p.style.display = "none";
    });

    // Mostrar/ocultar la paleta de fuente
    palette.style.display = isVisible ? "none" : "block";

    console.log(`🔤 Font palette ${isVisible ? "closed" : "opened"}`);
  }
}

function selectCustomFont(fontFamily, fontName) {
  console.log(`🔤 Font selected: ${fontFamily} (${fontName})`);

  const textArea = document.getElementById("text-area");
  const displayBox = document.getElementById("font-display");

  if (textArea) {
    textArea.style.fontFamily = fontFamily;
  }

  if (displayBox) {
    displayBox.textContent = fontName;
    displayBox.style.fontFamily = fontFamily;
  }

  // Update global variables
  currentFont = fontFamily;
  currentFontName = fontName;

  // Save to localStorage
  localStorage.setItem("teleprompter-font-family", fontFamily);
  localStorage.setItem("teleprompter-font-name", fontName);

  // Close the palette
  closeFontPalette();
}

function closeFontPalette() {
  const palette = document.getElementById("font-palette");

  if (palette) {
    palette.style.display = "none";
  }
}

// Funciones para selector de color
function toggleColorPalette(type) {
  const paletteId = type + "-color-palette";
  const palette = document.getElementById(paletteId);

  if (palette) {
    const isVisible = palette.style.display !== "none";

    // Cerrar todas las paletas primero (colores y fuente)
    document.querySelectorAll(".color-palette").forEach((p) => {
      p.style.display = "none";
    });
    const fontPalette = document.getElementById("font-palette");
    if (fontPalette) {
      fontPalette.style.display = "none";
    }

    // Mostrar/ocultar la paleta actual
    palette.style.display = isVisible ? "none" : "block";

    console.log(`🎨 Color palette ${type} ${isVisible ? "closed" : "opened"}`);
  }
}

function selectCustomColor(color, type) {
  console.log(`🎨 Color selected: ${color} for ${type}`);

  const textArea = document.getElementById("text-area");
  const displayBox = document.getElementById(type + "-color-display");
  const preview = document.getElementById(type + "-color-preview");

  if (type === "bg") {
    currentBgColor = color;
    if (textArea) textArea.style.backgroundColor = color;
    if (displayBox) displayBox.style.backgroundColor = color;
    if (preview) preview.style.backgroundColor = color;

    // Save to localStorage
    localStorage.setItem("teleprompter-bg-color", color);
  } else if (type === "text") {
    currentTextColor = color;
    if (textArea) textArea.style.color = color;
    if (displayBox) displayBox.style.backgroundColor = color;
    if (preview) preview.style.backgroundColor = color;

    // Save to localStorage
    localStorage.setItem("teleprompter-text-color", color);
  }

  // Close the palette
  closeColorPalette(type);
}

function closeColorPalette(type) {
  const paletteId = type + "-color-palette";
  const palette = document.getElementById(paletteId);

  if (palette) {
    palette.style.display = "none";
  }
}

// Legacy functions for compatibility
function changeBackgroundColor() {
  // This function is kept for compatibility but is no longer used
  console.log("🎨 Legacy changeBackgroundColor function called");
}

function changeTextColor() {
  // This function is kept for compatibility but is no longer used
  console.log("✏️ Legacy changeTextColor function called");
}

// Removed obsolete functions
function openColorSelector(inputId) {
  console.log("⚠️ openColorSelector is obsolete, using custom palette");
}

function ensureInputInvisibility(inputId) {
  console.log("⚠️ ensureInputInvisibility is obsolete, no native inputs");
}

// Load saved colors on page load
function loadSavedColors() {
  const textArea = document.getElementById("text-area");
  const lineSlider = document.getElementById("line-height-slider");
  const lineValue = document.getElementById("line-height-value");
  const bgPreview = document.getElementById("bg-color-preview");
  const textPreview = document.getElementById("text-color-preview");
  const bgDisplay = document.getElementById("bg-color-display");
  const textDisplay = document.getElementById("text-color-display");
  const fontDisplay = document.getElementById("font-display");

  if (textArea) {
    // Load background color
    const savedBgColor = localStorage.getItem("teleprompter-bg-color");
    if (savedBgColor) {
      currentBgColor = savedBgColor;
      textArea.style.backgroundColor = savedBgColor;
      if (bgPreview) bgPreview.style.backgroundColor = savedBgColor;
      if (bgDisplay) bgDisplay.style.backgroundColor = savedBgColor;
    }

    // Load text color
    const savedTextColor = localStorage.getItem("teleprompter-text-color");
    if (savedTextColor) {
      currentTextColor = savedTextColor;
      textArea.style.color = savedTextColor;
      if (textPreview) textPreview.style.backgroundColor = savedTextColor;
      if (textDisplay) textDisplay.style.backgroundColor = savedTextColor;
    }

    // Load font family
    const savedFont = localStorage.getItem("teleprompter-font-family");
    const savedFontName = localStorage.getItem("teleprompter-font-name");
    if (savedFont) {
      currentFont = savedFont;
      currentFontName = savedFontName || "Nunito Sans";
      textArea.style.fontFamily = savedFont;
      if (fontDisplay) {
        fontDisplay.textContent = currentFontName;
        fontDisplay.style.fontFamily = savedFont;
      }
    } else {
      // Apply default font if none saved
      textArea.style.fontFamily = currentFont;
      if (fontDisplay) {
        fontDisplay.textContent = currentFontName;
        fontDisplay.style.fontFamily = currentFont;
      }
    }

    // Load line height
    const savedLineHeight = localStorage.getItem("teleprompter-line-height");
    if (savedLineHeight && lineSlider) {
      lineSlider.value = savedLineHeight;
      textArea.style.lineHeight = savedLineHeight;
      if (lineValue) lineValue.textContent = savedLineHeight;
    }
  }

  console.log("🎨 Settings loaded:", {
    bg: currentBgColor,
    text: currentTextColor,
    font: currentFontName,
  });
}

// Settings Panel Functions
let isSettingsPanelOpen = false;

function toggleSettingsPanel() {
  const panel = document.getElementById("settings-panel");
  const toggleButton = document.getElementById("settings-toggle");

  isSettingsPanelOpen = !isSettingsPanelOpen;

  if (isSettingsPanelOpen) {
    panel.classList.add("open");
    toggleButton.classList.add("active");
  } else {
    panel.classList.remove("open");
    toggleButton.classList.remove("active");
  }
}

// New Settings Functions
function changeFontFamily() {
  // Legacy function for compatibility
  console.log("🔤 Legacy changeFontFamily function called");
  // The new system uses selectCustomFont directly
}

function changeLineHeight() {
  const slider = document.getElementById("line-height-slider");
  const textArea = document.getElementById("text-area");
  const valueDisplay = document.getElementById("line-height-value");

  if (slider && textArea) {
    const lineHeight = slider.value;
    textArea.style.lineHeight = lineHeight;

    if (valueDisplay) {
      valueDisplay.textContent = lineHeight;
    }

    localStorage.setItem("teleprompter-line-height", lineHeight);
  }
}

function resetSettings() {
  // Default values
  const defaults = {
    bgColor: "#1c1c1c",
    textColor: "#e2e2e2",
    fontFamily: "Nunito Sans, sans-serif",
    fontName: "Nunito Sans",
    lineHeight: "1",
  };

  const textArea = document.getElementById("text-area");
  const lineSlider = document.getElementById("line-height-slider");
  const lineValue = document.getElementById("line-height-value");
  const bgPreview = document.getElementById("bg-color-preview");
  const textPreview = document.getElementById("text-color-preview");
  const bgDisplay = document.getElementById("bg-color-display");
  const textDisplay = document.getElementById("text-color-display");
  const fontDisplay = document.getElementById("font-display");

  // Reset all values
  if (textArea) {
    textArea.style.backgroundColor = defaults.bgColor;
    textArea.style.color = defaults.textColor;
    textArea.style.fontFamily = defaults.fontFamily;
    textArea.style.lineHeight = defaults.lineHeight;
  }

  // Update variables
  currentBgColor = defaults.bgColor;
  currentTextColor = defaults.textColor;
  currentFont = defaults.fontFamily;
  currentFontName = defaults.fontName;

  if (lineSlider) lineSlider.value = defaults.lineHeight;
  if (lineValue) lineValue.textContent = defaults.lineHeight;

  if (bgPreview) bgPreview.style.backgroundColor = defaults.bgColor;
  if (textPreview) textPreview.style.backgroundColor = defaults.textColor;

  // Update displays
  if (bgDisplay) bgDisplay.style.backgroundColor = defaults.bgColor;
  if (textDisplay) textDisplay.style.backgroundColor = defaults.textColor;
  if (fontDisplay) {
    fontDisplay.textContent = defaults.fontName;
    fontDisplay.style.fontFamily = defaults.fontFamily;
  }

  // Clear localStorage
  localStorage.removeItem("teleprompter-bg-color");
  localStorage.removeItem("teleprompter-text-color");
  localStorage.removeItem("teleprompter-font-family");
  localStorage.removeItem("teleprompter-font-name");
  localStorage.removeItem("teleprompter-line-height");
}

// Responsive Features Setup
function setupResponsiveFeatures() {
  console.log("📱 Setting up responsive features...");

  // Detect touch devices
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    document.body.classList.add("touch-device");
    setupTouchOptimizations();
  }

  // Handle orientation changes
  window.addEventListener("orientationchange", handleOrientationChange);
  window.addEventListener("resize", handleWindowResize);

  // Initial setup
  handleWindowResize();
}

function setupTouchOptimizations() {
  // Improve touch targets for mobile
  const sidebarItems = document.querySelectorAll("aside li");
  sidebarItems.forEach((item) => {
    item.addEventListener("touchstart", function (e) {
      this.classList.add("touch-active");
    });

    item.addEventListener("touchend", function (e) {
      setTimeout(() => {
        this.classList.remove("touch-active");
      }, 150);
    });
  });

  // Prevent double-tap zoom on buttons
  const buttons = document.querySelectorAll("button, .icon_container");
  buttons.forEach((button) => {
    button.addEventListener("touchend", function (e) {
      e.preventDefault();
    });
  });
}

function handleOrientationChange() {
  setTimeout(() => {
    handleWindowResize();

    // Close settings panel on orientation change for better UX
    if (isSettingsPanelOpen && window.innerWidth < 768) {
      toggleSettingsPanel();
    }
  }, 100);
}

function handleWindowResize() {
  const width = window.innerWidth;
  const aside = document.querySelector("aside");

  // Adjust sidebar based on screen size
  if (width <= 319) {
    aside?.style.setProperty("--sidebar-width", "40px");
  } else if (width <= 480) {
    aside?.style.setProperty("--sidebar-width", "50px");
  } else if (width <= 767) {
    aside?.style.setProperty("--sidebar-width", "60px");
  } else if (width <= 1024) {
    aside?.style.setProperty("--sidebar-width", "80px");
  } else if (width >= 1441) {
    aside?.style.setProperty("--sidebar-width", "120px");
  } else {
    aside?.style.setProperty("--sidebar-width", "100px");
  }

  // Adjust font size based on screen size and content
  adjustResponsiveFontSize();
}

function adjustResponsiveFontSize() {
  const textArea = document.getElementById("text-area");
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (textArea) {
    let fontSize;

    if (width <= 319) {
      fontSize = "2rem";
    } else if (width <= 480) {
      fontSize = "2.5rem";
    } else if (width <= 767) {
      fontSize = height < 500 ? "3rem" : "3.5rem";
    } else if (width <= 1024) {
      fontSize = "4.5rem";
    } else if (width >= 1441) {
      fontSize = "7rem";
    } else {
      fontSize = "6rem";
    }

    // Only update if not already set by user
    if (!textArea.style.fontSize || textArea.style.fontSize === "") {
      textArea.style.fontSize = fontSize;
    }
  }
}

// Make functions globally available immediately
window.handleMinimize = handleMinimize;
window.handleMaximize = handleMaximize;
window.handleClose = handleClose;
window.showNotification = showNotification;
window.toggleInvisibleMode = toggleInvisibleMode;
window.toggleTransparency = toggleTransparency;
window.toggleAlwaysOnTop = toggleAlwaysOnTop;
window.toggleFullscreen = toggleFullscreen;
window.toggleTrueFullscreen = toggleTrueFullscreen;
window.changeBackgroundColor = changeBackgroundColor;
window.changeTextColor = changeTextColor;
window.toggleColorPalette = toggleColorPalette;
window.selectCustomColor = selectCustomColor;
window.closeColorPalette = closeColorPalette;
window.toggleFontPalette = toggleFontPalette;
window.selectCustomFont = selectCustomFont;
window.closeFontPalette = closeFontPalette;
window.loadSavedColors = loadSavedColors;
window.toggleSettingsPanel = toggleSettingsPanel;
window.changeFontFamily = changeFontFamily;
window.changeLineHeight = changeLineHeight;
window.resetSettings = resetSettings;
window.setupResponsiveFeatures = setupResponsiveFeatures;
window.handleOrientationChange = handleOrientationChange;
window.handleWindowResize = handleWindowResize;

console.log("✅ Handler functions defined and exported");

// Check if we are in Electron environment
function checkElectronAPI() {
  if (typeof window !== "undefined" && window.electronAPI) {
    console.log("✅ Electron API is available");
    console.log("Available methods:", Object.keys(window.electronAPI));
    return true;
  } else {
    console.log("⚠️ Web mode - no Electron functionalities");
    return false;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM Content Loaded");

  const isElectron = checkElectronAPI();

  if (isElectron && window.electronAPI) {
    setupElectronFeatures();
  } else {
    console.warn("⚠️ Electron API not available, running in web mode");
  }

  setupDragAndDrop();
  loadSavedColors(); // Load saved colors on startup
  setupResponsiveFeatures(); // Setup responsive features

  // Cerrar paletas al hacer click fuera
  document.addEventListener("click", function (event) {
    if (
      !event.target.closest(".color-picker-custom") &&
      !event.target.closest(".font-picker-custom")
    ) {
      // Cerrar paletas de color
      document.querySelectorAll(".color-palette").forEach((palette) => {
        palette.style.display = "none";
      });
      // Cerrar paleta de fuente
      const fontPalette = document.getElementById("font-palette");
      if (fontPalette) {
        fontPalette.style.display = "none";
      }
    }
  });
});

function setupElectronFeatures() {
  console.log("🔧 Setting up Electron features...");

  // Listen to events from main process
  if (window.electronAPI.onStatusUpdate) {
    window.electronAPI.onStatusUpdate((status) => {
      updateStatusIndicators(status);

      // Update transparency button visual state if status includes transparency
      if (status.transparent !== undefined) {
        const transparencyButton = document.getElementById(
          "transparency-toggle"
        );
        if (transparencyButton) {
          if (status.transparent) {
            transparencyButton.classList.add("active");
          } else {
            transparencyButton.classList.remove("active");
          }
        }
      }
    });
  }

  if (window.electronAPI.onTogglePlay) {
    window.electronAPI.onTogglePlay(() => {
      if (typeof clickPlay === "function") {
        clickPlay();
      }
    });
  }

  if (window.electronAPI.onClearText) {
    window.electronAPI.onClearText(() => {
      const textArea = document.getElementById("text-area");
      if (textArea) {
        textArea.value = "";
      }
    });
  }

  if (window.electronAPI.onScreenProtectionStatus) {
    window.electronAPI.onScreenProtectionStatus((status) => {
      updateScreenProtectionStatus(status);
    });
  }

  // Make title bar draggable
  const titleBar = document.getElementById("title-bar");
  if (titleBar) {
    titleBar.style.webkitAppRegion = "drag";

    const buttons = titleBar.querySelectorAll("button");
    buttons.forEach((btn) => {
      btn.style.webkitAppRegion = "no-drag";
    });
  }
}

// Additional keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "i") {
    e.preventDefault();
    toggleInvisibleMode();
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
    e.preventDefault();
    toggleTransparency();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "t" && !e.shiftKey) {
    e.preventDefault();
    toggleAlwaysOnTop();
  }

  if (e.key === "F11") {
    e.preventDefault();
    toggleFullscreen();
  }

  if (e.key === "F12") {
    e.preventDefault();
    toggleTrueFullscreen();
  }
});
