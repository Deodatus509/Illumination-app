import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Users, Calendar, Video, FileText, MessageSquare, Headphones, Play, Send, Plus, Trash2, ExternalLink, Clock, Info, BookOpen, X, Paperclip, Mic, Camera, Download, Link as LinkIcon, CheckCircle, History, Globe, MoreVertical } from 'lucide-react';
import { uploadMeditationFile } from '../lib/storage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumMeditationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, openAuthModal, userProfile } = useAuth();
  const [meditationClass, setMeditationClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'content' | 'audios' | 'videos' | 'docs' | 'calendar' | 'live' | 'members' | 'history'>('overview');
  
  // Content states
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Media Recording States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLive = liveSessions.find(s => {
    if (!s.start_time) return false;
    const startTime = new Date(s.start_time).getTime();
    const now = new Date().getTime();
    return startTime <= now && startTime + 3600000 > now;
  });

  const canManage = userProfile?.role === 'admin' || userProfile?.role === 'editor' || userProfile?.role === 'author';

  useEffect(() => {
    if (id) {
      fetchClass();
      if (currentUser) {
        checkMembership();
      }
    }
  }, [id, currentUser]);

  useEffect(() => {
    if (!id || !isMember) return;

    // Get or create conversation
    const getConversation = async () => {
      const q = query(collection(db, 'meditation_conversations'), where('class_id', '==', id));
      const snap = await getDocs(q);
      if (snap.empty) {
        if (canManage) {
          const docRef = await addDoc(collection(db, 'meditation_conversations'), {
            class_id: id,
            created_at: serverTimestamp()
          });
          setConversation({ id: docRef.id });
        }
      } else {
        setConversation({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    };
    getConversation();

    const unsubFiles = onSnapshot(
      query(collection(db, 'meditation_files'), where('class_id', '==', id), orderBy('created_at', 'desc')),
      (snap) => setFiles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_files')
    );

    const unsubAudios = onSnapshot(
      query(collection(db, 'meditation_audios'), where('class_id', '==', id), orderBy('created_at', 'desc')),
      (snap) => setAudios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_audios')
    );

    const unsubVideos = onSnapshot(
      query(collection(db, 'meditation_videos'), where('class_id', '==', id), orderBy('created_at', 'desc')),
      (snap) => setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_videos')
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'meditation_events'), where('class_id', '==', id), orderBy('event_date', 'asc')),
      (snap) => setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_events')
    );

    const unsubLive = onSnapshot(
      query(collection(db, 'meditation_live_sessions'), where('class_id', '==', id), orderBy('start_time', 'asc')),
      (snap) => setLiveSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_live_sessions')
    );

    const unsubMembers = onSnapshot(
      query(collection(db, 'meditation_members'), where('class_id', '==', id)),
      (snap) => setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_members')
    );

    const unsubHistory = onSnapshot(
      query(collection(db, 'meditation_history'), where('class_id', '==', id), orderBy('created_at', 'desc')),
      (snap) => setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_history')
    );

    return () => {
      unsubFiles();
      unsubAudios();
      unsubVideos();
      unsubEvents();
      unsubLive();
      unsubMembers();
      unsubHistory();
    };
  }, [id, isMember, canManage]);

  useEffect(() => {
    if (!conversation?.id) return;

    const unsubMessages = onSnapshot(
      query(collection(db, 'meditation_messages'), where('conversation_id', '==', conversation.id), orderBy('created_at', 'desc')),
      (snap) => setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_messages')
    );

    return () => unsubMessages();
  }, [conversation?.id]);

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
      setIsMember(!snap.empty || canManage); // Admins/Editors/Authors are always members
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  const logHistory = async (eventType: string, description: string) => {
    try {
      await addDoc(collection(db, 'meditation_history'), {
        class_id: id,
        event_type: eventType,
        description,
        created_by: currentUser?.uid,
        created_at: serverTimestamp()
      });
    } catch (error: any) {
      console.error("Error logging history:", error);
      handleFirestoreError(error, OperationType.CREATE, 'meditation_history');
    }
  };

  const handleJoinClass = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    try {
      await addDoc(collection(db, 'meditation_members'), {
        class_id: id,
        user_id: currentUser.uid,
        joined_at: serverTimestamp()
      });
      setIsMember(true);
      await logHistory('member_joined', `Un nouveau membre a rejoint la classe.`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'meditation_members');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentUser || (!newMessage.trim() && !mediaUrl) || !isMember || !conversation?.id) return;

    setSendingMessage(true);
    try {
      const messageData = {
        conversation_id: conversation.id,
        sender_id: currentUser.uid,
        userName: currentUser.displayName || 'Utilisateur',
        message: newMessage,
        created_at: serverTimestamp(),
        is_read: false,
        file_url: mediaUrl || null,
        file_type: mediaUrl ? 'image' : null // Default to image if URL, can be refined
      };
      await addDoc(collection(db, 'meditation_messages'), messageData);
      setNewMessage('');
      setMediaUrl('');
      setShowMediaUrlInput(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'meditation_messages');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!currentUser || !isMember || !conversation?.id) return;
    setUploadingFile(true);
    try {
      const { url } = await uploadMeditationFile(file);
      const fileType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('audio/') ? 'audio' :
                       file.type.startsWith('video/') ? 'video' : 'document';
      
      await addDoc(collection(db, 'meditation_messages'), {
        conversation_id: conversation.id,
        sender_id: currentUser.uid,
        userName: currentUser.displayName || 'Utilisateur',
        message: `Fichier partagé: ${file.name}`,
        file_url: url,
        file_type: fileType,
        created_at: serverTimestamp(),
        is_read: false
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      if (error.message?.includes('bucket')) {
        alert("Erreur de stockage: Le bucket n'existe pas. Veuillez contacter l'administrateur.");
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'meditation_messages_file');
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'vocal_meditation.webm', { type: 'audio/webm' });
        await handleFileUpload(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setAudioRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      alert("Impossible d'accéder au micro.");
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorder && isRecordingAudio) {
      audioRecorder.stop();
      setIsRecordingAudio(false);
      setAudioRecorder(null);
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'video_meditation.webm', { type: 'video/webm' });
        await handleFileUpload(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setVideoRecorder(recorder);
      setVideoStream(stream);
      setIsRecordingVideo(true);
    } catch (error) {
      console.error("Error starting video recording:", error);
      alert("Impossible d'accéder à la caméra.");
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && isRecordingVideo) {
      videoRecorder.stop();
      setIsRecordingVideo(false);
      setVideoRecorder(null);
      setVideoStream(null);
    }
  };

  const handleDeleteContent = async (collectionName: string, docId: string) => {
    if (!canManage) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce contenu ?")) return;
    
    try {
      await deleteDoc(doc(db, collectionName, docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
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
              {activeLive && (
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-1">
                  <Video className="w-4 h-4" /> LIVE EN COURS
                </span>
              )}
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
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'overview' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Info className="w-4 h-4" /> Aperçu
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'content' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <BookOpen className="w-4 h-4" /> Contenu
                </button>
                <button
                  onClick={() => setActiveTab('audios')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'audios' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Headphones className="w-4 h-4" /> Audios
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'videos' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Video className="w-4 h-4" /> Vidéos
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'docs' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <FileText className="w-4 h-4" /> Documents
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'calendar' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Calendar className="w-4 h-4" /> Calendrier
                </button>
                <button
                  onClick={() => setActiveTab('live')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'live' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Video className="w-4 h-4" /> Live
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'chat' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <MessageSquare className="w-4 h-4" /> Messagerie
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'members' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <Users className="w-4 h-4" /> Membres
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'history' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                >
                  <History className="w-4 h-4" /> Historique
                </button>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-obsidian-lighter min-h-[500px]">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Aperçu de la classe</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed text-lg">
                      {meditationClass.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light">
                      <Users className="w-8 h-8 text-gold mb-4" />
                      <h3 className="text-white font-bold mb-2">Communauté</h3>
                      <p className="text-gray-400 text-sm">{members.length} membres pratiquent ensemble</p>
                    </div>
                    <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light">
                      <Calendar className="w-8 h-8 text-gold mb-4" />
                      <h3 className="text-white font-bold mb-2">Calendrier</h3>
                      <p className="text-gray-400 text-sm">{events.length} événements programmés</p>
                    </div>
                    <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light">
                      <Headphones className="w-8 h-8 text-gold mb-4" />
                      <h3 className="text-white font-bold mb-2">Ressources</h3>
                      <p className="text-gray-400 text-sm">{audios.length + videos.length + files.length} supports disponibles</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Contenu détaillé</h2>
                  <div className="bg-obsidian p-8 rounded-xl border border-obsidian-light">
                    <div className="prose prose-invert max-w-none">
                      {meditationClass.longContent || meditationClass.description}
                    </div>
                  </div>
                </div>
              )}

              {/* Audios Tab */}
              {activeTab === 'audios' && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Headphones className="w-6 h-6 text-gold" /> Bibliothèque Audio
                    </h2>
                    {canManage && (
                      <button 
                        onClick={() => setShowAddModal('audio')}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Ajouter un audio
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {audios.length === 0 ? (
                      <p className="text-gray-400 col-span-2">Aucun audio disponible.</p>
                    ) : (
                      audios.map(audio => (
                        <div key={audio.id} className="bg-obsidian border border-obsidian-light rounded-xl p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <button className="w-12 h-12 rounded-full bg-gold text-obsidian flex items-center justify-center hover:bg-yellow-400 transition-colors flex-shrink-0">
                              <Play className="w-5 h-5 ml-1" />
                            </button>
                            <div>
                              <h3 className="font-medium text-white line-clamp-1">{audio.title}</h3>
                              <p className="text-xs text-gray-500">{new Date(audio.created_at?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {canManage && (
                            <button 
                              onClick={() => handleDeleteContent('meditation_audios', audio.id)}
                              className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Videos Tab */}
              {activeTab === 'videos' && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Video className="w-6 h-6 text-gold" /> Replays Vidéo
                    </h2>
                    {canManage && (
                      <button 
                        onClick={() => setShowAddModal('video')}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Ajouter une vidéo
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {videos.length === 0 ? (
                      <p className="text-gray-400 col-span-2">Aucune vidéo disponible.</p>
                    ) : (
                      videos.map(video => (
                        <div key={video.id} className="bg-obsidian border border-obsidian-light rounded-xl overflow-hidden group">
                          <div className="aspect-video bg-black relative flex items-center justify-center">
                            <Play className="w-12 h-12 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                            {canManage && (
                              <button 
                                onClick={() => handleDeleteContent('meditation_videos', video.id)}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-medium text-white line-clamp-1">{video.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{new Date(video.created_at?.seconds * 1000).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Docs Tab */}
              {activeTab === 'docs' && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FileText className="w-6 h-6 text-gold" /> Documents & Supports
                    </h2>
                    {canManage && (
                      <button 
                        onClick={() => setShowAddModal('file')}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Ajouter un document
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {files.length === 0 ? (
                      <p className="text-gray-400">Aucun document disponible.</p>
                    ) : (
                      files.map(file => (
                        <div key={file.id} className="bg-obsidian border border-obsidian-light rounded-xl p-4 flex items-center justify-between group hover:bg-obsidian-light transition-colors">
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{file.title}</h3>
                              <p className="text-xs text-gray-500">Document PDF</p>
                            </div>
                          </a>
                          <div className="flex items-center gap-2">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gold transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            {canManage && (
                              <button 
                                onClick={() => handleDeleteContent('meditation_files', file.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-gold" /> Calendrier des événements
                    </h2>
                    {canManage && (
                      <button 
                        onClick={() => setShowAddModal('event')}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Ajouter un événement
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {events.length === 0 ? (
                      <p className="text-gray-400">Aucun événement programmé.</p>
                    ) : (
                      events.map(event => (
                        <div key={event.id} className="bg-obsidian border border-obsidian-light rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gold/10 text-gold flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold uppercase">{new Date(event.event_date).toLocaleString('fr-FR', { month: 'short' })}</span>
                              <span className="text-lg font-bold leading-none">{new Date(event.event_date).getDate()}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{event.title}</h3>
                              <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                                <Clock className="w-3.5 h-3.5" /> {new Date(event.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-gray-400 mt-2 text-sm">{event.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button className="px-4 py-2 bg-obsidian-light text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors">
                              Participer
                            </button>
                            {canManage && (
                              <button 
                                onClick={() => handleDeleteContent('meditation_events', event.id)}
                                className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Live Tab */}
              {activeTab === 'live' && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Video className="w-6 h-6 text-gold" /> Sessions en Direct
                    </h2>
                    {canManage && (
                      <button 
                        onClick={() => setShowAddModal('live')}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Nouvelle session live
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {liveSessions.length === 0 ? (
                      <p className="text-gray-400">Aucune session live programmée.</p>
                    ) : (
                      liveSessions.map(session => {
                        const isLiveNow = new Date(session.start_time) <= new Date() && new Date(session.start_time).getTime() + 3600000 > new Date().getTime();
                        return (
                          <div key={session.id} className="bg-obsidian border border-obsidian-light rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-bold text-white">{session.title}</h3>
                                {isLiveNow && (
                                  <span className="px-2 py-0.5 bg-red-600 text-[10px] font-bold text-white rounded uppercase animate-pulse">En direct</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {new Date(session.start_time).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <a 
                                href={session.live_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${isLiveNow ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-obsidian-light text-gray-400 cursor-not-allowed'}`}
                              >
                                <Video className="w-4 h-4" /> Rejoindre le live
                              </a>
                              {canManage && (
                                <button 
                                  onClick={() => handleDeleteContent('meditation_live_sessions', session.id)}
                                  className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full bg-obsidian/30">
                  <div className="p-6 border-b border-obsidian-light bg-obsidian/50 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-gold" /> Messagerie Collective
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">{members.length} membres dans la discussion</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-obsidian-light rounded-full text-gray-400 transition-colors">
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col-reverse max-h-[600px] scrollbar-thin scrollbar-thumb-gold/20">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-10 flex flex-col items-center gap-3">
                        <MessageSquare className="w-12 h-12 opacity-20" />
                        <p>Aucun message pour le moment. Soyez le premier à dire bonjour !</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender_id === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            {msg.sender_id !== currentUser?.uid && (
                              <span className="text-[10px] font-bold text-gold uppercase tracking-wider">{msg.userName}</span>
                            )}
                            <span className="text-[10px] text-gray-500">
                              {msg.created_at ? new Date(msg.created_at.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </span>
                          </div>
                          
                          <div className={`px-4 py-2 rounded-2xl max-w-[85%] shadow-sm ${
                            msg.sender_id === currentUser?.uid 
                              ? 'bg-gold text-obsidian rounded-tr-none' 
                              : 'bg-obsidian border border-obsidian-light text-gray-200 rounded-tl-none'
                          }`}>
                            {msg.file_url && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-black/10 bg-black/5">
                                {msg.file_type === 'image' && (
                                  <img src={msg.file_url} alt="Shared" className="max-w-full h-auto max-h-64 object-contain" referrerPolicy="no-referrer" />
                                )}
                                {msg.file_type === 'audio' && (
                                  <audio src={msg.file_url} controls className="w-full h-10" />
                                )}
                                {msg.file_type === 'video' && (
                                  <video src={msg.file_url} controls className="max-w-full max-h-64" />
                                )}
                                {msg.file_type === 'document' && (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-obsidian-light/50 hover:bg-obsidian-light transition-colors text-white">
                                    <FileText className="w-6 h-6 text-gold" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">Document partagé</p>
                                      <p className="text-[10px] text-gray-500">Cliquer pour voir</p>
                                    </div>
                                    <Download className="w-4 h-4 text-gold" />
                                  </a>
                                )}
                              </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-obsidian-light bg-obsidian">
                    {showMediaUrlInput && (
                      <div className="mb-3 flex items-center gap-2 bg-obsidian-light p-2 rounded-lg border border-gold/20 animate-in slide-in-from-bottom-2">
                        <LinkIcon className="w-4 h-4 text-gold" />
                        <input
                          type="text"
                          placeholder="Coller l'URL d'une image..."
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                        />
                        <button onClick={() => setShowMediaUrlInput(false)} className="p-1 hover:bg-obsidian-lighter rounded-full text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {isRecordingAudio && (
                      <div className="mb-3 flex items-center justify-between bg-red-900/20 p-3 rounded-lg border border-red-900/50 animate-pulse">
                        <div className="flex items-center gap-2 text-red-500">
                          <Mic className="w-4 h-4" />
                          <span className="text-sm font-medium">Enregistrement vocal...</span>
                        </div>
                        <button 
                          onClick={stopAudioRecording}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded-full hover:bg-red-700 transition-colors"
                        >
                          Arrêter
                        </button>
                      </div>
                    )}

                    {isRecordingVideo && (
                      <div className="mb-3 flex flex-col gap-2 bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                        <div className="flex items-center justify-between text-red-500">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            <span className="text-sm font-medium">Enregistrement vidéo...</span>
                          </div>
                          <button 
                            onClick={stopVideoRecording}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-full hover:bg-red-700 transition-colors"
                          >
                            Arrêter
                          </button>
                        </div>
                        <video 
                          ref={(el) => { if (el && videoStream) el.srcObject = videoStream; }} 
                          autoPlay 
                          muted 
                          className="w-full h-32 object-cover rounded-lg bg-black border border-red-900/30"
                        />
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <label className="p-2 hover:bg-obsidian-light rounded-full text-gold cursor-pointer transition-colors" title="Joindre un fichier">
                          <Paperclip className="w-5 h-5" />
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                        </label>
                        <button 
                          type="button"
                          onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                          className={`p-2 hover:bg-obsidian-light rounded-full transition-colors ${showMediaUrlInput ? 'text-white bg-gold/20' : 'text-gold'}`}
                          title="Ajouter une URL"
                        >
                          <LinkIcon className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={startAudioRecording}
                          className="p-2 hover:bg-obsidian-light rounded-full text-gold transition-colors"
                          title="Vocal"
                          disabled={isRecordingAudio}
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={startVideoRecording}
                          className="p-2 hover:bg-obsidian-light rounded-full text-gold transition-colors"
                          title="Vidéo"
                          disabled={isRecordingVideo}
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrivez un message..."
                        className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-full px-4 py-2 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm"
                      />
                      
                      <button 
                        type="submit"
                        disabled={sendingMessage || (!newMessage.trim() && !mediaUrl)}
                        className="p-3 bg-gold text-obsidian rounded-full hover:bg-yellow-400 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                      >
                        {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Members Tab */}
              {activeTab === 'members' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-gold" /> Membres de la classe
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {members.map((member, idx) => (
                      <div key={member.id || idx} className="bg-obsidian p-5 rounded-xl border border-obsidian-light flex items-center gap-4 group hover:border-gold/30 transition-all">
                        <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-bold truncate">Membre #{idx + 1}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Inscrit le {new Date(member.joined_at?.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <History className="w-6 h-6 text-gold" /> Historique de la classe
                  </h2>
                  <div className="space-y-4">
                    {history.length === 0 ? (
                      <div className="text-center py-12 bg-obsidian rounded-xl border border-obsidian-light">
                        <History className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-400">Aucun historique disponible pour le moment.</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <div key={item.id} className="flex gap-4 relative">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold z-10">
                              {item.event_type === 'member_joined' && <Users className="w-4 h-4" />}
                              {item.event_type === 'content_added' && <Plus className="w-4 h-4" />}
                              {item.event_type === 'live_started' && <Video className="w-4 h-4" />}
                              {!['member_joined', 'content_added', 'live_started'].includes(item.event_type) && <Info className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 w-px bg-obsidian-light my-1" />
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="bg-obsidian border border-obsidian-light p-4 rounded-xl">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-sm font-bold text-white">
                                  {item.event_type === 'member_joined' && 'Nouveau membre'}
                                  {item.event_type === 'content_added' && 'Nouveau contenu'}
                                  {item.event_type === 'live_started' && 'Session Live'}
                                  {!['member_joined', 'content_added', 'live_started'].includes(item.event_type) && 'Événement'}
                                </p>
                                <span className="text-[10px] text-gray-500">{new Date(item.created_at?.seconds * 1000).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-gray-400">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Add Content Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-obsidian-lighter border border-obsidian-light rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {showAddModal === 'audio' && 'Ajouter un audio'}
                {showAddModal === 'video' && 'Ajouter une vidéo'}
                {showAddModal === 'file' && 'Ajouter un document'}
                {showAddModal === 'event' && 'Ajouter un événement'}
                {showAddModal === 'live' && 'Nouvelle session live'}
              </h3>
              <button onClick={() => setShowAddModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
              const file = fileInput?.files?.[0];
              
              try {
                let collectionName = '';
                let data: any = {
                  class_id: id,
                  created_by: currentUser?.uid,
                  created_at: serverTimestamp(),
                  title: formData.get('title')
                };

                let fileUrl = formData.get('url') as string;

                if (file) {
                  const { url } = await uploadMeditationFile(file);
                  fileUrl = url;
                }

                if (showAddModal === 'audio') {
                  collectionName = 'meditation_audios';
                  data.audio_url = fileUrl;
                } else if (showAddModal === 'video') {
                  collectionName = 'meditation_videos';
                  data.video_url = fileUrl;
                } else if (showAddModal === 'file') {
                  collectionName = 'meditation_files';
                  data.file_url = fileUrl;
                } else if (showAddModal === 'event') {
                  collectionName = 'meditation_events';
                  data.description = formData.get('description');
                  data.event_date = formData.get('date');
                } else if (showAddModal === 'live') {
                  collectionName = 'meditation_live_sessions';
                  data.live_url = fileUrl;
                  data.start_time = formData.get('date');
                }

                await addDoc(collection(db, collectionName), data);
                await logHistory('content_added', `Nouveau contenu ajouté: ${data.title}`);
                setShowAddModal(null);
              } catch (error: any) {
                handleFirestoreError(error, OperationType.WRITE, 'meditation_content');
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Titre</label>
                <input name="title" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
              </div>
              
              {(showAddModal === 'audio' || showAddModal === 'video' || showAddModal === 'file' || showAddModal === 'live') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">URL du média (Optionnel si fichier choisi)</label>
                    <input name="url" type="url" className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ou télécharger un fichier</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-obsidian-light border-dashed rounded-lg cursor-pointer bg-obsidian hover:bg-obsidian-light transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Download className="w-8 h-8 text-gray-500 mb-2" />
                          <p className="text-xs text-gray-500">Cliquez pour choisir un fichier</p>
                        </div>
                        <input type="file" className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {(showAddModal === 'event') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea name="description" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold h-24" />
                </div>
              )}

              {(showAddModal === 'event' || showAddModal === 'live') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date et heure</label>
                  <input name="date" required type="datetime-local" className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ajouter'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
