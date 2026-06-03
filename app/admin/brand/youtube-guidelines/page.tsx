import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'YouTube Posting Guidelines | GratefulToday',
  description:
    'GratefulToday YouTube posting guidelines including weekly schedule, title format, description templates, and content structure.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function YouTubeGuidelinesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-8">
          GratefulToday - YouTube Posting Guidelines
        </h1>

        {/* Weekly Posting Schedule */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Weekly Posting Schedule</h2>

          <div className="space-y-6">
            <DetailedScheduleCard
              day="Monday"
              title="Grateful Mornings"
              frequency="741 Hz - awakening"
              description="Start the week with clarity and hope. Focus on fresh starts, morning rituals, and gratitude for another day."
              contentIdeas={[
                "Morning gratitude meditation - what I'm thankful for",
                'Grateful for another sober morning',
                'Morning hope - starting fresh today',
                'Morning affirmations for peace',
                'New week intentions - staying present',
              ]}
              visualStyle="Soft sunrise imagery, morning coffee, golden hour lighting"
            />

            <DetailedScheduleCard
              day="Wednesday"
              title="Recovery Reflections"
              frequency="432 Hz or 396 Hz - grounding/releasing"
              description="Midweek check-in focused on the recovery journey. Honest, grounding, one day at a time. No AA-specific content."
              contentIdeas={[
                'One day at a time - recovery affirmation',
                'Serenity prayer - finding peace today',
                'Acceptance meditation - things as they are',
                "Letting go prayer - release what I can't control",
                'Midweek check-in - staying grateful',
                'Recovery promises I make to myself',
              ]}
              visualStyle="Nature paths, forest imagery, grounding earth tones"
            />

            <DetailedScheduleCard
              day="Friday"
              title="Personal Shares"
              frequency="528 Hz - healing"
              description="Vulnerable, authentic sharing. Personal stories, what sobriety gave back, emotional processing, transformation."
              contentIdeas={[
                'What sobriety gave me back (personal reflection)',
                'Things I took for granted before recovery',
                'Forgiveness meditation - for myself',
                'Grateful even on hard days',
                'Three things that went right this week',
                'Grateful for small wins today',
              ]}
              visualStyle="Warm tones with dusty rose accents, intimate settings, candlelight"
            />

            <DetailedScheduleCard
              day="Sunday"
              title="Sleep Meditations"
              frequency="432 Hz - natural calm"
              description="End the week with peace and rest. Gratitude for the week, preparing for restful sleep, gentle closure."
              contentIdeas={[
                'Evening gratitude - reflecting on the day',
                'Grateful for nature and simple things',
                'Weekend gratitude reflection',
                'Breathe and let go meditation',
                'Sleep meditation - grateful for another week',
                'Thank you for being here - community love',
              ]}
              visualStyle="Evening light, soft charcoal tones, peaceful night scenes"
            />
          </div>

          <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-6 rounded">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Posting Flexibility:</h3>
            <p className="text-amber-800 text-sm">
              This is a guide, not a rigid rule. Post 3-4x per week on days that work for you.
              Consistency matters more than perfection. If you miss a day, just show up the next
              time. That's recovery.
            </p>
          </div>
        </section>

        {/* 30-Day Content Plan */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">30-Day Content Calendar</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <p className="text-gray-700 mb-4">
              A rotating calendar of recovery and gratitude content ideas. Mix and match based on
              your weekly schedule. All content is recovery-focused but not AA-specific.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              "morning gratitude meditation - what i'm thankful for",
              'serenity prayer - finding peace today',
              'grateful for another sober morning',
              'one day at a time - recovery affirmation',
              'three things that went right this week',
              'acceptance meditation - things as they are',
              'grateful for small wins today',
              "letting go prayer - release what i can't control",
              'evening gratitude - reflecting on the day',
              'recovery affirmation - i am enough',
              'grateful for nature and simple things',
              'morning hope - starting fresh today',
              'gratitude for my support system',
              'breathe and let go meditation',
              'what sobriety gave me back (personal)',
              'midweek check-in - staying grateful',
              'forgiveness meditation - for myself',
              'grateful even on hard days',
              'recovery promises i make to myself',
              'weekend gratitude reflection',
              'things i took for granted before recovery',
              'morning affirmations for peace',
              'grateful for clarity and presence',
              'acceptance and surrender meditation',
              'holiday gratitude - staying centered',
              'year-end reflection - recovery wins',
              'grateful for growth this year',
              'new year intentions - sober and present',
              'looking forward with gratitude',
              'thank you for being here - community love',
            ].map((idea, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded border border-gray-200">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700 flex-1">{idea}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use This Calendar:</h3>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li>💡 Not a strict day-by-day schedule - pick what resonates each week</li>
              <li>💡 Repeat favorites - your audience grows, new people need to hear it</li>
              <li>💡 Adapt to current events (holidays, seasons, personal milestones)</li>
              <li>
                💡 Combine ideas: &quot;morning gratitude + what i&apos;m thankful for today&quot;
              </li>
              <li>
                💡 Save personal shares (like &quot;what sobriety gave me back&quot;) for when
                you&apos;re ready
              </li>
            </ul>
          </div>
        </section>

        {/* Early Recovery Content Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">
            Post Ideas for Early Recovery (The First 90 Days)
          </h2>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded mb-6">
            <p className="text-purple-900 font-semibold mb-2">Why This Matters:</p>
            <p className="text-purple-800">
              Early recovery is when people need support the most. These are the videos that get
              saved at 3am, shared in group chats, and watched on repeat during hard moments. Your
              authentic voice + these specific topics = loyal audience who needs you.
            </p>
          </div>

          <div className="space-y-6">
            {/* Crisis Support */}
            <EarlyRecoveryCategory
              title="Crisis Support (When They Need It Most)"
              description="Immediate help for the hardest moments"
              ideas={[
                "3am can't sleep, day 3 sober - 20 min grounding meditation",
                'for when cravings hit hard - emergency calm track',
                "anxiety is loud today, here's something quiet - 15 min",
                'first weekend sober, staying home - friday night support',
                'made it through another day - evening wind-down',
                'feeling shaky, need to ground - body scan meditation',
                "the urge passed, you're still here - affirmation track",
                "can't be around drinking today - staying strong meditation",
                'withdrawal is rough, this might help - gentle support',
                'just need to make it to bedtime - countdown calm',
              ]}
            />

            {/* Daily Wins & Milestones */}
            <EarlyRecoveryCategory
              title="Daily Wins & Milestones"
              description="Celebrating progress, one day at a time"
              ideas={[
                "day 1 - you started, that's everything",
                'day 3 - the hardest days - solidarity track',
                'one week sober - celebrating small victories',
                "10 days - double digits - you're doing it",
                'two weeks - your body is healing',
                '30 days - one month sober - reflection meditation',
                "60 days - two months in - how far you've come",
                '90 days - three months strong - major milestone',
                'woke up without a hangover again - morning gratitude',
                'made it through a trigger without using - proud moment',
              ]}
            />

            {/* Practical Support */}
            <EarlyRecoveryCategory
              title="Practical Support"
              description="What to actually do when it's hard"
              ideas={[
                'what to do instead of drinking - meditation alternative',
                'sitting with uncomfortable feelings - acceptance practice',
                'bored and restless in early sobriety - calming focus',
                'missing the ritual, not the substance - new ritual meditation',
                "everyone else is drinking, I'm not - strength affirmation",
                'HALT check-in: hungry, angry, lonely, tired - self-care reminder',
                'pink cloud wearing off, reality setting in - honest support',
                'romanticizing drinking again - reality check meditation',
                "scared I'll relapse - fear-grounding practice",
                'one craving at a time - breaking it down',
              ]}
            />

            {/* Emotional Processing */}
            <EarlyRecoveryCategory
              title="Emotional Processing"
              description="Feeling everything, learning to sit with it"
              ideas={[
                "grief for the life I thought I'd have - processing loss",
                'forgiving myself for early recovery - self-compassion',
                'anger is part of healing - sitting with anger safely',
                "feeling everything now, it's overwhelming - emotional regulation",
                'shame is heavy today - releasing shame meditation',
                "lonely in early sobriety - you're not alone",
                'proud and scared at the same time - holding both',
                'missing who I was, becoming who I am - transformation',
                'the weight is lifting slowly - patience meditation',
                'crying is part of healing - permission to feel',
              ]}
            />

            {/* Morning Routines */}
            <EarlyRecoveryCategory
              title="Morning Routines"
              description="Starting each sober day"
              ideas={[
                'sober morning routine meditation - starting the day',
                'waking up clear-headed - gratitude for clarity',
                'coffee and calm, day [#] - simple morning ritual',
                'setting intentions for a sober day - morning practice',
                'grateful for another chance - new day affirmation',
                'morning anxiety in early recovery - calming start',
                'today I choose sobriety - daily commitment meditation',
                'one day at a time starts now - present moment focus',
              ]}
            />

            {/* Night Support */}
            <EarlyRecoveryCategory
              title="Night Support"
              description="Getting through the hardest hours"
              ideas={[
                'sober bedtime routine - winding down without substances',
                "can't sleep, brain won't stop - racing thoughts calm",
                'nighttime is hardest - evening support meditation',
                'made it through another sober day - bedtime gratitude',
                'tomorrow is day [#] - hopeful sleep meditation',
                'sleep without substances - natural rest support',
                'dreams about drinking are normal - reassurance track',
              ]}
            />

            {/* Real Talk Series */}
            <EarlyRecoveryCategory
              title="Real Talk Series"
              description="Honest, no-BS recovery content"
              ideas={[
                'things nobody tells you about early sobriety - honest share',
                'it gets easier, but not right away - real timeline',
                "some days still suck, and that's okay - permission to struggle",
                'what actually helped me in early recovery - practical tips',
                "I almost relapsed today, but I didn't - close call support",
                "sobriety isn't always peaceful (yet) - realistic expectations",
                'the comparison trap in recovery - your journey is yours',
                'when will I feel normal again? - honest timeline',
                'still thinking about it, but not doing it - intrusive thoughts',
                "two steps forward, one step back - progress isn't linear",
              ]}
            />

            {/* Grounding Techniques */}
            <EarlyRecoveryCategory
              title="Grounding Techniques"
              description="Tools for when you're spiraling"
              ideas={[
                '5-4-3-2-1 grounding meditation - sensory awareness',
                'box breathing for cravings - breath work',
                'body scan when anxiety hits - physical grounding',
                'touch grass, feel earth - nature connection',
                'ice water technique meditation - crisis grounding',
                'safe place visualization - mental refuge',
                'anchoring to the present - here and now practice',
              ]}
            />

            {/* Weekly Check-Ins */}
            <EarlyRecoveryCategory
              title="Weekly Check-Ins"
              description="Supporting each day of the week"
              ideas={[
                'monday in early recovery - week ahead support',
                'hump day holding on - midweek encouragement',
                'friday night staying in - weekend transition',
                'sober saturday activities - filling the time',
                'sunday scaries in recovery - week prep calm',
                'made it through another week - weekly wins',
              ]}
            />

            {/* Community Connection */}
            <EarlyRecoveryCategory
              title="Community Connection"
              description="Building connection and belonging"
              ideas={[
                "if you're early in recovery, this is for you",
                "we're all figuring this out together",
                "your day count doesn't define your worth",
                "relapse isn't failure, coming back is strength",
                'drop your day count, no judgment - community share',
                'what helped you in early recovery? - crowd-sourced wisdom',
                'to everyone starting over today - fresh start support',
              ]}
            />

            {/* Affirmation Tracks */}
            <EarlyRecoveryCategory
              title="Affirmation Tracks"
              description="Short, powerful reminders"
              ideas={[
                'I am stronger than this craving',
                'my body is healing every day',
                'I deserve peace and clarity',
                'this feeling will pass',
                'I am exactly where I need to be',
              ]}
            />
          </div>

          {/* Format Types */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Format Types That Work for Early Recovery
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Short Crisis Tracks (10-20 min)
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• When they need immediate help</li>
                  <li>• Can finish even in distress</li>
                  <li>• Bookmark and return to</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded">
                <h4 className="font-semibold text-green-900 mb-2">
                  Real Voice Check-ins (5-10 min)
                </h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• You speaking honestly</li>
                  <li>• &quot;Here&apos;s what helped me today&quot;</li>
                  <li>• Builds personal connection</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded">
                <h4 className="font-semibold text-purple-900 mb-2">
                  Long Background Support (60-90 min)
                </h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Keeping them company</li>
                  <li>• &quot;I&apos;ll stay with you through this&quot;</li>
                  <li>• For the long, hard nights</li>
                </ul>
              </div>

              <div className="bg-amber-50 p-4 rounded">
                <h4 className="font-semibold text-amber-900 mb-2">Daily Encouragement (3-5 min)</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Quick morning boost</li>
                  <li>• &quot;You can do today&quot;</li>
                  <li>• Easy to make habit</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Why These Work */}
          <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-6 rounded">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Why These Work</h3>
            <p className="text-gray-700 mb-3">Early recovery needs:</p>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                'Immediate support (crisis moments)',
                'Daily encouragement (one day at a time)',
                'Real talk (not toxic positivity)',
                'Practical tools (what to actually do)',
                "Community (you're not alone)",
                'Milestones (celebrating small wins)',
                "Permission to struggle (it's hard and that's okay)",
              ].map((need, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✅</span>
                  <span className="text-gray-700 text-sm">{need}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-6 rounded">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Start With What Resonates:
            </h3>
            <p className="text-amber-800">
              Which of these resonate most with your own early recovery experience? Start with those
              - they&apos;ll be the most authentic. Your lived experience is your greatest asset in
              serving this community.
            </p>
          </div>
        </section>

        {/* Title Format */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Title Format</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <p className="text-gray-700 mb-4">
              <strong>Always lowercase, casual, authentic</strong>
            </p>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-green-700 mb-2">✅ Examples:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="font-mono text-sm bg-green-50 p-2 rounded">
                  &quot;grateful mornings | week 1 | 741hz&quot;
                </li>
                <li className="font-mono text-sm bg-green-50 p-2 rounded">
                  &quot;recovery reflections | one day at a time | 432hz&quot;
                </li>
                <li className="font-mono text-sm bg-green-50 p-2 rounded">
                  &quot;personal share | what sobriety gave me back&quot;
                </li>
                <li className="font-mono text-sm bg-green-50 p-2 rounded">
                  &quot;sleep meditation | grateful for another week | 432hz&quot;
                </li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Never:</h3>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>ALL CAPS</li>
                <li>Clickbait (&quot;YOU WON&apos;T BELIEVE...&quot;)</li>
                <li>Over-formatted (&quot;Top 10 Gratitude Hacks!!!&quot;)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Description Template */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Description Template</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <pre className="bg-gray-50 p-4 rounded text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {`[2-3 casual sentences about the video]

tuned to [frequency]hz for [purpose - grounding/healing/clarity]

what are you grateful for today? leave a comment 💛

timestamps:
0:00 intro
2:00 meditation begins
[etc]

// gratefultoday`}
            </pre>
          </div>
        </section>

        {/* Thumbnail Checklist */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Thumbnail Checklist</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <ul className="space-y-2 text-blue-700">
              <li>✓ Soft nature background (muted colors from brand palette)</li>
              <li>✓ Playfair Display font, lowercase</li>
              <li>✓ 2-4 words max</li>
              <li>✓ &quot;GratefulToday&quot; watermark top corner</li>
              <li>✓ Consistent layout every time</li>
              <li>✓ No faces, no clutter, no bright colors</li>
            </ul>
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Color Palette (Always Use)</h2>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Primary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColorSwatch color="#A8B5A0" name="Soft Sage Green" />
              <ColorSwatch color="#E8DCC4" name="Warm Beige" />
              <ColorSwatch color="#8B9DAF" name="Muted Blue-Grey" />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Accent</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorSwatch color="#C9A5A0" name="Dusty Rose" />
              <ColorSwatch color="#4A5D4F" name="Deep Forest Green" />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">Background</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorSwatch color="#F5F1E8" name="Cream" />
              <ColorSwatch color="#3D3D3D" name="Soft Charcoal" note="for evening content" />
            </div>
          </div>
        </section>

        {/* Video Structure */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Video Structure</h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Intro (0:00-0:30)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Soft fade in</li>
                <li>&quot;GratefulToday&quot; text appears</li>
                <li>Music starts immediately</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Body</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Slow cross-fades (3-5 seconds)</li>
                <li>Text fades gently (no slides/pops)</li>
                <li>Minimal movement</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Outro</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>&quot;thank you for being here&quot;</li>
                <li>Music fades gently</li>
                <li>End screen with next video</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Hz Frequency Guide */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Hz Frequency Guide</h2>

          <div className="space-y-4">
            <FrequencyGuideCard
              hz="432"
              purpose="Natural grounding"
              note="default for most content"
            />
            <FrequencyGuideCard
              hz="528"
              purpose="Healing/transformation"
              note="personal shares, gratitude"
            />
            <FrequencyGuideCard hz="396" purpose="Liberation/release" note="letting go, cravings" />
            <FrequencyGuideCard hz="639" purpose="Connection/harmony" note="community content" />
            <FrequencyGuideCard hz="741" purpose="Awakening/clarity" note="morning meditations" />
          </div>
        </section>

        {/* Tone of Voice */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Tone of Voice</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-green-800 mb-4">DO:</h3>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                <li>lowercase casual</li>
                <li>short sentences</li>
                <li>honest, vulnerable</li>
                <li>conversational</li>
                <li>present tense</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-red-800 mb-4">DON&apos;T:</h3>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>corporate speak</li>
                <li>overly formal</li>
                <li>preachy</li>
                <li>clichés</li>
                <li>excessive exclamation points or emojis</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <h3 className="text-xl font-semibold text-green-700 mb-2">✅ Good:</h3>
            <p className="text-gray-700 italic">
              &quot;couldn&apos;t sleep so made this. hope it helps.&quot;
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-red-700 mb-2">❌ Bad:</h3>
            <p className="text-gray-700 italic">
              &quot;Hey guys! Welcome back! Don&apos;t forget to smash that like button! 🙏✨&quot;
            </p>
          </div>
        </section>

        {/* Visual Style */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Visual Style</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-green-800 mb-4">Use:</h3>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                <li>Natural soft lighting</li>
                <li>Nature (forests, water, rain, morning light)</li>
                <li>Real, unpolished</li>
                <li>Muted, desaturated tones</li>
                <li>Coffee/journals/candles</li>
              </ul>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
              <h3 className="text-xl font-semibold text-red-800 mb-4">Avoid:</h3>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                <li>Stock photo aesthetic</li>
                <li>Overly dramatic</li>
                <li>People&apos;s faces</li>
                <li>Urban scenes</li>
                <li>Anything too &quot;perfect&quot;</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Music (Suno Prompts) */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Music (Suno Prompts)</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Always include:</h3>
            <ul className="space-y-2">
              <li className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">
                &quot;[frequency]hz frequency&quot;
              </li>
              <li className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">
                &quot;warm ambient pads&quot;
              </li>
              <li className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">
                &quot;gentle reverb&quot;
              </li>
              <li className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">
                &quot;slow tempo 60-70 bpm&quot;
              </li>
              <li className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">
                &quot;minimal arrangement&quot;
              </li>
              <li className="font-mono text-sm bg-gray-50 p-2 rounded text-gray-700">
                &quot;organic sounds&quot;
              </li>
            </ul>
          </div>
        </section>

        {/* Pinned Comment */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Pinned Comment (Every Video)</h2>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="mb-4">
              <p className="font-mono text-sm bg-purple-50 p-3 rounded text-gray-700">
                &quot;what are you grateful for today? 💛&quot;
              </p>
            </div>
            <p className="text-gray-600 text-center mb-4">or</p>
            <div className="mb-4">
              <p className="font-mono text-sm bg-purple-50 p-3 rounded text-gray-700">
                &quot;drop a comment - what&apos;s one thing you&apos;re grateful for right
                now?&quot;
              </p>
            </div>
            <p className="text-gray-700 font-semibold mt-4 text-center">
              Reply to every comment in first 24 hours
            </p>
          </div>
        </section>

        {/* Pre-Post Checklist */}
        <section className="mb-12">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">Pre-Post Checklist</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <h3 className="text-xl font-semibold text-blue-800 mb-4">Before uploading, confirm:</h3>
            <ul className="space-y-2 text-blue-700">
              <li>✓ Title is lowercase and includes Hz</li>
              <li>✓ Description follows template</li>
              <li>✓ Thumbnail matches brand style</li>
              <li>✓ Colors are from palette</li>
              <li>✓ Tone is casual and authentic</li>
              <li>✓ Pinned comment asking for gratitude</li>
              <li>✓ Video tagged to correct playlist</li>
              <li>✓ Feels like &quot;GratefulToday&quot;</li>
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
              Everything should feel like a warm, quiet morning with coffee, looking out at nature,
              grateful to be here.
            </p>
            <p className="text-gray-700 font-semibold mb-3">Consistent. Calming. Real.</p>
            <p className="text-gray-700 italic">
              &quot;Grateful to be here, grateful to be sober, grateful for this moment.&quot;
            </p>
          </div>
        </section>

        {/* Quick Reminders */}
        <section className="mb-12">
          <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-amber-900 mb-3">Quick Reminders</h3>
            <ul className="space-y-2 text-amber-800">
              <li>📅 Post 3-4x per week</li>
              <li>🎯 Stay consistent</li>
              <li>💬 Reply to comments</li>
              <li>🙏 Be authentic</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

// Schedule Card Component
function ScheduleCard({
  day,
  title,
  frequency,
}: {
  day: string;
  title: string;
  frequency: string;
}) {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{day}</h3>
      <p className="text-lg text-gray-700 mb-1">{title}</p>
      <p className="text-sm text-gray-600 italic">{frequency}</p>
    </div>
  );
}

// Detailed Schedule Card Component
function DetailedScheduleCard({
  day,
  title,
  frequency,
  description,
  contentIdeas,
  visualStyle,
}: {
  day: string;
  title: string;
  frequency: string;
  description: string;
  contentIdeas: string[];
  visualStyle: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-2xl font-semibold text-gray-800">{day}</h3>
          <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{title}</span>
        </div>
        <p className="text-sm text-gray-600 italic mb-3">{frequency}</p>
        <p className="text-gray-700">{description}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Content Ideas:</h4>
        <ul className="space-y-1">
          {contentIdeas.map((idea, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Visual Style:</strong> {visualStyle}
        </p>
      </div>
    </div>
  );
}

// Color Swatch Component
function ColorSwatch({ color, name, note }: { color: string; name: string; note?: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div
        className="w-full h-16 rounded mb-3 border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <h4 className="font-semibold text-gray-800 mb-1">{name}</h4>
      <p className="text-sm text-gray-600">{color}</p>
      {note && <p className="text-xs text-gray-500 italic mt-1">{note}</p>}
    </div>
  );
}

// Frequency Guide Card Component
function FrequencyGuideCard({ hz, purpose, note }: { hz: string; purpose: string; note: string }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
      <div>
        <h4 className="text-lg font-semibold text-gray-800">
          {hz} Hz - {purpose}
        </h4>
        <p className="text-sm text-gray-600 italic">{note}</p>
      </div>
    </div>
  );
}

// Early Recovery Category Component
function EarlyRecoveryCategory({
  title,
  description,
  ideas,
}: {
  title: string;
  description: string;
  ideas: string[];
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 italic">{description}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {ideas.map((idea, index) => (
          <div
            key={index}
            className="text-sm text-gray-700 flex items-start gap-2 bg-gray-50 p-2 rounded"
          >
            <span className="text-purple-600 mt-0.5 font-semibold">•</span>
            <span className="flex-1">{idea}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
