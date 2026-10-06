(function () {
  const data = window.PORTFOLIO_DATA;
  if (!data) return;

  const desktop = document.querySelector("#desktop");
  const layer = document.querySelector("#window-layer");
  const dockApps = document.querySelector(".dock-apps");
  const template = document.querySelector("#window-template");
  const themeButton = document.querySelector("#theme-toggle");
  const sfxButton = document.querySelector("#sfx-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const siteFavicon = document.querySelector("#site-favicon");
  const startMenu = document.querySelector("#start-menu");
  const startToggle = document.querySelector("#start-toggle");
  const appMeta = {
    about: { title: "About Me", center: "" },
    projects: { title: "Projects", center: "" },
    toolkit: { title: "Skills & Tools", center: "" },
    contact: { title: "Contact Ranjan", center: "" },
    terminal: { title: "Terminal", center: "" },
    notes: { title: "Sticky Notes", center: "" },
    preferences: { title: "Preferences", center: "PERSONALIZE" }
  };
  const apps = new Map();
  const bootRunningApps = new Set(["projects", "toolkit", "contact"]);
  let topZ = 4;
  let activeRecord = null;
  let lastTrigger = null;
  let drag = null;
  const WINDOW_DRAG_THRESHOLD = 8;
  const WINDOW_SNAP_EDGE = 120;
  const WINDOW_SNAP_DRAG_THRESHOLD = 4;
  let dockDrag = null;
  let suppressDockClick = false;
  let sfxOn = true;
  let startupOpenSoundPending = false;
  let sfxAudioContext = null;
  const sfxPatterns = {
    click: [{ frequency: 980, endFrequency: 760, delay: 0, duration: .045, level: .42 }],
    open: [
      { frequency: 520, endFrequency: 580, delay: 0, duration: .095, level: .34 },
      { frequency: 690, endFrequency: 760, delay: .045, duration: .115, level: .28 }
    ],
    close: [
      { frequency: 690, endFrequency: 630, delay: 0, duration: .09, level: .28 },
      { frequency: 520, endFrequency: 470, delay: .045, duration: .105, level: .24 }
    ],
    success: [
      { frequency: 523.25, endFrequency: 523.25, delay: 0, duration: .13, level: .25 },
      { frequency: 659.25, endFrequency: 659.25, delay: .045, duration: .14, level: .23 },
      { frequency: 783.99, endFrequency: 783.99, delay: .09, duration: .18, level: .2 }
    ]
  };
  const appIcons = {
    about: '<circle cx="12" cy="8" r="3.1"/><path d="M5.5 20v-1.2a6.5 6.5 0 0 1 13 0V20z"/>',
    projects: '<path d="M3.5 7.5h6l2 2h9v9.8H3.5z"/><path d="M3.5 7.5V5.2h6l2 2"/><path class="icon-accent" d="m12.5 15.8 4.2-4.2m-3.6 0h3.6v3.6"/>',
    terminal: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.3"/><path d="M3.8 8h16.4"/><path class="icon-accent" d="m7.2 11.2 2.3 2-2.3 2m4.6 0h3.4"/>',
    toolkit: '<path d="M4 6h16M4 12h16M4 18h16"/><circle class="icon-accent" cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle class="icon-accent" cx="8" cy="18" r="2"/>',
    notes: '<path d="M6 3.8h8l4 4V20H6z"/><path d="M14 3.8v4h4M9 12h6m-6 3h6"/><path class="icon-accent" d="m4 15.5-.8 4 4-.8"/>',
    contact: '<rect x="3.3" y="5.2" width="17.4" height="13.6" rx="2"/><path d="m4.3 7 7.7 5.8L19.7 7"/><path class="icon-accent" d="m4.4 17.1 5.1-4"/>',
    preferences: '<path d="M10.60 4.79 L10.09 2.18 L13.91 2.18 L13.40 4.79 L16.11 5.91 L17.59 3.71 L20.29 6.41 L18.09 7.89 L19.21 10.60 L21.82 10.09 L21.82 13.91 L19.21 13.40 L18.09 16.11 L20.29 17.59 L17.59 20.29 L16.11 18.09 L13.40 19.21 L13.91 21.82 L10.09 21.82 L10.60 19.21 L7.89 18.09 L6.41 20.29 L3.71 17.59 L5.91 16.11 L4.79 13.40 L2.18 13.91 L2.18 10.09 L4.79 10.60 L5.91 7.89 L3.71 6.41 L6.41 3.71 L7.89 5.91 Z"/><circle cx="12" cy="12" r="3"/>'
  };
  function appIconMarkup(id) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${appIcons[id] || appIcons.about}</svg>`;
  }
  document.querySelectorAll("[data-app-icon]").forEach((icon) => {
    icon.innerHTML = appIconMarkup(icon.dataset.appIcon);
  });

  function playSfx(name, volume = .14) {
    const pattern = sfxPatterns[name];
    if (!sfxOn || !pattern) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      sfxAudioContext ??= new AudioContextClass();
      if (sfxAudioContext.state === "suspended") sfxAudioContext.resume().catch(() => {});

      const now = sfxAudioContext.currentTime;
      const safeVolume = Math.min(Math.max(volume, 0), .2);
      pattern.forEach(({ frequency, endFrequency, delay, duration, level }) => {
        const start = now + delay;
        const oscillator = sfxAudioContext.createOscillator();
        const envelope = sfxAudioContext.createGain();
        const attack = Math.min(.008, duration * .2);
        const peak = Math.max(.0001, safeVolume * level);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(sfxAudioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + .01);
      });
    } catch {
      // Leave the interface usable on browsers that cannot start audio.
    }
  }

  function updateSfxButton(isOn) {
    const changed = sfxOn !== isOn;
    if (changed && !isOn) playSfx("click", .1);
    sfxOn = isOn;
    sfxButton.classList.toggle("is-on", isOn);
    sfxButton.setAttribute("aria-pressed", String(isOn));
    sfxButton.setAttribute("aria-label", isOn ? "Turn sound effects off" : "Turn sound effects on");
    sfxButton.title = isOn ? "Sound effects on" : "Sound effects off";
    if (changed && isOn) playSfx("click", .1);
  }

  sfxButton.addEventListener("click", () => updateSfxButton(!sfxOn));
  function playPendingStartupOpenSound(event) {
    if (!startupOpenSoundPending) return;
    if (!sfxOn) { startupOpenSoundPending = false; return; }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button, a, input, textarea, .window-bar, .window-resize-handle")) {
      startupOpenSoundPending = false;
      return;
    }
    startupOpenSoundPending = false;
    playSfx("open", .15);
  }
  document.addEventListener("pointerdown", playPendingStartupOpenSound, true);
  document.addEventListener("keydown", playPendingStartupOpenSound, true);


  function setTheme(isDark, persist = true) {
    desktop.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("theme-dark", isDark);
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    themeButton.title = isDark ? "Switch to light theme" : "Switch to dark theme";
    themeMeta.setAttribute("content", isDark ? "#202822" : "#edf1e8");
    siteFavicon.setAttribute("href", isDark ? "assets/favicon-dark.svg?v=2026-10-06-contrast" : "assets/favicon.svg?v=2026-10-06-contrast");
    document.dispatchEvent(new CustomEvent("portfolio-theme-change", { detail: { isDark } }));
    if (!persist) return;
    playSfx("click", .1);
    try { localStorage.setItem("ranjan-portfolio-theme", isDark ? "dark" : "light"); } catch { /* Keep the toggle usable without storage. */ }
  }

  themeButton.addEventListener("click", () => setTheme(!desktop.classList.contains("theme-dark")));
  try {
    const savedTheme = localStorage.getItem("ranjan-portfolio-theme") || localStorage.getItem("ranjan-os-theme");
    setTheme(savedTheme === "dark" || savedTheme === "night", false);
  } catch { setTheme(false, false); }
  document.body.classList.add("theme-ready");

  function setStartMenu(isOpen, focusFirst = false, withSound = true) {
    const wasOpen = !startMenu.hidden;
    startMenu.hidden = !isOpen;
    startToggle.setAttribute("aria-expanded", String(isOpen));
    startToggle.setAttribute("aria-label", isOpen ? "Close Start menu" : "Open Start menu");
    if (withSound && wasOpen !== isOpen) playSfx(isOpen ? "open" : "close", .12);
    if (isOpen && focusFirst) startMenu.querySelector(".start-menu-item")?.focus({ preventScroll: true });
    if (!isOpen && focusFirst) startToggle.focus({ preventScroll: true });
  }

  startToggle.addEventListener("click", () => setStartMenu(startMenu.hidden, true));
  document.addEventListener("pointerdown", (event) => {
    if (!startMenu.hidden && !startMenu.contains(event.target) && !startToggle.contains(event.target)) setStartMenu(false);
  });

  function createDockButton(id, meta) {
    const existing = dockApps.querySelector(`.dock-app[data-open-app="${id}"]`);
    if (existing) return existing;
    const button = document.createElement("button");
    button.className = "dock-app";
    button.type = "button";
    button.dataset.openApp = id;
    button.title = meta.title;
    button.setAttribute("aria-label", `Bring ${meta.title} to front`);
    button.setAttribute("aria-description", "Drag to reorder. Middle-click to close the window.");

    const glyph = document.createElement("span");
    glyph.className = "dock-app-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.innerHTML = appIconMarkup(id);
    button.append(glyph);
    dockApps.append(button);
  }

  function updateDock() {
    apps.forEach((record, id) => {
      const isOpen = !record.node.classList.contains("is-closed");
      if (isOpen && !dockApps.querySelector(`.dock-app[data-open-app="${id}"]`)) createDockButton(id, record.meta);
      document.querySelectorAll('[data-open-app="' + id + '"], [data-shortcut-id="' + id + '"]').forEach((button) => button.classList.toggle("is-open", isOpen));
    });

    dockApps.querySelectorAll(".dock-app").forEach((button) => {
      const id = button.dataset.openApp;
      const record = apps.get(id);
      if (!record || record.node.classList.contains("is-closed")) {
        if (bootRunningApps.has(id)) {
          button.classList.add("is-open", "is-boot-running");
          button.classList.remove("is-minimized");
          button.setAttribute("aria-current", "false");
          button.setAttribute("aria-label", `${button.title}: active in taskbar; window closed. Open window.`);
          button.setAttribute("aria-description", "Startup running indicator. Activate to open this app.");
          return;
        }
        button.remove();
        return;
      }
      const isMinimized = record.node.classList.contains("is-minimized");
      const isVisible = !isMinimized;
      button.classList.remove("is-boot-running");
      button.classList.toggle("is-minimized", isMinimized);
      button.classList.add("is-open");
      button.title = `${record.meta.title} · Middle-click to close`;
      button.setAttribute("aria-description", "Middle-click to close this window. Drag to reorder open apps.");
      button.setAttribute("aria-current", String(isVisible && activeRecord === record));
      button.setAttribute("aria-label", isMinimized ? `Restore ${record.meta.title}` : activeRecord === record ? `Minimize ${record.meta.title}` : `Bring ${record.meta.title} to front`);
    });
  }

  dockApps.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".dock-app");
    if (!button) return;
    if (event.button === 1) {
      event.preventDefault();
      return;
    }
    if (event.button !== 0) return;
    dockDrag = { button, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    button.setPointerCapture(event.pointerId);
  });

  dockApps.addEventListener("auxclick", (event) => {
    if (event.button !== 1) return;
    const button = event.target.closest(".dock-app");
    if (!button) return;
    event.preventDefault();
    const record = apps.get(button.dataset.openApp);
    if (record && !record.node.classList.contains("is-closed")) close(record);
  });

  document.addEventListener("pointermove", (event) => {
    if (!dockDrag || dockDrag.pointerId !== event.pointerId) return;
    if (!dockDrag.moved && Math.hypot(event.clientX - dockDrag.startX, event.clientY - dockDrag.startY) < 6) return;
    dockDrag.moved = true;
    dockApps.classList.add("is-reordering");
    dockDrag.button.classList.add("is-dragging");
    event.preventDefault();

    const siblings = [...dockApps.querySelectorAll(".dock-app")].filter((button) => button !== dockDrag.button);
    const before = siblings.find((button) => event.clientX < button.getBoundingClientRect().left + button.offsetWidth / 2);
    if (before) dockApps.insertBefore(dockDrag.button, before);
    else dockApps.append(dockDrag.button);
  });

  function finishDockDrag(event) {
    if (!dockDrag || (event && dockDrag.pointerId !== event.pointerId)) return;
    const finished = dockDrag;
    dockDrag = null;
    finished.button.classList.remove("is-dragging");
    dockApps.classList.remove("is-reordering");
    if (finished.button.hasPointerCapture(finished.pointerId)) finished.button.releasePointerCapture(finished.pointerId);
    if (finished.moved) {
      suppressDockClick = true;
      window.setTimeout(() => { suppressDockClick = false; }, 100);
    }
  }
  document.addEventListener("pointerup", finishDockDrag);
  document.addEventListener("pointercancel", finishDockDrag);

  const TILE_GAP = 12;
  const TILE_MIN_SPLIT = 168;
  const TILE_TARGET_ASPECT = 1.3;
  const tileOrder = [];
  const tileSplitRatios = new Map();
  let tileRoot = null;
  let tileRects = new Map();
  let tileSplitRects = new Map();
  let maximizedTileId = null;

  function focusRecord(record) {
    topZ += 1;
    record.node.style.zIndex = String(topZ);
    apps.forEach((item) => item.node.classList.toggle("is-focused", item === record));
    activeRecord = record;
    updateDock();
  }

  function setMaximizeControl(record, maximized) {
    const button = record.node.querySelector("[data-window-action='maximize']");
    button?.setAttribute("aria-label", maximized ? "Restore window size" : "Maximize");
    button?.setAttribute("aria-pressed", String(maximized));
  }

  function clearMaximizedTile() {
    if (!maximizedTileId) return;
    const record = apps.get(maximizedTileId);
    maximizedTileId = null;
    if (!record) return;
    record.node.classList.remove("is-maximized", "is-suspended");
    record.restoreBounds = null;
    setMaximizeControl(record, false);
  }

  function registerTiledWindow(record) {
    if (tileOrder.includes(record.id)) return;
    const preferredIndex = Number.isInteger(record.tileRestoreIndex) ? record.tileRestoreIndex : tileOrder.length;
    tileOrder.splice(clamp(preferredIndex, 0, tileOrder.length), 0, record.id);
    record.tileRestoreIndex = null;
  }

  function removeTiledWindow(record) {
    const index = tileOrder.indexOf(record.id);
    if (index >= 0) {
      record.tileRestoreIndex = index;
      tileOrder.splice(index, 1);
    }
    if (maximizedTileId === record.id) clearMaximizedTile();
    record.node.classList.remove("is-tiled", "is-suspended", "is-maximized");
    setMaximizeControl(record, false);
  }

  function focusMostRecent() {
    activeRecord = null;
    updateWindowLayer(false, true);
    if (activeRecord) activeRecord.node.focus({ preventScroll: true });
    else if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  }

  function close(record) {
    playSfx("close", .16);
    record.cleanup?.();
    removeTiledWindow(record);
    record.node.classList.add("is-closed");
    record.node.classList.remove("is-minimized");
    record.wasDesktopMaximized = false;
    record.desktopBounds = null;
    record.restoreBounds = null;
    record.userMinimized = false;
    record.autoMinimized = false;
    setMaximizeControl(record, false);
    focusMostRecent();
  }

  function minimize(record) {
    playSfx("close", .11);
    record.pause?.();
    removeTiledWindow(record);
    record.userMinimized = true;
    record.autoMinimized = false;
    record.node.classList.add("is-minimized");
    focusMostRecent();
  }

  function toggleMaximize(record, requestedRestoreBounds = null) {
    playSfx("click", .12);
    const maximized = record.node.classList.contains("is-maximized");
    if (maximized) {
      if (maximizedTileId === record.id) maximizedTileId = null;
      record.node.classList.remove("is-maximized", "is-suspended");
      record.restoreBounds = null;
      setMaximizeControl(record, false);
    } else {
      if (maximizedTileId && maximizedTileId !== record.id) clearMaximizedTile();
      const currentTile = tileRects.get(record.id);
      record.restoreBounds = requestedRestoreBounds
        ? { ...requestedRestoreBounds }
        : { ...(currentTile || readWindowBounds(record.node)) };
      maximizedTileId = record.id;
      record.node.classList.add("is-maximized");
      setMaximizeControl(record, true);
    }
    reflowTiledWindows();
    updateWindowLayer();
  }

  function readWindowBounds(node) {
    const left = parseFloat(node.style.left);
    const top = parseFloat(node.style.top);
    return {
      left: Number.isFinite(left) ? left : node.offsetLeft || 8,
      top: Number.isFinite(top) ? top : node.offsetTop || 8,
      width: node.offsetWidth || parseFloat(node.style.width) || 0,
      height: node.offsetHeight || parseFloat(node.style.height) || 0
    };
  }

  function applyWindowBounds(record, bounds) {
    record.node.style.left = bounds.left + "px";
    record.node.style.top = bounds.top + "px";
    record.node.style.width = bounds.width + "px";
    record.node.style.height = bounds.height + "px";
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function windowLimits(record, bounds = layer.getBoundingClientRect()) {
    const style = window.getComputedStyle(record.node);
    const maxWidth = Math.max(1, Math.min(parseFloat(style.maxWidth) || bounds.width - 16, bounds.width - 16));
    const maxHeight = Math.max(1, Math.min(parseFloat(style.maxHeight) || bounds.height - 16, bounds.height - 16));
    return {
      minWidth: Math.min(parseFloat(style.minWidth) || Math.min(280, maxWidth), maxWidth),
      minHeight: Math.min(parseFloat(style.minHeight) || Math.min(220, maxHeight), maxHeight),
      maxWidth,
      maxHeight
    };
  }

  function clampWindowBounds(record, requested, bounds = layer.getBoundingClientRect()) {
    const limits = windowLimits(record, bounds);
    const width = clamp(requested.width, limits.minWidth, limits.maxWidth);
    const height = clamp(requested.height, limits.minHeight, limits.maxHeight);
    return {
      left: clamp(requested.left, 8, Math.max(8, bounds.width - width - 8)),
      top: clamp(requested.top, 8, Math.max(8, bounds.height - height - 8)),
      width,
      height
    };
  }

  function fitWindowSize(record, requested, bounds = layer.getBoundingClientRect()) {
    const limits = windowLimits(record, bounds);
    return {
      left: requested.left,
      top: Math.max(0, requested.top),
      width: clamp(requested.width, limits.minWidth, limits.maxWidth),
      height: clamp(requested.height, limits.minHeight, limits.maxHeight)
    };
  }

  function positionWindow(record) {
    const bounds = layer.getBoundingClientRect();
    const width = Math.min(record.node.offsetWidth || 1, Math.max(1, bounds.width - 16));
    const height = Math.min(record.node.offsetHeight || 1, Math.max(1, bounds.height - 16));
    const requested = {
      left: Math.max(8, (bounds.width - width) / 2),
      top: Math.max(8, (bounds.height - height) / 2),
      width,
      height
    };
    record.floatingBounds = clampWindowBounds(record, requested, bounds);
    applyWindowBounds(record, record.floatingBounds);
  }

  function tileGapFor(length) {
    return Math.min(TILE_GAP, Math.max(0, length - 2));
  }

  function splitTileRect(rect, axis, ratio) {
    const length = axis === "x" ? rect.width : rect.height;
    const gap = tileGapFor(length);
    const available = Math.max(0, length - gap);
    const firstLength = available * clamp(ratio, .12, .88);
    const secondLength = available - firstLength;
    if (axis === "x") {
      return [
        { left: rect.left, top: rect.top, width: firstLength, height: rect.height },
        { left: rect.left + firstLength + gap, top: rect.top, width: secondLength, height: rect.height }
      ];
    }
    return [
      { left: rect.left, top: rect.top, width: rect.width, height: firstLength },
      { left: rect.left, top: rect.top + firstLength + gap, width: rect.width, height: secondLength }
    ];
  }

  function chooseTileAxis(rect) {
    const xGap = tileGapFor(rect.width);
    const yGap = tileGapFor(rect.height);
    const splitXAspect = Math.max(.05, (rect.width - xGap) / 2) / Math.max(1, rect.height);
    const splitYAspect = Math.max(1, rect.width) / Math.max(.05, (rect.height - yGap) / 2);
    const xError = Math.abs(Math.log(splitXAspect / TILE_TARGET_ASPECT));
    const yError = Math.abs(Math.log(splitYAspect / TILE_TARGET_ASPECT));
    return xError <= yError ? "x" : "y";
  }

  function buildTileTree(records, rect) {
    if (records.length === 1) return { type: "leaf", recordId: records[0].id };
    const splitAt = Math.ceil(records.length / 2);
    const firstRecords = records.slice(0, splitAt);
    const secondRecords = records.slice(splitAt);
    const axis = chooseTileAxis(rect);
    const key = axis + ":" + firstRecords.map((record) => record.id).join(",") + ">" + secondRecords.map((record) => record.id).join(",");
    const ratio = clamp(tileSplitRatios.get(key) ?? .5, .12, .88);
    const node = { type: "split", axis, key, ratio, first: null, second: null };
    const childRects = splitTileRect(rect, axis, ratio);
    node.first = buildTileTree(firstRecords, childRects[0]);
    node.second = buildTileTree(secondRecords, childRects[1]);
    return node;
  }

  function layoutTileTree(node, rect) {
    if (!node) return;
    if (node.type === "leaf") {
      tileRects.set(node.recordId, rect);
      return;
    }
    tileSplitRects.set(node.key, rect);
    const childRects = splitTileRect(rect, node.axis, node.ratio);
    layoutTileTree(node.first, childRects[0]);
    layoutTileTree(node.second, childRects[1]);
  }

  function reflowTiledWindows() {
    const bounds = layer.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    const visible = tileOrder
      .map((id) => apps.get(id))
      .filter((record) => record && !record.node.classList.contains("is-closed") && !record.node.classList.contains("is-minimized"));

    tileRects = new Map();
    tileSplitRects = new Map();
    if (maximizedTileId && !visible.some((record) => record.id === maximizedTileId)) clearMaximizedTile();

    if (!visible.length) {
      tileRoot = null;
      layer.classList.remove("is-tiled");
      apps.forEach((record) => record.node.classList.remove("is-tiled", "is-suspended"));
      return;
    }

    if (visible.length === 1 && !maximizedTileId) {
      tileRoot = null;
      layer.classList.remove("is-tiled");
      apps.forEach((record) => {
        record.node.classList.remove("is-tiled", "is-suspended", "is-maximized");
        setMaximizeControl(record, false);
      });
      const record = visible[0];
      if (!record.floatingBounds) positionWindow(record);
      else {
        record.floatingBounds = clampWindowBounds(record, record.floatingBounds, bounds);
        applyWindowBounds(record, record.floatingBounds);
      }
      record.viewportSize = { width: bounds.width, height: bounds.height };
      return;
    }

    layer.classList.add("is-tiled");
    const workspace = {
      left: 8,
      top: 8,
      width: Math.max(0, bounds.width - 16),
      height: Math.max(0, bounds.height - 16)
    };
    tileRoot = buildTileTree(visible, workspace);
    layoutTileTree(tileRoot, workspace);

    const soloRecord = maximizedTileId ? apps.get(maximizedTileId) : null;
    apps.forEach((record) => {
      const isVisible = visible.includes(record);
      record.node.classList.toggle("is-tiled", isVisible);
      record.node.classList.toggle("is-suspended", Boolean(soloRecord && isVisible && record !== soloRecord));
      if (!isVisible) return;

      const isMaximized = record === soloRecord;
      record.node.classList.toggle("is-maximized", isMaximized);
      setMaximizeControl(record, isMaximized);
      if (!isMaximized) {
        const tile = tileRects.get(record.id);
        if (tile) applyWindowBounds(record, tile);
      }
      record.viewportSize = { width: bounds.width, height: bounds.height };
    });
  }

  function tileContains(node, recordId) {
    if (!node) return false;
    if (node.type === "leaf") return node.recordId === recordId;
    return tileContains(node.first, recordId) || tileContains(node.second, recordId);
  }

  function findTileBoundary(node, recordId, axis, edge) {
    if (!node || node.type === "leaf") return null;
    const inFirst = tileContains(node.first, recordId);
    const branch = inFirst ? node.first : node.second;
    const nested = findTileBoundary(branch, recordId, axis, edge);
    if (nested) return nested;
    const boundaryBelongsToFirst = edge === "e" || edge === "s";
    return node.axis === axis && inFirst === boundaryBelongsToFirst ? node : null;
  }

  function getTileResizeTargets(record, direction) {
    const targets = {};
    const addTarget = (axis, edge) => {
      const split = findTileBoundary(tileRoot, record.id, axis, edge);
      const rect = split && tileSplitRects.get(split.key);
      if (split && rect) {
        targets[axis] = {
          key: split.key,
          ratio: split.ratio,
          length: axis === "x" ? rect.width : rect.height
        };
      }
    };
    if (direction.includes("e")) addTarget("x", "e");
    else if (direction.includes("w")) addTarget("x", "w");
    if (direction.includes("s")) addTarget("y", "s");
    else if (direction.includes("n")) addTarget("y", "n");
    return targets;
  }

  function applyTileResizeTargets(targets, deltaX, deltaY) {
    if (!targets) return;
    let changed = false;
    Object.entries(targets).forEach(([axis, target]) => {
      const available = Math.max(1, target.length - tileGapFor(target.length));
      const minimum = Math.min(TILE_MIN_SPLIT, available / 2);
      const delta = axis === "x" ? deltaX : deltaY;
      const ratio = clamp(target.ratio + delta / available, minimum / available, 1 - minimum / available);
      tileSplitRatios.set(target.key, ratio);
      changed = true;
    });
    if (changed) reflowTiledWindows();
  }

  function resizeTiledWindowByKeyboard(record, direction, deltaX, deltaY) {
    applyTileResizeTargets(getTileResizeTargets(record, direction), deltaX, deltaY);
  }

  function reorderTiledWindowAtDrop(record, event) {
    if (tileOrder.length < 2) return;
    const layerBounds = layer.getBoundingClientRect();
    const x = event.clientX - layerBounds.left;
    const y = event.clientY - layerBounds.top;
    let targetId = null;
    let nearestDistance = Infinity;
    tileOrder.forEach((id) => {
      const rect = tileRects.get(id);
      if (!rect) return;
      if (x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height) {
        targetId = id;
        nearestDistance = -1;
        return;
      }
      if (nearestDistance < 0) return;
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        targetId = id;
      }
    });
    if (!targetId || targetId === record.id) return;
    const from = tileOrder.indexOf(record.id);
    const to = tileOrder.indexOf(targetId);
    if (from < 0 || to < 0) return;
    [tileOrder[from], tileOrder[to]] = [tileOrder[to], tileOrder[from]];
  }

  function updateWindowPosition(event) {
    const { record } = drag;
    const nextTop = drag.top + event.clientY - drag.startY;
    record.userMoved = true;
    record.node.style.left = (drag.left + event.clientX - drag.startX) + "px";
    record.node.style.top = Math.max(0, nextTop) + "px";
  }

  document.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (drag.kind === "move") {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= WINDOW_DRAG_THRESHOLD) drag.moved = true;
      if (drag.wasMaximized) restoreMaximizedDrag(event);
      if (!drag.wasMaximized && drag.moved) updateWindowPosition(event);
    } else if (drag.kind === "tile-resize") {
      applyTileResizeTargets(drag.tileTargets, event.clientX - drag.startX, event.clientY - drag.startY);
    } else {
      applyResize(drag.record, drag.direction, event.clientX - drag.startX, event.clientY - drag.startY, drag.start);
    }
  });

  function restoreMaximizedDrag(event) {
    if (!drag?.wasMaximized) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < WINDOW_DRAG_THRESHOLD) return;

    const gesture = drag;
    const record = gesture.record;
    const layerBounds = layer.getBoundingClientRect();
    const grabX = clamp((gesture.startX - gesture.maximizedRect.left) / Math.max(1, gesture.maximizedRect.width), 0, 1);
    const grabY = clamp(gesture.startY - gesture.maximizedRect.top, 0, 44);
    record.node.classList.add("is-moving");
    toggleMaximize(record);

    const restored = readWindowBounds(record.node);
    const restoredBounds = {
      ...restored,
      left: event.clientX - layerBounds.left - restored.width * grabX,
      top: Math.max(0, event.clientY - layerBounds.top - grabY)
    };
    applyWindowBounds(record, restoredBounds);
    record.userMoved = true;
    record.userBounds = restoredBounds;
    gesture.left = restoredBounds.left;
    gesture.top = restoredBounds.top;
    gesture.startX = event.clientX;
    gesture.startY = event.clientY;
    gesture.wasMaximized = false;
    gesture.restoredFromMaximized = true;
  }

  function finishGesture(event) {
    if (!drag || (event && drag.pointerId !== event.pointerId)) return;
    const gesture = drag;
    let maximizeAtTopEdge = false;
    if (gesture.kind === "move" && event?.type === "pointerup") {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= WINDOW_DRAG_THRESHOLD) gesture.moved = true;
      if (gesture.wasMaximized) restoreMaximizedDrag(event);
      if (!gesture.wasMaximized) {
        const smallUpwardSnap = !gesture.restoredFromMaximized
          && event.clientY <= gesture.startY - WINDOW_SNAP_DRAG_THRESHOLD
          && gesture.start.top + event.clientY - gesture.startY <= WINDOW_SNAP_EDGE;
        if (smallUpwardSnap) gesture.moved = true;
        if (gesture.moved) {
          updateWindowPosition(event);
          maximizeAtTopEdge = smallUpwardSnap
            && readWindowBounds(gesture.record.node).top <= WINDOW_SNAP_EDGE;
        }
      }
    }
    gesture.record.node.classList.remove("is-moving", "is-resizing");
    if ((gesture.kind === "move" || gesture.kind === "resize") && !gesture.wasMaximized) {
      gesture.record.userBounds = readWindowBounds(gesture.record.node);
      gesture.record.userMoved = true;
      if (tileOrder.length === 1) {
        gesture.record.floatingBounds = maximizeAtTopEdge ? { ...gesture.start } : { ...gesture.record.userBounds };
      }
    }
    drag = null;
    if (gesture.captureTarget?.hasPointerCapture(gesture.pointerId)) {
      try { gesture.captureTarget.releasePointerCapture(gesture.pointerId); } catch { /* The pointer may already have left the document. */ }
    }

    if (maximizeAtTopEdge) {
      toggleMaximize(gesture.record, gesture.start);
    } else {
      if (gesture.kind === "move" && event?.type === "pointerup" && gesture.moved) reorderTiledWindowAtDrop(gesture.record, event);
      if (gesture.kind === "move" || gesture.kind === "tile-resize" || gesture.kind === "resize") reflowTiledWindows();
    }
  }

  document.addEventListener("pointerup", finishGesture);
  document.addEventListener("pointercancel", finishGesture);
  window.addEventListener("blur", () => finishGesture());

  function applyResize(record, direction, deltaX, deltaY, start) {
    if (record.node.classList.contains("is-maximized")) return;
    const bounds = layer.getBoundingClientRect();
    const limits = windowLimits(record, bounds);
    let left = start.left;
    let top = start.top;
    let width = start.width;
    let height = start.height;

    if (direction.includes("w")) {
      const right = start.left + start.width;
      left = clamp(start.left + deltaX, 8, right - limits.minWidth);
      width = clamp(right - left, limits.minWidth, Math.min(limits.maxWidth, bounds.width - left - 8));
      left = right - width;
    } else if (direction.includes("e")) {
      width = clamp(start.width + deltaX, limits.minWidth, Math.min(limits.maxWidth, bounds.width - start.left - 8));
    }
    if (direction.includes("n")) {
      const bottom = start.top + start.height;
      top = clamp(start.top + deltaY, 8, bottom - limits.minHeight);
      height = clamp(bottom - top, limits.minHeight, Math.min(limits.maxHeight, bounds.height - top - 8));
      top = bottom - height;
    } else if (direction.includes("s")) {
      height = clamp(start.height + deltaY, limits.minHeight, Math.min(limits.maxHeight, bounds.height - start.top - 8));
    }
    record.userResized = true;
    record.userMoved = true;
    record.userBounds = clampWindowBounds(record, { left, top, width, height }, bounds);
    applyWindowBounds(record, record.userBounds);
  }

  function updateWindowLayer(viewportChanged = false, relayout = false) {
    const bounds = layer.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;

    const opened = [...apps.values()].filter((record) => !record.node.classList.contains("is-closed"));
    if (viewportChanged) {
      apps.forEach((record) => {
        if (record.node.classList.contains("is-minimized")) {
          record.needsViewportLayout = true;
          return;
        }
        record.viewportSize = { width: bounds.width, height: bounds.height };
        record.needsViewportLayout = false;
      });
    }
    if (relayout || viewportChanged) reflowTiledWindows();

    const visible = opened.filter((record) => !record.node.classList.contains("is-minimized"));
    if (activeRecord && !visible.includes(activeRecord)) activeRecord = null;
    if (!activeRecord && visible.length) {
      activeRecord = visible.reduce((frontmost, record) =>
        Number(record.node.style.zIndex) > Number(frontmost.node.style.zIndex) ? record : frontmost
      );
    }
    apps.forEach((record) => record.node.classList.toggle("is-focused", record === activeRecord && visible.includes(record)));
    layer.hidden = visible.length === 0;
    updateDock();
  }
  function openApp(id, trigger) {
    const meta = appMeta[id];
    if (!meta) return;
    bootRunningApps.delete(id);
    lastTrigger = trigger && startMenu.contains(trigger) ? startToggle : (trigger || document.activeElement);
    if (!startMenu.hidden) setStartMenu(false, false, false);
    if (maximizedTileId && maximizedTileId !== id) clearMaximizedTile();
    layer.hidden = false;
    let record = apps.get(id);
    const needsOpenSound = !record || record.node.classList.contains("is-closed") || record.node.classList.contains("is-minimized");
    if (!record) {
      const fragment = template.content.cloneNode(true);
      const node = fragment.querySelector(".app-window");
      const appTemplate = document.querySelector(`#${id}-content`);
      if (!appTemplate) return;
      node.dataset.app = id;
      node.setAttribute("aria-label", `${meta.title} app`);
      node.querySelector(".window-app-name").textContent = meta.title;
      node.querySelector(".window-bar-center").textContent = meta.center;
      node.querySelector(".window-content").append(appTemplate.content.cloneNode(true));
      layer.append(node);
      record = { id, meta, node, userResized: false, userMoved: false, userMinimized: false, autoMinimized: false, userBounds: null, viewportSize: null, needsViewportLayout: false, tileRestoreIndex: null };
      apps.set(id, record);
      createDockButton(record.id, record.meta);
      renderWindow(record);
      node.addEventListener("pointerdown", () => focusRecord(record));
      node.querySelectorAll("[data-window-action]").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        focusRecord(record);
        if (button.dataset.windowAction === "close") close(record);
        if (button.dataset.windowAction === "minimize") minimize(record);
        if (button.dataset.windowAction === "maximize") toggleMaximize(record);
      }));
      const bar = node.querySelector(".window-bar");
      bar.addEventListener("pointerdown", (event) => {
        if (event.button === 1) {
          event.preventDefault();
          return;
        }
        if (event.button !== 0 || event.isPrimary === false || event.target.closest("button")) return;
        event.preventDefault();
        focusRecord(record);
        const wasMaximized = node.classList.contains("is-maximized");
        const maximizedRect = wasMaximized ? node.getBoundingClientRect() : null;
        drag = { kind: "move", record, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: readWindowBounds(node), left: parseFloat(node.style.left), top: parseFloat(node.style.top), wasMaximized, maximizedRect, restoredFromMaximized: false, moved: false, captureTarget: bar };
        try { bar.setPointerCapture(event.pointerId); } catch { /* Continue with document-level pointer tracking. */ }
        if (!wasMaximized) node.classList.add("is-moving");
      });
      bar.addEventListener("auxclick", (event) => {
        if (event.button !== 1) return;
        event.preventDefault();
        close(record);
      });
      bar.addEventListener("dblclick", (event) => {
        if (event.target.closest("button")) return;
        event.preventDefault();
        toggleMaximize(record);
      });

      node.querySelectorAll("[data-resize]").forEach((handle) => {
        const direction = handle.dataset.resize;
        handle.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || event.isPrimary === false || node.classList.contains("is-maximized")) return;
          event.preventDefault();
          event.stopPropagation();
          focusRecord(record);
          const resizeKind = tileOrder.length > 1 ? "tile-resize" : "resize";
          drag = { kind: resizeKind, record, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: readWindowBounds(node), direction, tileTargets: resizeKind === "tile-resize" ? getTileResizeTargets(record, direction) : null, captureTarget: handle };
          try { handle.setPointerCapture(event.pointerId); } catch { /* Continue with document-level pointer tracking. */ }
          node.classList.add("is-resizing");
        });
        if (handle.tagName === "BUTTON") handle.addEventListener("keydown", (event) => {
          if (!event.altKey || !event.shiftKey || !event.key.startsWith("Arrow")) return;
          event.preventDefault();
          const delta = 18;
          const deltaX = event.key === "ArrowRight" ? delta : event.key === "ArrowLeft" ? -delta : 0;
          const deltaY = event.key === "ArrowDown" ? delta : event.key === "ArrowUp" ? -delta : 0;
          if (tileOrder.length > 1) resizeTiledWindowByKeyboard(record, direction, deltaX, deltaY);
          else applyResize(record, direction, deltaX, deltaY, readWindowBounds(node));
        });
      });
    } else {
      record.node.classList.remove("is-closed", "is-minimized");
      record.userMinimized = false;
      record.autoMinimized = false;
    }
    if (!record.floatingBounds) positionWindow(record);
    registerTiledWindow(record);
    focusRecord(record);
    updateWindowLayer(record.needsViewportLayout, true);
    record.needsViewportLayout = false;
    if (record.id === "terminal") record.node.querySelector("[data-terminal-input]")?.focus({ preventScroll: true });
    else record.node.focus({ preventScroll: true });
    if (!trigger && record.id === "about" && needsOpenSound) startupOpenSoundPending = true;
    else playSfx(needsOpenSound ? "open" : "click", needsOpenSound ? .15 : .1);
  }

  function renderWindow(record) {
    const content = record.node.querySelector(".window-content");
    if (record.id === "about") {
      content.querySelector(".profile-intro").textContent = data.profile.bio;
      content.querySelector(".education-value").textContent = `${data.profile.education} · ${data.profile.educationDates}`;
    }
    if (record.id === "projects") {
      content.querySelector(".project-list").innerHTML = data.projects.map((project) => {
        const projectLinks = [
          { label: "Live demo", url: project.demoUrl },
          { label: "Source code", url: project.githubUrl }
        ].filter((link) => link.url);
        const highlights = (project.highlights || []).slice(0, 3);
        return '<article class="project-entry"><span class="project-category">' + escapeHTML(project.category || "Project") + '</span><div class="project-summary"><h3>' + escapeHTML(project.name) + '</h3><p class="project-tagline">' + escapeHTML(project.tagline) + '</p><p class="project-description">' + escapeHTML(project.description) + '</p></div>' + (highlights.length ? '<ul class="project-highlights">' + highlights.map((highlight) => '<li>' + escapeHTML(highlight) + '</li>').join("") + '</ul>' : '') + '<div class="project-tech">' + project.tech.map((technology) => '<span>' + escapeHTML(technology) + '</span>').join("") + '</div><div class="project-actions">' + projectLinks.map((link) => '<a href="' + escapeAttribute(link.url) + '" target="_blank" rel="noopener noreferrer">' + link.label + ' <span aria-hidden="true">↗</span></a>').join("") + '</div></article>';
      }).join("");
    }
    if (record.id === "toolkit") {
      content.querySelector(".skill-groups").innerHTML = data.skills.map((group) => `<section class="skill-group"><h3>${escapeHTML(group.name)}</h3><div class="skill-chips">${group.items.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div></section>`).join("");
      initSkillSearch(record);
    }
    if (record.id === "contact") initContactActions(record);
    if (record.id === "preferences") document.dispatchEvent(new CustomEvent("portfolio-preferences-init", { detail: { record, setTheme } }));
    if (record.id === "terminal") initTerminal(record);
    if (record.id === "notes") initNotes(record);
  }

  function initSkillSearch(record) {
    const content = record.node.querySelector(".window-content");
    const input = content.querySelector("[data-skill-search]");
    const groups = [...content.querySelectorAll(".skill-group")];
    const count = content.querySelector("[data-skill-count]");
    const empty = content.querySelector("[data-skills-empty]");
    const total = groups.reduce((sum, group) => sum + group.querySelectorAll(".skill-chips span").length, 0);
    function filterSkills() {
      const query = input.value.trim().toLocaleLowerCase();
      let matches = 0;
      groups.forEach((group) => {
        let groupMatches = 0;
        group.querySelectorAll(".skill-chips span").forEach((chip) => {
          const visible = !query || chip.textContent.toLocaleLowerCase().includes(query);
          chip.hidden = !visible;
          if (visible) groupMatches += 1;
        });
        group.hidden = groupMatches === 0;
        matches += groupMatches;
      });
      count.textContent = query ? `${matches} of ${total}` : `${total} skills`;
      empty.hidden = matches > 0;
    }
    input.addEventListener("input", filterSkills);
    filterSkills();
  }

  function initContactActions(record) {
    const content = record.node.querySelector(".window-content");
    const form = content.querySelector("[data-contact-form]");
    const status = content.querySelector("[data-contact-status]");
    const feedbackToggle = content.querySelector("[data-feedback-toggle]");
    const feedbackPanel = content.querySelector("[data-feedback-panel]");
    const feedbackField = content.querySelector("[data-feedback-field]");
    const requiredFields = [...form.querySelectorAll("[data-contact-field][required]")];
    const touchedFields = new WeakSet();

    function validateField(field) {
      const value = field.value.trim();
      const fieldName = field.dataset.contactField;
      let message = "";

      if (!value) {
        message = fieldName === "message" ? "Add a message before sending." : "Enter your " + fieldName + ".";
      } else if (field.type === "email" && !field.validity.valid) {
        message = "Enter a valid email address.";
      }

      const error = content.querySelector('[data-contact-error="' + fieldName + '"]');
      error.textContent = message;
      error.hidden = !message;
      field.setAttribute("aria-invalid", String(Boolean(message)));
      return !message;
    }

    requiredFields.forEach((field) => {
      field.addEventListener("blur", () => {
        touchedFields.add(field);
        validateField(field);
      });
      field.addEventListener("input", () => {
        if (touchedFields.has(field)) validateField(field);
        status.textContent = "";
      });
    });

    feedbackToggle.addEventListener("click", () => {
      const isOpen = feedbackToggle.getAttribute("aria-expanded") !== "true";
      feedbackToggle.setAttribute("aria-expanded", String(isOpen));
      feedbackPanel.hidden = !isOpen;
      feedbackField.disabled = !isOpen;
      content.querySelector("[data-feedback-indicator]").textContent = isOpen ? "−" : "+";
      if (isOpen) feedbackField.focus({ preventScroll: true });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const invalidFields = requiredFields.filter((field) => !validateField(field));
      if (invalidFields.length) {
        status.textContent = "Please check the highlighted fields.";
        invalidFields[0].focus({ preventScroll: true });
        return;
      }

      const name = form.elements.namedItem("name").value.trim();
      const email = form.elements.namedItem("email").value.trim();
      const message = form.elements.namedItem("message").value.trim();
      const feedback = feedbackField.disabled ? "" : feedbackField.value.trim();
      const subjectName = name.replace(/[\r\n\t]+/g, " ").slice(0, 80);
      const body = [
        "Name: " + name,
        "Email: " + email,
        "",
        "Message:",
        message
      ];
      if (feedback) body.push("", "Optional feedback:", feedback);

      const recipient = encodeURIComponent(data.profile.email.trim());
      const subject = encodeURIComponent("Portfolio message from " + subjectName);
      const contents = encodeURIComponent(body.join("\r\n"));
      status.textContent = "Opening your email app with the message details.";
      window.location.href = "mailto:" + recipient + "?subject=" + subject + "&body=" + contents;
    });
  }

  function initTerminal(record) {
    const content = record.node.querySelector(".window-content");
    const output = content.querySelector("[data-terminal-output]");
    const form = content.querySelector("[data-terminal-form]");
    const input = content.querySelector("[data-terminal-input]");
    const history = [];
    let historyIndex = 0;
    const aliases = {
      about: "about", "about me": "about", "about.me": "about", profile: "about",
      projects: "projects", work: "projects", "skills.box": "toolkit", skills: "toolkit", toolkit: "toolkit", "skills & tools": "toolkit",
      terminal: "terminal",
      "notes.pad": "notes", notes: "notes", "sticky notes": "notes", "contact.msg": "contact", contact: "contact"
    };
    function write(text, className = "terminal-result") {
      const line = document.createElement("p");
      line.className = className;
      line.textContent = text;
      output.append(line);
      output.scrollTop = output.scrollHeight;
    }
    function execute(commandLine) {
      const normalized = commandLine.trim();
      if (!normalized) return;
      write(`ranjan@portfolio:~$ ${normalized}`, "terminal-command");
      const [command, ...rest] = normalized.split(/\s+/);
      const commandName = command.toLowerCase();
      const argument = rest.join(" ").trim();
      if (commandName === "help") {
        write("help · ls · date · whoami · history · echo <text> · open <app> · theme <light|dark> · clear");
        write("Apps: about.me, projects, skills.box, terminal, notes.pad, contact.msg");
      } else if (commandName === "ls") {
        write("about.me  projects  skills.box  terminal  notes.pad  contact.msg");
      } else if (commandName === "date") {
        write(new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(new Date()));
      } else if (commandName === "whoami" || commandName === "about") {
        write(`${data.profile.name} — ${data.profile.title}`);
      } else if (commandName === "history") {
        history.forEach((entry, index) => write(`${String(index + 1).padStart(2, " ")}  ${entry}`));
        if (!history.length) write("No commands yet.");
      } else if (commandName === "echo") {
        write(argument);
      } else if (commandName === "clear") {
        output.replaceChildren();
      } else if (commandName === "theme") {
        if (["dark", "light"].includes(argument.toLowerCase())) {
          setTheme(argument.toLowerCase() === "dark");
          write(`Appearance set to ${argument.toLowerCase()}.`);
        } else write("Usage: theme light | theme dark");
      } else if (commandName === "open") {
        const appId = aliases[argument.toLowerCase()];
        if (appId) {
          write(`Opening ${appMeta[appId].title}…`);
          openApp(appId, record.node);
        } else write(`No app named “${argument || ""}”. Type ls to see the available apps.`);
      } else if (aliases[commandName]) {
        openApp(aliases[commandName], record.node);
      } else write(`Command not found: ${commandName}. Type help to see what this shell can do.`);
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const command = input.value;
      if (command.trim()) {
        playSfx("click", .08);
        history.push(command);
        historyIndex = history.length;
        execute(command);
      }
      input.value = "";
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex] || "";
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || "";
      }
    });
    content.querySelector(".terminal-shell").addEventListener("click", (event) => {
      if (!event.target.closest("button, a")) input.focus({ preventScroll: true });
    });
  }

  function initNotes(record) {
    const content = record.node.querySelector(".window-content");
    const board = content.querySelector("[data-notes-board]");
    const addButton = content.querySelector("[data-note-add]");
    const undoButton = content.querySelector("[data-note-undo]");
    const countLabel = content.querySelector("[data-notes-count]");
    const statusLabel = content.querySelector("[data-notes-status]");
    const colors = ["sage", "sand", "rose"];
    let notes = [];
    let deletedNote = null;
    let undoTimer = null;
    try {
      const saved = JSON.parse(localStorage.getItem("ranjan-os-notes") || "[]");
      if (Array.isArray(saved)) notes = saved.filter((note) => note && typeof note.text === "string").slice(0, 40);
    } catch { notes = []; }

    function save() {
      try {
        localStorage.setItem("ranjan-os-notes", JSON.stringify(notes));
        statusLabel.textContent = "Saved locally";
        statusLabel.dataset.saveState = "saved";
      } catch {
        statusLabel.textContent = "Could not save notes";
        statusLabel.dataset.saveState = "error";
      }
    }
    function syncCount() {
      countLabel.textContent = `${notes.length} of 40 notes`;
      addButton.disabled = notes.length >= 40;
      addButton.title = addButton.disabled ? "The board is full" : "Add a note";
    }
    function clearUndo() {
      window.clearTimeout(undoTimer);
      undoTimer = null;
      deletedNote = null;
      undoButton.hidden = true;
    }
    function render(focusFirst = false) {
      board.replaceChildren();
      syncCount();
      if (!notes.length) {
        const empty = document.createElement("p");
        empty.className = "notes-empty";
        empty.textContent = "No notes yet. Add one to save an idea.";
        board.append(empty);
        return;
      }
      notes.forEach((note, index) => {
        const card = document.createElement("article");
        const color = colors.includes(note.color) ? note.color : colors[index % colors.length];
        note.color = color;
        card.className = `sticky-note note-${color}`;
        const head = document.createElement("div");
        head.className = "sticky-note-head";
        const tools = document.createElement("div");
        tools.className = "sticky-note-tools";
        const colorButton = document.createElement("button");
        colorButton.type = "button";
        colorButton.title = "Change note color";
        colorButton.setAttribute("aria-label", "Change note color");
        colorButton.textContent = "◒";
        colorButton.addEventListener("click", () => {
          playSfx("click", .08);
          note.color = colors[(colors.indexOf(note.color) + 1) % colors.length];
          save();
          render();
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.title = "Delete note";
        deleteButton.setAttribute("aria-label", "Delete note");
        deleteButton.textContent = "×";
        deleteButton.addEventListener("click", () => {
          playSfx("close", .11);
          clearUndo();
          deletedNote = { note: { ...note }, index };
          notes.splice(index, 1);
          save();
          undoButton.hidden = false;
          undoTimer = window.setTimeout(clearUndo, 6000);
          render();
        });
        tools.append(colorButton, deleteButton);
        head.append(tools);
        const textarea = document.createElement("textarea");
        textarea.placeholder = "Write a thought…";
        textarea.value = note.text;
        textarea.setAttribute("aria-label", `Sticky note ${index + 1}`);
        textarea.addEventListener("input", () => { note.text = textarea.value; save(); });
        card.append(head, textarea);
        board.append(card);
      });
      if (focusFirst) board.querySelector("textarea")?.focus({ preventScroll: true });
    }

    addButton.addEventListener("click", () => {
      if (notes.length >= 40) return;
      clearUndo();
      playSfx("success", .12);
      notes.unshift({ id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: "", color: colors[notes.length % colors.length] });
      save();
      render(true);
    });
    undoButton.addEventListener("click", () => {
      if (!deletedNote || notes.length >= 40) return;
      notes.splice(Math.min(deletedNote.index, notes.length), 0, deletedNote.note);
      clearUndo();
      save();
      playSfx("success", .1);
      render();
    });
    render();
  }

  function activateApp(id, trigger, forceFocus = false) {
    if (!appMeta[id]) return;
    if (!startMenu.hidden) setStartMenu(false, false, false);
    lastTrigger = startMenu.contains(trigger) ? startToggle : trigger;
    const record = apps.get(id);
    if (record && !record.node.classList.contains("is-closed") && !record.node.classList.contains("is-minimized")) {
      if (forceFocus) { playSfx("click", .1); focusRecord(record); }
      else if (activeRecord === record) minimize(record);
      else {
        if (maximizedTileId && maximizedTileId !== id) {
          clearMaximizedTile();
          reflowTiledWindows();
        }
        playSfx("click", .1);
        focusRecord(record);
      }
      return;
    }
    openApp(id, trigger);
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-app]");
    if (!trigger) return;
    event.preventDefault();
    if (trigger.classList.contains("dock-app") && suppressDockClick) return;
    activateApp(trigger.dataset.openApp, trigger);
  });

  document.addEventListener("portfolio-open-app", (event) => {
    const { id, trigger, forceFocus } = event.detail || {};
    if (trigger instanceof Element) activateApp(id, trigger, forceFocus);
  });
  document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a");
    if (!sfxOn || !control || control === sfxButton) return;
    if (control.matches("#start-toggle, #theme-toggle, #start-settings, [data-open-app], [data-window-action], [data-note-add], [data-note-undo], .app-shortcut")) return;
    if (control.closest(".window-controls, .sticky-note-tools, [data-terminal-form]")) return;
    playSfx("click", .1);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!startMenu.hidden) {
      setStartMenu(false, true);
      return;
    }
    if (activeRecord) close(activeRecord);
  });
  let viewportLayoutFrame = 0;
  function scheduleViewportLayout() {
    if (drag) finishGesture();
    if (viewportLayoutFrame) return;
    viewportLayoutFrame = window.requestAnimationFrame(() => {
      viewportLayoutFrame = 0;
      apps.forEach((r) => { if (r.node.classList.contains("is-closed") || r.node.classList.contains("is-minimized")) r.needsViewportLayout = true; });
      updateWindowLayer(true);
    });
  }
  window.addEventListener("resize", scheduleViewportLayout);
  window.visualViewport?.addEventListener("resize", scheduleViewportLayout);
  if ("ResizeObserver" in window) new ResizeObserver(scheduleViewportLayout).observe(desktop);

  const clockTime = document.querySelector("#clock-time");
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
  let clockShowsDate = false;
  let clockTargetShowsDate = false;
  let clockTransitionTimer = 0;
  function updateClock() {
    const now = new Date();
    const text = clockShowsDate ? dateFormatter.format(now) : timeFormatter.format(now).toUpperCase();
    if (clockTime.textContent !== text) clockTime.textContent = text;
  }
  clockTime.addEventListener("click", () => {
    clockTargetShowsDate = !clockTargetShowsDate;
    const nextShowsDate = clockTargetShowsDate;
    window.clearTimeout(clockTransitionTimer);
    clockTime.classList.add("is-changing");
    clockTime.setAttribute("aria-pressed", String(nextShowsDate));
    clockTime.setAttribute("aria-label", nextShowsDate ? "Current date; click to show time" : "Current local time; click to show date");
    clockTime.title = nextShowsDate ? "Click to show time" : "Click to show date";
    clockTransitionTimer = window.setTimeout(() => {
      clockShowsDate = nextShowsDate;
      updateClock();
      clockTime.classList.remove("is-changing");
    }, 110);
  });
  openApp("about", null);
  ["projects", "toolkit", "contact"].forEach((id) => createDockButton(id, appMeta[id]));
  updateDock();
  updateClock();
  window.setInterval(updateClock, 1_000);

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }
  function escapeAttribute(value) { return escapeHTML(value); }
})();
