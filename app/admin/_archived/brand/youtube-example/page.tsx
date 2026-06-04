import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'YouTube Post Example | GratefulToday',
  description: 'Complete example of a GratefulToday YouTube post following brand guidelines.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function YouTubeExamplePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-8">YouTube Post Example</h1>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">Example Post:</h2>
          <p className="text-blue-800">
            &quot;3am early sobriety can&apos;t sleep&quot; - A crisis support post for someone in
            their first weeks of recovery having trouble sleeping.
          </p>
        </div>

        {/* Title Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Title</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-900 p-4 rounded mb-4">
              <p className="font-mono text-lg text-white">
                3am early sobriety can&apos;t sleep | 60 min | 432hz
              </p>
            </div>

            <div className="space-y-2 text-gray-700 text-sm">
              <p>
                <strong>Format:</strong> lowercase, clear purpose, includes length and frequency
              </p>
              <p>
                <strong>Why it works:</strong> Immediately relatable to someone searching at 3am.
                Clear what they&apos;re getting (60 minutes of support).
              </p>
              <p>
                <strong>Keywords:</strong> 3am, early sobriety, can&apos;t sleep, meditation, 432hz
              </p>
            </div>
          </div>
        </section>

        {/* Thumbnail Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Thumbnail Design</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Visual Mockup</h3>
              <div className="aspect-video bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg p-8 relative">
                <div className="absolute top-4 right-4 text-xs text-slate-400 opacity-50">
                  GratefulToday
                </div>
                <div className="flex flex-col justify-center h-full">
                  <p
                    className="text-slate-200 text-2xl md:text-4xl font-serif mb-2"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    3am early sobriety
                  </p>
                  <p
                    className="text-slate-300 text-xl md:text-3xl font-serif mb-4"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    can&apos;t sleep
                  </p>
                  <p className="text-slate-400 text-sm md:text-base">60 min | 432hz</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SpecCard
                label="Background"
                value="Dark blue-grey night scene (stars, dark window, or soft moonlight)"
              />
              <SpecCard
                label="Text (Playfair Display, lowercase)"
                value={`"3am early sobriety"\n"can't sleep"`}
              />
              <SpecCard label="Small Text" value="60 min | 432hz" />
              <SpecCard label="Watermark" value="GratefulToday - top right corner" />
              <SpecCard
                label="Colors"
                value="Muted blue-grey (#8B9DAF) and soft charcoal (#3D3D3D) - night palette"
              />
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Description</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="bg-gray-50 p-6 rounded mb-4 font-mono text-sm text-gray-700 whitespace-pre-wrap">
              {`couldn't sleep so made this. if you're early in sobriety and it's 3am and your brain won't stop, you're not alone. this is 60 minutes to help you get through the night.

tuned to 432hz for natural grounding and calm

what are you grateful for today? leave a comment 💛

timestamps:
0:00 intro - you're going to be okay
2:00 breathing starts
5:00 body relaxation
15:00 letting go of racing thoughts
30:00 deep calm section
45:00 preparing for rest
58:00 peaceful close

// gratefultoday`}
            </div>

            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                <strong>Tone:</strong> Casual, honest, comforting (&quot;couldn&apos;t sleep so made
                this&quot;)
              </p>
              <p>
                <strong>Connection:</strong> &quot;you&apos;re not alone&quot; - addressing
                isolation
              </p>
              <p>
                <strong>Clear purpose:</strong> &quot;60 minutes to help you get through the
                night&quot;
              </p>
              <p>
                <strong>Hz mention:</strong> Always include the frequency and purpose
              </p>
              <p>
                <strong>Call to action:</strong> Gratitude comment prompt
              </p>
              <p>
                <strong>Timestamps:</strong> Helps people navigate, shows intention
              </p>
            </div>
          </div>
        </section>

        {/* Tags Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Tags/Keywords</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Copy and paste these hashtags directly into YouTube:
            </p>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
              <p className="font-mono text-sm text-gray-800 leading-relaxed">
                #earlysobriety #cantsleeepsobriety #3ammeditation #insomniarecovery #432hzsleep
                #recoverymeditation #sobersleep #gratitudemeditation #sobrietysupport
                #addictionrecovery #onedayatatime #recoveryjourney #healingfrequency
                #sleepmeditation #calmmeditation
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                '#earlysobriety',
                '#cantsleeepsobriety',
                '#3ammeditation',
                '#insomniarecovery',
                '#432hzsleep',
                '#recoverymeditation',
                '#sobersleep',
                '#gratitudemeditation',
                '#sobrietysupport',
                '#addictionrecovery',
                '#onedayatatime',
                '#recoveryjourney',
                '#healingfrequency',
                '#sleepmeditation',
                '#calmmeditation',
              ].map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pinned Comment Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Pinned Comment</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-400 mb-4">
              <p className="text-purple-900 font-mono">
                &quot;what are you grateful for today? 💛&quot;
              </p>
            </div>

            <p className="text-gray-700 text-sm mb-3">
              <strong>Post this immediately after uploading.</strong> Pin it to the top.
            </p>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
              <p className="text-amber-900 font-semibold mb-2">Reply Strategy:</p>
              <ul className="text-amber-800 text-sm space-y-1">
                <li>• Reply to every comment in first 24 hours</li>
                <li>• Keep replies casual, supportive, authentic</li>
                <li>• Acknowledge day counts: &quot;day 5 is tough, proud of you&quot;</li>
                <li>• Never give medical advice</li>
                <li>• Remind: &quot;we&apos;re all figuring it out together&quot;</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Playlist Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Playlist Assignment</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Add to these playlists:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <strong>Early Recovery Support</strong> - main category
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <strong>Sleep Meditations (432hz)</strong> - format category
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <strong>Crisis Support / 3am Help</strong> - specific need
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <strong>Long Form (60+ min)</strong> - length category
              </li>
            </ul>
          </div>
        </section>

        {/* End Screen Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">End Screen (Last 20 seconds)</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Text on screen:</h3>
                <p className="text-gray-700 italic bg-gray-50 p-3 rounded">
                  &quot;thank you for being here&quot;
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Suggested videos:</h3>
                <ul className="text-gray-700 text-sm space-y-2">
                  <li className="bg-blue-50 p-3 rounded">
                    <strong>Video 1:</strong> &quot;morning after rough night | day [#]
                    meditation&quot;
                    <br />
                    <span className="text-xs text-gray-600">
                      Logical next step - they made it through the night
                    </span>
                  </li>
                  <li className="bg-blue-50 p-3 rounded">
                    <strong>Video 2:</strong> &quot;one day at a time | recovery affirmation&quot;
                    <br />
                    <span className="text-xs text-gray-600">
                      Encouragement for continuing their journey
                    </span>
                  </li>
                  <li className="bg-blue-50 p-3 rounded">
                    <strong>Subscribe button:</strong> Positioned center
                    <br />
                    <span className="text-xs text-gray-600">Keep it simple, no aggressive CTA</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Music/Audio Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Music/Audio Specs</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4">Suno Prompt Used:</h3>
            <div className="bg-gray-50 p-4 rounded mb-4 font-mono text-sm text-gray-700">
              432hz frequency, deep calm for sleep, warm ambient pads, very slow 55bpm, cathedral
              reverb, minimal sparse, peaceful night, organic sounds, gentle rain texture, grateful
              rest
            </div>

            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                <strong>Frequency:</strong> 432 Hz - natural grounding, perfect for sleep
              </p>
              <p>
                <strong>Tempo:</strong> 55 BPM - very slow, conducive to rest
              </p>
              <p>
                <strong>Mood:</strong> Deep calm, peaceful, restful
              </p>
              <p>
                <strong>Instruments:</strong> Warm ambient pads, subtle rain sounds
              </p>
              <p>
                <strong>Structure:</strong> Continuous, minimal variation, meditative loop
              </p>
              <p>
                <strong>Volume:</strong> Consistent, no sudden changes, fade in/out
              </p>
            </div>
          </div>
        </section>

        {/* Publishing Checklist Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Pre-Publishing Checklist</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Title is lowercase and includes Hz + length</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Thumbnail uses night palette (muted blue-grey, charcoal)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Thumbnail text is Playfair Display, lowercase, readable on mobile</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>
                  Description follows template (casual intro, Hz mention, gratitude prompt,
                  timestamps)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Tags include early recovery keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Pinned comment ready to post immediately</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Added to all relevant playlists</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>End screen with relevant next videos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>Music is 432hz, calm, minimal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">☐</span>
                <span>
                  Overall vibe feels like &quot;GratefulToday&quot; - calm, authentic, helpful
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Why This Format Works */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-8 rounded-lg">
            <h2 className="text-2xl font-serif text-gray-800 mb-4">Why This Format Works</h2>

            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Searchable:</strong> Someone at 3am searching &quot;can&apos;t sleep early
                sobriety&quot; finds this immediately
              </p>
              <p>
                <strong>Clear value:</strong> They know exactly what they&apos;re getting (60 min,
                432hz, sleep support)
              </p>
              <p>
                <strong>Relatable:</strong> Title speaks directly to their experience, not generic
                &quot;meditation music&quot;
              </p>
              <p>
                <strong>Authentic:</strong> &quot;couldn&apos;t sleep so made this&quot; -
                you&apos;ve been there, you get it
              </p>
              <p>
                <strong>Helpful:</strong> Timestamps let them navigate, multiple playlists help
                discoverability
              </p>
              <p>
                <strong>Community:</strong> Pinned comment creates connection, replies build trust
              </p>
              <p>
                <strong>On-brand:</strong> Everything from colors to tone to Hz frequency matches
                GratefulToday identity
              </p>
            </div>
          </div>
        </section>

        {/* Core Reminder */}
        <section className="mb-12">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Remember:</h3>
            <p className="text-amber-800">
              This isn&apos;t about perfection. It&apos;s about showing up for someone who&apos;s
              struggling at 3am. Your authenticity and consistency matter more than production
              quality. You&apos;re not a guru - you&apos;re a friend who&apos;s been there.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Spec Card Component
function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded border border-gray-200">
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
