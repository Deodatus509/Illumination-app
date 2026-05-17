import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { Bell, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  type?: 'system' | 'message' | 'alert';
  createdAt: any;
}

interface NotificationContextType {
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  recentNotifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasWelcomed, setHasWelcomed] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      setUnreadMessagesCount(0);
      setRecentNotifications([]);
      setIsInitialLoad(true);
      setHasWelcomed(false);
      return;
    }

    // 0. Cleanup old notifications (> 30 days)
    const cleanupOldNotifications = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oldQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          where('createdAt', '<', thirtyDaysAgo)
        );
        
        const oldDocs = await getDocs(oldQuery);
        if (!oldDocs.empty) {
          const batch = writeBatch(db);
          oldDocs.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          console.log(`Cleaned up ${oldDocs.size} old notifications.`);
        }
      } catch (e) {
        console.error("Error cleaning up old notifications:", e);
      }
    };
    cleanupOldNotifications();

    // 1. Listen for system notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      const unreadCount = notifs.filter(n => !n.isRead).length;

      // Handle new notifications (Toasts)
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newNotif = change.doc.data() as Notification;
            if (!newNotif.isRead) {
              toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-obsidian-lighter shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-gold/20`}>
                  <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <Bell className="h-10 w-10 text-gold bg-gold/10 p-2 rounded-full" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-bold text-gray-100">{newNotif.title}</p>
                        <p className="mt-1 text-sm text-gray-400">{newNotif.message}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-l border-obsidian-light">
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gold hover:text-gold-light focus:outline-none"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ), { duration: 5000 });
            }
          }
        });
      }

      setUnreadNotificationsCount(unreadCount);
      setRecentNotifications(notifs);

      // Handle "Welcome Back" alert for missed notifications
      if (isInitialLoad && !hasWelcomed && unreadCount > 0) {
        setHasWelcomed(true);
        setTimeout(async () => {
          // Check if user has email notifications enabled
          try {
            const privateProfileSnap = await getDoc(doc(db, 'users', currentUser.uid, 'private', 'profile'));
            const emailEnabled = privateProfileSnap.exists() ? privateProfileSnap.data()?.notificationPreferences?.email : false;

            toast.custom((t) => (
              <motion.div 
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="max-w-md w-full bg-obsidian/95 backdrop-blur-xl border border-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex flex-col p-6 ring-1 ring-gold/20"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="h-14 w-14 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 border border-gold/20">
                    <Bell className="h-7 w-7 text-gold animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-white tracking-tight">Illumination vous attendait</h3>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                      Pendant votre absence, <span className="text-gold font-bold">{unreadCount}</span> nouvelles notifications ont été reçues.
                    </p>
                  </div>
                </div>
                
                {!emailEnabled && (
                  <div className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10 group cursor-pointer hover:bg-white/10 transition-colors" onClick={() => window.location.href = '/profile'}>
                    <p className="text-xs text-gray-300 leading-relaxed flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                      Souhaitez-vous recevoir ces alertes par <span className="text-gold font-bold">e-mail</span> pour rester connecté ?
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      window.location.href = '/profile/notifications';
                    }}
                    className="flex-1 py-3 bg-gold text-obsidian text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold-light hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-gold/20"
                  >
                    Consulter tout
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Plus tard
                  </button>
                </div>
              </motion.div>
            ), { duration: 10000, position: 'top-center' });
          } catch (e) {
            console.error("Error checking email preference:", e);
          }
        }, 2000); // Small delay after initial load
      }

      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    });

    // 2. Listen for unread messages (Direct Messages)
    // We listen to where the user is recipient and matches unread
    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiver_id', '==', currentUser.uid),
      where('isRead', '==', false)
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadMessagesCount(snapshot.size);
      
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newMessage = change.doc.data() as any;
            
            // Fetch sender name for the toast
            getDoc(doc(db, 'users', newMessage.sender_id)).then(userSnap => {
              const senderName = userSnap.exists() ? (userSnap.data().name || userSnap.data().displayName || 'Quelqu\'un') : 'Quelqu\'un';
              
              toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-mystic-purple shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-white/10`}>
                  <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <MessageSquare className="h-10 w-10 text-white bg-white/10 p-2 rounded-full" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-bold text-white">Nouveau message de {senderName}</p>
                        <p className="mt-1 text-sm text-white/80 line-clamp-1">{newMessage.message || 'Contenu du message'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ), { position: 'bottom-right' });
            });
          }
        });
      }
    });

    return () => {
      unsubNotifications();
      unsubMessages();
    };
  }, [currentUser, isInitialLoad]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: false });
    } catch (e) {
      console.error('Error marking as unread:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    recentNotifications.filter(n => !n.isRead).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'notifications', id));
      await batch.commit();
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  return (
    <NotificationContext.Provider value={{
      unreadNotificationsCount,
      unreadMessagesCount,
      recentNotifications,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      deleteNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
