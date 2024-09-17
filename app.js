const { div, h1, p, textarea, button, ul, li, h3 } = van.tags;

const contentDiv = div(
  { class: "content" },
  h1("Just enter some notes"),
  p("They are stored on your device, no information is sent anywhere"),
  textarea({
    class: "main-entry",
    type: "text",
    id: "note",
    placeholder: "Enter a note",
    autofocus: true,
  }),
  button({ onclick: saveNote, class: "save-button" }, "Save"),
  ul({ id: "notes" })
);

van.add(document.body, contentDiv);

async function renderNotes() {
  const notes = await getNotesFromDexie();
  const notesEl = document.getElementById("notes");

  notesEl.innerHTML = "";

  [...notes].reverse().forEach((note) => {
    const currentLocale = navigator.language;
    let dateStr = new Date(note.timestamp).toLocaleString(currentLocale, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });

    const noteItem = li(
      div(
        { class: "header" },
        h3(dateStr),
        div(
          { class: "buttonContainer" },
          button(
            { class: "edit-button", onclick: () => editNote(note, noteItem) },
            "✏️"
          ),
          button(
            { class: "delete-button", onclick: () => deleteNote(note) },
            "❌"
          )
        )
      ),
      p({ class: "note-body" }, note.note)
    );

    van.add(notesEl, noteItem);
  });
}

function editNote(note, noteItem) {
  const pElement = noteItem.querySelector("p");
  const textareaElement = textarea(
    { class: "card-edit" },
    pElement.textContent
  );
  noteItem.replaceChild(textareaElement, pElement);

  const editButtonContainer = div(
    { class: "card-edit-button-container" },
    button(
      { class: "card-edit-button", onclick: () => renderNotes() },
      "Cancel"
    ),
    button(
      {
        class: "card-edit-button",
        onclick: () => saveEditedNote(note, textareaElement.value),
      },
      "Save"
    )
  );

  van.add(noteItem, editButtonContainer);
}

function saveNote() {
  const inputEl = document.getElementById("note");
  const note = inputEl.value;
  inputEl.value = "";

  saveNoteToDexie(note);

  renderNotes();
}

// Step 1: Initialize Dexie Database
const db = new Dexie("NotesDatabase");
db.version(1).stores({
  notes: "++id,timestamp,note", // Define schema
});

// Helper function to save a note to the database
async function saveNoteToDexie(note, timestamp = Date.now()) {
  try {
    await db.notes.add({ note, timestamp });
  } catch (err) {
    console.error("Failed to save note:", err);
  }
}

// Retrieve all notes from the database
async function getNotesFromDexie() {
  try {
    return await db.notes.toArray();
  } catch (err) {
    console.error("Failed to retrieve notes:", err);
    return [];
  }
}

// Update an existing note in the database
async function saveEditedNote(note, newText) {
  try {
    await db.notes.update(note.id, { note: newText });
    renderNotes();
  } catch (err) {
    console.error("Failed to update note:", err);
  }
}

// Delete a note from the database
async function deleteNote(note) {
  if (!confirm("Are you sure you want to delete this note?")) {
    return;
  }

  try {
    await db.notes.delete(note.id);
    renderNotes();
  } catch (err) {
    console.error("Failed to delete note:", err);
  }
}

function migrateFromLocalStorageToDexie() {
  const notes = JSON.parse(localStorage.getItem("notes")) || [];
  notes.forEach((note) => saveNoteToDexie(note.note, note.timestamp));

  // delete notes from local storage
  localStorage.removeItem("notes");
}

migrateFromLocalStorageToDexie();

renderNotes();
