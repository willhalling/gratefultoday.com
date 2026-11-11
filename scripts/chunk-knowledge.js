/**
 * Splits the texts in knowledge/ into small, citable chunks for AI search.
 *
 * Output: knowledge/chunks.jsonl, one JSON object per line:
 *   { id, author, work, translator, location, speaker, words, text, file, source }
 *
 * How it splits:
 *   1. Each text is divided into paragraphs (blank-line separated).
 *   2. Headings (BOOK / CHAPTER / LECTURE, bare numerals, ALL-CAPS titles) and
 *      inline numbered sections ("12. Fools of little understanding...") set
 *      the chunk's `location` used for citations.
 *   3. Paragraphs within a section are packed into chunks of ~150–350 words,
 *      never splitting a paragraph unless it is itself very long (then split
 *      on sentence boundaries). Short numbered aphorisms are kept whole and
 *      neighbouring ones grouped up to ~200 words.
 *   4. Front matter, tables of contents, indexes and footnotes are dropped.
 *      Translators' prefaces / introductions are kept but marked
 *      speaker: "commentary" so they are never attributed to the author.
 *
 * Run with: node scripts/chunk-knowledge.js            (writes chunks.jsonl)
 *           node scripts/chunk-knowledge.js --report   (prints sections per work)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'knowledge');
const OUT = path.join(ROOT, 'chunks.jsonl');

const MIN_WORDS = 150;
const MAX_WORDS = 350;
const APHORISM_GROUP_WORDS = 200;

/**
 * Per-work overrides, keyed by file path relative to knowledge/.
 *   start / end:    regexes for the first line of real text and the first line
 *                   after it (e.g. an index). Lines outside are dropped.
 *   work:           display title used in citations.
 *   numeralLabel:   prefix for bare-numeral headings, e.g. "Book" -> "Book IV".
 *   inlineLabel:    prefix for inline numbered sections (default "§").
 *   inlineSections: false to treat "12. text" paragraphs as normal text.
 *   authorPrefaces: true if prefaces/introductions are by the author.
 *   commentary:     regexes for headings whose sections are not by the author.
 *   skip:           regexes for headings whose sections are dropped entirely.
 */
