import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Star, Shield } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mystic-purple/20 to-obsidian z-0" />
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/mystic/1920/1080?blur=4')] opacity-20 mix-blend-overlay z-0" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-serif font-bold text-gold mb-6 tracking-tight"
          >
            ILLUMINATION
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-10 font-light"
          >
            Votre Sanctuaire Numérique d'Enseignements Ésotériques et Initiatiques.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link 
              to="/blog" 
              className="px-8 py-4 rounded-md bg-gold text-obsidian font-bold hover:bg-gold-light transition-all transform hover:scale-105"
            >
              Découvrir les Enseignements
            </Link>
            <Link 
              to="/academy" 
              className="px-8 py-4 rounded-md border border-gold text-gold font-bold hover:bg-gold/10 transition-all"
            >
              Rejoindre l'Académie
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-24 bg-obsidian-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-6">La Vision de Déodatus Yosèf</h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                Bienvenue dans ce sanctuaire dédié à la quête de la vérité. Ici, nous explorons les profondeurs de la Kabbale, du Vodou, de l'Alchimie et de l'Astrologie pour éveiller la conscience et transformer l'être.
              </p>
              <p className="text-gray-300 leading-relaxed mb-8">
                Ce n'est pas qu'une simple plateforme, c'est un cheminement initiatique conçu pour ceux qui cherchent à comprendre les mystères de l'univers et de leur propre âme.
              </p>
              <Link to="/about" className="text-mystic-purple-light hover:text-mystic-purple font-medium flex items-center gap-2 transition-colors">
                En savoir plus sur l'Instructeur <BookOpen className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-lg overflow-hidden border border-obsidian-light shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/alchemy/800/1000" 
                  alt="Esoteric Symbolism" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-mystic-purple/20 rounded-full blur-2xl" />
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gold/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-obsidian">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-4">Les Piliers du Sanctuaire</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Une architecture pensée pour votre évolution spirituelle.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div 
              onClick={() => navigate('/blog')}
              className="p-8 rounded-xl bg-obsidian-lighter border border-obsidian-light hover:border-gold/30 transition-colors cursor-pointer"
            >
              <BookOpen className="w-10 h-10 text-gold mb-6" />
              <h3 className="text-xl font-bold text-gray-100 mb-3">Le Blogue</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Des articles profonds et réguliers. Les membres Freemium ont un aperçu, les membres Premium accèdent à l'intégralité du savoir.
              </p>
            </div>
            <div 
              onClick={() => navigate('/library')}
              className="p-8 rounded-xl bg-obsidian-lighter border border-obsidian-light hover:border-mystic-purple/50 transition-colors cursor-pointer"
            >
              <Shield className="w-10 h-10 text-mystic-purple-light mb-6" />
              <h3 className="text-xl font-bold text-gray-100 mb-3">La Bibliothèque</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Des grimoires et documents rares, protégés par des filigranes dynamiques pour garantir l'exclusivité de vos acquisitions.
              </p>
            </div>
            <div 
              onClick={() => navigate('/academy')}
              className="p-8 rounded-xl bg-obsidian-lighter border border-obsidian-light hover:border-gold/30 transition-colors cursor-pointer"
            >
              <Star className="w-10 h-10 text-gold mb-6" />
              <h3 className="text-xl font-bold text-gray-100 mb-3">L'Académie</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Des formations structurées (Kabbale, Vodou, Alchimie) avec suivi de progression, vidéos et quiz de validation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
