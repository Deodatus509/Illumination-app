import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Compass className="w-24 h-24 text-gold animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-serif font-bold text-obsidian">404</span>
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-100 mb-4">
          Chemin Perdu
        </h1>
        
        <p className="text-gray-400 text-lg mb-8">
          La page que vous cherchez semble s'être égarée dans les méandres du temps. 
          Peut-être devriez-vous retourner à des contrées plus familières.
        </p>
        
        <Link 
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors"
        >
          <Home className="w-5 h-5" />
          Retour à l'accueil
        </Link>
      </motion.div>
    </div>
  );
}
