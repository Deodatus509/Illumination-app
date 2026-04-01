import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export function Privacy() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const docRef = doc(db, 'settings', 'footer');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data().privacyContent || "La politique de confidentialité n'est pas encore définie.");
        } else {
          setContent("La politique de confidentialité n'est pas encore définie.");
        }
      } catch (err) {
        console.error('Error fetching privacy policy:', err);
        setContent("Erreur lors du chargement de la politique de confidentialité.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrivacy();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold mb-8">Politique de confidentialité</h1>
      <div className="prose prose-invert prose-gold max-w-none whitespace-pre-wrap text-gray-300">
        {content}
      </div>
    </div>
  );
}
