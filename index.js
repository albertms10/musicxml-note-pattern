/**
 * Callback function that gets the XML document response.
 * @callback readXMLCallback
 * @param {Document} responseXML
 */

/**
 * Callback function that gets two parameters for evaluating equality.
 * @callback compareCallback
 * @param {*} value1
 * @param {*} value2
 */

/**
 * @typedef {Object} Note
 * @property {string} step
 * @property {number} [alter]
 * @property {number} [octave]
 * @property {number} [staff=1]
 * @property {number} [voice=1]
 * @property {number} [staffVoice=1]
 */

/**
 * @typedef {Object} NoteOccurrence
 * @property {number} [occurrenceNumber]
 * @property {number} [measureNoteNumber]
 * @property {number} staff
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
 * Returns the unique element of a given `HTMLCollection`.
 * @param {HTMLCollectionOf.<Element>} html
 * @returns {Element}
 */
const getUniqueElement = (html) => (html.length === 1 ? html[0] : undefined);

/**
 * Returns the unique string value of a given `HTMLCollection`.
 * @param {HTMLCollectionOf.<Element>} html
 * @returns {string}
 */
const getUniqueString = (html) => {
  const uniqueHtml = getUniqueElement(html);
  return uniqueHtml ? getUniqueElement(html).innerHTML : undefined;
};

/**
 * Returns the unique integer value of a given `HTMLCollection`.
 * @param {HTMLCollectionOf.<Element>} html
 * @returns {number}
 */
const getUniqueInteger = (html) => {
  const uniqueString = getUniqueString(html);
  return uniqueString ? parseInt(getUniqueString(html)) : undefined;
};

// FIXME: Refactor global-scoped into a local-scoped variable
let staffVoicesNumbers = [];

// TODO: Return only defined Note properties?
/**
 * Returns a `Note` object from a given `Element`.
 * @param {Element} noteElement
 * @returns {Note}
 */
const getNote = (noteElement) => {
  /** @type {Element} */
  const pitch = getUniqueElement(noteElement.getElementsByTagName("pitch"));

  const staff = getUniqueInteger(noteElement.getElementsByTagName("staff"));
  const voice = getUniqueInteger(noteElement.getElementsByTagName("voice"));

  const staffVoiceNumbers = staffVoicesNumbers[staff - 1];
  if (staffVoiceNumbers) {
    if (staffVoiceNumbers.length > 0 && staffVoiceNumbers.indexOf(voice) === -1)
      staffVoiceNumbers.push(voice);
  } else {
    staffVoicesNumbers[staff - 1] = [voice];
  }

  staffVoicesNumbers.forEach((voices) => voices.sort((a, b) => a - b));

  return {
    step: getUniqueString(pitch.getElementsByTagName("step")),
    octave: getUniqueInteger(pitch.getElementsByTagName("octave")),
    alter: getUniqueInteger(pitch.getElementsByTagName("alter")),
    staff: staff ? staff : 1,
    voice: voice ? voice : 1,
    staffVoice: staffVoicesNumbers[staff - 1].indexOf(voice) + 1,
  };
};

/**
 * Checks the equality of two given notes.
 * @param {Note} note1
 * @param {Note} note2
 * @returns {boolean}
 */
const noteIsEqual = (note1, note2) =>
  note1 && note2 && note1.step === note2.step && note1.alter === note2.alter;

/**
 * Checks the staff and voice equality of two given notes.
 * @param {Note} note1
 * @param {Note} note2
 */
const staffVoiceIsEqual = (note1, note2) =>
  note1 && note2 && note1.staff === note2.staff && note1.voice === note2.voice;

/**
 * Returns the index of the given element from its `tagName` siblings.
 * @param {Element} element
 * @param {string} tagName
 * @param {string} filterTagName
 * @param {*} filterValue
 */
const getElementIndex = (element, tagName, filterTagName, filterValue) => {
  return Array.from(element.parentElement.getElementsByTagName(tagName))
    .filter((sibling) => {
      const siblingTagElements = sibling.getElementsByTagName(filterTagName);

      return siblingTagElements.length > 0
        ? siblingTagElements[0].innerHTML == filterValue.toString()
        : false;
    })
    .indexOf(element);
};

/**
 * Returns `true` if the given note element is not a rest.
 * @param {Element} noteElement
 */
const isNotRest = (noteElement) =>
  noteElement.getElementsByTagName("rest").length === 0;

/**
 * Returns the count of elements that are included in an array given a target array.
 * @param {Array} array
 * @param {Array} target
 * @param {compareCallback} compareCallback
 */
const arrayIncludesCount = (array, target, compareCallback) => {
  let count = 0;
  target.every((v) => {
    if (array.some((s) => compareCallback(v, s))) {
      count++;
      return true;
    }
    return false;
  });
  return count;
};

