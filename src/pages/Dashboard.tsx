import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, BookOpen, Library, GraduationCap, Settings, Crown, AlertTriangle, CheckCircle, Mail, PlayCircle } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';

export function Dashboard() {
  const { currentUser, userProfile, loading } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(currentUser?.emailVerified || false);
  const [recentEnrollment, setRecentEnrollment] = useState<any>(null);
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [isLoadingEnrollment, setIsLoadingEnrollment] = useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser) {
      setIsEmailVerified(currentUser.emailVerified);
      if (!currentUser.emailVerified) {
        currentUser.reload().then(() => {
          setIsEmailVerified(currentUser.emailVerified);
        }).catch(console.error);
      }
    }
  }, [currentUser]);

  React.useEffect(() => {
    const fetchEnrollments = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'enrollments'),
          where('userId', '==', currentUser.uid),
          orderBy('enrolledAt', 'desc')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const enrollmentsData = snapshot.docs.map(doc => doc.data());
          setAllEnrollments(enrollmentsData);
          
          const recentData = enrollmentsData[0];
          const courseDoc = await getDoc(doc(db, 'courses', recentData.courseId));
          if (courseDoc.exists()) {
            setRecentEnrollment({ ...recentData, course: { id: courseDoc.id, ...courseDoc.data() } });
          } else {
            setRecentEnrollment({ ...recentData, course: { id: recentData.courseId, name: 'Formation Continue' } });
          }
        }
      } catch (error) {
        console.error("Error fetching enrollments:", error);
      } finally {
        setIsLoadingEnrollment(false);
      }
    };

    fetchEnrollments();
  }, [currentUser]);

  const handleSendVerification = async () => {
    if (!currentUser) return;
    try {
      await sendEmailVerification(currentUser);
      setVerificationSent(true);
      setVerificationError('');
    } catch (error) {
      console.error("Error sending verification email:", error);
      setVerificationError("Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard.");
    }
  };

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
  };

  const totalProgress = allEnrollments.reduce((sum, enr) => sum + (enr.progress || 0), 0);
  const averageProgress = allEnrollments.length > 0 ? Math.round(totalProgress / allEnrollments.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar / Profile Info */}
        <div className="lg:col-span-1">
          <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light sticky top-24">
            <div className="text-center mb-6">
              {userProfile.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName || 'User'} 
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-gold/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle className="w-24 h-24 text-gray-500 mx-auto mb-4" />
              )}
              <h2 className="text-xl font-bold text-gray-100">{userProfile.displayName || 'Chercheur'}</h2>
              <p className="text-sm text-gray-400 mb-4">{userProfile.email}</p>
              
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${roleColors[userProfile.role]}`}>
                {userProfile.role === 'admin' && <Crown className="w-3 h-3" />}
                {userProfile.role}
              </div>
            </div>

            <nav className="space-y-2">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gold bg-obsidian rounded-lg border border-gold/20">
                <BookOpen className="w-4 h-4" /> Vue d'ensemble
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
              {userProfile.role === 'client' && (
                <button onClick={() => navigate('/author-request')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-mystic-purple-light hover:text-mystic-purple hover:bg-obsidian rounded-lg transition-colors mt-4 border border-mystic-purple-light/20">
                  <Crown className="w-4 h-4" /> Devenir Auteur
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          
          <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
            <h3 className="text-lg font-bold text-gray-100 mb-2">Progression Globale</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Moyenne de tous vos cours</span>
              <span className="text-gold font-bold">{averageProgress}%</span>
            </div>
            <div className="w-full bg-obsidian rounded-full h-3">
              <div 
                className="bg-gold h-3 rounded-full transition-all duration-500" 
                style={{ width: `${averageProgress}%` }}
              ></div>
            </div>
          </div>

          {!isEmailVerified && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-yellow-500">Vérifiez votre adresse email</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Veuillez vérifier votre adresse email ({currentUser.email}) pour sécuriser votre compte et accéder à toutes les fonctionnalités.
                  </p>
                  {verificationError && <p className="text-sm text-red-400 mt-2">{verificationError}</p>}
                </div>
              </div>
              <button 
                onClick={handleSendVerification}
                disabled={verificationSent}
                className="shrink-0 px-4 py-2 bg-yellow-500 text-obsidian font-bold rounded-md hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {verificationSent ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Email envoyé
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Renvoyer l'email
                  </>
                )}
              </button>
            </div>
          )}

          <div className="bg-obsidian-lighter rounded-2xl p-8 border border-obsidian-light">
            <h1 className="text-3xl font-serif font-bold text-gold mb-2">Bienvenue dans votre Sanctuaire</h1>
            <p className="text-gray-400 mb-8">
              Voici un résumé de votre progression et de vos acquisitions récentes.
            </p>

            {userProfile.role === 'client' && (
              <div className="bg-gradient-to-r from-mystic-purple/20 to-obsidian border border-mystic-purple/30 rounded-xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-gold" /> Passez au niveau supérieur
                  </h3>
                  <p className="text-sm text-gray-400">
                    Débloquez l'intégralité des articles du blogue et accédez à des contenus exclusifs en devenant membre Premium.
                  </p>
                </div>
                <button onClick={() => alert("Fonctionnalité Premium à venir !")} className="shrink-0 px-6 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors">
                  Devenir Premium
                </button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-6">
              <div 
                onClick={() => navigate(recentEnrollment ? `/course/${recentEnrollment.courseId}` : '/academy')}
                className="bg-obsidian rounded-xl p-6 border border-obsidian-light cursor-pointer hover:border-gold/50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-200 group-hover:text-gold transition-colors">Dernière Formation</h3>
                  <GraduationCap className="w-5 h-5 text-mystic-purple-light group-hover:text-gold transition-colors" />
                </div>
                {isLoadingEnrollment ? (
                  <div className="h-4 bg-obsidian-light rounded w-3/4 mb-4 animate-pulse"></div>
                ) : recentEnrollment ? (
                  <div className="mb-4">
                    <h4 className="text-gray-300 font-medium mb-2">{recentEnrollment.course.name || recentEnrollment.course.title}</h4>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progression</span>
                      <span className="text-gold font-bold">{recentEnrollment.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-obsidian-light rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-gold transition-all duration-500"
                        style={{ width: `${recentEnrollment.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">Vous n'êtes inscrit à aucune formation pour le moment.</p>
                )}
                <span className="text-sm text-gold font-medium group-hover:text-gold-light transition-colors flex items-center gap-1">
                  {recentEnrollment ? <><PlayCircle className="w-4 h-4" /> Continuer</> : 'Explorer l\'Académie \u2192'}
                </span>
              </div>

              <div 
                onClick={() => navigate('/library')}
                className="bg-obsidian rounded-xl p-6 border border-obsidian-light cursor-pointer hover:border-gold/50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-200 group-hover:text-gold transition-colors">Dernier Ouvrage</h3>
                  <Library className="w-5 h-5 text-mystic-purple-light group-hover:text-gold transition-colors" />
                </div>
                <p className="text-sm text-gray-400 mb-4">Votre bibliothèque personnelle est vide.</p>
                <span className="text-sm text-gold font-medium group-hover:text-gold-light transition-colors">
                  Visiter la Bibliothèque &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
