import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Library, GraduationCap, FileText, Quote, MessageSquare, Settings, Crown, PenTool, LayoutDashboard, Eye, ThumbsUp, TrendingUp } from 'lucide-react';
import { PageBanner } from '../components/layout/PageBanner';

export function AuthorDashboard() {
  const { currentUser, userProfile, loading, isAuthor } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock stats - in a real app, these would come from an API
  const stats = [
    { label: 'Vues totales', value: '1,284', icon: Eye, color: 'text-blue-400', trend: '+12%' },
    { label: 'Réactions', value: '342', icon: ThumbsUp, color: 'text-pink-400', trend: '+5%' },
    { label: 'Commentaires', value: '89', icon: MessageSquare, color: 'text-green-400', trend: '+18%' },
    { label: 'Croissance', value: '8.4%', icon: TrendingUp, color: 'text-gold', trend: '+2%' },
  ];

  const recentReactions = [
    { user: 'Marie L.', action: 'a aimé votre article "Le Silence Intérieur"', time: 'Il y a 2h' },
    { user: 'Jean P.', action: 'a commenté votre leçon "Méditation Alpha"', time: 'Il y a 5h' },
    { user: 'Sophie D.', action: 'a partagé votre citation du jour', time: 'Il y a 1j' },
  ];

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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-obsidian rounded-xl p-5 border border-obsidian-light hover:border-mystic-purple-light/30 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg bg-obsidian-lighter ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-gray-100 mt-1">{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Welcome */}
                <div className="lg:col-span-2 bg-obsidian/40 rounded-xl p-8 border border-obsidian-light flex flex-col items-center justify-center text-center">
                  <PenTool className="w-16 h-16 text-mystic-purple-light mx-auto mb-4 opacity-50" />
                  <h2 className="text-2xl font-bold text-gray-100 mb-2">Bienvenue dans votre espace Auteur</h2>
                  <p className="text-gray-400 max-w-xl mx-auto mb-8">
                    Gérez vos publications, analysez vos performances et interagissez avec votre audience depuis cet espace centralisé.
                  </p>
                  <button 
                    onClick={() => navigate('/admin/dashboard')}
                    className="px-8 py-3 bg-mystic-purple text-white font-bold rounded-xl hover:bg-mystic-purple-light transition-all hover:scale-105 active:scale-95 shadow-lg shadow-mystic-purple/20"
                  >
                    Accéder au gestionnaire de contenu
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-obsidian rounded-xl border border-obsidian-light overflow-hidden">
                  <div className="p-4 border-b border-obsidian-light bg-obsidian-lighter flex items-center justify-between">
                    <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-gold" />
                      Activités Récentes
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {recentReactions.map((reaction, index) => (
                      <div key={index} className="flex gap-3 text-sm border-b border-obsidian-light/50 pb-4 last:border-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-mystic-purple/20 flex items-center justify-center shrink-0 border border-mystic-purple/30">
                          <span className="text-[10px] font-bold text-mystic-purple-light">{reaction.user.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-gray-300">
                            <span className="text-gray-100 font-semibold">{reaction.user}</span> {reaction.action}
                          </p>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 block">{reaction.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-3 text-xs font-bold text-mystic-purple-light hover:bg-mystic-purple/10 transition-colors uppercase tracking-widest">
                    Voir tout l'historique
                  </button>
                </div>
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
