/**
 * Callback function that gets the XML document response.
 * @callback readXMLCallback
 * @param {Document} responseXML
 */

/**
 * @typedef {Object} Note
 * @property {string} step
 * @property {number} [alter]
 * @property {number} [octave]
 */

/**
 * @typedef {Object} NoteOccurrence
 * @property {string} part
 * @property {number} measure
 * @property {Note} note
 */

/**
 * @typedef {NoteOccurrence[]} PatternOccurrence
 */

/**
 * Reads an XML file and calls the callback function afterwards.
 * @param {string} filename
 * @param {readXMLCallback} callback
 */
const readXML = (filename, callback) => {
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) callback(this.responseXML);
  };
  xhttp.open("GET", filename, true);
  xhttp.send();
};

/**
 * Returns the unique element of a given HTMLCollection.
 * @param {HTMLCollectionOf<Element>} html
 * @returns {Element}
 */
const getUniqueElement = (html) => (html.length === 1 ? html[0] : undefined);

/**
 * Returns the unique string value of a given HTMLCollection.
 * @param {HTMLCollectionOf<Element>} html
 * @returns {string}
 */
const getUniqueString = (html) => {
  const uniqueHtml = getUniqueElement(html);
  return uniqueHtml ? getUniqueElement(html).innerHTML : undefined;
};

/**
 * Returns the unique integer value of a given HTMLCollection.
 * @param {HTMLCollectionOf<Element>} html
 * @returns {number}
 */
const getUniqueInteger = (html) => {
  const uniqueString = getUniqueString(html);
  return uniqueString ? parseInt(getUniqueString(html)) : undefined;
};

/**
 * Returns a Note object from a given Element
 * @param {Element} noteElement
 * @returns {Note}
 */
const getNote = (noteElement) => {
  /** @type {Element} */
  const pitch = getUniqueElement(noteElement.getElementsByTagName("pitch"));

  return {
    step: getUniqueString(pitch.getElementsByTagName("step")),
    octave: getUniqueInteger(pitch.getElementsByTagName("octave")),
    alter: getUniqueInteger(pitch.getElementsByTagName("alter")),
  };
};

/**
 * Checks if a note is equal to a given note
 * @param {Note} note1
 * @param {Note} note2
 * @returns {boolean}
 */
const noteIsEqual = (note1, note2) =>
  note1.step === note2.step && note1.alter === note2.alter;

/**
 * Returns an array of matching notes for a given pattern.
 * @param {Document} xml
 * @param {Note[]} pattern
 * @returns {PatternOccurrence[]}
 */
const findNotes = (xml, pattern) => {
  /** @type {PatternOccurrence[]} */
  let occurrences = [];

  const parts = xml.getElementsByTagName("part");

  for (const part of parts) {
    const notes = part.getElementsByTagName("note");

    [...notes]
      .filter(
        (noteElement) => noteElement.getElementsByTagName("rest").length === 0
      )
      .forEach((noteElement, noteIndex) => {
        const patternOccurrence = pattern.reduce((
          /** @type {PatternOccurrence} */ accumulator,
          patternNote,
          patternIndex
        ) => {
          const noteRef = notes[noteIndex + patternIndex];
          if (typeof noteRef === "undefined") return accumulator;

          const note = getNote(noteRef);

          return noteIsEqual(note, patternNote)
            ? accumulator.concat({
                part: part.getAttribute("id"),
                measure: parseInt(
                  noteElement.parentElement.getAttribute("number")
                ),
                note,
              })
            : accumulator;
        }, []);

        if (patternOccurrence.length === pattern.length)
          occurrences.push(patternOccurrence);
      });
  }

  return occurrences;
};

/**
 * Renders the given XML document into the DOM.
 * @param {Document} xml
 * @param {HTMLElement} element
 * @returns {Object}
 */
const renderMusicXML = (xml, element) => {
  // @ts-ignore
  const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(element);

  osmd.load(xml).then(() => {
    // osmd.graphic.measureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor =
    "#FF0000";
    osmd.zoom = 0.75;
    osmd.render();
  });
  return osmd;
};

const ROOT_PATH = "assets/source-files/";
const filenames = ["BeetAnGeSample.musicxml", "bach.musicxml"];

(() =>
  readXML(ROOT_PATH + filenames[1], (xml) => {
    renderMusicXML(xml, document.getElementById("sheet-music-container"));

    /** @type {Note[]} */
    const pattern = [
      { step: "B", alter: -1 },
      { step: "A" },
      { step: "C" },
      { step: "B" },
    ];

    const notes = findNotes(xml, pattern);

    console.log(notes);
  }))();
