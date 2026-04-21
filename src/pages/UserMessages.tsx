import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { UserCircle, BookOpen, Library, GraduationCap, Settings, Crown, MessageSquare } from 'lucide-react';
import { MessagingUI } from '../components/messaging/MessagingUI';

export function UserMessages() {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialConsultationId = location.state?.consultationId;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <Navigate to="/" replace />;
  }

  const roleColors = {
    admin: 'text-red-400 border-red-400/30 bg-red-400/10',
    client: 'text-gray-400 border-gray-600 bg-gray-800/50',
    editor: 'text-mystic-purple-light border-mystic-purple-light/30 bg-mystic-purple/10',
    supporteur: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar / Profile Info */}
        <div className="lg:col-span-1">
          <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light sticky top-24">
            <div className="text-center mb-6">
              {userProfile.photoURL ? (
                <img 
                  src={userProfile.photoURL || undefined} 
                  alt={userProfile.displayName || 'User'} 
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-gold/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle className="w-24 h-24 text-gray-500 mx-auto mb-4" />
              )}
              <h2 className="text-xl font-bold text-gray-100">{userProfile.displayName || 'Chercheur'}</h2>
              <p className="text-sm text-gray-400 mb-4">{userProfile.email}</p>
              
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${roleColors[userProfile.role as keyof typeof roleColors] || roleColors.client}`}>
                {userProfile.role === 'admin' && <Crown className="w-3 h-3" />}
                {userProfile.role}
              </div>
            </div>

            <nav className="space-y-2">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-obsidian rounded-lg transition-colors">
                <BookOpen className="w-4 h-4" /> Vue d'ensemble
              </button>
              <button onClick={() => navigate('/dashboard/messages')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gold bg-obsidian rounded-lg border border-gold/20">
                <MessageSquare className="w-4 h-4" /> Messagerie
              </button>
              <button onClick={() => navigate('/library')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-obsidian rounded-lg transition-colors">
                <Library className="w-4 h-4" /> Mes Ouvrages
              </button>
              <button onClick={() => navigate('/academy')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-obsidian rounded-lg transition-colors">
                <GraduationCap className="w-4 h-4" /> Mes Formations
              </button>
              <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-obsidian rounded-lg transition-colors">
                <Settings className="w-4 h-4" /> Paramètres
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-obsidian-lighter rounded-2xl p-8 border border-obsidian-light">
            <h1 className="text-3xl font-serif font-bold text-gold mb-6">Messagerie</h1>
            <MessagingUI userRole={userProfile.role as any} initialConsultationId={initialConsultationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
