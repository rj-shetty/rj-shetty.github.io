// =============================================================================
// RANJAN SHETTY — PORTFOLIO DATA CONFIGURATION
// =============================================================================
// Hi Ranjan! To update any information on your website (your bio, projects,
// skills, social links, or contact email), just edit this file!
// No complicated build steps required. Everything updates immediately.
// =============================================================================

const PORTFOLIO_DATA = {
  // Profile Information
  profile: {
    name: "Ranjan Shetty",
    nickname: "RJ",
    handle: "rj-shetty",
    title: "Software Developer & Creative Builder",
    subtitle: "building fast, tactile & delightful digital experiences",
    email: "ranjanshetty2005@gmail.com",
    location: "India • Available Worldwide (Remote)",
    statusText: "Open for Internships & Projects",
    statusAvailable: true,
    avatar: "assets/images/avatar.svg", // SVG avatar or your own photo!
    bio: [
      "Hey there! I'm Ranjan, a software developer and computer science student who genuinely loves the craft of building things on the internet.",
      "I believe software shouldn't just be functional — it should feel alive, snappy, tactile, and fun to use. Rather than building cookie-cutter corporate pages, I like crafting interfaces with personality, clean codebases, and thoughtful micro-interactions.",
      "When I'm not writing code, you'll probably find me exploring retro game mechanics, tuning my mechanical keyboard, sipping pour-over coffee, or diving down some fascinating technical rabbit hole."
    ],
    education: {
      degree: "B.Tech in Computer Science & Engineering",
      institution: "Undergraduate (2023 - 2027)",
      notes: "Focusing on Software Engineering, Data Structures & Algorithms, Systems, and Modern Web Architectures."
    },
    philosophy: [
      {
        emoji: "⚡",
        title: "Speed is a Feature",
        desc: "Fast load times, instant feedback, and 60fps responsiveness make software a joy to use."
      },
      {
        emoji: "🎨",
        title: "Tactile & Human",
        desc: "Digital tools should feel good under the fingers. Attention to small details makes a huge difference."
      },
      {
        emoji: "🔍",
        title: "Curious by Default",
        desc: "Never just copy-paste solutions. Understand how things work under the hood, from TCP to CSS rendering."
      }
    ],
    quirks: [
      { label: "Daily Driver", value: "VS Code with custom retro theme & hotkeys" },
      { label: "Fuel of Choice", value: "Black coffee & chilled cold brew ☕" },
      { label: "Music Vibe", value: "Lo-Fi chiptunes, synthwave, ambient video game OSTs 🎧" },
      { label: "Favorite Gaming", value: "Zelda, indie pixel roguelikes, puzzle adventures 🎮" },
      { label: "Current Obsession", value: "Interactive canvas animations & creative web OS tools" }
    ]
  },

  // Social Links
  socials: [
    {
      name: "GitHub",
      id: "github",
      url: "https://github.com/rj-shetty",
      handle: "@rj-shetty",
      icon: "github",
      color: "#24292e"
    },
    {
      name: "LinkedIn",
      id: "linkedin",
      url: "https://linkedin.com/in/ranjan-shetty",
      handle: "Ranjan Shetty",
      icon: "linkedin",
      color: "#0077b5"
    },
    {
      name: "Email",
      id: "email",
      url: "mailto:ranjanshetty2005@gmail.com",
      handle: "ranjanshetty2005@gmail.com",
      icon: "mail",
      color: "#ea4335"
    },
    {
      name: "Discord",
      id: "discord",
      url: "#",
      handle: "rj_shetty",
      icon: "discord",
      color: "#5865f2"
    },
    {
      name: "Resume",
      id: "resume",
      url: "#",
      handle: "Download PDF",
      icon: "file-text",
      color: "#e0533c"
    }
  ],

  // Skills & Toolbox
  skills: {
    frontend: [
      { name: "JavaScript (ES6+)", level: 90, icon: "⚡", desc: "Modern JS, async/await, closures, DOM manipulation" },
      { name: "TypeScript", level: 82, icon: "🔷", desc: "Type safety, generics, interfaces, strict patterns" },
      { name: "React", level: 88, icon: "⚛️", desc: "Hooks, component lifecycles, state management, context" },
      { name: "HTML5 & Semantic Web", level: 95, icon: "🌐", desc: "Clean semantic markup, SEO, modern web standards" },
      { name: "CSS3 / Modern Layouts", level: 92, icon: "🎨", desc: "Flexbox, CSS Grid, custom properties, animations" },
      { name: "Tailwind CSS", level: 85, icon: "🌊", desc: "Utility-first responsive layouts, design systems" }
    ],
    backend: [
      { name: "Node.js & Express", level: 85, icon: "🟢", desc: "REST APIs, routing, middleware, async pipelines" },
      { name: "Python", level: 82, icon: "🐍", desc: "Data processing, algorithms, backend scripting, automation" },
      { name: "C / C++", level: 75, icon: "⚙️", desc: "Memory management, data structures, performance concepts" },
      { name: "PostgreSQL & SQL", level: 80, icon: "🐘", desc: "Relational database schema design, queries, indexes" },
      { name: "MongoDB", level: 78, icon: "🍃", desc: "Document storage, aggregation pipelines, Mongoose" }
    ],
    tools: [
      { name: "Git & GitHub", level: 90, icon: "🐙", desc: "Branching workflows, version control, collaboration" },
      { name: "Linux & Terminal", level: 82, icon: "🐧", desc: "Shell scripting, command-line productivity, server basics" },
      { name: "Docker Basics", level: 72, icon: "🐳", desc: "Containerization, Dockerfiles, isolated environments" },
      { name: "VS Code", level: 95, icon: "💻", desc: "Advanced shortcuts, debugging tools, workspace setups" },
      { name: "Postman", level: 85, icon: "📬", desc: "API endpoint testing, mocking, automated collections" },
      { name: "Figma", level: 75, icon: "📐", desc: "UI wireframing, component mockups, design tokens" }
    ]
  },

  // Projects Showcase
  projects: [
    {
      id: "aero-os",
      title: "AeroOS — Web Desktop Workspace",
      category: "Creative Web",
      badge: "Featured",
      featured: true,
      tagline: "An interactive, retro-inspired personal desktop OS running in your browser.",
      description: "A spatial desktop experience featuring draggable windows, custom window managers, synthesized retro sound effects using Web Audio API, and an interactive companion buddy.",
      highlights: [
        "Zero external framework dependencies — pure hand-crafted vanilla JS & CSS",
        "Synthesized sound engine (chimes, clicks, chiptune beats) with zero audio lag",
        "Fully responsive with a smart mobile bottom-sheet fallback for touch devices",
        "Theme engine with multiple nostalgic color schemes"
      ],
      tech: ["JavaScript", "Web Audio API", "CSS Grid", "Canvas", "LocalStorage"],
      githubUrl: "https://github.com/rj-shetty",
      liveUrl: "#",
      icon: "desktop",
      accent: "#e0533c"
    },
    {
      id: "pulse-chat",
      title: "PulseChat — Real-Time Ephemeral Rooms",
      category: "Full Stack",
      badge: "Realtime",
      featured: true,
      tagline: "Low-latency collaborative chat rooms with room-based privacy and live presence.",
      description: "A fast, privacy-respecting real-time messaging application engineered with WebSockets. Features live active user counts, markdown rendering, and temporary auto-expiring rooms.",
      highlights: [
        "Sub-40ms message delivery using bi-directional WebSocket connections",
        "Zero database persistence mode for ephemeral privacy",
        "Rich markdown, code syntax highlighting, and custom emoji reactions"
      ],
      tech: ["Node.js", "WebSocket", "React", "Tailwind CSS"],
      githubUrl: "https://github.com/rj-shetty",
      liveUrl: "#",
      icon: "message-square",
      accent: "#4a8b5c"
    },
    {
      id: "dev-dock",
      title: "DevDock — Developer Productivity Hub",
      category: "Web App",
      badge: "Tool",
      featured: true,
      tagline: "Centralized dashboard for tracking repos, inspecting APIs, and managing snippets.",
      description: "A developer command center that combines GitHub activity feeds, quick HTTP request testing, customizable code snippet vaults, and technical bookmarks in one offline-first workspace.",
      highlights: [
        "Offline-first architecture with local cache synchronizer",
        "Instant cURL to Fetch code snippet converter",
        "Vim-style quick keyboard navigation palette"
      ],
      tech: ["React", "TypeScript", "REST APIs", "IndexedDB"],
      githubUrl: "https://github.com/rj-shetty",
      liveUrl: "#",
      icon: "layers",
      accent: "#5e7ce2"
    },
    {
      id: "chrono-task",
      title: "ChronoTask — Flow State Task Manager",
      category: "Productivity",
      badge: "Utility",
      featured: false,
      tagline: "Minimalist, keyboard-first task manager for deep work and Pomodoro intervals.",
      description: "Designed for developers who dislike clunky task managers. ChronoTask is completely controllable without touching a mouse, featuring custom tags, focus timers, and daily streak logs.",
      highlights: [
        "100% keyboard navigable with instant shortcut binds (j/k/x/n)",
        "Integrated custom audio ticks and completion chimes",
        "Zero-friction local persistence and instant JSON export/import"
      ],
      tech: ["JavaScript", "HTML5", "Modern CSS", "Web Audio"],
      githubUrl: "https://github.com/rj-shetty",
      liveUrl: "#",
      icon: "check-circle",
      accent: "#f4c042"
    },
    {
      id: "pixel-forge",
      title: "PixelForge — 8-Bit Sprite Studio",
      category: "Creative Web",
      badge: "Art Tool",
      featured: false,
      tagline: "In-browser canvas tool for drawing pixel art sprites and exporting animations.",
      description: "A fun pixel art canvas editor with palette switching (GameBoy, Pico-8, NES), onion skinning for multi-frame animations, and one-click animated GIF / spritesheet generation.",
      highlights: [
        "Custom canvas pixel grid engine with zoom and pan physics",
        "Color palette switcher with classic retro color palettes",
        "Frame-by-frame animation timeline with live preview loop"
      ],
      tech: ["HTML5 Canvas", "JavaScript", "Image Processing"],
      githubUrl: "https://github.com/rj-shetty",
      liveUrl: "#",
      icon: "grid",
      accent: "#8e7cc3"
    },
    {
      id: "algorise",
      title: "Algorise — Algorithm Step Visualizer",
      category: "Education",
      badge: "CS Core",
      featured: false,
      tagline: "Interactive visual walkthrough for sorting, graphs, and search algorithms.",
      description: "A learning tool that animates sorting algorithms (Quicksort, Mergesort, Heapsort) and graph traversals (Dijkstra, BFS, DFS) with playback step controls and complexity breakdowns.",
      highlights: [
        "Step-by-step backward and forward execution timeline",
        "Custom array generation with audio pitch mapping to element heights",
        "Clear time & space complexity visual callouts"
      ],
      tech: ["JavaScript", "SVG", "Web Audio API", "CSS Animations"],
      githubUrl: "https://github.com/rj-shetty",
      liveUrl: "#",
      icon: "git-commit",
      accent: "#e0533c"
    }
  ],

  // Interactive Mascot (Byte the Cat / Desktop Companion)
  mascot: {
    name: "Byte",
    title: "Desktop Companion",
    quotes: [
      "Hey! I'm Byte. Ranjan handcrafted this entire website with care!",
      "Did you know? You can drag any window around the screen!",
      "Try double-clicking a window's title bar to maximize it! 🖥️",
      "Check out the Retro Arcade window for a playable game! 🕹️",
      "Looking for a passionate builder? Ranjan is open for internships! ✉️",
      "Don't forget to take a stretch and drink some water today! 💧",
      "Try clicking the theme button to see Tokyo Cream or Cyber Midnight! 🎨",
      "Psst... you can open the Terminal and type 'matrix' or 'help'! 💻",
      "You can stick your own note on the desktop in the Sticky Notes app! 📝",
      "Turn on the Lo-Fi player for chill coding vibes while browsing! 🎵"
    ]
  },

  // Lo-Fi Radio Tracks (Synthesized in real-time by sound.js!)
  lofiTracks: [
    {
      id: "track-1",
      title: "Midnight Coffee",
      artist: "Byte & The Synths",
      mood: "Warm & Cozy",
      bpm: 78,
      scale: ["C4", "E4", "G4", "B4", "A4", "F4", "G4", "C5"]
    },
    {
      id: "track-2",
      title: "Neon Rain on Glass",
      artist: "Byte & The Synths",
      mood: "Melodic & Chill",
      bpm: 84,
      scale: ["D4", "F4", "A4", "C5", "Bb4", "G4", "A4", "D5"]
    },
    {
      id: "track-3",
      title: "Cozy Terminal",
      artist: "Byte & The Synths",
      mood: "Focus & Flow",
      bpm: 72,
      scale: ["A3", "C4", "E4", "G4", "F4", "D4", "E4", "A4"]
    },
    {
      id: "track-4",
      title: "Starlight Reverie",
      artist: "Byte & The Synths",
      mood: "Dreamy Nostalgia",
      bpm: 80,
      scale: ["F4", "A4", "C5", "E5", "D5", "Bb4", "C5", "F5"]
    }
  ],

  // Sticky Notes initial state
  defaultNotes: [
    {
      id: "note-1",
      text: "👋 Welcome to my desktop! Click on any icon or the mascot below to explore!",
      color: "yellow",
      x: 30,
      y: 120
    },
    {
      id: "note-2",
      text: "💡 Tip: Double-click window headers to maximize, or minimize to the bottom dock!",
      color: "blue",
      x: 30,
      y: 280
    }
  ]
};

// Export for module or global use
if (typeof module !== "undefined" && module.exports) {
  module.exports = PORTFOLIO_DATA;
}
