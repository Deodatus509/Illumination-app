import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MoreVertical, User, MessageSquare, Ban, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MemberItemProps {
  member: any;
  canManage?: boolean;
}

export function MemberItem({ member, canManage }: MemberItemProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!member.user_id) return;
        const docRef = doc(db, 'users', member.user_id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } catch (err) {
        console.error("Error fetching user profile", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [member.user_id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const joinedDate = member.joined_at?.seconds 
    ? new Date(member.joined_at.seconds * 1000).toLocaleDateString()
    : 'Récemment';

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777215)).toString(16);
    return '#' + '000000'.substring(0, 6 - color.length) + color;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const handleToggleBlock = async () => {
    try {
      if (member.id) {
        await updateDoc(doc(db, 'meditation_members', member.id), {
          is_blocked: !member.is_blocked
        });
      }
      setShowMenu(false);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification du statut.");
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Voulez-vous vraiment retirer ce membre de la classe ?")) return;
    try {
      if (member.id) {
        await deleteDoc(doc(db, 'meditation_members', member.id));
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleMessage = () => {
    navigate('/dashboard/messages');
  };

  const handleProfile = () => {
    alert(`Profil de ${displayName}\n${profile?.bio || 'Biographie non disponible.'}`);
  };

  const displayName = profile?.displayName || profile?.nickname || 'Membre';
  const bgColor = stringToColor(member.user_id || 'default');

  return (
    <div className={`relative p-5 rounded-xl border flex items-center justify-between group transition-all ${member.is_blocked ? 'bg-red-900/10 border-red-500/20 opacity-75' : 'bg-white dark:bg-obsidian border-gray-200 dark:border-obsidian-light hover:border-gold/30'}`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {profile?.photoURL ? (
          <img 
            src={profile.photoURL || undefined} 
            alt={displayName} 
            className="w-12 h-12 rounded-full object-cover shadow-lg shrink-0" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            {getInitials(displayName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-gray-900 dark:text-white">
            {loading ? 'Chargement...' : displayName} {member.is_blocked && <span className="text-xs text-red-500 font-normal ml-2">(Bloqué)</span>}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Inscrit le {joinedDate}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 pl-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${member.is_blocked ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden text-sm">
              <button onClick={handleProfile} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 flex items-center gap-2 transition-colors">
                <User className="w-4 h-4" /> Voir le profil
              </button>
              <button onClick={handleMessage} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 flex items-center gap-2 transition-colors">
                <MessageSquare className="w-4 h-4" /> Message privé
              </button>
              {canManage && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-white/10 w-full" />
                  <button onClick={handleToggleBlock} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors">
                    <Ban className="w-4 h-4" /> {member.is_blocked ? 'Débloquer' : 'Bloquer'}
                  </button>
                  <button onClick={handleRemove} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors">
                    <Trash2 className="w-4 h-4" /> Retirer
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
