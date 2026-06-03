const config =  {
  funeralcollage: {
    apiKey: 'AIzaSyBnqsss4vQIX-HHSYUlfuAh7qJpzzBz354 ',
    authDomain: "funeral-collage.firebaseapp.com",
    projectId: 'funeral-collage',
    storageBucket: "funeral-collage.appspot.com",
  },
  easyslideshow: {
    apiKey: 'AIzaSyC9d9MyJMd0Xt5cTw42qhnVqDSuBEXnSU0',
    authDomain: "easy-slideshow-727fb.firebaseapp.com",
    projectId: 'easy-slideshow-727fb',
    storageBucket: "easy-slideshow-727fb.firebasestorage.app",
  },
  gratefultoday: {
    apiKey: "AIzaSyCeDedJ35qosn8rmRkjdjE34-X4Z0MuNeo",
    authDomain: "grateful-today-761f2.firebaseapp.com",
    projectId: "grateful-today-761f2",
    storageBucket: "grateful-today-761f2.appspot.com"
  }
}

export function getFirebaseConfig() {
  const theme = process.env.NEXT_PUBLIC_THEME || 'funeralcollage';
  return config[theme] || config['funeralcollage'];
}

export default config;