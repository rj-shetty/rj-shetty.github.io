(function () {
  const desktop = document.querySelector("#desktop");
  const workspace = document.querySelector("#home");
  const desktopApps = document.querySelector("#desktop-apps");
  const startMenu = document.querySelector("#start-menu");
  const launcher = startMenu?.querySelector(".start-menu-list");
  const contextMenu = document.querySelector("#desktop-context-menu");
  const status = document.querySelector("#desktop-status");
  if (!desktop || !workspace || !desktopApps || !launcher || !contextMenu || !status) return;

  const storageKey = "ranjan-os-desktop-shortcuts-v1";
  const defaultShortcuts = [
    { id: "projects", name: "Projects" },
    { id: "terminal", name: "Terminal" },
    { id: "toolkit", name: "Skills.box" },
    { id: "notes", name: "Notes.pad" }
  ];
  const launcherInfo = new Map();
  launcher.querySelectorAll(".start-menu-item[data-open-app]").forEach((item) => {
    const id = item.dataset.openApp;
    const icon = item.querySelector("[data-app-icon]");
    const label = item.querySelector("span:last-child");
    if (id && icon) launcherInfo.set(id, {
      icon,
      name: label?.textContent.trim() || item.textContent.trim()
    });
  });

  launcher.querySelectorAll(".start-menu-item[data-open-app]").forEach((item) => item.setAttribute("aria-description", "Activate to open. Drag to desktop to create a shortcut. Right-click for actions."));
  const contactAction = startMenu.querySelector("#start-contact");
  const contactIcon = contactAction?.querySelector("[data-app-icon]");
  if (contactIcon) launcherInfo.set("contact", { icon: contactIcon, name: "Contact Ranjan" });
  const availableIds = new Set(launcherInfo.keys());
  const bounds = () => ({
    width: desktopApps.clientWidth || workspace.clientWidth || window.innerWidth,
    height: desktopApps.clientHeight || workspace.clientHeight || window.innerHeight
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const isRatio = (value) => Number.isFinite(value) && value >= 0 && value <= 1;

  function readShortcuts() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === null) return defaultShortcuts.map((item) => ({ ...item, x: null, y: null }));
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return defaultShortcuts.map((item) => ({ ...item, x: null, y: null }));
      const seen = new Set();
      return parsed.reduce((result, item) => {
        if (!item || !availableIds.has(item.id) || seen.has(item.id)) return result;
        seen.add(item.id);
        const defaultName = defaultShortcuts.find((entry) => entry.id === item.id)?.name || launcherInfo.get(item.id).name;
        const name = typeof item.name === "string" ? item.name.trim().slice(0, 36) : "";
        result.push({
          id: item.id,
          name: name || defaultName,
          x: isRatio(item.x) ? item.x : null,
          y: isRatio(item.y) ? item.y : null
        });
        return result;
      }, []);
    } catch {
      return defaultShortcuts.map((item) => ({ ...item, x: null, y: null }));
    }
  }

  let shortcuts = readShortcuts();
  let selected = new Set();
  let buttons = new Map();
  let gesture = null;
  let contextIds = [];
  let contextTargetId = null;
  let contextLauncherId = null;
  let suppressedClick = null;
  let suppressedClickUntil = 0;
  let suppressTimer = 0;
  let statusTimer = 0;
  let resizeFrame = 0;
  let reflowPending = false;
  let selectionBox = null;
  let dragGhost = null;

  workspace.tabIndex = -1;
  workspace.setAttribute("aria-keyshortcuts", "Control+A Meta+A Delete F2");
  desktopApps.setAttribute("aria-description", "Drag shortcuts to move them. Control or Command click to select several. Control or Command plus A selects all. Press Delete to remove selected shortcuts and F2 to rename one.");

  function positionLimits(button) {
    const area = bounds();
    return {
      maxX: Math.max(2, area.width - button.offsetWidth - 2),
      maxY: Math.max(2, area.height - button.offsetHeight - 2)
    };
  }

  function setPosition(item, button, x, y) {
    const limit = positionLimits(button);
    const left = clamp(x, 2, limit.maxX);
    const top = clamp(y, 2, limit.maxY);
    button.style.left = left + "px";
    button.style.top = top + "px";
    item.x = limit.maxX > 2 ? left / limit.maxX : 0;
    item.y = limit.maxY > 2 ? top / limit.maxY : 0;
    return { x: left, y: top };
  }

  function pixelPosition(item, button) {
    const limit = positionLimits(button);
    return {
      x: (item.x ?? 0) * limit.maxX,
      y: (item.y ?? 0) * limit.maxY
    };
  }

  function defaultPixelPosition(index, button) {
    const width = window.innerWidth;
    const left = width <= 390 ? 13 : width <= 760 ? 16 : width <= 1050 ? width * .06 : Math.max(30, (width - 1180) / 2);
    const top = width <= 760 ? 22 : width <= 1050 ? 30 : 40;
    const columnGap = width <= 760 ? 16 : width <= 1050 ? 17 : 20;
    const rowGap = width <= 760 ? 17 : width <= 1050 ? 18 : 25;
    const column = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: left + column * (button.offsetWidth + columnGap),
      y: top + row * (button.offsetHeight + rowGap)
    };
  }

  function gridMetrics(button) {
    const width = window.innerWidth;
    const columnGap = width <= 760 ? 16 : width <= 1050 ? 17 : 20;
    const rowGap = width <= 760 ? 17 : width <= 1050 ? 18 : 25;
    const origin = defaultPixelPosition(0, button);
    return {
      originX: origin.x,
      originY: origin.y,
      stepX: button.offsetWidth + columnGap,
      stepY: button.offsetHeight + rowGap
    };
  }

  function snapPosition(button, position) {
    const limit = positionLimits(button);
    const grid = gridMetrics(button);
    const snap = (value, origin, step, maximum) => {
      const aligned = origin + Math.round((value - origin) / step) * step;
      return clamp(Math.abs(aligned - value) <= 12 ? aligned : value, 2, maximum);
    };
    return {
      x: snap(position.x, grid.originX, grid.stepX, limit.maxX),
      y: snap(position.y, grid.originY, grid.stepY, limit.maxY)
    };
  }

  function positionsOverlap(first, second, gap = 8) {
    return first.x < second.x + second.width + gap
      && first.x + first.width + gap > second.x
      && first.y < second.y + second.height + gap
      && first.y + first.height + gap > second.y;
  }

  function positionIsFree(button, position, occupied, gap = 8) {
    const candidate = {
      x: position.x,
      y: position.y,
      width: button.offsetWidth,
      height: button.offsetHeight
    };
    return occupied.every((other) => !positionsOverlap(candidate, other, gap));
  }

  function findNearestFreePosition(button, preferred, occupied, gap = 8) {
    const limit = positionLimits(button);
    const grid = gridMetrics(button);
    const minColumn = Math.ceil((2 - grid.originX) / grid.stepX);
    const maxColumn = Math.floor((limit.maxX - grid.originX) / grid.stepX);
    const minRow = Math.ceil((2 - grid.originY) / grid.stepY);
    const maxRow = Math.floor((limit.maxY - grid.originY) / grid.stepY);
    const gridCandidates = [];

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        gridCandidates.push({
          x: grid.originX + column * grid.stepX,
          y: grid.originY + row * grid.stepY
        });
      }
    }

    gridCandidates.sort((first, second) => (
      Math.hypot(first.x - preferred.x, first.y - preferred.y)
      - Math.hypot(second.x - preferred.x, second.y - preferred.y)
      || first.y - second.y
      || first.x - second.x
    ));
    const gridSlot = gridCandidates.find((candidate) => positionIsFree(button, candidate, occupied, gap));
    if (gridSlot) return gridSlot;

    const base = {
      x: clamp(preferred.x, 2, limit.maxX),
      y: clamp(preferred.y, 2, limit.maxY)
    };
    const searchStep = 8;
    const maximumRing = Math.ceil(Math.hypot(limit.maxX - 2, limit.maxY - 2) / searchStep) + 1;
    const visited = new Set();
    let best = null;
    let bestDistance = Infinity;

    for (let ring = 0; ring <= maximumRing; ring += 1) {
      for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
        for (let offsetY = -ring; offsetY <= ring; offsetY += 1) {
          if (ring && Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== ring) continue;
          const candidate = {
            x: clamp(base.x + offsetX * searchStep, 2, limit.maxX),
            y: clamp(base.y + offsetY * searchStep, 2, limit.maxY)
          };
          const key = Math.round(candidate.x * 10) + ":" + Math.round(candidate.y * 10);
          if (visited.has(key)) continue;
          visited.add(key);
          if (!positionIsFree(button, candidate, occupied, gap)) continue;
          const distance = Math.hypot(candidate.x - preferred.x, candidate.y - preferred.y);
          if (distance < bestDistance) {
            best = candidate;
            bestDistance = distance;
          }
        }
      }
      if (best && (ring + 1) * searchStep > bestDistance) return best;
    }
    return best;
  }

  function settleLayout(preferredPositions = new Map(), priorityIds = [], baseline = null) {
    const priority = new Set(priorityIds);
    const ordered = [
      ...shortcuts.filter((item) => priority.has(item.id)),
      ...shortcuts.filter((item) => !priority.has(item.id))
    ];
    const occupied = [];

    ordered.forEach((item) => {
      const button = buttons.get(item.id);
      if (!button) return;
      const preferred = preferredPositions.get(item.id) || baseline?.get(item.id) || pixelPosition(item, button);
      const limit = positionLimits(button);
      const aligned = priority.has(item.id)
        ? { x: clamp(preferred.x, 2, limit.maxX), y: clamp(preferred.y, 2, limit.maxY) }
        : snapPosition(button, preferred);
      let position = positionIsFree(button, aligned, occupied) ? aligned : null;
      if (!position) position = findNearestFreePosition(button, preferred, occupied, 8);
      if (!position) position = findNearestFreePosition(button, preferred, occupied, 0);
      if (!position) position = aligned;
      const placed = setPosition(item, button, position.x, position.y);
      occupied.push({
        x: placed.x,
        y: placed.y,
        width: button.offsetWidth,
        height: button.offsetHeight
      });
    });
  }

  function saveShortcuts() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(shortcuts.map(({ id, name, x, y }) => ({ id, name, x, y }))));
    } catch {
      showStatus("Shortcut positions could not be saved in this browser.");
    }
  }

  function updateSelection() {
    buttons.forEach((button, id) => {
      const isSelected = selected.has(id);
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      const item = shortcuts.find((entry) => entry.id === id);
      button.setAttribute("aria-label", (item?.name || launcherInfo.get(id)?.name || id) + (isSelected ? ", selected desktop shortcut" : ", desktop shortcut"));
    });
  }

  function renderShortcuts({ settle = true, save = true } = {}) {
    const focusedId = document.activeElement?.dataset?.shortcutId;
    desktopApps.replaceChildren();
    buttons = new Map();
    shortcuts.forEach((item, index) => {
      const info = launcherInfo.get(item.id);
      if (!info) return;
      const button = document.createElement("button");
      button.className = "app-shortcut";
      button.type = "button";
      button.dataset.shortcutId = item.id;
      button.title = item.name;
      button.setAttribute("aria-keyshortcuts", "Delete F2");
      button.setAttribute("aria-description", "Drag to move. Right-click for shortcut actions.");
      button.setAttribute("draggable", "false");

      const iconBox = document.createElement("span");
      iconBox.className = "shortcut-icon";
      iconBox.setAttribute("aria-hidden", "true");
      [...info.icon.childNodes].forEach((node) => iconBox.append(node.cloneNode(true)));
      const name = document.createElement("span");
      name.className = "shortcut-name";
      name.textContent = item.name;
      button.append(iconBox, name);
      desktopApps.append(button);
      buttons.set(item.id, button);

      if (item.x === null || item.y === null) {
        const position = defaultPixelPosition(index, button);
        setPosition(item, button, position.x, position.y);
      } else {
        const position = pixelPosition(item, button);
        setPosition(item, button, position.x, position.y);
      }
    });
    if (settle) settleLayout();
    updateSelection();
    if (save) saveShortcuts();
    if (focusedId && buttons.has(focusedId)) buttons.get(focusedId).focus({ preventScroll: true });
  }

  function showStatus(message) {
    status.textContent = message;
    status.classList.add("is-visible");
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => status.classList.remove("is-visible"), 2200);
  }

  function setSelection(ids) {
    selected = new Set(ids.filter((id) => shortcuts.some((item) => item.id === id)));
    updateSelection();
  }

  function addToSelection(id) {
    selected.add(id);
    updateSelection();
  }

  function suppressNextClick(button) {
    suppressedClick = button;
    suppressedClickUntil = Date.now() + 300;
    window.clearTimeout(suppressTimer);
    suppressTimer = window.setTimeout(() => { suppressedClick = null; suppressedClickUntil = 0; }, 300);
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function hasDesktopKeyboardFocus(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest(".app-window, #start-menu, #desktop-context-menu")) return false;
    return Boolean(target.closest("#desktop-apps, #home")) || document.activeElement === workspace;
  }

  function closeContextMenu(restoreFocus = false) {
    if (contextMenu.hidden) return;
    contextMenu.hidden = true;
    if (restoreFocus && contextLauncherId) {
      launcher.querySelector('[data-open-app="' + contextLauncherId + '"]')?.focus({ preventScroll: true });
    } else if (restoreFocus && contextTargetId && buttons.has(contextTargetId)) {
      buttons.get(contextTargetId).focus({ preventScroll: true });
    }
  }
  function openContextMenu(x, y, ids, targetId = null, launcherId = null) {
    contextLauncherId = launcherId;
    contextIds = launcherId ? [launcherId] : ids.slice();
    contextTargetId = targetId;
    contextMenu.hidden = false;
    const open = contextMenu.querySelector('[data-desktop-action="open"]');
    const add = contextMenu.querySelector('[data-desktop-action="add"]');
    const rename = contextMenu.querySelector('[data-desktop-action="rename"]');
    const remove = contextMenu.querySelector('[data-desktop-action="delete"]');
    open.disabled = contextIds.length === 0;
    add.hidden = !contextLauncherId;
    add.disabled = !contextLauncherId;
    rename.disabled = contextIds.length !== 1 || !contextTargetId || Boolean(contextLauncherId);
    remove.disabled = contextIds.length === 0 || Boolean(contextLauncherId);
    const maxX = Math.max(4, window.innerWidth - contextMenu.offsetWidth - 4);
    const maxY = Math.max(4, window.innerHeight - contextMenu.offsetHeight - 4);
    contextMenu.style.left = clamp(x, 4, maxX) + "px";
    contextMenu.style.top = clamp(y, 4, maxY) + "px";
    contextMenu.querySelector('[role="menuitem"]:not(:disabled):not([hidden])')?.focus({ preventScroll: true });
  }
  function beginRename(id) {
    const item = shortcuts.find((entry) => entry.id === id);
    const button = buttons.get(id);
    const label = button?.querySelector(".shortcut-name");
    if (!item || !button || !label) return;
    closeContextMenu();
    const input = document.createElement("input");
    input.className = "shortcut-rename";
    input.type = "text";
    input.maxLength = 36;
    input.value = item.name;
    input.setAttribute("aria-label", "Rename desktop shortcut");
    label.replaceWith(input);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        input.dataset.cancelRename = "true";
        input.blur();
      }
    });
    input.addEventListener("blur", () => {
      const nextName = input.value.trim().slice(0, 36);
      const cancel = input.dataset.cancelRename === "true";
      item.name = !cancel && nextName ? nextName : item.name;
      const nextLabel = document.createElement("span");
      nextLabel.className = "shortcut-name";
      nextLabel.textContent = item.name;
      input.replaceWith(nextLabel);
      button.title = item.name;
      settleLayout();
      updateSelection();
      saveShortcuts();
      if (!cancel && nextName) showStatus("Shortcut renamed to " + item.name + ".");
    }, { once: true });
    input.focus({ preventScroll: true });
    input.select();
  }

  function deleteSelected() {
    const count = selected.size;
    if (!count) return;
    shortcuts = shortcuts.filter((item) => !selected.has(item.id));
    selected.clear();
    closeContextMenu();
    renderShortcuts();
    showStatus(count === 1 ? "Desktop shortcut removed." : count + " desktop shortcuts removed.");
    workspace.focus({ preventScroll: true });
  }

  function createShortcut(id, clientX, clientY) {
    if (!availableIds.has(id)) return;
    const existing = shortcuts.find((item) => item.id === id);
    if (existing) {
      setSelection([id]);
      buttons.get(id)?.focus({ preventScroll: true });
      showStatus(existing.name + " is already on the desktop.");
      return;
    }
    const info = launcherInfo.get(id);
    const item = { id, name: info.name, x: null, y: null };
    shortcuts.push(item);
    renderShortcuts({ settle: false, save: false });
    const button = buttons.get(id);
    if (button) {
      const area = desktopApps.getBoundingClientRect();
      const preferredPosition = clientX === null || clientY === null
        ? defaultPixelPosition(shortcuts.length - 1, button)
        : { x: clientX - area.left - button.offsetWidth / 2, y: clientY - area.top - button.offsetHeight / 2 };
      const limit = positionLimits(button);
      const preferred = snapPosition(button, {
        x: clamp(preferredPosition.x, 2, limit.maxX),
        y: clamp(preferredPosition.y, 2, limit.maxY)
      });
      settleLayout(new Map([[id, preferred]]), [id]);
      saveShortcuts();
      setSelection([id]);
      button.focus({ preventScroll: true });
    }
    showStatus(item.name + " shortcut added to the desktop.");
  }

  function eventIsDesktopEmpty(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest(".app-window, .dock, #start-menu, #desktop-context-menu, input, textarea, select, a")) return false;
    return target === workspace;
  }

  function startMarquee(event) {
    if (event.button !== 0 || !eventIsDesktopEmpty(event)) return;
    closeContextMenu();
    workspace.focus({ preventScroll: true });
    const additive = event.ctrlKey || event.metaKey;
    const base = additive ? new Set(selected) : new Set();
    if (!additive) setSelection([]);
    gesture = {
      kind: "marquee",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      base,
      moved: false
    };
    try { workspace.setPointerCapture(event.pointerId); } catch {}
  }

  function updateMarquee(event) {
    if (!gesture.moved) {
      gesture.moved = true;
      selectionBox = document.createElement("span");
      selectionBox.className = "desktop-selection-box";
      selectionBox.setAttribute("aria-hidden", "true");
      desktopApps.append(selectionBox);
    }
    const area = desktopApps.getBoundingClientRect();
    const left = Math.min(gesture.startX, event.clientX) - area.left;
    const top = Math.min(gesture.startY, event.clientY) - area.top;
    const width = Math.abs(event.clientX - gesture.startX);
    const height = Math.abs(event.clientY - gesture.startY);
    selectionBox.style.left = left + "px";
    selectionBox.style.top = top + "px";
    selectionBox.style.width = width + "px";
    selectionBox.style.height = height + "px";
    const box = {
      left: Math.min(gesture.startX, event.clientX),
      right: Math.max(gesture.startX, event.clientX),
      top: Math.min(gesture.startY, event.clientY),
      bottom: Math.max(gesture.startY, event.clientY)
    };
    const next = new Set(gesture.base);
    buttons.forEach((button, id) => {
      const rect = button.getBoundingClientRect();
      const intersects = box.left <= rect.right && box.right >= rect.left && box.top <= rect.bottom && box.bottom >= rect.top;
      if (intersects) next.add(id);
    });
    setSelection([...next]);
  }

  function canDropAt(x, y) {
    const rect = workspace.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return false;
    const hit = document.elementFromPoint(x, y);
    if (hit?.closest(".app-window, .dock, #start-menu, #desktop-context-menu")) return false;
    return true;
  }

  function clearLauncherDrag(source = gesture?.source) {
    source?.classList.remove("is-dragging");
    dragGhost?.remove();
    dragGhost = null;
  }
  function updateLauncherDrag(event) {
    if (!gesture.moved) {
      gesture.moved = true;
      gesture.source.classList.add("is-dragging");
      dragGhost = document.createElement("span");
      dragGhost.className = "shortcut-drag-ghost";
      dragGhost.setAttribute("aria-hidden", "true");
      const info = launcherInfo.get(gesture.id);
      const icon = document.createElement("span");
      icon.className = "shortcut-icon";
      icon.setAttribute("aria-hidden", "true");
      [...info.icon.childNodes].forEach((node) => icon.append(node.cloneNode(true)));
      const name = document.createElement("span");
      name.className = "shortcut-name";
      name.textContent = info.name;
      dragGhost.append(icon, name);
      desktop.append(dragGhost);
    }
    dragGhost.style.left = event.clientX + "px";
    dragGhost.style.top = event.clientY + "px";
  }

  function moveDesktopSelection(event) {
    const currentX = event.clientX - gesture.startX;
    const currentY = event.clientY - gesture.startY;
    const positions = [...gesture.positions.values()];
    const minX = Math.min(...positions.map((position) => position.x));
    const minY = Math.min(...positions.map((position) => position.y));
    const maxRight = Math.max(...positions.map((position) => position.x + position.width));
    const maxBottom = Math.max(...positions.map((position) => position.y + position.height));
    const area = bounds();
    const minDX = 2 - minX;
    const minDY = 2 - minY;
    const maxDX = Math.max(minDX, area.width - maxRight - 2);
    const maxDY = Math.max(minDY, area.height - maxBottom - 2);
    let dx = clamp(currentX, minDX, maxDX);
    let dy = clamp(currentY, minDY, maxDY);

    const anchorId = gesture.ids[0];
    const anchor = gesture.positions.get(anchorId);
    const anchorButton = buttons.get(anchorId);
    if (anchor && anchorButton) {
      const aligned = snapPosition(anchorButton, { x: anchor.x + dx, y: anchor.y + dy });
      dx = clamp(dx + aligned.x - (anchor.x + dx), minDX, maxDX);
      dy = clamp(dy + aligned.y - (anchor.y + dy), minDY, maxDY);
    }

    gesture.positions.forEach((position, id) => {
      const item = shortcuts.find((entry) => entry.id === id);
      const button = buttons.get(id);
      if (item && button) setPosition(item, button, position.x + dx, position.y + dy);
    });
  }

  function finishGesture(event, canceled = false) {
    if (!gesture || (event && gesture.pointerId !== event.pointerId)) return;
    if (gesture.kind === "desktop" && !canceled && gesture.moved && event) moveDesktopSelection(event);
    const finished = gesture;
    gesture = null;
    if (finished.kind === "desktop") {
      finished.ids.forEach((id) => buttons.get(id)?.classList.remove("is-moving"));
      if (canceled) {
        finished.positions.forEach((position, id) => {
          const item = shortcuts.find((entry) => entry.id === id);
          const button = buttons.get(id);
          if (item && button) setPosition(item, button, position.x, position.y);
        });
        settleLayout();
      } else if (finished.moved) {
        const desired = new Map();
        finished.ids.forEach((id) => {
          const button = buttons.get(id);
          if (button) desired.set(id, { x: button.offsetLeft, y: button.offsetTop });
        });
        settleLayout(desired, finished.ids, finished.layout);
        saveShortcuts();
        suppressNextClick(finished.button);
      } else {
        saveShortcuts();
      }
    } else if (finished.kind === "marquee") {
      selectionBox?.remove();
      selectionBox = null;
      if (canceled) setSelection([...finished.base]);
    } else if (finished.kind === "launcher") {
      const shouldDrop = !canceled && finished.moved && canDropAt(event.clientX, event.clientY);
      const x = event?.clientX;
      const y = event?.clientY;
      clearLauncherDrag(finished.source);
      if (finished.moved && !canceled) suppressNextClick(finished.source);
      if (shouldDrop) {
        createShortcut(finished.id, x, y);
        const startButton = document.querySelector("#start-toggle");
        startButton?.setAttribute("aria-expanded", "false");
        startButton?.setAttribute("aria-label", "Open Start menu");
        startMenu.hidden = true;
      }
    } else if (finished.kind === "toggle") {
      if (!canceled) suppressNextClick(finished.button);
    }
    if (reflowPending) scheduleReflow();
  }

  desktopApps.addEventListener("pointerdown", (event) => {
    const button = event.target instanceof Element ? event.target.closest(".app-shortcut") : null;
    if (!button || event.button !== 0 || !buttons.has(button.dataset.shortcutId) || event.target.closest(".shortcut-rename")) return;
    event.stopPropagation();
    const id = button.dataset.shortcutId;
    closeContextMenu();
    if (event.ctrlKey || event.metaKey) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelection([...next]);
      gesture = { kind: "toggle", pointerId: event.pointerId, button };
      try { button.setPointerCapture(event.pointerId); } catch {}
      return;
    }
    if (!selected.has(id)) setSelection([id]);
    const ids = selected.has(id) ? [...selected] : [id];
    const layout = new Map();
    shortcuts.forEach((item) => {
      const itemButton = buttons.get(item.id);
      if (itemButton) layout.set(item.id, { x: itemButton.offsetLeft, y: itemButton.offsetTop });
    });
    const positions = new Map();
    ids.forEach((selectedId) => {
      const item = shortcuts.find((entry) => entry.id === selectedId);
      const selectedButton = buttons.get(selectedId);
      if (!item || !selectedButton) return;
      const position = {
        x: selectedButton.offsetLeft,
        y: selectedButton.offsetTop,
        width: selectedButton.offsetWidth,
        height: selectedButton.offsetHeight
      };
      positions.set(selectedId, position);
    });
    gesture = {
      kind: "desktop",
      pointerId: event.pointerId,
      button,
      ids: [...positions.keys()],
      positions,
      layout,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    try { button.setPointerCapture(event.pointerId); } catch {}
  });

  workspace.addEventListener("pointerdown", startMarquee);
  launcher.addEventListener("pointerdown", (event) => {
    const source = event.target instanceof Element ? event.target.closest(".start-menu-item[data-open-app]") : null;
    if (!source || event.button !== 0) return;
    const id = source.dataset.openApp;
    if (!availableIds.has(id)) return;
    gesture = {
      kind: "launcher",
      pointerId: event.pointerId,
      id,
      source,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    try { source.setPointerCapture(event.pointerId); } catch {}
  });

  document.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const threshold = gesture.kind === "launcher" ? 7 : gesture.kind === "marquee" ? 4 : 5;
    if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < threshold) return;
    if (gesture.kind === "desktop") {
      gesture.moved = true;
      gesture.ids.forEach((id) => buttons.get(id)?.classList.add("is-moving"));
      moveDesktopSelection(event);
    } else if (gesture.kind === "marquee") {
      gesture.moved = true;
      updateMarquee(event);
    } else if (gesture.kind === "launcher") {
      updateLauncherDrag(event);
    }
    event.preventDefault();
  });

  document.addEventListener("pointerup", (event) => finishGesture(event));
  document.addEventListener("pointercancel", (event) => finishGesture(event, true));

  document.addEventListener("click", (event) => {
    const shortcut = event.target instanceof Element ? event.target.closest(".app-shortcut") : null;
    if (!shortcut || event.target.closest(".shortcut-rename")) return;
    const id = shortcut.dataset.shortcutId;
    if (id) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent("portfolio-open-app", { detail: { id, trigger: shortcut } }));
    }
  });

  document.addEventListener("click", (event) => {
    if (!suppressedClick || Date.now() >= suppressedClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressedClick = null;
    window.clearTimeout(suppressTimer);
    suppressedClickUntil = 0;
  }, true);

  document.addEventListener("click", (event) => {
    const action = event.target instanceof Element ? event.target.closest("[data-desktop-action]") : null;
    if (!action) return;
    const command = action.dataset.desktopAction;
    event.preventDefault();
    if (command === "add" && contextLauncherId) {
      const id = contextLauncherId;
      closeContextMenu();
      createShortcut(id, null, null);
      startMenu.hidden = true;
      const startButton = document.querySelector("#start-toggle");
      startButton?.setAttribute("aria-expanded", "false");
      startButton?.setAttribute("aria-label", "Open Start menu");
      return;
    }    if (command === "select-all") {
      setSelection(shortcuts.map((item) => item.id));
      closeContextMenu();
      return;
    }
    if (command === "open") {
      const ids = contextIds.slice();
      const launcherId = contextLauncherId;
      closeContextMenu();
      if (launcherId) {
        const trigger = launcher.querySelector('[data-open-app="' + launcherId + '"]');
        if (trigger) document.dispatchEvent(new CustomEvent("portfolio-open-app", { detail: { id: launcherId, trigger, forceFocus: true } }));
        return;
      }
      ids.forEach((id) => {
        const trigger = buttons.get(id);
        if (trigger) document.dispatchEvent(new CustomEvent("portfolio-open-app", { detail: { id, trigger, forceFocus: true } }));
      });
    } else if (command === "rename" && contextTargetId) {
      beginRename(contextTargetId);
    } else if (command === "delete") {
      setSelection(contextIds);
      deleteSelected();
    }
  });

  desktop.addEventListener("contextmenu", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const launcherItem = target.closest(".start-menu-item[data-open-app]");
    if (launcherItem && availableIds.has(launcherItem.dataset.openApp)) {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY, [], null, launcherItem.dataset.openApp);
      return;
    }
    if (target.closest(".app-window, .dock, #start-menu, #desktop-context-menu, input, textarea, select, a")) return;
    const shortcut = target.closest(".app-shortcut");
    if (shortcut) {
      const id = shortcut.dataset.shortcutId;
      if (!selected.has(id)) setSelection([id]);
      openContextMenu(event.clientX, event.clientY, [...selected], id);
      event.preventDefault();
    } else if (target.closest("#home")) {
      setSelection([]);
      openContextMenu(event.clientX, event.clientY, []);
      event.preventDefault();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!contextMenu.hidden && !contextMenu.contains(event.target)) closeContextMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (!contextMenu.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeContextMenu(true);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const items = [...contextMenu.querySelectorAll('[role="menuitem"]:not(:disabled):not([hidden])')];
        const index = items.indexOf(document.activeElement);
        const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index <= 0 ? items.length - 1 : index - 1);
        items[next]?.focus();
        event.preventDefault();
        return;
      }
    }
    if (event.key === "Escape" && event.target instanceof HTMLInputElement && event.target.classList.contains("shortcut-rename")) {
      event.preventDefault();
      event.target.dataset.cancelRename = "true";
      event.target.blur();
      event.stopImmediatePropagation();
      return;
    }
    if (isEditable(event.target) || !hasDesktopKeyboardFocus(event.target)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      setSelection(shortcuts.map((item) => item.id));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      if (selected.size) {
        event.preventDefault();
        deleteSelected();
      }
    } else if (event.key === "F2" && selected.size === 1) {
      event.preventDefault();
      beginRename([...selected][0]);
    }
  }, true);

  document.addEventListener("contextmenu", (event) => {
    if (event.target instanceof Element && event.target.closest("#home, #desktop-apps")) event.preventDefault();
  });

  function reflowShortcuts() {
    resizeFrame = 0;
    if (gesture) {
      reflowPending = true;
      return;
    }
    reflowPending = false;
    settleLayout();
    saveShortcuts();
  }

  function scheduleReflow() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(reflowShortcuts);
  }

  window.addEventListener("resize", scheduleReflow);
  window.visualViewport?.addEventListener("resize", scheduleReflow);
  if ("ResizeObserver" in window) new ResizeObserver(scheduleReflow).observe(desktopApps);

  renderShortcuts();
})();