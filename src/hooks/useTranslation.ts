import { useLanguage } from '../contexts/LanguageContext';

const translations: Record<string, Record<string, string>> = {
  FR: {
    'nav.home': 'Accueil',
    'nav.blog': 'Blogue',
    'nav.library': 'Bibliothèque',
    'nav.academy': 'Académie',
    'nav.sanctum': 'Sanctum Lucis',
    'nav.login': 'Connexion',
    'nav.register': "S'inscrire",
    'nav.profile': 'Mon Profil',
    'nav.logout': 'Déconnexion',
    'nav.dashboard': 'Mon Sanctuaire',
    'nav.admin': 'Admin',
    'nav.editor': 'Éditeur',
    'nav.support': 'Support',
    'nav.author': 'Auteur',
  },
  EN: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.library': 'Library',
    'nav.academy': 'Academy',
    'nav.sanctum': 'Sanctum Lucis',
    'nav.login': 'Login',
    'nav.register': 'Sign Up',
    'nav.profile': 'My Profile',
    'nav.logout': 'Logout',
    'nav.dashboard': 'My Sanctuary',
    'nav.admin': 'Admin',
    'nav.editor': 'Editor',
    'nav.support': 'Support',
    'nav.author': 'Author',
  },
  ES: {
    'nav.home': 'Inicio',
    'nav.blog': 'Blog',
    'nav.library': 'Biblioteca',
    'nav.academy': 'Academia',
    'nav.sanctum': 'Sanctum Lucis',
    'nav.login': 'Iniciar sesión',
    'nav.register': 'Registrarse',
    'nav.profile': 'Mi Perfil',
    'nav.logout': 'Cerrar sesión',
    'nav.dashboard': 'Mi Santuario',
    'nav.admin': 'Admin',
    'nav.editor': 'Editor',
    'nav.support': 'Soporte',
    'nav.author': 'Autor',
  }
};

export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['FR'][key] || key;
  };

  return { t, language };
};
