type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
};

const config: FirebaseWebConfig = {
  apiKey: 'AIzaSyCeDedJ35qosn8rmRkjdjE34-X4Z0MuNeo',
  authDomain: 'grateful-today-761f2.firebaseapp.com',
  projectId: 'grateful-today-761f2',
  storageBucket: 'grateful-today-761f2.appspot.com',
};

export function getFirebaseConfig(): FirebaseWebConfig {
  return config;
}

export default config;