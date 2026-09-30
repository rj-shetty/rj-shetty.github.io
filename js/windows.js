// =============================================================================
// WINDOW MANAGER — Desktop Windowing System
// =============================================================================
// Manages draggable, resizable, stackable windows with taskbar synchronization,
// smooth z-indexing, maximize/minimize, and mobile bottom-sheet fallback.
// =============================================================================

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.activeWindowId = null;
    this.baseZIndex = 100;
    this.currentZIndex = 100;
    this.isDragging = false;
    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };
    this.isMobile = window.innerWidth <= 768;

    // Track viewport resize
    window.addEventListener("resize", () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      if (wasMobile !== this.isMobile) {
        this.repositionWindows();
      }
    });

    // Global drag listeners with explicit passive configurations
    document.addEventListener("mousemove", (e) => this.handleDragMove(e));
    document.addEventListener("mouseup", () => this.handleDragEnd());
    document.addEventListener("touchmove", (e) => this.handleDragMove(e), { passive: false });
    document.addEventListener("touchend", () => this.handleDragEnd());

    // ESC key closes topmost active window
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activeWindowId && !this.isMobile) {
        this.close(this.activeWindowId);
      }
    });
  }

  // Register a window element into the system
  register(id, element) {
    const config = {
      id,
      el: element,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      prevStyle: null,
      x: 0,
      y: 0
    };

    this.windows.set(id, config);
    this.setupWindowControls(id, element);
  }

  setupWindowControls(id, el) {
    const titlebar = el.querySelector(".window-titlebar");
    const closeBtn = el.querySelector(".btn-close");
    const minBtn = el.querySelector(".btn-minimize");
    const maxBtn = el.querySelector(".btn-maximize");

    // Click anywhere on window to bring to front
    el.addEventListener("mousedown", () => this.bringToFront(id));
    el.addEventListener("touchstart", () => this.bringToFront(id), { passive: true });

    // Draggable titlebar
    if (titlebar) {
      titlebar.addEventListener("mousedown", (e) => this.handleDragStart(e, id));
      titlebar.addEventListener("touchstart", (e) => this.handleDragStart(e, id), { passive: false });

      // Double-click titlebar to toggle maximize
      titlebar.addEventListener("dblclick", (e) => {
        if (!e.target.closest(".window-btn")) {
          this.toggleMaximize(id);
        }
      });
    }

    // Button controls
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close(id);
      });
    }
    if (minBtn) {
      minBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.minimize(id);
      });
    }
    if (maxBtn) {
      maxBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMaximize(id);
      });
    }
  }

  // Open window
  open(id, focus = true) {
    const win = this.windows.get(id);
    if (!win) return;

    if (window.soundEngine) {
      soundEngine.playWindowOpen();
    }

    win.isOpen = true;
    win.isMinimized = false;
    win.el.classList.remove("hidden", "minimized");
    win.el.classList.add("opening");

    setTimeout(() => {
      win.el.classList.remove("opening");
    }, 200);

    // Initial positioning if not set
    if (!win.x && !win.y && !this.isMobile) {
      this.centerWindow(win);
    }

    if (focus) {
      this.bringToFront(id);
    }

    this.updateTaskbar();
  }

  // Close window
  close(id) {
    const win = this.windows.get(id);
    if (!win || !win.isOpen) return;

    if (window.soundEngine) {
      soundEngine.playWindowClose();
    }

    win.el.classList.add("closing");
    setTimeout(() => {
      win.isOpen = false;
      win.el.classList.remove("closing");
      win.el.classList.add("hidden");
      this.updateTaskbar();

      // If active window was closed, focus next highest window
      if (this.activeWindowId === id) {
        this.focusNextTopWindow();
      }
    }, 140);
  }

  // Minimize window to dock/taskbar
  minimize(id) {
    const win = this.windows.get(id);
    if (!win || !win.isOpen) return;

    if (window.soundEngine) {
      soundEngine.playClick();
    }
    win.isMinimized = true;
    win.el.classList.add("minimized");

    if (this.activeWindowId === id) {
      this.focusNextTopWindow();
    }
    this.updateTaskbar();
  }

  // Restore minimized window
  restore(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.isMinimized = false;
    win.el.classList.remove("minimized");
    this.bringToFront(id);
    this.updateTaskbar();
  }

  // Toggle maximize
  toggleMaximize(id) {
    const win = this.windows.get(id);
    if (!win || this.isMobile) return;

    if (window.soundEngine) {
      soundEngine.playClick();
    }
    win.isMaximized = !win.isMaximized;

    if (win.isMaximized) {
      win.prevStyle = {
        left: win.el.style.left,
        top: win.el.style.top,
        width: win.el.style.width,
        height: win.el.style.height
      };
      win.el.classList.add("maximized");
      win.el.style.left = "8px";
      win.el.style.top = "44px"; // below menu bar
      win.el.style.width = "calc(100vw - 16px)";
      win.el.style.height = "calc(100vh - 96px)"; // above taskbar
    } else {
      win.el.classList.remove("maximized");
      if (win.prevStyle) {
        win.el.style.left = win.prevStyle.left;
        win.el.style.top = win.prevStyle.top;
        win.el.style.width = win.prevStyle.width;
        win.el.style.height = win.prevStyle.height;
      }
    }
  }

  // Bring window to top of z-index stack
  bringToFront(id) {
    const win = this.windows.get(id);
    if (!win) return;

    this.currentZIndex += 2;
    win.el.style.zIndex = this.currentZIndex;
    this.activeWindowId = id;

    // Highlight active titlebar, dim others
    this.windows.forEach((w, wId) => {
      if (wId === id) {
        w.el.classList.add("active-window");
      } else {
        w.el.classList.remove("active-window");
      }
    });

    this.updateTaskbar();
  }

  focusNextTopWindow() {
    let topWin = null;
    let maxZ = -1;

    this.windows.forEach((w, id) => {
      if (w.isOpen && !w.isMinimized) {
        const z = parseInt(w.el.style.zIndex, 10) || 0;
        if (z > maxZ) {
          maxZ = z;
          topWin = id;
        }
      }
    });

    if (topWin) {
      this.bringToFront(topWin);
    } else {
      this.activeWindowId = null;
      this.updateTaskbar();
    }
  }

  // Center window on screen
  centerWindow(win) {
    const width = win.el.offsetWidth || 560;
    const height = win.el.offsetHeight || 420;
    const desktopW = window.innerWidth;
    const desktopH = window.innerHeight;

    // Offset slightly for cascading effect
    const cascadeOffset = (this.windows.size % 6) * 22;

    let x = Math.max(16, (desktopW - width) / 2 + cascadeOffset);
    let y = Math.max(50, (desktopH - height) / 2 - 20 + cascadeOffset);

    // Keep within bounds
    if (x + width > desktopW - 16) x = desktopW - width - 20;
    if (y + height > desktopH - 60) y = desktopH - height - 60;

    win.x = x;
    win.y = y;
    win.el.style.left = `${x}px`;
    win.el.style.top = `${y}px`;
  }

  // Handle Dragging with clamping bounds
  handleDragStart(e, id) {
    if (this.isMobile) return;
    const win = this.windows.get(id);
    if (!win || win.isMaximized) return;

    if (e.target.closest(".window-btn")) return; // Don't drag if clicking buttons

    this.isDragging = true;
    this.dragTarget = win;
    this.bringToFront(id);

    const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

    const rect = win.el.getBoundingClientRect();
    this.dragOffset.x = clientX - rect.left;
    this.dragOffset.y = clientY - rect.top;

    win.el.classList.add("dragging");
    document.body.classList.add("select-none");
    if (e.cancelable) e.preventDefault();
  }

  handleDragMove(e) {
    if (!this.isDragging || !this.dragTarget) return;

    const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;

    let newX = clientX - this.dragOffset.x;
    let newY = clientY - this.dragOffset.y;

    // Boundary constraints: ensure titlebar remains reachable
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 40;
    newX = Math.max(-this.dragTarget.el.offsetWidth + 100, Math.min(newX, maxX));
    newY = Math.max(38, Math.min(newY, maxY));

    this.dragTarget.x = newX;
    this.dragTarget.y = newY;
    this.dragTarget.el.style.left = `${newX}px`;
    this.dragTarget.el.style.top = `${newY}px`;

    if (e.cancelable) e.preventDefault();
  }

  handleDragEnd() {
    if (!this.isDragging) return;
    if (this.dragTarget) {
      this.dragTarget.el.classList.remove("dragging");
    }
    this.isDragging = false;
    this.dragTarget = null;
    document.body.classList.remove("select-none");
  }

  repositionWindows() {
    if (this.isMobile) {
      this.windows.forEach((win) => {
        win.el.style.left = "";
        win.el.style.top = "";
        win.el.style.width = "";
        win.el.style.height = "";
      });
    } else {
      this.windows.forEach((win) => {
        if (win.x && win.y && !win.isMaximized) {
          win.el.style.left = `${win.x}px`;
          win.el.style.top = `${win.y}px`;
        }
      });
    }
  }

  // Synchronize bottom taskbar tabs with open windows
  updateTaskbar() {
    const taskbarTabsContainer = document.getElementById("taskbar-tabs");
    if (!taskbarTabsContainer) return;

    taskbarTabsContainer.innerHTML = "";

    this.windows.forEach((win, id) => {
      if (!win.isOpen) return;

      const title = win.el.querySelector(".window-title-text")?.textContent || id;
      const icon = win.el.dataset.icon || "📄";

      const tab = document.createElement("button");
      tab.className = `taskbar-tab ${this.activeWindowId === id && !win.isMinimized ? "active" : ""} ${win.isMinimized ? "minimized" : ""}`;
      tab.innerHTML = `<span class="tab-icon">${icon}</span><span class="tab-title">${title}</span>`;

      tab.addEventListener("click", () => {
        if (window.soundEngine) {
          soundEngine.playClick();
        }
        if (win.isMinimized) {
          this.restore(id);
        } else if (this.activeWindowId === id) {
          this.minimize(id);
        } else {
          this.bringToFront(id);
        }
      });

      taskbarTabsContainer.appendChild(tab);
    });
  }
}

// Global window manager instance
const windowManager = new WindowManager();