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
 * @property {number} [occurrenceNumber]
 * @property {number} [measureNoteNumber]
 * @property {number} part
 * @property {number} measure
 * @property {Note} note
 */

/**
 * @typedef {Note[]} Pattern
 */

/**
 * @typedef {Object} PatternOccurrence
 * @property {number} occurenceNumber
 * @property {NoteOccurrence[]} notes
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
 * Returns the unique element of a given `HTMLCollection`.
 * @param {HTMLCollectionOf<Element>} html
 * @returns {Element}
 */
const getUniqueElement = (html) => (html.length === 1 ? html[0] : undefined);

/**
 * Returns the unique string value of a given `HTMLCollection`.
 * @param {HTMLCollectionOf<Element>} html
 * @returns {string}
 */
const getUniqueString = (html) => {
  const uniqueHtml = getUniqueElement(html);
  return uniqueHtml ? getUniqueElement(html).innerHTML : undefined;
};

/**
 * Returns the unique integer value of a given `HTMLCollection`.
 * @param {HTMLCollectionOf<Element>} html
 * @returns {number}
 */
const getUniqueInteger = (html) => {
  const uniqueString = getUniqueString(html);
  return uniqueString ? parseInt(getUniqueString(html)) : undefined;
};

/**
 * Returns a `Note` object from a given `Element`.
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
 * Checks the equality of two given notes.
 * @param {Note} note1
 * @param {Note} note2
 * @returns {boolean}
 */
const noteIsEqual = (note1, note2) =>
  note1.step === note2.step && note1.alter === note2.alter;

/**
 * Returns the index of the given element from its `tagName` siblings.
 * @param {Element} element
 * @param {string} tagName
 */
const getNodeIndex = (element, tagName) =>
  Array.from(element.parentElement.getElementsByTagName(tagName)).indexOf(
    element
  );

/**
 * Returns `true` if the given note element is not a rest.
 * @param {Element} noteElement
 */
const isNotRest = (noteElement) =>
  noteElement.getElementsByTagName("rest").length === 0;

/**
 * Returns an array of matching `PatternOccurrence` for a given pattern.
 * @param {Document} xml
 * @param {Pattern} pattern
 * @returns {{
 * exactPatternOccurrences: PatternOccurrence[],
 * approximatePatternOccurrences: PatternOccurrence[]
 * }}
 */
const findPattern = (xml, pattern) => {
  /** @type {PatternOccurrence[]} */
  let exactPatternOccurrences = [];
  let exactPatternOccurrenceCount = 0;

  /** @type {PatternOccurrence[]} */
  let approximatePatternOccurrences = [];
  let approximatePatternOccurrenceCount = 0;

  const parts = xml.getElementsByTagName("part");

  for (const part of parts) {
    const notes = part.getElementsByTagName("note");

    [...notes].filter(isNotRest).forEach((_, noteIndex) => {
      const patternOccurrence = pattern.reduce((
        /** @type {NoteOccurrence[]} */ accumulator,
        patternNote,
        patternIndex
      ) => {
        const noteRef = notes[noteIndex + patternIndex];
        if (typeof noteRef === "undefined") return accumulator;
        if (!isNotRest(noteRef)) return accumulator;

        const note = getNote(noteRef);
        const partString = part.getAttribute("id");

        // TODO `break` when a note does not match with the pattern
        return noteIsEqual(note, patternNote)
          ? accumulator.concat({
              part: parseInt(partString.substring(1, partString.length)),
              measure: parseInt(noteRef.parentElement.getAttribute("number")),
              measureNoteNumber: getNodeIndex(noteRef, "note") + 1,
              note,
            })
          : accumulator;
      }, []);

      if (patternOccurrence.length === pattern.length) {
        exactPatternOccurrences.push({
          occurenceNumber: ++exactPatternOccurrenceCount,
          notes: patternOccurrence,
        });
      } else if (patternOccurrence.length > 2) {
        approximatePatternOccurrences.push({
          occurenceNumber: ++approximatePatternOccurrenceCount,
          notes: patternOccurrence,
        });
      }
    });
  }

  return { exactPatternOccurrences, approximatePatternOccurrences };
};

