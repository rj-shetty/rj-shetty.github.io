// =============================================================================
// INTERACTIVE MASCOT COMPANION — "Byte the Cat / Buddy"
// =============================================================================
// A delightful, animated desktop buddy that sits at the bottom corner, bobs,
// reacts to clicks, squeaks with Web Audio, and shares witty developer thoughts!
// =============================================================================

class DesktopMascot {
  constructor() {
    this.container = null;
    this.bubble = null;
    this.bubbleText = null;
    this.character = null;
    this.isBubbleVisible = false;
    this.bubbleTimeout = null;
    this.lastQuoteIndex = -1;
    this.idleTimer = null;
  }

  init() {
    this.container = document.getElementById("mascot-container");
    this.character = document.getElementById("mascot-character");
    this.bubble = document.getElementById("mascot-bubble");
    this.bubbleText = document.getElementById("mascot-bubble-text");

    if (!this.container || !this.character) return;

    // Click on mascot triggers squeak and witty quote
    this.character.addEventListener("click", () => {
      soundEngine.playMascotSqueak();
      this.bounceAnimation();
      this.sayRandomQuote();
    });

    // Close bubble on clicking bubble
    if (this.bubble) {
      this.bubble.addEventListener("click", () => {
        this.hideBubble();
      });
    }

    // Schedule occasional friendly thoughts if idle
    this.resetIdleTimer();
    ["mousemove", "keydown", "click", "touchstart"].forEach((evt) => {
      document.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
    });

    // Greet visitor after 3 seconds on first load
    setTimeout(() => {
      if (!this.isBubbleVisible) {
        this.say("Hey there! Welcome to Ranjan's desktop! Click around to explore! ✨");
      }
    }, 2800);
  }

  bounceAnimation() {
    this.character.classList.remove("bounce-anim");
    void this.character.offsetWidth; // Force reflow
    this.character.classList.add("bounce-anim");
  }

  sayRandomQuote() {
    const quotes = PORTFOLIO_DATA.mascot.quotes;
    if (!quotes || quotes.length === 0) return;

    let idx;
    do {
      idx = Math.floor(Math.random() * quotes.length);
    } while (idx === this.lastQuoteIndex && quotes.length > 1);

    this.lastQuoteIndex = idx;
    this.say(quotes[idx]);
  }

  say(text, duration = 5000) {
    if (!this.bubble || !this.bubbleText) return;

    this.bubbleText.textContent = text;
    this.bubble.classList.remove("hidden", "fade-out");
    this.bubble.classList.add("fade-in");
    this.isBubbleVisible = true;

    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
    }

    this.bubbleTimeout = setTimeout(() => {
      this.hideBubble();
    }, duration);
  }

  hideBubble() {
    if (!this.bubble || !this.isBubbleVisible) return;

    this.bubble.classList.remove("fade-in");
    this.bubble.classList.add("fade-out");

    setTimeout(() => {
      this.bubble.classList.add("hidden");
      this.bubble.classList.remove("fade-out");
      this.isBubbleVisible = false;
    }, 200);
  }

  resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    // After 45 seconds of inactivity, say something funny
    this.idleTimer = setTimeout(() => {
      if (!this.isBubbleVisible) {
        this.say("Still here? Try opening the Retro Arcade or typing 'matrix' in the Terminal! 🕹️");
      }
    }, 45000);
  }
}

const mascot = new DesktopMascot();
