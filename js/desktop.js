// =============================================================================
// DESKTOP MANAGER — UI Controller & App Population
// =============================================================================
// Populates dynamic data into windows, handles desktop icons, start menu,
// real-time clock, theme switcher, copy-to-clipboard, and notifications.
// =============================================================================

class DesktopManager {
  constructor() {
    this.currentTheme = "cream";
    this.currentWallpaper = "grid";
    this.startMenuOpen = false;
    this.activeProjectFilter = "all";
  }

  init() {
    this.loadSavedTheme();
    this.populateAboutWindow();
    this.populateProjectsWindow();
    this.populateSkillsWindow();
    this.populateContactWindow();
    this.setupDesktopIcons();
    this.setupTaskbarClock();
    this.setupStartMenu();
    this.setupSystemTrayControls();
    this.setupKonamiCode();

    // Register all windows into WindowManager
    document.querySelectorAll(".desktop-window").forEach((winEl) => {
      windowManager.register(winEl.id, winEl);
    });

    // Default open window on first visit
    setTimeout(() => {
      windowManager.open("window-about");
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Populating Windows from PORTFOLIO_DATA
  // ---------------------------------------------------------------------------

  populateAboutWindow() {
    const p = PORTFOLIO_DATA.profile;

    const nameEl = document.getElementById("about-name");
    const titleEl = document.getElementById("about-title");
    const bioContainer = document.getElementById("about-bio-text");
    const eduDeg = document.getElementById("about-edu-degree");
    const eduInst = document.getElementById("about-edu-inst");
    const eduNotes = document.getElementById("about-edu-notes");
    const philContainer = document.getElementById("about-philosophy-list");
    const quirksContainer = document.getElementById("about-quirks-list");

    if (nameEl) nameEl.textContent = p.name;
    if (titleEl) titleEl.textContent = p.title;

    if (bioContainer) {
      bioContainer.innerHTML = p.bio.map(para => `<p class="bio-paragraph">${para}</p>`).join("");
    }

    if (eduDeg) eduDeg.textContent = p.education.degree;
    if (eduInst) eduInst.textContent = p.education.institution;
    if (eduNotes) eduNotes.textContent = p.education.notes;

    if (philContainer) {
      philContainer.innerHTML = p.philosophy.map(item => `
        <div class="phil-card">
          <span class="phil-emoji">${item.emoji}</span>
          <div class="phil-info">
            <h4 class="phil-title">${item.title}</h4>
            <p class="phil-desc">${item.desc}</p>
          </div>
        </div>
      `).join("");
    }

    if (quirksContainer) {
      quirksContainer.innerHTML = p.quirks.map(q => `
        <div class="quirk-item">
          <span class="quirk-label">${q.label}:</span>
          <span class="quirk-value">${q.value}</span>
        </div>
      `).join("");
    }
  }

  populateProjectsWindow() {
    const container = document.getElementById("projects-grid");
    const filterButtons = document.querySelectorAll(".project-filter-btn");

    if (filterButtons) {
      filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          soundEngine.playClick();
          filterButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.activeProjectFilter = btn.dataset.filter;
          this.renderProjects(this.activeProjectFilter);
        });
      });
    }

