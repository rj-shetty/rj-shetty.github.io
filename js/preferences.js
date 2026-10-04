(function () {
  "use strict";

  const DB_NAME = "portfolio-os-personalization";
  const STORE_NAME = "media";
  const WALLPAPER_IMAGE_LIMIT = 20 * 1024 * 1024;
  const WALLPAPER_VIDEO_LIMIT = 100 * 1024 * 1024;
  const SOUND_LIMIT = 25 * 1024 * 1024;
  const desktop = document.querySelector("#desktop");
  const wallpaperLayer = document.querySelector("#wallpaper-layer");
  const soundPlayer = new Audio();
  let databasePromise = null;
  let preferencesUI = null;
  let savedWallpaper = null;
  let pendingWallpaper = null;
  let wallpaperUrl = "";
  let wallpaperVideo = null;
  let wallpaperMuted = true;
  let savedSound = null;
  let pendingSound = null;
  let soundUrl = "";
  let soundEnabled = false;
  let soundVolume = readNumberPreference("portfolio-os-sound-volume", 35) / 100;
  let wallpaperMessage = "";
  let soundMessage = "";
  let wallpaperSelectionToken = 0;
  let soundSelectionToken = 0;

  const wallpaperMimes = new Map([
    ["image/png", "image"],
    ["image/jpeg", "image"],
    ["image/jpg", "image"],
    ["image/webp", "image"],
    ["image/gif", "image"],
    ["video/mp4", "video"],
    ["video/webm", "video"],
    ["video/ogg", "video"]
  ]);
  const wallpaperExtensions = new Map([
    ["png", "image"], ["jpg", "image"], ["jpeg", "image"], ["webp", "image"], ["gif", "image"],
    ["mp4", "video"], ["webm", "video"], ["ogv", "video"]
  ]);
  const soundMimes = new Set([
    "audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/webm", "audio/flac", "audio/x-flac", "audio/opus", "audio/x-m4a"
  ]);
  const soundExtensions = new Set(["mp3", "m4a", "aac", "wav", "ogg", "opus", "webm", "flac"]);
  const fallbackMimes = new Map([
    ["png", "image/png"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["webp", "image/webp"], ["gif", "image/gif"],
    ["mp4", "video/mp4"], ["webm", "video/webm"], ["ogv", "video/ogg"],
    ["mp3", "audio/mpeg"], ["m4a", "audio/mp4"], ["aac", "audio/aac"], ["wav", "audio/wav"],
    ["ogg", "audio/ogg"], ["opus", "audio/opus"], ["flac", "audio/flac"]
  ]);

  soundPlayer.loop = true;
  soundPlayer.preload = "none";
  soundPlayer.volume = soundVolume;
  soundEnabled = readPreference("portfolio-os-sound-enabled", "false") === "true";

  function readPreference(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }

  function writePreference(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Media features remain usable for this session. */ }
  }

  function readNumberPreference(key, fallback) {
    const value = Number(readPreference(key, String(fallback)));
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
  }

  function openDatabase() {
    if (!("indexedDB" in window)) return Promise.reject(new Error("Local media storage is unavailable in this browser."));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error("Could not open local media storage."));
      request.onblocked = () => reject(new Error("Close another portfolio tab to finish updating local media storage."));
    });
    return databasePromise;
  }

  function readMedia(key) {
    return openDatabase().then((db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not read saved media."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not read saved media."));
    }));
  }

  function writeMedia(record) {
    return openDatabase().then((db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not save media."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not save media."));
    }));
  }

  function deleteMedia(key) {
    return openDatabase().then((db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not remove saved media."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not remove saved media."));
    }));
  }

  function extensionOf(file) {
    const match = /\.([a-z0-9]+)$/i.exec(file.name || "");
    return match ? match[1].toLowerCase() : "";
  }

  function wallpaperKind(file) {
    const mime = String(file.type || "").toLowerCase();
    if (wallpaperMimes.has(mime)) return wallpaperMimes.get(mime);
    if (!mime || mime === "application/octet-stream") return wallpaperExtensions.get(extensionOf(file)) || "";
    return "";
  }

  function isSoundFile(file) {
    const mime = String(file.type || "").toLowerCase();
    if (soundMimes.has(mime)) return true;
    return (!mime || mime === "application/octet-stream") && soundExtensions.has(extensionOf(file));
  }

  function fileBlob(file) {
    const mime = String(file.type || "").toLowerCase();
    const type = !mime || mime === "application/octet-stream" ? fallbackMimes.get(extensionOf(file)) || mime : mime;
    return file.slice(0, file.size, type || "application/octet-stream");
  }
  function inspectLocalFile(file, kind) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileBlob(file));
      let settled = false;
      const media = kind === "audio" ? new Audio() : document.createElement(kind === "video" ? "video" : "img");
      const timeout = window.setTimeout(() => finish(new Error("This file took too long to preview.")), 15000);

      function finish(error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        media.onload = null;
        media.onloadedmetadata = null;
        media.onerror = null;
        media.removeAttribute("src");
        if (typeof media.load === "function") media.load();
        URL.revokeObjectURL(url);
        if (error) reject(error);
        else resolve();
      }

      if (kind === "image") {
        media.onload = () => {
          const pixels = media.naturalWidth * media.naturalHeight;
          if (!media.naturalWidth || !media.naturalHeight || media.naturalWidth > 6000 || media.naturalHeight > 6000 || pixels > 30000000) {
            finish(new Error("Use an image up to 6,000 px per side and 30 megapixels."));
            return;
          }
          finish();
        };
        media.onerror = () => finish(new Error("This image could not be opened."));
        media.src = url;
        return;
      }

      media.preload = "metadata";
      media.onloadedmetadata = () => {
        if (kind === "audio") {
          finish();
          return;
        }
        const pixels = media.videoWidth * media.videoHeight;
        if (!media.videoWidth || !media.videoHeight || pixels > 33000000) {
          finish(new Error("This video could not be previewed or is larger than 33 megapixels."));
          return;
        }
        finish();
      };
      media.onerror = () => finish(new Error("This media format could not be opened in this browser."));
      media.src = url;
      media.load();
    });
  }

  function createWallpaperElement(record, url, preview) {
    let element;
    if (record.kind === "video") {
      element = document.createElement("video");
      element.autoplay = !preview;
      element.loop = !preview;
      element.playsInline = true;
      element.muted = preview || wallpaperMuted;
      element.preload = preview ? "none" : "auto";
      element.disablePictureInPicture = true;
    } else {
      element = document.createElement("img");
      element.alt = "";
      element.decoding = "async";
    }
    element.className = preview ? "wallpaper-preview-media" : "wallpaper-desktop-media";
    element.setAttribute("aria-hidden", "true");
    element.src = url;
    if (record.kind === "video" && !preview) element.play().catch(() => {});
    return element;
  }

  function refreshWallpaperUI() {
    if (!preferencesUI) return;
    const ui = preferencesUI;
    ui.wallpaperSave.disabled = !pendingWallpaper;
    ui.wallpaperName.textContent = pendingWallpaper
      ? pendingWallpaper.name + " · preview only until saved"
      : savedWallpaper
        ? savedWallpaper.name
        : "Up to 20 MB for images and GIFs, 100 MB for video.";
    ui.wallpaperState.textContent = pendingWallpaper ? "Preview" : savedWallpaper ? "Saved on this device" : "Default";
    ui.wallpaperPreview.setAttribute("aria-label", (pendingWallpaper || savedWallpaper) ? "Preview of " + (pendingWallpaper || savedWallpaper).name : "Preview of the default desktop wallpaper");
    ui.wallpaperMessage.textContent = wallpaperMessage;
    ui.wallpaperMessage.dataset.state = /^(Could not|That |Use |This |Your browser blocked)/.test(wallpaperMessage) ? "error" : "info";
    ui.wallpaperAudioControls.hidden = !wallpaperVideo;
    ui.wallpaperAudioLabel.textContent = wallpaperMuted ? "Video audio is muted" : "Video audio is on";
    ui.wallpaperAudioButton.textContent = wallpaperMuted ? "Unmute video audio" : "Mute video audio";
    ui.wallpaperAudioButton.setAttribute("aria-pressed", String(!wallpaperMuted));
  }

  function syncWallpaperPreview() {
    if (!preferencesUI) return;
    const record = pendingWallpaper || savedWallpaper;
    const empty = preferencesUI.wallpaperPreviewEmpty;
    preferencesUI.wallpaperPreview.querySelectorAll(".wallpaper-preview-media").forEach((node) => node.remove());
    empty.classList.remove("is-live");
    if (!record || !wallpaperUrl) {
      empty.hidden = false;
      empty.textContent = "Default desktop";
      return;
    }
    const isGif = record.type === "image/gif" || /\.gif$/i.test(record.name || "");
    if (record.kind === "video" || isGif) {
      empty.hidden = false;
      empty.classList.add("is-live");
      empty.textContent = record.kind === "video" ? "Video preview is live on the desktop" : "GIF preview is live on the desktop";
      return;
    }
    empty.hidden = true;
    preferencesUI.wallpaperPreview.prepend(createWallpaperElement(record, wallpaperUrl, true));
  }

  function showWallpaper(record, url) {
    wallpaperMuted = true;
    const previousUrl = wallpaperUrl;
    wallpaperUrl = url;
    if (wallpaperVideo) wallpaperVideo.pause();
    wallpaperVideo = null;
    desktop.classList.add("has-wallpaper");
    wallpaperLayer.replaceChildren();
    const desktopMedia = createWallpaperElement(record, url, false);
    wallpaperLayer.append(desktopMedia);
    if (desktopMedia instanceof HTMLVideoElement) wallpaperVideo = desktopMedia;

    syncWallpaperPreview();
    if (wallpaperVideo) wallpaperVideo.muted = true;
    if (previousUrl && previousUrl !== url) URL.revokeObjectURL(previousUrl);
    refreshWallpaperUI();
  }

  function showDefaultWallpaper() {
    const previousUrl = wallpaperUrl;
    wallpaperUrl = "";
    if (wallpaperVideo) wallpaperVideo.pause();
    wallpaperVideo = null;
    desktop.classList.remove("has-wallpaper");
    wallpaperLayer.replaceChildren();
    syncWallpaperPreview();
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    refreshWallpaperUI();
  }

  function setSoundSource(record) {
    const previousUrl = soundUrl;
    soundPlayer.pause();
    soundUrl = URL.createObjectURL(record.blob);
    soundPlayer.src = soundUrl;
    soundPlayer.volume = soundVolume;
    soundPlayer.load();
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }

  function startSound() {
    if (!soundEnabled || !savedSound) return;
    soundPlayer.volume = soundVolume;
    const attempt = soundPlayer.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        soundMessage = "Your browser paused autoplay. Turn sound off and on to start it.";
        refreshSoundUI();
      });
    }
  }

  function refreshSoundUI() {
    if (!preferencesUI) return;
    const ui = preferencesUI;
    ui.soundSave.disabled = !pendingSound;
    ui.soundRemove.hidden = !savedSound && !pendingSound;
    ui.soundName.textContent = pendingSound
      ? pendingSound.name + " · save to keep it"
      : savedSound
        ? savedSound.name
        : "No custom sound selected · up to 25 MB.";
    ui.soundEnabled.checked = soundEnabled;
    ui.soundEnabled.disabled = !savedSound;
    ui.soundVolume.disabled = !savedSound;
    ui.soundVolume.value = String(Math.round(soundVolume * 100));
    ui.soundVolumeValue.value = Math.round(soundVolume * 100) + "%";
    ui.soundMessage.textContent = soundMessage;
    ui.soundMessage.dataset.state = /^(Could not|That |Choose |This |Your browser)/.test(soundMessage) ? "error" : "info";
  }

  async function restoreSavedMedia() {
    const wallpaperToken = wallpaperSelectionToken;
    const soundToken = soundSelectionToken;
    try {
      const wallpaper = await readMedia("wallpaper");
      if (wallpaperToken === wallpaperSelectionToken && wallpaper && wallpaper.blob instanceof Blob && (wallpaper.kind === "image" || wallpaper.kind === "video")) {
        savedWallpaper = wallpaper;
        showWallpaper(wallpaper, URL.createObjectURL(wallpaper.blob));
      }
      const sound = await readMedia("sound");
      if (soundToken === soundSelectionToken && sound && sound.blob instanceof Blob) {
        savedSound = sound;
        setSoundSource(sound);
        if (soundEnabled) startSound();
      } else if (soundToken === soundSelectionToken && soundEnabled) {
        soundEnabled = false;
        writePreference("portfolio-os-sound-enabled", "false");
      }
    } catch {
      wallpaperMessage = "Could not read saved media from this browser.";
      soundMessage = "Could not read saved media from this browser.";
    }
    refreshWallpaperUI();
    refreshSoundUI();
  }

  const restorePromise = restoreSavedMedia();

  function initPreferences(detail) {
    if (!detail || !detail.record || !detail.setTheme) return;
    const root = detail.record.node.querySelector(".view-preferences");
    if (!root || root.dataset.preferencesReady) return;
    root.dataset.preferencesReady = "true";

    const ui = {
      wallpaperFile: root.querySelector("[data-wallpaper-file]"),
      wallpaperChoose: root.querySelector("[data-wallpaper-choose]"),
      wallpaperSave: root.querySelector("[data-wallpaper-save]"),
      wallpaperReset: root.querySelector("[data-wallpaper-reset]"),
      wallpaperName: root.querySelector("[data-wallpaper-name]"),
      wallpaperState: root.querySelector("[data-wallpaper-state]"),
      wallpaperMessage: root.querySelector("[data-wallpaper-message]"),
      wallpaperPreview: root.querySelector("[data-wallpaper-preview]"),
      wallpaperPreviewEmpty: root.querySelector("[data-wallpaper-preview-empty]"),
      wallpaperAudioControls: root.querySelector("[data-wallpaper-audio-controls]"),
      wallpaperAudioLabel: root.querySelector("[data-wallpaper-audio-label]"),
      wallpaperAudioButton: root.querySelector("[data-wallpaper-audio]"),
      soundFile: root.querySelector("[data-sound-file]"),
      soundChoose: root.querySelector("[data-sound-choose]"),
      soundSave: root.querySelector("[data-sound-save]"),
      soundRemove: root.querySelector("[data-sound-remove]"),
      soundName: root.querySelector("[data-sound-name]"),
      soundEnabled: root.querySelector("[data-sound-enabled]"),
      soundVolume: root.querySelector("[data-sound-volume]"),
      soundVolumeValue: root.querySelector("[data-sound-volume-value]"),
      soundMessage: root.querySelector("[data-sound-message]"),
      theme: root.querySelector("[data-preferences-theme]")
    };
    preferencesUI = ui;
    syncWallpaperPreview();

    ui.wallpaperChoose.addEventListener("click", () => ui.wallpaperFile.click());
    ui.wallpaperFile.addEventListener("change", async () => {
      const file = ui.wallpaperFile.files && ui.wallpaperFile.files[0];
      ui.wallpaperFile.value = "";
      if (!file) return;
      await restorePromise;
      const selectionToken = ++wallpaperSelectionToken;
      const kind = wallpaperKind(file);
      if (!kind) {
        wallpaperMessage = "Choose PNG, JPEG, WebP, GIF, MP4, WebM, or Ogg video.";
        refreshWallpaperUI();
        return;
      }
      const limit = kind === "video" ? WALLPAPER_VIDEO_LIMIT : WALLPAPER_IMAGE_LIMIT;
      if (file.size > limit) {
        wallpaperMessage = "That file is too large. Images and GIFs can be up to 20 MB; video can be up to 100 MB.";
        refreshWallpaperUI();
        return;
      }
      wallpaperMessage = "Checking your file…";
      refreshWallpaperUI();
      try {
        await inspectLocalFile(file, kind);
        if (selectionToken !== wallpaperSelectionToken) return;
        const url = URL.createObjectURL(fileBlob(file));
        pendingWallpaper = { key: "wallpaper", blob: fileBlob(file), name: file.name, type: file.type, kind: kind, updatedAt: Date.now() };
        showWallpaper(pendingWallpaper, url);
        wallpaperMessage = "Live preview applied. Save it to keep it after refresh.";
        refreshWallpaperUI();
      } catch (error) {
        if (selectionToken !== wallpaperSelectionToken) return;
        wallpaperMessage = error.message || "This file could not be previewed.";
        refreshWallpaperUI();
      }
    });

    ui.wallpaperSave.addEventListener("click", async () => {
      await restorePromise;
      if (!pendingWallpaper) return;
      ui.wallpaperSave.disabled = true;
      ui.wallpaperChoose.disabled = true;
      ui.wallpaperReset.disabled = true;
      const selectedWallpaper = pendingWallpaper;
      wallpaperMessage = "Saving on this device…";
      refreshWallpaperUI();
      try {
        await writeMedia(selectedWallpaper);
        savedWallpaper = selectedWallpaper;
        if (pendingWallpaper === selectedWallpaper) pendingWallpaper = null;
        wallpaperMessage = pendingWallpaper ? "Wallpaper saved. Save the newer preview to keep it too." : "Wallpaper saved on this device.";
      } catch {
        wallpaperMessage = "Could not save this wallpaper. Check available browser storage.";
      }
      ui.wallpaperChoose.disabled = false;
      ui.wallpaperReset.disabled = false;
      refreshWallpaperUI();
    });

    ui.wallpaperReset.addEventListener("click", async () => {
      ui.wallpaperChoose.disabled = true;
      ui.wallpaperReset.disabled = true;
      await restorePromise;
      wallpaperSelectionToken += 1;
      let removed = true;
      try { await deleteMedia("wallpaper"); } catch { removed = false; }
      savedWallpaper = null;
      pendingWallpaper = null;
      showDefaultWallpaper();
      wallpaperMessage = removed ? "Default wallpaper restored." : "Could not clear saved wallpaper. The default is previewed for this session.";
      ui.wallpaperChoose.disabled = false;
      ui.wallpaperReset.disabled = false;
      refreshWallpaperUI();
    });

    ui.wallpaperAudioButton.addEventListener("click", () => {
      if (!wallpaperVideo) return;
      wallpaperMuted = !wallpaperMuted;
      wallpaperVideo.muted = wallpaperMuted;
      if (!wallpaperMuted) {
        const attempt = wallpaperVideo.play();
        if (attempt && typeof attempt.catch === "function") {
          attempt.catch(() => {
            wallpaperMuted = true;
            wallpaperVideo.muted = true;
            wallpaperMessage = "Your browser blocked video audio. Try again after interacting with the page.";
            refreshWallpaperUI();
          });
        }
      }
      refreshWallpaperUI();
    });

    ui.soundChoose.addEventListener("click", () => ui.soundFile.click());
    ui.soundFile.addEventListener("change", async () => {
      const file = ui.soundFile.files && ui.soundFile.files[0];
      ui.soundFile.value = "";
      if (!file) return;
      await restorePromise;
      const selectionToken = ++soundSelectionToken;
      if (!isSoundFile(file)) {
        soundMessage = "Choose an MP3, M4A, AAC, WAV, OGG, WebM, or FLAC audio file.";
        refreshSoundUI();
        return;
      }
      if (file.size > SOUND_LIMIT) {
        soundMessage = "That audio file is too large. Choose a file up to 25 MB.";
        refreshSoundUI();
        return;
      }
      soundMessage = "Checking your audio…";
      refreshSoundUI();
      try {
        await inspectLocalFile(file, "audio");
        if (selectionToken !== soundSelectionToken) return;
        pendingSound = { key: "sound", blob: fileBlob(file), name: file.name, type: file.type, updatedAt: Date.now() };
        soundMessage = "Ready to save on this device.";
      } catch (error) {
        if (selectionToken !== soundSelectionToken) return;
        soundMessage = error.message || "This audio file could not be opened.";
      }
      refreshSoundUI();
    });

    ui.soundSave.addEventListener("click", async () => {
      await restorePromise;
      if (!pendingSound) return;
      ui.soundSave.disabled = true;
      ui.soundChoose.disabled = true;
      ui.soundRemove.disabled = true;
      const selectedSound = pendingSound;
      soundMessage = "Saving on this device…";
      refreshSoundUI();
      try {
        await writeMedia(selectedSound);
        savedSound = selectedSound;
        if (pendingSound === selectedSound) pendingSound = null;
        setSoundSource(savedSound);
        soundMessage = "Custom sound saved on this device.";
        if (soundEnabled) startSound();
      } catch {
        soundMessage = "Could not save this sound. Check available browser storage.";
      }
      ui.soundChoose.disabled = false;
      ui.soundRemove.disabled = false;
      refreshSoundUI();
    });

    ui.soundRemove.addEventListener("click", async () => {
      ui.soundChoose.disabled = true;
      ui.soundRemove.disabled = true;
      await restorePromise;
      soundSelectionToken += 1;
      try {
        await deleteMedia("sound");
        soundPlayer.pause();
        soundPlayer.removeAttribute("src");
        soundPlayer.load();
        if (soundUrl) URL.revokeObjectURL(soundUrl);
        soundUrl = "";
        soundEnabled = false;
        writePreference("portfolio-os-sound-enabled", "false");
        soundMessage = savedSound ? "Custom sound removed." : "Sound selection cleared.";
        savedSound = null;
        pendingSound = null;
      } catch {
        soundMessage = "Could not remove the saved sound.";
      }
      ui.soundChoose.disabled = false;
      ui.soundRemove.disabled = false;
      refreshSoundUI();
    });

    ui.soundEnabled.addEventListener("change", () => {
      soundEnabled = ui.soundEnabled.checked && Boolean(savedSound);
      writePreference("portfolio-os-sound-enabled", String(soundEnabled));
      if (soundEnabled) {
        soundMessage = "";
        startSound();
      } else {
        soundPlayer.pause();
        soundPlayer.currentTime = 0;
        soundMessage = "Desktop sound is off.";
      }
      refreshSoundUI();
    });

    ui.soundVolume.addEventListener("input", () => {
      soundVolume = Number(ui.soundVolume.value) / 100;
      soundPlayer.volume = soundVolume;
      writePreference("portfolio-os-sound-volume", ui.soundVolume.value);
      refreshSoundUI();
    });

    ui.theme.value = desktop.classList.contains("theme-dark") ? "dark" : "light";
    ui.theme.addEventListener("change", () => detail.setTheme(ui.theme.value === "dark"));
    document.addEventListener("portfolio-theme-change", (event) => {
      if (ui.theme.isConnected) ui.theme.value = event.detail.isDark ? "dark" : "light";
    });

    refreshWallpaperUI();
    refreshSoundUI();
    restorePromise.then(() => {
      refreshWallpaperUI();
      refreshSoundUI();
    });
  }

  document.addEventListener("portfolio-preferences-init", (event) => initPreferences(event.detail));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (wallpaperVideo) wallpaperVideo.pause();
      if (soundEnabled && !soundPlayer.paused) soundPlayer.pause();
      return;
    }
    if (wallpaperVideo) wallpaperVideo.play().catch(() => {});
    if (soundEnabled && savedSound) startSound();
  });

  restorePromise.catch(() => {
    wallpaperMessage = "Could not restore saved media from this browser.";
    soundMessage = "Could not restore saved media from this browser.";
  });
})();