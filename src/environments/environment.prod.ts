export const environment = {
  production: true,
  firebase: {
    apiKey: process.env['FIREBASE_API_KEY'],
    authDomain: `${process.env['FIREBASE_PROJECT_ID']}.firebaseapp.com`,
    projectId: process.env['FIREBASE_PROJECT_ID'],
    storageBucket: `${process.env['FIREBASE_PROJECT_ID']}.appspot.com`,
    messagingSenderId: '12345', // This isn't critical for basic functionality
    appId: process.env['FIREBASE_APP_ID']
  }
};