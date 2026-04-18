import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Copy, Forward, Reply, Info, UserCircle, CheckCircle, ExternalLink, Download, Mic, FileText, Video } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  sender_role?: string;
  message: string;
  file_url?: string;
  file_type?: string;
  created_at: any;
  is_read: boolean;
}

export function MessageItem({ 
  message, 
  isOwn, 
  userRole, 
  onAction,
}: { 
  message: Message, 
  isOwn: boolean, 
  userRole: string,
  onAction: (action: string, msg: Message) => void,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole === 'admin';
  const canEditOrDelete = isOwn || isAdmin;

  const renderFile = () => {
    if (!message.file_url) return null;
    
    switch (message.file_type) {
      case 'image':
        return (
          <div className="relative group/img overflow-hidden rounded-xl border border-black/10 bg-black/5 mt-2">
            <img src={message.file_url} alt="Shared" className="max-w-full h-auto object-cover" referrerPolicy="no-referrer" />
          </div>
        );
      case 'audio':
        return (
          <div className="bg-black/10 p-3 rounded-xl border border-black/5 mt-2">
            <audio controls className="w-full h-10"><source src={message.file_url} />Votre navigateur ne supporte pas.</audio>
          </div>
        );
      case 'video':
        return (
          <div className="relative rounded-xl overflow-hidden border border-black/10 bg-black aspect-video mt-2">
            <video controls playsInline className="w-full h-full object-contain"><source src={message.file_url} />Votre navigateur ne supporte pas.</video>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 bg-black/10 rounded-xl border border-black/5 mt-2">
            <FileText className="w-6 h-6 text-gold" />
            <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-white underline">Voir le document</a>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Si on clique en dehors de notre menu (menuRef)
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
    <div className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'} group w-full`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-obsidian-light flex items-center justify-center flex-shrink-0 mt-auto mb-1">
          <UserCircle className="w-5 h-5 text-gray-400" />
        </div>
      )}
      
      <div 
        className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <motion.div 
          className={`px-5 py-3 rounded-2xl shadow-sm text-sm relative group/bubble ${
            isOwn 
              ? 'bg-mystic-purple text-white rounded-br-sm' 
              : 'bg-obsidian-lighter text-gray-200 border border-obsidian-light rounded-bl-sm'
          }`}
          onClick={() => setShowMenu(!showMenu)}
        >
          {!isOwn && (
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1 block">
              {message.sender_role === 'admin' || message.sender_role === 'editor' || message.sender_role === 'author' ? 'Expert Sanctum' : 'Utilisateur'}
            </span>
          )}
          {message.message && <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>}
          {renderFile()}
          
          <div className={`text-[10px] mt-2 text-right flex items-center justify-end gap-1 ${
              isOwn ? 'text-mystic-purple-light/80' : 'text-gray-500'
            }`}>
              {message.created_at?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {isOwn && <CheckCircle className={`w-3 h-3 ${message.is_read ? 'text-green-400' : 'opacity-50'}`} />}
            </div>
            
            <button 
              className={`absolute top-2 ${isOwn ? '-left-8' : '-right-8'} opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 hover:text-gold`}
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <MoreVertical size={16} />
            </button>
        </motion.div>

        <AnimatePresence>
          {showMenu && (
            <motion.div 
              ref={menuRef}
              // CE DIV GARANTIT QUE LE CLIC À L'INTÉRIEUR NE FERME PAS LE MENU
              onClick={(e) => e.stopPropagation()} 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute top-12 ${isOwn ? 'right-0' : 'left-0'} z-50 bg-obsidian border border-obsidian-light shadow-2xl rounded-xl w-48 overflow-hidden`}
            >
              {[
                { label: 'Répondre', icon: Reply, act: 'reply' },
                { label: 'Copier', icon: Copy, act: 'copy' },
                { label: 'Transférer', icon: Forward, act: 'forward' },
                { label: 'Infos', icon: Info, act: 'info' },
                canEditOrDelete && { label: 'Modifier', icon: Edit2, act: 'edit' },
                canEditOrDelete && { label: 'Supprimer', icon: Trash2, act: 'delete', danger: true },
              ].filter(Boolean).map((item: any) => (
                <button
                  key={item.act}
                  onClick={() => { 
                    onAction(item.act, message); 
                    setShowMenu(false); // Fermeture explicite après action
                  }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-obsidian-light ${item.danger ? 'text-red-400' : 'text-gray-200'}`}
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
