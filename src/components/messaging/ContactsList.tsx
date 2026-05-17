import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UserCircle, Search, Loader2 } from 'lucide-react';

interface UserContact {
  id: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
}

interface ContactsListProps {
  onSelectContact: (userId: string, userName: string) => void;
}

export function ContactsList({ onSelectContact }: ContactsListProps) {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        // Simple query: get first 50 users
        const q = query(collection(db, 'users'), limit(50));
        const snapshot = await getDocs(q);
        const fetchedContacts: UserContact[] = [];
        snapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) {
            fetchedContacts.push({
              id: doc.id,
              name: doc.data().name || doc.data().displayName || 'Utilisateur',
              email: doc.data().email || '',
              role: doc.data().role || 'client',
              photoURL: doc.data().photoURL
            });
          }
        });
        setContacts(fetchedContacts);
      } catch (err) {
        console.error("Error fetching contacts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [currentUser]);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Rechercher un contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-obsidian border border-obsidian-light rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-mystic-purple transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-obsidian-light scrollbar-track-transparent">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gold" /></div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-4">Aucun contact trouvé</div>
        ) : (
          filteredContacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => onSelectContact(contact.id, contact.name)}
              className="flex items-center gap-3 p-3 border-b border-obsidian-light hover:bg-obsidian cursor-pointer transition-colors"
            >
              {contact.photoURL ? (
                <img src={contact.photoURL} alt={contact.name} className="w-10 h-10 rounded-full border border-obsidian-light" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle className="w-10 h-10 text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{contact.name}</p>
                <p className="text-[10px] text-gray-500 capitalize">{contact.role}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
