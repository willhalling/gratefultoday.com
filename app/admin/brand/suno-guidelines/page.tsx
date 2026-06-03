import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Suno Guidelines | GratefulToday',
  description:
    'Suno AI music generation guidelines and example prompts for creating on-brand GratefulToday meditation music.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SunoGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-8">
          GratefulToday - Suno AI Guidelines
        </h1>

        {/* Prompt Formula Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Prompt Formula</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="bg-blue-50 p-4 rounded mb-4">
              <p className="font-mono text-sm text-gray-700">
                [frequency]hz frequency, [mood], [instruments], slow tempo [bpm], ambient, [reverb
                type], minimal arrangement, spacious
              </p>
            </div>

            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Frequency:</strong> 432hz, 528hz, 396hz, 639hz, or 741hz
              </p>
              <p>
                <strong>Mood:</strong> grounding calm, healing warmth, deep release, harmonious,
                awakening clarity
              </p>
              <p>
                <strong>Instruments:</strong> warm piano, soft strings, ambient pads, acoustic
                guitar (fingerpicking)
              </p>
              <p>
                <strong>Tempo:</strong> 55-70 BPM (slow and calming)
              </p>
              <p>
                <strong>Reverb:</strong> gentle reverb, cathedral reverb, natural reverb, deep
                reverb
              </p>
              <p>
                <strong>Arrangement:</strong> Always minimal, spacious, organic sounds
              </p>
            </div>
          </div>
        </section>

        {/* Core Requirements */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Core Requirements</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Always Include:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>&quot;[frequency]hz frequency&quot; (specify the healing frequency)</li>
              <li>&quot;warm ambient pads&quot; or &quot;gentle ambient textures&quot;</li>
              <li>
                &quot;gentle reverb&quot; or &quot;deep reverb&quot; or &quot;cathedral reverb&quot;
              </li>
              <li>&quot;slow tempo 60-70 bpm&quot; (or specific BPM in that range)</li>
              <li>&quot;minimal arrangement&quot; or &quot;sparse composition&quot;</li>
              <li>&quot;organic sounds&quot; or &quot;natural textures&quot;</li>
              <li>&quot;spacious&quot; or &quot;airy&quot;</li>
            </ul>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded">
            <h3 className="text-xl font-semibold text-red-800 mb-4">Never Include:</h3>
            <ul className="list-disc list-inside space-y-2 text-red-700">
              <li>Drums or heavy percussion</li>
              <li>Bright, cheerful, or upbeat melodies</li>
              <li>Electronic/synthetic/EDM elements</li>
              <li>Jarring or sudden changes</li>
              <li>Heavy bass (except gentle low tones for 396hz)</li>
              <li>Fast tempo (anything over 75 BPM)</li>
              <li>Complex arrangements or busy instrumentation</li>
            </ul>
          </div>
        </section>

        {/* Instruments Guide */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Instruments Guide</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-green-800 mb-4">Favor These:</h3>
              <ul className="list-disc list-inside space-y-2 text-green-700">
                <li>Piano (soft, spacious)</li>
                <li>Acoustic guitar (fingerpicking)</li>
                <li>Ambient pads/synths</li>
                <li>Strings (subtle, gentle)</li>
                <li>Nature sounds (rain, birds, water)</li>
                <li>Soft bells or chimes</li>
                <li>Cello (gentle, warm tones)</li>
                <li>Harp (delicate touches)</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-red-800 mb-4">Avoid These:</h3>
              <ul className="list-disc list-inside space-y-2 text-red-700">
                <li>Drums/percussion (except very soft)</li>
                <li>Electric guitar</li>
                <li>Synthesizers (bright/EDM style)</li>
                <li>Brass instruments</li>
                <li>Vocals (unless very subtle)</li>
                <li>Heavy bass</li>
                <li>Any jarring sounds</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Hz Frequency Guide */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Healing Frequencies Guide</h2>

          <div className="space-y-4">
            <FrequencyCard
              hz="432"
              name="Nature's Frequency"
              purpose="Natural grounding, general meditation, daily practice"
              mood="grounding calm, peaceful, natural"
              instruments="warm piano, ambient pads"
              tempo="60 bpm"
            />

            <FrequencyCard
              hz="528"
              name="Love/Healing Frequency"
              purpose="Deep healing, emotional processing, transformation"
              mood="restorative warmth, healing, gentle"
              instruments="soft strings, gentle pads"
              tempo="65 bpm"
            />

            <FrequencyCard
              hz="396"
              name="Liberation Frequency"
              purpose="Letting go, anxiety relief, release work"
              mood="deep release, grounding, liberating"
              instruments="low bass, ambient textures"
              tempo="55 bpm"
            />

            <FrequencyCard
              hz="639"
              name="Connection Frequency"
              purpose="Gratitude, community, relationships, harmony"
              mood="harmonious, warm, connecting"
              instruments="warm piano, gentle strings"
              tempo="62 bpm"
            />

            <FrequencyCard
              hz="741"
              name="Awakening Frequency"
              purpose="Morning meditations, clarity, new beginnings"
              mood="awakening clarity, uplifting, cleansing"
              instruments="clear tones, gentle piano"
              tempo="68 bpm"
            />
          </div>
        </section>

        {/* Weekly Content Prompts */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Weekly Content Prompts</h2>

          <div className="space-y-6">
            {/* Monday */}
            <WeeklyPrompt
              day="Monday - Grateful Mornings"
              frequency="741 Hz"
              prompts={[
                '741hz awakening frequency, clear tones, uplifting, warm piano, gentle ambient pads, slow 68bpm, natural reverb, minimal arrangement, spacious, morning clarity, peaceful awakening',
                '741hz frequency, cleansing, clarifying quality, soft piano notes, airy atmosphere, slow tempo 68bpm, gentle reverb, sparse composition, organic sounds, bright without harsh, morning meditation',
                'tuned to 741hz, awakening energy, warm ambient textures, delicate piano, slow 70bpm, cathedral reverb, minimalist, spacious, calm clarity, gentle start to day',
              ]}
            />

            {/* Wednesday */}
            <WeeklyPrompt
              day="Wednesday - Recovery Reflections"
              frequency="432 Hz or 396 Hz"
              prompts={[
                '432hz natural frequency, grounding calm, warm piano, ambient pads, slow 60bpm, natural reverb, minimal arrangement, organic sounds, peaceful, centering, recovery meditation',
                '396hz liberation frequency, deep release, low bass, ambient textures, grounding, slow 55bpm, cathedral reverb, minimal, spacious, letting go, peaceful acceptance',
                '432hz frequency, grounding and calming, soft acoustic guitar fingerpicking, gentle pads, slow 62bpm, deep reverb, sparse arrangement, natural sounds, recovery journey, one day at a time',
              ]}
            />

            {/* Friday */}
            <WeeklyPrompt
              day="Friday - Personal Shares"
              frequency="528 Hz"
              prompts={[
                '528hz healing frequency, restorative warmth, soft strings, gentle pads, spacious, slow 65bpm, deep reverb, minimal composition, organic, heart-opening, transformation',
                'tuned to 528hz, love frequency, warm cello, ambient textures, healing atmosphere, slow 63bpm, cathedral reverb, sparse, peaceful, emotional processing, gentle comfort',
                '528hz frequency, DNA repair vibration, tender piano, soft ambient pads, slow 66bpm, natural reverb, minimalist, airy, restorative, healing journey',
              ]}
            />

            {/* Sunday */}
            <WeeklyPrompt
              day="Sunday - Sleep Meditations"
              frequency="432 Hz"
              prompts={[
                '432hz natural frequency, deep calm, warm ambient pads, gentle piano, very slow 58bpm, cathedral reverb, minimal sparse arrangement, spacious, peaceful sleep, restful night',
                'tuned to 432hz, grounding peace, soft strings, ambient textures, slow 60bpm, deep reverb, minimalist, organic night sounds, gentle rainfall, peaceful rest, grateful for rest',
                '432hz frequency, natural calming, warm pads, delicate piano notes, very slow 55bpm, gentle reverb, sparse composition, airy, peaceful evening, grateful week, restful sleep',
              ]}
            />

            {/* Crisis/Craving */}
            <WeeklyPrompt
              day="Crisis/Craving Support"
              frequency="396 Hz"
              prompts={[
                '396hz liberation frequency, grounding release, deep bass tones, ambient textures, slow 55bpm, cathedral reverb, minimal, spacious, letting go of cravings, peaceful grounding, you are safe',
                'tuned to 396hz, liberation from fear, low warm bass, gentle pads, very slow 52bpm, deep reverb, sparse, organic sounds, releasing anxiety, grounded peace, this too shall pass',
                '396hz frequency, deep release, grounding low tones, ambient atmosphere, slow 58bpm, natural reverb, minimal arrangement, peaceful liberation, craving crisis support, one breath at a time',
              ]}
            />
          </div>
        </section>

        {/* Example Prompts by Mood */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Example Prompts by Mood</h2>

          <div className="space-y-6">
            <MoodPrompt
              mood="Peaceful & Grounding"
              prompts={[
                '432hz frequency, grounding calm, warm piano, ambient pads, slow 60bpm, natural reverb, minimal arrangement, spacious, peaceful meditation',
                '432hz natural frequency, earthy tones, soft acoustic guitar fingerpicking, gentle pads, slow 62bpm, cathedral reverb, organic sounds, grounded peace',
                'tuned to 432hz, calming presence, warm ambient textures, delicate piano, slow 58bpm, deep reverb, minimalist, airy, present moment awareness',
              ]}
            />

            <MoodPrompt
              mood="Healing & Warmth"
              prompts={[
                '528hz healing frequency, restorative warmth, soft strings, gentle ambient pads, slow 65bpm, cathedral reverb, minimal sparse, organic, heart-centered',
                '528hz love frequency, warm cello tones, ambient textures, tender piano, slow 63bpm, deep reverb, spacious, gentle healing journey',
                'tuned to 528hz, DNA repair vibration, soft harp, warm pads, slow 66bpm, natural reverb, minimalist arrangement, peaceful transformation',
              ]}
            />

            <MoodPrompt
              mood="Deep Release & Letting Go"
              prompts={[
                '396hz liberation frequency, deep release, low warm bass, ambient textures, grounding, slow 55bpm, cathedral reverb, minimal, spacious, peaceful surrender',
                '396hz frequency, releasing fear, gentle low tones, ambient atmosphere, very slow 52bpm, deep reverb, sparse composition, organic, letting go meditation',
                'tuned to 396hz, grounding liberation, subtle bass notes, warm pads, slow 58bpm, natural reverb, minimalist, airy, peaceful release',
              ]}
            />

            <MoodPrompt
              mood="Connection & Gratitude"
              prompts={[
                '639hz connection frequency, harmonious, warm piano, gentle strings, slow 62bpm, cathedral reverb, minimal arrangement, spacious, grateful heart',
                '639hz harmony vibration, connecting tones, soft ambient pads, delicate piano, slow 64bpm, deep reverb, sparse, organic, community gratitude',
                'tuned to 639hz, relationship healing, warm cello, ambient textures, slow 60bpm, natural reverb, minimalist, peaceful togetherness',
              ]}
            />

            <MoodPrompt
              mood="Morning Clarity & Awakening"
              prompts={[
                '741hz awakening frequency, clear tones, uplifting, warm piano, gentle pads, slow 68bpm, natural reverb, minimal, spacious, morning clarity',
                '741hz cleansing vibration, bright without harsh, soft piano notes, ambient atmosphere, slow 70bpm, cathedral reverb, sparse, new day gratitude',
                'tuned to 741hz, mental clarity, delicate piano, airy pads, slow 66bpm, gentle reverb, minimalist composition, peaceful awakening',
              ]}
            />

            <MoodPrompt
              mood="Evening Rest & Sleep"
              prompts={[
                '432hz natural frequency, deep calm for sleep, warm ambient pads, very slow 55bpm, cathedral reverb, minimal sparse, peaceful night, grateful rest',
                '432hz grounding peace, soft piano, gentle rain sounds, very slow 58bpm, deep reverb, minimalist, organic night textures, restful sleep meditation',
                'tuned to 432hz, natural sleep rhythm, warm pads, delicate tones, slow 52bpm, gentle reverb, spacious, airy, peaceful end of day',
              ]}
            />
          </div>
        </section>

        {/* Advanced Tips */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Advanced Tips</h2>

          <div className="space-y-4">
            <TipCard
              title="Layering Sounds"
              content="Start with ambient pads as foundation, add one primary instrument (piano or guitar), then one subtle accent (strings or nature sounds). Keep it minimal - 2-3 layers max."
            />

            <TipCard
              title="Tempo Guidelines"
              content="55-58 BPM for sleep/deep meditation, 60-65 BPM for general meditation, 66-70 BPM for morning/awakening. Never exceed 75 BPM."
            />

            <TipCard
              title="Reverb Selection"
              content="'Cathedral reverb' for spacious spiritual feel, 'natural reverb' for organic grounding, 'deep reverb' for sleep/release work, 'gentle reverb' for clarity work."
            />

            <TipCard
              title="Nature Sounds Integration"
              content="Add 'gentle rainfall', 'soft bird songs', 'ocean waves', or 'forest ambience' but keep subtle. Nature sounds should never dominate."
            />

            <TipCard
              title="Frequency Consistency"
              content="Always mention the Hz frequency first in your prompt. This helps Suno tune the base notes accordingly. Be specific: '432hz frequency' not just 'healing frequency'."
            />

            <TipCard
              title="Track Length"
              content="Suno generates ~2 minutes by default. For longer meditations, plan to extend or loop. Mention 'continuous flow' or 'meditative loop' for extendable tracks."
            />

            <TipCard
              title="Avoiding Repetition"
              content="Add 'evolving', 'gentle variation', 'subtle progression' to prevent monotonous loops while maintaining calm consistency."
            />
          </div>
        </section>

        {/* Style Tags Reference */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Useful Style Tags</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Mood Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'peaceful',
                    'calm',
                    'serene',
                    'gentle',
                    'quiet',
                    'grounding',
                    'restorative',
                    'healing',
                    'meditative',
                    'contemplative',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Texture Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'spacious',
                    'airy',
                    'warm',
                    'soft',
                    'gentle',
                    'minimal',
                    'sparse',
                    'organic',
                    'natural',
                    'flowing',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Quality Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'ambient',
                    'atmospheric',
                    'ethereal',
                    'delicate',
                    'tender',
                    'subtle',
                    'understated',
                    'minimalist',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Avoid Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'energetic',
                    'upbeat',
                    'bright',
                    'happy',
                    'dramatic',
                    'intense',
                    'fast',
                    'complex',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded font-mono line-through"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Reference Template */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Quick Copy-Paste Template</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-mono text-sm text-gray-700 whitespace-pre-wrap">
                {`[FREQUENCY]hz frequency, [MOOD], [PRIMARY INSTRUMENT], [SECONDARY ELEMENT], slow [BPM]bpm, [REVERB TYPE], minimal arrangement, spacious, organic sounds

Examples:
- 432hz frequency, grounding calm, warm piano, ambient pads, slow 60bpm, natural reverb, minimal arrangement, spacious, organic sounds

- 528hz healing frequency, restorative warmth, soft strings, gentle pads, slow 65bpm, cathedral reverb, minimal sparse, organic

- 396hz liberation frequency, deep release, low bass, ambient textures, slow 55bpm, deep reverb, minimal, spacious, grounding`}
              </p>
            </div>
          </div>
        </section>

        {/* Slowed + Reverb Music Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Slowed + Reverb Music</h2>

          <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded mb-6">
            <h3 className="text-xl font-semibold text-purple-900 mb-3">What is Slowed + Reverb?</h3>
            <p className="text-purple-800 mb-2">
              Slowed + Reverb takes existing music and transforms it into a deeper, more meditative
              experience by:
            </p>
            <ul className="list-disc list-inside text-purple-800 space-y-1 ml-4">
              <li>Slowing the tempo (typically 15-35% slower)</li>
              <li>Adding cathedral/deep reverb for spaciousness</li>
              <li>Creating a dreamlike, contemplative atmosphere</li>
              <li>Extending the emotional resonance of each note</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              Why It Works for Recovery & Gratitude
            </h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Slows racing thoughts:</strong> The reduced tempo naturally slows down
                  mental processing
                </li>
                <li>
                  <strong>Deepens emotional connection:</strong> Extended notes allow feelings to
                  fully process
                </li>
                <li>
                  <strong>Creates safe space:</strong> Reverb adds a cocoon-like quality, feeling
                  protected
                </li>
                <li>
                  <strong>Nostalgia without pain:</strong> Familiar songs feel new, distant, safe
                </li>
                <li>
                  <strong>Perfect for 3am moments:</strong> Ideal for insomnia, anxiety, or craving
                  support
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              Ideal Music Types for Slowed + Reverb
            </h3>

            <div className="space-y-4">
              <MusicTypeCard
                title="Acoustic/Folk Songs"
                why="Natural warmth, storytelling lyrics, minimal production"
                examples={[
                  'Songs about nature, seasons, simple life',
                  'Gentle fingerpicking guitar',
                  'Soft vocals with meaningful lyrics',
                  'Americana/folk with themes of home, peace, journey',
                ]}
                perfect="Songs that already feel reflective or bittersweet"
              />

              <MusicTypeCard
                title="Piano-Based Instrumentals"
                why="Pure emotion, no distraction, meditative quality"
                examples={[
                  'Ludovico Einaudi style compositions',
                  'Simple melodic piano pieces',
                  'Modern classical/neoclassical',
                  'Film score piano themes',
                ]}
                perfect="Pieces with space between notes, not dense/complex"
              />

              <MusicTypeCard
                title="Indie/Alternative Ballads"
                why="Emotional depth, relatable themes, authentic vocals"
                examples={[
                  'Songs about struggle, hope, second chances',
                  'Vulnerable vocal performances',
                  'Themes of recovery, redemption, gratitude',
                  'Soft indie folk with minimal drums',
                ]}
                perfect="Songs that feel like a late-night conversation"
              />

              <MusicTypeCard
                title="Ambient/Post-Rock"
                why="Already spacious, builds slowly, instrumental journeys"
                examples={[
                  'Explosions in the Sky style builds',
                  'Ambient guitar textures',
                  'Cinematic instrumental pieces',
                  'Nature-themed ambient music',
                ]}
                perfect="Music that already creates atmosphere"
              />

              <MusicTypeCard
                title="Worship/Spiritual Music (Instrumental)"
                why="Themes of grace, peace, gratitude already present"
                examples={[
                  'Instrumental worship arrangements',
                  'Hymns without vocals',
                  'Contemplative spiritual piano/guitar',
                  'Songs about surrender, hope, new beginnings',
                ]}
                perfect="Pieces that evoke reverence and peace"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Technical Guidelines</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Slowing Settings</h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>
                    <strong>Light Slow:</strong> 15-20% (keeps energy, adds depth)
                  </li>
                  <li>
                    <strong>Medium Slow:</strong> 25-30% (meditative, still recognizable)
                  </li>
                  <li>
                    <strong>Deep Slow:</strong> 35-40% (dreamlike, very contemplative)
                  </li>
                  <li className="text-red-600">
                    <strong>Avoid:</strong> Over 40% (can sound distorted)
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Reverb Settings</h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>
                    <strong>Room Size:</strong> Large/Cathedral (spacious feel)
                  </li>
                  <li>
                    <strong>Decay Time:</strong> 3-6 seconds (long tail)
                  </li>
                  <li>
                    <strong>Wet/Dry Mix:</strong> 30-50% wet (don&apos;t drown original)
                  </li>
                  <li>
                    <strong>Pre-delay:</strong> 20-40ms (separation from dry signal)
                  </li>
                  <li>
                    <strong>Tone:</strong> Warm/Dark (not bright/harsh)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              When to Use Slowed + Reverb vs. Original Meditation Music
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h4 className="font-semibold text-green-800 mb-3">
                  Use Original Suno/Meditation Music For:
                </h4>
                <ul className="list-disc list-inside text-green-700 space-y-1 text-sm">
                  <li>Weekly scheduled content (Mon/Wed/Fri/Sun)</li>
                  <li>Guided meditations</li>
                  <li>Background for talking/affirmations</li>
                  <li>Specific Hz frequency focus</li>
                  <li>Sleep/deep relaxation</li>
                  <li>Brand consistency</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded">
                <h4 className="font-semibold text-purple-800 mb-3">Use Slowed + Reverb For:</h4>
                <ul className="list-disc list-inside text-purple-700 space-y-1 text-sm">
                  <li>Late night/3am support content</li>
                  <li>Emotional processing videos</li>
                  <li>&quot;Songs that saved me&quot; series</li>
                  <li>Nostalgia/reflection content</li>
                  <li>Grief/loss support</li>
                  <li>Extended study/work background</li>
                  <li>Building unique community identity</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              Content Ideas for Slowed + Reverb
            </h3>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="space-y-3 text-gray-700">
                <li>
                  <strong>&quot;Songs That Carried Me Through&quot;</strong> - Slowed versions of
                  songs meaningful in your recovery journey
                </li>
                <li>
                  <strong>&quot;3am Playlist&quot;</strong> - For when sleep won&apos;t come and
                  thoughts are loud
                </li>
                <li>
                  <strong>&quot;Grateful for Music&quot;</strong> - Songs that remind you why
                  you&apos;re grateful to be sober
                </li>
                <li>
                  <strong>&quot;One Year Ago&quot;</strong> - Reflective content about how far
                  you&apos;ve come
                </li>
                <li>
                  <strong>&quot;When Cravings Hit&quot;</strong> - Longer slowed tracks for riding
                  out difficult moments
                </li>
                <li>
                  <strong>&quot;Nature Soundscapes&quot;</strong> - Environmental recordings slowed
                  (rain, forest, ocean)
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Song Selection Criteria</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                <h4 className="font-semibold text-green-800 mb-3">✅ Look For Songs With:</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1 text-sm">
                  <li>Themes of hope, gratitude, peace, recovery</li>
                  <li>Minimal production (acoustic, simple)</li>
                  <li>Space between notes/phrases</li>
                  <li>Emotional vocals (vulnerability)</li>
                  <li>Already slower tempo (60-90 BPM original)</li>
                  <li>Nostalgic but not triggering</li>
                  <li>Universal themes (nature, time, seasons)</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
                <h4 className="font-semibold text-red-800 mb-3">❌ Avoid Songs With:</h4>
                <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
                  <li>Substance abuse glorification</li>
                  <li>Heavy drums/bass (gets muddy when slowed)</li>
                  <li>Fast tempo (over 120 BPM original)</li>
                  <li>Dense production/lots of layers</li>
                  <li>Aggressive or dark themes</li>
                  <li>Party/club atmosphere</li>
                  <li>Lyrics about hopelessness without resolution</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Pro Tips:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>💡 Test different slow percentages - each song has a &quot;sweet spot&quot;</li>
              <li>💡 Add subtle EQ boost to low-mids (200-400Hz) for warmth when slowing</li>
              <li>💡 Layer nature sounds (rain, fire) at 10-15% volume for texture</li>
              <li>
                💡 Consider pitch preservation vs. allowing pitch drop (both work differently)
              </li>
              <li>💡 Always mention &quot;slowed + reverb&quot; in title for discoverability</li>
              <li>💡 Credit original artist in description</li>
              <li>
                💡 Create playlists by mood: &quot;For Reflection&quot;, &quot;Late Night
                Peace&quot;, &quot;Grateful Heart&quot;
              </li>
            </ul>
          </div>
        </section>

        {/* Testing & Iteration */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Testing & Iteration</h2>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">Before Publishing:</h3>
            <ul className="space-y-2 text-amber-800">
              <li>✓ Does it feel calm and grounding?</li>
              <li>✓ Is it slow enough (under 70 BPM)?</li>
              <li>✓ Are there any jarring or sudden elements?</li>
              <li>✓ Is the arrangement minimal and spacious?</li>
              <li>✓ Does it match the GratefulToday vibe?</li>
              <li>✓ Could you meditate to this?</li>
              <li>✓ Is the Hz frequency mentioned in description?</li>
            </ul>
          </div>
        </section>

        {/* Core Principle */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-8 rounded-lg">
            <h2 className="text-2xl font-serif text-gray-800 mb-4">
              Core Principle for GratefulToday
            </h2>
            <p className="text-lg text-gray-700 italic mb-4">
              &quot;Finding peace in the present, one grateful moment at a time.&quot;
            </p>
            <p className="text-gray-700 mb-2">
              Every track should feel like the soundtrack to a warm, quiet morning with coffee,
              looking out at nature, grateful to be here.
            </p>
            <p className="text-gray-700 font-semibold mb-3">Minimal. Calming. Intentional.</p>
            <p className="text-gray-700 italic">
              &quot;Grateful to be here, grateful to be sober, grateful for this moment.&quot;
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Frequency Card Component
function FrequencyCard({
  hz,
  name,
  purpose,
  mood,
  instruments,
  tempo,
}: {
  hz: string;
  name: string;
  purpose: string;
  mood: string;
  instruments: string;
  tempo: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-3">
        {hz} Hz - {name}
      </h3>
      <div className="space-y-2 text-gray-700 text-sm">
        <p>
          <strong>Purpose:</strong> {purpose}
        </p>
        <p>
          <strong>Mood:</strong> {mood}
        </p>
        <p>
          <strong>Instruments:</strong> {instruments}
        </p>
        <p>
          <strong>Tempo:</strong> {tempo}
        </p>
      </div>
    </div>
  );
}

// Weekly Prompt Component
function WeeklyPrompt({
  day,
  frequency,
  prompts,
}: {
  day: string;
  frequency: string;
  prompts: string[];
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{day}</h3>
        <p className="text-sm text-gray-600 mt-1">Frequency: {frequency}</p>
      </div>
      <div className="space-y-3">
        {prompts.map((prompt, index) => (
          <div key={index} className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-700 font-mono">{prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mood Prompt Component
function MoodPrompt({ mood, prompts }: { mood: string; prompts: string[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{mood}</h3>
      <div className="space-y-3">
        {prompts.map((prompt, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-700 font-mono">{prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tip Card Component
function TipCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-700">{content}</p>
    </div>
  );
}

// Music Type Card Component
function MusicTypeCard({
  title,
  why,
  examples,
  perfect,
}: {
  title: string;
  why: string;
  examples: string[];
  perfect: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-lg font-semibold text-gray-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-3 italic">Why: {why}</p>

      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Examples:</p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
          {examples.map((example, index) => (
            <li key={index}>{example}</li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
        <strong>Perfect for:</strong> {perfect}
      </p>
    </div>
  );
}
