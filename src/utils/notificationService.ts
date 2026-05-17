import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  link?: string;
  type?: 'message' | 'update' | 'system' | 'alert';
  priority?: 'high' | 'medium' | 'low';
}

export interface NotificationResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
    status?: number;
    details?: any;
  };
  retryCount: number;
}

const PRIORITY_MAP = {
  message: 'high',
  update: 'medium',
  system: 'low',
  alert: 'high'
};

/**
 * Centralized service to send notifications and optionally trigger emails.
 * Includes retry logic and detailed error reporting.
 */
export async function sendNotification(payload: NotificationPayload, maxRetries = 2): Promise<NotificationResult> {
  let attempt = 0;
  let lastError: any = null;

  const priority = payload.priority || (payload.type ? PRIORITY_MAP[payload.type as keyof typeof PRIORITY_MAP] : 'medium');

  while (attempt <= maxRetries) {
    try {
      // 1. Create the notification in Firestore
      const notificationData = {
        ...payload,
        priority,
        isRead: false,
        createdAt: serverTimestamp(),
        debug_info: {
          attempt,
          browser_permission: typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
        }
      };
      
      const docRef = await addDoc(collection(db, 'notifications'), notificationData);

      // 2. Check user preferences for email notifications
      const privateProfileRef = doc(db, 'users', payload.userId, 'private', 'profile');
      const privateProfileSnap = await getDoc(privateProfileRef);

      if (privateProfileSnap.exists()) {
        const userData = privateProfileSnap.data();
        const notificationPrefs = userData.notificationPreferences || {};
        const emailEnabledGlobal = notificationPrefs.email;
        const userEmail = userData.email;

        // Skip emails for low priority if not explicitly enabled for all
        const shouldSendEmail = emailEnabledGlobal && (
          priority === 'high' || 
          (priority === 'medium' && notificationPrefs.updates !== false) ||
          (priority === 'low' && notificationPrefs.system === true)
        );

        if (shouldSendEmail && userEmail) {
          await triggerEmailNotification({
            to: userEmail,
            subject: payload.title,
            body: payload.message,
            link: payload.link,
            priority
          });
        }
      }

      return { success: true, retryCount: attempt };
    } catch (error: any) {
      lastError = error;
      console.error(`Error in sendNotification (Attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // If it's a permission error or specific terminal error, don't retry
      if (error.code === 'permission-denied') break;
      
      attempt++;
      if (attempt <= maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
  }

  return { 
    success: false, 
    retryCount: attempt - 1,
    error: {
      code: lastError?.code || 'unknown',
      message: lastError?.message || 'Une erreur inattendue est survenue',
      status: lastError?.status,
      details: lastError
    }
  };
}

/**
 * Mock function to simulate triggering an email notification.
 * In a real-world scenario, this would call an API route on the server.
 */
async function triggerEmailNotification(data: { to: string; subject: string; body: string; link?: string; priority?: string }) {
  console.log(`[Email Service] Sending ${data.priority || 'medium'} priority email to ${data.to}: ${data.subject}`);
  
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
