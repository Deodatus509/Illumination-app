import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Users, Calendar, Video, FileText, MessageSquare, Headphones, Play, Send, Plus, Trash2, ExternalLink, Clock, Info, BookOpen, X, Paperclip, Mic, MicOff, Camera, CameraOff, Download, Link as LinkIcon, CheckCircle, History, Globe, MoreVertical } from 'lucide-react';
import { uploadMeditationFile } from '../lib/storage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function SanctumMeditationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, openAuthModal, userProfile } = useAuth();
  const [meditationClass, setMeditationClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'content' | 'audios' | 'videos' | 'docs' | 'calendar' | 'live' | 'members' | 'history' | 'management'>('overview');
  
  // Content states
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ url: string; type: string } | null>(null);
  
  // Media Recording States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Live Broadcasting States
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStream, setBroadcastStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const broadcastPreviewRef = React.useRef<HTMLVideoElement>(null);
  
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

    const unsubSessions = onSnapshot(
      query(collection(db, 'meditation_sessions'), where('class_id', '==', id), orderBy('date', 'asc')),
      (snap) => setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_sessions')
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
      unsubSessions();
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
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.split('/')[1].split(';')[0];
        const file = new File([blob], `vocal_meditation_${Date.now()}.${extension}`, { type: mimeType });
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

  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      setBroadcastStream(stream);
      setIsBroadcasting(true);
      if (broadcastPreviewRef.current) {
        broadcastPreviewRef.current.srcObject = stream;
      }
      
      // Log to history
      await logHistory('live_started', 'A démarré une session Live');
    } catch (error) {
      console.error("Error starting broadcast:", error);
      alert("Impossible d'accéder à la caméra ou au micro.");
    }
  };

  const stopBroadcast = () => {
    if (broadcastStream) {
      broadcastStream.getTracks().forEach(track => track.stop());
      setBroadcastStream(null);
    }
    setIsBroadcasting(false);
    setIsMuted(false);
    setIsVideoOff(false);
    logHistory('live_ended', 'A terminé la session Live');
  };

  const toggleMute = () => {
    if (broadcastStream) {
      const audioTrack = broadcastStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (broadcastStream) {
      const videoTrack = broadcastStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const sessionData = {
        class_id: id,
        title: formData.get('title'),
        description: formData.get('description'),
        media_url: formData.get('media_url'),
        date: formData.get('date'),
        created_at: serverTimestamp()
      };

      if (editingSession) {
        // Update logic would go here if I had a separate update function, 
        // but I'll implement it inline or via a separate state check
      } else {
        await addDoc(collection(db, 'meditation_sessions'), sessionData);
        await logHistory('session_added', `A ajouté une nouvelle session: ${sessionData.title}`);
      }
      
      setShowAddModal(null);
      setEditingSession(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'meditation_sessions');
    } finally {
      setIsSubmitting(false);
    }
  };
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
        ? 'video/webm;codecs=vp8,opus' 
        : 'video/webm';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.split('/')[1].split(';')[0];
        const file = new File([blob], `video_meditation_${Date.now()}.${extension}`, { type: mimeType });
        await handleFileUpload(file);
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        if (recordingInterval) clearInterval(recordingInterval);
        setRecordingTime(0);
      };

      recorder.start();
      setVideoRecorder(recorder);
      setVideoStream(stream);
      setIsRecordingVideo(true);

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
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
      if (recordingInterval) clearInterval(recordingInterval);
      setRecordingTime(0);
    }
  };

  const takePhoto = async () => {
    if (!videoStream || !canvasRef.current) return;
    
    setIsCapturingPhoto(true);
    try {
      const video = document.createElement('video');
      video.srcObject = videoStream;
      await video.play();
      
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `photo_meditation_${Date.now()}.jpg`, { type: 'image/jpeg' });
            await handleFileUpload(file);
          }
        }, 'image/jpeg', 0.9);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 border border-red-500/50"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="tracking-wider uppercase">Live en cours</span>
                  <div className="h-4 w-px bg-white/30 mx-1" />
                  <div className="flex items-center gap-1 text-xs opacity-90">
                    <Users className="w-3 h-3" />
                    <span>{members.length + 12}</span>
                  </div>
                </motion.div>
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
                {canManage && (
                  <button
                    onClick={() => setActiveTab('management')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm ${activeTab === 'management' ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-obsidian-light hover:text-gray-200'}`}
                  >
                    <Plus className="w-4 h-4" /> Gestion des sessions
                  </button>
                )}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {audios.length === 0 ? (
                      <p className="text-gray-400 col-span-2">Aucun audio disponible.</p>
                    ) : (
                      audios.map(audio => (
                        <div key={audio.id} className="bg-obsidian border border-obsidian-light rounded-xl p-6 flex flex-col gap-4 group hover:border-gold/30 transition-all shadow-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                                <Headphones className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white line-clamp-1">{audio.title}</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Audio • {new Date(audio.created_at?.seconds * 1000).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {canManage && (
                              <button 
                                onClick={() => handleDeleteContent('meditation_audios', audio.id)}
                                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          <div className="bg-obsidian-lighter rounded-lg p-3 border border-obsidian-light">
                            <audio 
                              src={audio.audio_url} 
                              controls 
                              className="w-full h-10 custom-audio" 
                            />
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>Partagé par l'instructeur</span>
                          </div>
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
                        <div key={video.id} className="bg-obsidian border border-obsidian-light rounded-xl overflow-hidden group hover:border-gold/30 transition-all shadow-lg">
                          <div className="aspect-video bg-black relative">
                            <video 
                              src={video.video_url} 
                              controls 
                              playsInline
                              className="w-full h-full object-contain"
                              poster={video.thumbnail_url}
                            />
                            {canManage && (
                              <button 
                                onClick={() => handleDeleteContent('meditation_videos', video.id)}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg hover:text-red-500 transition-colors z-10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                                <Video className="w-3 h-3" />
                              </div>
                              <h3 className="font-bold text-white line-clamp-1">{video.title}</h3>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider">
                              <span>Vidéo • {new Date(video.created_at?.seconds * 1000).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Replay</span>
                            </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {files.length === 0 ? (
                      <p className="text-gray-400 col-span-2">Aucun document disponible.</p>
                    ) : (
                      files.map(file => (
                        <div key={file.id} className="bg-obsidian border border-obsidian-light rounded-xl p-6 flex flex-col gap-4 group hover:border-gold/30 transition-all shadow-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white line-clamp-1">{file.title}</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Document • {new Date(file.created_at?.seconds * 1000).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {canManage && (
                              <button 
                                onClick={() => handleDeleteContent('meditation_files', file.id)}
                                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            {file.file_url?.toLowerCase().endsWith('.pdf') ? (
                              <div className="relative aspect-[3/4] bg-obsidian-lighter rounded-lg overflow-hidden border border-obsidian-light group/preview">
                                <iframe 
                                  src={`${file.file_url}#toolbar=0&navpanes=0`} 
                                  className="w-full h-full border-none pointer-events-none"
                                  title={file.title}
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover/preview:bg-black/40 transition-colors flex items-center justify-center">
                                  <a 
                                    href={file.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-gold text-obsidian rounded-lg font-bold opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center gap-2"
                                  >
                                    <ExternalLink className="w-4 h-4" /> Voir le PDF
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-obsidian-lighter rounded-lg flex flex-col items-center justify-center border border-obsidian-light text-gray-500">
                                <FileText className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-xs">Aperçu non disponible</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 pt-2">
                            <a 
                              href={file.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 py-2 bg-obsidian-light hover:bg-obsidian-lighter text-white rounded-lg text-xs font-bold text-center transition-colors flex items-center justify-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" /> Ouvrir
                            </a>
                            <a 
                              href={file.file_url} 
                              download
                              className="p-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </a>
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
                      <div className="flex gap-3">
                        {!isBroadcasting ? (
                          <button 
                            onClick={startBroadcast}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
                          >
                            <Video className="w-4 h-4" /> Démarrer un Live
                          </button>
                        ) : (
                          <button 
                            onClick={stopBroadcast}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-500 transition-colors"
                          >
                            <X className="w-4 h-4" /> Quitter le mode Live
                          </button>
                        )}
                        <button 
                          onClick={() => setShowAddModal('live')}
                          className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Programmer un live
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Broadcaster View */}
                  {isBroadcasting && (
                    <div className="mb-12 bg-black rounded-2xl overflow-hidden border-2 border-red-600 shadow-2xl shadow-red-600/10">
                      <div className="aspect-video relative bg-obsidian-dark">
                        <video 
                          ref={broadcastPreviewRef} 
                          autoPlay 
                          playsInline 
                          muted={true}
                          className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                        />
                        {isVideoOff && (
                          <div className="absolute inset-0 flex items-center justify-center bg-obsidian-dark">
                            <div className="text-center">
                              <Camera className="w-16 h-16 text-gray-600 mb-4 mx-auto" />
                              <p className="text-gray-500">Caméra désactivée</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Controls Overlay */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/60 backdrop-blur-xl rounded-full border border-white/10">
                          <button 
                            onClick={toggleMute}
                            className={`p-3 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isMuted ? "Réactiver le micro" : "Couper le micro"}
                          >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                          </button>
                          <button 
                            onClick={toggleVideo}
                            className={`p-3 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isVideoOff ? "Réactiver la caméra" : "Couper la caméra"}
                          >
                            {isVideoOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                          </button>
                          <div className="w-px h-8 bg-white/20 mx-2" />
                          <button 
                            onClick={stopBroadcast}
                            className="px-6 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all flex items-center gap-2"
                          >
                            <X className="w-5 h-5" /> Terminer le Live
                          </button>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-6 left-6 flex items-center gap-3">
                          <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-white rounded-full" />
                            EN DIRECT
                          </div>
                          <div className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/10">
                            {members.length + 12} spectateurs
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLive && !isBroadcasting && (
                    <div className="mb-12">
                      <div className="bg-obsidian-lighter border border-gold/30 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="aspect-video bg-black relative group">
                          {/* Mock Live Player */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Play className="w-16 h-16 text-gold/50 mb-4 mx-auto" />
                              <p className="text-gray-400">Flux vidéo en direct...</p>
                            </div>
                          </div>
                          
                          {/* Live Overlay */}
                          <div className="absolute top-4 left-4 flex items-center gap-2">
                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              EN DIRECT
                            </span>
                            <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {members.length + 12}
                            </span>
                          </div>

                          <div className="absolute bottom-4 right-4">
                            <button className="p-2 bg-black/50 backdrop-blur-md text-white rounded-lg hover:bg-black/70 transition-colors">
                              <Globe className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{activeLive.title}</h3>
                            <p className="text-gray-400 text-sm">Commencé il y a {Math.floor((new Date().getTime() - new Date(activeLive.start_time).getTime()) / 60000)} minutes</p>
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <button 
                              onClick={() => setActiveTab('chat')}
                              className="flex-1 md:flex-none px-6 py-3 bg-obsidian-light text-white rounded-xl font-bold hover:bg-obsidian-lighter transition-all flex items-center justify-center gap-2"
                            >
                              <MessageSquare className="w-5 h-5" /> Chat
                            </button>
                            <a 
                              href={activeLive.live_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 md:flex-none px-8 py-3 bg-gold text-obsidian rounded-xl font-bold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/10"
                            >
                              Rejoindre le Live
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white/70 mb-4">Programme des sessions</h3>
                    {liveSessions.length === 0 ? (
                      <p className="text-gray-400">Aucune session live programmée.</p>
                    ) : (
                      liveSessions.map(session => {
                        const isLiveNow = activeLive?.id === session.id;
                        return (
                          <div key={session.id} className={`bg-obsidian border rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group transition-all ${isLiveNow ? 'border-gold/50 bg-gold/5' : 'border-obsidian-light hover:border-obsidian-lighter'}`}>
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
                                  <div className="relative group">
                                    <img 
                                      src={msg.file_url} 
                                      alt="Shared" 
                                      className="w-full h-auto max-h-80 object-cover rounded-lg shadow-md" 
                                      referrerPolicy="no-referrer" 
                                    />
                                    <a 
                                      href={msg.file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                    >
                                      <ExternalLink className="w-6 h-6" />
                                    </a>
                                  </div>
                                )}
                                {msg.file_type === 'audio' && (
                                  <div className="p-2 bg-obsidian-light/30 rounded-lg">
                                    <audio 
                                      src={msg.file_url} 
                                      controls 
                                      className="w-full h-10" 
                                    />
                                  </div>
                                )}
                                {msg.file_type === 'video' && (
                                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                    <video 
                                      src={msg.file_url} 
                                      controls 
                                      playsInline
                                      className="w-full h-full object-contain" 
                                    />
                                  </div>
                                )}
                                {msg.file_type === 'document' && (
                                  <div className="flex flex-col gap-2">
                                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-obsidian-light/50 hover:bg-obsidian-light transition-colors text-white rounded-lg">
                                      <div className="w-10 h-10 rounded-lg bg-gold/20 text-gold flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">Document PDF</p>
                                        <p className="text-[10px] text-gray-400">Cliquer pour visualiser</p>
                                      </div>
                                      <Download className="w-4 h-4 text-gold" />
                                    </a>
                                    {msg.file_url.toLowerCase().endsWith('.pdf') && (
                                      <iframe 
                                        src={`${msg.file_url}#toolbar=0`} 
                                        className="w-full h-48 rounded-lg border border-obsidian-light hidden md:block"
                                        title="PDF Preview"
                                      />
                                    )}
                                  </div>
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
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm font-bold uppercase tracking-wider">REC {formatTime(recordingTime)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={takePhoto}
                              disabled={isCapturingPhoto}
                              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                              title="Prendre une photo"
                            >
                              {isCapturingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={stopVideoRecording}
                              className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-700 transition-colors shadow-lg"
                            >
                              Arrêter
                            </button>
                          </div>
                        </div>
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-red-900/30">
                          <video 
                            ref={(el) => { 
                              if (el && videoStream) {
                                el.srcObject = videoStream;
                                el.play().catch(console.error);
                              }
                            }} 
                            autoPlay 
                            muted 
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
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

              {/* Management Tab */}
              {activeTab === 'management' && canManage && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Plus className="w-6 h-6 text-gold" /> Gestion des sessions
                    </h2>
                    <button 
                      onClick={() => {
                        setEditingSession(null);
                        setShowAddModal('session');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Nouvelle session
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {sessions.length === 0 ? (
                      <div className="bg-obsidian border border-obsidian-light rounded-xl p-12 text-center">
                        <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-400">Aucune session créée pour le moment.</p>
                      </div>
                    ) : (
                      sessions.map(session => (
                        <div key={session.id} className="bg-obsidian border border-obsidian-light rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{session.title}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mb-2">{session.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(session.date).toLocaleDateString()}
                              </span>
                              {session.media_url && (
                                <span className="flex items-center gap-1 text-gold">
                                  <LinkIcon className="w-3 h-3" /> Media lié
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingSession(session);
                                setShowAddModal('session');
                              }}
                              className="p-2 text-gray-400 hover:text-gold transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Modifier
                            </button>
                            <button 
                              onClick={() => handleDeleteContent('meditation_sessions', session.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                {showAddModal === 'session' && (editingSession ? 'Modifier la session' : 'Ajouter une session')}
              </h3>
              <button onClick={() => {
                setShowAddModal(null);
                setEditingSession(null);
              }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              
              try {
                if (showAddModal === 'session') {
                  const sessionData = {
                    class_id: id,
                    title: formData.get('title'),
                    description: formData.get('description'),
                    media_url: formData.get('media_url'),
                    date: formData.get('date'),
                    updated_at: serverTimestamp(),
                    ...(editingSession ? {} : { created_at: serverTimestamp() })
                  };

                  if (editingSession) {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    await updateDoc(doc(db, 'meditation_sessions', editingSession.id), sessionData);
                    await logHistory('session_modified', `A modifié la session: ${sessionData.title}`);
                  } else {
                    await addDoc(collection(db, 'meditation_sessions'), sessionData);
                    await logHistory('session_added', `A ajouté une nouvelle session: ${sessionData.title}`);
                  }
                  
                  setShowAddModal(null);
                  setEditingSession(null);
                  setIsSubmitting(false);
                  return;
                }

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
                  data.file_type = 'audio';
                } else if (showAddModal === 'video') {
                  collectionName = 'meditation_videos';
                  data.video_url = fileUrl;
                  data.file_type = 'video';
                } else if (showAddModal === 'file') {
                  collectionName = 'meditation_files';
                  data.file_url = fileUrl;
                  data.file_type = 'document';
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
                setUploadPreview(null);
              } catch (error: any) {
                handleFirestoreError(error, OperationType.WRITE, 'meditation_content');
              } finally {
                setIsSubmitting(false);
              }
            } catch (error: any) {
              handleFirestoreError(error, OperationType.WRITE, 'meditation_session');
              setIsSubmitting(false);
            }
          }} className="space-y-4">
              {showAddModal === 'session' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Titre de la session</label>
                    <input name="title" required defaultValue={editingSession?.title} className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <textarea name="description" rows={3} defaultValue={editingSession?.description} className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">URL Vidéo/Audio (Optionnel)</label>
                    <input name="media_url" type="url" defaultValue={editingSession?.media_url} className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Date et Heure</label>
                    <input name="date" type="datetime-local" required defaultValue={editingSession?.date} className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Titre</label>
                    <input name="title" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                  
                  {(showAddModal === 'audio' || showAddModal === 'video' || showAddModal === 'file' || showAddModal === 'live') && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">URL du média (Optionnel si fichier choisi)</label>
                        <input 
                          name="url" 
                          type="url" 
                          className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" 
                          onChange={(e) => {
                            if (e.target.value) {
                              setUploadPreview({ url: e.target.value, type: showAddModal === 'audio' ? 'audio' : showAddModal === 'video' ? 'video' : 'image' });
                            } else {
                              setUploadPreview(null);
                            }
                          }}
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Ou télécharger un fichier</label>
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-obsidian-light border-dashed rounded-lg cursor-pointer bg-obsidian hover:bg-obsidian-light transition-colors overflow-hidden relative">
                            {uploadPreview ? (
                              <div className="absolute inset-0 w-full h-full">
                                {uploadPreview.type === 'image' && <img src={uploadPreview.url} className="w-full h-full object-cover" alt="Preview" />}
                                {uploadPreview.type === 'video' && <video src={uploadPreview.url} className="w-full h-full object-cover" />}
                                {uploadPreview.type === 'audio' && <div className="w-full h-full flex items-center justify-center bg-gold/10"><Headphones className="w-8 h-8 text-gold" /></div>}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <p className="text-white text-xs font-bold">Changer le fichier</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Download className="w-8 h-8 text-gray-500 mb-2" />
                                <p className="text-xs text-gray-500">Cliquez pour choisir un fichier</p>
                              </div>
                            )}
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  const type = file.type.startsWith('image/') ? 'image' : 
                                               file.type.startsWith('audio/') ? 'audio' :
                                               file.type.startsWith('video/') ? 'video' : 'document';
                                  setUploadPreview({ url, type });
                                }
                              }}
                            />
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
                </>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-gold text-obsidian rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingSession ? 'Mettre à jour' : 'Ajouter')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
