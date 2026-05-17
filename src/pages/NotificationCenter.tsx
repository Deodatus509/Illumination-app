import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Trash2, Calendar, ChevronRight, Inbox, Mail, Info, AlertOctagon, Loader2, RefreshCw } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

export function NotificationCenter() {
  const { currentUser } = useAuth();
  const { markAsRead, markAsUnread, markAllAsRead, deleteNotification: contextDelete } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'message' | 'alert'>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const PAGE_SIZE = 20;

  const fetchNotifications = useCallback(async (isNextPage = false) => {
    if (!currentUser) return;
    
    if (isNextPage) setLoadingMore(true);
    else setLoading(true);

    try {
      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (filter === 'unread') {
        q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          where('isRead', '==', false),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      if (isNextPage && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      if (typeFilter !== 'all') {
        q = query(q, where('type', '==', typeFilter));
      }

      const snapshot = await getDocs(q);
      const newNotifs = snapshot.docs.map(doc => {
        const data = doc.data();
        const pLevel = data.priorityLevel || (data.type === 'message' || data.type === 'alert' ? 3 : data.type === 'update' ? 2 : 1);
        return { id: doc.id, ...data, pLevel };
      });
      
      // Secondary client-side sort to ensure priority is respected within the visible page
      const sortedBatch = [...newNotifs].sort((a: any, b: any) => {
        if (!a.isRead && b.isRead) return -1;
        if (a.isRead && !b.isRead) return 1;
        if (a.pLevel !== b.pLevel) return b.pLevel - a.pLevel;
        return 0; // Keep Firestore date sort
      });

      if (isNextPage) {
        setNotifications(prev => [...prev, ...sortedBatch]);
      } else {
        setNotifications(sortedBatch);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser, filter, lastDoc]);

  useEffect(() => {
    setNotifications([]);
    setLastDoc(null);
    setHasMore(true);
    fetchNotifications();
  }, [filter, typeFilter, currentUser]);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleToggleRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) {
      await markAsUnread(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    } else {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = async (id: string) => {
    await contextDelete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!currentUser) return null;

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-100 mb-2">Centre de Notifications</h1>
          <p className="text-gray-400">Gérez vos alertes, messages et annonces système.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleMarkAllAsRead}
            disabled={notifications.every(n => n.isRead)}
            className="flex items-center gap-2 px-4 py-2 bg-obsidian-lighter border border-gold/20 text-gold rounded-lg hover:bg-gold/10 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Check size={16} />
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="bg-obsidian-lighter border border-obsidian-light rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex border-b border-obsidian-light overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
              filter === 'all' ? "text-gold border-b-2 border-gold bg-gold/5" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Toutes
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={cn(
              "px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap",
              filter === 'unread' ? "text-gold border-b-2 border-gold bg-gold/5" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Non lues
          </button>
          <div className="flex-grow flex items-center justify-end px-4 gap-2">
            <span className="text-[10px] text-gray-500 uppercase font-black">Filtrer par :</span>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-obsidian border border-obsidian-light text-xs text-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-gold outline-none"
            >
              <option value="all">Tous types</option>
              <option value="system">Système</option>
              <option value="message">Messages</option>
              <option value="alert">Alertes</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-obsidian-light">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Chargement de vos notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-obsidian-light rounded-full flex items-center justify-center mb-6">
                <Inbox className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-2">Boîte vide</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Vous n'avez aucune notification {filter === 'unread' ? 'non lue' : ''} pour le moment.</p>
            </div>
          ) : (
            <>
              {notifications.map((notif, index) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % PAGE_SIZE) * 0.05 }}
                  className={cn(
                    "p-6 transition-all group relative border-l-4",
                    notif.isRead ? "border-transparent" : "border-gold bg-gold/5 shadow-[inset_4px_0_0_0_#D4AF37]"
                  )}
                >
                  <div className="flex gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 relative",
                      notif.type === 'message' ? "bg-mystic-purple/20 text-mystic-purple-light shadow-[0_0_15px_rgba(168,85,247,0.1)]" : 
                      notif.type === 'alert' ? "bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                      "bg-gold/10 text-gold"
                    )}>
                      {notif.type === 'message' ? <Mail size={22} /> : 
                       notif.type === 'alert' ? <AlertOctagon size={22} /> :
                       <Info size={22} />}
                      
                      {notif.pLevel === 3 && !notif.isRead && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "text-lg font-bold truncate",
                          notif.isRead ? "text-gray-200" : "text-white"
                        )}>
                          {notif.title}
                        </h4>
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap flex items-center gap-1">
                          <Calendar size={12} />
                          {notif.createdAt?.toDate 
                            ? format(notif.createdAt.toDate(), 'dd MMM yyyy, HH:mm', { locale: fr })
                            : 'Récemment'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-2 md:line-clamp-none">
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        {notif.link && (
                          <Link 
                            to={notif.link}
                            onClick={() => { if(!notif.isRead) handleMarkAsRead(notif.id); }}
                            className="text-xs font-bold text-gold hover:text-gold-light flex items-center gap-1 group/link"
                          >
                            VOIR LES DÉTAILS
                            <ChevronRight size={14} className="transition-transform group-hover/link:translate-x-1" />
                          </Link>
                        )}
                        <button 
                          onClick={() => handleToggleRead(notif.id, notif.isRead)}
                          className="text-xs font-bold text-gray-500 hover:text-gray-300 uppercase"
                        >
                          {notif.isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDelete(notif.id)}
                      className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}

              {hasMore && (
                <div className="p-8 text-center border-t border-obsidian-light bg-obsidian-lighter/30">
                  <button
                    onClick={() => fetchNotifications(true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-obsidian border border-gold/30 text-gold rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-all disabled:opacity-50 shadow-lg shadow-black/40"
                  >
                    {loadingMore ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    {loadingMore ? 'Chargement en cours...' : 'Charger plus de notifications'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
