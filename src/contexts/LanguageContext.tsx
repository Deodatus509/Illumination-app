import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

type Language = 'FR' | 'EN' | 'ES';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang === 'FR' || savedLang === 'EN' || savedLang === 'ES') {
      return savedLang;
    }
    return 'FR';
  });

  // Listen to Firestore profile for language changes
  useEffect(() => {
    if (!currentUser) return;

    const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'profile');
    const unsubscribe = onSnapshot(privateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.language && ['FR', 'EN', 'ES'].includes(data.language)) {
          setLanguageState(data.language as Language);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    
    if (currentUser) {
      try {
        const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'profile');
        await setDoc(privateDocRef, { language: newLang }, { merge: true });
      } catch (error) {
        console.error('Failed to save language to profile', error);
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
