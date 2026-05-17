import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    
    // Automatic adaptation based on system preference if no saved theme
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    
    return 'dark';
  });

  // Handle system preference changes
  useEffect(() => {
    if (localStorage.getItem('theme')) return; // Don't override if user has chosen

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? 'light' : 'dark');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen to Firestore profile for theme changes
  useEffect(() => {
    if (!currentUser) return;

    const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'profile');
    const unsubscribe = onSnapshot(privateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.theme && (data.theme === 'light' || data.theme === 'dark')) {
          setThemeState(data.theme as Theme);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    
    if (currentUser) {
      try {
        const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'profile');
        await setDoc(privateDocRef, { theme: newTheme }, { merge: true });
      } catch (error) {
        console.error('Failed to save theme to profile', error);
      }
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (currentUser) {
      try {
        const privateDocRef = doc(db, 'users', currentUser.uid, 'private', 'profile');
        await setDoc(privateDocRef, { theme: newTheme }, { merge: true });
      } catch (error) {
        console.error('Failed to save theme to profile', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