// TODO: Check MusicXML structure
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

  let staffCount = 0;

  const parts = xml.getElementsByTagName("part");

  [...parts].forEach((partElement) => {
    staffCount++;
    const partStaffCount =
      getUniqueInteger(partElement.getElementsByTagName("staves")) || 1;

    const notes = partElement.getElementsByTagName("note");

    /**
     * Stores note elements arranged in staves and staff voices.
     * @type {Element[][][]}
     */
    const staveNotes = [];

    if (partStaffCount > 1)
      [...notes].filter(isNotRest).forEach((noteElement) => {
        const staff = getUniqueInteger(
          noteElement.getElementsByTagName("staff")
        );
        const voice = getUniqueInteger(
          noteElement.getElementsByTagName("voice")
        );

        const staffNotes = staveNotes[staff - 1];

        if (staffNotes) {
          if (staffNotes[voice - 1]) {
            staffNotes[voice - 1].push(noteElement);
          }
        } else {
          staveNotes[staff - 1] = [];
          staveNotes[staff - 1][voice - 1] = [noteElement];
        }
      });
    else {
      staveNotes[0] = [];
      staveNotes[0][0] = [...notes];
    }

    staveNotes.forEach((staffVoices) => {
      staffVoices.forEach((staffVoiceNotes) => {
        [...staffVoiceNotes].filter(isNotRest).forEach((_, noteIndex) => {
          let patternOccurrence = [];
          for (
            let patternIndex = 0;
            patternIndex < pattern.length;
            patternIndex++
          ) {
            const patternNote = pattern[patternIndex];
            const noteRef = staffVoiceNotes[noteIndex + patternIndex];
            if (typeof noteRef === "undefined" || !isNotRest(noteRef)) continue;

            const note = getNote(noteRef);
            const prevAccumulator =
              patternOccurrence[patternOccurrence.length - 1];
            const prevNote = prevAccumulator ? prevAccumulator.note : undefined;

            if (
              (noteIsEqual(note, patternNote) &&
                staffVoiceIsEqual(note, prevNote || note)) ||
              noteIsEqual(note, prevNote)
            )
              patternOccurrence.push({
                staff: staffCount + note.staff - 1,
                measure: parseInt(noteRef.parentElement.getAttribute("number")),
                measureNoteNumber:
                  getElementIndex(noteRef, "note", "voice", note.voice) + 1,
                note,
              });
          }

          const matchingCount = arrayIncludesCount(
            patternOccurrence.map((occ) => occ.note),
            pattern,
            noteIsEqual
          );

          const result = {
            notes: patternOccurrence,
            matchingCount,
          };

          if (pattern.length - matchingCount === 0) {
            exactPatternOccurrences.push({
              ...result,
              occurenceNumber: ++exactPatternOccurrenceCount,
            });
          } else if (matchingCount / pattern.length > 0.6) {
            approximatePatternOccurrences.push({
              ...result,
              occurenceNumber: ++approximatePatternOccurrenceCount,
            });
          }
        });
      });
    });
  });

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
 * @param {Object} osmd `OpenSheetMusicDisplay` object instance
 * @param {Object} options
 * @param {number} [options.measure=1]
 * @param {number} [options.staff=1]
 * @param {number} [options.noteNumber=1]
 * @param {number} [options.staffVoice=1]
 * @param {string} [options.color="#777"]
 */
const colorOsmdNote = (
  osmd,
  { measure = 1, staff = 1, noteNumber = 1, staffVoice = 1, color = "#777" }
) => {
  // TODO: Refactor - Graphical voice index does not correspond to real voice.
  //  e.g.: [o].length < [o, o].length
  const graphicalVoiceEntriesRef =
    osmd.graphic.measureList[measure - 1][staff - 1].staffEntries[
      noteNumber - 1
    ].graphicalVoiceEntries;

  let staffVoiceNum = staffVoice - 1;
  try {
    while (!graphicalVoiceEntriesRef[staffVoiceNum]) {
      if (staffVoiceNum <= 0) break;
      staffVoiceNum--;
    }

    graphicalVoiceEntriesRef[
      staffVoiceNum
    ].notes[0].sourceNote.noteheadColor = color;
  } catch (e) {
    console.error(e);
  }
};

/**
 * Colors a list of pattern occurrences in the given
 * `OpenSheetMusicDisplay` object instance.
 * @param {Object} osmd `OpenSheetMusicDisplay` object instance
 * @param {PatternOccurrence[]} patternOccurrences
 * @param {string[]} [colorsList=["#777"]]
 */
const colorOsmdPatternOccurrences = (
  osmd,
  patternOccurrences,
  colorsList = ["#777"]
) => {
  patternOccurrences.forEach((patternOccurrence) => {
    patternOccurrence.notes.forEach((noteOccurrence) => {
      colorOsmdNote(osmd, {
        measure: noteOccurrence.measure,
        staff: noteOccurrence.staff,
        noteNumber: noteOccurrence.measureNoteNumber,
        staffVoice: noteOccurrence.note.staffVoice,
        color:
          colorsList[
            (patternOccurrence.occurenceNumber - 1) % colorsList.length
          ],
      });
    });
  });
};

// TODO: Check file format
/**
 * Initializes file selection handlers and event listeners.
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

    const files = e.dataTransfer.files;

    if (!files.length) {
      alert("Please, select a file.");
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

  const {
    exactPatternOccurrences,
    approximatePatternOccurrences,
  } = findPattern(xml, pattern);

  colorOsmdPatternOccurrences(osmd, exactPatternOccurrences, colors);

  colorOsmdPatternOccurrences(
    osmd,
    approximatePatternOccurrences,
    colors.map((color) => color + "55")
  );

  console.log({ exactPatternOccurrences, approximatePatternOccurrences });
};

if (window.File && window.FileReader && window.Blob)
  initFileSelection(processXML);
else alert("The File APIs are not fully supported in this browser.");
