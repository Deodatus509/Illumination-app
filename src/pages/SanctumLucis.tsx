import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Moon, Sun, BookOpen, MessageCircle, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PageBanner } from '../components/layout/PageBanner';

export function SanctumLucis() {
  const { currentUser, openAuthModal } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [loadingQuote, setLoadingQuote] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (quotes.length > 1) {
      const interval = setInterval(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
      }, 10000); // Change quote every 10 seconds
      return () => clearInterval(interval);
    }
  }, [quotes]);

  const fetchQuotes = async () => {
    setLoadingQuote(true);
    try {
      const q = query(
        collection(db, 'spiritual_quotes'),
        where('is_active', '==', true),
        limit(20)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const fetchedQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuotes(fetchedQuotes);
        setCurrentQuoteIndex(Math.floor(Math.random() * fetchedQuotes.length));
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleNextQuote = () => {
    if (quotes.length > 0) {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }
  };

  const quote = quotes[currentQuoteIndex];

  return (
    <div className="min-h-screen bg-obsidian">
      <PageBanner 
        pageName="sanctum_lucis"
        title="Sanctum Lucis" 
      />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Section 1: Citation Spirituelle */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="bg-gradient-to-r from-mystic-purple/20 to-gold/10 rounded-2xl p-8 border border-mystic-purple/30 text-center relative overflow-hidden">
            <Sparkles className="absolute top-4 left-4 text-gold/30 w-8 h-8" />
            <Sparkles className="absolute bottom-4 right-4 text-mystic-purple/30 w-8 h-8" />
            
            <h2 className="text-2xl font-serif font-bold text-gold mb-6">Guidance du Moment</h2>
            
            <div className="min-h-[120px] flex flex-col items-center justify-center">
              {loadingQuote ? (
                <div className="animate-pulse flex flex-col items-center w-full">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                </div>
              ) : quote ? (
                <AnimatePresence mode="wait">
                  <motion.blockquote 
                    key={quote.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl md:text-2xl italic text-gray-200 mb-4 w-full"
                  >
                    "{quote.text}"
                    <footer className="text-sm text-gold mt-2">— {quote.author}</footer>
                  </motion.blockquote>
                </AnimatePresence>
              ) : (
                <p className="text-gray-400">La lumière vous guide à chaque instant.</p>
              )}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button 
                onClick={handleNextQuote}
                className="px-6 py-2 bg-obsidian border border-gold/50 text-gold rounded-full hover:bg-gold/10 transition-colors flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Nouvelle citation
              </button>
            </div>
          </div>
        </motion.section>

        {/* Grid for other sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Section 2: Consultation Spirituelle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-obsidian-lighter rounded-xl p-6 border border-obsidian-light hover:border-gold/50 transition-colors group"
          >
            <div className="w-12 h-12 bg-mystic-purple/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Moon className="w-6 h-6 text-mystic-purple-light" />
            </div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">Consultation Spirituelle</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Étude de carte du ciel, Tarot, Numérologie. Demandez une guidance personnalisée à nos experts.
            </p>
            <Link to="/sanctum-lucis/consultations" className="block w-full text-center py-2 bg-mystic-purple hover:bg-mystic-purple-light text-white rounded-lg transition-colors">
              Demander une consultation
            </Link>
          </motion.div>

          {/* Section 3: Méditation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-obsidian-lighter rounded-xl p-6 border border-obsidian-light hover:border-blue-400/50 transition-colors group"
          >
            <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sun className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">Méditation Collective</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Rejoignez nos classes de méditation en direct. Participez à l'éveil collectif.
            </p>
            <Link to="/sanctum-lucis/meditations" className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              Voir les classes
            </Link>
          </motion.div>

          {/* Section 4: Rituel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-obsidian-lighter rounded-xl p-6 border border-obsidian-light hover:border-green-400/50 transition-colors group"
          >
            <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">Rituels & Pratiques</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Découvrez des rituels puissants ou proposez les vôtres à la communauté.
            </p>
            <Link to="/sanctum-lucis/rituals" className="block w-full text-center py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors">
              Explorer les rituels
            </Link>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
