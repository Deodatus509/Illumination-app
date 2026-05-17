import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Auth with localStorage to avoid IndexedDB issues in iframes
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
});

// Initialize Firestore with memory cache and force settings for network stability in restricted environments
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
}, firestoreDatabaseId);

// Test connection according to critical connectivity requirements
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Firestore client is offline.");
    } else {
      // This might still trigger for generic failures, but we've allowed 'test/connection' in rules
      console.debug("Initial connectivity check status:", error);
    }
  }
}
testConnection();
