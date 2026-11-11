# Knowledge base

Public-domain classics on happiness, gratitude, resilience and recovery, used as
reference material for future Grateful Today content. ~2.7M words across 32 works.

- One clean `.txt` per work in `knowledge/<author>/`. The Project Gutenberg
  header, footer and license text have been removed.
- `manifest.json` lists every work's title, author, translator, word count, source URL
  and any `rightsNote`.
- Re-download with `npm run knowledge:fetch` (behind a proxy:
  `NODE_USE_ENV_PROXY=1 node scripts/fetch-knowledge.js`). Pass folder names to refresh
  only some authors, e.g. `node scripts/fetch-knowledge.js seneca emerson`. To add a
  work, add its Gutenberg ID to `SOURCES` in the script, then rerun `npm run knowledge:chunk`.

## Chunks for AI search (`chunks.jsonl`)

`chunks.jsonl` holds every work split into ~11.5k small passages, one JSON object per
line, ready for embedding and search. Each chunk carries its own citation:

```json
{
  "id": "marcus-aurelius/meditations-long#0106",
  "author": "Marcus Aurelius",
  "work": "Meditations",
  "translator": "George Long",
  "location": "Book I, §14",
  "speaker": "author",
  "words": 157,
  "text": "From my brother Severus, to love my kin, and to love truth, ...",
  "file": "marcus-aurelius/meditations-long.txt",
  "source": "https://www.gutenberg.org/ebooks/15877"
}
```

How the texts are split:

- **By structure first.** Book, chapter, essay, lecture and numbered section headings
  become the `location`. Aphorism books (Meditations, Enchiridion, Dhammapada,
  Tao Te Ching, Counsels and Maxims) are split on their numbered sections, and
  neighbouring short ones are grouped up to ~200 words (e.g. `Chapter V. The Fool, v. 60–66`).
- **Then by paragraph.** Within a section, whole paragraphs are packed into chunks of
  150–350 words (median ~230). A short paragraph is repeated at the start of the next
  chunk for context. Paragraphs over 350 words are split at sentence boundaries.
- **Clutter removed.** Title pages, tables of contents, indexes, footnotes, footnote
  markers, page numbers and transcriber/editor notes are dropped, and italics
  markup (`_word_`) is removed.
- **`speaker: "commentary"`** marks translators' and editors' prefaces, introductions,
  biographical sketches and summaries, so they're never attributed to the author.
  Filter on `speaker === "author"` when looking for quotes.

Rebuild after changing texts or splitting rules with `npm run knowledge:chunk`. Per-work
settings (where the text starts, heading quirks, citation titles) are at the top of
`scripts/chunk-knowledge.js`. `node scripts/chunk-knowledge.js --report [folder]` prints
the sections found in each work, so you can check the splitting.

When showing quotes to users, check that the quoted words appear verbatim in the cited
chunk's `text` before displaying them, so the AI can't paraphrase or invent a quote.

## Best places to start

| Theme | Where to look |
| --- | --- |
| Gratitude | Marcus Aurelius, *Meditations* Book 1 (a list of thanks); Seneca, *On Benefits* (a whole treatise on gratitude); Emerson, "Gifts" |
| Recovery, surrender, change | William James, *Varieties of Religious Experience* (influenced the founding of AA); Epictetus, *Enchiridion* §1 (what is and isn't in our control) |
| Habits and daily practice | William James, *Talks to Teachers* ch. VIII "The Laws of Habit"; Bennett, *How to Live on 24 Hours a Day* |
| Mindset, affirmations | James Allen, *As a Man Thinketh*; Trine, *In Tune with the Infinite* |
| Contentment, enough-ness | Schopenhauer, *The Wisdom of Life*; Seneca, "On the Shortness of Life" and "On Tranquillity of Mind" (*Minor Dialogues*); Thoreau, *Walden* |
| Calm, mindfulness | *Dhammapada*; *Tao Te Ching*; Boethius, *Consolation of Philosophy* |
| Modern happiness | Russell, *The Conquest of Happiness* (see rights note) |

## Contents

| Folder | Works | Translator |
| --- | --- | --- |
| `schopenhauer/` | The Wisdom of Life; Counsels and Maxims; Studies in Pessimism; On Human Nature; The Art of Literature; The Art of Controversy; Religion: A Dialogue; Dircks selection of essays; The World as Will and Idea (3 vols); The Basis of Morality; Fourfold Root & Will in Nature | Saunders; Dircks; Haldane & Kemp; Bullock; Hillebrand |
| `marcus-aurelius/` | Meditations | George Long |
| `epictetus/` | Discourses (selection) with the Enchiridion; Enchiridion | George Long; T. W. Higginson |
| `seneca/` | Minor Dialogues (incl. On the Shortness of Life, On the Happy Life, On Tranquillity of Mind); On Benefits | Aubrey Stewart |
| `william-james/` | Varieties of Religious Experience; Talks to Teachers (incl. The Laws of Habit, The Gospel of Relaxation); Memories and Studies (incl. The Energies of Men) | — |
| `james-allen/` | As a Man Thinketh | — |
| `emerson/` | Essays, First Series (Self-Reliance, Compensation…); Second Series (Gifts, Experience…) | — |
| `thoreau/` | Walden, and Civil Disobedience | — |
| `boethius/` | The Consolation of Philosophy | H. R. James |
| `dhammapada/` | Dhammapada | F. Max Müller |
| `laozi/` | Tao Te Ching | James Legge |
| `montaigne/` | Essays (complete) | Charles Cotton |
| `arnold-bennett/` | How to Live on 24 Hours a Day | — |
| `ralph-waldo-trine/` | In Tune with the Infinite | — |
| `bertrand-russell/` | The Conquest of Happiness | — |

Not included: Seneca's *Letters* (the public-domain Gummere translation isn't on
Project Gutenberg) and the AA "Big Book" (not on Gutenberg, and its rights status is disputed).

## Licensing

All texts are public domain in the USA. Because the Project Gutenberg boilerplate has
been stripped, they may be used freely. Don't describe derived content as "from
Project Gutenberg" (their trademark).

**Exception:** Russell's *The Conquest of Happiness* (1930) became public domain in the
USA in 2026 but is still in copyright in the UK/EU until 2041. Paraphrase or quote
briefly rather than reproducing long passages in content served outside the USA.
Check local law for other works if publishing outside the USA.
