import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Download, Eye } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { SocialShare } from '../components/SocialShare';

export function Library() {
  const { userProfile } = useAuth();
  const isPremium = userProfile?.role === 'prestataire' || userProfile?.role === 'admin';
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'library'), orderBy('title', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(fetchedItems);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'library');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gold mb-4">La Bibliothèque</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Acquérez et consultez des ouvrages rares. Les documents sont protégés par des filigranes dynamiques pour garantir leur intégrité.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-obsidian-lighter rounded-xl overflow-hidden border border-obsidian-light animate-pulse flex flex-col h-[500px]">
              <div className="relative aspect-[2/3] bg-obsidian shrink-0"></div>
              <div className="p-6 flex flex-col flex-grow space-y-4">
                <div className="h-6 bg-obsidian rounded w-3/4"></div>
                <div className="space-y-2 flex-grow">
                  <div className="h-4 bg-obsidian rounded w-full"></div>
                  <div className="h-4 bg-obsidian rounded w-5/6"></div>
                </div>
                <div className="mt-auto pt-4 border-t border-obsidian-light">
                  <div className="h-10 bg-obsidian rounded w-full"></div>
                </div>
              </div>
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-obsidian-lighter rounded-xl overflow-hidden border border-obsidian-light flex flex-col group"
            >
            <div className="relative aspect-[2/3] overflow-hidden bg-obsidian">
              <img 
                src={item.coverUrl || item.coverImage} 
                alt={item.title} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                referrerPolicy="no-referrer"
              />
              {!item.isFree && !isPremium && (
                <div className="absolute top-4 right-4 bg-obsidian/90 backdrop-blur px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-bold text-gold border border-gold/30">
                  <Lock className="w-4 h-4" /> ${item.price}
                </div>
              )}
              {item.isFree && (
                <div className="absolute top-4 right-4 bg-mystic-purple/90 backdrop-blur px-3 py-1.5 rounded-md text-sm font-bold text-white border border-mystic-purple-light">
                  Gratuit
                </div>
              )}
            </div>
            
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-serif font-bold text-gray-100 mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm mb-4 flex-grow">{item.description}</p>
              
              <div className="mb-6">
                <SocialShare url={`${window.location.origin}/library?item=${item.id}`} title={item.title} />
              </div>

              <div className="mt-auto pt-4 border-t border-obsidian-light">
                {item.isFree || isPremium ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => item.fileUrl && window.open(item.fileUrl, '_blank')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-obsidian border border-gold text-gold rounded-md hover:bg-gold/10 transition-colors text-sm font-bold"
                    >
                      <Eye className="w-4 h-4" /> Lire
                    </button>
                    {isPremium && (
                      <button 
                        onClick={() => item.fileUrl && window.open(item.fileUrl, '_blank')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold text-obsidian rounded-md hover:bg-gold-light transition-colors text-sm font-bold"
                      >
                        <Download className="w-4 h-4" /> {item.format || 'Fichier'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-mystic-purple-light text-white rounded-md hover:bg-mystic-purple transition-colors text-sm font-bold">
                    Acquérir l'ouvrage
                  </button>
                )}
              </div>
            </div>
          </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            Aucun document disponible pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
