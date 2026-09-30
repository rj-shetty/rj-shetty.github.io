// =============================================================================
// INTERACTIVE TERMINAL EMULATOR
// =============================================================================
// Full bash-style interactive terminal emulator with command history,
// custom commands, matrix rain easter egg, and window triggers.
// =============================================================================

class TerminalEmulator {
  constructor() {
    this.outputEl = null;
    this.inputEl = null;
    this.history = [];
    this.historyIndex = -1;
    this.matrixRunning = false;
    this.matrixTimer = null;
  }

  init() {
    this.outputEl = document.getElementById("terminal-output");
    this.inputEl = document.getElementById("terminal-input");
    const container = document.getElementById("terminal-container");

    if (!this.inputEl || !this.outputEl) return;

    // Focus input on clicking anywhere in terminal
    if (container) {
      container.addEventListener("click", () => {
        this.inputEl.focus();
      });
    }

    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = this.inputEl.value.trim();
        this.inputEl.value = "";
        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          this.execute(cmd);
        }
      } else if (e.key === "ArrowUp") {
        if (this.history.length > 0 && this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.history[this.historyIndex];
        }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.inputEl.value = "";
        }
        e.preventDefault();
      }
    });

    this.printWelcome();
  }

  printWelcome() {
    this.println("Welcome to Ranjan's Terminal v2.6 (x86_64-portfolio-linux)");
    this.println("Type <span class='cmd-highlight'>help</span> to see available commands or <span class='cmd-highlight'>open projects</span> to launch windows.");
    this.println("----------------------------------------------------------------");
  }

  println(htmlText) {
    if (!this.outputEl) return;
    const line = document.createElement("div");
    line.className = "term-line";
    line.innerHTML = htmlText;
    this.outputEl.appendChild(line);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  execute(rawCmd) {
    soundEngine.playClick();
    this.println(`<span class="term-prompt">ranjan@portfolio:~$</span> ${this.escapeHtml(rawCmd)}`);

    const parts = rawCmd.split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    switch (cmd) {
      case "help":
        this.println(`
<div class="term-help-grid">
  <div><span class="cmd-highlight">about</span>      - Print Ranjan's profile and background</div>
  <div><span class="cmd-highlight">skills</span>     - View tech stack & tools</div>
  <div><span class="cmd-highlight">projects</span>   - List featured engineering projects</div>
  <div><span class="cmd-highlight">open &lt;app&gt;</span>  - Launch a window (e.g. 'open arcade')</div>
  <div><span class="cmd-highlight">contact</span>    - Show contact details & links</div>
  <div><span class="cmd-highlight">lofi</span>       - Toggle chill ambient music player</div>
  <div><span class="cmd-highlight">matrix</span>     - Run digital rain matrix effect</div>
  <div><span class="cmd-highlight">theme</span>      - Switch theme (cream, cyber, 90s, pastel)</div>
  <div><span class="cmd-highlight">date</span>       - Display system date and time</div>
  <div><span class="cmd-highlight">clear</span>      - Clear terminal screen</div>
  <div><span class="cmd-highlight">sudo</span>       - Superuser privilege escalation</div>
</div>`);
        break;

      case "about":
        this.println(`<strong>Ranjan Shetty</strong> — ${PORTFOLIO_DATA.profile.title}`);
        this.println(PORTFOLIO_DATA.profile.bio.join("<br><br>"));
        this.println(`<em>Degree:</em> ${PORTFOLIO_DATA.profile.education.degree}`);
        break;

      case "skills":
        this.println("<strong>CORE TOOLKIT & SKILLS:</strong>");
        this.println(`<strong>Frontend:</strong> ${PORTFOLIO_DATA.skills.frontend.map(s => s.name).join(", ")}`);
        this.println(`<strong>Backend:</strong> ${PORTFOLIO_DATA.skills.backend.map(s => s.name).join(", ")}`);
        this.println(`<strong>Tools & Workflow:</strong> ${PORTFOLIO_DATA.skills.tools.map(s => s.name).join(", ")}`);
        break;

      case "projects":
        this.println("<strong>FEATURED PROJECTS:</strong>");
        PORTFOLIO_DATA.projects.forEach((p, i) => {
          this.println(`${i + 1}. <span class="cmd-highlight">${p.title}</span> [${p.tech.slice(0, 3).join(", ")}]`);
          this.println(`   <em>${p.tagline}</em>`);
        });
        this.println(`Tip: Type <span class="cmd-highlight">open projects</span> to see full visual interactive cards!`);
        break;

      case "open":
        this.handleOpen(arg);
        break;

      case "contact":
        this.println(`<strong>Email:</strong> <a href="mailto:${PORTFOLIO_DATA.profile.email}" class="term-link">${PORTFOLIO_DATA.profile.email}</a>`);
        this.println(`<strong>GitHub:</strong> <a href="${PORTFOLIO_DATA.socials[0].url}" target="_blank" class="term-link">${PORTFOLIO_DATA.socials[0].url}</a>`);
        this.println(`<strong>LinkedIn:</strong> <a href="${PORTFOLIO_DATA.socials[1].url}" target="_blank" class="term-link">${PORTFOLIO_DATA.socials[1].url}</a>`);
        break;

      case "lofi":
        windowManager.open("window-lofi");
        soundEngine.toggleLoFi((track, playing) => {
          loFiPlayer.updateTrackDisplay(track, playing);
        });
        this.println("Toggled Lo-Fi Synthesizer!");
        break;

      case "clear":
        this.outputEl.innerHTML = "";
        break;

      case "date":
        this.println(new Date().toString());
        break;

      case "sudo":
        this.println("<span style='color: #ef4444;'>Permission denied:</span> User 'ranjan' is not in the sudoers file. This incident will be reported to Byte the Cat.");
        soundEngine.playMascotSqueak();
        break;

      case "cat":
        if (arg === "secret.txt") {
          this.println("🎉 You found the easter egg! Here's a secret code: <code>KONAMI-MAGIC</code>.");
          this.println("You can also press [Up Up Down Down Left Right Left Right B A] on your keyboard!");
        } else {
          this.println(`cat: ${arg || "file"}: No such file or directory. Try 'cat secret.txt'`);
        }
        break;

      case "theme":
        if (["cream", "cyber", "90s", "pastel", "matrix"].includes(arg.toLowerCase())) {
          desktopManager.setTheme(arg.toLowerCase());
          this.println(`Theme changed to: ${arg}`);
        } else {
          this.println("Available themes: cream, cyber, 90s, pastel, matrix. Usage: 'theme cyber'");
        }
        break;

      case "matrix":
        this.startMatrixEffect();
        break;

      default:
        this.println(`Command not found: ${this.escapeHtml(cmd)}. Type <span class="cmd-highlight">help</span> for a list of commands.`);
        break;
    }
  }

  handleOpen(target) {
    const map = {
      about: "window-about",
      projects: "window-projects",
      work: "window-projects",
      skills: "window-skills",
      arcade: "window-arcade",
      game: "window-arcade",
      lofi: "window-lofi",
      music: "window-lofi",
      notes: "window-notes",
      contact: "window-contact",
      settings: "window-settings"
    };

    const windowId = map[target.toLowerCase()];
    if (windowId) {
      windowManager.open(windowId);
      this.println(`Opened window: ${target}`);
    } else {
      this.println(`Unknown window '${target}'. Available: ${Object.keys(map).join(", ")}`);
    }
  }

  startMatrixEffect() {
    this.println("<span style='color: #22c55e;'>Initializing Matrix digital stream... Press any key to stop.</span>");
    const chars = "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈ";
    let count = 0;

    const interval = setInterval(() => {
      let str = "";
      for (let i = 0; i < 48; i++) {
        str += chars[Math.floor(Math.random() * chars.length)] + " ";
      }
      this.println(`<span style="color: #22c55e; font-size: 11px;">${str}</span>`);
      count++;
      if (count > 25) {
        clearInterval(interval);
        this.println("<span style='color: #22c55e;'>Wake up, Neo...</span>");
      }
    }, 80);
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

const terminalEmulator = new TerminalEmulator();
