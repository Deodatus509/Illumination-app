import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

/**
 * Scheduled function that runs every day at 2:00 AM to delete users
 * who have been marked for deletion and whose 30-day grace period has expired.
 */
export const deleteExpiredUsers = functions.pubsub
  .schedule('0 2 * * *') // Run every day at 2:00 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new admin.firestore.Timestamp(now.seconds - 30 * 24 * 60 * 60, 0);

    try {
      // Find all private profiles where markedForDeletion is true
      // and deletionScheduledAt is older than 30 days
      const usersRef = db.collectionGroup('private').where('markedForDeletion', '==', true);
      const snapshot = await usersRef.get();

      if (snapshot.empty) {
        console.log('No users marked for deletion found.');
        return null;
      }

      let deletedCount = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Check if deletionScheduledAt exists and is older than 30 days
        if (data.deletionScheduledAt && data.deletionScheduledAt.toMillis() <= thirtyDaysAgo.toMillis()) {
          // The document path is users/{userId}/private/profile
          // So the user ID is the second segment
          const userId = doc.ref.parent.parent?.id;
          
          if (userId) {
            try {
              // 1. Delete user from Firebase Auth
              await auth.deleteUser(userId);
              
              // 2. Delete private profile document
              await doc.ref.delete();
              
              // 3. Delete public profile document
              await db.collection('users').doc(userId).delete();
              
              // Note: In a real app, you might also want to delete other user data
              // like posts, comments, or files in Storage.
              
              console.log(`Successfully deleted user data and account for ${userId}`);
              deletedCount++;
            } catch (error) {
              console.error(`Error deleting user ${userId}:`, error);
            }
          }
        }
      }

      console.log(`Finished deletion process. Deleted ${deletedCount} users.`);
      return null;
    } catch (error) {
      console.error('Error running deleteExpiredUsers function:', error);
      return null;
    }
  });
