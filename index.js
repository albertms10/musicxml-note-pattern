/**
 * Callback function that gets the XML document response.
 *
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
 * Reads an XML file and calls the callback function afterwards.
 *
 * @param {string} filename
 * @param {readXMLCallback} callback
 */
const readXML = (filename, callback) => {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) callback(this.responseXML);
  };
  xhttp.open("GET", filename, true);
  xhttp.send();
};

/**
 * Checks if the given parameter has a numeric value.
 *
 * @param {*} n
 * @returns {boolean}
 */
const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

/**
 * Returns the unique value of a given HTMLCollection.
 *
 * @param {Document} html
 * @param {boolean} [htmlOnly=false]
 * @returns {string | number | Element}
 */
const getUnique = (html, htmlOnly = false) => {
  if (html.length === 1) {
    if (htmlOnly) return html[0];

    const value = html[0].innerHTML;
    return isNumeric(value) ? parseInt(value) : value;
  }
};

/**
 * Returns a Note object from a given Element
 *
 * @param {Element} noteElement
 * @returns {Note}
 */
const getNote = (noteElement) => {
  /** @type {Element} */
  const pitch = getUnique(noteElement.getElementsByTagName("pitch"), true);

  return {
    step: getUnique(pitch.getElementsByTagName("step")),
    octave: getUnique(pitch.getElementsByTagName("octave")),
    alter: getUnique(pitch.getElementsByTagName("alter")),
  };
};

/**
 * Checks if a note is equal to a given note
 *
 * @param {Note} note1
 * @param {Note} note2
 * @returns {boolean}
 */
const noteIsEqual = (note1, note2) =>
  note1.step === note2.step && note1.alter === note2.alter;

/**
 * Returns an array of matching notes for a given pattern.
 *
 * @param {Document} xml
 * @param {Note[]} pattern
 * @returns {NoteOccurrence[]}
 */
const findNotes = (xml, pattern) => {
  /** @type {NoteOccurrence[]} */
  let occurrences = [];

  const parts = xml.getElementsByTagName("part");

  for (const part of parts) {
    const measures = part.getElementsByTagName("measure");

    // for (const measure of measures) {
    const notes = part.getElementsByTagName("note");

    [...notes]
      .filter(
        (noteElement) => noteElement.getElementsByTagName("rest").length === 0
      )
      .forEach((noteElement, noteIndex) => {
        const occurrence = pattern.reduce(
          (accumulator, patternNote, patternIndex) => {
            const noteRef = notes[noteIndex + patternIndex];
            if (typeof noteRef === "undefined") return accumulator;

            const note = getNote(noteRef);

            return noteIsEqual(note, patternNote)
              ? accumulator.concat({
                  part: part.getAttribute("id"),
                  // measure: parseInt(measure.getAttribute("number")),
                  note,
                })
              : accumulator;
          },
          []
        );

        if (occurrence.length === pattern.length) occurrences.push(occurrence);
      });
    // }
  }

  return occurrences;
};

/**
 * Renders the given XML document into the DOM.
 * @param {Document} xml
 * @param {HTMLElement} element
 */
const renderMusicXML = (xml, element) => {
  const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(element);
  osmd.zoom = 0.75;
  osmd.load(xml).then(() => {
    osmd.render();
  });
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
