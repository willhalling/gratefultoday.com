"use strict";
/**
 * Daily Gratitude Prompts - 366 prompts (one for each day of the year including leap years)
 * Organized by month with seasonal themes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAILY_PROMPTS = void 0;
exports.getPromptForDay = getPromptForDay;
exports.getCurrentDayOfYear = getCurrentDayOfYear;
exports.getDayOfYear = getDayOfYear;
exports.getTodaysPrompt = getTodaysPrompt;
exports.DAILY_PROMPTS = [
    {
        subject: "what door opened for you?",
        intro: "sometimes new things show up when we're not even looking for them. could be big, could be small - doesn't matter.",
        prompt: "what new opportunity showed up in your life recently?",
        tags: ["opportunity", "growth", "new beginnings", "possibilities"]
    },
    {
        subject: "that thing you're doing for yourself",
        intro: "been thinking about all the small ways we take care of ourselves. sometimes it's the tiny stuff that actually sticks, you know?",
        prompt: "what's one thing you're doing for yourself that you're actually keeping up with?",
        tags: ["self-care", "habits", "consistency", "growth"]
    },
    {
        subject: "who's been in your corner?",
        intro: "thinking about the people who've shown up for you lately. doesn't have to be anything huge - sometimes it's just someone who gets it.",
        prompt: "who's been in your corner through this?",
        tags: ["support", "relationships", "growth", "people"]
    },
    {
        subject: "something's shifting",
        intro: "been thinking about how we're always changing, even when we don't notice it happening. sometimes the shifts are so gradual we miss them completely.",
        prompt: "what's different about you lately that you're actually pretty happy about?",
        tags: ["growth", "self-awareness", "personal change", "renewal"]
    },
    {
        subject: "tiny wins count too",
        intro: "sometimes the biggest stuff happens in the smallest moments. like actually drinking water when you remembered to, or texting back when you had energy.",
        prompt: "what small thing went right today that you almost didn't notice?",
        tags: ["small wins", "daily victories", "growth", "present moment"]
    },
    {
        subject: "your morning thing that works",
        intro: "mornings can be rough, but maybe there's one small thing that helps. doesn't have to be perfect or Instagram-worthy.",
        prompt: "what part of your morning actually makes you feel okay?",
        tags: ["morning", "routine", "peace", "growth"]
    },
    {
        subject: "something you learned the hard way",
        intro: "we all have those moments where life taught us something we really didn't want to learn at the time. but looking back now, some of those lessons actually helped.",
        prompt: "what's something you learned the hard way that you're actually glad you know now?",
        tags: ["growth", "lessons", "past experiences", "wisdom"]
    },
    {
        subject: "what made you feel alive today?",
        intro: "sometimes it's the little things in nature that wake us up. maybe it was the way the light hit your face or how the air felt different today.",
        prompt: "what natural thing today - sun, rain, wind, whatever - actually made you feel alive?",
        tags: ["nature", "awareness", "present moment", "energy"]
    },
    {
        subject: "that one conversation that hit different",
        intro: "sometimes the right words from someone just land exactly when we need them. maybe it was a friend who got it, or even a stranger who said something that stuck.",
        prompt: "what conversation lately actually helped things make sense?",
        tags: ["connection", "clarity", "support", "communication"]
    },
    {
        subject: "your space right now",
        intro: "been thinking about how much our spaces affect us. like, where you are right now - your room, apartment, whatever - it's probably doing more for you than you realize.",
        prompt: "what's one thing about where you live that actually makes your days better?",
        tags: ["home", "environment", "comfort", "growth"]
    },
    {
        subject: "what are you getting better at?",
        intro: "been thinking about how we're all quietly getting better at things without really noticing. like, maybe you're getting better at saying no, or making coffee, or just sitting with hard feelings.",
        prompt: "what's something you're getting better at, even if it's small?",
        tags: ["growth", "skills", "progress", "self-improvement"]
    },
    {
        subject: "quick check - how'd you take care of yourself today?",
        intro: "sometimes self-care feels like this big thing we're supposed to do perfectly. but really it's just the small ways we're kind to ourselves throughout the day.",
        prompt: "what's one way you took care of yourself today, even if it was tiny?",
        tags: ["self-care", "daily habits", "kindness", "growth"]
    },
    {
        subject: "that thing you finally said no to",
        intro: "boundaries used to feel impossible, right? like being mean or letting people down. but then you start saying no to stuff that drains you and suddenly you can breathe again.",
        prompt: "what's one thing you stopped letting slide that actually made your life better?",
        tags: ["boundaries", "self-care", "growth", "saying no"]
    },
    {
        subject: "what's got you feeling good about what's ahead?",
        intro: "sometimes hope feels big and dramatic, but mostly it's just these quiet moments where something clicks. like maybe things really can get better.",
        prompt: "what's making you feel good about what's coming next?",
        tags: ["hope", "future", "growth", "renewal", "optimism"]
    },
    {
        subject: "what's been teaching you lately?",
        intro: "been thinking about all the random things that actually stick with us. sometimes it's a book you didn't expect to love, or a podcast that just hit different.",
        prompt: "what's something you read, watched, or listened to that actually changed how you think?",
        tags: ["growth", "learning", "resources", "change"]
    },
    {
        subject: "what felt good in your body today?",
        intro: "sometimes we rush through our days and forget our bodies are along for the ride. but there are usually little moments when something just feels nice.",
        prompt: "what physical sensation felt good today? maybe it was stretching, warm coffee, cool air, or just sinking into your bed.",
        tags: ["physical", "pleasure", "present moment", "body awareness"]
    },
    {
        subject: "something you're starting to like about yourself",
        intro: "sometimes we're our own worst critic, but every now and then something shifts. maybe you're seeing a part of yourself differently these days.",
        prompt: "what's something about yourself that you're starting to actually appreciate?",
        tags: ["self-acceptance", "growth", "personal development"]
    },
    {
        subject: "quick check-in about your people",
        intro: "relationships are weird - they shift and change when we're not even paying attention. sometimes you realize someone means more to you now, or you're finally talking to that person without walking on eggshells.",
        prompt: "which relationship in your life feels different now - maybe closer, easier, or just more real?",
        tags: ["relationships", "connection", "growth", "people"]
    },
    {
        subject: "what scared you but you did it anyway?",
        intro: "sometimes the stuff that freaks us out the most is exactly what we need to do. I've been thinking about how growth happens right at the edge of our comfort zone.",
        prompt: "what's something that scared you, but you went ahead and did it anyway?",
        tags: ["courage", "growth", "fear", "overcoming"]
    },
    {
        subject: "what makes you feel useful?",
        intro: "been thinking about what actually matters to us lately. not the big life purpose stuff, just the small things that make us feel like we're here for a reason.",
        prompt: "what makes you feel useful or needed right now?",
        tags: ["purpose", "meaning", "contribution", "growth"]
    },
    {
        subject: "weather that gets you",
        intro: "sometimes the weather just matches exactly how you're feeling inside. like when it's cloudy and you're in a quiet mood, or sunny when you're feeling hopeful.",
        prompt: "what weather today felt like it totally got your vibe?",
        tags: ["mood", "weather", "awareness", "present moment"]
    },
    {
        subject: "what made you smile today?",
        intro: "sometimes the best moments are the tiny ones we almost miss. like when something catches you off guard and you actually laugh, or when you smile without even realizing it.",
        prompt: "what made you smile or laugh today, even if it was just for a second?",
        tags: ["joy", "present moment", "small wins", "laughter"]
    },
    {
        subject: "checking in on how you're feeling",
        intro: "our bodies do so much for us, especially when we're going through stuff. sometimes we forget to notice the quiet ways they're taking care of us.",
        prompt: "what's one way your body has been there for you lately?",
        tags: ["body", "healing", "self-care", "growth"]
    },
    {
        subject: "who's got your back?",
        intro: "thinking about the people around you today. sometimes we forget about the quiet support that's just there, you know?",
        prompt: "who are the people that make you feel less alone?",
        tags: ["community", "support", "connection", "growth"]
    },
    {
        subject: "that mistake that actually helped",
        intro: "we all mess up. sometimes those mess-ups end up teaching us something we wouldn't have learned otherwise. thinking about the stuff that went sideways but somehow made you wiser.",
        prompt: "what mistake taught you something you actually needed to know?",
        tags: ["growth", "learning", "mistakes", "wisdom"]
    },
    {
        subject: "the little things today",
        intro: "some days the big stuff feels overwhelming, but there's usually something small that felt good. maybe it was tiny, maybe you almost missed it.",
        prompt: "what small thing made today a little better?",
        tags: ["daily moments", "simple pleasures", "mindfulness", "present moment"]
    },
    {
        subject: "the feelings you didn't run from",
        intro: "sometimes growth isn't about feeling better - it's about feeling what's actually there. like when you stop avoiding something and just let it be messy for a minute.",
        prompt: "what feeling did you actually let yourself have instead of pushing it away?",
        tags: ["emotions", "growth", "acceptance", "healing"]
    },
    {
        subject: "the small wins count too",
        intro: "progress isn't always dramatic. sometimes it's just noticing you handled something a little differently than before. or that thing that used to knock you down barely registers now.",
        prompt: "what's gotten even a tiny bit easier for you lately?",
        tags: ["progress", "growth", "small wins", "self-awareness"]
    },
    {
        subject: "what's good about right now?",
        intro: "sometimes I get so caught up in what's coming next or what just happened that I forget to actually notice what's happening right now. like, this exact moment.",
        prompt: "what's one thing that feels good about where you are right now?",
        tags: ["present moment", "awareness", "growth", "mindfulness"]
    },
    {
        subject: "what turned out to be stronger than you thought?",
        intro: "sometimes we surprise ourselves. like when something hard happens and we handle it better than we expected. or when we try something new and don't completely fall apart.",
        prompt: "what part of you turned out to be stronger than you thought?",
        tags: ["strength", "self-discovery", "growth", "resilience"]
    },
    {
        subject: "what's got you curious about tomorrow?",
        intro: "sometimes the smallest things we're looking forward to tell us the most about where we're headed. doesn't have to be anything big.",
        prompt: "what's one thing you're actually looking forward to tomorrow?",
        tags: ["anticipation", "future", "hope", "daily life", "growth"]
    },
    {
        subject: "who was nice to you today?",
        intro: "sometimes we're so caught up in our own heads that we miss the small ways people show up for us. even tiny moments count.",
        prompt: "who was nice to you today, even in a small way?",
        tags: ["kindness", "connection", "presence", "daily moments"]
    },
    {
        subject: "someone you're grateful to know",
        intro: "thinking about the people in your life today. the ones who actually matter. there's probably someone who has this thing about them that you really love.",
        prompt: "what's something you love about how someone close to you moves through the world?",
        tags: ["relationships", "people", "qualities", "presence"]
    },
    {
        subject: "that one conversation",
        intro: "been thinking about how some conversations just hit different. you know the ones - where you both actually showed up and it felt real.",
        prompt: "what conversation lately made you feel more connected to someone?",
        tags: ["connection", "conversation", "presence", "relationships"]
    },
    {
        subject: "what did you hear today?",
        intro: "you know that thing where someone's talking and you're actually listening instead of planning what to say next? that happened to me yesterday and I realized how rare it is.",
        prompt: "what did you pick up on when you really listened to someone today?",
        tags: ["listening", "connection", "presence", "awareness"]
    },
    {
        subject: "who really gets you?",
        intro: "some people just make you feel like you can breathe easier around them. like you don't have to explain yourself or put on a show.",
        prompt: "who makes you feel like you can just be yourself?",
        tags: ["relationships", "presence", "acceptance", "connection"]
    },
    {
        subject: "something you gave or got today",
        intro: "been thinking about how we help each other out in little ways. doesn't have to be huge - could be someone holding a door or you listening to a friend vent.",
        prompt: "what's something you did for someone else today, or something someone did for you?",
        tags: ["service", "kindness", "connection", "giving", "receiving"]
    },
    {
        subject: "who's really got your back?",
        intro: "sometimes we get so caught up in everything that's hard, we forget about the people who actually show up. like really show up.",
        prompt: "who in your life makes you feel like you can just be yourself?",
        tags: ["relationships", "support", "presence", "connection"]
    },
    {
        subject: "that conversation you didn't want to have",
        intro: "sometimes the talks we avoid the most are the ones that change everything. even when they're messy or uncomfortable, they can crack something open.",
        prompt: "what hard conversation actually helped you grow?",
        tags: ["difficult conversations", "growth", "communication", "breakthrough moments"]
    },
    {
        subject: "someone who gave you a break",
        intro: "we all mess up sometimes. and sometimes people surprise us by not holding it against us. thinking about those moments can feel pretty good.",
        prompt: "who gave you a break when you probably didn't deserve it?",
        tags: ["forgiveness", "relationships", "grace", "second chances"]
    },
    {
        subject: "that boundary that actually helped",
        intro: "sometimes we think boundaries will push people away, but they can actually make things better. like when you finally said what you needed or stopped doing something that was wearing you out.",
        prompt: "what boundary you set actually made a relationship better?",
        tags: ["boundaries", "relationships", "presence", "self-care"]
    },
    {
        subject: "that time someone really got it",
        intro: "you know those moments when you're doing something with someone and suddenly you both just... get each other? like really get each other. those little shared things can shift everything.",
        prompt: "what's something you did with someone recently that made you feel more connected to them?",
        tags: ["connection", "shared moments", "presence", "relationships"]
    },
    {
        subject: "who's in your corner?",
        intro: "sometimes we forget to notice who actually shows up when good things happen. like who texts you back with the excited all-caps when you share news.",
        prompt: "who's genuinely happy for you when things go well?",
        tags: ["relationships", "support", "celebration", "presence"]
    },
    {
        subject: "the people in your corner",
        intro: "thinking about the people who matter to you - whether that's family you were born into or the one you've built. sometimes we forget to notice what's actually good about having them around.",
        prompt: "what do you actually like about the people closest to you right now?",
        tags: ["family", "relationships", "support", "connection"]
    },
    {
        subject: "someone who changed how you see things",
        intro: "been thinking about how we learn stuff from people when we're not even trying to. sometimes it's the random conversations or watching someone handle something that shifts something in us.",
        prompt: "who showed you something new about life lately, even if they didn't mean to?",
        tags: ["learning", "relationships", "presence", "awareness"]
    },
    {
        subject: "nice things people say",
        intro: "sometimes we brush off compliments or forget the kind things we said to others. but those moments are actually pretty sweet when you think about them.",
        prompt: "what nice thing did someone say to you recently, or what did you tell someone that made them smile?",
        tags: ["connection", "kindness", "presence", "relationships"]
    },
    {
        subject: "real connection moments",
        intro: "sometimes the best parts of our day are those little moments when we actually connect with someone. doesn't have to be deep - just real.",
        prompt: "what moment today felt like genuine connection with another person?",
        tags: ["connection", "presence", "relationships", "mindfulness"]
    },
    {
        subject: "who gets you as you are?",
        intro: "sometimes we spend so much energy trying to be different or better that we forget about the people who already see us clearly. the ones who aren't waiting for us to change.",
        prompt: "who in your life accepts you exactly as you are right now?",
        tags: ["acceptance", "relationships", "presence", "self-worth"]
    },
    {
        subject: "when being real brought you closer",
        intro: "sometimes the scariest thing is just being honest with someone. but those moments when you drop the act and show up as you really are? they can change everything.",
        prompt: "when did being vulnerable with someone actually bring you closer together?",
        tags: ["relationships", "vulnerability", "connection", "authenticity", "presence"]
    },
    {
        subject: "someone who stuck around",
        intro: "thinking about the people who didn't rush you or make you feel like a burden when things got messy. sometimes we forget how much that quiet patience actually meant.",
        prompt: "who stayed patient with you when you needed extra time or space?",
        tags: ["relationships", "support", "patience", "presence"]
    },
    {
        subject: "what makes your friends worth it",
        intro: "been thinking about the people you actually want to text back. the ones who get it. what is it about them that makes the difference?",
        prompt: "what do you value most in your friendships?",
        tags: ["relationships", "presence", "connection"]
    },
    {
        subject: "someone who makes you want to level up",
        intro: "been thinking about the people who just make us better by being themselves. not in a pushy way, just by how they show up in the world.",
        prompt: "who in your life makes you want to be a better version of yourself?",
        tags: ["inspiration", "relationships", "personal growth", "presence"]
    },
    {
        subject: "when things finally clicked",
        intro: "sometimes we walk around with the wrong idea about something for way too long. then one day it just clicks and everything makes more sense.",
        prompt: "what did you finally understand better recently?",
        tags: ["clarity", "understanding", "mindfulness", "awareness"]
    },
    {
        subject: "someone who really heard you",
        intro: "sometimes the best gift someone can give us is just... listening. not trying to fix or judge or give advice. just being there with us.",
        prompt: "who's been that person for you lately - someone who really listened without making you feel weird about it?",
        tags: ["presence", "mindfulness", "listening", "support", "connection"]
    },
    {
        subject: "when working together felt good",
        intro: "sometimes the best things happen when we're not trying to do everything alone. thinking about those moments when teaming up with someone just clicked.",
        prompt: "what's something you worked on with someone else recently that actually felt good?",
        tags: ["collaboration", "connection", "teamwork", "joy"]
    },
    {
        subject: "thinking about who gets it",
        intro: "sometimes the people who really see what you're doing mean everything. not the ones who make a big deal about it, but the ones who just... get it.",
        prompt: "who in your life has just quietly respected where you're at without making it weird?",
        tags: ["support", "relationships", "understanding", "presence"]
    },
    {
        subject: "what draws people to you?",
        intro: "been thinking about how we connect with people. sometimes we don't even notice the things about us that make others feel comfortable or seen.",
        prompt: "what's something about you that helps you connect with people?",
        tags: ["connection", "relationships", "self-awareness", "presence"]
    },
    {
        subject: "who showed up when you needed hope?",
        intro: "sometimes hope comes from the most unexpected places. or maybe from someone who's always been there but you finally really heard them.",
        prompt: "who gave you hope when you were running low on it?",
        tags: ["support", "hope", "relationships", "presence"]
    },
    {
        subject: "something that made your heart feel full",
        intro: "sometimes people surprise us with how kind they can be. could be a stranger, a friend, or even yourself.",
        prompt: "what act of kindness actually touched you lately?",
        tags: ["compassion", "kindness", "connection", "presence"]
    },
    {
        subject: "actually enjoying alone time",
        intro: "been thinking about how being alone used to feel different than it does now. sometimes we really need that space to just be.",
        prompt: "what do you actually like about being alone sometimes?",
        tags: ["solitude", "self-awareness", "quiet moments", "presence"]
    },
    {
        subject: "that one person who gets it",
        intro: "some connections just hit different, you know? maybe it's someone who really sees you, or that friend who texts at exactly the right moment. could be anyone really.",
        prompt: "who in your life just gets it? what makes that connection feel special?",
        tags: ["connection", "relationships", "presence", "understanding"]
    },
    {
        subject: "what's growing in you lately?",
        intro: "been thinking about how we change without really noticing. like how you suddenly realize you handle things differently than you used to.",
        prompt: "what's growing in you lately that you're actually pretty grateful for?",
        tags: ["growth", "self-awareness", "change", "appreciation"]
    },
    {
        subject: "something you don't do anymore",
        intro: "been thinking about how we just... stop doing certain things without really noticing. like one day you realize you haven't spiraled about that thing in months.",
        prompt: "what's something you used to do that you just don't anymore?",
        tags: ["growth", "patterns", "change", "self-awareness"]
    },
    {
        subject: "quick check in - what's making you stronger?",
        intro: "sometimes the stuff that's hardest right now is actually building something in us. not saying it's fun, but maybe there's something there.",
        prompt: "what challenge right now is actually making you stronger, even if it doesn't feel like it?",
        tags: ["strength", "challenges", "growth", "resilience"]
    },
    {
        subject: "what's gotten easier lately?",
        intro: "recovery can feel like such slow going sometimes. but then you realize certain things just don't feel as hard anymore.",
        prompt: "what part of recovery actually feels easier now than it used to?",
        tags: ["progress", "recovery", "growth", "easier"]
    },
    {
        subject: "something clicked differently lately?",
        intro: "sometimes we see things in a completely new way and it shifts everything. like when something finally makes sense or you realize you've been looking at it all wrong.",
        prompt: "what way of thinking about something has actually changed how you live?",
        tags: ["perspective", "growth", "mindset", "change"]
    },
    {
        subject: "what hard stuff taught you something?",
        intro: "been thinking about how the tough times can be sneaky teachers. not saying they're fun or anything, but sometimes they leave us with something useful.",
        prompt: "what's something difficult that ended up teaching you something you actually use now?",
        tags: ["wisdom", "growth", "resilience", "learning"]
    },
    {
        subject: "what makes your hands happy?",
        intro: "been thinking about the stuff that just feels good to do. you know, those things where time disappears and you're just... in it.",
        prompt: "what creative thing makes you feel most like yourself?",
        tags: ["creativity", "joy", "self-expression", "flow"]
    },
    {
        subject: "something you're getting back",
        intro: "sometimes we realize we've been holding parts of ourselves back without even knowing it. maybe it's your sense of humor, your creativity, or just feeling comfortable in your own skin.",
        prompt: "what part of yourself feels like it's coming back to you?",
        tags: ["self-discovery", "reclaiming", "personal growth", "joy"]
    },
    {
        subject: "what you used to think about yourself",
        intro: "sometimes we carry these stories about who we are for way too long. then one day you catch yourself doing something that proves the old story wrong.",
        prompt: "what did you used to believe about yourself that just isn't true anymore?",
        tags: ["self-discovery", "growth", "beliefs", "change"]
    },
    {
        subject: "something that's gotten better",
        intro: "healing doesn't always look dramatic. sometimes it's just noticing that something hurts less than it used to, or that you sleep better now.",
        prompt: "what's actually gotten better for you lately?",
        tags: ["healing", "progress", "self-awareness"]
    },
    {
        subject: "what's feeling lighter lately?",
        intro: "sometimes the best thing we can do is stop holding on so tight. letting go isn't giving up - it's making room for what actually matters.",
        prompt: "what are you finally okay with releasing?",
        tags: ["letting go", "release", "lightness", "freedom"]
    },
    {
        subject: "that thing that surprised you about yourself",
        intro: "sometimes the hard stuff shows us parts of ourselves we didn't know were there. like when you're going through it and suddenly you're handling things in ways that surprise you.",
        prompt: "what part of you turned out to be tougher than you expected?",
        tags: ["resilience", "self-discovery", "inner strength", "growth"]
    },
    {
        subject: "what are you being gentle with?",
        intro: "sometimes we're so focused on fixing ourselves that we forget to actually take care of ourselves. there's a difference, you know?",
        prompt: "what part of you are you being extra gentle with lately?",
        tags: ["self-care", "gentleness", "personal growth", "kindness"]
    },
    {
        subject: "what's changing in your world?",
        intro: "sometimes change happens so slowly we don't even notice it. but when you really look, there's probably something shifting.",
        prompt: "what's different about you or your life lately, even in small ways?",
        tags: ["transformation", "growth", "change", "self-awareness"]
    },
    {
        subject: "something you're finally okay with",
        intro: "sometimes we fight parts of ourselves for way too long. then one day we just... stop. and it's actually kind of freeing.",
        prompt: "what's something about yourself you used to fight but now you're just like, okay, this is me?",
        tags: ["self-acceptance", "authenticity", "personal growth"]
    },
    {
        subject: "something that's getting better",
        intro: "healing isn't always this big dramatic thing. sometimes it's just noticing that something doesn't hurt quite as much as it used to.",
        prompt: "what's hurting less these days?",
        tags: ["healing", "progress", "pain", "recovery"]
    },
    {
        subject: "who are you turning into?",
        intro: "been thinking about how we're all kind of becoming someone new all the time. sometimes it's obvious, sometimes it sneaks up on us.",
        prompt: "what version of yourself are you turning into lately?",
        tags: ["growth", "self-discovery", "identity", "becoming"]
    },
    {
        subject: "what's got you curious lately?",
        intro: "sometimes when things feel heavy, it's hard to imagine anything good coming. but then something shifts and you catch yourself thinking 'what if...' in a good way.",
        prompt: "what possibility has you a little excited right now?",
        tags: ["possibility", "excitement", "future", "hope"]
    },
    {
        subject: "what's been hiding in there?",
        intro: "sometimes we surprise ourselves. like when you're in a tough spot and something inside just kicks in - maybe patience you didn't know you had, or this weird calm that shows up.",
        prompt: "what part of yourself have you discovered lately that you didn't know was there?",
        tags: ["inner strength", "self discovery", "personal growth", "resilience"]
    },
    {
        subject: "that uncomfortable growth thing",
        intro: "sometimes the stuff that makes us squirm is exactly what we needed. like when you finally had that hard conversation or tried something that scared you a little.",
        prompt: "what growth happened because you got uncomfortable?",
        tags: ["growth", "comfort zone", "courage", "change"]
    },
    {
        subject: "what story are you done with?",
        intro: "some stories we tell ourselves just stop fitting. maybe they never really did. sometimes the best part of moving forward is realizing you don't have to keep that old narrative going.",
        prompt: "what story about yourself are you finally ready to let go of?",
        tags: ["self-reflection", "growth", "letting go", "identity"]
    },
    {
        subject: "what new thing are you getting into?",
        intro: "been thinking about how we're always changing, picking up new things. sometimes without even realizing it. like suddenly you're the person who knows about plants or makes really good coffee.",
        prompt: "what new thing have you been drawn to lately? maybe something you never thought you'd be into?",
        tags: ["growth", "curiosity", "self-discovery", "interests"]
    },
    {
        subject: "feeling like yourself lately?",
        intro: "been thinking about how we change and grow, and sometimes we get closer to who we actually are. like when you realize you're not pretending as much anymore.",
        prompt: "what part of you feels most real these days?",
        tags: ["authenticity", "identity", "self-discovery", "joy"]
    },
    {
        subject: "something just clicked",
        intro: "you know that feeling when something that used to confuse you suddenly makes sense? like when the fog clears and you can actually see what's in front of you.",
        prompt: "what finally started making sense to you?",
        tags: ["clarity", "understanding", "growth", "insight"]
    },
    {
        subject: "that brave thing you did",
        intro: "been thinking about how we do brave stuff all the time without really noticing. like those moments when you just... went for it, even though it felt scary.",
        prompt: "what's something you did recently that took guts, even if it seemed small?",
        tags: ["courage", "bravery", "personal growth", "self recognition"]
    },
    {
        subject: "what's making you proud lately?",
        intro: "sometimes we're so focused on what's next that we forget to look at how far we've come. like actually look at it.",
        prompt: "what part of your journey are you proud of right now?",
        tags: ["progress", "self-reflection", "personal-growth"]
    },
    {
        subject: "that moment when it clicked",
        intro: "sometimes there's this moment where everything just shifts. maybe it was tiny, maybe it was huge. but something broke open in a good way.",
        prompt: "what moment made you think 'oh, I actually can do this'?",
        tags: ["breakthrough", "confidence", "growth", "realization"]
    },
    {
        subject: "what's starting to feel possible?",
        intro: "new beginnings don't have to be huge life changes. sometimes it's just trying something small or letting yourself think differently about what could happen.",
        prompt: "what's one thing you're starting to let yourself hope for or try?",
        tags: ["new beginnings", "hope", "possibilities", "joy"]
    },
    {
        subject: "something clicked inside",
        intro: "sometimes the biggest changes start really small and internal. like when your mindset shifts just a little and suddenly everything else starts moving too.",
        prompt: "what changed in how you think or feel that opened up new possibilities?",
        tags: ["internal shifts", "mindset", "possibilities", "growth"]
    },
    {
        subject: "something just clicked for you",
        intro: "sometimes life teaches us things the hard way. but then suddenly something makes sense that never did before.",
        prompt: "what do you get now that you totally didn't before?",
        tags: ["understanding", "growth", "clarity", "learning"]
    },
    {
        subject: "what's possible for you right now?",
        intro: "sometimes we get so focused on what we're fixing that we forget what we're building. like, what if you're already becoming something pretty good?",
        prompt: "what do you think you could be really good at if you kept going?",
        tags: ["potential", "growth", "self-belief", "future"]
    },
    {
        subject: "what did you actually notice today?",
        intro: "sometimes we're so in our heads we miss what's right there. today felt like a good day to check in with what you actually saw, heard, or felt.",
        prompt: "what's one thing you noticed with your senses today that you might have missed if you weren't paying attention?",
        tags: ["mindfulness", "present moment", "senses", "nature", "awareness"]
    },
    {
        subject: "when did you actually stop and notice?",
        intro: "it's so easy to walk through the day half-paying attention. but sometimes something outside catches us and we're just... there.",
        prompt: "what moment outside made you stop scrolling in your head and actually be present?",
        tags: ["presence", "mindfulness", "nature", "outdoors", "awareness"]
    },
    {
        subject: "the little things that hit different",
        intro: "sometimes the best moments are the ones that just happen. no big plans, no expectations. just something simple that made you pause.",
        prompt: "what's one small thing that felt really good today?",
        tags: ["simple pleasures", "present moment", "nature", "outdoors", "mindfulness"]
    },
    {
        subject: "what pulled you back",
        intro: "sometimes our minds are everywhere except right here. but something always brings us back - a sound, a feeling, maybe just noticing our breath.",
        prompt: "what brought you back to right now today?",
        tags: ["mindfulness", "present moment", "grounding", "awareness"]
    },
    {
        subject: "what caught your eye today?",
        intro: "sometimes beauty shows up in the weirdest places. maybe it was the way the light hit your coffee cup, or how that tree looked different than yesterday.",
        prompt: "what made you stop and look today?",
        tags: ["beauty", "observation", "mindfulness", "nature"]
    },
    {
        subject: "what caught your senses today?",
        intro: "sometimes the smallest things hit different. a sound that made you stop, a smell that brought you somewhere else, or just the way something felt under your fingers.",
        prompt: "what sound, smell, or texture made you pause today?",
        tags: ["senses", "mindfulness", "nature", "present moment"]
    },
    {
        subject: "that one breath",
        intro: "sometimes it's just one moment when everything slows down. maybe you were outside, maybe you weren't. but something shifted when you breathed.",
        prompt: "what breath actually made you feel more okay?",
        tags: ["breath", "peace", "mindfulness", "nature", "outdoors", "calm"]
    },
    {
        subject: "finding quiet moments",
        intro: "sometimes the best parts of being outside aren't the big adventure moments. it's those little pockets of quiet that catch you off guard.",
        prompt: "what quiet moment outside made you stop and just breathe?",
        tags: ["stillness", "nature", "mindfulness", "peace"]
    },
    {
        subject: "what broke the worry spiral?",
        intro: "you know that thing where your brain gets stuck spinning about what might happen? sometimes something just snaps us out of it. could be anything really.",
        prompt: "what pulled you out of worry about the future?",
        tags: ["worry", "anxiety", "present moment", "mindfulness", "nature"]
    },
    {
        subject: "letting go of old stuff",
        intro: "sometimes our minds get stuck on repeat with old stories. but then something helps us drop it and come back to right now.",
        prompt: "what helped you stop thinking about something from your past?",
        tags: ["letting go", "mindfulness", "nature", "present moment"]
    },
    {
        subject: "what helped you feel steady today?",
        intro: "sometimes we need something to bring us back to ourselves. could be a walk, could be just sitting outside for a minute.",
        prompt: "what did you do today that made you feel more grounded?",
        tags: ["mindfulness", "grounding", "nature", "self-care"]
    },
    {
        subject: "what helped you hit pause today?",
        intro: "some days everything feels like it's moving too fast. but then something shifts and you actually get to breathe for a minute.",
        prompt: "what helped you slow down today?",
        tags: ["mindfulness", "pace", "nature", "present moment"]
    },
    {
        subject: "what's good right now?",
        intro: "sometimes we're so busy thinking about what's next or what went wrong that we miss what's actually happening. right now has its own little gifts if we look.",
        prompt: "what's one thing about this exact moment that you're glad is happening?",
        tags: ["present moment", "awareness", "nature", "mindfulness"]
    },
    {
        subject: "something small you noticed",
        intro: "sometimes the tiny things are what stick with us. like the way light hits a puddle or how quiet it gets right before it rains.",
        prompt: "what little thing outside caught your eye recently?",
        tags: ["nature", "mindfulness", "small moments", "observation"]
    },
    {
        subject: "what felt good today?",
        intro: "sometimes our bodies just know what we need. maybe it was the sun on your face or cold water on your hands. the little things that made you pause.",
        prompt: "what did you feel today that actually calmed you down?",
        tags: ["sensory", "nature", "calm", "present moment"]
    },
    {
        subject: "quick check-in about staying present",
        intro: "been thinking about how nature has this way of pulling us back to right now. like when you're outside and suddenly you're just... here.",
        prompt: "what's one thing you do that brings you back to the moment?",
        tags: ["mindfulness", "presence", "nature", "grounding"]
    },
    {
        subject: "quick check in - what shifted today?",
        intro: "sometimes it's the smallest thing that changes everything. like suddenly noticing the light is different, or hearing birds you didn't realize were there.",
        prompt: "what moment today made you feel different - even just a little?",
        tags: ["awareness", "mood", "mindfulness", "nature", "present moment"]
    },
    {
        subject: "what actually tasted good today?",
        intro: "sometimes we eat without really tasting anything. but today maybe there was a moment when you actually noticed what you were eating or drinking.",
        prompt: "what did you actually taste today that made you slow down for a second?",
        tags: ["mindful eating", "present moment", "senses", "daily life"]
    },
    {
        subject: "what caught your eye today?",
        intro: "sometimes nature just hits different, you know? like when you actually stop and notice something instead of just walking by.",
        prompt: "what's something in nature that made you pause recently?",
        tags: ["nature", "outdoors", "mindfulness", "present moment"]
    },
    {
        subject: "that perfect moment thing",
        intro: "you know those moments when everything just felt right? when you weren't wishing you were somewhere else or that things were different. just like, yeah, this is good.",
        prompt: "what moment recently felt perfect exactly as it was?",
        tags: ["present moment", "nature", "contentment", "mindfulness"]
    },
    {
        subject: "what gave you a minute to breathe?",
        intro: "sometimes the best reset is just stopping for a second. doesn't have to be formal meditation or anything fancy.",
        prompt: "what moment outside made you feel like you could actually breathe again?",
        tags: ["nature", "mindfulness", "pause", "outdoors", "reset"]
    },
    {
        subject: "what did you let go of today?",
        intro: "sometimes the best part of being outside is leaving the noise behind. even for a few minutes.",
        prompt: "what distraction did you actually put down today?",
        tags: ["letting go", "nature", "mindfulness", "digital detox"]
    },
    {
        subject: "quick check-in about feeling alive",
        intro: "been thinking about those moments when your body just reminds you that you're here. like really here. could be anything - cold air hitting your face or that first sip of coffee.",
        prompt: "what did your body feel today that made you remember you're alive?",
        tags: ["embodiment", "presence", "nature", "sensory"]
    },
    {
        subject: "that boring thing that actually mattered",
        intro: "sometimes the stuff we do on autopilot turns out to mean more than we thought. like when washing dishes becomes this quiet moment, or walking to the mailbox feels like a tiny adventure.",
        prompt: "what boring thing you do regularly actually ended up meaning something to you?",
        tags: ["mindfulness", "daily life", "routine", "meaning"]
    },
    {
        subject: "something that caught your eye today",
        intro: "sometimes the smallest things stop us in our tracks. maybe it was the way light hit a puddle or how a dog tilted its head. those little moments when we actually notice stuff.",
        prompt: "what's something you saw recently that made you pause and think 'huh, that's nice'?",
        tags: ["observation", "nature", "mindfulness", "outdoors"]
    },
    {
        subject: "what got you back in your body?",
        intro: "sometimes we float around in our heads all day. but then something pulls us back down into ourselves, into feeling present.",
        prompt: "what brought you back into your body today?",
        tags: ["embodiment", "presence", "grounding", "nature"]
    },
    {
        subject: "this moment right here",
        intro: "sometimes we're so busy chasing the next thing that we miss what's actually happening right now. nature has this way of pulling us back to what's real.",
        prompt: "what made you stop and think 'okay, this is actually pretty good'?",
        tags: ["presence", "contentment", "nature", "mindfulness"]
    },
    {
        subject: "what caught your eye today?",
        intro: "sometimes we're so busy getting from point a to point b that we miss everything in between. but today something probably grabbed your attention, even for just a second.",
        prompt: "what did you actually notice today that you usually walk right past?",
        tags: ["awareness", "nature", "mindfulness", "present moment"]
    },
    {
        subject: "quick check in about finding peace",
        intro: "sometimes we get so busy we forget to actually create moments where we can breathe. but you probably did it without even realizing.",
        prompt: "what's a quiet moment you made for yourself recently?",
        tags: ["peace", "self-care", "mindfulness", "nature", "outdoors"]
    },
    {
        subject: "what let you just exist today?",
        intro: "sometimes we get caught up trying to do everything right. but there are moments when something just lets us drop all that and be here.",
        prompt: "what invited you to just be today?",
        tags: ["presence", "being", "nature", "stillness"]
    },
    {
        subject: "what made you smile today?",
        intro: "some days joy shows up in big ways, other days it's just tiny moments that catch you off guard. both count.",
        prompt: "what made you feel a little spark of joy today?",
        tags: ["joy", "daily moments", "freedom", "present moment"]
    },
    {
        subject: "what made today feel a little lighter?",
        intro: "some days feel heavy, but there's usually something small that gives us a break from all that. maybe it was laughing at something dumb or finally getting through that thing you'd been avoiding.",
        prompt: "what brought lightness to your day?",
        tags: ["lightness", "daily moments", "freedom", "relief"]
    },
    {
        subject: "when did you actually have fun lately?",
        intro: "sometimes we get so focused on all the heavy stuff that we forget to notice the good moments. the silly ones, the light ones, the times when we actually felt like ourselves.",
        prompt: "what made you laugh or smile without trying lately?",
        tags: ["play", "joy", "lightness", "freedom"]
    },
    {
        subject: "what made you feel most like yourself?",
        intro: "thinking about times when you felt really alive lately. not just happy or content, but like genuinely lit up from the inside. could be anything - big or small.",
        prompt: "what made you feel most like yourself this week?",
        tags: ["freedom", "independence", "vitality", "authenticity"]
    },
    {
        subject: "what made you smile recently?",
        intro: "sometimes the best stuff is hiding in plain sight. like that song you forgot you loved or how good coffee actually tastes when you're not rushing.",
        prompt: "what simple thing brought you joy that you'd kind of forgotten about?",
        tags: ["rediscovery", "simple pleasures", "freedom", "present moment"]
    },
    {
        subject: "what made you feel like celebrating?",
        intro: "sometimes the best moments are the ones that just make you want to do a little victory dance. or maybe just smile to yourself.",
        prompt: "what happened recently that made you feel like celebrating, even in a small way?",
        tags: ["celebration", "joy", "wins", "freedom"]
    },
    {
        subject: "what made you smile today?",
        intro: "sometimes beauty hits different when you're finding your way back to yourself. could be anything - a song, the way light hit your wall, someone's laugh.",
        prompt: "what beautiful thing caught your attention today and made you feel a little lighter?",
        tags: ["beauty", "mood", "present moment", "freedom"]
    },
    {
        subject: "what actually gave you energy lately?",
        intro: "been thinking about the stuff that actually fills us up instead of drains us. you know how some things just hit different when you really need them.",
        prompt: "what hobby or thing you did recently actually gave you energy back?",
        tags: ["energy", "hobbies", "self-care", "freedom", "activities"]
    },
    {
        subject: "what hit different today?",
        intro: "thinking about this whole sober thing lately. sometimes it's the random moments that remind you why this matters.",
        prompt: "what made you feel grateful to be sober today?",
        tags: ["sobriety", "freedom", "daily_moments"]
    },
    {
        subject: "something good catch you off guard?",
        intro: "sometimes the best stuff happens when we're not even looking for it. those little moments that just show up and make you smile.",
        prompt: "what good thing happened that you totally weren't expecting?",
        tags: ["surprise", "unexpected", "joy", "moments"]
    },
    {
        subject: "when did you feel most like yourself lately?",
        intro: "been thinking about those moments when we feel most free - like when something just clicks and you remember who you are underneath all the stuff. you know?",
        prompt: "what made you feel most like yourself this week?",
        tags: ["freedom", "authenticity", "self-discovery", "independence"]
    },
    {
        subject: "what's been moving you lately?",
        intro: "been thinking about how creativity can feel like freedom sometimes. like when a song hits just right or you see something that makes you stop. curious what's been doing that for you.",
        prompt: "what music, art, or creativity has been speaking to you lately?",
        tags: ["creativity", "inspiration", "freedom", "self-expression"]
    },
    {
        subject: "soaking up the good stuff",
        intro: "been thinking about how the little moments of warmth can feel like freedom sometimes. like when the sun hits just right or you catch a perfect breeze.",
        prompt: "what moment of warmth or light made you feel a little more free lately?",
        tags: ["freedom", "independence", "warmth", "light", "moments"]
    },
    {
        subject: "what made you laugh lately?",
        intro: "laughter hits different when you're not carrying so much weight around. it's like this lightness that just bubbles up when you least expect it.",
        prompt: "what made you actually laugh recently?",
        tags: ["joy", "connection", "lightness", "present moment"]
    },
    {
        subject: "something you can do now",
        intro: "thinking about how things have shifted for you lately. sometimes we don't notice the small freedoms that creep back in.",
        prompt: "what's something you can do now that you couldn't before?",
        tags: ["freedom", "independence", "progress", "change"]
    },
    {
        subject: "what caught your eye today?",
        intro: "sometimes the smallest things grab our attention for reasons we can't quite explain. maybe it's our brain taking a little break, or maybe we're just more open to noticing stuff.",
        prompt: "what color, flower, or something blooming made you pause today?",
        tags: ["noticing", "present moment", "nature", "awareness"]
    },
    {
        subject: "what's got you excited lately?",
        intro: "sometimes we get so caught up in the heavy stuff that we forget to notice the good anticipation. like that flutter when something you're actually looking forward to crosses your mind.",
        prompt: "what's got you excited lately, even if it's something small?",
        tags: ["excitement", "anticipation", "freedom", "independence", "looking forward"]
    },
    {
        subject: "what felt effortless today?",
        intro: "sometimes the best moments are when things just work. when you're not forcing anything and stuff flows naturally.",
        prompt: "what brought ease and flow today?",
        tags: ["ease", "flow", "natural", "freedom"]
    },
    {
        subject: "what came easy today?",
        intro: "sometimes we're so focused on what's hard that we miss the stuff that just... flows. the things that felt natural, like you weren't even trying.",
        prompt: "what felt effortless and natural today?",
        tags: ["ease", "flow", "natural", "freedom"]
    },
    {
        subject: "what's making you smile these days?",
        intro: "recovery can surprise you sometimes. like suddenly you're laughing at something that used to stress you out, or finding yourself actually excited about random tuesday mornings.",
        prompt: "what's something that brings you joy now that you didn't even notice before?",
        tags: ["joy", "discovery", "freedom", "present moment", "awareness"]
    },
    {
        subject: "something you tried just for fun",
        intro: "sometimes the best things happen when we're just messing around with no pressure. like when you try something random just to see what happens.",
        prompt: "what random thing did you try lately just because you could?",
        tags: ["freedom", "independence", "playfulness", "experimentation"]
    },
    {
        subject: "what made you feel young again?",
        intro: "sometimes we get so caught up in being responsible adults that we forget what it feels like to just... be. today I'm thinking about those moments that bring back that lighter feeling.",
        prompt: "what made you feel young again recently?",
        tags: ["freedom", "independence", "playfulness", "joy", "lightness"]
    },
    {
        subject: "what's giving you hope lately?",
        intro: "sometimes hope feels big and dramatic, but usually it's smaller than that. like noticing something good might actually happen, or feeling a little less stuck than yesterday.",
        prompt: "what's giving you hope lately?",
        tags: ["hope", "optimism", "forward-looking", "freedom"]
    },
    {
        subject: "what made your body feel good lately?",
        intro: "sometimes we forget to notice when our body actually feels good. maybe it was stretching in bed, walking somewhere, or just moving in a way that felt right.",
        prompt: "what movement or energy felt good in your body recently?",
        tags: ["body", "movement", "freedom", "physical"]
    },
    {
        subject: "what made things feel lighter?",
        intro: "sometimes it's the smallest things that shift how we see everything. like when something clicks or when you realize you're not as stuck as you thought.",
        prompt: "what made things feel a little lighter lately?",
        tags: ["perspective", "lightness", "small wins", "freedom"]
    },
    {
        subject: "what made you feel like a kid again?",
        intro: "sometimes freedom shows up in the weirdest ways. like when something simple hits different and you remember what it felt like to just... wonder about stuff.",
        prompt: "what made you feel curious or amazed recently, even for just a second?",
        tags: ["wonder", "curiosity", "inner child", "freedom", "simplicity"]
    },
    {
        subject: "something beautiful you saw happen",
        intro: "sometimes the best moments are the ones we just get to watch. when someone else is happy, really happy, and you're there for it.",
        prompt: "what moment of pure joy did you get to witness recently?",
        tags: ["witness", "joy", "connection", "freedom"]
    },
    {
        subject: "what felt like a gift today?",
        intro: "some days the gifts are obvious - like finding money in your pocket. other days they're quieter, like having nowhere you have to be.",
        prompt: "what felt like a gift today?",
        tags: ["gifts", "present moment", "appreciation"]
    },
    {
        subject: "what's actually going well?",
        intro: "sometimes when life feels heavy, we forget to notice what's actually working. like, the stuff that's just quietly there being good.",
        prompt: "what's one thing in your life right now that feels like enough?",
        tags: ["abundance", "contentment", "present moment", "enough"]
    },
    {
        subject: "what caught your eye today?",
        intro: "sometimes the best stuff is hiding in plain sight. could be anything - light hitting your coffee cup weird, someone's laugh, the way your dog stretches.",
        prompt: "what little thing had some sparkle to it today?",
        tags: ["noticing", "present moment", "small joys", "awareness"]
    },
    {
        subject: "quick check-in about joy",
        intro: "sometimes happiness just shows up out of nowhere, you know? like when you're doing something totally ordinary and suddenly you feel this lightness.",
        prompt: "what made you feel genuinely happy recently, even if it was small?",
        tags: ["happiness", "joy", "small moments", "freedom"]
    },
    {
        subject: "what strength showed up today?",
        intro: "sometimes we're stronger than we realize in the moment. like when you handled something that would've wrecked you before, or just kept going when things got weird.",
        prompt: "what strength did you actually use today, even if it felt small?",
        tags: ["strength", "daily reflection", "abundance", "harvest"]
    },
    {
        subject: "that time you didn't back down",
        intro: "sometimes we surprise ourselves with how we handle the hard stuff. like when everything felt impossible but you showed up anyway.",
        prompt: "what's something scary you did anyway?",
        tags: ["courage", "challenges", "growth", "resilience"]
    },
    {
        subject: "something that surprised you about yourself",
        intro: "been thinking about how we're tougher than we think we are. like how you can handle way more than you expected. sometimes the hard stuff teaches us things we didn't know we had in us.",
        prompt: "what part of you turned out to be stronger than you thought?",
        tags: ["resilience", "strength", "self-discovery", "growth"]
    },
    {
        subject: "something tough you made it through",
        intro: "october's been a month of looking at what we've gathered - the good stuff and the hard stuff too. sometimes the things that were really difficult to get through taught us something or made space for something better.",
        prompt: "what's something difficult you navigated recently that you're actually glad you went through?",
        tags: ["growth", "resilience", "challenges", "harvest", "lessons learned"]
    },
    {
        subject: "that thing you didn't give up on",
        intro: "sometimes we keep going without even noticing how much we've stuck with something. maybe it's messy, maybe it's slow, but you're still here doing it.",
        prompt: "what's something you've kept showing up for, even when it got hard?",
        tags: ["perseverance", "persistence", "showing up", "abundance", "harvest"]
    },
    {
        subject: "something that bounced back",
        intro: "we all hit walls sometimes. but then somehow we find our way around them or through them. thinking about those moments when things turned around.",
        prompt: "what's something that went sideways but you figured out anyway?",
        tags: ["resilience", "recovery", "problem-solving", "growth"]
    },
    {
        subject: "what kept you going?",
        intro: "sometimes we surprise ourselves with how we push through stuff. thinking about the past few months, there was probably something that helped you not give up.",
        prompt: "what actually kept you going when things got hard?",
        tags: ["resilience", "support", "strength", "perseverance"]
    },
    {
        subject: "that person who showed up",
        intro: "thinking about the times when things felt heavy. there's usually someone who made it a little lighter, even in small ways.",
        prompt: "who showed up for you when you really needed it?",
        tags: ["support", "relationships", "hard times", "harvest"]
    },
    {
        subject: "what hard stuff taught you something good?",
        intro: "sometimes the worst things end up teaching us the most useful stuff. not saying it was worth it or anything, just that we learned something along the way.",
        prompt: "what's something difficult you went through that actually taught you something you're glad to know now?",
        tags: ["growth", "resilience", "lessons", "adversity", "harvest"]
    },
    {
        subject: "something you made it through",
        intro: "sometimes I look back and can't believe I actually got through certain things. like, there was a time when it felt completely impossible, but somehow here I am.",
        prompt: "what did you survive that once felt like it would break you?",
        tags: ["resilience", "survival", "looking back", "strength"]
    },
    {
        subject: "what surprised you about yourself lately?",
        intro: "been thinking about how we surprise ourselves sometimes. like when something hard happens and we handle it better than expected, or we find ourselves doing things we didn't think we could.",
        prompt: "what inner strength showed up for you recently that maybe you didn't even know you had?",
        tags: ["inner strength", "self-discovery", "resilience", "abundance"]
    },
    {
        subject: "something that used to trip you up",
        intro: "funny how the stuff that used to mess with us can end up being our thing. like maybe you were too sensitive and now that's actually your superpower.",
        prompt: "what used to feel like a weakness that you're kind of grateful for now?",
        tags: ["growth", "strength", "self-acceptance", "harvest"]
    },
    {
        subject: "what did you push through today?",
        intro: "some days feel like climbing uphill. but you made it through today, and that counts for something. there's always at least one thing we had to work through or get past.",
        prompt: "what did you push through or get past today, even if it was small?",
        tags: ["resilience", "daily wins", "overcoming", "strength"]
    },
    {
        subject: "that time you didn't give up",
        intro: "sometimes we surprise ourselves with how much we can handle. like when everything felt impossible but somehow we kept going anyway.",
        prompt: "what's something you stuck with even when it got really hard?",
        tags: ["resilience", "persistence", "growth", "harvest"]
    },
    {
        subject: "looking back at how far you've come",
        intro: "sometimes we're so focused on what's next that we forget to actually notice the ground we've covered. like when you're climbing and you finally turn around to see the view.",
        prompt: "what reminded you how far you've come?",
        tags: ["progress", "reflection", "growth", "harvest"]
    },
    {
        subject: "what made you feel like you could handle it?",
        intro: "sometimes we surprise ourselves with what we can actually do. maybe it was something small, maybe something big. either way counts.",
        prompt: "what made you feel like you could handle it?",
        tags: ["capability", "confidence", "strength", "abundance", "harvest"]
    },
    {
        subject: "what helped you get back up?",
        intro: "we all have those moments when everything feels heavy. then somehow we find our way back. maybe it was something small, maybe something you didn't even notice at the time.",
        prompt: "what helped you bounce back from something hard recently?",
        tags: ["resilience", "recovery", "support", "strength"]
    },
    {
        subject: "that tough call you made",
        intro: "sometimes the hardest decisions end up showing us what we're made of. thinking about a choice that felt impossible at the time but maybe taught you something about yourself.",
        prompt: "what hard decision did you make that turned out to show you how strong you actually are?",
        tags: ["strength", "decisions", "growth", "resilience"]
    },
    {
        subject: "thinking about the tough stuff",
        intro: "been thinking about how we all go through some rough patches. sometimes the hardest times end up showing us what we're made of.",
        prompt: "what's something hard you made it through that you're kind of proud of surviving?",
        tags: ["resilience", "growth", "storms", "strength"]
    },
    {
        subject: "what fighter came out in you?",
        intro: "sometimes we surprise ourselves with how much we can handle. like when life gets messy and suddenly there's this part of you that just shows up.",
        prompt: "what fighter came out in you that you didn't know was there?",
        tags: ["strength", "resilience", "self-discovery", "abundance"]
    },
    {
        subject: "the grit you didn't know you had",
        intro: "sometimes we surprise ourselves with how much we can handle. like when things got hard and somehow you just... kept going.",
        prompt: "what part of you turned out to be tougher than you thought?",
        tags: ["resilience", "strength", "self-discovery", "harvest"]
    },
    {
        subject: "what kept you going?",
        intro: "sometimes we don't realize what's actually carrying us through until we stop and look back. the small things, the routines, the people who showed up.",
        prompt: "what helped you keep going when things got hard?",
        tags: ["resilience", "support", "strength", "endurance", "harvest"]
    },
    {
        subject: "the fight in you",
        intro: "sometimes we need to give ourselves credit for not giving up. for showing up even when it's hard. there's something worth noticing about the parts of you that kept going.",
        prompt: "what fight in you are you actually proud of?",
        tags: ["resilience", "inner strength", "perseverance", "harvest"]
    },
    {
        subject: "something that turned out to be a gift",
        intro: "sometimes the hardest stuff ends up being what grows us most. like when something really sucked at the time but now you can see how it changed you.",
        prompt: "what hard thing actually made you stronger or wiser?",
        tags: ["growth", "resilience", "perspective", "harvest"]
    },
    {
        subject: "what kept you going?",
        intro: "some days you just keep moving even when it's hard. maybe you don't even notice it in the moment, but something inside you doesn't give up.",
        prompt: "what part of you kept pushing forward when things got tough?",
        tags: ["resilience", "inner strength", "perseverance", "self-awareness"]
    },
    {
        subject: "the thing you wouldn't let go of",
        intro: "sometimes the most important thing we do is just... not quit. even when everything feels impossible. thinking about what kept you going.",
        prompt: "what's something you refused to give up on, even when it got really hard?",
        tags: ["persistence", "resilience", "not giving up", "harvest", "strength"]
    },
    {
        subject: "something finally clicked",
        intro: "you know that thing you kept trying even when it felt pointless? sometimes sticking with stuff actually works out. weird how that happens.",
        prompt: "what's something you kept doing that finally paid off?",
        tags: ["persistence", "patience", "results", "harvest"]
    },
    {
        subject: "that mental muscle you didn't know you had",
        intro: "sometimes we surprise ourselves with how much we can handle. like that thing in your brain just clicked into a different gear and suddenly you're dealing with stuff that would've broken you before.",
        prompt: "what part of your mind got tougher this year?",
        tags: ["resilience", "growth", "mental strength", "harvest"]
    },
    {
        subject: "what got you through?",
        intro: "been thinking about how we all have this quiet strength that shows up when we need it most. sometimes we don't even notice it until later.",
        prompt: "what part of you has been tougher than you realized?",
        tags: ["strength", "resilience", "self-awareness", "harvest"]
    },
    {
        subject: "the part of you that won't break",
        intro: "sometimes we surprise ourselves with how much we can handle. like there's this core part that just... stays solid no matter what gets thrown at it.",
        prompt: "what part of you turned out to be unbreakable?",
        tags: ["strength", "resilience", "self-discovery", "harvest"]
    },
    {
        subject: "what feels different now?",
        intro: "been thinking about how things shift when we're not drinking. sometimes it's the big stuff, but a lot of times it's these small freedoms we didn't even know we were missing.",
        prompt: "what can you do now that you couldn't (or wouldn't) do when you were drinking?",
        tags: ["freedom", "sobriety", "changes", "abundance"]
    },
    {
        subject: "what's yours now?",
        intro: "been thinking about how things shift over time. sometimes we don't notice we're doing stuff on our own until someone points it out.",
        prompt: "what's something you handle yourself now that you couldn't before?",
        tags: ["independence", "growth", "self-reliance", "reflection"]
    },
    {
        subject: "what feels lighter now?",
        intro: "sometimes freedom isn't this big dramatic thing. sometimes it's just noticing that something that used to weigh you down... doesn't anymore.",
        prompt: "what feels lighter in your life right now?",
        tags: ["freedom", "relief", "letting go", "transition"]
    },
    {
        subject: "something that lost its grip",
        intro: "transitions are weird. you're not the same person you were a year ago, or even a few months ago. some things that used to run your life just... don't anymore.",
        prompt: "what no longer controls you?",
        tags: ["freedom", "growth", "letting_go", "transition"]
    },
    {
        subject: "choices you have now",
        intro: "sometimes we get so caught up in what we can't control that we miss what we actually can. thinking about where you are right now.",
        prompt: "what choice do you have now that you didn't see before?",
        tags: ["choices", "awareness", "present moment", "empowerment"]
    },
    {
        subject: "thinking about your choices lately",
        intro: "december's got me thinking about all the ways we get to choose our own path. sometimes we don't even notice how much more control we have over our lives than we used to.",
        prompt: "what's something you get to decide for yourself now that feels really good?",
        tags: ["autonomy", "choice", "freedom", "reflection", "growth"]
    },
    {
        subject: "what you can count on yourself for now",
        intro: "thinking about how much has shifted lately. sometimes we don't notice how we've gotten better at handling things on our own.",
        prompt: "what can you count on yourself for now that you couldn't before?",
        tags: ["self-reliance", "growth", "reflection", "transition"]
    },
    {
        subject: "what old stuff did you finally drop?",
        intro: "you know those things you used to do that didn't really work for you? the habits or ways of thinking that kept you stuck. sometimes we don't even notice when we stop doing them.",
        prompt: "what old pattern or habit are you glad you don't do anymore?",
        tags: ["patterns", "change", "reflection", "growth"]
    },
    {
        subject: "what's actually in your control?",
        intro: "sometimes it feels like everything's happening to us. but when you really look at it, there's usually more in your hands than it seems at first.",
        prompt: "what part of your life do you actually get to steer?",
        tags: ["control", "agency", "reflection", "empowerment", "transition"]
    },
    {
        subject: "what lost its grip on you?",
        intro: "sometimes we don't even notice when something that used to control us just... doesn't anymore. like one day you realize you haven't thought about it in weeks.",
        prompt: "what addiction or habit doesn't have the same hold on you that it used to?",
        tags: ["addiction", "recovery", "letting go", "reflection", "progress"]
    },
    {
        subject: "that mental clarity you've been noticing",
        intro: "you know those moments when your head feels clear? when thoughts aren't all jumbled up and you can actually think straight? those moments count.",
        prompt: "what's it like when your mind feels clear these days?",
        tags: ["mental clarity", "reflection", "mindfulness", "present moment"]
    },
    {
        subject: "what's steering you these days?",
        intro: "feels like there's this quiet shift happening, you know? like you're not just reacting to stuff anymore. there's this sense of knowing what you actually want.",
        prompt: "what's steering you these days? what feels like your internal compass right now?",
        tags: ["self-direction", "reflection", "transition", "growth", "intuition"]
    },
    {
        subject: "what choices actually feel like yours?",
        intro: "been thinking about how wild it is when you realize you're finally making decisions that feel right for you. not what someone else wants or what you think you should do.",
        prompt: "what choice did you make recently that just felt... yours?",
        tags: ["decisions", "autonomy", "relief", "reflection"]
    },
    {
        subject: "what's making you feel more like yourself?",
        intro: "been thinking about how we grow into ourselves, especially when things are shifting. sometimes power doesn't look like what we expected.",
        prompt: "what's making you feel more like yourself lately?",
        tags: ["empowerment", "identity", "growth", "transition"]
    },
    {
        subject: "what are you letting go of?",
        intro: "shame has this way of sticking around way longer than it should. like that friend who overstays their welcome. sometimes we don't even notice when it finally starts to loosen its grip.",
        prompt: "what shame are you starting to put down that used to feel so heavy?",
        tags: ["reflection", "transition", "shame", "letting go", "healing"]
    },
    {
        subject: "the choices that surprised you",
        intro: "sometimes we don't even notice we're choosing differently until we look back. like wait, when did I start doing that instead of this?",
        prompt: "what choice you've been making lately actually surprises you?",
        tags: ["reflection", "choices", "growth", "self-awareness"]
    },
    {
        subject: "what feelings are actually safe now?",
        intro: "you know that feeling when you realize you can actually let yourself feel something without it being a whole disaster? like maybe anger doesn't have to turn into a three-day spiral, or sadness doesn't mean you're broken.",
        prompt: "what emotions feel safer to let in these days?",
        tags: ["emotional safety", "feelings", "growth", "healing"]
    },
    {
        subject: "what keeps you free?",
        intro: "thinking about the stuff that actually helps you stay clean. not the big dramatic things, just the real day-to-day things that work.",
        prompt: "what keeps you free from using?",
        tags: ["freedom", "recovery", "daily habits", "reflection"]
    },
    {
        subject: "what keeps you going?",
        intro: "sometimes we surprise ourselves with how we keep moving forward. like that thing inside you that just doesn't quit, even when everything feels hard.",
        prompt: "what part of your stubborn side actually helps you?",
        tags: ["resilience", "inner strength", "self-reliance", "reflection"]
    },
    {
        subject: "what's actually changing for you?",
        intro: "sometimes we're in the middle of changes without even noticing. like you wake up one day and realize something shifted.",
        prompt: "what feels different in your life right now, even in small ways?",
        tags: ["reflection", "transition", "change", "awareness"]
    },
    {
        subject: "what's calling to you?",
        intro: "sometimes when we're in between chapters, we get glimpses of what might be next. maybe it's clear, maybe it's just a feeling.",
        prompt: "what possibility feels exciting to you right now?",
        tags: ["future", "possibility", "transition", "excitement"]
    },
    {
        subject: "what's possible now?",
        intro: "sometimes when we're in transition, it's hard to see what's ahead. but there's usually something there, even if it's small or unclear.",
        prompt: "what feels possible for you right now that didn't before?",
        tags: ["reflection", "transition", "possibility", "growth"]
    },
    {
        subject: "what's not holding you back anymore?",
        intro: "sometimes we don't even notice when something that used to trap us just... stops being a thing. like one day you realize you're not stuck in that same loop anymore.",
        prompt: "what's not holding you back anymore?",
        tags: ["freedom", "growth", "breakthrough", "reflection"]
    },
    {
        subject: "what are you actually excited about?",
        intro: "december's weird - everything feels like it's ending but also starting. there's this pull toward what's coming next, even when you're not sure what that is.",
        prompt: "what's something coming up that makes you feel a little spark of excitement?",
        tags: ["future", "hope", "anticipation", "transition"]
    },
    {
        subject: "what are you making room for?",
        intro: "things shift when we're not even paying attention. sometimes we realize we've been quietly building something new without even naming it.",
        prompt: "what new way of being feels like it's yours now?",
        tags: ["reflection", "transition", "growth", "identity", "change"]
    },
    {
        subject: "what opened up when something closed?",
        intro: "sometimes when one door shuts, we don't even notice another one cracking open. it's wild how that works.",
        prompt: "what became possible when something that felt limiting finally shifted?",
        tags: ["possibility", "growth", "change", "reflection"]
    },
    {
        subject: "how does it feel to have more space?",
        intro: "sometimes when we're moving through changes, we notice we have more room to breathe. like something that used to feel tight or cramped has opened up a bit.",
        prompt: "where do you feel like you have more space in your life right now?",
        tags: ["reflection", "transition", "space", "growth", "breathing room"]
    },
    {
        subject: "your path looks different than you expected, right?",
        intro: "been thinking about how everyone's path ends up looking so different than what we imagined. sometimes that's actually the better version.",
        prompt: "what's one way your path turned out different than you expected, but you're kind of glad it did?",
        tags: ["reflection", "transition", "personal growth", "unexpected turns"]
    },
    {
        subject: "trusting yourself more these days?",
        intro: "been thinking about how we learn to trust ourselves over time. like, maybe you used to second-guess everything, but now there are things you just know.",
        prompt: "what do you trust yourself with now that you didn't before?",
        tags: ["self-trust", "growth", "reflection", "personal development"]
    },
    {
        subject: "what are you done with?",
        intro: "sometimes the best part of moving forward is deciding what you're leaving behind. like finally saying no to something that never really worked for you anyway.",
        prompt: "what old pattern or habit are you finally ready to let go of?",
        tags: ["letting go", "boundaries", "personal growth", "self-awareness"]
    },
    {
        subject: "who are you becoming?",
        intro: "sometimes when we're in transition, we catch glimpses of who we're turning into. it's not always clear, but there are moments when you feel more like yourself than you have in a while.",
        prompt: "who are you becoming that feels more real than who you used to be?",
        tags: ["identity", "authenticity", "growth", "transition", "self-discovery"]
    },
    {
        subject: "what's actually good right now?",
        intro: "sometimes we get so focused on what's missing that we forget to notice what's actually here. like, really here and working in our favor.",
        prompt: "what's something good you have plenty of right now?",
        tags: ["abundance", "comfort", "present moment", "gratitude"]
    },
    {
        subject: "what good stuff is spilling over?",
        intro: "sometimes there's more good around us than we can even hold onto. like when your cup is so full it starts overflowing.",
        prompt: "what good stuff in your life feels like it's spilling over right now?",
        tags: ["abundance", "overflow", "comfort", "plenty"]
    },
    {
        subject: "what's overflowing in your life?",
        intro: "sometimes we're so focused on what we need that we miss what's already piling up around us. the good stuff that's actually more than enough.",
        prompt: "what do you have way more of than you actually need?",
        tags: ["abundance", "comfort", "perspective", "gratitude"]
    },
    {
        subject: "what's been rich lately?",
        intro: "thinking about all the little moments that add up to something bigger. sometimes the richest experiences aren't the obvious ones.",
        prompt: "what experience lately felt really full or meaningful to you?",
        tags: ["experiences", "meaning", "reflection", "comfort"]
    },
    {
        subject: "what's around you right now?",
        intro: "sometimes we're so focused on what's missing that we forget to look around. like actually look around your space right now.",
        prompt: "what's around you that makes life feel a little easier or more comfortable?",
        tags: ["abundance", "comfort", "present moment", "gratitude"]
    },
    {
        subject: "what feels full right now?",
        intro: "sometimes life feels empty or rushed, but other times there's this sense of fullness. like everything is exactly as it should be, even if it's messy.",
        prompt: "what makes your life feel full right now?",
        tags: ["fullness", "contentment", "present moment", "comfort"]
    },
    {
        subject: "what's actually working out for you?",
        intro: "it's getting cozy season and I'm thinking about all the stuff we plant without really noticing. sometimes things we did months ago are finally paying off now.",
        prompt: "what's actually working out for you right now - maybe something you put effort into a while back?",
        tags: ["growth", "progress", "effort", "results"]
    },
    {
        subject: "someone had your back",
        intro: "thinking about how people show up for us in little ways. sometimes it's obvious, sometimes it's quiet - but it's there.",
        prompt: "who's been generous with you lately, even in small ways?",
        tags: ["generosity", "support", "relationships", "comfort"]
    },
    {
        subject: "the people in your corner",
        intro: "been thinking about how we're all connected in different ways. sometimes it's easy to forget the web of people who actually care about us.",
        prompt: "who are the people who make you feel less alone in the world?",
        tags: ["relationships", "connection", "support", "community"]
    },
    {
        subject: "what's enough for you right now?",
        intro: "sometimes we get caught up thinking we need more stuff or different circumstances to feel good. but there's probably something in your life right now that's actually plenty.",
        prompt: "what do you have that feels like enough?",
        tags: ["contentment", "simplicity", "present moment", "enough"]
    },
    {
        subject: "the little things that are actually pretty great",
        intro: "sometimes the best stuff is just sitting there in plain sight. we walk past it every day without really seeing it.",
        prompt: "what's something small in your life that you barely notice but would actually miss if it wasn't there?",
        tags: ["gratitude", "mindfulness", "comfort", "simple pleasures", "awareness"]
    },
    {
        subject: "the support that's just there",
        intro: "sometimes we get so focused on what we need that we miss what's already around us. like that friend who always texts back or the way your dog just knows when you're having a rough day.",
        prompt: "what support in your life feels abundant right now?",
        tags: ["support", "abundance", "comfort", "relationships"]
    },
    {
        subject: "what's growing?",
        intro: "sometimes good things have this quiet way of spreading. like when you start sleeping better and then everything else feels a little easier too.",
        prompt: "what good thing in your life seems to be creating more good things?",
        tags: ["growth", "ripple effects", "comfort", "momentum"]
    },
    {
        subject: "what feels rich in your world right now?",
        intro: "been thinking about how comfort isn't always about stuff. sometimes it's about feeling full in ways that don't show up on the outside.",
        prompt: "what makes you feel rich right now, even if it's not money?",
        tags: ["abundance", "comfort", "gratitude", "inner wealth"]
    },
    {
        subject: "the good stuff that isn't stuff",
        intro: "been thinking about all the things that make life feel rich that you can't actually buy or hold. sometimes the best parts of our days are totally free.",
        prompt: "what makes you feel rich that has nothing to do with money or things?",
        tags: ["abundance", "non-material", "values", "comfort"]
    },
    {
        subject: "what about nature just hits different?",
        intro: "been thinking about how nature has this way of just... being there when we need it. like how the right weather or view can shift everything.",
        prompt: "what in nature makes you feel more okay with the world?",
        tags: ["nature", "comfort", "peace", "outdoors"]
    },
    {
        subject: "something you've been able to give",
        intro: "december can feel heavy with all the giving pressure, but I'm curious about the real stuff. not the obligatory gifts or forced gestures.",
        prompt: "what have you actually been able to give someone lately that felt good to you?",
        tags: ["giving", "connection", "december", "comfort"]
    },
    {
        subject: "what catches your eye lately?",
        intro: "sometimes we get so caught up in our heads that we forget to actually look around. but there's probably more good stuff within reach than we realize.",
        prompt: "what's something beautiful you noticed recently, even if it was small?",
        tags: ["beauty", "presence", "noticing", "comfort"]
    },
    {
        subject: "what feels like enough right now?",
        intro: "been thinking about how we're always told we need more of everything. but sometimes the good stuff is already here, just waiting for us to notice it.",
        prompt: "what in your life actually feels like enough right now?",
        tags: ["abundance", "contentment", "present moment", "comfort"]
    },
    {
        subject: "what makes the good stuff even better?",
        intro: "you know how some things just make everything feel more right? like when you're already having a nice moment and then something small happens that makes it even sweeter.",
        prompt: "what kind of gratitude makes you feel extra cozy inside?",
        tags: ["joy", "comfort", "feelings", "warmth"]
    },
    {
        subject: "what makes your heart feel open?",
        intro: "sometimes gratitude hits different - not just grateful for stuff, but that feeling when your whole chest gets warm and open. like when something just melts the walls a little.",
        prompt: "what are you grateful for that makes your heart feel more open?",
        tags: ["heart", "openness", "emotional", "warmth", "connection"]
    },
    {
        subject: "what makes things feel more real?",
        intro: "sometimes the best moments aren't the loudest ones. they're the quiet ones where you actually notice what's happening around you.",
        prompt: "what small thing made you pay attention today?",
        tags: ["mindfulness", "comfort", "presence", "simple moments"]
    },
    {
        subject: "what gift hit different?",
        intro: "sometimes someone gives you something and it totally shifts how you see things. or maybe you finally noticed a gift that was already there.",
        prompt: "what gift (big or small, from someone else or life itself) changed how you see something?",
        tags: ["gifts", "perspective", "comfort", "gratitude"]
    },
    {
        subject: "what actually makes you feel good?",
        intro: "sometimes we get so caught up in what's hard that we forget to notice what's working. like really working for us right now.",
        prompt: "what good thing in your life do you maybe take for granted but actually makes everything a little better?",
        tags: ["comfort", "goodness", "appreciation", "everyday"]
    },
    {
        subject: "what counts when you need comfort?",
        intro: "sometimes gratitude isn't about the big stuff. sometimes it's the small things that actually make you feel better when everything feels hard.",
        prompt: "what small thing can you count on to make you feel a little more okay?",
        tags: ["comfort", "coziness", "small things", "reliable", "soothing"]
    },
    {
        subject: "thinking about kindness lately",
        intro: "been thinking about how people show up for each other in small ways. sometimes it's the unexpected stuff that hits different.",
        prompt: "what kindness caught you off guard recently?",
        tags: ["kindness", "support", "unexpected", "comfort"]
    },
    {
        subject: "what's actually going pretty well?",
        intro: "sometimes when everything feels hard, it's worth taking a step back. like yeah, stuff is messy, but what's actually working out for you right now?",
        prompt: "what's going better than you expected, even with all the chaos?",
        tags: ["perspective", "resilience", "comfort", "reality-check"]
    },
    {
        subject: "those random good things",
        intro: "sometimes life just works out in ways we didn't expect. like finding money in an old jacket or catching the train right as it pulls up. those little breaks that made things easier.",
        prompt: "what's one random thing that worked out better than you thought it would?",
        tags: ["luck", "unexpected", "comfort", "relief"]
    },
    {
        subject: "when things just worked out",
        intro: "sometimes good stuff just happens when we're not even trying. like finding a twenty in your old jacket or running into exactly the right person at the right time.",
        prompt: "what good thing just kind of fell into your lap lately?",
        tags: ["serendipity", "unexpected", "comfort", "ease"]
    },
    {
        subject: "what can you actually let in now?",
        intro: "sometimes we get so used to doing everything ourselves that we forget other people want to help too. or maybe we're just starting to believe we're worth the good stuff.",
        prompt: "what's something you can actually let yourself receive now that you couldn't before?",
        tags: ["receiving", "comfort", "boundaries", "self-worth", "support"]
    },
    {
        subject: "what's filling you up right now?",
        intro: "sometimes we get so focused on what's missing that we forget to notice what's actually here. like when you realize you've been holding your breath and finally let it out.",
        prompt: "what's making your heart feel full today?",
        tags: ["heart", "fullness", "present moment", "comfort"]
    },
    {
        subject: "what clicked for you today?",
        intro: "sometimes the best lessons come from the weirdest places. maybe something finally made sense, or you figured out something you'd been stuck on.",
        prompt: "what did you learn today that actually matters?",
        tags: ["learning", "growth", "daily wisdom", "thanksgiving"]
    },
    {
        subject: "what did you learn the hard way?",
        intro: "some of the best stuff I know came from going through things I wouldn't wish on anyone. but here we are, a little wiser for it.",
        prompt: "what's something you learned from an experience you'd rather not repeat?",
        tags: ["wisdom", "experience", "lessons", "growth"]
    },
    {
        subject: "something clicked for you",
        intro: "sometimes we have those moments where something just clicks and suddenly things look different. it might have been big or small, but it shifted how you see things.",
        prompt: "what's something you learned that changed how you look at things?",
        tags: ["insight", "perspective", "growth", "thanksgiving"]
    },
    {
        subject: "what are you figuring out?",
        intro: "november's got me thinking about how much we're always learning, even when we don't realize it. sometimes the biggest insights sneak up on us.",
        prompt: "what have you been figuring out lately that you didn't know before?",
        tags: ["learning", "growth", "self-discovery", "november"]
    },
    {
        subject: "what clicked for you lately?",
        intro: "sometimes things just start making more sense. like you've been looking at something one way and then suddenly you see it differently.",
        prompt: "what's something you understand better now than you did before?",
        tags: ["understanding", "growth", "insight", "thanksgiving"]
    },
    {
        subject: "who taught you something that stuck?",
        intro: "thinking about all the people who've taught us stuff over the years. doesn't have to be a formal teacher - could be anyone who showed you something important.",
        prompt: "who taught you something that actually stuck with you?",
        tags: ["teachers", "learning", "wisdom", "mentors"]
    },
    {
        subject: "what changed how you see things?",
        intro: "sometimes a book or something we learned just hits different. like it shifts something inside and suddenly you're looking at the world through new eyes.",
        prompt: "what book or thing you learned recently opened your mind to something new?",
        tags: ["learning", "growth", "books", "perspective"]
    },
    {
        subject: "something just clicked",
        intro: "you know that moment when something just makes sense? like a puzzle piece falling into place. those little realizations can be pretty powerful.",
        prompt: "what realization shifted something for you?",
        tags: ["realizations", "growth", "awareness", "shifts"]
    },
    {
        subject: "something you notice now that you didn't before",
        intro: "sometimes we get so caught up in moving forward that we forget to check what's actually shifted in how we see things. like when did you start noticing stuff you used to miss?",
        prompt: "what do you see or understand now that you couldn't see before?",
        tags: ["awareness", "growth", "perspective", "thanksgiving"]
    },
    {
        subject: "something that made you go 'oh wow'",
        intro: "you know that feeling when you figure something out and it just clicks? or when you stumble across something that makes you light up a little. thinking about those moments today.",
        prompt: "what did you discover lately that actually excited you?",
        tags: ["discovery", "excitement", "curiosity", "thanksgiving"]
    },
    {
        subject: "something clicked lately?",
        intro: "sometimes things just suddenly make sense, you know? like you've been walking around with a foggy window and someone finally wiped it clean.",
        prompt: "what truth became clear to you recently?",
        tags: ["clarity", "insight", "understanding", "thanksgiving", "awareness"]
    },
    {
        subject: "what you learned that actually stuck",
        intro: "thinking about all the random things we pick up along the way. doesn't have to be school stuff - could be something your friend taught you or what you figured out on your own.",
        prompt: "what did you learn somewhere that actually helps you now?",
        tags: ["learning", "growth", "knowledge", "thanksgiving"]
    },
    {
        subject: "someone who changed how you see things",
        intro: "thinking about the people who've shaped us lately. doesn't have to be formal or official - could be anyone who helped you figure something out.",
        prompt: "who's taught you something that stuck with you?",
        tags: ["mentors", "guidance", "influence", "learning", "relationships"]
    },
    {
        subject: "about those questions that actually helped",
        intro: "sometimes the best answers come from asking the right questions. like when you finally ask yourself something that unlocks a whole new way of seeing things.",
        prompt: "what question did you ask yourself that actually led somewhere good?",
        tags: ["self-discovery", "curiosity", "answers", "reflection"]
    },
    {
        subject: "what made you go hm, interesting?",
        intro: "sometimes the best stuff happens when we get curious about something random. like actually wondering about it instead of just scrolling past.",
        prompt: "what did you get curious about lately that ended up being pretty cool?",
        tags: ["curiosity", "learning", "discovery", "gratitude", "thanksgiving"]
    },
    {
        subject: "that mistake that actually taught you something",
        intro: "sometimes the things we mess up end up being our best teachers. like, way better than anything we planned. weird how that works.",
        prompt: "what mistake actually ended up teaching you something useful?",
        tags: ["learning", "growth", "mistakes", "thanksgiving"]
    },
    {
        subject: "something that clicked for you lately?",
        intro: "you know that moment when something just makes sense? like you've been carrying around this question or confusion and then suddenly - oh. what's been one of those moments for you recently?",
        prompt: "what thought or realization has been helping you see things differently?",
        tags: ["wisdom", "insights", "reflection", "thanksgiving", "growth"]
    },
    {
        subject: "something that shifted how you see things",
        intro: "sometimes we get stuck seeing things one way until something clicks. could be a conversation, a book, or just life happening differently than expected.",
        prompt: "what changed the way you think about something recently?",
        tags: ["perspective", "growth", "learning", "mindset"]
    },
    {
        subject: "what are you getting more patient with?",
        intro: "learning stuff is messy and takes forever. sometimes we're harder on ourselves than we need to be.",
        prompt: "what are you getting more patient with yourself about?",
        tags: ["patience", "learning", "self-compassion", "growth"]
    },
    {
        subject: "what clicks differently now?",
        intro: "sometimes understanding sneaks up on us. something that used to confuse you suddenly makes sense, or you see a situation totally differently than before.",
        prompt: "what do you get now that you didn't before?",
        tags: ["growth", "understanding", "perspective", "gratitude", "thanksgiving"]
    },
    {
        subject: "something good that came from a rough patch",
        intro: "sometimes the worst times teach us things we never would have learned otherwise. not saying we're grateful for the pain, but maybe something useful came out of it.",
        prompt: "what did you learn or discover during a difficult time that you're glad you know now?",
        tags: ["growth", "resilience", "lessons", "difficult times", "silver lining"]
    },
    {
        subject: "what's actually working for you?",
        intro: "you know how sometimes we get so focused on what's hard that we forget about the stuff that's actually going well? like that thing you've been working on that's starting to click.",
        prompt: "what's something you've been learning or doing that's actually paying off?",
        tags: ["learning", "progress", "practice", "growth"]
    },
    {
        subject: "something just clicked?",
        intro: "you know that moment when something suddenly makes sense? like a lightbulb going off, or puzzle pieces finally fitting together.",
        prompt: "what clicked for you recently that you're grateful finally makes sense?",
        tags: ["insight", "clarity", "breakthrough", "understanding"]
    },
    {
        subject: "what's making sense lately?",
        intro: "sometimes life feels like a puzzle with missing pieces, other times things just click. today I'm curious about the stuff that's actually starting to make sense.",
        prompt: "what's something that's finally making sense to you right now?",
        tags: ["clarity", "understanding", "peace", "growth"]
    },
    {
        subject: "what actually matters now?",
        intro: "sometimes the hard stuff strips away what doesn't really matter. like when you're forced to figure out what's actually important versus what you thought was important.",
        prompt: "what means more to you now than it used to?",
        tags: ["meaning", "perspective", "growth", "values"]
    },
    {
        subject: "what keeps you grounded?",
        intro: "some people have like a north star thing they come back to when life gets messy. doesn't have to be fancy or profound.",
        prompt: "what's something you believe in that helps you make sense of things?",
        tags: ["values", "beliefs", "guidance", "principles"]
    },
    {
        subject: "what's clicking for you lately?",
        intro: "been thinking about how we're always learning stuff, even when we don't realize it. sometimes it's the little moments when something just makes sense.",
        prompt: "what's something that's starting to make more sense to you these days?",
        tags: ["growth", "learning", "understanding", "thanksgiving"]
    },
    {
        subject: "what's been on your mind lately?",
        intro: "november's got me thinking about all the stuff we're figuring out. sometimes the questions we're sitting with are just as important as the answers.",
        prompt: "what question has been rolling around in your head lately?",
        tags: ["curiosity", "reflection", "growth", "questions"]
    },
    {
        subject: "what's your gut telling you lately?",
        intro: "sometimes we know things before we can explain them. that quiet voice that says 'yes' or 'this feels right' even when it doesn't make sense yet.",
        prompt: "what knowing in your gut are you actually trusting right now?",
        tags: ["intuition", "trust", "inner wisdom", "november"]
    },
    {
        subject: "when your head and heart are on the same page",
        intro: "sometimes our brain says one thing and our gut says another. but every now and then they actually agree on something.",
        prompt: "what's something your head and heart both feel good about right now?",
        tags: ["alignment", "inner wisdom", "clarity", "integration"]
    },
    {
        subject: "something's shifting",
        intro: "december's got this weird magic where you can actually see how you've changed. like looking at an old photo and going oh wow, that was me.",
        prompt: "what's different about you now that surprises you a little?",
        tags: ["transformation", "self-awareness", "wonder", "completion"]
    },
    {
        subject: "what's shifting for you lately?",
        intro: "things are always changing, whether we're ready or not. sometimes the changes we fight turn out to be the ones we needed most.",
        prompt: "what change in your life are you actually starting to be okay with?",
        tags: ["change", "acceptance", "growth", "wonder"]
    },
    {
        subject: "what's quietly changing?",
        intro: "sometimes the biggest shifts happen so slowly we almost miss them. like how you suddenly realize you've been handling something differently without even trying.",
        prompt: "what's quietly changing in you lately?",
        tags: ["growth", "change", "wonder", "self-awareness"]
    },
    {
        subject: "what change actually amazes you?",
        intro: "thinking about all the ways things transform - like how caterpillars become butterflies, or how broken bones heal stronger. there's something wild about change when you really look at it.",
        prompt: "what transformation have you witnessed that still kind of blows your mind?",
        tags: ["wonder", "change", "transformation", "amazement"]
    },
    {
        subject: "what's actually working better now?",
        intro: "sometimes the biggest changes sneak up on us. like one day you realize you're not doing that thing that used to mess with your head, or you're handling stuff differently without even trying.",
        prompt: "what shift has actually made your life better?",
        tags: ["wonder", "hope", "completion", "growth", "change"]
    },
    {
        subject: "what's changing for you right now?",
        intro: "december feels like everything's shifting at once, doesn't it? like you're between one thing and the next. sometimes transitions are messy and unclear, but they're also where the real stuff happens.",
        prompt: "what transition are you in the middle of right now, and what's one small thing about it you can appreciate?",
        tags: ["transition", "change", "growth", "december", "completion"]
    },
    {
        subject: "what's quietly changing in you?",
        intro: "sometimes the biggest shifts happen so slowly we barely notice them. like when you realize you don't get as triggered by certain things anymore, or you actually look forward to something you used to dread.",
        prompt: "what's quietly changing in you right now?",
        tags: ["growth", "change", "self-awareness", "becoming"]
    },
    {
        subject: "something clicked differently",
        intro: "sometimes our brain just... shifts. like one day you're thinking about something the same old way, and then suddenly it's different. maybe it happened slowly, or maybe it was more like a lightbulb moment.",
        prompt: "what do you think about differently now than you used to?",
        tags: ["mindset", "growth", "perspective", "change"]
    },
    {
        subject: "what are you trying to become?",
        intro: "december's got me thinking about all the ways we quietly rebuild ourselves. sometimes it's big changes, sometimes it's tiny shifts that add up.",
        prompt: "what version of yourself are you working toward right now?",
        tags: ["reinvention", "growth", "change", "becoming"]
    },
    {
        subject: "what changed everything?",
        intro: "sometimes life just shifts in ways we never saw coming. could be big, could be small, but something moved and now things feel different.",
        prompt: "what change happened that you're actually grateful for, even if it was scary at first?",
        tags: ["change", "transformation", "wonder", "growth"]
    },
    {
        subject: "what's actually working for you now?",
        intro: "been thinking about how we're all constantly tweaking little things in our lives. some changes stick, some don't. but when something actually works, it's kind of amazing.",
        prompt: "what habit change has actually made your life better?",
        tags: ["habits", "change", "self-improvement", "what works"]
    },
    {
        subject: "what changed and made things lighter?",
        intro: "sometimes the smallest shifts make the biggest difference. like when you finally adjust that one thing that was bugging you, and suddenly everything feels easier.",
        prompt: "what change - big or tiny - actually gave you some relief?",
        tags: ["relief", "change", "healing", "wonder"]
    },
    {
        subject: "something you tweaked that actually worked",
        intro: "sometimes the smallest changes make the biggest difference. like switching your morning routine or finally using that app you downloaded months ago.",
        prompt: "what small thing did you change that made life a little easier?",
        tags: ["progress", "small changes", "improvements", "wonder"]
    },
    {
        subject: "something that flipped a switch for you",
        intro: "december's got me thinking about those moments that just... changed everything. not always the big dramatic ones, sometimes it's quieter than that.",
        prompt: "what experience completely shifted how you see things?",
        tags: ["transformation", "perspective", "growth", "wonder", "completion"]
    },
    {
        subject: "what's coming back to life for you?",
        intro: "sometimes things we thought were gone forever start showing up again. maybe it's a part of yourself, a dream, or just the ability to feel excited about something small.",
        prompt: "what's coming back to life for you lately?",
        tags: ["rebirth", "renewal", "hope", "wonder"]
    },
    {
        subject: "what's changing in you lately?",
        intro: "sometimes we're so in the middle of changing that we don't even notice it's happening. like when you suddenly realize your jeans fit different or you handled something way better than you used to.",
        prompt: "what part of yourself feels like it's under construction right now?",
        tags: ["change", "growth", "self-awareness", "wonder"]
    },
    {
        subject: "something that got way better",
        intro: "sometimes we're so focused on what's still hard that we miss the stuff that actually got way better. like, dramatically better.",
        prompt: "what in your life got so much better that it almost surprises you?",
        tags: ["improvement", "progress", "wonder", "completion"]
    },
    {
        subject: "looking back at the big shift",
        intro: "sometimes there's this moment where everything changes, even if we don't see it right away. like one day you're stuck and then somehow you're not.",
        prompt: "what's the moment when things started to feel different for you?",
        tags: ["turning points", "change", "reflection", "growth"]
    },
    {
        subject: "something just clicked, didn't it?",
        intro: "you know that moment when something just shifts? like a puzzle piece finally finding its spot. maybe it was big, maybe it was quiet, but something changed.",
        prompt: "what clicked for you that made things feel different?",
        tags: ["breakthrough", "transformation", "wonder", "completion"]
    },
    {
        subject: "what's actually keeping you going?",
        intro: "thinking about the bigger picture today. not the day-to-day stuff, but like... what shifted underneath that made everything else possible?",
        prompt: "what changed in you that keeps you steady now?",
        tags: ["change", "foundation", "stability", "wonder", "completion"]
    },
    {
        subject: "who are you turning into?",
        intro: "sometimes I catch myself doing things the old me never would have done. or saying no when I used to always say yes. little shifts that add up to something bigger.",
        prompt: "what's different about who you're becoming?",
        tags: ["growth", "identity", "change", "becoming"]
    },
    {
        subject: "what version of you is ready to go?",
        intro: "december's got me thinking about all the ways we change without even noticing. like one day you realize you're not the same person who started this year.",
        prompt: "what old version of yourself feels ready to be left behind?",
        tags: ["letting go", "growth", "self-reflection", "completion"]
    },
    {
        subject: "who are you becoming?",
        intro: "sometimes we grow into someone we didn't expect. maybe you're noticing new parts of yourself that feel good, or old parts that don't fit anymore.",
        prompt: "what new parts of yourself are you starting to like?",
        tags: ["self-discovery", "growth", "identity", "wonder", "completion"]
    },
    {
        subject: "what doesn't feel like you anymore?",
        intro: "thinking about how much can shift without us even noticing. sometimes the biggest changes are the ones that sneak up on us.",
        prompt: "what part of your life would surprise your past self?",
        tags: ["transformation", "growth", "reflection", "change"]
    },
    {
        subject: "the thing that changed everything",
        intro: "sometimes I catch myself thinking about how different things are now compared to before. not in a dramatic way, just... different. like when you realize you don't do that thing anymore, or you actually do this other thing now.",
        prompt: "what before-and-after in your life kind of blows your mind when you really think about it?",
        tags: ["transformation", "progress", "reflection", "change"]
    },
    {
        subject: "something that totally flipped",
        intro: "sometimes things go completely sideways from where we thought they were heading. like that situation you were dreading that somehow became good, or that thing you gave up on that came back around.",
        prompt: "what's something in your life that did a complete 180?",
        tags: ["turnaround", "change", "surprise", "wonder"]
    },
    {
        subject: "something that changed direction for you",
        intro: "sometimes the best thing that happens is when we stop going down one path and pick a completely different one. like when you finally quit that job or moved cities or just decided to try something new.",
        prompt: "what's one time changing course actually saved you?",
        tags: ["change", "direction", "decisions", "turning-points"]
    },
    {
        subject: "something that completely flipped",
        intro: "sometimes life just does a complete 180 on us. maybe it was gradual, maybe it happened all at once. either way, something shifted in a big way.",
        prompt: "what's one thing that completely flipped for you this year?",
        tags: ["change", "transformation", "reflection", "growth"]
    },
    {
        subject: "what change actually gives you hope?",
        intro: "sometimes the biggest shifts happen so slowly we almost miss them. but when you step back and really look, there's usually something that's totally different now.",
        prompt: "what's completely changed in your life that makes you feel hopeful?",
        tags: ["transformation", "hope", "change", "growth"]
    },
    {
        subject: "that moment when everything clicked",
        intro: "sometimes one shift in how we see things changes the whole game. maybe it was realizing something wasn't your fault, or that you're actually capable of more than you thought.",
        prompt: "what way of seeing things differently changed everything for you?",
        tags: ["perspective", "breakthrough", "growth", "wonder"]
    },
    {
        subject: "making space for what's coming",
        intro: "sometimes letting go of old stuff isn't really about loss. it's about clearing space. like when you finally clean out that drawer and suddenly have room for things you actually need.",
        prompt: "what old way of doing things are you ready to let go of to make room for something new?",
        tags: ["letting go", "growth", "change", "space"]
    },
    {
        subject: "what's been worth it?",
        intro: "recovery isn't linear and some days are harder than others. but sometimes we get those moments where we can actually see why we started this whole thing.",
        prompt: "what part of getting sober has surprised you in a good way?",
        tags: ["recovery", "progress", "growth", "wonder"]
    },
    {
        subject: "someone who matters",
        intro: "thinking about the people in your world today. maybe someone who's been there, or someone who surprised you, or just someone who makes things a little easier.",
        prompt: "who's one person you're glad exists in your life right now?",
        tags: ["relationships", "connection", "people", "gratitude"]
    },
    {
        subject: "what changed how you see things?",
        intro: "sometimes life throws us curveballs that actually end up teaching us something. like, the hard stuff or the unexpected moments that shifted how we think about what matters.",
        prompt: "what experience taught you to be grateful?",
        tags: ["wonder", "hope", "completion", "lessons", "perspective"]
    },
    {
        subject: "that thing that used to suck",
        intro: "you know how some of the worst stuff that happened to you actually taught you something important? or maybe led you somewhere you needed to go? thinking about those plot twists today.",
        prompt: "what's something that was really hard at the time but you're actually glad it happened now?",
        tags: ["challenges", "growth", "perspective", "resilience"]
    },
    {
        subject: "something good came from something hard?",
        intro: "sometimes the worst things that happen to us crack us open in ways that let new stuff grow. it's weird how that works. not saying the loss was worth it, just that maybe something unexpected came after.",
        prompt: "what did you lose that somehow made space for something you didn't know you needed?",
        tags: ["loss", "growth", "unexpected", "resilience", "change"]
    },
    {
        subject: "when the hard stuff taught you something",
        intro: "sometimes the worst parts of our story end up being the most important teachers. not saying it was worth it or anything, just that pain can leave us with something real.",
        prompt: "what hard thing you went through actually taught you something you're glad to know now?",
        tags: ["wisdom", "growth", "perspective", "resilience"]
    },
    {
        subject: "that contrast thing",
        intro: "you know how sometimes the hard stuff makes the good stuff feel extra good? like when you finally get warm after being really cold. thinking about that today.",
        prompt: "what rough patch made you notice something good you'd been taking for granted?",
        tags: ["contrast", "appreciation", "perspective", "wonder"]
    },
    {
        subject: "what came out of the hard stuff",
        intro: "sometimes the worst moments end up showing us what we're made of. not in a cheesy way, just... you find out you can handle more than you thought.",
        prompt: "what hard thing you went through actually made you realize you're tougher than you knew?",
        tags: ["strength", "resilience", "growth", "difficulty", "completion"]
    },
    {
        subject: "something good that came from something hard",
        intro: "you know how sometimes the worst stuff ends up teaching us things we never would've learned otherwise? not saying it was worth it, just that maybe something grew from it.",
        prompt: "what's something good that came out of a hard time?",
        tags: ["growth", "resilience", "perspective", "wonder", "completion"]
    },
    {
        subject: "what path feels right today?",
        intro: "sometimes we get so focused on the destination that we forget to notice the road we're on. but there's something to be said for the journey itself - even the messy parts.",
        prompt: "what journey are you grateful to be on right now?",
        tags: ["journey", "path", "progress", "wonder", "completion"]
    },
    {
        subject: "thinking about past you",
        intro: "sometimes we're hard on who we used to be. but that person got you here somehow. maybe they deserve some credit.",
        prompt: "what past version of yourself actually deserves a thank you?",
        tags: ["self-compassion", "growth", "reflection", "completion"]
    },
    {
        subject: "what made winning feel even better",
        intro: "sometimes the hardest stuff makes the good moments hit different. like when you finally get something you worked really hard for.",
        prompt: "what struggle made winning feel even sweeter?",
        tags: ["struggle", "victory", "growth", "perseverance", "sweet moments"]
    },
    {
        subject: "that rock bottom thing",
        intro: "sometimes the worst thing that happened to us ends up being the thing that saved us. weird how that works.",
        prompt: "what's something that felt like the end but turned out to be the beginning?",
        tags: ["foundation", "rock bottom", "transformation", "new beginnings", "resilience"]
    },
    {
        subject: "what ending turned into something new?",
        intro: "sometimes the thing that feels like it's over is actually making space for what's next. endings can be messy but they clear the way.",
        prompt: "what ending turned into something new for you?",
        tags: ["endings", "new beginnings", "transitions", "completion", "hope"]
    },
    {
        subject: "what did you finally let go of?",
        intro: "sometimes the thing we've been fighting turns out to be the thing we needed to release. like when you stop trying to control something and suddenly everything gets lighter.",
        prompt: "what did you surrender that actually brought you peace?",
        tags: ["surrender", "peace", "letting go", "relief"]
    },
    {
        subject: "what helped you stop fighting so hard?",
        intro: "sometimes the biggest relief comes when we finally stop pushing against something. like when you realize you don't have to fix everything or be perfect at everything.",
        prompt: "what did you stop fighting that actually made things calmer?",
        tags: ["acceptance", "peace", "letting go", "relief"]
    },
    {
        subject: "what did letting go actually do for you?",
        intro: "sometimes we hold onto stuff way longer than we need to. and then one day we just... don't anymore. it's wild how much space that creates.",
        prompt: "what did letting go of something actually free up for you?",
        tags: ["forgiveness", "letting go", "freedom", "space", "completion"]
    },
    {
        subject: "what did you stop carrying?",
        intro: "sometimes the best thing we do is put something down. like finally cleaning out that drawer or stopping a habit that wasn't serving us anymore.",
        prompt: "what did you let go of this year that made things feel lighter?",
        tags: ["letting go", "relief", "completion", "lightness"]
    },
    {
        subject: "what did you finally let go of?",
        intro: "sometimes the best thing we do is stop holding onto something. could be a worry, a grudge, an old story we kept telling ourselves. letting go can feel like taking off shoes that were too tight.",
        prompt: "what did you release this year that actually made you feel lighter?",
        tags: ["letting go", "relief", "completion", "healing"]
    },
    {
        subject: "something small that stuck with you",
        intro: "sometimes the biggest lessons come wrapped up in the tiniest moments. like when something small happens and suddenly you get it, you know?",
        prompt: "what small moment taught you something real?",
        tags: ["small moments", "learning", "reflection", "simplicity"]
    },
    {
        subject: "that moment when your heart just knew",
        intro: "you know those moments when something hits you right in the chest? like suddenly you just feel it all. not the big dramatic stuff, just... a moment when your heart was full.",
        prompt: "what moment made your heart feel full lately?",
        tags: ["heart", "moments", "fullness", "wonder"]
    },
    {
        subject: "looking back at how far you've come",
        intro: "sometimes we're so focused on what's next that we forget to actually look at the ground we've covered. like really look at it.",
        prompt: "when you think about everything you've been through this year, what feels different about you now?",
        tags: ["reflection", "growth", "journey", "completion"]
    },
    {
        subject: "what progress actually surprises you?",
        intro: "sometimes we're so focused on what's still hard that we miss how far we've actually come. like when you realize you handled something that used to break you.",
        prompt: "what progress you've made actually surprises you when you really think about it?",
        tags: ["progress", "self-awareness", "completion", "wonder"]
    },
    {
        subject: "someone who had your back",
        intro: "thinking about the people who showed up for you lately. sometimes we forget to notice when someone actually comes through.",
        prompt: "who helped you out recently in a way that surprised you or meant more than they probably know?",
        tags: ["support", "relationships", "help", "connection"]
    },
    {
        subject: "who's been on your mind lately?",
        intro: "december's got me thinking about all the people who've mattered this year. the ones who showed up, who listened, who made things a little easier.",
        prompt: "who do you want to say thanks to right now?",
        tags: ["gratitude", "relationships", "appreciation", "year-end"]
    },
    {
        subject: "what brings you back to yourself?",
        intro: "when everything feels scattered or overwhelming, we all have those things that ground us. those quiet moments or simple truths that remind us who we are.",
        prompt: "what brings you back to yourself when you need it most?",
        tags: ["grounding", "self-care", "centering", "wonder"]
    },
    {
        subject: "looking back for a sec",
        intro: "sometimes we get so focused on what's next that we forget to actually look at how far we've come. like really look at it.",
        prompt: "when you think about where you were before and where you are now, what hits you the most?",
        tags: ["reflection", "progress", "wonder", "completion"]
    },
    {
        subject: "what brings people together for you?",
        intro: "thinking about the people and moments that actually matter. the ones that make you feel less alone in all this.",
        prompt: "what gathering - big or small - actually fills you up?",
        tags: ["connection", "community", "warmth", "belonging"]
    },
    {
        subject: "what's actually grown in your life?",
        intro: "december's wild - everything feels like it's wrapping up while also just beginning. there's something about this time of year that makes you notice what's actually taken root.",
        prompt: "what good stuff has actually grown in your life lately?",
        tags: ["growth", "reflection", "harvest", "progress"]
    },
    {
        subject: "what's growing in you lately?",
        intro: "been thinking about how we're always becoming something new, even when we don't notice it. like how you might be more patient now than you were six months ago, or how you actually look forward to things again.",
        prompt: "what kind of person are you becoming that you're grateful for?",
        tags: ["growth", "self-awareness", "hope", "becoming"]
    },
    {
        subject: "what made you stop and stare?",
        intro: "december's got this weird magic where everything feels a little different. maybe it's the light, maybe it's just knowing things are wrapping up.",
        prompt: "what actually made you pause today? like really stop and think 'whoa'?",
        tags: ["wonder", "present moment", "december", "awareness"]
    },
    {
        subject: "what felt impossible but happened anyway?",
        intro: "sometimes the best stuff sneaks up on us. the things we never saw coming, or the tiny shifts that turned into something bigger.",
        prompt: "what felt like a miracle to you lately - big or small?",
        tags: ["wonder", "miracles", "unexpected", "hope", "gratitude"]
    },
    {
        subject: "what keeps you going?",
        intro: "sometimes hope feels big and dramatic, but usually it's quieter than that. like believing tomorrow might be a little different, or trusting that this hard thing won't last forever.",
        prompt: "what hope keeps you going, even when you can't quite name it?",
        tags: ["hope", "resilience", "future", "trust"]
    },
    {
        subject: "the little things that still get you",
        intro: "been thinking about how we can get so caught up in the big stuff that we miss the small things happening right in front of us. but sometimes those tiny moments are what actually matter.",
        prompt: "what's something small that happened recently that made you stop and think 'wow, that's actually pretty cool'?",
        tags: ["wonder", "everyday moments", "present moment", "small things"]
    },
    {
        subject: "something good you can't quite explain",
        intro: "sometimes the best things are the ones we can't really put our finger on. those little moments or feelings that just seem to find us when we need them.",
        prompt: "what good thing showed up in your life that you can't really explain?",
        tags: ["mystery", "unexpected", "wonder", "serendipity"]
    },
    {
        subject: "what made you stop and stare?",
        intro: "sometimes the world just hits different, you know? like when you catch something that makes you actually pause whatever you're doing.",
        prompt: "what's something that made you stop and really look lately?",
        tags: ["wonder", "awe", "presence", "noticing"]
    },
    {
        subject: "something that still amazes you",
        intro: "recovery has probably shown you things you never expected to see. maybe about yourself, maybe about life in general.",
        prompt: "what still kind of blows your mind about getting better?",
        tags: ["wonder", "recovery", "amazement", "perspective"]
    },
    {
        subject: "the little things that catch your eye",
        intro: "sometimes the best stuff is hiding in plain sight. like when the light hits your coffee cup just right or your dog does that weird stretch thing.",
        prompt: "what ordinary thing made you pause today?",
        tags: ["wonder", "mindfulness", "present moment", "simple pleasures"]
    },
    {
        subject: "something good happened",
        intro: "sometimes we rush past the good stuff without really seeing it. or we forget it happened at all.",
        prompt: "what moment this week made you stop and think 'wait, that was actually really good'?",
        tags: ["wonder", "moments", "presence"]
    },
    {
        subject: "what's actually gotten better?",
        intro: "sometimes we're so focused on what's next that we forget to look at how far we've come. like really look.",
        prompt: "what's actually gotten easier for you lately?",
        tags: ["progress", "reflection", "growth"]
    },
    {
        subject: "what path are you walking right now?",
        intro: "sometimes we get so caught up in where we're going that we forget we're already moving. like, you're literally on a journey right now, even if it doesn't feel epic or Instagram-worthy.",
        prompt: "what path are you on right now that you're actually curious about?",
        tags: ["wonder", "journey", "present moment", "curiosity"]
    },
    {
        subject: "something caught you off guard lately?",
        intro: "december's been full of unexpected moments. sometimes the best parts of our day are the ones we didn't see coming.",
        prompt: "what surprised you in a good way recently?",
        tags: ["wonder", "surprise", "unexpected", "delight"]
    },
    {
        subject: "what's looking possible now?",
        intro: "december's almost here and something about this time of year makes me think about what might be ahead. not in a pressure-y way, just... what feels possible?",
        prompt: "what's one thing you're actually looking forward to?",
        tags: ["hope", "future", "possibility", "december"]
    },
    {
        subject: "what are you looking forward to?",
        intro: "sometimes it's the small stuff we're excited about that matters most. maybe it's sleeping in tomorrow, or finally finishing that thing you started, or just seeing what happens.",
        prompt: "what's one thing about tomorrow (or this week) that you're actually looking forward to?",
        tags: ["anticipation", "future", "hope", "simple pleasures"]
    },
    {
        subject: "what's got you feeling hopeful lately?",
        intro: "december always feels like this weird mix of looking back and looking forward. sometimes hope shows up in the smallest things.",
        prompt: "what's making you feel like things might actually be okay?",
        tags: ["hope", "optimism", "feelings", "december"]
    },
    {
        subject: "what good thing feels possible?",
        intro: "some days it's hard to imagine anything getting better. other days, something shifts and you can actually picture good stuff happening. not being unrealistic, just... open.",
        prompt: "what good thing feels actually possible for you right now?",
        tags: ["hope", "possibility", "realistic", "future"]
    },
    {
        subject: "what do you actually believe about where you're heading?",
        intro: "december's been wild - all this looking back and looking forward at the same time. sometimes it's hard to know what we actually think about our own path.",
        prompt: "what part of your recovery do you actually have faith in right now?",
        tags: ["faith", "recovery", "self-trust", "hope", "completion"]
    },
    {
        subject: "what feels more solid now?",
        intro: "sometimes confidence doesn't feel like this big dramatic thing. sometimes it's just... quieter doubt. like you're not questioning every single step anymore.",
        prompt: "what part of your path feels more solid under your feet these days?",
        tags: ["confidence", "growth", "path", "progress"]
    },
    {
        subject: "what keeps you going when it's messy?",
        intro: "some days everything feels uncertain and you can't see the next step clearly. but something inside you keeps showing up anyway.",
        prompt: "what part of you still believes things will work out, even when you can't see how?",
        tags: ["trust", "process", "faith", "uncertainty", "resilience"]
    },
    {
        subject: "what keeps you going?",
        intro: "sometimes it's the tiniest belief that keeps us moving forward. doesn't have to be big or profound - just something that feels true to you right now.",
        prompt: "what quiet belief about tomorrow helps you get through today?",
        tags: ["hope", "future", "belief", "resilience"]
    },
    {
        subject: "what's wrapping up for you?",
        intro: "december always feels like things are ending and beginning at the same time. some cycles just naturally close out, you know?",
        prompt: "what feels like it's coming full circle for you right now?",
        tags: ["completion", "cycles", "reflection", "closure"]
    },
    {
        subject: "something you actually did",
        intro: "december's wild - feels like everything's wrapping up but also just beginning. been thinking about the stuff we said we'd do this year.",
        prompt: "what's something you said you'd do... and actually did it?",
        tags: ["achievement", "goals", "completion", "december"]
    },
    {
        subject: "something you actually finished",
        intro: "december's wild - so much wrapping up, looking back. sometimes we forget to notice the things we actually saw through to the end.",
        prompt: "what's something you started and actually finished this year?",
        tags: ["completion", "accomplishment", "reflection"]
    },
    {
        subject: "something feels more complete lately",
        intro: "december's got me thinking about how things come together. like when pieces of your life finally start making sense, or when something that felt broken doesn't hurt the same way anymore.",
        prompt: "what part of you feels more whole these days?",
        tags: ["healing", "wholeness", "completion", "december"]
    },
    {
        subject: "what's actually sticking?",
        intro: "been thinking about how sometimes the best lessons are the ones that just quietly become part of who you are. like you don't even notice until someone points it out.",
        prompt: "what thing you learned this year is just part of how you do life now?",
        tags: ["integration", "growth", "self-awareness", "completion"]
    },
    {
        subject: "things coming full circle",
        intro: "sometimes life has this weird way of bringing things back around. like when something that used to hurt actually helps you help someone else, or when you end up in a place you never thought you'd be again but feeling completely different about it.",
        prompt: "what's something in your life that's come full circle in a way that surprises you?",
        tags: ["completion", "wonder", "growth", "perspective"]
    },
    {
        subject: "something that feels wrapped up?",
        intro: "december's got this energy of things coming together, you know? like puzzle pieces finally clicking into place. sometimes the best feeling is when something actually feels... done.",
        prompt: "what's something in your life that feels complete right now - in a good way?",
        tags: ["completion", "satisfaction", "closure", "december"]
    },
    {
        subject: "something finally clicked?",
        intro: "you know that feeling when all those small steps finally add up to something real? when you can actually see what all that work was building toward.",
        prompt: "what's something you've been working on that's finally paying off?",
        tags: ["effort", "progress", "completion", "results"]
    },
    {
        subject: "what's actually feeling good right now?",
        intro: "sometimes we get so focused on what's missing that we forget to notice what's working. like when you realize you're not stressed about something that used to keep you up at night.",
        prompt: "what's actually feeling good in your life right now?",
        tags: ["fulfillment", "satisfaction", "present moment", "completion"]
    },
    {
        subject: "ready for what's coming?",
        intro: "december's almost here and things are shifting. there's something about this time of year that makes you feel like you're on the edge of something new.",
        prompt: "what feels ready in you for whatever comes next?",
        tags: ["readiness", "transition", "future", "december", "hope"]
    }
];
/**
 * Get the prompt for a specific day of the year (1-366)
 */
function getPromptForDay(dayOfYear) {
    // Ensure day is within valid range
    const day = Math.max(1, Math.min(366, dayOfYear));
    return exports.DAILY_PROMPTS[day - 1]; // Array is 0-indexed, days are 1-indexed
}
/**
 * Get the current day of the year (1-366)
 */
function getCurrentDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
/**
 * Get day of year for a specific date
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
/**
 * Get today's prompt
 */
function getTodaysPrompt() {
    return getPromptForDay(getCurrentDayOfYear());
}
