import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Download, Eye, Search, Filter, User } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { SocialShare } from '../components/SocialShare';
import { PageBanner } from '../components/layout/PageBanner';

export function Library() {
  const { userProfile } = useAuth();
  const isPremium = userProfile?.role === 'prestataire' || userProfile?.role === 'admin';
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, format: string, title: string } | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');

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

  const uniqueAuthors = Array.from(new Set(items.map(item => item.author).filter(Boolean)));

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFormat = formatFilter === 'all' || item.format === formatFilter;
    const matchesAccess = accessFilter === 'all' || 
                          (accessFilter === 'free' && item.isFree) || 
                          (accessFilter === 'paid' && !item.isFree);
    const matchesAuthor = authorFilter === 'all' || item.author === authorFilter;
    
    return matchesSearch && matchesFormat && matchesAccess && matchesAuthor;
  });

  return (
    <div className="flex flex-col">
      <PageBanner pageName="library" title="Bibliothèque" />
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Acquérez et consultez des ouvrages rares. Les documents sont protégés par des filigranes dynamiques pour garantir leur intégrité.
          </p>
      </div>

      {/* Filters Section */}
      <div className="mb-12 bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un ouvrage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-obsidian-light rounded-lg leading-5 bg-obsidian text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="block w-full pl-10 pr-8 py-3 border border-obsidian-light rounded-lg leading-5 bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold appearance-none"
            >
              <option value="all">Tous les auteurs</option>
              {uniqueAuthors.map(author => (
                <option key={author as string} value={author as string}>{author as string}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="block w-full pl-10 pr-8 py-3 border border-obsidian-light rounded-lg leading-5 bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold appearance-none"
            >
              <option value="all">Tous les formats</option>
              <option value="PDF">PDF</option>
              <option value="Epub">Epub</option>
              <option value="Vidéo">Vidéo</option>
              <option value="Audio">Audio</option>
              <option value="Image">Image</option>
            </select>
          </div>

          <div className="relative min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              className="block w-full pl-10 pr-8 py-3 border border-obsidian-light rounded-lg leading-5 bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold appearance-none"
            >
              <option value="all">Tout accès</option>
              <option value="free">Gratuit</option>
              <option value="paid">Payant</option>
            </select>
          </div>
        </div>
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
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
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
                      onClick={() => item.fileUrl && setSelectedMedia({ url: item.fileUrl, format: item.format || 'PDF', title: item.title })}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-obsidian border border-gold text-gold rounded-md hover:bg-gold/10 transition-colors text-sm font-bold"
                    >
                      <Eye className="w-4 h-4" /> {item.format === 'Audio' ? 'Écouter' : item.format === 'Vidéo' ? 'Regarder' : 'Lire'}
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
          <div className="col-span-full text-center py-12 text-gray-500 bg-obsidian-lighter rounded-xl border border-obsidian-light">
            Aucun document ne correspond à vos critères de recherche.
          </div>
        )}
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-obsidian w-full max-w-6xl h-[90vh] rounded-2xl border border-obsidian-light flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-obsidian-light">
              <h3 className="text-xl font-serif font-bold text-gold">{selectedMedia.title}</h3>
              <button 
                onClick={() => setSelectedMedia(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Fermer
              </button>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {selectedMedia.format === 'PDF' || selectedMedia.format === 'Epub' ? (
                <iframe 
                  src={`${selectedMedia.url}#toolbar=0`} 
                  className="w-full h-full bg-white" 
                  title={selectedMedia.title}
                />
              ) : selectedMedia.format === 'Vidéo' ? (
                <video 
                  controls 
                  src={selectedMedia.url} 
                  className="w-full h-full object-contain"
                />
              ) : selectedMedia.format === 'Audio' ? (
                <div className="w-full max-w-md p-8 bg-obsidian-lighter rounded-xl border border-obsidian-light">
                  <audio 
                    controls 
                    src={selectedMedia.url} 
                    className="w-full"
                  />
                </div>
              ) : selectedMedia.format === 'Image' ? (
                <img 
                  src={selectedMedia.url} 
                  alt={selectedMedia.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-gray-400">Format non supporté pour la prévisualisation.</div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
