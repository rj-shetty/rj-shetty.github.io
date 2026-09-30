// =============================================================================
// SOUND ENGINE — Web Audio API Synthesizer
// =============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lofiPlaying = false;
    this.currentTrackIndex = 0;
    this.lofiTimer = null;
    this.lofiGainNode = null;
    this.masterGainNode = null;
    this.step = 0;
    this.onTrackChangeCallback = null;

    const saved = localStorage.getItem("portfolio_sfx_enabled");
    if (saved !== null) {
      this.enabled = saved === "true";
    }

    // Global listener to unlock AudioContext automatically
    const unlockAudio = () => {
      this.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

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
    if (!this.enabled && this.lofiPlaying) this.stopLoFi();
    return this.enabled;
  }

  // Smooth Envelope helper to prevent speaker popping
  createSmoothGain(now, peakVal, attack, decay) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now); // Start exactly at 0
    gain.gain.linearRampToValueAtTime(peakVal, now + attack); // Smoothly ramp up
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay); // Trail off smoothly
    return gain;
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const now = this.ctx.currentTime;
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    const gain = this.createSmoothGain(now, 0.2, 0.005, 0.04);

    osc.connect(gain);
    gain.connect(this.masterGainNode);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playWindowOpen() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const startTime = now + idx * 0.045;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      const gain = this.createSmoothGain(startTime, 0.15, 0.015, 0.16);

      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  playWindowClose() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [783.99, 659.25, 523.25];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const startTime = now + idx * 0.035;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      const gain = this.createSmoothGain(startTime, 0.1, 0.01, 0.12);

      osc.connect(gain);
      gain.connect(this.masterGainNode);
      osc.start(startTime);
      osc.stop(startTime + 0.14);
    });
  }

  playMascotSqueak() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();

    osc.type = "sine";
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.14);

    const gain = this.createSmoothGain(now, 0.25, 0.02, 0.15);

    osc.connect(gain);
    gain.connect(this.masterGainNode);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  // --- LOFI PLAYER LOGIC REMAINS IDENTICAL ---
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
    if (this.lofiPlaying) this.stopLoFi();
    else this.startLoFi();
    return this.lofiPlaying;
  }

  startLoFi() {
    this.init();
    if (!this.ctx) return;
    this.lofiPlaying = true;
    this.step = 0;

    const tracks = PORTFOLIO_DATA.lofiTracks;
    const track = tracks[this.currentTrackIndex % tracks.length];
    if (this.onTrackChangeCallback) this.onTrackChangeCallback(track, true);

    const interval = (60 / track.bpm) * 500; 
    this.lofiTimer = setInterval(() => {
      if (!this.lofiPlaying) return;
      this.tickLoFiStep(track);
    }, interval);
  }

  stopLoFi() {
    this.lofiPlaying = false;
    if (this.lofiTimer) { clearInterval(this.lofiTimer); this.lofiTimer = null; }
    const tracks = PORTFOLIO_DATA.lofiTracks;
    const track = tracks[this.currentTrackIndex % tracks.length];
    if (this.onTrackChangeCallback) this.onTrackChangeCallback(track, false);
  }

  nextTrack() {
    const tracks = PORTFOLIO_DATA.lofiTracks;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % tracks.length;
    if (this.lofiPlaying) { this.stopLoFi(); this.startLoFi(); }
  }

  prevTrack() {
    const tracks = PORTFOLIO_DATA.lofiTracks;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + tracks.length) % tracks.length;
    if (this.lofiPlaying) { this.stopLoFi(); this.startLoFi(); }
  }

  tickLoFiStep(track) {
    if (!this.ctx || !this.lofiPlaying) return;

    const now = this.ctx.currentTime;
    const scale = track.scale;
    const freq = this.noteToFreq(scale[this.step % scale.length]);

    // Lead Synth
    const osc = this.ctx.createOscillator();
    osc.type = (this.step % 4 === 0) ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);
    const gain = this.createSmoothGain(now, 0.12, 0.04, 0.35);
    osc.connect(gain);
    gain.connect(this.lofiGainNode);
    osc.start(now);
    osc.stop(now + 0.4);

    // Sub Bass
    if (this.step % 4 === 0) {
      const bassOsc = this.ctx.createOscillator();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(freq / 2, now);
      const bassGain = this.createSmoothGain(now, 0.08, 0.01, 0.45);
      bassOsc.connect(bassGain);
      bassGain.connect(this.lofiGainNode);
      bassOsc.start(now);
      bassOsc.stop(now + 0.46);
    }

    // Hi-hat / Percussion tick
    if (this.step % 2 === 1) {
      const noise = this.ctx.createOscillator();
      noise.type = "square";
      noise.frequency.setValueAtTime(120, now);
      noise.frequency.exponentialRampToValueAtTime(30, now + 0.03);
      const noiseGain = this.createSmoothGain(now, 0.03, 0.005, 0.03);
      noise.connect(noiseGain);
      noiseGain.connect(this.lofiGainNode);
      noise.start(now);
      noise.stop(now + 0.04);
    }
    this.step++;
  }
}

const soundEngine = new SoundEngine();