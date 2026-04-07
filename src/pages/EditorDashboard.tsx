import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MessageSquare, Settings } from 'lucide-react';

export function EditorDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gold mb-2">Tableau de bord Éditeur</h1>
        <p className="text-gray-400">Bienvenue, {userProfile?.displayName || 'Éditeur'}. Gérez vos articles et communications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/editor/messages')}
          className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light hover:border-gold/50 cursor-pointer transition-all group"
        >
          <div className="w-12 h-12 bg-mystic-purple/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-6 h-6 text-mystic-purple-light" />
          </div>
          <h3 className="text-xl font-bold text-gray-100 mb-2">Messagerie</h3>
          <p className="text-gray-400 text-sm">Communiquez avec l'administration et gérez vos échanges.</p>
        </div>

        <div 
          onClick={() => navigate('/sanctum-lucis/consultations')}
          className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light hover:border-gold/50 cursor-pointer transition-all group"
        >
          <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-6 h-6 text-gold" />
          </div>
          <h3 className="text-xl font-bold text-gray-100 mb-2">Consultations</h3>
          <p className="text-gray-400 text-sm">Gérez les demandes de consultations spirituelles.</p>
        </div>

        <div 
          onClick={() => navigate('/blog')}
          className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light hover:border-gold/50 cursor-pointer transition-all group"
        >
          <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6 text-gold" />
          </div>
          <h3 className="text-xl font-bold text-gray-100 mb-2">Articles</h3>
          <p className="text-gray-400 text-sm">Consultez et gérez les articles du blogue.</p>
        </div>

        <div 
          onClick={() => navigate('/profile')}
          className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light hover:border-gold/50 cursor-pointer transition-all group"
        >
          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-100 mb-2">Profil</h3>
          <p className="text-gray-400 text-sm">Gérez vos paramètres personnels.</p>
        </div>
      </div>
    </div>
  );
}
