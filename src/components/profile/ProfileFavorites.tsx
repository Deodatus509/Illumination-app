import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Heart, BookOpen, Library as LibraryIcon, Sparkles, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FavoriteButton } from '../ui/FavoriteButton';

interface FavoriteItem {
  id: string; // The favorite doc id
  itemId: string;
  itemType: 'ritual' | 'course' | 'post' | 'libraryItem';
  title: string;
  description?: string;
  image?: string;
  link: string;
}

export function ProfileFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'ritual' | 'course' | 'post' | 'libraryItem'>('all');

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const q = query(
          collection(db, 'favorites'),
          where('userId', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        
        const favsRaw = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        const hydratedFavs: FavoriteItem[] = [];

        for (const fav of favsRaw) {
          let colName = '';
          let link = '';
          if (fav.itemType === 'ritual') { colName = 'rituals'; link = `/sanctum-lucis/rituals/${fav.itemId}`; }
          else if (fav.itemType === 'course') { colName = 'courses'; link = `/academy/courses/${fav.itemId}`; }
          else if (fav.itemType === 'post') { colName = 'blogPosts'; link = `/blog/${fav.itemId}`; }
          else if (fav.itemType === 'libraryItem') { colName = 'library'; link = `/library/${fav.itemId}`; }
          
          if (!colName) continue;

          try {
            const itemDoc = await getDoc(doc(db, colName, fav.itemId));
            if (itemDoc.exists()) {
              const data = itemDoc.data();
              hydratedFavs.push({
                id: fav.id,
                itemId: fav.itemId,
                itemType: fav.itemType,
                title: data.title || data.name || 'Sans titre',
                description: data.description || data.excerpt || '',
                image: data.image_url || data.imageUrl || data.image || '',
                link
              });
            }
          } catch (e) {
            console.error(`Error fetching item ${fav.itemId} from ${colName}:`, e);
          }
        }

        setFavorites(hydratedFavs);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'favorites');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  const removeLocalFavorite = (favId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== favId));
  };

  const filteredFavorites = activeTab === 'all' 
    ? favorites 
    : favorites.filter(f => f.itemType === activeTab);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'all': return <Heart className="w-4 h-4" />;
      case 'ritual': return <Sparkles className="w-4 h-4" />;
      case 'course': return <GraduationCap className="w-4 h-4" />;
      case 'post': return <BookOpen className="w-4 h-4" />;
      case 'libraryItem': return <LibraryIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTabLabel = (type: string) => {
    switch (type) {
      case 'all': return 'Tous';
      case 'ritual': return 'Rituels';
      case 'course': return 'Formations';
      case 'post': return 'Articles';
      case 'libraryItem': return 'Ouvrages';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none">
        {['all', 'course', 'ritual', 'libraryItem', 'post'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors text-sm font-medium border ${
              activeTab === tab
                ? 'bg-gold text-obsidian border-gold'
                : 'bg-obsidian-lighter text-gray-400 border-obsidian-light hover:text-gray-200'
            }`}
          >
            {getTabIcon(tab)}
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      {filteredFavorites.length === 0 ? (
        <div className="text-center py-12 bg-obsidian-lighter rounded-2xl border border-obsidian-light">
          <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-serif text-gray-300">Aucun favori</h3>
          <p className="text-gray-500 mt-2">Vous n'avez pas encore ajouté de {activeTab !== 'all' ? getTabLabel(activeTab).toLowerCase() : 'favoris'}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map(fav => (
            <div key={fav.id} className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden hover:border-gold/30 transition-all flex flex-col group">
              {fav.image ? (
                <div className="h-40 overflow-hidden relative">
                  <img src={fav.image} alt={fav.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2">
                    <FavoriteButton itemId={fav.itemId} itemType={fav.itemType} />
                  </div>
                </div>
              ) : (
                <div className="h-40 bg-obsidian flex justify-center items-center relative">
                  {getTabIcon(fav.itemType)}
                  <div className="absolute top-2 right-2">
                    <FavoriteButton itemId={fav.itemId} itemType={fav.itemType} />
                  </div>
                </div>
              )}
              
              <div className="p-4 flex-grow flex flex-col">
                <div className="text-xs text-gold uppercase tracking-wider font-bold mb-2">
                  {getTabLabel(fav.itemType)}
                </div>
                <h4 className="text-gray-100 font-serif font-bold text-lg mb-2 line-clamp-2">{fav.title}</h4>
                {fav.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">{fav.description}</p>
                )}
                
                <Link 
                  to={fav.link}
                  className="mt-auto block text-center py-2 bg-obsidian border border-obsidian-light hover:border-gold text-gray-300 hover:text-gold rounded-lg transition-colors text-sm font-medium"
                >
                  Consulter
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
