import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';
import { Loader2, Plus, Star, Clock, BookOpen, Shield, Sparkles, ArrowLeft, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FavoriteButton } from '../components/ui/FavoriteButton';

export function SanctumRituals() {
  const { currentUser, userProfile, isAdmin, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'premium' | 'mine'>('available');
  const [rituals, setRituals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('Tous les niveaux');

  useEffect(() => {
    fetchRituals();
  }, [activeTab, currentUser]);

  const fetchRituals = async () => {
    setLoading(true);
    try {
      let q;
      if (activeTab === 'available') {
        q = query(collection(db, 'rituals'), where('is_active', '==', true), where('isPremium', '==', false));
      } else if (activeTab === 'premium') {
        q = query(collection(db, 'rituals'), where('is_active', '==', true), where('isPremium', '==', true));
      } else if (activeTab === 'mine' && currentUser) {
        // Fetch rituals where user is participant
        const participantQ = query(collection(db, 'ritual_participants'), where('userId', '==', currentUser.uid));
        const participantSnap = await getDocs(participantQ);
        const ritualIds = participantSnap.docs.map(doc => doc.data().ritualId);
        
        if (ritualIds.length > 0) {
          q = query(collection(db, 'rituals'), where('__name__', 'in', ritualIds.slice(0, 10)));
        } else {
          setRituals([]);
          setLoading(false);
          return;
        }
      } else {
        setRituals([]);
        setLoading(false);
        return;
      }

      if (q) {
        const snapshot = await getDocs(q);
        setRituals(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      }
    } catch (error) {
      console.error("Error fetching rituals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category?.toLowerCase()) {
      case 'protection': return <Shield className="w-4 h-4" />;
      case 'abondance': return <Star className="w-4 h-4" />;
      // case 'amour': is handled differently below if needed
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const isPremiumUser = userProfile?.isPremium || isAdmin();

  const filteredRituals = useMemo(() => {
    return rituals.filter(ritual => {
      const matchSearch = 
        ritual.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ritual.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ritual.category || 'Général').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDifficulty = difficultyFilter === 'Tous les niveaux' ? true : ritual.level === difficultyFilter;
      
      return matchSearch && matchDifficulty;
    });
  }, [rituals, searchQuery, difficultyFilter]);

  return (
    <div className="min-h-screen bg-obsidian">
      <PageBanner 
        pageName="sanctum_rituals"
        title="Rituels & Pratiques" 
      />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link 
          to="/sanctum-lucis" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour au Sanctuaire
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <p className="text-xl text-gray-300 max-w-2xl">
            Découvrez des rituels puissants partagés par la communauté et nos experts. Pratiquez avec intention et respect.
          </p>
          <Link 
            to="/sanctum-lucis/rituals/propose"
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Proposer un rituel
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-obsidian-light mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'available' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Rituels Disponibles
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'premium' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Star className="w-4 h-4" /> Rituels Premium
          </button>
          <button
            onClick={() => {
              if (!currentUser) openAuthModal();
              else setActiveTab('mine');
            }}
            className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'mine' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Mes Rituels
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rituel (titre, description, catégorie)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-obsidian-lighter border border-obsidian-light rounded-xl text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full md:w-64 pl-12 pr-10 py-3 bg-obsidian-lighter border border-obsidian-light rounded-xl text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none appearance-none"
            >
              <option value="Tous les niveaux">Tous les niveaux</option>
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Avancé">Avancé</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
        ) : filteredRituals.length === 0 ? (
          <div className="text-center py-12 bg-obsidian-lighter rounded-xl border border-obsidian-light">
            <p className="text-gray-400">Aucun rituel trouvé pour votre recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRituals.map((ritual) => (
              <motion.div 
                key={ritual.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden flex flex-col group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={ritual.imageUrl || 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&q=80'} 
                    alt={ritual.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    {ritual.isPremium && (
                      <span className="bg-gold text-obsidian px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" /> Premium
                      </span>
                    )}
                    <FavoriteButton itemId={ritual.id} itemType="ritual" />
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-obsidian-light">
                      {getCategoryIcon(ritual.category)}
                      {ritual.category || 'Général'}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-100 mb-2">{ritual.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{ritual.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 mt-auto">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gold" />
                      {ritual.duration || '30 min'}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4 text-gold" />
                      {ritual.level || 'Tous niveaux'}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link 
                      to={`/sanctum-lucis/rituals/${ritual.id}`}
                      className="flex-1 py-2 bg-obsidian border border-obsidian-light text-gray-300 rounded-lg text-center hover:bg-obsidian-light transition-colors text-sm font-medium"
                    >
                      Voir détails
                    </Link>
                    {(!ritual.isPremium || isPremiumUser) ? (
                      <button className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-center transition-colors text-sm font-medium">
                        S'inscrire
                      </button>
                    ) : (
                      <button disabled className="flex-1 py-2 bg-obsidian border border-obsidian-light text-gray-500 rounded-lg text-center text-sm font-medium cursor-not-allowed">
                        Abonnement Requis
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
