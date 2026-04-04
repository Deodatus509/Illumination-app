import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Users, Calendar, Video, FileText, MessageSquare, Headphones, Play, Send } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumMeditationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, openAuthModal } = useAuth();
  const [meditationClass, setMeditationClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'audio' | 'video' | 'docs' | 'calendar'>('chat');
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchClass();
      if (currentUser) {
        checkMembership();
      }
    }
  }, [id, currentUser]);

  useEffect(() => {
    if (id && isMember) {
      if (activeTab === 'chat') fetchMessages();
      if (activeTab === 'calendar' || activeTab === 'audio' || activeTab === 'video' || activeTab === 'docs') fetchSessions();
    }
  }, [id, isMember, activeTab]);

  const fetchClass = async () => {
    try {
      const docRef = doc(db, 'meditation_classes', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMeditationClass({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/sanctum-lucis/meditations');
      }
    } catch (error) {
      console.error("Error fetching class:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async () => {
    if (!currentUser || !id) return;
    try {
      const q = query(
        collection(db, 'meditation_members'),
        where('class_id', '==', id),
        where('user_id', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      setIsMember(!snap.empty);
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  const fetchMessages = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'meditation_messages'),
        where('class_id', '==', id),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchSessions = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'meditation_sessions'),
        where('classId', '==', id),
        orderBy('scheduledAt', 'asc')
      );
      const snap = await getDocs(q);
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const handleJoinClass = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    // In a real app, handle payment here if class.price > 0
    try {
      await addDoc(collection(db, 'meditation_members'), {
        class_id: id,
        user_id: currentUser.uid,
        joined_at: serverTimestamp()
      });
      setIsMember(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'meditation_members');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newMessage.trim() || !isMember) return;

    setSendingMessage(true);
    try {
      const messageData = {
        class_id: id,
        user_id: currentUser.uid,
        userName: currentUser.displayName || 'Utilisateur',
        message: newMessage,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'meditation_messages'), messageData);
      setMessages([{ id: docRef.id, ...messageData, created_at: { seconds: Date.now() / 1000 } }, ...messages]);
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'meditation_messages');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-obsidian flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
  }

  if (!meditationClass) return null;

  return (
    <div className="min-h-screen bg-obsidian pb-20">
      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[300px]">
        <img 
          src={meditationClass.imageUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80'} 
          alt={meditationClass.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
            <Link to="/sanctum-lucis/meditations" className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" /> Retour aux classes
            </Link>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light flex items-center gap-1">
                <Users className="w-4 h-4 text-gold" /> {meditationClass.memberCount || 0} membres
              </span>
              <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gold" /> Prochaine session: {meditationClass.start_date ? new Date(meditationClass.start_date).toLocaleDateString() : 'À définir'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{meditationClass.title}</h1>
            <p className="text-xl text-gray-300 max-w-3xl">{meditationClass.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {!isMember ? (
          <div className="bg-obsidian-lighter rounded-2xl border border-obsidian-light p-8 text-center shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">Rejoignez cette classe</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Inscrivez-vous pour accéder à la salle de discussion, aux sessions en direct, aux audios, vidéos et documents exclusifs de cette classe de méditation.
            </p>
            <button 
              onClick={handleJoinClass}
              className="px-8 py-3 bg-gold text-obsidian hover:bg-yellow-400 rounded-lg font-bold transition-colors text-lg"
            >
              S'inscrire ({meditationClass.price > 0 ? `${meditationClass.price}€` : 'Gratuit'})
            </button>
          </div>
        ) : (
          <div className="bg-obsidian-lighter rounded-2xl border border-obsidian-light shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-obsidian border-r border-obsidian-light flex flex-col">
              <div className="p-6 border-b border-obsidian-light">
                <h3 className="text-lg font-bold text-white">Espace Classe</h3>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'chat' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <MessageSquare className="w-5 h-5" /> Salle de discussion
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'calendar' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Calendar className="w-5 h-5" /> Calendrier & Lives
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'audio' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Headphones className="w-5 h-5" /> Audios
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'video' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Video className="w-5 h-5" /> Vidéos
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === 'docs' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <FileText className="w-5 h-5" /> Documents
                </button>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-obsidian-lighter">
              
              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-obsidian-light bg-obsidian/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-gold" /> Salle de discussion
                    </h2>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col-reverse">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-10">
                        Aucun message pour le moment. Soyez le premier à dire bonjour !
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.user_id === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                          <span className="text-xs text-gray-500 mb-1 px-1">{msg.userName}</span>
                          <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.user_id === currentUser?.uid ? 'bg-gold text-obsidian rounded-tr-none' : 'bg-obsidian border border-obsidian-light text-gray-200 rounded-tl-none'}`}>
                            {msg.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-obsidian-light bg-obsidian">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrivez un message..."
                        className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-lg px-4 py-2 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={sendingMessage || !newMessage.trim()}
                        className="p-2 bg-gold text-obsidian rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                      >
                        {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold" /> Sessions programmées
                  </h2>
                  <div className="space-y-4">
                    {sessions.length === 0 ? (
                      <p className="text-gray-400">Aucune session programmée pour le moment.</p>
                    ) : (
                      sessions.map(session => (
                        <div key={session.id} className="bg-obsidian border border-obsidian-light rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-white">{session.title}</h3>
                            <p className="text-sm text-gray-400">{new Date(session.scheduledAt).toLocaleString()}</p>
                          </div>
                          {session.isLive ? (
                            <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium flex items-center gap-2 animate-pulse">
                              <Video className="w-4 h-4" /> Rejoindre le Live
                            </button>
                          ) : (
                            <span className="px-4 py-2 bg-obsidian-light text-gray-400 rounded-lg text-sm">À venir</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Audio Tab */}
              {activeTab === 'audio' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-gold" /> Bibliothèque Audio
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sessions.filter(s => s.audioUrl).length === 0 ? (
                      <p className="text-gray-400 col-span-2">Aucun audio disponible.</p>
                    ) : (
                      sessions.filter(s => s.audioUrl).map(session => (
                        <div key={session.id} className="bg-obsidian border border-obsidian-light rounded-xl p-4 flex items-center gap-4">
                          <button className="w-12 h-12 rounded-full bg-gold text-obsidian flex items-center justify-center hover:bg-yellow-400 transition-colors flex-shrink-0">
                            <Play className="w-5 h-5 ml-1" />
                          </button>
                          <div>
                            <h3 className="font-medium text-white line-clamp-1">{session.title}</h3>
                            <p className="text-xs text-gray-500">{new Date(session.scheduledAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Video Tab */}
              {activeTab === 'video' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Video className="w-5 h-5 text-gold" /> Replays Vidéo
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {sessions.filter(s => s.videoUrl).length === 0 ? (
                      <p className="text-gray-400 col-span-2">Aucune vidéo disponible.</p>
                    ) : (
                      sessions.filter(s => s.videoUrl).map(session => (
                        <div key={session.id} className="bg-obsidian border border-obsidian-light rounded-xl overflow-hidden group cursor-pointer">
                          <div className="aspect-video bg-black relative flex items-center justify-center">
                            <Play className="w-12 h-12 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="p-4">
                            <h3 className="font-medium text-white line-clamp-1">{session.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{new Date(session.scheduledAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Docs Tab */}
              {activeTab === 'docs' && (
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gold" /> Documents & Supports
                  </h2>
                  <div className="space-y-3">
                    {sessions.filter(s => s.documentUrl).length === 0 ? (
                      <p className="text-gray-400">Aucun document disponible.</p>
                    ) : (
                      sessions.filter(s => s.documentUrl).map(session => (
                        <a key={session.id} href={session.documentUrl} target="_blank" rel="noopener noreferrer" className="bg-obsidian border border-obsidian-light rounded-xl p-4 flex items-center gap-4 hover:bg-obsidian-light transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{session.title} - Support</h3>
                            <p className="text-xs text-gray-500">PDF Document</p>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
