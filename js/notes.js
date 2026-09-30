// =============================================================================
// STICKY NOTES — Desktop Corkboard & Note Pad
// =============================================================================
// Allows visitors to stick notes, write messages, customize colors, and persist
// them locally in localStorage.
// =============================================================================

class StickyNotesManager {
  constructor() {
    this.notes = [];
    this.boardEl = null;
  }

  init() {
    this.boardEl = document.getElementById("notes-grid");
    const addBtn = document.getElementById("add-note-btn");

    this.loadNotes();

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        soundEngine.playClick();
        this.addNote();
      });
    }
  }

  loadNotes() {
    const saved = localStorage.getItem("portfolio_sticky_notes");
    if (saved) {
      try {
        this.notes = JSON.parse(saved);
      } catch (e) {
        this.notes = [...PORTFOLIO_DATA.defaultNotes];
      }
    } else {
      this.notes = [...PORTFOLIO_DATA.defaultNotes];
    }
    this.render();
  }

  saveNotes() {
    localStorage.setItem("portfolio_sticky_notes", JSON.stringify(this.notes));
  }

  addNote(text = "New note! Click here to write...", color = "yellow") {
    const id = "note-" + Date.now();
    const newNote = {
      id,
      text,
      color,
      createdAt: new Date().toLocaleDateString()
    };
    this.notes.unshift(newNote);
    this.saveNotes();
    this.render();
  }

  deleteNote(id) {
    soundEngine.playClick();
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveNotes();
    this.render();
  }

  updateNoteText(id, newText) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.text = newText;
      this.saveNotes();
    }
  }

  cycleNoteColor(id) {
    soundEngine.playClick();
    const colors = ["yellow", "blue", "pink", "green"];
    const note = this.notes.find(n => n.id === id);
    if (note) {
      const curIdx = colors.indexOf(note.color);
      note.color = colors[(curIdx + 1) % colors.length];
      this.saveNotes();
      this.render();
    }
  }

  render() {
    if (!this.boardEl) return;
    this.boardEl.innerHTML = "";

    this.notes.forEach((note) => {
      const card = document.createElement("div");
      card.className = `sticky-note sticky-${note.color}`;
      card.dataset.id = note.id;

      card.innerHTML = `
        <div class="sticky-header">
          <button class="sticky-color-btn" title="Change Color">🎨</button>
          <span class="sticky-pin">📌</span>
          <button class="sticky-delete-btn" title="Delete Note">✕</button>
        </div>
        <textarea class="sticky-textarea" placeholder="Write your thought...">${this.escapeHtml(note.text)}</textarea>
      `;

      // Event listeners
      const textarea = card.querySelector(".sticky-textarea");
      textarea.addEventListener("input", (e) => {
        this.updateNoteText(note.id, e.target.value);
      });

      const colorBtn = card.querySelector(".sticky-color-btn");
      colorBtn.addEventListener("click", () => {
        this.cycleNoteColor(note.id);
      });

      const delBtn = card.querySelector(".sticky-delete-btn");
      delBtn.addEventListener("click", () => {
        this.deleteNote(note.id);
      });

      this.boardEl.appendChild(card);
    });
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

const stickyNotes = new StickyNotesManager();
