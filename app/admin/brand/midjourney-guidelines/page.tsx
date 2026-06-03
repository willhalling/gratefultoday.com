import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Midjourney Guidelines | GratefulToday',
  description:
    'Midjourney prompt guidelines and examples for creating on-brand GratefulToday imagery.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MidjourneyGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-8">
          GratefulToday - Midjourney Guidelines
        </h1>

        {/* Prompt Formula Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Prompt Formula</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="bg-blue-50 p-4 rounded mb-4">
              <p className="font-mono text-sm text-gray-700">
                [subject] [lighting] [mood] [color palette] [style modifiers] --ar 16:9 --style raw
                --s 50
              </p>
            </div>

            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Subject:</strong> What you&apos;re showing (coffee, rain, forest, etc.)
              </p>
              <p>
                <strong>Lighting:</strong> soft natural light, golden hour, morning light, overcast
              </p>
              <p>
                <strong>Mood:</strong> peaceful, calm, serene, gentle, quiet
              </p>
              <p>
                <strong>Color Palette:</strong> muted tones, desaturated, soft sage green and warm
                beige
              </p>
              <p>
                <strong>Style Modifiers:</strong> minimalist, unpolished, authentic, soft focus
              </p>
              <p>
                <strong>Parameters:</strong> --ar 16:9 for YouTube thumbnails, --style raw for
                natural look, --s 50 for subtle styling
              </p>
            </div>
          </div>
        </section>

        {/* Core Style Requirements */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Core Style Requirements</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Always Include:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>&quot;soft natural lighting&quot; or &quot;golden hour lighting&quot;</li>
              <li>&quot;muted tones&quot; or &quot;desaturated colors&quot;</li>
              <li>&quot;minimalist&quot; or &quot;simple composition&quot;</li>
              <li>&quot;peaceful&quot; or &quot;calm atmosphere&quot;</li>
              <li>&quot;soft focus&quot; or &quot;gentle depth of field&quot;</li>
              <li>Brand colors: &quot;soft sage green, warm beige, muted blue-grey&quot;</li>
            </ul>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded">
            <h3 className="text-xl font-semibold text-red-800 mb-4">Always Avoid:</h3>
            <ul className="list-disc list-inside space-y-2 text-red-700">
              <li>
                &quot;vibrant&quot;, &quot;saturated&quot;, &quot;bright&quot;, &quot;neon&quot;
              </li>
              <li>&quot;dramatic&quot;, &quot;intense&quot;, &quot;bold&quot;</li>
              <li>&quot;professional photography&quot;, &quot;stock photo&quot;</li>
              <li>&quot;perfect&quot;, &quot;polished&quot;, &quot;pristine&quot;</li>
              <li>People&apos;s faces or identifiable humans</li>
              <li>Urban/city scenes</li>
              <li>Red colors or aggressive tones</li>
            </ul>
          </div>
        </section>

        {/* Brand Color Reference */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Brand Color Palette</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-700 mb-4">Reference these in prompts:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ColorReference color="#A8B5A0" name="Soft Sage Green" />
              <ColorReference color="#E8DCC4" name="Warm Beige" />
              <ColorReference color="#8B9DAF" name="Muted Blue-Grey" />
              <ColorReference color="#C9A5A0" name="Dusty Rose" />
              <ColorReference color="#4A5D4F" name="Deep Forest Green" />
              <ColorReference color="#F5F1E8" name="Cream" />
            </div>
          </div>
        </section>

        {/* Example Prompts by Category */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Example Prompts by Category</h2>

          <div className="space-y-6">
            {/* Morning/Coffee */}
            <PromptCategory
              title="Morning/Coffee Scenes"
              prompts={[
                'steaming coffee cup on wooden table, soft morning light through window, muted tones, soft sage green and warm beige color palette, peaceful atmosphere, minimalist composition, gentle depth of field, unpolished aesthetic --ar 16:9 --style raw --s 50',
                'hands holding warm coffee mug, cozy morning setting, golden hour lighting, desaturated colors, calm and serene, soft focus on hands, cream and beige tones, authentic moment --ar 16:9 --style raw --s 50',
                'coffee steam rising in morning light, rain on window in background, muted blue-grey and warm beige, peaceful solitude, soft natural lighting, minimalist and simple --ar 16:9 --style raw --s 50',
              ]}
            />

            {/* Nature/Outdoors */}
            <PromptCategory
              title="Nature/Forest Scenes"
              prompts={[
                'misty forest path at dawn, soft morning light filtering through trees, muted green and grey tones, peaceful and calm, desaturated colors, gentle atmosphere, minimalist composition --ar 16:9 --style raw --s 50',
                'close-up of rain droplets on green leaves, soft natural light, muted sage green and grey, peaceful mood, shallow depth of field, authentic and unpolished --ar 16:9 --style raw --s 50',
                'forest clearing with morning fog, golden hour glow, soft focus, muted earth tones, calm and grounding, desaturated greens and beiges, serene atmosphere --ar 16:9 --style raw --s 50',
              ]}
            />

            {/* Water/Rain */}
            <PromptCategory
              title="Water/Rain Scenes"
              prompts={[
                'rain drops on window glass, soft grey light, blurred background, muted blue-grey and sage green, peaceful rainy day, minimalist composition, calm atmosphere --ar 16:9 --style raw --s 50',
                'gentle ocean waves on beach, overcast soft lighting, desaturated blues and greys, peaceful and meditative, minimal composition, authentic coastal scene --ar 16:9 --style raw --s 50',
                'raindrops creating ripples in puddle, soft natural light, muted tones, calm and serene, close-up view, peaceful mood, gentle color palette --ar 16:9 --style raw --s 50',
              ]}
            />

            {/* Sunrise/Sunset */}
            <PromptCategory
              title="Sunrise/Sunset (Soft)"
              prompts={[
                'soft sunrise over calm water, muted warm tones, gentle golden light, desaturated oranges and pinks, peaceful morning, minimalist horizon, serene atmosphere --ar 16:9 --style raw --s 50',
                'quiet sunset through trees, soft diffused light, muted warm beige and dusty rose, calm evening, gentle glow, peaceful solitude, simple composition --ar 16:9 --style raw --s 50',
                'morning light breaking through mist, soft golden hour, desaturated warm tones, peaceful dawn, minimalist landscape, calm and grounding --ar 16:9 --style raw --s 50',
              ]}
            />

            {/* Indoor/Cozy */}
            <PromptCategory
              title="Indoor/Cozy Scenes"
              prompts={[
                'open journal with pen on wooden table, soft window light, warm beige and cream tones, peaceful writing moment, minimalist setup, calm atmosphere, gentle shadows --ar 16:9 --style raw --s 50',
                'burning candle on simple surface, soft warm glow, muted background, cream and beige color palette, peaceful and meditative, minimalist composition, gentle light --ar 16:9 --style raw --s 50',
                'cozy reading nook with soft blanket, natural window light, muted sage green and warm beige, peaceful corner, desaturated tones, calm and inviting, unpolished comfort --ar 16:9 --style raw --s 50',
              ]}
            />

            {/* Plants/Nature Close-ups */}
            <PromptCategory
              title="Plants/Nature Close-ups"
              prompts={[
                'close-up of plant leaves with morning dew, soft natural light, muted sage green and grey, peaceful macro view, gentle depth of field, calm and natural --ar 16:9 --style raw --s 50',
                'simple wildflowers in soft focus, golden hour light, desaturated colors, peaceful meadow, muted greens and beiges, minimalist nature, gentle atmosphere --ar 16:9 --style raw --s 50',
                'fern leaves in soft morning light, muted forest green, peaceful botanical close-up, gentle shadows, desaturated tones, calm and grounding --ar 16:9 --style raw --s 50',
              ]}
            />
          </div>
        </section>

        {/* Side/Back View Prompts */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">
            Side/Back View Prompts for &quot;3am early sobriety can&apos;t sleep&quot;
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded mb-6">
            <p className="text-blue-900 mb-2">
              <strong>Why these work:</strong> Shows vulnerability and isolation without showing
              faces. Perfect for crisis/late-night content.
            </p>
            <p className="text-blue-800 text-sm">
              These prompts avoid faces while creating relatable, emotional scenes for early
              recovery content.
            </p>
          </div>

          <div className="space-y-6">
            <PromptCategory
              title="1. Person at Window (Back View)"
              prompts={[
                'person standing at window looking out at night, back view only, silhouette against dark blue window, muted blue-grey and soft charcoal, peaceful solitude, 3am atmosphere, gentle darkness, minimalist and contemplative --ar 16:9 --style raw --s 50',
                'back view of person sitting at window sill, night scene, soft moonlight through glass, muted blue tones, peaceful isolation, desaturated night colors, calm and reflective, lonely but hopeful --ar 16:9 --style raw --s 50',
                'silhouette of person from behind gazing out bedroom window, dark night sky with stars, muted blue-grey and charcoal, quiet 3am moment, gentle sadness, minimalist composition, serene solitude --ar 16:9 --style raw --s 50',
              ]}
            />

            <PromptCategory
              title="2. Empty Bedroom Scenes"
              prompts={[
                'unmade bed with person sitting on edge, back view, soft blue moonlight through window, muted blue-grey and cream, peaceful but restless, 3am insomnia, gentle shadows, authentic moment --ar 16:9 --style raw --s 50',
                'bedroom at night, empty bed with rumpled sheets, soft window light, muted charcoal and blue-grey, peaceful but awake, desaturated night tones, minimalist and honest --ar 16:9 --style raw --s 50',
                'side view of person sitting on bed looking at window, gentle moonlight, muted blue and charcoal palette, 3am quiet, peaceful solitude, soft focus, contemplative atmosphere --ar 16:9 --style raw --s 50',
              ]}
            />

            <PromptCategory
              title="3. Hand/Detail Shots"
              prompts={[
                'hands holding warm tea cup at night, soft blue window light in background, muted blue-grey and cream, peaceful 3am moment, gentle comfort, minimalist composition, calm and grounding --ar 16:9 --style raw --s 50',
                'close-up of hands wrapped around mug, dark window with rain, muted charcoal and blue tones, peaceful but restless, desaturated night palette, authentic moment, soft shadows --ar 16:9 --style raw --s 50',
                'hands writing in journal at night, soft desk lamp glow, muted warm beige and blue-grey, peaceful late night reflection, gentle shadows, minimalist and honest --ar 16:9 --style raw --s 50',
              ]}
            />

            <PromptCategory
              title="4. Atmospheric Night Scenes"
              prompts={[
                'dark bedroom with soft moonlight streaming through window, empty space, muted blue-grey and charcoal, peaceful 3am atmosphere, gentle darkness, minimalist and moody, serene isolation --ar 16:9 --style raw --s 50',
                'night sky visible through bedroom window, soft stars, muted deep blue and charcoal, peaceful evening, desaturated celestial tones, calm and restful, minimalist view --ar 16:9 --style raw --s 50',
                'rain on window at night, soft blur, muted blue-grey and deep charcoal, peaceful rainy 3am, gentle water drops, minimalist composition, calm and soothing --ar 16:9 --style raw --s 50',
              ]}
            />
          </div>
        </section>

        {/* Weekly Content Prompts */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">
            Weekly Content-Specific Prompts
          </h2>

          <div className="space-y-4">
            <WeeklyPromptCard
              day="Monday - Grateful Mornings (741 Hz)"
              colorTheme="Lighter tones (soft blue-grey, cream)"
              examplePrompt="sunrise breaking through morning mist, soft golden light, muted warm tones with cream and soft blue-grey, peaceful awakening, gentle clarity, minimalist horizon, calm and hopeful atmosphere --ar 16:9 --style raw --s 50"
            />

            <WeeklyPromptCard
              day="Wednesday - Recovery Reflections (432/396 Hz)"
              colorTheme="Earth tones (greens, beiges, forest green)"
              examplePrompt="forest path with dappled light, grounding earth tones, muted sage green and deep forest green, peaceful solitude, desaturated natural colors, calm and centered, minimalist nature scene --ar 16:9 --style raw --s 50"
            />

            <WeeklyPromptCard
              day="Friday - Personal Shares (528 Hz)"
              colorTheme="Warmer tones (dusty rose accents, warm beige)"
              examplePrompt="soft candlelight on peaceful setting, warm beige with gentle dusty rose accents, healing atmosphere, desaturated warm tones, calm and intimate, minimalist composition, gentle glow --ar 16:9 --style raw --s 50"
            />

            <WeeklyPromptCard
              day="Sunday - Sleep Meditations (432 Hz)"
              colorTheme="Deeper tones (charcoal, muted blues, greens)"
              examplePrompt="calm night sky with soft stars, muted blue-grey and soft charcoal, peaceful evening, desaturated night tones, gentle darkness, minimalist celestial view, serene and restful --ar 16:9 --style raw --s 50"
            />
          </div>
        </section>

        {/* Advanced Tips */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Advanced Tips</h2>

          <div className="space-y-4">
            <TipCard
              title="Aspect Ratios"
              content="Use --ar 16:9 for YouTube thumbnails, --ar 4:5 for Instagram posts, --ar 1:1 for square content"
            />

            <TipCard
              title="Consistency Parameters"
              content="Always use --style raw (more natural, less stylized) and --s 50 (subtle styling, not over-processed)"
            />

            <TipCard
              title="Desaturation Trick"
              content="Add 'desaturated', 'muted tones', 'low saturation', or 'washed out colors' to ensure calm palette"
            />

            <TipCard
              title="Avoiding Faces"
              content="Use 'hands only', 'back view', 'from behind', 'obscured face', or simply avoid mentioning people"
            />

            <TipCard
              title="Natural Imperfection"
              content="Include 'unpolished', 'authentic', 'real moment', 'natural imperfections' to avoid stock photo look"
            />

            <TipCard
              title="Lighting Keywords"
              content="'soft natural light', 'diffused light', 'overcast', 'golden hour', 'morning light', 'gentle glow'"
            />
          </div>
        </section>

        {/* Negative Prompts */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Recommended Negative Prompts</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-700 mb-4">Add these to prevent off-brand results:</p>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-mono text-sm text-gray-700">
                --no bright colors, vibrant, saturated, neon, dramatic lighting, harsh shadows,
                professional photography, stock photo, people&apos;s faces, urban, city, red,
                intense, bold, perfect, polished
              </p>
            </div>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-8 rounded-lg">
            <h2 className="text-2xl font-serif text-gray-800 mb-4">Quick Checklist</h2>
            <div className="space-y-2 text-gray-700">
              <p>✓ Muted, desaturated color palette</p>
              <p>✓ Soft, natural lighting (golden hour, morning light, overcast)</p>
              <p>✓ Minimalist, simple composition</p>
              <p>✓ Peaceful, calm mood</p>
              <p>✓ Nature-focused subjects</p>
              <p>✓ No faces, minimal human presence</p>
              <p>✓ Unpolished, authentic aesthetic</p>
              <p>✓ Using --ar 16:9 --style raw --s 50</p>
            </div>
          </div>
        </section>

        {/* Core Principle */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-amber-50 to-green-50 border-2 border-amber-200 p-8 rounded-lg">
            <h2 className="text-2xl font-serif text-gray-800 mb-4">
              Core Principle for GratefulToday
            </h2>
            <p className="text-lg text-gray-700 italic mb-4">
              &quot;Finding peace in the present, one grateful moment at a time.&quot;
            </p>
            <p className="text-gray-700 mb-2">
              Every image should feel like a warm, quiet morning with coffee, looking out at nature,
              grateful to be here.
            </p>
            <p className="text-gray-700 font-semibold mb-3">Consistent, calming, real.</p>
            <p className="text-gray-700 italic">
              &quot;Grateful to be here, grateful to be sober, grateful for this moment.&quot;
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Color Reference Component
function ColorReference({ color, name }: { color: string; name: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-8 h-8 rounded border border-gray-300" style={{ backgroundColor: color }} />
      <div>
        <p className="font-semibold text-gray-800 text-xs">{name}</p>
        <p className="text-gray-600 text-xs font-mono">{color}</p>
      </div>
    </div>
  );
}

// Prompt Category Component
function PromptCategory({ title, prompts }: { title: string; prompts: string[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-4">
        {prompts.map((prompt, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-gray-500 mt-1">#{index + 1}</span>
              <p className="text-sm text-gray-700 font-mono flex-1">{prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Weekly Prompt Card Component
function WeeklyPromptCard({
  day,
  colorTheme,
  examplePrompt,
}: {
  day: string;
  colorTheme: string;
  examplePrompt: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{day}</h3>
      <p className="text-sm text-gray-600 mb-3">
        <strong>Color Theme:</strong> {colorTheme}
      </p>
      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm text-gray-700 font-mono">{examplePrompt}</p>
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
