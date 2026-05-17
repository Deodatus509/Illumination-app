import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function NotificationBell() {
  const { 
    unreadNotificationsCount, 
    recentNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = unreadNotificationsCount;

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gold transition-colors focus:outline-none flex items-center gap-1.5"
        title="Notifications"
        animate={unreadCount > 0 ? {
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.2, 1],
        } : {}}
        transition={{ 
          repeat: unreadCount > 0 ? Infinity : 0, 
          repeatDelay: 5,
          duration: 0.5,
          ease: "backOut"
        }}
      >
        <Bell className={cn("w-5 h-5 transition-colors", unreadCount > 0 ? "text-gold" : "text-gray-400")} />
        {unreadCount > 0 && (
          <span className="text-[10px] font-bold text-gold">{unreadCount}</span>
        )}
        {unreadCount > 0 && (
          <div className="absolute top-1.5 right-1.5">
            <motion.span 
              key={unreadCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative flex h-2 w-2"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
            </motion.span>
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-obsidian-lighter border border-obsidian-light rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-obsidian-light flex justify-between items-center bg-obsidian/50">
              <h3 className="font-bold text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-obsidian-light">
                  {recentNotifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 transition-colors relative group ${notif.isRead ? 'bg-transparent' : 'bg-gold/5'}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div 
                          className="flex-grow cursor-pointer"
                          onClick={() => {
                            if (!notif.isRead) markAsRead(notif.id);
                          }}
                        >
                          {notif.link ? (
                            <Link to={notif.link} onClick={() => setIsOpen(false)}>
                              <h4 className={`text-sm font-medium ${notif.isRead ? 'text-gray-300' : 'text-gold'}`}>
                                {notif.title}
                              </h4>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                            </Link>
                          ) : (
                            <div>
                              <h4 className={`text-sm font-medium ${notif.isRead ? 'text-gray-300' : 'text-gold'}`}>
                                {notif.title}
                              </h4>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link 
              to="/profile/notifications" 
              onClick={() => setIsOpen(false)}
              className="block p-3 text-center text-xs font-bold text-gray-400 hover:text-gold bg-obsidian/30 border-t border-obsidian-light hover:bg-obsidian-light transition-colors"
            >
              VOIR TOUTES LES NOTIFICATIONS
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
