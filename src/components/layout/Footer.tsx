import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-obsidian-lighter border-t border-obsidian-light py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl font-bold text-gold mb-4 tracking-widest">ILLUMINATION</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Votre Sanctuaire Numérique d'Enseignements Ésotériques et Initiatiques par Déodatus Yosèf.
            </p>
          </div>
          <div>
            <h4 className="text-gray-200 font-medium mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/about" className="hover:text-gold transition-colors">À Propos</Link></li>
              <li><Link to="/blog" className="hover:text-gold transition-colors">Blogue</Link></li>
              <li><Link to="/library" className="hover:text-gold transition-colors">Bibliothèque</Link></li>
              <li><Link to="/academy" className="hover:text-gold transition-colors">Académie</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-gray-200 font-medium mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="#" className="hover:text-gold transition-colors">Conditions d'utilisation</Link></li>
              <li><Link to="#" className="hover:text-gold transition-colors">Politique de confidentialité</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition-colors">Contactez-nous</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-obsidian-light text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} ILLUMINATION. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