const WORKS = {
  // ---- Schopenhauer -------------------------------------------------------
  'schopenhauer/the-wisdom-of-life.txt': {
    start: /^INTRODUCTION\.$/,
    authorPrefaces: true,
    dropHeadings: [/^THE WISDOM OF LIFE\.?$/],
  },
  'schopenhauer/counsels-and-maxims.txt': {
    start: /^INTRODUCTION\.$/,
    authorPrefaces: true,
    // "GENERAL RULES.--SECTION 1." -> heading + "SECTION 1." prefix on next paragraph
    preprocess: (t) => t.replace(/\.--SECTION (\d+)\.\n\n/g, '.\n\nSECTION $1. ').replace(/^SECTION (\d+)\.\n\n/gm, 'SECTION $1. '),
    inline: /^SECTION (\d+)\.\s*/,
  },
  'schopenhauer/studies-in-pessimism.txt': { start: /^NOTE\.$/, commentary: [/^note$/i] },
  'schopenhauer/on-human-nature.txt': { start: /^TRANSLATOR'S PREFACE\.$/ },
  'schopenhauer/the-art-of-literature.txt': { start: /^TRANSLATOR'S PREFACE\.$/ },
  'schopenhauer/the-art-of-controversy.txt': {
    start: /^TRANSLATOR'S PREFACE\.$/,
    dropHeadings: [/^THE ART OF CONTROVERSY\.$/],
    numeralLabel: 'No.',
  },
  'schopenhauer/religion-a-dialogue-etc.txt': {
    start: [/^PREFATORY NOTE$/, 2],
    commentary: [/^prefatory note/i],
  },
  'schopenhauer/essays-of-schopenhauer-dircks.txt': {
    start: /^PRELIMINARY\.$/,
    commentary: [/^preliminary/i],
    dropHeadings: [/^ESSAYS OF SCHOPENHAUER\.$/],
  },
  'schopenhauer/the-world-as-will-and-idea-vol-1.txt': {
    start: /^TRANSLATORS’ PREFACE\.$/,
    end: /^FOOTNOTES$/,
    authorPrefaces: true,
    commentary: [/^translators?’? preface/i],
    inline: /^§\s*(\d+)\.\s*/,
  },
  'schopenhauer/the-world-as-will-and-idea-vol-2.txt': {
    start: /^APPENDIX: CRITICISM OF THE KANTIAN PHILOSOPHY\.$/,
    end: /^FOOTNOTES$/,
  },
  'schopenhauer/the-world-as-will-and-idea-vol-3.txt': {
    start: /^SUPPLEMENTS TO THE SECOND BOOK\.$/,
    end: /^INDEX\./,
    authorPrefaces: true,
  },
  'schopenhauer/the-basis-of-morality.txt': {
    start: /^TRANSLATOR'S PREFACE\.$/,
    end: /^JUDICIUM$/,
  },
  'schopenhauer/fourfold-root-and-will-in-nature.txt': {
    start: /^TRANSLATOR'S PREFACE\.$/,
    end: /CHISWICK PRESS:--C\. WHITTINGHAM AND CO\., TOOKS COURT/,
    authorPrefaces: true,
    commentary: [/translator|editor/i],
    level1: /^$/,
    dropHeadings: [/^THE TRANSLATOR\.$/, /^(part|book)\b/i, /^conclusion \d/i, /^ARTHUR SCHOPENHAUER\.?$/],
  },

  // ---- Stoics -------------------------------------------------------------
  'marcus-aurelius/meditations-long.txt': {
    work: 'Meditations',
    start: /^BIOGRAPHICAL SKETCH$/,
    end: /^INDEXES\.$/,
    commentary: [/^BIOGRAPHICAL SKETCH/, /^THE PHILOSOPHY/],
    dropHeadings: [/^OF$/, /^MARCUS AURELIUS ANTONI[NU]+S\.?$/],
    numeralLabel: 'Book',
    inline: true,
    rename: [[/^The Thoughts, /, '']],
  },
  'epictetus/discourses-and-enchiridion-long.txt': {
    start: /^EPICTETUS\.$/,
    commentary: [/^EPICTETUS\.?$/],
    level1: /^(A SELECTION FROM THE DISCOURSES|THE ENCHEIRIDION)/,
    // Discourse titles run into the text: "HOW A MAN SHOULD ... TO THE REST.—If a man..."
    preprocess: (t) => t.replace(/^((?:[A-Z0-9][A-Z0-9 ,;:'’()\-]*\n)*[A-Z0-9][A-Z0-9 ,;:'’()\-]*[A-Z)]\.)—/gm, '$1\n\n'),
    longHeadings: true,
    numeralLabel: '§',
    rename: [
      [/^A Selection From the Discourses of Epictetus, /, 'Discourses: '],
      [/^A Selection From the Discourses of Epictetus$/, 'Discourses'],
      [/^The Encheiridion, or Manual, /, 'Enchiridion '],
    ],
  },
  'epictetus/enchiridion-higginson.txt': {
    start: /^\s*THE ENCHIRIDION$/,
    end: /LIBRARY OF LIBERAL ARTS/i,
    numeralLabel: '§',
    dropHeadings: [/^THE ENCHIRIDION$/],
  },
  'seneca/minor-dialogues.txt': {
    start: /^PREFACE\.$/,
    end: /^THE END\.$/,
    cuts: [[/^CONTENTS\.$/, /^THE FIRST BOOK OF THE DIALOGUES/]],
    dropHeadings: [/^THE \w+ BOOK OF THE DIALOGUES? OF/],
    level1: /^$/,
    inline: /^([IVXL]+)\.\s+(?=\S)/,
    inlineLabel: 'Ch. ',
    rename: [
      [/^“why, When a Providence.*?Providence”/i, 'Of Providence'],
      [/^“that the Wise Man Can Neither.*?Wise Man/i, 'On the Firmness of the Wise Man'],
    ],
  },
  'seneca/on-benefits.txt': {
    start: /^PREFACE$/,
    cuts: [[/^CONTENTS$/, /^L\. A\. SENECA$/]],
    dropHeadings: [/^L\. A\. SENECA$/, /^ON BENEFITS\.$/, /^DEDICATED TO$/, /^AEBUTIUS LIBERALIS\.$/, /^AUBREY STEWART$/],
    numeralLabel: 'Ch.',
    inline: /^([IVXL]+)\.\s+(?=\S)/,
    inlineLabel: 'Ch. ',
    inlineReplacesNumeral: true,
  },

  // ---- William James ------------------------------------------------------
  'william-james/the-varieties-of-religious-experience.txt': {
    start: /^PREFACE\.$/,
    end: /^INDEX\.$/,
    authorPrefaces: true,
    dropHeadings: [/^HARVARD UNIVERSITY,?$/],
  },
  'william-james/talks-to-teachers.txt': {
    start: /^PREFACE\.$/,
    authorPrefaces: true,
    cuts: [[/^CONTENTS\.$/, /^I\. PSYCHOLOGY AND THE TEACHING ART$/, 2]],
    level1: /^#?TALKS TO (TEACHERS|STUDENTS)/,
    dropHeadings: [/^THE END\.$/],
  },
  'william-james/memories-and-studies.txt': {
    start: /^PREFATORY NOTE$/,
    commentary: [/^PREFATORY NOTE/],
    cuts: [[/^CONTENTS$/, /^I$/]],
    dropHeadings: [/^HENRY JAMES, JR\.?$/],
  },

  // ---- Others -------------------------------------------------------------
  'james-allen/as-a-man-thinketh.txt': {
    start: /^FOREWORD$/,
    authorPrefaces: true,
    dropHeadings: [/^JAMES ALLEN\.?$/, /^ENGLAND$/, /^AS A MAN THINKETH$/],
  },
  'emerson/essays-first-series.txt': { start: /^I\.$/, dropHeadings: [/^Epilogue to Beaumont/i] },
  'emerson/essays-second-series.txt': { start: /^\s*THE POET\.$/, dropHeadings: [/^BEN JONSON$/] },
  'thoreau/walden-and-civil-disobedience.txt': {
    start: /^Economy$/,
    spacedHeadings: true,
    level1: /^(WALDEN|ON THE DUTY OF CIVIL DISOBEDIENCE)$/,
    dropHeadings: [/^THE END$/, /^walden_pond_map$/],
    rename: [[/^Walden, /, '']],
  },
  'boethius/the-consolation-of-philosophy.txt': {
    start: /^PREFACE\.$/,
    cuts: [[/^INDEX$/, /^BOOK I\.$/, 2]],
    end: /^REFERENCES TO QUOTATIONS/,
    commentary: [/^SUMMARY/],
    numeralLabel: 'Prose',
    numeralResetsTitle: true,
  },
  'dhammapada/dhammapada-max-muller.txt': {
    work: 'Dhammapada',
    start: /^Chapter I\./,
    inline: true,
    inlineLabel: 'v. ',
  },
  'laozi/tao-te-ching-legge.txt': {
    work: 'Tao Te Ching',
    start: /^PART 1\.$/,
    // Chapters are numbered 1–81 at the start of a paragraph ("Ch. 1. 1. The
    // Tao...", "11. The thirty spokes...", or a bare "12." line); verses inside a
    // chapter are numbered 1, 2, 3... Tell them apart by tracking the sequence.
    preprocess: (t) => {
      let ch = 0;
      let verse = 0;
      return t
        .split(/(\n{2,})/)
        .map((p) => {
          if (!p.trim()) return p;
          const m = p.match(/^(?:Ch\. )?(\d+)\.(?:\s+|$)/);
          if (!m) return p;
          const n = +m[1];
          const rest = p.slice(m[0].length);
          const startsVerseOne = /^1\.(\s|$)/.test(rest);
          if (n === ch + 1 && (startsVerseOne || n !== verse + 1 || /^Ch\./.test(p))) {
            ch = n;
            verse = startsVerseOne ? 1 : 0;
            return `CHAPTER ${n}` + (rest ? `\n\n${rest}` : '');
          }
          verse = n;
          return p;
        })
        .join('');
    },
    numerals: false,
    inline: true,
    inlineLabel: 'v. ',
  },
  'montaigne/essays-complete-cotton.txt': {
    work: 'Essays',
    start: /^PREFACE\.$/,
    cuts: [
      [/^BOOK THE FIRST\.$/, /^\s*THE LIFE OF MONTAIGNE/],
      // Each volume ends with a list of bookmarked phrases, then a title page
      // and contents for the next volume; the last one runs to end of file.
      [/ETEXT EDITOR’S BOOKMARKS:/, /^(CHAPTER|BOOK THE)/, 1, 'eof'],
    ],
    commentary: [/^THE LIFE OF MONTAIGNE/],
    dropHeadings: [/^ESSAYS OF (MICHEL DE )?MONTAIGNE$/, /^(MICHEL DE )?MONTAIGNE\.?$/, /^“?HENRI\.?$/],
  },
  'arnold-bennett/how-to-live-on-24-hours-a-day.txt': {
    start: /^PREFACE TO THIS EDITION$/,
    authorPrefaces: true,
    cuts: [[/^CONTENTS$/, /^THE DAILY MIRACLE$/]],
  },
  'ralph-waldo-trine/in-tune-with-the-infinite.txt': {
    start: /^PREFACE\.$/,
    authorPrefaces: true,
    cuts: [[/^CONTENTS\.$/, /^FULLNESS OF PEACE/]],
    dropHeadings: [/^FULLNESS OF PEACE, POWER, AND PLENTY\.?$/],
  },
  'bertrand-russell/the-conquest-of-happiness.txt': {
    start: /^\s*PREFACE$/,
    end: /^\s*INDEX$/,
    authorPrefaces: true,
    cuts: [[/^\s*CONTENTS$/, /^\s*PART I$/]],
  },
};

/** Clean titles / translator names for citations (manifest values are Gutenberg's). */
const CITATION = {
  'schopenhauer/the-wisdom-of-life.txt': { work: 'The Wisdom of Life' },
  'schopenhauer/counsels-and-maxims.txt': { work: 'Counsels and Maxims' },
  'schopenhauer/studies-in-pessimism.txt': { work: 'Studies in Pessimism' },
  'schopenhauer/on-human-nature.txt': { work: 'On Human Nature' },
  'schopenhauer/the-art-of-literature.txt': { work: 'The Art of Literature' },
  'schopenhauer/the-art-of-controversy.txt': { work: 'The Art of Controversy' },
  'schopenhauer/religion-a-dialogue-etc.txt': { work: 'Religion: A Dialogue, and Other Essays' },
  'schopenhauer/essays-of-schopenhauer-dircks.txt': { work: 'Essays of Schopenhauer', translator: 'Mrs. Rudolf Dircks' },
  'schopenhauer/the-world-as-will-and-idea-vol-1.txt': { work: 'The World as Will and Idea, Vol. 1', translator: 'R. B. Haldane & J. Kemp' },
  'schopenhauer/the-world-as-will-and-idea-vol-2.txt': { work: 'The World as Will and Idea, Vol. 2', translator: 'R. B. Haldane & J. Kemp' },
  'schopenhauer/the-world-as-will-and-idea-vol-3.txt': { work: 'The World as Will and Idea, Vol. 3', translator: 'R. B. Haldane & J. Kemp' },
  'schopenhauer/fourfold-root-and-will-in-nature.txt': {
    work: 'On the Fourfold Root of the Principle of Sufficient Reason',
    workByLocation: [[/^On the Will in Nature|^(Physiology|Comparative Anatomy|Physical Astronomy|Linguistic|Animal Magnetism|Sinology|Reference to Ethics|Conclusion|Preface to the Second Edition|Introduction|Physiology and Pathology|Plant Physiology)/, 'On the Will in Nature']],
  },
  'epictetus/discourses-and-enchiridion-long.txt': {
    work: 'Discourses',
    workByLocation: [[/^Enchiridion/, 'Enchiridion']],
    stripLocation: [/^Discourses:? ?/, /^Enchiridion /],
  },
  'epictetus/enchiridion-higginson.txt': { work: 'Enchiridion' },
  'seneca/minor-dialogues.txt': { work: 'Minor Dialogues' },
  'seneca/on-benefits.txt': { work: 'On Benefits' },
  'william-james/the-varieties-of-religious-experience.txt': { work: 'The Varieties of Religious Experience' },
  'william-james/talks-to-teachers.txt': { work: 'Talks to Teachers on Psychology, and to Students on Some of Life’s Ideals' },
  'james-allen/as-a-man-thinketh.txt': { work: 'As a Man Thinketh' },
  'emerson/essays-first-series.txt': { work: 'Essays: First Series' },
  'emerson/essays-second-series.txt': { work: 'Essays: Second Series' },
  'thoreau/walden-and-civil-disobedience.txt': {
    work: 'Walden',
    workByLocation: [[/^On the Duty of Civil Disobedience/, 'On the Duty of Civil Disobedience']],
  },
  'ralph-waldo-trine/in-tune-with-the-infinite.txt': { work: 'In Tune with the Infinite' },
  'bertrand-russell/the-conquest-of-happiness.txt': { work: 'The Conquest of Happiness' },
};

const DEFAULT_COMMENTARY = [
  /^(translator'?s? )?(preface|introduction|introductory note|editor'?s? (preface|note)|translator'?s? note|biographical|life of|memoir)\b/i,
  /^(preface|introduction) (to|by) /i,
];
const DEFAULT_SKIP = [/^(contents|table of contents|index|footnotes?|notes|errata|transcriber'?s? note)\b\.?/i];

const ROMAN = /^(?=[MDCLXVI])M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

// ---------------------------------------------------------------------------

function words(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

function isRomanOrNumber(s) {
  const t = s.replace(/[.:]$/, '').trim();
  return ROMAN.test(t) || /^\d{1,3}$/.test(t);
}

/** Clean inline markup so stored text reads naturally and quotes can be verified. */
function cleanInline(s) {
  return s
    .replace(/\[(Footnote|Note)[^\]]*\]/gi, '')
    .replace(/\[(\d{1,3}|[A-Z]{1,2}|[a-z])\]/g, '') // footnote markers [1] [A]
    .replace(/\{\d+\}/g, '') // page markers
    .replace(/\[(Illustration|Sidenote)[^\]]*\]/gi, '')
    .replace(/\s*\[Transcriber'?s note:[^\]]*\]/gi, '')
    .replace(/\s*--\[[^\]]*\]/g, '') // inline editor's notes: --[ ... ]
    .replace(/#([^#\n]+)#/g, '$1') // #bold#
    .replace(/_{1,2}([^_\n]+?)_{1,2}/g, '$1') // _italics_
    .replace(/(\*\s+){2,}\*/g, '') // * * * * * separators
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Join a paragraph's wrapped lines; keep line breaks for verse. */
function paragraphText(lines) {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  const indentedVerse =
    trimmed.length >= 2 &&
    lines.every((l) => /^\s{2,}\S/.test(l) || !l.trim()) &&
    trimmed.every((l) => l.length < 65);
  const joined = indentedVerse ? trimmed.join('\n') : trimmed.join(' ');
  return cleanInline(joined.replace(/-\n/g, '-'));
}

function headingKind(text, rawLines, cfg = {}) {
  const t = text.replace(/\s+/g, ' ').trim();
  const max = cfg.longHeadings ? 220 : 90;
  if (!t || t.length > max || rawLines.length > (cfg.longHeadings ? 4 : 3)) return null;
  if (isRomanOrNumber(t)) return 'numeral';
  if (/^(book|part|volume|chapter|chap\.|lecture|essay|section|sect\.|dialogue|letter|appendix|supplement|preface|introduction|conclusion|postscript|epilogue)\b/i.test(t))
    return /[a-z]/.test(t) && (words(t) > 10 || /[a-z][.!?]\s+[A-Z][a-z]/.test(t)) ? null : 'title';
  if (/^([A-Z]\.\s*){2,4}$/.test(t) || /^([A-Z]\.\s?){1,3}[A-Z]{2,}\.$/.test(t) || /^[—–-]/.test(t) || /,$/.test(t)) return null; // initials, attributions
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 3 && !/[a-z]/.test(t) && words(t) <= (cfg.longHeadings ? 40 : 14)) return 'title';
  return null;
}

function isFootnote(text) {
  return /^\[(footnote|note|\d{1,3}|[A-Z]{1,2}|[a-z])[\]:\s]/i.test(text) || /^(\d{1,3}|\*)\s*\.?\s*(See|Cf\.|Ibid|Comp\.)/.test(text);
}

function isTocLine(text) {
  return /(\.\s*){4,}|\s{3,}\d+\s*$|\s\d{1,4}$/.test(text);
}

function titleCase(s) {
  if (/[a-z]/.test(s)) return s;
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  const cap = (w) => w.replace(/^([^A-Za-z]*)([a-z])/, (_, p, c) => p + c.toUpperCase()).replace(/-([a-z])/g, (_, c) => '-' + c.toUpperCase());
  const words = s.toLowerCase().split(' ');
  return words
    .map((w, i) => {
      const bare = w.replace(/[.,:;]$/, '').toUpperCase();
      if (ROMAN.test(bare) && bare.length <= 6 && !/^(MIX|DIM|CIVIL|MID|LID|MILD|DID)$/.test(bare)) return w.toUpperCase();
      const afterBreak = i === 0 || /[.:?!—]$/.test(words[i - 1]);
      return !afterBreak && small.has(w) ? w : cap(w);
    })
    .join(' ');
}

/** Split an over-long paragraph on sentence boundaries (then clauses, then words). */
function splitLong(text) {
  if (words(text) <= MAX_WORDS) return [text];
  const units = (text.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)\s*/g) || [text]).flatMap((sentence) => {
    if (words(sentence) <= MAX_WORDS) return [sentence];
    const clauses = sentence.split(/(?<=[;:])\s+/);
    return clauses.flatMap((c) => {
      if (words(c) <= MAX_WORDS) return [c + ' '];
      const w = c.split(/\s+/);
      const out = [];
      for (let i = 0; i < w.length; i += MAX_WORDS) out.push(w.slice(i, i + MAX_WORDS).join(' ') + ' ');
      return out;
    });
  });
  const out = [];
  let cur = '';
  for (const u of units) {
    if (cur && words(cur) + words(u) > MAX_WORDS) {
      out.push(cur.trim());
      cur = '';
    }
    cur += u;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------------------------------------------------------------------------

function chunkWork(entry, cfg) {
  const raw = fs.readFileSync(path.join(ROOT, entry.file), 'utf8').split('\n');

  // Restrict to the configured body range.
  const findNth = (arr, re, n = 1, from = 0) => {
    for (let k = from; k < arr.length; k++) if (re.test(arr[k]) && --n === 0) return k;
    return -1;
  };
  let lines = raw;
  if (cfg.start) {
    const [re, n] = Array.isArray(cfg.start) ? cfg.start : [cfg.start, 1];
    const i = findNth(raw, re, n);
    if (i === -1) throw new Error(`${entry.file}: start pattern not found`);
    lines = raw.slice(i);
  }
  if (cfg.end) {
    const j = lines.findIndex((l, k) => k > 0 && cfg.end.test(l));
    if (j !== -1) lines = lines.slice(0, j);
  }
  for (const [from, to, n = 1, toEof] of cfg.cuts || []) {
    let i = 0;
    while ((i = findNth(lines, from, 1, i)) !== -1) {
      const j = findNth(lines, to, n, i + 1);
      if (j === -1 && toEof) {
        lines = lines.slice(0, i);
        break;
      }
      if (j === -1) {
        console.warn(`  ${entry.file}: cut end ${to} not found after line ${i}; skipped`);
        break;
      }
      lines = lines.slice(0, i).concat(lines.slice(j));
      i++;
    }
  }

  let body = lines.join('\n');
  if (cfg.preprocess) body = cfg.preprocess(body);

  // Paragraphs, remembering how many blank lines preceded each.
  const paras = [];
  let buf = [];
  let blanks = 2;
  let before = 0;
  for (const l of body.split('\n').concat([''])) {
    if (l.trim()) {
      if (!buf.length) before = blanks;
      buf.push(l);
      blanks = 0;
    } else {
      if (buf.length) paras.push({ lines: buf, before });
      buf = [];
      blanks++;
    }
  }

  const commentary = cfg.authorPrefaces ? cfg.commentary || [] : DEFAULT_COMMENTARY.concat(cfg.commentary || []);
  const skip = DEFAULT_SKIP.concat(cfg.skip || []);
  const drop = cfg.dropHeadings || [];
  const level1 = cfg.level1 || /^((first|second|third|fourth|fifth) book|book|part|volume|supplements? to)\b/i;
  const numeralLabel = cfg.numeralLabel ?? '';
  const inlineLabel = cfg.inlineLabel ?? '§';
  const inlinePattern = cfg.inline === true ? /^(\d{1,3})\.\s+(?=\S)/ : cfg.inline || null;

  const state = { book: '', title: '', numeral: '', inline: '', speaker: 'author', skipping: false };
  let pending = []; // consecutive heading paragraphs merge into one heading
  const sections = []; // { location, speaker, aphorism, paras: [] }
  let current = null;

  const location = () =>
    [state.book, state.title, state.numeral && `${numeralLabel}${numeralLabel.endsWith('§') ? '' : ' '}${state.numeral}`.trim(), state.inline && `${inlineLabel}${state.inline}`]
      .filter(Boolean)
      .join(', ');

  const openSection = (aphorism = false) => {
    const loc = (cfg.rename || []).reduce((l, [re, to]) => l.replace(re, to), location());
    const base = aphorism ? location().replace(/,[^,]*$/, '') : loc;
    current = { location: loc, base, inline: state.inline, speaker: state.speaker, aphorism, paras: [] };
    sections.push(current);
  };

  const tidy = (p) => {
    const t = titleCase(p.replace(/\(\d+\)|\[\d+\]/g, ' ').replace(/[.,:]+$/, '').replace(/\s+/g, ' ').trim());
    return t.length > 100 ? t.slice(0, 97).replace(/\s+\S*$/, '') + '…' : t;
  };

  const flushHeading = () => {
    if (!pending.length) return;
    let pieces = pending.filter((p) => !drop.some((r) => r.test(p)));
    pending = [];
    if (!pieces.length) return;

    // "CHAPTER" + "IV" on separate lines -> "Chapter IV"
    pieces = pieces.reduce((acc, p) => {
      const prev = acc[acc.length - 1];
      if (prev && /^(chapter|chap|book|part|lecture|section|essay|letter|song|prose)\.?$/i.test(prev) && isRomanOrNumber(p)) {
        acc[acc.length - 1] = `${prev.replace(/\.$/, '')} ${p}`;
      } else acc.push(p);
      return acc;
    }, []);

    const isSkip = pieces.some((p) => skip.some((r) => r.test(p)));
    const firstTitle = pieces.find((p) => !level1.test(p) && !isRomanOrNumber(p)) || '';
    const isCommentary = commentary.some((r) => r.test(firstTitle.replace(/^[_#]+|[_#.]+$/g, '')));

    let numeral = '';
    if (pieces.length > 1 && isRomanOrNumber(pieces[pieces.length - 1])) numeral = pieces.pop().replace(/[.:]$/, '');
    if (pieces.length === 1 && isRomanOrNumber(pieces[0])) {
      numeral = pieces.pop().replace(/[.:]$/, '');
    }

    const lastL1 = pieces.map((p) => level1.test(p)).lastIndexOf(true);
    if (lastL1 !== -1) {
      state.book = pieces.slice(0, lastL1 + 1).map(tidy).join(', ');
      state.title = pieces.slice(lastL1 + 1).map(tidy).join('. ');
    } else if (pieces.length) {
      state.title = pieces.map(tidy).join('. ');
    }
    state.numeral = numeral;
    state.inline = '';
    state.skipping = isSkip;
    state.speaker = isCommentary ? 'commentary' : 'author';
    openSection();
  };

  for (const p of paras) {
    const text = paragraphText(p.lines);
    if (!text) continue;
    let kind = headingKind(text, p.lines, cfg);
    if (!kind && cfg.spacedHeadings && p.before >= 2 && p.lines.length === 1 && text.length <= 60 && !/[.;,:]$/.test(text) && words(text) <= 10)
      kind = 'title';
    if (kind === 'numeral' && cfg.numerals === false) continue;

    if (kind === 'title' || (kind === 'numeral' && pending.length)) {
      pending.push(text);
      continue;
    }
    if (kind === 'numeral') {
      if (state.skipping) continue;
      state.numeral = text.replace(/[.:]$/, '');
      state.inline = '';
      if (cfg.numeralResetsTitle) state.title = '';
      openSection();
      continue;
    }
    flushHeading();
    if (state.skipping) continue;
    if (isFootnote(text)) continue;
    if (isTocLine(text) && words(text) < 15) continue;

    const m = inlinePattern && text.match(inlinePattern);
    if (m) {
      state.inline = m[1];
      if (cfg.inlineReplacesNumeral) state.numeral = '';
      openSection(true);
      current.paras.push(text.slice(m[0].length));
      continue;
    }
    if (!current) openSection();
    current.paras.push(text);
  }

  // Pack into chunks.
  const chunks = [];
  const emit = (location, speaker, texts) => {
    const text = texts.join('\n\n');
    if (words(text) < 8) return; // stray fragments
    chunks.push({ location, speaker, text });
  };

  let group = null; // grouping of short aphorisms
  const flushGroup = () => {
    if (group) emit(group.location, group.speaker, group.texts);
    group = null;
  };

  for (const s of sections) {
    if (!s.paras.length) continue;
    const total = words(s.paras.join(' '));

    if (s.aphorism && total <= APHORISM_GROUP_WORDS) {
      const base = s.base;
      if (group && group.base === base && group.speaker === s.speaker && group.words + total <= APHORISM_GROUP_WORDS) {
        group.texts.push(s.paras.join('\n\n'));
        group.words += total;
        group.location = group.first + '–' + s.inline;
        continue;
      }
      flushGroup();
      group = { base, first: s.location, location: s.location, speaker: s.speaker, texts: [s.paras.join('\n\n')], words: total };
      continue;
    }
    flushGroup();

    let cur = [];
    let curWords = 0;
    const pieces = s.paras.flatMap(splitLong);
    pieces.forEach((piece, idx) => {
      const w = words(piece);
      const remaining = pieces.slice(idx).reduce((n, x) => n + words(x), 0);
      if (cur.length && (curWords + w > MAX_WORDS || (curWords >= MIN_WORDS && remaining > MIN_WORDS / 2))) {
        emit(s.location, s.speaker, cur);
        // one-paragraph overlap when it's short enough to help context
        const last = cur[cur.length - 1];
        cur = words(last) <= 80 && words(last) + w <= MAX_WORDS ? [last] : [];
        curWords = words(cur.join(' '));
      }
      cur.push(piece);
      curWords += w;
    });
    if (cur.length) emit(s.location, s.speaker, cur);
  }
  flushGroup();

  return chunks;
}

// ---------------------------------------------------------------------------

function main() {
  const report = process.argv.includes('--report');
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const out = [];

  for (const entry of manifest.works) {
    if (only.length && !only.some((o) => entry.file.includes(o))) continue;
    const cfg = WORKS[entry.file] || {};
    const chunks = chunkWork(entry, cfg);
    const cite = CITATION[entry.file] || {};
    const author = entry.author.replace(/\s*\(.*\)$/, '');

    chunks.forEach((c, i) => {
      const byLoc = (cite.workByLocation || []).find(([re]) => re.test(c.location || ''));
      const location = (cite.stripLocation || []).reduce((l, re) => l.replace(re, ''), c.location || '');
      out.push({
        id: `${entry.file.replace(/\.txt$/, '')}#${String(i + 1).padStart(4, '0')}`,
        author,
        work: byLoc ? byLoc[1] : cite.work || cfg.work || entry.title,
        translator: cite.translator || entry.translator,
        location: location || null,
        speaker: c.speaker,
        words: words(c.text),
        text: c.text,
        file: entry.file,
        source: entry.source,
        ...(entry.rightsNote && { rightsNote: entry.rightsNote }),
      });
    });

    if (report) {
      const locs = [...new Set(chunks.map((c) => `${c.speaker === 'commentary' ? '[C] ' : ''}${c.location}`))];
      const w = chunks.map((c) => words(c.text)).sort((a, b) => a - b);
      console.log(
        `\n=== ${entry.file}: ${chunks.length} chunks, ${locs.length} sections, words p10/median/p90 ${w[Math.floor(w.length * 0.1)]}/${w[Math.floor(w.length / 2)]}/${w[Math.floor(w.length * 0.9)]}`
      );
      const show = locs.length > 24 ? [...locs.slice(0, 16), '...', ...locs.slice(-6)] : locs;
      show.forEach((l) => console.log('   ' + l.slice(0, 110)));
    }
  }

  if (!report) {
    fs.writeFileSync(OUT, out.map((c) => JSON.stringify(c)).join('\n') + '\n');
    console.log(`Wrote ${out.length} chunks to ${path.relative(process.cwd(), OUT)}`);
  }
}

main();