    this.renderProjects("all");
  }

  renderProjects(filter = "all") {
    const container = document.getElementById("projects-grid");
    if (!container) return;

    let list = PORTFOLIO_DATA.projects;
    if (filter === "featured") {
      list = list.filter(p => p.featured);
    } else if (filter !== "all") {
      list = list.filter(p => p.category.toLowerCase().includes(filter.toLowerCase()));
    }

    container.innerHTML = list.map(project => `
      <div class="project-card" style="border-top-color: ${project.accent}">
        <div class="project-card-header">
          <span class="project-badge">${project.badge}</span>
          <span class="project-category">${project.category}</span>
        </div>
        <h3 class="project-card-title">${project.title}</h3>
        <p class="project-card-tagline">${project.tagline}</p>
        <p class="project-card-desc">${project.description}</p>
        
        <div class="project-card-tech">
          ${project.tech.map(t => `<span class="tech-tag">${t}</span>`).join("")}
        </div>

        <div class="project-card-actions">
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn-retro btn-sm">
            <span>🐙 GitHub</span>
          </a>
          <button class="btn-retro btn-retro-accent btn-sm inspect-proj-btn" data-id="${project.id}">
            <span>Inspect Details 🔍</span>
          </button>
        </div>
      </div>
    `).join("");

    // Detail inspector modal trigger
    container.querySelectorAll(".inspect-proj-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        soundEngine.playClick();
        this.openProjectModal(btn.dataset.id);
      });
    });
  }

  openProjectModal(projectId) {
    const project = PORTFOLIO_DATA.projects.find(p => p.id === projectId);
    if (!project) return;

    const modal = document.getElementById("project-modal");
    const content = document.getElementById("project-modal-content");
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="proj-detail-header" style="border-bottom: 2px solid ${project.accent};">
        <span class="project-badge">${project.badge}</span>
        <h2 class="proj-detail-title">${project.title}</h2>
        <p class="proj-detail-tagline">${project.tagline}</p>
      </div>

      <div class="proj-detail-body">
        <p class="proj-detail-desc">${project.description}</p>
        
        <h4 class="proj-detail-section-title">Key Architectural Highlights</h4>
        <ul class="proj-highlights-list">
          ${project.highlights.map(h => `<li>${h}</li>`).join("")}
        </ul>

        <h4 class="proj-detail-section-title">Technologies Used</h4>
        <div class="project-card-tech">
          ${project.tech.map(t => `<span class="tech-tag">${t}</span>`).join("")}
        </div>

        <div class="proj-detail-buttons">
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="btn-retro">
            <span>View Source on GitHub 🐙</span>
          </a>
          <button id="close-proj-modal" class="btn-retro">
            <span>Back to Projects ✕</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    const closeBtn = document.getElementById("close-proj-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        soundEngine.playClick();
        modal.classList.add("hidden");
      });
    }

    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    };
  }

  populateSkillsWindow() {
    const s = PORTFOLIO_DATA.skills;

    this.renderSkillList("skills-frontend-list", s.frontend);
    this.renderSkillList("skills-backend-list", s.backend);
    this.renderSkillList("skills-tools-list", s.tools);
  }

  renderSkillList(elementId, skills) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = skills.map(skill => `
      <div class="skill-row" title="${skill.desc}">
        <div class="skill-info">
          <span class="skill-icon">${skill.icon}</span>
          <span class="skill-name">${skill.name}</span>
          <span class="skill-pct">${skill.level}%</span>
        </div>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width: ${skill.level}%"></div>
        </div>
        <span class="skill-desc-sub">${skill.desc}</span>
      </div>
    `).join("");
  }

  populateContactWindow() {
    const p = PORTFOLIO_DATA.profile;
    const emailLink = document.getElementById("contact-email-link");
    const copyBtn = document.getElementById("copy-email-btn");
    const socialGrid = document.getElementById("contact-socials-grid");

    if (emailLink) {
      emailLink.textContent = p.email;
      emailLink.href = `mailto:${p.email}`;
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        soundEngine.playClick();
        navigator.clipboard.writeText(p.email).then(() => {
          this.showToast("Email address copied to clipboard! 📋");
        }).catch(() => {
          this.showToast(`Email: ${p.email}`);
        });
      });
    }

    if (socialGrid) {
      socialGrid.innerHTML = PORTFOLIO_DATA.socials.map(soc => `
        <a href="${soc.url}" target="_blank" rel="noopener noreferrer" class="social-chip" style="--chip-accent: ${soc.color}">
          <span class="social-chip-name">${soc.name}</span>
          <span class="social-chip-handle">${soc.handle}</span>
        </a>
      `).join("");
    }

    // Interactive message composer
    const sendBtn = document.getElementById("send-msg-btn");
    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        soundEngine.playClick();
        const subject = encodeURIComponent(document.getElementById("msg-subject")?.value || "Hello Ranjan!");
        const body = encodeURIComponent(document.getElementById("msg-body")?.value || "");
        window.location.href = `mailto:${p.email}?subject=${subject}&body=${body}`;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Desktop Icons Setup
  // ---------------------------------------------------------------------------

  setupDesktopIcons() {
    document.querySelectorAll(".desktop-icon").forEach((iconEl) => {
      const targetWindow = iconEl.dataset.target;

      // Click or double click to open window
      iconEl.addEventListener("click", () => {
        soundEngine.playClick();
        if (targetWindow) {
          windowManager.open(targetWindow);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Real-time System Tray Clock
  // ---------------------------------------------------------------------------

  setupTaskbarClock() {
    const clockEl = document.getElementById("taskbar-clock");
    const updateTime = () => {
      if (!clockEl) return;
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      clockEl.textContent = `${hours}:${minutes} ${ampm}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // ---------------------------------------------------------------------------
  // Start Menu
  // ---------------------------------------------------------------------------

  setupStartMenu() {
    const startBtn = document.getElementById("start-button");
    const startMenu = document.getElementById("start-menu");

    if (startBtn && startMenu) {
      startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        soundEngine.playClick();
        this.startMenuOpen = !this.startMenuOpen;
        startMenu.classList.toggle("hidden", !this.startMenuOpen);
        startBtn.classList.toggle("active", this.startMenuOpen);
      });

      // Close start menu when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest("#start-menu") && !e.target.closest("#start-button")) {
          if (this.startMenuOpen) {
            this.startMenuOpen = false;
            startMenu.classList.add("hidden");
            startBtn.classList.remove("active");
          }
        }
      });

      // Start menu item clicks
      startMenu.querySelectorAll(".start-menu-item").forEach((item) => {
        item.addEventListener("click", () => {
          soundEngine.playClick();
          const target = item.dataset.target;
          if (target) {
            windowManager.open(target);
          }
          this.startMenuOpen = false;
          startMenu.classList.add("hidden");
          startBtn.classList.remove("active");
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // System Tray Controls (SFX, Theme, Wallpaper)
  // ---------------------------------------------------------------------------

  setupSystemTrayControls() {
    // SFX Toggle
    const sfxBtn = document.getElementById("sfx-toggle-btn");
    if (sfxBtn) {
      const updateSfxIcon = () => {
        sfxBtn.innerHTML = soundEngine.enabled ? "<span>🔊 SFX: ON</span>" : "<span>🔇 SFX: OFF</span>";
        sfxBtn.title = soundEngine.enabled ? "Mute Sound Effects" : "Enable Sound Effects";
      };
      updateSfxIcon();

      sfxBtn.addEventListener("click", () => {
        const newState = soundEngine.toggleSound();
        updateSfxIcon();
        this.showToast(newState ? "Sound Effects Enabled! 🔊" : "Sound Muted 🔇");
      });
    }

    // Quick Theme Toggle Button in top/bottom bar
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        soundEngine.playClick();
        const themes = ["cream", "cyber", "90s", "pastel", "matrix"];
        const nextIdx = (themes.indexOf(this.currentTheme) + 1) % themes.length;
        this.setTheme(themes[nextIdx]);
      });
    }

    // Settings Window Theme Selectors
    document.querySelectorAll(".theme-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        soundEngine.playClick();
        this.setTheme(btn.dataset.theme);
      });
    });

    // Settings Window Wallpaper Selectors
    document.querySelectorAll(".wallpaper-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        soundEngine.playClick();
        this.setWallpaper(btn.dataset.wallpaper);
      });
    });
  }

  loadSavedTheme() {
    const savedTheme = localStorage.getItem("portfolio_theme") || "cream";
    const savedWall = localStorage.getItem("portfolio_wallpaper") || "grid";
    this.setTheme(savedTheme, false);
    this.setWallpaper(savedWall, false);
  }

  setTheme(themeName, showToastMsg = true) {
    this.currentTheme = themeName;
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("portfolio_theme", themeName);

    // Update active state in settings window
    document.querySelectorAll(".theme-option-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.theme === themeName);
    });

    if (showToastMsg) {
      const themeTitles = {
        cream: "Tokyo Cream (Cozy)",
        cyber: "Cyber Midnight (Dark)",
        "90s": "Classic OS (90s Retro)",
        pastel: "Pastel Sakura",
        matrix: "Matrix Terminal"
      };
      this.showToast(`Theme: ${themeTitles[themeName] || themeName}`);
    }
  }

  setWallpaper(wallName, showToastMsg = true) {
    this.currentWallpaper = wallName;
    const desktopBg = document.getElementById("desktop-canvas");
    if (desktopBg) {
      desktopBg.className = `desktop-canvas wallpaper-${wallName}`;
    }
    localStorage.setItem("portfolio_wallpaper", wallName);

    document.querySelectorAll(".wallpaper-option-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.wallpaper === wallName);
    });

    if (showToastMsg) {
      this.showToast(`Wallpaper changed to: ${wallName}`);
    }
  }

  showToast(message, duration = 2500) {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden", "fade-out");
    toast.classList.add("fade-in");

    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      setTimeout(() => toast.classList.add("hidden"), 300);
    }, duration);
  }

  // ---------------------------------------------------------------------------
  // Easter Egg: Konami Code (↑ ↑ ↓ ↓ ← → ← → B A)
  // ---------------------------------------------------------------------------

  setupKonamiCode() {
    const pattern = [
      "ArrowUp", "ArrowUp",
      "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight",
      "ArrowLeft", "ArrowRight",
      "b", "a"
    ];
    let current = 0;

    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === pattern[current].toLowerCase()) {
        current++;
        if (current === pattern.length) {
          current = 0;
          this.triggerPartyMode();
        }
      } else {
        current = 0;
      }
    });
  }

  triggerPartyMode() {
    soundEngine.playWindowOpen();
    this.showToast("🎉 PARTY MODE ACTIVATED! (Konami Code Unlocked)", 4000);
    mascot.say("WHOA! You found the secret Konami Code! Party time!! 🎊✨", 6000);

    // Cycle through themes rapidly for 3 seconds
    const themes = ["cyber", "matrix", "pastel", "90s", "cream"];
    let idx = 0;
    const interval = setInterval(() => {
      this.setTheme(themes[idx % themes.length], false);
      idx++;
      if (idx > 12) {
        clearInterval(interval);
        this.setTheme("cream", false);
      }
    }, 250);
  }
}

const desktopManager = new DesktopManager();
