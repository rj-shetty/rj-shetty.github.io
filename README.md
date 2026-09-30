# ✦ Ranjan Shetty's Interactive Desktop OS Portfolio

> A tactile, retro-modern, non-AI-ish personal portfolio website inspired by creative OS desktop environments (like [sharyap.com](https://www.sharyap.com/)).

![Ranjan's Desktop OS](assets/images/byte.svg)

---

## 🌟 What Makes This Portfolio Special?

Most modern developer portfolios look like generic corporate AI templates filled with purple gradients and empty buzzwords. This portfolio is designed to feel like **exploring a creative engineer's personal computer**:

- 🖥️ **Interactive Desktop Environment**: Draggable, stackable, minimizable, and maximizable retro windows with authentic titlebars, drop-shadows, and active window focusing.
- 📱 **Adaptive Mobile Experience**: On phones and touch devices, windows automatically convert into smooth bottom-sheet modals with gesture handles!
- 🐱 **Interactive Companion ("Byte")**: An animated desktop buddy who bobs in the corner, reacts to clicks, squeaks, and shares witty thoughts and tips!
- 🔊 **Zero-Dependency Synthesized SFX**: Tactile button clicks, window open chimes, and mascot squeaks synthesized in real-time via the browser's Web Audio API (100% offline, zero lag, no missing audio files).
- 🎵 **Lo-Fi Chiptune Synthesizer**: A built-in retro cassette player that generates chill ambient chiptune beats in real-time with an animated equalizer!
- 🕹️ **Playable Retro Arcade (Cyber Snake)**: A complete mini-game built right into a window with canvas rendering, high score persistence, and mobile touch D-Pad controls!
- 💻 **Interactive Hacker Terminal**: A bash-style terminal emulator supporting commands like `about`, `skills`, `projects`, `matrix`, `sudo`, and `theme`.
- 📝 **Desktop Corkboard / Sticky Notes**: Sticky notes that visitors can write, change colors, and save directly in their browser's `localStorage`.
- 🎨 **Theme & Wallpaper Engine**: Switch between 5 hand-crafted palettes (**Tokyo Cream**, **Cyber Midnight**, **Classic 90s OS**, **Pastel Sakura**, and **Matrix Terminal**), plus retro wallpapers.
- ⚡ **Zero-Dependency Architecture**: Runs anywhere with zero build steps, 100/100 Lighthouse performance, instant loading.

---

## 🚀 How to Run Locally

You don't need complicated build tools, webpack, or massive `node_modules` folders.

### Option 1: Using Node (Recommended)
```bash
npm start
```
Then open **[http://localhost:3000](http://localhost:3000)** in your browser!

### Option 2: Direct Double-Click
You can even open `index.html` directly in Chrome, Firefox, Safari, or Edge!

---

## ✏️ How to Customize Your Info (Super Easy!)

All your personal details, projects, skills, and links are centralized in a single file:

```
📁 js/data.js
```

Open `js/data.js` in any text editor (like VS Code) and edit:
1. **Your Bio & Story**: Update `profile.name`, `profile.title`, and `profile.bio`.
2. **Your Socials**: Add or change your LinkedIn, GitHub, or Twitter links.
3. **Your Projects**: Add new project cards, GitHub repositories, and live demo links.
4. **Your Skills**: Add your favorite tools, languages, and frameworks.
5. **Mascot Quotes**: Add your own witty jokes or tips for Byte to say!

Save the file and refresh your browser — everything updates **immediately**!

---

## 🌐 How to Deploy to GitHub Pages (Live on the Web)

Because your repository is named `rj-shetty.github.io` and contains `index.html` at the root, publishing live takes just 3 commands:

```bash
git add .
git commit -m "Deploy new interactive desktop portfolio"
git push origin main
```

Within 1-2 minutes, your website will be live worldwide at:
👉 **https://rj-shetty.github.io**

---

## 📁 Project Structure

```text
portfolio/
├── index.html            # Main desktop OS interface
├── server.js             # Zero-dependency local dev server
├── package.json          # npm start script
├── js/
│   ├── data.js           # 👈 EDIT THIS FILE TO CHANGE YOUR CONTENT!
│   ├── sound.js          # Web Audio API sound synthesizer
│   ├── windows.js        # Draggable window manager & mobile sheet handler
│   ├── mascot.js         # Interactive desktop companion ("Byte")
│   ├── arcade.js         # Playable Cyber Snake mini-game
│   ├── lofi.js           # Generative Lo-Fi chiptune player & equalizer
│   ├── terminal.js       # Interactive CLI terminal emulator
│   ├── notes.js          # Sticky notes with localStorage persistence
│   ├── desktop.js        # Desktop icons, taskbar clock, start menu, themes
│   └── main.js           # Bootstrap coordinator
├── css/
│   ├── style.css         # Reset, tokens, buttons, modal
│   ├── themes.css        # Cream, Cyber, 90s, Pastel, Matrix themes
│   ├── desktop.css       # Desktop grid, top menu bar, bottom taskbar
│   ├── windows.css       # Window styling & mobile bottom-sheet styles
│   ├── mascot.css        # Mascot animations & speech bubble
│   └── apps.css          # Specific window view layouts
└── assets/
    └── images/
        ├── avatar.svg    # Custom vector avatar
        └── byte.svg      # Custom desktop companion mascot
```

---

## 🕹️ Secret Easter Eggs

- **Konami Code**: On your keyboard, press `↑ ↑ ↓ ↓ ← → ← → B A` to unlock Party Mode!
- **Terminal Matrix**: Open the Terminal and type `matrix` for digital phosphor rain.
- **Sudo Command**: Try typing `sudo` in the Terminal!
- **Byte Mascot**: Click the companion in the corner for random quotes and squeaks.

---

### Crafted with ❤️ for Ranjan Shetty
License: MIT
