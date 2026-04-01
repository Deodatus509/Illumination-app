import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Star, Shield, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export function About() {
  const navigate = useNavigate();
  const { currentUser, openAuthModal } = useAuth();
  
  const [settings, setSettings] = useState<{
    title?: string;
    subtitle?: string;
    missionTitle?: string;
    missionText1?: string;
    missionText2?: string;
    missionImageUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'about');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as any);
        }
      } catch (err) {
        console.error('Error fetching about settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleFeatureClick = (title: string) => {
    switch(title) {
      case 'Savoir Ancien':
        navigate('/academy');
        break;
      case 'Communauté':
        navigate('/blog');
        break;
      case 'Excellence':
        navigate('/library');
        break;
      case 'Protection':
        navigate('/contact');
        break;
    }
  };

  const handleJoinClick = () => {
    if (currentUser) {
      navigate('/academy');
    } else {
      openAuthModal('register');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-obsidian">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  const title = settings?.title || "À Propos d'Illumination";
  const subtitle = settings?.subtitle || "Illumination est bien plus qu'une simple plateforme d'apprentissage. C'est un sanctuaire numérique dédié à l'éveil spirituel, à la connaissance ésotérique et à l'évolution personnelle de chaque chercheur de vérité.";
  const missionTitle = settings?.missionTitle || "Notre Mission";
  const missionText1 = settings?.missionText1 || "Notre mission est de démocratiser l'accès aux enseignements spirituels profonds, tout en préservant leur caractère sacré. Nous croyons que la véritable connaissance doit être à la fois accessible et protégée, offerte à ceux qui sont prêts à la recevoir.";
  const missionText2 = settings?.missionText2 || "À travers nos formations, notre bibliothèque d'ouvrages rares et notre blogue initiatique, nous guidons chaque membre sur son propre chemin d'illumination.";
  const missionImageUrl = settings?.missionImageUrl || "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop";

  const features = (settings as any)?.features || [
    { icon: "BookOpen", title: "Savoir Ancien", desc: "Des enseignements millénaires adaptés au monde moderne." },
    { icon: "Users", title: "Communauté", desc: "Un réseau de chercheurs partageant la même quête." },
    { icon: "Star", title: "Excellence", desc: "Une qualité de contenu rigoureusement sélectionnée." },
    { icon: "Shield", title: "Protection", desc: "Un espace sécurisé pour votre évolution spirituelle." }
  ];

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'BookOpen': return <BookOpen className="w-8 h-8" />;
      case 'Users': return <Users className="w-8 h-8" />;
      case 'Star': return <Star className="w-8 h-8" />;
      case 'Shield': return <Shield className="w-8 h-8" />;
      default: return <Star className="w-8 h-8" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-serif font-bold text-gold mb-6"
        >
          {title}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 max-w-3xl mx-auto text-lg leading-relaxed whitespace-pre-wrap"
        >
          {subtitle}
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-3xl font-serif font-bold text-gray-100">{missionTitle}</h2>
          <p className="text-gray-400 leading-relaxed text-lg whitespace-pre-wrap">
            {missionText1}
          </p>
          <p className="text-gray-400 leading-relaxed text-lg whitespace-pre-wrap">
            {missionText2}
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative h-96 rounded-2xl overflow-hidden border border-obsidian-light shadow-2xl"
        >
          <img 
            src={missionImageUrl} 
            alt="Spiritual Journey" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian to-transparent opacity-60"></div>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        {features.map((feature: any, index: number) => (
          <motion.div 
            key={index}
            onClick={() => handleFeatureClick(feature.title)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
            className="bg-obsidian-lighter p-8 rounded-2xl border border-obsidian-light text-center group hover:border-gold/50 transition-colors cursor-pointer"
          >
            <div className="text-gold mb-4 flex justify-center group-hover:scale-110 transition-transform">{getIcon(feature.icon)}</div>
            <h3 className="text-xl font-bold text-gray-100 mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-obsidian-lighter rounded-3xl p-12 text-center border border-obsidian-light relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent"></div>
        <h2 className="text-3xl font-serif font-bold text-gray-100 mb-6">Rejoignez la Confrérie</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
          Que vous soyez au début de votre cheminement ou un initié expérimenté, Illumination vous offre les clés pour franchir la prochaine étape de votre évolution.
        </p>
        <button 
          onClick={handleJoinClick}
          className="px-8 py-4 bg-gold text-obsidian font-bold rounded-lg hover:bg-gold-light transition-colors shadow-lg shadow-gold/20"
        >
          Commencer le Voyage
        </button>
      </div>
    </div>
  );
}
