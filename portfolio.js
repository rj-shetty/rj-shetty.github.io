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
  const startMenu = document.querySelector("#start-menu");
  const startToggle = document.querySelector("#start-toggle");
  const compact = window.matchMedia("(max-width: 760px)");
  const appMeta = {
    about: { title: "About Me", center: "A LITTLE ABOUT ME", width: 560, height: 450, minWidth: 440, minHeight: 360 },
    projects: { title: "Projects", center: "SELECTED WORK", width: 850, height: 640 },
    toolkit: { title: "Skills & Tools", center: "WHAT I BUILD WITH", width: 610, height: 540 },
    contact: { title: "Contact Ranjan", center: "LET’S TALK", width: 560, height: 520 },
    terminal: { title: "Terminal", center: "RANJAN SHELL", width: 650, height: 530 },
    notes: { title: "Sticky Notes", center: "YOUR LITTLE CORKBOARD", width: 680, height: 570 }
  };
  const apps = new Map();
  const bootRunningApps = new Set(["projects", "toolkit", "contact"]);
  let compactMode = compact.matches;
  let topZ = 4;
  let activeRecord = null;
  let lastTrigger = null;
  let drag = null;
  let dockDrag = null;
  let suppressDockClick = false;
  let sfxOn = true;
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
    contact: '<rect x="3.3" y="5.2" width="17.4" height="13.6" rx="2"/><path d="m4.3 7 7.7 5.8L19.7 7"/><path class="icon-accent" d="m4.4 17.1 5.1-4"/>'
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


  function setTheme(isDark, persist = true) {
    desktop.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("theme-dark", isDark);
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    themeButton.title = isDark ? "Switch to light theme" : "Switch to dark theme";
    themeMeta.setAttribute("content", isDark ? "#202822" : "#edf1e8");
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
    const indicator = document.createElement("i");
    indicator.setAttribute("aria-hidden", "true");
    button.append(glyph, indicator);
    dockApps.append(button);
  }

  function updateDock() {
    apps.forEach((record, id) => {
      const isOpen = !record.node.classList.contains("is-closed");
      if (isOpen && !dockApps.querySelector(`.dock-app[data-open-app="${id}"]`)) createDockButton(id, record.meta);
      document.querySelectorAll(`[data-open-app="${id}"]`).forEach((button) => button.classList.toggle("is-open", isOpen));
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

  function focusRecord(record) {
    topZ += 1;
    record.node.style.zIndex = String(topZ);
    apps.forEach((item) => item.node.classList.toggle("is-focused", item === record));
    activeRecord = record;
    updateDock();
  }

  function focusMostRecent() {
    const visible = [...apps.values()].filter((record) => !record.node.classList.contains("is-closed") && !record.node.classList.contains("is-minimized"));
    const next = visible.sort((a, b) => Number(b.node.style.zIndex) - Number(a.node.style.zIndex))[0];
    if (next) {
      focusRecord(next);
      next.node.focus({ preventScroll: true });
      return;
    }
    activeRecord = null;
    layer.hidden = true;
    updateDock();
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  }

  function close(record) {
    playSfx("close", .16);
    record.cleanup?.();
    record.node.classList.add("is-closed");
    record.node.classList.remove("is-minimized", "is-maximized");
    record.wasDesktopMaximized = false;
    record.desktopBounds = null;
    record.restoreBounds = null;
    record.node.querySelector("[data-window-action='maximize']")?.setAttribute("aria-label", "Maximize");
    record.node.querySelector("[data-window-action='maximize']")?.setAttribute("aria-pressed", "false");
    focusMostRecent();
  }

  function minimize(record) {
    playSfx("close", .11);
    record.pause?.();
    record.node.classList.add("is-minimized");
    focusMostRecent();
  }

  function toggleMaximize(record) {
    if (compact.matches) return;
    playSfx("click", .12);
    const button = record.node.querySelector("[data-window-action='maximize']");
    const maximized = record.node.classList.contains("is-maximized");
    if (maximized) {
      record.node.classList.remove("is-maximized");
      if (record.restoreBounds) applyWindowBounds(record, record.restoreBounds);
      record.restoreBounds = null;
    } else {
      record.restoreBounds = readWindowBounds(record.node);
      record.node.classList.add("is-maximized");
    }
    const isMaximized = !maximized;
    button.setAttribute("aria-label", isMaximized ? "Restore window size" : "Maximize");
    button.setAttribute("aria-pressed", String(isMaximized));
  }

  function readWindowBounds(node) {
    return {
      left: parseFloat(node.style.left) || 8,
      top: parseFloat(node.style.top) || 8,
      width: parseFloat(node.style.width) || node.offsetWidth,
      height: parseFloat(node.style.height) || node.offsetHeight
    };
  }

  function applyWindowBounds(record, bounds) {
    record.node.style.left = `${bounds.left}px`;
    record.node.style.top = `${bounds.top}px`;
    record.node.style.width = `${bounds.width}px`;
    record.node.style.height = `${bounds.height}px`;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function updateWindowPosition(event) {
    const { record } = drag;
    const bounds = layer.getBoundingClientRect();
    const visibleGrip = Math.min(160, record.node.offsetWidth);
    const minLeft = 8 - record.node.offsetWidth + visibleGrip;
    const maxLeft = bounds.width - visibleGrip;
    const titleHeight = record.node.querySelector(".window-bar").offsetHeight || 44;
    const maxTop = bounds.height - titleHeight;
    record.node.style.left = `${clamp(drag.left + event.clientX - drag.startX, minLeft, maxLeft)}px`;
    record.node.style.top = `${clamp(drag.top + event.clientY - drag.startY, 8, maxTop)}px`;
  }

  document.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (drag.kind === "move") updateWindowPosition(event);
    else applyResize(drag.record, drag.direction, event.clientX - drag.startX, event.clientY - drag.startY, drag.start);
  });

  function finishGesture(event) {
    if (!drag || (event && drag.pointerId !== event.pointerId)) return;
    const gesture = drag;
    gesture.record.node.classList.remove("is-moving", "is-resizing");
    drag = null;
    if (gesture.captureTarget?.hasPointerCapture(gesture.pointerId)) {
      try { gesture.captureTarget.releasePointerCapture(gesture.pointerId); } catch { /* The pointer may already have left the document. */ }
    }
  }
  document.addEventListener("pointerup", finishGesture);
  document.addEventListener("pointercancel", finishGesture);
  window.addEventListener("blur", () => finishGesture());

  function applyResize(record, direction, deltaX, deltaY, start) {
    if (compact.matches || record.node.classList.contains("is-maximized")) return;
    const bounds = layer.getBoundingClientRect();
    const minWidth = Math.min(record.meta.minWidth || 360, bounds.width - 16);
    const minHeight = Math.min(record.meta.minHeight || 300, bounds.height - 16);
    let left = start.left;
    let top = start.top;
    let width = start.width;
    let height = start.height;

    if (direction.includes("w")) {
      left = clamp(start.left + deltaX, 8, start.left + start.width - minWidth);
      width = start.left + start.width - left;
    } else if (direction.includes("e")) {
      width = clamp(start.width + deltaX, minWidth, bounds.width - start.left - 8);
    }
    if (direction.includes("n")) {
      top = clamp(start.top + deltaY, 8, start.top + start.height - minHeight);
      height = start.top + start.height - top;
    } else if (direction.includes("s")) {
      height = clamp(start.height + deltaY, minHeight, bounds.height - start.top - 8);
    }
    applyWindowBounds(record, { left, top, width, height });
  }

  function positionWindow(record) {
    if (compact.matches || record.node.classList.contains("is-maximized")) return;
    const bounds = layer.getBoundingClientRect();
    const maxWidth = bounds.width - 16;
    const maxHeight = bounds.height - 16;
    const minWidth = Math.min(record.meta.minWidth || 360, maxWidth);
    const minHeight = Math.min(record.meta.minHeight || 300, maxHeight);
    const saved = readWindowBounds(record.node);
    const hasSavedSize = Number.isFinite(parseFloat(record.node.style.width));
    const initialWidth = Math.min(record.meta.width, bounds.width * .86);
    const initialHeight = Math.min(record.meta.height, bounds.height * .86);
    const width = clamp(hasSavedSize ? saved.width : initialWidth, minWidth, maxWidth);
    const height = clamp(hasSavedSize ? saved.height : initialHeight, minHeight, maxHeight);
    const openCount = [...apps.values()].filter((item) => item !== record && !item.node.classList.contains("is-closed") && !item.node.classList.contains("is-minimized")).length;
    const cascadeOffset = openCount === 0 ? 0 : Math.ceil(openCount / 2) * 28 * (openCount % 2 ? 1 : -1);
    const defaultLeft = bounds.width / 2 - width / 2 + cascadeOffset;
    const defaultTop = bounds.height / 2 - height / 2 + cascadeOffset * .7;
    const visibleGrip = Math.min(160, width);
    const minLeft = 8 - width + visibleGrip;
    const maxLeft = bounds.width - visibleGrip;
    const titleHeight = record.node.querySelector(".window-bar").offsetHeight || 44;
    const hasSavedLeft = Number.isFinite(parseFloat(record.node.style.left));
    const left = hasSavedLeft
      ? clamp(saved.left, minLeft, maxLeft)
      : clamp(defaultLeft, 8, bounds.width - width - 8);
    const top = clamp(Number.isFinite(parseFloat(record.node.style.top)) ? saved.top : defaultTop, 8, bounds.height - titleHeight);
    applyWindowBounds(record, { width, height, left, top });
  }

  function openApp(id, trigger) {
    const meta = appMeta[id];
    if (!meta) return;
    bootRunningApps.delete(id);
    lastTrigger = trigger && startMenu.contains(trigger) ? startToggle : (trigger || document.activeElement);
    if (!startMenu.hidden) setStartMenu(false, false, false);
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
      record = { id, meta, node };
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
        if (event.button !== 0 || compact.matches || event.target.closest("button") || record.node.classList.contains("is-maximized")) return;
        event.preventDefault();
        focusRecord(record);
        drag = { kind: "move", record, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: parseFloat(node.style.left), top: parseFloat(node.style.top), captureTarget: bar };
        try { bar.setPointerCapture(event.pointerId); } catch { /* Continue with document-level pointer tracking. */ }
        node.classList.add("is-moving");
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
          if (event.button !== 0 || compact.matches || node.classList.contains("is-maximized")) return;
          event.preventDefault();
          event.stopPropagation();
          focusRecord(record);
          drag = { kind: "resize", record, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: readWindowBounds(node), direction, captureTarget: handle };
          try { handle.setPointerCapture(event.pointerId); } catch { /* Continue with document-level pointer tracking. */ }
          node.classList.add("is-resizing");
        });
        if (handle.tagName === "BUTTON") handle.addEventListener("keydown", (event) => {
          if (!event.altKey || !event.shiftKey || !event.key.startsWith("Arrow")) return;
          event.preventDefault();
          const delta = 18;
          const deltaX = event.key === "ArrowRight" ? delta : event.key === "ArrowLeft" ? -delta : 0;
          const deltaY = event.key === "ArrowDown" ? delta : event.key === "ArrowUp" ? -delta : 0;
          applyResize(record, direction, deltaX, deltaY, readWindowBounds(node));
        });
      });
      positionWindow(record);
    } else {
      record.node.classList.remove("is-closed", "is-minimized");
      positionWindow(record);
    }
    focusRecord(record);
    if (record.id === "terminal") record.node.querySelector("[data-terminal-input]")?.focus({ preventScroll: true });
    else record.node.focus({ preventScroll: true });
    playSfx(needsOpenSound ? "open" : "click", needsOpenSound ? .15 : .1);
  }

  function renderWindow(record) {
    const content = record.node.querySelector(".window-content");
    if (record.id === "about") {
      content.querySelector(".profile-intro").textContent = data.profile.bio;
      content.querySelector(".education-value").textContent = `${data.profile.education} · ${data.profile.educationDates}`;
    }
    if (record.id === "projects") {
      const githubProfile = data.socials.find((social) => social.name === "GitHub")?.url;
      content.querySelector(".github-link").href = githubProfile || "https://github.com";
      content.querySelector(".project-count-value").textContent = String(data.projects.length).padStart(2, "0");
      content.querySelector(".project-list").classList.toggle("is-single", data.projects.length === 1);
      content.querySelector(".project-list").innerHTML = data.projects.map((project) => {
        const projectLinks = [
          { label: "Live project", url: project.demoUrl },
          { label: "Source code", url: project.githubUrl && project.githubUrl !== githubProfile ? project.githubUrl : null }
        ].filter((link) => link.url);
        const highlights = (project.highlights || []).slice(0, 3);
        return `<article class="project-entry"><div class="project-card-top"><span class="project-badge">${escapeHTML(project.badge || "Project")}</span><span class="project-category">${escapeHTML(project.category)}</span></div><div class="project-summary"><h3>${escapeHTML(project.name)}</h3><p class="project-tagline">${escapeHTML(project.tagline)}</p><p class="project-description">${escapeHTML(project.description)}</p></div>${highlights.length ? `<ul class="project-highlights">${highlights.map((highlight) => `<li>${escapeHTML(highlight)}</li>`).join("")}</ul>` : ""}<div class="project-tech">${project.tech.map((technology) => `<span>${escapeHTML(technology)}</span>`).join("")}</div><div class="project-actions">${projectLinks.map((link) => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a>`).join("")}</div></article>`;
      }).join("");
    }
    if (record.id === "toolkit") {
      content.querySelector(".skill-groups").innerHTML = data.skills.map((group) => `<section class="skill-group"><h3>${escapeHTML(group.name)}</h3><div class="skill-chips">${group.items.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div></section>`).join("");
      initSkillSearch(record);
    }
    if (record.id === "contact") {
      content.querySelector(".email-value").textContent = data.profile.email;
      content.querySelector(".contact-email").href = `mailto:${encodeURIComponent(data.profile.email)}`;
      content.querySelector(".location-value").textContent = data.profile.location;
      content.querySelector(".social-links").innerHTML = data.socials.map((social) => `<a href="${escapeAttribute(social.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(social.name)} ↗</a>`).join("");
      initContactActions(record);
    }
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
    const button = content.querySelector("[data-copy-email]");
    const status = content.querySelector("[data-copy-status]");
    const email = data.profile.email;
    button.addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
        } else {
          const helper = document.createElement("textarea");
          helper.value = email;
          helper.setAttribute("readonly", "");
          helper.style.position = "fixed";
          helper.style.opacity = "0";
          document.body.append(helper);
          helper.select();
          const copied = document.execCommand("copy");
          helper.remove();
          if (!copied) throw new Error("Copy unavailable");
        }
        status.textContent = "Email copied to clipboard.";
        playSfx("success", .1);
      } catch {
        status.textContent = "Copy was unavailable. Select the address above instead.";
      }
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
        statusLabel.textContent = "SAVED ON THIS DEVICE";
        statusLabel.dataset.saveState = "saved";
      } catch {
        statusLabel.textContent = "STORAGE UNAVAILABLE";
        statusLabel.dataset.saveState = "error";
      }
    }
    function syncCount() {
      countLabel.textContent = `${notes.length} / 40 notes`;
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
        empty.textContent = "Your board is clear. Add a note whenever an idea shows up.";
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
        const label = document.createElement("span");
        label.textContent = `NOTE ${String(index + 1).padStart(2, "0")}`;
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
        head.append(label, tools);
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

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-app]");
    if (!trigger) return;
    event.preventDefault();
    if (trigger.classList.contains("dock-app") && suppressDockClick) return;
    if (!startMenu.hidden) setStartMenu(false, false, false);
    lastTrigger = startMenu.contains(trigger) ? startToggle : trigger;
    const record = apps.get(trigger.dataset.openApp);
    if (record && !record.node.classList.contains("is-closed") && !record.node.classList.contains("is-minimized")) {
      if (activeRecord === record) minimize(record);
      else { playSfx("click", .1); focusRecord(record); }
      return;
    }
    openApp(trigger.dataset.openApp, trigger);
  });
  document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a");
    if (!sfxOn || !control || control === sfxButton) return;
    if (control.matches("#start-toggle, #theme-toggle, [data-open-app], [data-window-action], [data-note-add], [data-note-undo], [data-copy-email]")) return;
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
  window.addEventListener("resize", () => {
    const nextCompactMode = compact.matches;
    if (nextCompactMode !== compactMode) {
      if (nextCompactMode) {
        apps.forEach((record) => {
          record.wasDesktopMaximized = record.node.classList.contains("is-maximized");
          record.desktopBounds = record.wasDesktopMaximized && record.restoreBounds
            ? { ...record.restoreBounds }
            : readWindowBounds(record.node);
          record.node.classList.remove("is-maximized");
          const maximizeButton = record.node.querySelector("[data-window-action='maximize']");
          maximizeButton.setAttribute("aria-label", "Maximize");
          maximizeButton.setAttribute("aria-pressed", "false");
          ["left", "top", "width", "height"].forEach((property) => record.node.style.removeProperty(property));
        });
      } else {
        apps.forEach((record) => {
          if (record.desktopBounds) applyWindowBounds(record, record.desktopBounds);
          positionWindow(record);
          if (record.wasDesktopMaximized) {
            record.restoreBounds = readWindowBounds(record.node);
            record.node.classList.add("is-maximized");
            const maximizeButton = record.node.querySelector("[data-window-action='maximize']");
            maximizeButton.setAttribute("aria-label", "Restore window size");
            maximizeButton.setAttribute("aria-pressed", "true");
          }
          record.wasDesktopMaximized = false;
          record.desktopBounds = null;
        });
      }
      compactMode = nextCompactMode;
    } else if (!nextCompactMode) {
      apps.forEach(positionWindow);
    }
  });

  function updateClock() {
    document.querySelector("#clock-time").textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  }
  openApp("about", null);
  ["projects", "toolkit", "contact"].forEach((id) => createDockButton(id, appMeta[id]));
  updateDock();
  updateClock();
  window.setInterval(updateClock, 30_000);

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }
  function escapeAttribute(value) { return escapeHTML(value); }
})();
