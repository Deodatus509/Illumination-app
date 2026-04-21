import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface MemberItemProps {
  member: any;
}

export function MemberItem({ member }: MemberItemProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const displayName = profile?.displayName || profile?.nickname || 'Membre';
  const bgColor = stringToColor(member.user_id || 'default');

  return (
    <div className="bg-obsidian p-5 rounded-xl border border-obsidian-light flex items-center gap-4 group hover:border-gold/30 transition-all">
      {profile?.photoURL ? (
        <img 
          src={profile.photoURL || undefined} 
          alt={displayName} 
          className="w-12 h-12 rounded-full object-cover border border-white/10 shadow-lg shrink-0" 
          referrerPolicy="no-referrer"
        />
      ) : (
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 border border-white/10"
          style={{ backgroundColor: bgColor }}
        >
          {getInitials(displayName)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-bold truncate">
          {loading ? 'Chargement...' : displayName}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">Inscrit le {joinedDate}</p>
      </div>
      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] shrink-0" />
    </div>
  );
}
