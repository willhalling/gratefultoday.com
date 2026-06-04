import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brand Guidelines | GratefulToday',
  description:
    'GratefulToday brand guidelines including color palette, typography, visual style, and content formatting.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BrandGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-8">
          GratefulToday Brand Guidelines
        </h1>

        {/* Color Palette Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Color Palette</h2>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Primary Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColorSwatch
                color="#A8B5A0"
                name="Soft Sage Green"
                description="calm, growth, nature, recovery"
              />
              <ColorSwatch
                color="#E8DCC4"
                name="Warm Beige"
                description="peace, grounding, warmth"
              />
              <ColorSwatch
                color="#8B9DAF"
                name="Muted Blue-Grey"
                description="serenity, trust, clarity"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Accent Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorSwatch
                color="#C9A5A0"
                name="Dusty Rose"
                description="hope, gentle warmth (use sparingly)"
              />
              <ColorSwatch
                color="#4A5D4F"
                name="Deep Forest Green"
                description="strength, grounding (text/emphasis)"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Backgrounds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorSwatch color="#F5F1E8" name="Cream/Off-White" description="main background" />
              <ColorSwatch
                color="#3D3D3D"
                name="Soft Charcoal"
                description="dark mode/evening content"
              />
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <h3 className="text-xl font-semibold text-red-800 mb-2">Never Use:</h3>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              <li>Bright/neon colors</li>
              <li>Pure black or pure white</li>
              <li>Red (too aggressive for recovery content)</li>
              <li>Highly saturated anything</li>
            </ul>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Typography</h2>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Titles/Headers</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="mb-2">
                <strong>Font:</strong> Playfair Display ✅ (elegant, calming, sophisticated serif)
              </p>
              <p className="mb-2">
                <strong>Alternatives:</strong> Libre Baskerville, Lora, or Georgia
              </p>
              <p className="mb-2">
                <strong>Weight:</strong> Regular or Medium (never bold or heavy)
              </p>
              <p className="mb-2">
                <strong>Case:</strong> Lowercase preferred ("grateful mornings" not "GRATEFUL
                MORNINGS")
              </p>
              <p className="mb-2">
                <strong>Perfect for:</strong> Thumbnails, video titles, website headers
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Body Text/Descriptions</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="mb-2">
                <strong>Font:</strong> Inter, Open Sans, Montserrat (clean sans-serif)
              </p>
              <p className="mb-2">
                <strong>Weight:</strong> Light or Regular
              </p>
              <p className="mb-2">
                <strong>Size:</strong> Easy to read, never cramped
              </p>
              <p className="mb-2">
                <strong>Purpose:</strong> Keeps contrast with Playfair Display
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              On-Screen Text (in videos)
            </h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="mb-2">
                <strong>Font:</strong> Simple sans-serif (Helvetica, Arial, Montserrat)
              </p>
              <p className="mb-2">
                <strong>Color:</strong> Soft white (#F5F1E8) or Deep Forest Green (#4A5D4F)
              </p>
              <p className="mb-2">
                <strong>Size:</strong> Large enough to read on mobile
              </p>
              <p className="mb-2">
                <strong>Placement:</strong> Lower third or center, consistent position
              </p>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <h3 className="text-xl font-semibold text-red-800 mb-2">Never:</h3>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              <li>Comic Sans or playful fonts</li>
              <li>All caps (except brand name "GratefulToday")</li>
              <li>Multiple fonts in one design</li>
              <li>Fancy script fonts</li>
            </ul>
          </div>
        </section>

        {/* Visual Style Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Visual Style</h2>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Photography/Video</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Natural, soft lighting (golden hour preferred)</li>
                <li>Muted, desaturated tones</li>
                <li>Nature-focused (forests, water, morning light, rain)</li>
                <li>Real, unpolished (not overly filtered)</li>
                <li>Minimal human presence (hands holding coffee okay, faces rare)</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Subjects</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Morning coffee/tea',
                'Rain on windows',
                'Sunrise/sunset (soft)',
                'Forest paths',
                'Ocean waves (gentle)',
                'Candles',
                'Journals/notebooks',
                'Plants/nature close-ups',
              ].map((subject, index) => (
                <div key={index} className="bg-green-50 p-3 rounded-lg text-sm text-gray-700">
                  {subject}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <h3 className="text-xl font-semibold text-red-800 mb-2">Avoid:</h3>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              <li>Stock photo aesthetic</li>
              <li>Overly dramatic landscapes</li>
              <li>People&apos;s faces (keep anonymous/relatable)</li>
              <li>Urban/city scenes (unless very soft)</li>
              <li>Anything too "perfect" or staged</li>
            </ul>
          </div>
        </section>

        {/* Thumbnail Design Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Thumbnail Design</h2>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Consistent Template</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="mb-4 p-4 bg-gray-50 rounded font-mono text-sm">
                [Soft background image - nature/texture]
                <br />
                [Text overlay - lower third]
                <br />
                [Small "GratefulToday" watermark - top corner]
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Text on Thumbnails</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>2-4 words max</li>
                <li>Lowercase</li>
                <li>Soft white or deep forest green</li>
                <li>Slightly transparent background behind text for readability</li>
                <li>
                  <strong>Examples:</strong> "grateful mornings" "one day at a time" "sleep
                  meditation"
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Background</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Soft focus nature image</li>
                <li>Consistent color grading (warm, muted)</li>
                <li>Same style every time (users recognize instantly)</li>
              </ul>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <h3 className="text-xl font-semibold text-red-800 mb-2">Never:</h3>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              <li>Faces with expressions</li>
              <li>Busy/cluttered images</li>
              <li>Bright colors or high contrast</li>
              <li>Multiple text elements</li>
              <li>Arrows, circles, or graphic elements</li>
            </ul>
          </div>
        </section>

        {/* Tone of Voice Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Tone of Voice</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-green-800 mb-4">DO:</h3>
              <ul className="list-disc list-inside text-green-700 space-y-2">
                <li>Lowercase casual ("hey, grateful for another day")</li>
                <li>Short sentences</li>
                <li>Honest, vulnerable</li>
                <li>Conversational ("you doing okay?")</li>
                <li>Inclusive ("we&apos;re in this together")</li>
                <li>Present tense ("grateful today" not "was grateful")</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-red-800 mb-4">DON&apos;T:</h3>
              <ul className="list-disc list-inside text-red-700 space-y-2">
                <li>Corporate speak</li>
                <li>Overly formal</li>
                <li>Preachy or instructional</li>
                <li>Clichés ("journey of a thousand miles...")</li>
                <li>Exclamation points (use sparingly!!!)</li>
                <li>Emojis (unless very rare and natural)</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <h3 className="text-xl font-semibold text-green-700 mb-2">✅ GOOD:</h3>
            <p className="text-gray-700 italic">
              &quot;couldn&apos;t sleep so made this. hope it helps you too. grateful for quiet
              moments like these.&quot;
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-red-700 mb-2">❌ BAD:</h3>
            <p className="text-gray-700 italic">
              &quot;Hey guys! Welcome back to my channel! Today we&apos;re going to explore the
              amazing power of gratitude! Don&apos;t forget to like and subscribe! 🙏✨&quot;
            </p>
          </div>
        </section>

        {/* Audio/Music Guidelines Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Audio/Music Guidelines</h2>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              Suno Prompts - Keep Consistent Sound
            </h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Always include:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>"warm ambient pads"</li>
                <li>"gentle reverb"</li>
                <li>"slow tempo 60-70 bpm"</li>
                <li>"minimal arrangement"</li>
                <li>"organic sounds"</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Instruments to favor:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Piano (soft, spacious)</li>
                <li>Acoustic guitar (fingerpicking)</li>
                <li>Ambient pads/synths</li>
                <li>Strings (subtle)</li>
                <li>Nature sounds (rain, birds, water)</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h4 className="font-semibold text-red-800 mb-2">Avoid:</h4>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>Drums/percussion (except very soft)</li>
                <li>Bright/cheerful melodies</li>
                <li>Electronic/synthetic sounds</li>
                <li>Anything jarring or sudden</li>
                <li>Heavy bass</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Healing Frequencies (Hz)</h3>

            <div className="space-y-4">
              <FrequencyCard
                hz="432"
                name="Nature's Frequency"
                bestFor={[
                  'General meditation',
                  'Grounding and calming',
                  'Recovery work',
                  'Daily practice',
                ]}
                whyItWorks="Considered more 'natural' than standard 440 Hz. Promotes relaxation and presence. Recovery community loves this."
                whenToUse="Most of your content (default setting)"
                sunoPrompt="tuned to 432hz, natural frequency, grounding"
              />

              <FrequencyCard
                hz="528"
                name="Love/Healing Frequency"
                bestFor={[
                  'Deep healing meditation',
                  'Emotional processing',
                  'Forgiveness work',
                  'Transformation content',
                ]}
                whyItWorks="Associated with DNA repair (metaphorically). Heart-opening quality. Popular in spiritual/recovery spaces."
                whenToUse="Friday personal shares, healing-focused content, gratitude meditations"
                sunoPrompt="528hz healing frequency, warm pads, restorative"
              />

              <FrequencyCard
                hz="396"
                name="Liberation Frequency"
                bestFor={[
                  'Letting go meditations',
                  'Release work',
                  'Anxiety/fear relief',
                  'Early recovery support',
                ]}
                whyItWorks="Grounding, releasing quality. Helps with guilt and fear (big in recovery). Great for 'craving crisis' videos."
                whenToUse="'When cravings hit', 'Letting go' content, acceptance meditations"
                sunoPrompt="396hz liberation frequency, deep bass, releasing"
              />

              <FrequencyCard
                hz="639"
                name="Connection Frequency"
                bestFor={[
                  'Gratitude work',
                  'Community/connection themes',
                  'Relationship healing',
                  'Heart-centered content',
                ]}
                whyItWorks="Associated with harmony and relationships. Good for gratitude practice. Community-building content."
                whenToUse="'Grateful for support system', community gratitude videos, connection-themed content"
                sunoPrompt="639hz connection frequency, harmonious, warm"
              />

              <FrequencyCard
                hz="741"
                name="Awakening Frequency"
                bestFor={[
                  'Morning meditations',
                  'Clarity work',
                  'New beginnings',
                  'Conscious awareness',
                ]}
                whyItWorks="Cleansing, clarifying quality. Good for mental fog (common in recovery). Brighter without being harsh."
                whenToUse="Monday 'Grateful Mornings', new year/fresh start content, clarity-focused meditations"
                sunoPrompt="741hz awakening frequency, clear tones, uplifting"
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Weekly Hz Strategy</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>Monday - Grateful Mornings:</strong> 741 Hz (awakening, clarity)
                </li>
                <li>
                  <strong>Wednesday - Recovery Reflections:</strong> 432 Hz (grounding, natural) or
                  396 Hz (releasing)
                </li>
                <li>
                  <strong>Friday - Personal Shares:</strong> 528 Hz (healing, transformation)
                </li>
                <li>
                  <strong>Sunday - Sleep Meditations:</strong> 432 Hz (natural, calming)
                </li>
                <li>
                  <strong>Crisis/Craving Content:</strong> 396 Hz (liberation, grounding)
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              How to Mention Hz in Content
            </h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">In Titles (optional):</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700 font-mono text-sm">
                  <li>&quot;grateful mornings | 432hz meditation&quot;</li>
                  <li>&quot;sleep meditation | tuned to 432hz&quot;</li>
                </ul>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">In Descriptions (always):</h4>
                <p className="text-gray-700 font-mono text-sm mb-2">
                  tuned to 432hz for natural grounding and peace
                </p>
                <p className="text-gray-700 font-mono text-sm">// or //</p>
                <p className="text-gray-700 font-mono text-sm">
                  this track is tuned to 528hz, known as the healing frequency
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Why mention it:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Recovery/meditation community cares about this</li>
                  <li>Differentiates your content</li>
                  <li>Shows intentionality</li>
                  <li>SEO benefit (&quot;432hz meditation&quot; gets searches)</li>
                  <li>Builds trust (you know what you&apos;re doing)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Suno AI Prompts with Hz</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-700 mb-4">
                <strong>Template:</strong>
              </p>
              <p className="font-mono text-sm bg-gray-50 p-3 rounded mb-4">
                [frequency], [mood], [instruments], slow tempo, ambient, reverb, minimal, spacious
              </p>

              <p className="text-gray-700 mb-2">
                <strong>Examples:</strong>
              </p>
              <div className="space-y-2">
                <p className="font-mono text-sm bg-gray-50 p-3 rounded">
                  432hz frequency, grounding calm, warm piano, ambient pads, slow 60bpm, natural
                  reverb, minimal arrangement
                </p>
                <p className="font-mono text-sm bg-gray-50 p-3 rounded">
                  528hz healing frequency, restorative warmth, soft strings, gentle pads, spacious,
                  slow 65bpm, deep reverb
                </p>
                <p className="font-mono text-sm bg-gray-50 p-3 rounded">
                  396hz liberation frequency, deep release, low bass, ambient textures, grounding,
                  55bpm, cathedral reverb
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Voice/Spoken Word</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Calm, measured pace</li>
                <li>Natural speaking voice (not performance)</li>
                <li>Minimal editing (keep authentic, imperfect okay)</li>
                <li>Warm, close mic sound</li>
                <li>Background music at -18dB to -12dB (voice clear but supported)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Content Formatting Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Content Formatting</h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                Video Intro (first 5 seconds)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Soft fade in</li>
                <li>&quot;GratefulToday&quot; text appears gently</li>
                <li>Music starts immediately</li>
                <li>NO flashy intros or animations</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Video Body</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Slow cross-fades between images (3-5 seconds)</li>
                <li>Text appears gently (fade in/out, no slides or pops)</li>
                <li>Minimal movement (calming, not distracting)</li>
                <li>Consistent pacing</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Video Outro</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Fade to soft background</li>
                <li>Simple text: &quot;thank you for being here&quot;</li>
                <li>Music fades gently</li>
                <li>End screen with next video suggestion</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Descriptions Format</h3>
              <pre className="bg-gray-50 p-4 rounded text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {`[2-3 sentences about the video, casual tone]

[Blank line]

what are you grateful for today? leave a comment 💛

[Blank line]

timestamps:
0:00 intro
2:00 meditation begins
...

[Blank line]

// gratefultoday`}
              </pre>
            </div>
          </div>
        </section>

        {/* Platform Consistency Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Platform Consistency</h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">YouTube</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Banner: Soft nature image with &quot;GratefulToday&quot; in brand colors</li>
                <li>Profile pic: Simple logo or abstract nature image</li>
                <li>Playlists: Organized by weekly themes</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">GratefulToday.com</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Same color palette</li>
                <li>Same fonts</li>
                <li>Minimalist design</li>
                <li>Lots of white space</li>
                <li>Nature imagery</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                Instagram (if you use it)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Grid aesthetic matches YouTube thumbnails</li>
                <li>Consistent filters/color grading</li>
                <li>Short clips from videos</li>
                <li>Same casual tone in captions</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Brand Mood Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Brand Mood</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-green-800 mb-4">Feelings to evoke:</h3>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                <li>Calm</li>
                <li>Safe</li>
                <li>Grounded</li>
                <li>Hopeful (not overly optimistic)</li>
                <li>Authentic</li>
                <li>Peaceful</li>
                <li>Present</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-red-800 mb-4">NOT:</h3>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>Excited</li>
                <li>Motivational/pushy</li>
                <li>Corporate</li>
                <li>Perfect/polished</li>
                <li>Trendy</li>
                <li>Loud</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Quick Reference Checklist Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Quick Reference Checklist</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <h3 className="text-xl font-semibold text-blue-800 mb-4">Before posting, ask:</h3>
            <ul className="space-y-2 text-blue-700">
              <li>✓ Colors are muted and from brand palette?</li>
              <li>✓ Thumbnail follows consistent template?</li>
              <li>✓ Title is lowercase and casual?</li>
              <li>✓ Tone is honest, not preachy?</li>
              <li>✓ Visuals are nature-focused and soft?</li>
              <li>✓ Music is warm and minimal?</li>
              <li>✓ It feels like &quot;GratefulToday&quot;?</li>
            </ul>
          </div>
        </section>

        {/* Core Principle Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-8 rounded-lg">
            <h2 className="text-2xl font-serif text-gray-800 mb-4">
              Core Principle for GratefulToday
            </h2>
            <p className="text-lg text-gray-700 italic mb-4">
              &quot;Finding peace in the present, one grateful moment at a time.&quot;
            </p>
            <p className="text-gray-700 mb-2">
              Everything should feel like a warm, quiet morning with coffee, looking out at nature,
              grateful to be here.
            </p>
            <p className="text-gray-700 font-semibold">Consistent, calming, real.</p>
            <p className="text-gray-700 italic mt-4">
              &quot;Grateful to be here, grateful to be sober, grateful for this moment.&quot;
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Color Swatch Component
function ColorSwatch({
  color,
  name,
  description,
}: {
  color: string;
  name: string;
  description: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div
        className="w-full h-20 rounded mb-3 border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <h4 className="font-semibold text-gray-800 mb-1">{name}</h4>
      <p className="text-sm text-gray-600 mb-1">{color}</p>
      <p className="text-sm text-gray-500 italic">{description}</p>
    </div>
  );
}

// Frequency Card Component
function FrequencyCard({
  hz,
  name,
  bestFor,
  whyItWorks,
  whenToUse,
  sunoPrompt,
}: {
  hz: string;
  name: string;
  bestFor: string[];
  whyItWorks: string;
  whenToUse: string;
  sunoPrompt: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-xl font-semibold text-gray-800 mb-2">
        {hz} Hz - {name}
      </h4>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 text-sm mb-1">Best for:</p>
        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
          {bestFor.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 text-sm mb-1">Why it works:</p>
        <p className="text-gray-600 text-sm">{whyItWorks}</p>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-700 text-sm mb-1">When to use:</p>
        <p className="text-gray-600 text-sm">{whenToUse}</p>
      </div>

      <div>
        <p className="font-semibold text-gray-700 text-sm mb-1">Suno prompt:</p>
        <p className="text-gray-600 text-sm font-mono bg-gray-50 p-2 rounded">{sunoPrompt}</p>
      </div>
    </div>
  );
}
