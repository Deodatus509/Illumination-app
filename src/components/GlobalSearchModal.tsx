import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, Library, GraduationCap, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = {
  id: string;
  title: string;
  description: string;
  type: 'blog' | 'library' | 'academy';
  url: string;
};

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [allData, setAllData] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (allData.length === 0) {
        fetchData();
      }
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [postsSnap, librarySnap, coursesSnap] = await Promise.all([
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'library')),
        getDocs(collection(db, 'courses'))
      ]);

      const data: SearchResult[] = [];

      postsSnap.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          title: d.title || '',
          description: d.previewContent || d.content?.substring(0, 100) || '',
          type: 'blog',
          url: `/blog/${d.slug || doc.id}`
        });
      });

      librarySnap.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          title: d.title || '',
          description: d.description || '',
          type: 'library',
          url: `/library`
        });
      });

      coursesSnap.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          title: d.title || d.name || '',
          description: d.description || '',
          type: 'academy',
          url: `/course/${doc.id}`
        });
      });

      setAllData(data);
    } catch (error) {
      console.error("Error fetching search data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const searchResults = React.useMemo(() => {
    if (!query.trim()) return { posts: [], library: [], courses: [] };
    
    const lowerQuery = query.toLowerCase();
    
    const filtered = allData.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.description.toLowerCase().includes(lowerQuery)
    );

    return {
      posts: filtered.filter(item => item.type === 'blog'),
      library: filtered.filter(item => item.type === 'library'),
      courses: filtered.filter(item => item.type === 'academy'),
    };
  }, [query, allData]);

  const hasResults = searchResults.posts.length > 0 || searchResults.library.length > 0 || searchResults.courses.length > 0;

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-obsidian-lighter border border-obsidian-light rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center p-4 border-b border-obsidian-light">
              <Search className="w-5 h-5 text-gray-500 mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des articles, livres, cours..."
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none text-lg"
              />
              {isLoading && <Loader2 className="w-5 h-5 text-gold animate-spin mr-3" />}
              <button
                onClick={handleClose}
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-obsidian"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {!query.trim() ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Que cherchez-vous aujourd'hui ?</p>
                </div>
              ) : !hasResults && !isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Aucun résultat trouvé pour "{query}"</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {searchResults.posts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Blogue
                      </h3>
                      <div className="space-y-2">
                        {searchResults.posts.map(post => (
                          <button
                            key={post.id}
                            onClick={() => handleNavigate(post.url)}
                            className="w-full text-left p-3 rounded-xl hover:bg-obsidian transition-colors group"
                          >
                            <h4 className="text-gray-200 font-medium group-hover:text-gold transition-colors">{post.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{post.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.library.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Library className="w-4 h-4" /> Bibliothèque
                      </h3>
                      <div className="space-y-2">
                        {searchResults.library.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.url)}
                            className="w-full text-left p-3 rounded-xl hover:bg-obsidian transition-colors group"
                          >
                            <h4 className="text-gray-200 font-medium group-hover:text-gold transition-colors">{item.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{item.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.courses.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Académie
                      </h3>
                      <div className="space-y-2">
                        {searchResults.courses.map(course => (
                          <button
                            key={course.id}
                            onClick={() => handleNavigate(course.url)}
                            className="w-full text-left p-3 rounded-xl hover:bg-obsidian transition-colors group"
                          >
                            <h4 className="text-gray-200 font-medium group-hover:text-gold transition-colors">{course.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{course.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
