import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

// Check if we're using Firebase emulators (explicit opt-in only)
const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Ensure emulator hosts are set ONLY when explicitly enabled
if (USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
} else {
  // Guard against accidental emulator usage in production
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

export function getFirebaseAdmin() {
  if (!app) {
    // Check if already initialized (e.g., in Firebase Functions environment)
    if (admin.apps.length > 0) {
      app = admin.apps[0] as admin.app.App;
    } else {
      try {
        console.log('🔧 Initializing Firebase Admin for', USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION');

        if (USE_EMULATOR) {
          // Emulator does not require credentials
          app = admin.initializeApp({
            projectId: 'grateful-today-761f2',
            storageBucket: 'grateful-today-761f2.appspot.com',
          });
        } else {
          // Use service account in production to avoid emulator fallback
          const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

          console.log('FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!serviceAccountRaw);
          console.log('FIREBASE_SERVICE_ACCOUNT_KEY length:', serviceAccountRaw?.length);

          if (!serviceAccountRaw) {
            throw new Error(
              'Missing FIREBASE_SERVICE_ACCOUNT_KEY in environment. Check your .env file.'
            );
          }

          const parsed = JSON.parse(serviceAccountRaw);
          // Ensure private_key newlines are correct
          if (parsed.private_key && typeof parsed.private_key === 'string') {
            parsed.private_key = parsed.private_key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
          }
          const serviceAccount = parsed as admin.ServiceAccount & { project_id?: string };

          if (!serviceAccount.client_email || !serviceAccount.private_key) {
            throw new Error(
              'Invalid FIREBASE_SERVICE_ACCOUNT_KEY: missing client_email or private_key'
            );
          }

          // Avoid ADC interfering when explicit credential is provided
          delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

          const projectId = serviceAccount.project_id || 'grateful-today-761f2';
          app = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail: serviceAccount.client_email,
              privateKey: serviceAccount.private_key,
            }),
            projectId,
            storageBucket: `${projectId}.appspot.com`,
          });
          console.log(
            '✅ Firebase Admin initialized with service account for project',
            serviceAccount.project_id || 'grateful-today-761f2'
          );
        }
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        throw error;
      }
    }
  }

  return {
    app,
    auth: admin.auth(app),
    db: admin.firestore(app),
    storage: admin.storage(app),
  };
}
