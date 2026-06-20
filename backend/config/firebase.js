import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

let firebaseApp;

if (!admin.apps.length) {
  // Support both JSON string and individual env vars
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
} else {
  firebaseApp = admin.apps[0];
}

export { admin };
export default firebaseApp;
