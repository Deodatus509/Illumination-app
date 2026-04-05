import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BookOpen, Library, GraduationCap, UserCircle, LogIn, LogOut, Menu, X, Shield, Search, Sun, Moon, Info, Mail } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalSearchModal } from '../GlobalSearchModal';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { currentUser, userProfile, openAuthModal, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const navLinks = [
    { name: 'Accueil', path: '/', icon: null },
    { name: 'À Propos', path: '/about', icon: <Info className="w-4 h-4" /> },
    { name: 'Blogue', path: '/blog', icon: <BookOpen className="w-4 h-4" /> },
    { name: 'Bibliothèque', path: '/library', icon: <Library className="w-4 h-4" /> },
    { name: 'Académie', path: '/academy', icon: <GraduationCap className="w-4 h-4" /> },
    { name: 'Sanctum Lucis', path: '/sanctum-lucis', icon: <Sun className="w-4 h-4" /> },
    { name: 'Contact', path: '/contact', icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <>
    <nav className="sticky top-0 z-50 w-full border-b border-obsidian-lighter bg-obsidian/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-gold tracking-widest">ILLUMINATION</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-gold group",
                  location.pathname === link.path ? "text-gold" : "text-gray-300"
                )}
              >
                {link.icon && (
                  <span className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5">
                    {link.icon}
                  </span>
                )}
                {link.name}
              </Link>
            ))}
            
            <div className="flex items-center gap-4 pl-4 border-l border-obsidian-lighter">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gold transition-colors"
                title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-gray-400 hover:text-gold transition-colors"
                title="Rechercher"
              >
                <Search className="w-5 h-5" />
              </button>
              
              {currentUser ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 text-sm font-medium text-mystic-purple-light hover:text-mystic-purple transition-colors"
                  >
                    <UserCircle className="w-5 h-5" />
                    Mon Sanctuaire
                  </Link>
                  {userProfile?.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                      title="Admin Tableau de bord"
                    >
                      <Shield className="w-5 h-5" />
                      <span className="hidden xl:inline">Admin</span>
                    </Link>
                  )}
                  {userProfile?.role === 'editor' && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-2 text-sm font-medium text-mystic-purple-light hover:text-mystic-purple transition-colors"
                      title="Éditeur Tableau de bord"
                    >
                      <BookOpen className="w-5 h-5" />
                      <span className="hidden xl:inline">Éditeur</span>
                    </Link>
                  )}
                  {userProfile?.role === 'supporteur' && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      title="Supporteur Tableau de bord"
                    >
                      <Shield className="w-5 h-5" />
                      <span className="hidden xl:inline">Support</span>
                    </Link>
                  )}
                  <NotificationBell />
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gold transition-colors"
                    title="Mon Profil"
                  >
                    <UserCircle className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Déconnexion"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="flex items-center gap-2 px-4 py-2 rounded-md border border-gold text-gold font-medium hover:bg-gold/10 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Connexion
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-gold text-obsidian font-medium hover:bg-gold-light transition-colors"
                  >
                    S'inscrire
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="text-gray-300 hover:text-gold p-2 relative w-10 h-10 flex items-center justify-center"
              title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-gray-300 hover:text-gold p-2 relative w-10 h-10 flex items-center justify-center"
              title="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-gold p-2 relative w-10 h-10 flex items-center justify-center"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-obsidian border-b border-obsidian-lighter overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium group",
                    location.pathname === link.path ? "text-gold bg-obsidian-lighter" : "text-gray-300 hover:text-gold hover:bg-obsidian-lighter"
                  )}
                >
                  {link.icon && (
                    <span className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5">
                      {link.icon}
                    </span>
                  )}
                  {link.name}
                </Link>
              ))}
              {currentUser ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-mystic-purple-light hover:bg-obsidian-lighter"
                  >
                    <UserCircle className="w-5 h-5" />
                    Mon Sanctuaire
                  </Link>
                  {userProfile?.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-obsidian-lighter"
                    >
                      <Shield className="w-5 h-5" />
                      Admin
                    </Link>
                  )}
                  {userProfile?.role === 'editor' && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-mystic-purple-light hover:bg-obsidian-lighter"
                    >
                      <BookOpen className="w-5 h-5" />
                      Éditeur
                    </Link>
                  )}
                  {userProfile?.role === 'supporteur' && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-blue-400 hover:bg-obsidian-lighter"
                    >
                      <Shield className="w-5 h-5" />
                      Support
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-gold hover:bg-obsidian-lighter"
                  >
                    <UserCircle className="w-5 h-5" />
                    Mon Profil
                  </Link>
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-obsidian-lighter"
                  >
                    <LogOut className="w-5 h-5" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t border-obsidian-light">
                  <button
                    onClick={() => { openAuthModal('login'); setIsMenuOpen(false); }}
                    className="flex w-full items-center justify-center gap-3 px-3 py-2 rounded-md text-base font-medium border border-gold text-gold hover:bg-gold/10"
                  >
                    <LogIn className="w-5 h-5" />
                    Connexion
                  </button>
                  <button
                    onClick={() => { openAuthModal('register'); setIsMenuOpen(false); }}
                    className="flex w-full items-center justify-center gap-3 px-3 py-2 rounded-md text-base font-medium bg-gold text-obsidian hover:bg-gold-light"
                  >
                    S'inscrire
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
    <GlobalSearchModal 
      isOpen={isSearchOpen} 
      onClose={() => setIsSearchOpen(false)} 
    />
    </>
  );
}
