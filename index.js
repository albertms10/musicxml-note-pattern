/**
 * Callback function that gets the XML document response.
 *
 * @callback readXMLCallback
 * @param {Document} responseXML
 */

/**
 * @typedef Note
 * @type {Object}
 * @property {string} step
 * @property {number} [alter]
 * @property {number} [octave]
 */

/**
 * @typedef NoteOccurrence
 * @type {Object}
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
 * @returns {Object}
 */
const getUnique = (html, htmlOnly = false) => {
  if (html.length === 1) {
    if (htmlOnly) return html[0];

    const value = html[0].innerHTML;
    return isNumeric(value) ? parseInt(value) : value;
  }
};

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

    for (const measure of measures) {
      const notes = measure.getElementsByTagName("note");

      for (const note of notes) {
        if (note.getElementsByTagName("rest").length > 0) break;

        const pitch = getUnique(note.getElementsByTagName("pitch"), true);
        const step = getUnique(pitch.getElementsByTagName("step"));
        const octave = getUnique(pitch.getElementsByTagName("octave"));
        const alter = getUnique(pitch.getElementsByTagName("alter"));

        if (step === pattern[0].step && alter === pattern[0].alter) {
          occurrences.push({
            part: part.getAttribute("id"),
            measure: parseInt(measure.getAttribute("number")),
            note: { step, alter, octave },
          });
        }
      }
    }
  }

  return occurrences;
};

const ROOT_PATH = "assets/source-files/";

(() =>
  readXML(ROOT_PATH + "BeetAnGeSample.musicxml", (xml) => {
    /** @type {Note[]} */
    const pattern = [
      { step: "A" },
      { step: "B", alter: -1 },
      { step: "C" },
      { step: "B" },
    ];

    const notes = findNotes(xml, pattern);

    console.log(notes);
  }))();
