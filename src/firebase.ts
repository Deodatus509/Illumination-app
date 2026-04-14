import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getDocFromServer, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Auth with localStorage to avoid IndexedDB issues in iframes
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
});

// Initialize Firestore with memory cache to avoid IndexedDB issues
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    // Attempt to get a document to test connection. 
    // We don't care if it exists or not, just that we can reach the backend.
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();
