// =============================================================================
// SOUND ENGINE — Web Audio API Synthesizer
// =============================================================================
// Synthesizes all tactile sound effects and retro lo-fi melodies in real-time.
// Zero external audio files required! 100% offline, zero latency, zero lag.
// =============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true; // SFX toggle state
    this.lofiPlaying = false;
    this.currentTrackIndex = 0;
    this.lofiTimer = null;
    this.lofiGainNode = null;
    this.masterGainNode = null;
    this.step = 0;
    this.onTrackChangeCallback = null;

    // Load sound preference from localStorage
    const saved = localStorage.getItem("portfolio_sfx_enabled");
    if (saved !== null) {
      this.enabled = saved === "true";
    }
  }

  // Initialize AudioContext on first user interaction
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGainNode.connect(this.ctx.destination);

        this.lofiGainNode = this.ctx.createGain();
        this.lofiGainNode.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.lofiGainNode.connect(this.masterGainNode);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem("portfolio_sfx_enabled", this.enabled);
    if (!this.enabled && this.lofiPlaying) {
      this.stopLoFi();
    }
    return this.enabled;
  }

  // Tactile button click sound (crisp & soft)
  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGainNode);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Window opening chime (rising pleasant major arpeggio)
  playWindowOpen() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.045;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(startTime);
      osc.stop(startTime + 0.16);
    });
  }

  // Window close sound (soft descending whoosh)
  playWindowClose() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [783.99, 659.25, 523.25]; // G5, E5, C5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.035;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  }

  // Cute squeak for the mascot companion
  playMascotSqueak() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGainNode);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Retro Arcade - pellet eat blip
  playArcadeEat() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(900, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGainNode);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Retro Arcade - Game Over sound
  playArcadeGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 415, 392, 349];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.1;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGainNode);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  // ===========================================================================
  // REAL-TIME GENERATIVE LO-FI CHIPTUNE SYNTHESIZER
  // ===========================================================================
  // Plays warm, relaxing, ambient polyphonic chiptune melodies while coding!

  noteToFreq(noteStr) {
    const notes = {
      "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
      "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "Bb4": 466.16, "B4": 493.88,
      "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00
    };
    return notes[noteStr] || 440;
  }

  toggleLoFi(onTrackChange) {
    this.onTrackChangeCallback = onTrackChange;
    if (this.lofiPlaying) {
      this.stopLoFi();
    } else {
      this.startLoFi();
    }
    return this.lofiPlaying;
  }

  startLoFi() {
    this.init();
    if (!this.ctx) return;
    this.lofiPlaying = true;
    this.step = 0;

    const tracks = PORTFOLIO_DATA.lofiTracks;
    const track = tracks[this.currentTrackIndex % tracks.length];
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(track, true);
    }

    const interval = (60 / track.bpm) * 500; // 8th note rhythm
    this.lofiTimer = setInterval(() => {
      if (!this.lofiPlaying) return;
      this.tickLoFiStep(track);
    }, interval);
  }

  stopLoFi() {
    this.lofiPlaying = false;
    if (this.lofiTimer) {
      clearInterval(this.lofiTimer);
      this.lofiTimer = null;
    }
    const tracks = PORTFOLIO_DATA.lofiTracks;
    const track = tracks[this.currentTrackIndex % tracks.length];
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(track, false);
    }
  }

  nextTrack() {
    const tracks = PORTFOLIO_DATA.lofiTracks;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % tracks.length;
    if (this.lofiPlaying) {
      this.stopLoFi();
      this.startLoFi();
    } else if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(tracks[this.currentTrackIndex], false);
    }
  }

  prevTrack() {
    const tracks = PORTFOLIO_DATA.lofiTracks;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + tracks.length) % tracks.length;
    if (this.lofiPlaying) {
      this.stopLoFi();
      this.startLoFi();
    } else if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(tracks[this.currentTrackIndex], false);
    }
  }

  tickLoFiStep(track) {
    if (!this.ctx || !this.lofiPlaying) return;

    const now = this.ctx.currentTime;
    const scale = track.scale;
    const note = scale[this.step % scale.length];
    const freq = this.noteToFreq(note);

    // Lead melody tone (gentle triangle synth)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = (this.step % 4 === 0) ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);

    // Warm envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.lofiGainNode);

    osc.start(now);
    osc.stop(now + 0.35);

    // Mellow sub-bass on beat 0 and 4
    if (this.step % 4 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(freq / 2, now);

      bassGain.gain.setValueAtTime(0.08, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      bassOsc.connect(bassGain);
      bassGain.connect(this.lofiGainNode);

      bassOsc.start(now);
      bassOsc.stop(now + 0.45);
    }

    // Soft vintage percussion tick on every 2nd beat
    if (this.step % 2 === 1) {
      const noise = this.ctx.createOscillator();
      const noiseGain = this.ctx.createGain();
      noise.type = "square";
      noise.frequency.setValueAtTime(120, now);
      noise.frequency.exponentialRampToValueAtTime(30, now + 0.03);

      noiseGain.gain.setValueAtTime(0.03, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      noise.connect(noiseGain);
      noiseGain.connect(this.lofiGainNode);

      noise.start(now);
      noise.stop(now + 0.03);
    }

    this.step++;
  }
}

// Global sound instance
const soundEngine = new SoundEngine();
