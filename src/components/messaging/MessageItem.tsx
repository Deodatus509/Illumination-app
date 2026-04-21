import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Copy, Forward, Reply, Info, UserCircle, CheckCheck, ExternalLink, Download, Mic, FileText, Video, Pin, ShieldBan } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  sender_role?: string;
  message: string;
  file_url?: string;
  file_type?: string;
  created_at: any;
  is_read: boolean;
  isPinned?: boolean;
  userName?: string;
}

export function MessageItem({ 
  message, 
  isOwn, 
  userRole, 
  onAction,
  isLiveChat = false,
}: { 
  message: Message, 
  isOwn: boolean, 
  userRole: string,
  onAction: (action: string, msg: Message) => void,
  isLiveChat?: boolean,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole === 'admin' || userRole === 'editor' || userRole === 'author';
  const canEditOrDelete = isOwn || isAdmin;

  const renderFile = () => {
    if (!message.file_url) return null;
    
    switch (message.file_type) {
      case 'image':
        return (
          <div className="relative group/img overflow-hidden rounded-xl border border-white/10 bg-black/5 mt-2">
            <img src={message.file_url || undefined} alt="Shared" className="max-w-full h-auto object-cover" referrerPolicy="no-referrer" />
          </div>
        );
      case 'audio':
        return (
          <div className="bg-black/20 p-3 rounded-xl border border-white/5 mt-2">
            <audio controls className="w-full h-10"><source src={message.file_url || undefined} />Votre navigateur ne supporte pas.</audio>
          </div>
        );
      case 'video':
        return (
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video mt-2">
            <video controls playsInline className="w-full h-full object-contain"><source src={message.file_url || undefined} />Votre navigateur ne supporte pas.</video>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 mt-2">
            <FileText className="w-6 h-6 text-yellow-500" />
            <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-white underline hover:text-yellow-500 transition-colors">Voir le document</a>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'} group w-full animate-in fade-in slide-in-from-bottom-2`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-auto mb-1 border border-white/5 shadow-md">
          <UserCircle className="w-5 h-5 text-gray-400" />
        </div>
      )}
      
      <div 
        className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <motion.div 
          className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-sm text-sm relative group/bubble ${
            isOwn 
              ? 'bg-zinc-800 text-white rounded-br-sm border border-zinc-700 shadow-xl shadow-black/20' 
              : 'bg-[#111113] text-gray-200 border border-white/5 rounded-bl-sm shadow-xl shadow-black/20'
          }`}
          onClick={() => setShowMenu(!showMenu)}
        >
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1.5 opacity-90">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                message.sender_role === 'admin' || message.sender_role === 'editor' || message.sender_role === 'author' 
                  ? 'text-yellow-500' 
                  : 'text-zinc-500'
              }`}>
                {message.sender_role === 'admin' || message.sender_role === 'editor' || message.sender_role === 'author' ? 'Expert Sanctum' : 'Membre'}
              </span>
              <span className="text-xs font-semibold text-white/80">{message.userName}</span>
            </div>
          )}
          {message.message && <p className="whitespace-pre-wrap leading-relaxed text-[13px] sm:text-sm">{message.message}</p>}
          {renderFile()}
          
          <div className={`text-[10px] mt-2 text-right flex items-center justify-end gap-1.5 ${
              isOwn ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              {message.created_at?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {isOwn && <CheckCheck className={`w-3.5 h-3.5 ${message.is_read ? 'text-blue-400' : 'opacity-60'}`} />}
            </div>
            
            <button 
              className={`absolute top-2 ${isOwn ? '-left-10' : '-right-10'} opacity-0 group-hover/bubble:opacity-100 transition-opacity p-2 hover:text-white text-zinc-500`}
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <MoreVertical size={16} />
            </button>
        </motion.div>

        <AnimatePresence>
          {showMenu && (
            <motion.div 
              ref={menuRef}
              onClick={(e) => e.stopPropagation()} 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} z-50 bg-[#161616] border border-white/10 shadow-2xl rounded-xl w-48 overflow-hidden py-1`}
            >
              {[
                !isLiveChat && { label: 'Répondre', icon: Reply, act: 'reply' },
                !isLiveChat && { label: 'Transférer', icon: Forward, act: 'forward' },
                { label: 'Copier le texte', icon: Copy, act: 'copy' },
                !isLiveChat && { label: 'Infos', icon: Info, act: 'info' },
                isLiveChat && isAdmin && { label: message.isPinned ? 'Désépingler' : 'Épingler', icon: Pin, act: 'pin' },
                canEditOrDelete && !isLiveChat && { label: 'Modifier', icon: Edit2, act: 'edit' },
                canEditOrDelete && { label: isLiveChat ? 'Supprimer pour tous' : 'Supprimer', icon: Trash2, act: 'delete', danger: true },
                isLiveChat && isAdmin && !isOwn && { label: 'Bannir l\'utilisateur', icon: ShieldBan, act: 'ban', danger: true },
              ].filter(Boolean).map((item: any) => (
                <button
                  key={item.act}
                  onClick={() => { 
                    onAction(item.act, message); 
                    setShowMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-3 transition-colors ${item.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                >
                  <item.icon size={14} /> {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
