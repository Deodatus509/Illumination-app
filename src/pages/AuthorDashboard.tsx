import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Library, GraduationCap, FileText, Quote, MessageSquare, Settings, Crown, PenTool, LayoutDashboard } from 'lucide-react';
import { PageBanner } from '../components/layout/PageBanner';

export function AuthorDashboard() {
  const { currentUser, userProfile, loading, isAuthor } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!currentUser || !isAuthor()) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'documents', label: 'Mes Documents', icon: Library },
    { id: 'courses', label: 'Mes Cours', icon: GraduationCap },
    { id: 'lessons', label: 'Mes Leçons', icon: BookOpen },
    { id: 'articles', label: 'Mes Articles', icon: FileText },
    { id: 'quotes', label: 'Mes Citations', icon: Quote },
    { id: 'consultations', label: 'Mes Consultations', icon: MessageSquare },
    { id: 'meditations', label: 'Mes Méditations', icon: Crown },
    { id: 'messages', label: 'Messagerie', icon: MessageSquare },
    { id: 'profile', label: 'Mon Profil', icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageBanner pageName="author-dashboard" title="Tableau de bord Auteur" />
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
              <PenTool className="w-8 h-8 text-mystic-purple-light" />
              Espace Auteur
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Gérez vos publications et vos interactions avec la communauté.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-4 mb-8 hide-scrollbar">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-mystic-purple-light text-mystic-purple-light bg-mystic-purple/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-obsidian-lighter'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light min-h-[500px]">
          {activeTab === 'overview' && (
            <div className="text-center py-12">
              <PenTool className="w-16 h-16 text-mystic-purple-light mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-100 mb-2">Bienvenue dans votre espace Auteur</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Utilisez les onglets ci-dessus pour gérer vos différentes publications. Vous pouvez ajouter de nouveaux contenus directement depuis cet espace.
              </p>
              <div className="mt-8">
                <button 
                  onClick={() => navigate('/admin/dashboard')}
                  className="px-6 py-3 bg-mystic-purple text-white font-bold rounded-lg hover:bg-mystic-purple-light transition-colors"
                >
                  Accéder au gestionnaire de contenu
                </button>
              </div>
            </div>
          )}
          
          {activeTab !== 'overview' && (
            <div className="text-center py-12">
              <p className="text-gray-400">
                Pour gérer vos contenus, veuillez utiliser le gestionnaire de contenu principal.
              </p>
              <button 
                onClick={() => navigate('/admin/dashboard')}
                className="mt-4 px-6 py-3 bg-mystic-purple text-white font-bold rounded-lg hover:bg-mystic-purple-light transition-colors"
              >
                Ouvrir le gestionnaire
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
