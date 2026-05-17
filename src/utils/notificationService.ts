import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  link?: string;
  type?: string;
}

/**
 * Centralized service to send notifications and optionally trigger emails.
 */
export async function sendNotification(payload: NotificationPayload) {
  try {
    // 1. Create the notification in Firestore
    const notificationData = {
      ...payload,
      isRead: false,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);

    // 2. Check user preferences for email notifications
    const privateProfileRef = doc(db, 'users', payload.userId, 'private', 'profile');
    const privateProfileSnap = await getDoc(privateProfileRef);

    if (privateProfileSnap.exists()) {
      const userData = privateProfileSnap.data();
      const emailEnabled = userData.notificationPreferences?.email;
      const userEmail = userData.email;

      if (emailEnabled && userEmail) {
        // Trigger email sending
        // In a real app, this would be a call to a Cloud Function or a server endpoint
        await triggerEmailNotification({
          to: userEmail,
          subject: payload.title,
          body: payload.message,
          link: payload.link
        });
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    throw error;
  }
}

/**
 * Mock function to simulate triggering an email notification.
 * In a real-world scenario, this would call an API route on the server.
 */
async function triggerEmailNotification(data: { to: string; subject: string; body: string; link?: string }) {
  console.log(`[Email Service] Sending email to ${data.to}: ${data.subject}`);
  
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.warn('Failed to send email via API, but notification was created.');
    }
  } catch (err) {
    console.error('Error calling send-email API:', err);
  }
}