/** List of Material Design colors’ HEX codes */
const colors = [
  "#F44336",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
  "#03A9F4",
  "#00BCD4",
  "#009688",
  "#4CAF50",
  "#8BC34A",
  "#CDDC39",
  "#FFEB3B",
  "#FFC107",
  "#FF9800",
  "#FF5722",
];

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
    osmd.zoom = 0.75;
    osmd.render();
  });
  return osmd;
};

/**
 * Colors a note in the given `OpenSheetMusicDisplay` object instance.
 * @param {Object} osmd OpenSheetMusicDisplay object instance
 * @param {Object} options
 * @param {number} [options.part = 0]
 * @param {number} [options.measure = 0]
 * @param {number} [options.noteNumber = 0]
 * @param {string} [options.color = "#777"]
 */
const colorOsmdNote = (
  osmd,
  { part = 0, measure = 0, noteNumber = 0, color = "#777" }
) => {
  osmd.graphic.measureList[measure][part].staffEntries[
    noteNumber
  ].graphicalVoiceEntries[0].notes[0].sourceNote.noteheadColor = color;
};

/**
 * Colors a list of pattern occurrences in the given
 * `OpenSheetMusicDisplay` object instance.
 * @param {Object} osmd OpenSheetMusicDisplay object instance
 * @param {PatternOccurrence[]} patternOccurrences
 * @param {string[]} [colorsList = ["#777"]]
 */
const colorOsmdPatternOccurrences = (
  osmd,
  patternOccurrences,
  colorsList = ["#777"]
) => {
  patternOccurrences.forEach((patternOccurrence) => {
    patternOccurrence.notes.forEach((noteOccurrence) => {
      colorOsmdNote(osmd, {
        part: noteOccurrence.part - 1,
        measure: noteOccurrence.measure - 1,
        noteNumber: noteOccurrence.measureNoteNumber - 1,
        color:
          colorsList[
            (patternOccurrence.occurenceNumber - 1) % colorsList.length
          ],
      });
    });
  });
};

// TODO Check file format
/**
 *
 * @param {readXMLCallback} processFile
 */
const initFileSelection = (processFile) => {
  /**
   * Handles a `drag` file event.
   * @param {DragEvent} e
   * @param {readXMLCallback} callback
   */
  const handleDraggedFileSelect = (e, callback) => {
    e.stopPropagation();
    e.preventDefault();

    const files = e.dataTransfer.files; // FileList object.

    if (!files.length) {
      alert("Please select a file!");
      return;
    }

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = (e) => {
      if (e.target.readyState == FileReader.DONE) {
        const parser = new DOMParser();
        const document = parser.parseFromString(
          e.target.result.toString(),
          "text/xml"
        );
        callback(document);
      }
    };

    const blob = file.slice(0, file.size - 1);
    reader.readAsBinaryString(blob);
  };

  /**
   * Handles the `dragover` event.
   * @param {DragEvent} e
   */
  const handleDragOver = (e) => {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const dropZone = document.getElementById("drop_zone");
  dropZone.addEventListener("dragover", handleDragOver, false);
  dropZone.addEventListener(
    "drop",
    (e) => handleDraggedFileSelect(e, processFile),
    false
  );
};

/**
 * Processes the given XML document.
 * @param {Document} xml
 */
const processXML = (xml) => {
  const osmd = renderMusicXML(
    xml,
    document.getElementById("sheet-music-container")
  );

  /** @type {Pattern} */
  const pattern = [
    { step: "B", alter: -1 },
    { step: "A" },
    { step: "C" },
    { step: "B" },
  ];

  const patternOccurrences = findPattern(xml, pattern);

  colorOsmdPatternOccurrences(
    osmd,
    patternOccurrences.exactPatternOccurrences,
    colors
  );

  colorOsmdPatternOccurrences(
    osmd,
    patternOccurrences.approximatePatternOccurrences,
    colors.map((color) => color + "55")
  );

  console.log(patternOccurrences);
};

(() => {
  if (window.File && window.FileReader && window.Blob)
    initFileSelection(processXML);
  else alert("The File APIs are not fully supported in this browser.");
})();
