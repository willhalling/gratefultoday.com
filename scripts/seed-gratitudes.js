/**
 * Script to seed Firestore with sample gratitude posts
 * Run with: node scripts/seed-gratitudes.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../grateful-today-761f2-firebase-adminsdk-d6vff-8ea2490790.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Avatar colors from your types
const AVATAR_COLORS = [
  '#9EADA0', // sage green
  '#A4C3B2', // mint
  '#CCE3DE', // seafoam
  '#B8A89C', // taupe
  '#C9ADA7', // dusty rose
  '#9FA8DA', // lavender
  '#B0BEC5', // blue gray
  '#C5CAE9', // periwinkle
];

// Sample gratitude posts of varying lengths
const SAMPLE_GRATITUDES = [
  'My morning coffee',
  'The sun breaking through the clouds this afternoon',
  'My friend who called just to check in on me',
  'A good book that helped me escape for a while',
  'My dog greeting me at the door',
  'Finding a parking spot right away',
  'The smell of rain',
  'A stranger who smiled at me today',
  'My therapist who really listens',
  'Clean sheets on my bed',
  'The fact that I made it through another day',
  'Music that speaks to exactly how I am feeling',
  'A warm shower after a long day',
  'The support group that gets it without me having to explain',
  'My sponsor who answers the phone no matter what time it is',
  'The courage it took to get out of bed this morning',
  'A text from someone who cares',
  'The quiet moments before everyone else wakes up',
  'Laughing at something silly',
  'The strength I did not know I had',
  'A meal that actually tasted good',
  'The sunset painting the sky in colors I forgot existed',
  'My journal where I can be completely honest',
  'The realization that I do not have to have it all figured out today',
  'A hug that felt like home',
  'The progress I have made even when it does not feel like enough',
  'Nature reminding me that things grow slowly',
  'The sound of birds in the morning',
  'Someone believing in me when I could not believe in myself',
  'A comfortable silence with a friend',
  'The small victories that no one else sees',
  'My body for carrying me through',
  'Second chances',
  'The community here that makes me feel less alone',
  'A really good cup of tea',
  'The fact that tomorrow is a new day',
  'Finding something beautiful in an ordinary moment',
  'The kindness of a stranger who did not have to be kind',
  'My ability to choose differently today than I did yesterday',
  'The peace that comes after a storm',
  'A comfortable pair of shoes',
  'The first sip of cold water',
  'Someone who sees me for who I really am',
  'The courage to ask for help',
  'A memory that made me smile',
  'The grace to forgive myself',
  'My chosen family',
  'The little things that used to go unnoticed',
  'Hope that keeps showing up even when I try to push it away',
  'The strength in my recovery community',
];

async function seedGratitudes(count = 50) {
  console.log(`Seeding ${count} gratitude posts...`);

  try {
    const promises = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // Random gratitude text
      const text = SAMPLE_GRATITUDES[Math.floor(Math.random() * SAMPLE_GRATITUDES.length)];

      // Random avatar color
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      // Random timestamp within the last 7 days
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(createdAt.getHours() - hoursAgo);

      const createdDate = createdAt.toISOString().split('T')[0];

      promises.push(
        db.collection('gratitudePosts').add({
          text,
          userId: `seed-user-${Math.floor(Math.random() * 10)}`, // Random user IDs
          createdAt: admin.firestore.Timestamp.fromDate(createdAt),
          createdDate,
          promptId: null,
          flagged: false,
          flagCount: 0,
          avatarColor,
        })
      );

      // Add small delay every 10 posts to avoid rate limiting
      if ((i + 1) % 10 === 0) {
        await Promise.all(promises.splice(0, 10));
        console.log(`Created ${i + 1}/${count} posts...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Add any remaining promises
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    console.log(`✅ Successfully created ${count} gratitude posts!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding gratitudes:', error);
    process.exit(1);
  }
}

// Get count from command line argument or default to 50
const count = parseInt(process.argv[2]) || 50;
seedGratitudes(count);
