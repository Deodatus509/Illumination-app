import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Initialize Firestore with memory cache and force settings for network stability in restricted environments
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

export const db = getFirestore(app, firestoreDatabaseId);

// Test connection according to critical connectivity requirements
async function testConnection() {
  try {
    const { doc, getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Firestore client is offline.");
    } else {
      console.debug("Initial connectivity check status:", error);
    }
  }
}
testConnection();
