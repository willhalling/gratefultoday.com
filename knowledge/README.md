# Knowledge base

Public-domain classics on happiness, gratitude, resilience and recovery, used as
reference material for future Grateful Today content. ~2.7M words across 32 works.

- One clean `.txt` per work in `knowledge/<author>/`. The Project Gutenberg
  header, footer and license text have been removed.
- `manifest.json` lists every work's title, author, translator, word count, source URL
  and any `rightsNote`.
- Regenerate with `NODE_USE_ENV_PROXY=1 node scripts/fetch-knowledge.js`
  (drop `NODE_USE_ENV_PROXY=1` if you're not behind a proxy). Pass folder names to
  refresh only some authors, e.g. `node scripts/fetch-knowledge.js seneca emerson`.
  To add a work, add its Gutenberg ID to `SOURCES` in the script.

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
