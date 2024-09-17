const { div, h1, p, textarea, button, ul, li, h3, input } = van.tags;

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

  [...notes].reverse().forEach((noteObj) => {
    const currentLocale = navigator.language;
    let dateStr = new Date(noteObj.timestamp).toLocaleString(currentLocale, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });

    const noteEl = li(
      { id: "note-" + noteObj.id },
      div(
        { class: "header" },
        h3(dateStr),
        div(
          { class: "buttonContainer" },
          button(
            {
              class: "edit-button",
              id: "edit-button-" + noteObj.id,
              onclick: () => editNote(noteObj),
            },
            "✏️"
          ),
          button(
            {
              class: "delete-button",
              id: "delete-button-" + noteObj.id,
              onclick: () => deleteNote(noteObj),
            },
            "❌"
          )
        )
      ),
      p({ class: "note-body" }, noteObj.note)
    );

    van.add(notesEl, noteEl);
  });
}

function formatLocalDate(date) {
  const pad = (num) => num.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are zero-based
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function editNote(noteObj) {
  const noteEl = document.getElementById("note-" + noteObj.id);
  const pElement = noteEl.querySelector("p");
  const textareaElement = textarea(
    { class: "card-edit" },
    pElement.textContent
  );
  noteEl.replaceChild(textareaElement, pElement);

  const dateInputElement = input(
    {
      type: "datetime-local",
      value: formatLocalDate(new Date(noteObj.timestamp)),
    },
    pElement.textContent
  );
  noteEl.querySelector("h3").replaceWith(dateInputElement);

  const onSave = async () => {
    saveEditedNote(
      noteObj,
      textareaElement.value,
      // new Date(dateInputElement.value).getTime()
      new Date(dateInputElement.value).getTime()
    );

    renderNotes();
  };

  const onCancel = () => {
    renderNotes();
  };

  // update the "edit-button-" + noteObj.id,
  // to save the changes
  const editButtonContainer = noteEl.querySelector(".buttonContainer");
  editButtonContainer.innerHTML = "";
  van.add(
    editButtonContainer,
    button(
      {
        class: "edit-button",
        id: "edit-button-" + noteObj.id,
        onclick: onSave,
      },
      "✅"
    ),
    button(
      {
        class: "delete-button",
        id: "delete-button-" + noteObj.id,
        onclick: onCancel,
      },
      "❌"
    )
  );
}

function saveNote() {
  const inputEl = document.getElementById("note");
  const noteText = inputEl.value;
  inputEl.value = "";

  saveNoteToDexie(noteText);

  renderNotes();
}

// Step 1: Initialize Dexie Database
const db = new Dexie("NotesDatabase");
db.version(1).stores({
  notes: "++id,timestamp,note", // Define schema
});

// Helper function to save a note to the database
async function saveNoteToDexie(noteText, timestamp = Date.now()) {
  try {
    await db.notes.add({ note: noteText, timestamp });
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
async function saveEditedNote(noteObj, newText, timestamp) {
  try {
    await db.notes.update(noteObj.id, {
      note: newText,
      timestamp: timestamp,
    });
  } catch (err) {
    console.error("Failed to update note:", err);
  }
}

// Delete a note from the database
async function deleteNote(noteObj) {
  if (!confirm("Are you sure you want to delete this note?")) {
    return;
  }

  try {
    await db.notes.delete(noteObj.id);
    renderNotes();
  } catch (err) {
    console.error("Failed to delete note:", err);
  }
}

function migrateFromLocalStorageToDexie() {
  const notes = JSON.parse(localStorage.getItem("notes")) || [];
  notes.forEach((noteObj) => saveNoteToDexie(noteObj.note, noteObj.timestamp));

  // delete notes from local storage
  localStorage.removeItem("notes");
}

migrateFromLocalStorageToDexie();

renderNotes();
