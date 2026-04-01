import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  const [footerData, setFooterData] = useState({
    brandName: 'ILLUMINATION',
    description: "Votre Sanctuaire Numérique d'Enseignements Ésotériques et Initiatiques par Déodatus Yosèf.",
    copyrightText: 'ILLUMINATION. Tous droits réservés.',
    socialLinks: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    }
  });

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const docRef = doc(db, 'settings', 'footer');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFooterData({
            brandName: data.brandName || 'ILLUMINATION',
            description: data.description || "Votre Sanctuaire Numérique d'Enseignements Ésotériques et Initiatiques par Déodatus Yosèf.",
            copyrightText: data.copyrightText || 'ILLUMINATION. Tous droits réservés.',
            socialLinks: {
              facebook: data.socialLinks?.facebook || '',
              twitter: data.socialLinks?.twitter || '',
              instagram: data.socialLinks?.instagram || '',
              linkedin: data.socialLinks?.linkedin || ''
            }
          });
        }
      } catch (err) {
        console.error('Error fetching footer settings:', err);
      }
    };
    fetchFooterData();
  }, []);

  return (
    <footer className="bg-obsidian-lighter border-t border-obsidian-light py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl font-bold text-gold mb-4 tracking-widest">{footerData.brandName}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {footerData.description}
            </p>
            <div className="flex gap-4 mt-6">
              {footerData.socialLinks.facebook && (
                <a href={footerData.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {footerData.socialLinks.twitter && (
                <a href={footerData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {footerData.socialLinks.instagram && (
                <a href={footerData.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {footerData.socialLinks.linkedin && (
                <a href={footerData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
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
              <li><Link to="/terms" className="hover:text-gold transition-colors">Conditions d'utilisation</Link></li>
              <li><Link to="/privacy" className="hover:text-gold transition-colors">Politique de confidentialité</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition-colors">Contactez-nous</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-obsidian-light text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {footerData.copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}
