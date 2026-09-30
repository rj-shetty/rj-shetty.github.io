// =============================================================================
// LO-FI PLAYER WIDGET — Retro Chiptune Synth Player
// =============================================================================
// Controls the generative 8-bit / lo-fi chiptune synthesizer, displays track info,
// and animates real-time retro equalizer bars.
// =============================================================================

class LoFiPlayer {
  constructor() {
    this.playBtn = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.titleEl = null;
    this.artistEl = null;
    this.moodEl = null;
    this.equalizerBars = [];
    this.visualizerTimer = null;
  }

  init() {
    this.playBtn = document.getElementById("lofi-play-btn");
    this.prevBtn = document.getElementById("lofi-prev-btn");
    this.nextBtn = document.getElementById("lofi-next-btn");
    this.titleEl = document.getElementById("lofi-track-title");
    this.artistEl = document.getElementById("lofi-track-artist");
    this.moodEl = document.getElementById("lofi-track-mood");
    this.equalizerBars = document.querySelectorAll(".eq-bar");

    // Display initial track
    const tracks = PORTFOLIO_DATA.lofiTracks;
    if (tracks && tracks.length > 0) {
      this.updateTrackDisplay(tracks[0], false);
    }

    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => {
        soundEngine.playClick();
        const isPlaying = soundEngine.toggleLoFi((track, playing) => {
          this.updateTrackDisplay(track, playing);
        });
        this.updatePlayButton(isPlaying);
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => {
        soundEngine.playClick();
        soundEngine.prevTrack();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        soundEngine.playClick();
        soundEngine.nextTrack();
      });
    }
  }

  updateTrackDisplay(track, isPlaying) {
    if (this.titleEl) this.titleEl.textContent = track.title;
    if (this.artistEl) this.artistEl.textContent = track.artist;
    if (this.moodEl) this.moodEl.textContent = `${track.mood} • ${track.bpm} BPM`;

    this.updatePlayButton(isPlaying);

    const cassette = document.getElementById("lofi-cassette");
    if (cassette) {
      if (isPlaying) {
        cassette.classList.add("playing");
      } else {
        cassette.classList.remove("playing");
      }
    }

    if (isPlaying) {
      this.startEqualizer();
    } else {
      this.stopEqualizer();
    }
  }

  updatePlayButton(isPlaying) {
    if (!this.playBtn) return;
    if (isPlaying) {
      this.playBtn.innerHTML = `<span>⏸ Pause</span>`;
      this.playBtn.classList.add("btn-playing");
    } else {
      this.playBtn.innerHTML = `<span>▶ Play Chill Beats</span>`;
      this.playBtn.classList.remove("btn-playing");
    }
  }

  startEqualizer() {
    if (this.visualizerTimer) clearInterval(this.visualizerTimer);
    this.visualizerTimer = setInterval(() => {
      this.equalizerBars.forEach((bar) => {
        const height = Math.floor(Math.random() * 85) + 15;
        bar.style.height = `${height}%`;
      });
    }, 120);
  }

  stopEqualizer() {
    if (this.visualizerTimer) {
      clearInterval(this.visualizerTimer);
      this.visualizerTimer = null;
    }
    this.equalizerBars.forEach((bar) => {
      bar.style.height = "15%";
    });
  }
}

const loFiPlayer = new LoFiPlayer();
