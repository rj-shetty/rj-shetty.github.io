// =============================================================================
// RETRO ARCADE — Cyber Snake Mini-Game
// =============================================================================
// Fully playable retro arcade game right in an OS window!
// Smooth canvas rendering, sound effects, high score persistence, and touch D-Pad.
// =============================================================================

class RetroArcade {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gridSize = 16;
    this.tileCount = 20;
    this.snake = [];
    this.food = { x: 5, y: 5 };
    this.dx = 1;
    this.dy = 0;
    this.nextDx = 1;
    this.nextDy = 0;
    this.score = 0;
    this.highScore = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.gameLoopTimer = null;
    this.speed = 100;
  }

  init() {
    this.canvas = document.getElementById("arcade-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Load High Score
    const saved = localStorage.getItem("arcade_snake_highscore");
    if (saved) this.highScore = parseInt(saved, 10);
    this.updateScoreDisplay();

    // Start / Reset Button
    const startBtn = document.getElementById("arcade-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        soundEngine.playClick();
        this.start();
      });
    }

    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      // Only listen if arcade window is active
      const arcadeWin = document.getElementById("window-arcade");
      if (!arcadeWin || arcadeWin.classList.contains("hidden") || arcadeWin.classList.contains("minimized")) {
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "s", "a", "d", "W", "S", "A", "D"].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        if (this.dy === 0) { this.nextDx = 0; this.nextDy = -1; }
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        if (this.dy === 0) { this.nextDx = 0; this.nextDy = 1; }
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (this.dx === 0) { this.nextDx = -1; this.nextDy = 0; }
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (this.dx === 0) { this.nextDx = 1; this.nextDy = 0; }
      } else if (e.key === " " && !this.isRunning) {
        this.start();
      }
    });

    // Touch D-Pad for mobile
    const dpadButtons = document.querySelectorAll(".dpad-btn");
    dpadButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        soundEngine.playClick();
        const dir = btn.dataset.dir;
        if (dir === "up" && this.dy === 0) { this.nextDx = 0; this.nextDy = -1; }
        if (dir === "down" && this.dy === 0) { this.nextDx = 0; this.nextDy = 1; }
        if (dir === "left" && this.dx === 0) { this.nextDx = -1; this.nextDy = 0; }
        if (dir === "right" && this.dx === 0) { this.nextDx = 1; this.nextDy = 0; }
      });
    });

    this.drawWelcomeScreen();
  }

  start() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dx = 1;
    this.dy = 0;
    this.nextDx = 1;
    this.nextDy = 0;
    this.score = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.spawnFood();
    this.updateScoreDisplay();

    if (this.gameLoopTimer) clearInterval(this.gameLoopTimer);
    this.gameLoopTimer = setInterval(() => this.step(), this.speed);

    const startBtn = document.getElementById("arcade-start-btn");
    if (startBtn) startBtn.textContent = "Restart Game";
  }

  spawnFood() {
    let valid = false;
    while (!valid) {
      this.food.x = Math.floor(Math.random() * (this.canvas.width / this.gridSize));
      this.food.y = Math.floor(Math.random() * (this.canvas.height / this.gridSize));
      valid = !this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y);
    }
  }

  step() {
    if (!this.isRunning || this.isPaused) return;

    this.dx = this.nextDx;
    this.dy = this.nextDy;

    const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
    const maxTilesX = this.canvas.width / this.gridSize;
    const maxTilesY = this.canvas.height / this.gridSize;

    // Wall collision (wrap around screen or die: let's die for classic arcade challenge!)
    if (head.x < 0 || head.x >= maxTilesX || head.y < 0 || head.y >= maxTilesY) {
      this.gameOver();
      return;
    }

    // Self collision
    for (let i = 0; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(head);

    // Food check
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      soundEngine.playArcadeEat();
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem("arcade_snake_highscore", this.highScore);
      }
      this.updateScoreDisplay();
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.render();
  }

  gameOver() {
    this.isRunning = false;
    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }
    soundEngine.playArcadeGameOver();
    this.render(true);

    const startBtn = document.getElementById("arcade-start-btn");
    if (startBtn) startBtn.textContent = "Play Again";
  }

  updateScoreDisplay() {
    const scoreEl = document.getElementById("arcade-score");
    const highEl = document.getElementById("arcade-highscore");
    if (scoreEl) scoreEl.textContent = this.score;
    if (highEl) highEl.textContent = this.highScore;
  }

  render(isGameOver = false) {
    if (!this.ctx) return;

    // Background
    this.ctx.fillStyle = "#111827";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Retro Grid Lines
    this.ctx.strokeStyle = "rgba(55, 65, 81, 0.4)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Food (juicy glowing pixel apple)
    this.ctx.fillStyle = "#ef4444";
    this.ctx.shadowColor = "#ef4444";
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(
      this.food.x * this.gridSize + 2,
      this.food.y * this.gridSize + 2,
      this.gridSize - 4,
      this.gridSize - 4
    );

    // Snake
    this.snake.forEach((seg, idx) => {
      this.ctx.fillStyle = idx === 0 ? "#10b981" : "#34d399";
      this.ctx.shadowColor = "#10b981";
      this.ctx.shadowBlur = idx === 0 ? 6 : 2;
      this.ctx.fillRect(
        seg.x * this.gridSize + 1,
        seg.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });

    this.ctx.shadowBlur = 0; // reset shadow

    // Game Over Overlay
    if (isGameOver) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.fillStyle = "#ef4444";
      this.ctx.textAlign = "center";
      this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2 - 10);

      this.ctx.font = '14px "Courier New", monospace';
      this.ctx.fillStyle = "#f3f4f6";
      this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 15);
      this.ctx.fillText("Press Start to retry", this.canvas.width / 2, this.canvas.height / 2 + 35);
    }
  }

  drawWelcomeScreen() {
    if (!this.ctx) return;
    this.ctx.fillStyle = "#111827";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 18px "Courier New", monospace';
    this.ctx.fillStyle = "#10b981";
    this.ctx.textAlign = "center";
    this.ctx.fillText("CYBER SNAKE", this.canvas.width / 2, this.canvas.height / 2 - 16);

    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.fillStyle = "#9ca3af";
    this.ctx.fillText("Use Arrow Keys / WASD", this.canvas.width / 2, this.canvas.height / 2 + 10);
    this.ctx.fillText("Click 'Start Game' below!", this.canvas.width / 2, this.canvas.height / 2 + 28);
  }
}

const retroArcade = new RetroArcade();
