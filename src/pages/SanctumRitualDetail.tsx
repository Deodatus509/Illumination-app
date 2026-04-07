import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Clock, BookOpen, Shield, Star, Heart, Play, FileText, MessageSquare, Send, Mic } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumRitualDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, openAuthModal } = useAuth();
  const [ritual, setRitual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRitual();
      fetchComments();
      if (currentUser) {
        checkParticipation();
      }
    }
  }, [id, currentUser]);

  const fetchRitual = async () => {
    try {
      const docRef = doc(db, 'rituals', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRitual({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/sanctum-lucis/rituals');
      }
    } catch (error) {
      console.error("Error fetching ritual:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkParticipation = async () => {
    if (!currentUser || !id) return;
    try {
      const q = query(
        collection(db, 'ritual_participants'),
        where('ritualId', '==', id),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      setIsParticipant(!snap.empty);
    } catch (error) {
      console.error("Error checking participation:", error);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'comments'),
        where('targetId', '==', id),
        where('targetType', '==', 'ritual'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleParticipate = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    try {
      await addDoc(collection(db, 'ritual_participants'), {
        ritualId: id,
        userId: currentUser.uid,
        joinedAt: serverTimestamp(),
        status: 'active'
      });
      setIsParticipant(true);
      // Show success toast
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ritual_participants');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const commentData = {
        targetId: id,
        targetType: 'ritual',
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Utilisateur',
        content: newComment,
        createdAt: serverTimestamp(),
        status: 'active'
      };
      const docRef = await addDoc(collection(db, 'comments'), commentData);
      setComments([{ id: docRef.id, ...commentData, createdAt: new Date() }, ...comments]);
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'comments');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-obsidian flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
  }

  if (!ritual) return null;

  return (
    <div className="min-h-screen bg-obsidian pb-20">
      {/* Hero Section */}
      <div className="relative h-[50vh] min-h-[400px]">
        <img 
          src={ritual.imageUrl || 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&q=80'} 
          alt={ritual.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12">
            <Link to="/sanctum-lucis/rituals" className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" /> Retour aux rituels
            </Link>
            
            <div className="flex flex-wrap gap-3 mb-4">
              {ritual.isPremium && (
                <span className="bg-gold text-obsidian px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Star className="w-4 h-4" /> Premium
                </span>
              )}
              <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light">
                {ritual.category || 'Général'}
              </span>
              <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-gold" /> {ritual.level || 'Tous niveaux'}
              </span>
              <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light flex items-center gap-1">
                <Clock className="w-4 h-4 text-gold" /> {ritual.duration || '30 min'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{ritual.title}</h1>
            <p className="text-xl text-gray-300 max-w-3xl">{ritual.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-obsidian-lighter rounded-2xl border border-obsidian-light p-6 md:p-8 shadow-xl">
          
          {/* Actions */}
          <div className="flex flex-wrap gap-4 mb-12 pb-8 border-b border-obsidian-light">
            {!isParticipant ? (
              <button 
                onClick={handleParticipate}
                className="flex-1 md:flex-none px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors text-lg"
              >
                Participer à ce rituel
              </button>
            ) : (
              <div className="flex-1 md:flex-none px-8 py-3 bg-obsidian border border-green-500/30 text-green-400 rounded-lg font-medium text-lg flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" /> Vous participez
              </div>
            )}
            
            <button className="px-6 py-3 bg-obsidian border border-obsidian-light text-gray-300 hover:text-red-400 hover:border-red-400/30 rounded-lg transition-colors flex items-center gap-2">
              <Heart className="w-5 h-5" /> Favori
            </button>

            {ritual.isPremium && isParticipant && (
              <button className="px-6 py-3 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 rounded-lg transition-colors flex items-center gap-2">
                <FileText className="w-5 h-5" /> Télécharger le guide
              </button>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-10">
              {ritual.objective && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Star className="w-6 h-6 text-gold" /> Objectif
                  </h2>
                  <p className="text-gray-300 leading-relaxed">{ritual.objective}</p>
                </section>
              )}

              {ritual.steps && ritual.steps.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-gold" /> Étapes du Rituel
                  </h2>
                  <div className="space-y-6">
                    {ritual.steps.map((step: string, index: number) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-obsidian border border-gold text-gold flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <p className="text-gray-300 pt-1 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Media Section (Audio/Video) */}
              {(ritual.audioUrl || ritual.videoUrl) && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Play className="w-6 h-6 text-gold" /> Support Multimédia
                  </h2>
                  <div className="space-y-6">
                    {ritual.videoUrl && (
                      <div className="relative rounded-2xl overflow-hidden border border-obsidian-light bg-black shadow-2xl aspect-video group">
                        <video 
                          controls 
                          playsInline
                          className="w-full h-full object-contain"
                          poster={`${ritual.videoUrl}#t=0.1`}
                        >
                          <source src={ritual.videoUrl} type="video/mp4" />
                          <source src={ritual.videoUrl} type="video/webm" />
                          Votre navigateur ne supporte pas la lecture vidéo.
                        </video>
                      </div>
                    )}
                    {ritual.audioUrl && (
                      <div className="bg-obsidian rounded-2xl p-6 border border-obsidian-light shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                            <Mic className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-white font-bold">Audio d'accompagnement</p>
                            <p className="text-sm text-gray-400">Guidance vocale pour votre pratique</p>
                          </div>
                        </div>
                        <audio controls className="w-full h-12 custom-audio">
                          <source src={ritual.audioUrl} type="audio/mpeg" />
                          <source src={ritual.audioUrl} type="audio/webm" />
                          <source src={ritual.audioUrl} type="audio/wav" />
                          Votre navigateur ne supporte pas la lecture audio.
                        </audio>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {ritual.materials && ritual.materials.length > 0 && (
                <div className="bg-obsidian rounded-xl p-6 border border-obsidian-light">
                  <h3 className="text-lg font-bold text-white mb-4">Matériel Nécessaire</h3>
                  <ul className="space-y-3">
                    {ritual.materials.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-16 pt-12 border-t border-obsidian-light">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-gold" /> Espace d'Échange
            </h2>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-10">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-obsidian border border-obsidian-light flex items-center justify-center text-gray-400 flex-shrink-0">
                  {currentUser?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="flex-grow relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={currentUser ? "Partagez votre expérience..." : "Connectez-vous pour commenter"}
                    disabled={!currentUser || submittingComment}
                    className="w-full bg-obsidian border border-obsidian-light rounded-xl p-4 text-gray-200 focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none min-h-[100px]"
                  />
                  <button 
                    type="submit"
                    disabled={!currentUser || submittingComment || !newComment.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-gold text-obsidian rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Soyez le premier à partager votre expérience.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 bg-obsidian rounded-xl p-6 border border-obsidian-light">
                    <div className="w-10 h-10 rounded-full bg-obsidian-lighter border border-obsidian-light flex items-center justify-center text-gray-400 flex-shrink-0">
                      {comment.userName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-medium text-gray-200">{comment.userName}</span>
                        <span className="text-xs text-gray-500">
                          {comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 'À l\'instant'}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
