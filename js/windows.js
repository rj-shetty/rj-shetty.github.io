// =============================================================================
// WINDOW MANAGER — Desktop Windowing System
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

    window.addEventListener("resize", () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      if (wasMobile !== this.isMobile) {
        this.repositionWindows();
      }
    });

    document.addEventListener("mousemove", (e) => this.handleDragMove(e));
    document.addEventListener("mouseup", () => this.handleDragEnd());
    document.addEventListener("touchmove", (e) => this.handleDragMove(e), { passive: false });
    document.addEventListener("touchend", () => this.handleDragEnd());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activeWindowId) {
        this.close(this.activeWindowId);
      }
    });
  }

  register(id, element) {
    const config = {
      id, el: element, isOpen: false, isMinimized: false,
      isMaximized: false, prevRect: null, x: 0, y: 0
    };
    this.windows.set(id, config);
    this.setupWindowControls(id, element);
  }

  setupWindowControls(id, el) {
    const titlebar = el.querySelector(".window-titlebar");
    const closeBtn = el.querySelector(".btn-close");
    const minBtn = el.querySelector(".btn-minimize");
    const maxBtn = el.querySelector(".btn-maximize");

    el.addEventListener("mousedown", () => this.bringToFront(id));
    el.addEventListener("touchstart", () => this.bringToFront(id), { passive: true });

    if (titlebar) {
      titlebar.addEventListener("mousedown", (e) => this.handleDragStart(e, id));
      titlebar.addEventListener("touchstart", (e) => this.handleDragStart(e, id), { passive: false });
      titlebar.addEventListener("dblclick", (e) => {
        if (!e.target.closest(".window-btn")) this.toggleMaximize(id);
      });
    }

    if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.close(id); });
    if (minBtn) minBtn.addEventListener("click", (e) => { e.stopPropagation(); this.minimize(id); });
    if (maxBtn) maxBtn.addEventListener("click", (e) => { e.stopPropagation(); this.toggleMaximize(id); });
  }

  open(id, focus = true) {
    const win = this.windows.get(id);
    if (!win) return;

    soundEngine.playWindowOpen();
    win.isOpen = true;
    win.isMinimized = false;
    win.el.classList.remove("hidden", "minimized");
    win.el.classList.add("opening");

    setTimeout(() => win.el.classList.remove("opening"), 200);

    if (!win.x && !win.y && !this.isMobile) {
      this.centerWindow(win);
    }
    if (focus) this.bringToFront(id);
    this.updateTaskbar();
  }

  close(id) {
    const win = this.windows.get(id);
    if (!win || !win.isOpen) return;

    soundEngine.playWindowClose();
    win.el.classList.add("closing");
    setTimeout(() => {
      win.isOpen = false;
      win.el.classList.remove("closing");
      win.el.classList.add("hidden");
      this.updateTaskbar();
      if (this.activeWindowId === id) this.focusNextTopWindow();
    }, 150);
  }

  minimize(id) {
    const win = this.windows.get(id);
    if (!win || !win.isOpen) return;

    soundEngine.playClick();
    win.isMinimized = true;
    win.el.classList.add("minimized");

    if (this.activeWindowId === id) this.focusNextTopWindow();
    this.updateTaskbar();
  }

  restore(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.isMinimized = false;
    win.el.classList.remove("minimized");
    this.bringToFront(id);
    this.updateTaskbar();
  }

  toggleMaximize(id) {
    const win = this.windows.get(id);
    if (!win || this.isMobile) return;

    soundEngine.playClick();
    win.isMaximized = !win.isMaximized;

    if (win.isMaximized) {
      win.prevStyle = { left: win.el.style.left, top: win.el.style.top, width: win.el.style.width, height: win.el.style.height };
      win.el.classList.add("maximized");
      win.el.style.left = "0px";
      win.el.style.top = "38px"; 
      win.el.style.width = "100vw";
      win.el.style.height = "calc(100vh - 84px)"; 
    } else {
      win.el.classList.remove("maximized");
      if (win.prevStyle) {
        Object.assign(win.el.style, win.prevStyle);
      }
    }
  }

  bringToFront(id) {
    const win = this.windows.get(id);
    if (!win) return;

    this.currentZIndex += 2;
    win.el.style.zIndex = this.currentZIndex;
    this.activeWindowId = id;

    this.windows.forEach((w, wId) => {
      w.el.classList.toggle("active-window", wId === id);
    });
    this.updateTaskbar();
  }

  focusNextTopWindow() {
    let topWin = null, maxZ = -1;
    this.windows.forEach((w, id) => {
      if (w.isOpen && !w.isMinimized) {
        const z = parseInt(w.el.style.zIndex, 10) || 0;
        if (z > maxZ) { maxZ = z; topWin = id; }
      }
    });

    if (topWin) this.bringToFront(topWin);
    else { this.activeWindowId = null; this.updateTaskbar(); }
  }

  centerWindow(win) {
    const width = win.el.offsetWidth || 560;
    const height = win.el.offsetHeight || 420;
    const cascadeOffset = (this.windows.size % 5) * 25;

    let x = (window.innerWidth - width) / 2 + cascadeOffset;
    let y = (window.innerHeight - height) / 2 - 20 + cascadeOffset;

    win.x = x; win.y = y;
    win.el.style.left = `${x}px`;
    win.el.style.top = `${y}px`;
  }

  handleDragStart(e, id) {
    if (this.isMobile) return;
    const win = this.windows.get(id);
    if (!win || win.isMaximized || e.target.closest(".window-btn")) return;

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

    const minX = -this.dragTarget.el.offsetWidth + 80;
    const maxX = window.innerWidth - 60; 
    const minY = 38; 
    const maxY = window.innerHeight - 60;

    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    this.dragTarget.x = newX;
    this.dragTarget.y = newY;
    this.dragTarget.el.style.left = `${newX}px`;
    this.dragTarget.el.style.top = `${newY}px`;

    if (e.cancelable) e.preventDefault();
  }

  handleDragEnd() {
    if (this.dragTarget) this.dragTarget.el.classList.remove("dragging");
    this.isDragging = false;
    this.dragTarget = null;
    document.body.classList.remove("select-none");
  }

  repositionWindows() {
    this.windows.forEach((win) => {
      if (this.isMobile) {
        win.el.style.left = ""; win.el.style.top = ""; win.el.style.width = ""; win.el.style.height = "";
      } else if (win.x && win.y && !win.isMaximized) {
        win.el.style.left = `${win.x}px`; win.el.style.top = `${win.y}px`;
      }
    });
  }

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
        soundEngine.playClick();
        if (win.isMinimized) this.restore(id);
        else if (this.activeWindowId === id) this.minimize(id);
        else this.bringToFront(id);
      });
      taskbarTabsContainer.appendChild(tab);
    });
  }
}

const windowManager = new WindowManager();