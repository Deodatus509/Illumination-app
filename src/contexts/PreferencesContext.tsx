import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

interface PreferencesContextType {
  theme: string;
  language: string;
  notifications: { push: boolean; sms: boolean; email: boolean };
}

const PreferencesContext = createContext<PreferencesContextType>({
  theme: 'dark',
  language: 'FR',
  notifications: { push: true, sms: false, email: true }
});

export const usePreferences = () => useContext(PreferencesContext);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('FR');
  const [notifications, setNotifications] = useState({ push: true, sms: false, email: true });

  useEffect(() => {
    if (!currentUser) {
      setTheme('dark');
      setLanguage('FR');
      document.documentElement.classList.remove('light');
      return;
    }

    const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'profile');
    const unsubscribe = onSnapshot(privateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newTheme = data.theme || 'dark';
        setTheme(newTheme);
        setLanguage(data.language || 'FR');
        setNotifications(data.notificationPreferences || { push: true, sms: false, email: true });

        if (newTheme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
      } else {
        document.documentElement.classList.remove('light');
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <PreferencesContext.Provider value={{ theme, language, notifications }}>
      {children}
    </PreferencesContext.Provider>
  );
};
