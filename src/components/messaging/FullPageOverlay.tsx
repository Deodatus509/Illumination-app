import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Headphones, Video, FileText, Calendar, Users, History, Settings, Plus } from 'lucide-react';

interface TabConfig {
  title: string;
  icon: any;
  action: React.ReactNode;
}

interface FullPageOverlayProps {
  activeTab: string;
  onClose: () => void;
  canManage: boolean;
  setShowAddModal: (type: any) => void;
  children: React.ReactNode;
}

export function FullPageOverlay({ activeTab, onClose, canManage, setShowAddModal, children }: FullPageOverlayProps) {
  const getTabConfig = (): TabConfig | null => {
    switch (activeTab) {
      case 'content': return { title: 'Contenu détaillé', icon: BookOpen, action: null };
      case 'audios': return { 
        title: 'Bibliothèque Audio', 
        icon: Headphones, 
        action: canManage && (
          <button onClick={() => setShowAddModal('audio')} className="text-gold p-2 hover:bg-white/5 rounded-full"><Plus className="w-5 h-5"/></button>
        )
      };
      case 'videos': return { 
        title: 'Vidéothèque', 
        icon: Video, 
        action: canManage && (
          <button onClick={() => setShowAddModal('video')} className="text-gold p-2 hover:bg-white/5 rounded-full"><Plus className="w-5 h-5"/></button>
        )
      };
      case 'docs': return { 
        title: 'Documents', 
        icon: FileText, 
        action: canManage && (
          <button onClick={() => setShowAddModal('file')} className="text-gold p-2 hover:bg-white/5 rounded-full"><Plus className="w-5 h-5"/></button>
        )
      };
      case 'calendar': return { 
        title: 'Calendrier des séances', 
        icon: Calendar, 
        action: canManage && (
          <button onClick={() => setShowAddModal('event')} className="text-gold p-2 hover:bg-white/5 rounded-full"><Plus className="w-5 h-5"/></button>
        )
      };
      case 'members': return { title: 'Membres du Sanctuaire', icon: Users, action: null };
      case 'history': return { title: 'Historique', icon: History, action: null };
      case 'management': return { 
        title: 'Gestion des sessions', 
        icon: Settings, 
        action: canManage && (
          <button onClick={() => setShowAddModal('session')} className="text-gold p-2 hover:bg-white/5 rounded-full"><Plus className="w-5 h-5"/></button>
        )
      };
      default: return null;
    }
  };

  const config = getTabConfig();
  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-[#0c0c0e] flex flex-col font-sans h-[100dvh] overflow-hidden text-zinc-200"
      >
        <div className="flex-none h-16 px-4 md:px-6 bg-[#050505] border-b border-white/5 flex items-center justify-between">
          <button onClick={onClose} className="text-zinc-400 w-20 hover:text-white transition-colors flex items-center">
            <ArrowLeft className="w-5 h-5 mr-2 sm:mr-3" />
            <span className="hidden sm:inline font-bold uppercase tracking-widest text-[11px]">Retour</span>
          </button>
          
          <div className="flex flex-col items-center flex-1">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <config.icon className="w-4 h-4 text-gold" /> {config.title}
            </h2>
          </div>

          <div className="w-20 flex justify-end">
            {config.action}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 bg-[#0a0a0c]">
           <div className="max-w-5xl mx-auto w-full pb-32">
             {children}
           </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
