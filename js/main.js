// =============================================================================
// MAIN ENTRY POINT
// =============================================================================
// Bootstraps all subsystems once DOM is ready.
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("⚡ Booting Ranjan Shetty's Desktop OS v2.6...");

  // Initialize subsystems
  desktopManager.init();
  mascot.init();
  retroArcade.init();
  loFiPlayer.init();
  terminalEmulator.init();
  stickyNotes.init();

  // Attach first-gesture audio unlocking
  const unlockAudio = () => {
    soundEngine.init();
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });

  console.log("✨ Desktop OS ready!");
});
