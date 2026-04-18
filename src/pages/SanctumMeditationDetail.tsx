import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Users, Calendar, Video, FileText, MessageSquare, Headphones, Play, Send, Plus, Trash2, ExternalLink, Clock, Info, BookOpen, X, Paperclip, Mic, MicOff, Camera, CameraOff, Download, Link as LinkIcon, CheckCircle, History, Globe, MoreVertical, Activity, Monitor, Layout, Shield, HelpCircle, Share, LogOut } from 'lucide-react';
import { uploadMeditationFile } from '../lib/storage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { MessageItem } from '../components/messaging/MessageItem';

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

  // Interaction State
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [availableConversations, setAvailableConversations] = useState<any[]>([]);

  // Fetch conversations for forwarding
  useEffect(() => {
    if (isForwardModalOpen && currentUser) {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid)
      );
      getDocs(q).then((snapshot) => {
        setAvailableConversations(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      });
    }
  }, [isForwardModalOpen, currentUser]);

  const handleReply = (msg: any) => {
    setReplyingTo(msg);
    document.querySelector('textarea')?.focus();
  };

  const handleForward = (msg: any) => {
    setSelectedMessage(msg);
    setIsForwardModalOpen(true);
  };

  const handleInfo = (msg: any) => {
    setSelectedMessage(msg);
    setIsInfoModalOpen(true);
  };

  const sendForward = async (msg: any, targetConversationId: string) => {
    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: targetConversationId,
        sender_id: currentUser!.uid,
        message: `[Transfert] ${msg.message}`,
        file_url: msg.file_url || null,
        file_type: msg.file_type || null,
        created_at: serverTimestamp(),
        is_read: false
      });
      alert('Message transféré avec succès');
    } catch(error) {
      console.error(error);
      alert('Erreur lors du transfert.');
    }
  };

  const handleMessageAction = async (action: string, msg: any) => {
    try {
      switch (action) {
        case 'delete':
          if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
            await deleteDoc(doc(db, 'meditation_messages', msg.id));
          }
          break;
        case 'edit':
          const newValue = prompt("Modifier le message :", msg.message);
          if (newValue !== null) {
            await updateDoc(doc(db, 'meditation_messages', msg.id), { message: newValue });
          }
          break;
        case 'copy':
          navigator.clipboard.writeText(msg.message);
          alert('Message copié !');
          break;
        case 'reply':
          handleReply(msg);
          break;
        case 'forward':
          handleForward(msg);
          break;
        case 'info':
          handleInfo(msg);
          break;
        default:
          alert(`Fonctionnalité ${action} en cours.`);
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l’exécution de l’action.');
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
        reply_to_id: replyingTo?.id || null, // Add this
        created_at: serverTimestamp(),
        is_read: false,
        file_url: mediaUrl || null,
        file_type: mediaUrl ? 'image' : null // Default to image if URL, can be refined
      };
      await addDoc(collection(db, 'meditation_messages'), messageData);
      setReplyingTo(null);
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

  const handleAlert = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Alerte activée pour :", sessionId);
    alert("Vous serez alerté pour cette session. (Fonctionnalité en cours de déploiement)");
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

  const [liveInteractionTab, setLiveInteractionTab] = useState<'chat' | 'qa' | 'resources'>('chat');

  if (loading) {
    return <div className="min-h-screen bg-obsidian flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
  }

  if (!meditationClass) return null;

  if (activeTab === 'live') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#050505] text-zinc-200 p-4 lg:p-8 font-sans overflow-y-auto">
        {/* Conteneur Principal - Layout en 2 Colonnes sur Desktop */}
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-screen">
          
          {/* COLONNE GAUCHE & CENTRE : Le Player avec le Halo */}
          <div className="lg:col-span-3 flex flex-col gap-4 relative">
            
            {/* Header avec action de retour */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setActiveTab('overview')} className="flex items-center text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" /> Retour au Sanctuaire
              </button>
              {canManage && (
                <div className="flex gap-3">
                  {!isBroadcasting ? (
                    <button onClick={startBroadcast} className="bg-red-600/20 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                      <Video size={16} /> Démarrer un Live
                    </button>
                  ) : (
                    <button onClick={() => setShowAddModal('live')} className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black transition-all rounded-xl font-bold flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" /> Programmer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* EFFET DE HALO DORÉ (Background Glow) */}
            <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80%] bg-yellow-500/5 rounded-full blur-[150px] pointer-events-none" />

            {/* PLAYER VIDÉO */}
            <div className="relative group aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl z-10 w-full max-w-5xl mx-auto">
              {/* Overlay d'état */}
              <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
                {(isBroadcasting || activeLive) ? (
                  <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">En Direct</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">En Attente</span>
                  </div>
                )}
                {activeLive && (
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                    <Users size={14} className="text-yellow-500" />
                    <span className="text-xs font-medium">{members.length + 12} spectateurs</span>
                  </div>
                )}
              </div>

              {isBroadcasting ? (
                <>
                  <video 
                    ref={broadcastPreviewRef} 
                    autoPlay playsInline muted 
                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
                      <div className="text-center">
                        <Camera className="w-16 h-16 text-white/10 mb-4 mx-auto" />
                        <p className="text-gray-500 font-serif italic text-xl">Flux visuel désactivé</p>
                      </div>
                    </div>
                  )}
                </>
              ) : activeLive ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
                    <h2 className="text-3xl font-serif text-white mb-6 drop-shadow-lg max-w-2xl">{activeLive.title}</h2>
                    <a href={activeLive.live_url} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                       Rejoindre le Sanctuaire
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-zinc-900/50">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600172454136-16086f685d1d?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 to-[#050505] backdrop-blur-[1px]" />
                  <div className="text-center z-10">
                    <p className="text-yellow-500/50 text-sm tracking-[0.2em] uppercase">Flux de Transmission Sécurisé</p>
                    <span className="block mt-4 text-gray-500 font-serif italic text-xl tracking-wider font-light drop-shadow-md">Le silence précède la lumière...</span>
                  </div>
                </div>
              )}

              {/* BARRE DE CONTRÔLE FLOTTANTE (Visible au hover) - FOR HOST ONLY */}
              {(isBroadcasting || activeLive) && canManage && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-between z-20">
                  <div className="flex items-center gap-4">
                    <button onClick={toggleMute} className={`p-3 backdrop-blur-xl rounded-full transition-all border border-white/10 ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button onClick={toggleVideo} className={`p-3 backdrop-blur-xl rounded-full transition-all border border-white/10 ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                      {isVideoOff ? <CameraOff size={20} /> : <Video size={20} />}
                    </button>
                    <button className="p-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl rounded-full transition-all border border-white/10">
                      <Share size={20} />
                    </button>
                  </div>
                  
                  {isBroadcasting && (
                    <button onClick={stopBroadcast} className="bg-red-600/20 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                      <LogOut size={18} />
                      Terminer la session
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* INFOS DE LA SESSION SOUS LE PLAYER */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm mt-2 max-w-5xl mx-auto w-full">
              <h1 className="text-3xl font-serif text-white mb-2">{activeLive?.title || meditationClass.title}</h1>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
                {activeLive?.description || meditationClass.description}
                <br /><br />
                Session animée par <span className="text-yellow-500">{userProfile?.displayName || "l'Animateur"}</span>.
              </p>
            </div>
            
            {/* Grid Programmation Premium (En-dessous des infos) */}
            <div className="w-full mt-8 max-w-5xl mx-auto pb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold text-white border-l-2 border-yellow-500 pl-4">Prochaines Sessions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {liveSessions.map(session => {
                  const isLiveNow = activeLive?.id === session.id;
                  const sessionDate = new Date(session.start_time);
                  const formattedDate = `${sessionDate.getDate().toString().padStart(2, '0')} ${sessionDate.toLocaleString('default', { month: 'short' }).toUpperCase()} | ${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`;

                  return (
                    <div key={session.id} className="relative group bg-[#0A0A0A] border border-white/5 rounded-[2rem] overflow-hidden p-1 hover:border-yellow-600/30 transition-all duration-500 shadow-2xl">
                      {/* Image de couverture avec overlay sombre */}
                      <div className="relative h-48 rounded-[1.8rem] overflow-hidden">
                        <img src={session.image_url || 'https://images.unsplash.com/photo-1507676184212-d0330a1c5068?auto=format&fit=crop&q=80'} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700" alt="Session Cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
                        
                        {isLiveNow ? (
                          <div className="absolute top-4 left-4 bg-red-600/80 backdrop-blur-md border border-red-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                            <Video size={12} className="text-white" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">En Direct</span>
                          </div>
                        ) : (
                          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <Calendar size={12} className="text-yellow-500" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{formattedDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Contenu de la session */}
                      <div className="p-6 space-y-4">
                        <div>
                          <h3 className="text-2xl font-serif text-white group-hover:text-yellow-500 transition-colors drop-shadow-md">{session.title}</h3>
                          <p className="text-zinc-500 text-sm leading-relaxed mt-2 line-clamp-2">{session.description || 'Rejoignez cette session profonde pour évoluer spirituellement.'}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex -space-x-2">
                            <img src="https://i.pravatar.cc/150?u=a04258114e29026702d" className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-zinc-800 object-cover" alt="Speaker" />
                            <img src="https://i.pravatar.cc/150?u=3" className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-zinc-700 object-cover" alt="Speaker" />
                            <div className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-yellow-600 flex items-center justify-center text-[10px] font-bold text-black z-10">+12</div>
                          </div>

                          {isLiveNow ? (
                            <a href={session.live_url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-yellow-500 text-black hover:bg-yellow-400 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                              Rejoindre
                            </a>
                          ) : (
                            <button 
                              onClick={(e) => handleAlert(e, session.id)}
                              className="px-5 py-2.5 bg-white text-black hover:bg-yellow-500 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                            >
                              M'alerter
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* COLONNE DROITE : Interaction (Glassmorphism Sidebar) */}
          <div className="h-full max-h-[85vh] lg:sticky lg:top-8 flex flex-col bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10">
            
            {/* Navigation Onglets */}
            <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-400 p-[2px]">
                    <div className="w-full h-full rounded-full bg-black border-2 border-black overflow-hidden flex items-center justify-center">
                      <Shield className="w-5 h-5 text-yellow-500" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                </div>
                <div>
                  <h4 className="text-sm font-serif text-white tracking-wide">Sanctum Live</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{members.length + 12} Initiés en ligne</p>
                </div>
              </div>
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                {[
                  { id: 'chat', icon: MessageSquare },
                  { id: 'qa', icon: HelpCircle },
                  { id: 'resources', icon: Download }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLiveInteractionTab(tab.id as 'chat' | 'qa' | 'resources')}
                    className={`p-2 rounded-full transition-all ${
                      liveInteractionTab === tab.id ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <tab.icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu Interactif Dynamique */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide flex flex-col-reverse">
              {liveInteractionTab === 'chat' && (
                <>
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center pb-12">
                      <p className="text-gray-500 font-serif italic text-sm">Le flux est silencieux. Soyez la première étincelle.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === currentUser?.uid;
                      const isMentor = msg.sender_role === 'admin' || msg.sender_role === 'expert' || msg.sender_role === 'supporteur';
                      
                      const timeString = msg.created_at?.toDate 
                        ? new Date(msg.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : '';

                      return isMentor && !isMine ? (
                        <div key={msg.id} className="flex flex-col items-start space-y-2 max-w-[85%] mt-4">
                          <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest ml-4">{msg.userName || "Le Guide"}</span>
                          <div className="relative p-4 rounded-[1.5rem] rounded-tl-none bg-white/5 border border-yellow-600/20 backdrop-blur-md shadow-lg shadow-yellow-600/5">
                            <p className="text-sm text-zinc-200 leading-relaxed">{msg.message}</p>
                            {timeString && <span className="block text-[9px] text-zinc-500 mt-2 text-right italic">{timeString}</span>}
                          </div>
                        </div>
                      ) : isMine ? (
                        <div key={msg.id} className="flex flex-col items-end space-y-2 ml-auto max-w-[85%] mt-4">
                          <div className="p-4 rounded-[1.5rem] rounded-tr-none bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                            <p className="text-sm text-zinc-300">{msg.message}</p>
                            {timeString && <span className="block text-[9px] text-zinc-600 mt-2 text-right italic">{timeString}</span>}
                          </div>
                        </div>
                      ) : (
                        <div key={msg.id} className="flex flex-col items-start space-y-2 max-w-[85%] mt-4">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">{msg.userName}</span>
                          <div className="p-4 rounded-[1.5rem] rounded-tl-none bg-white/5 border border-white/5 backdrop-blur-sm">
                            <p className="text-sm text-zinc-300">{msg.message}</p>
                            {timeString && <span className="block text-[9px] text-zinc-600 mt-2 text-right italic">{timeString}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
              
              {liveInteractionTab === 'qa' && (
                <div className="h-full flex flex-col items-center justify-center text-center pb-10">
                   <HelpCircle className="w-12 h-12 text-yellow-500/30 mb-4" />
                   <h3 className="font-serif text-xl font-bold text-white mb-2">Questions & Réponses</h3>
                   <p className="text-gray-500 text-sm">Posez vos questions sérieuses. Le guide les épinglera pour y répondre publiquement.</p>
                </div>
              )}
              
              {liveInteractionTab === 'resources' && (
                <div className="h-full flex flex-col justify-end gap-3 pb-4">
                  <h3 className="font-serif text-lg font-bold text-white mb-2">Ressources & Documents</h3>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">Schéma Sphère des Sephiroth.pdf</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">2.4 MB</p>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-yellow-500 transition-colors" />
                  </div>
                </div>
              )}
            </div>

            {/* Zone d'entrée de texte */}
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 pl-4 rounded-[2rem] backdrop-blur-xl focus-within:border-yellow-600/50 transition-all">
                <button type="button" className="text-zinc-500 hover:text-yellow-500 transition-colors">
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={liveInteractionTab === 'chat' ? "Partagez votre pensée..." : "Posez votre question..."}
                  className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-zinc-600"
                />
                <button type="submit" disabled={!newMessage.trim() || sendingMessage} className="p-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black rounded-full transition-all shadow-lg shadow-yellow-600/20">
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
        
        {/* Render modal if triggered inside Live mode */}
        {showAddModal === 'live' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-serif text-white font-bold">Nouvelle session live</h3>
                 <button onClick={() => setShowAddModal(null)} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 setIsSubmitting(true);
                 const formData = new FormData(e.currentTarget);
                 try {
                   let imageUrl = null;
                   const fileInput = document.querySelector('input[name="coverImage"]') as HTMLInputElement;
                   if (fileInput && fileInput.files && fileInput.files.length > 0) {
                     const file = fileInput.files[0];
                     const uploadResult = await uploadMeditationFile(file);
                     imageUrl = uploadResult.url;
                   }
                   
                   const data: any = {
                     class_id: id,
                     created_by: currentUser?.uid,
                     created_at: serverTimestamp(),
                     title: formData.get('title'),
                     start_time: formData.get('date'),
                     image_url: imageUrl
                   };
                   await addDoc(collection(db, 'meditation_live_sessions'), data);
                   setShowAddModal(null);
                   await logHistory('live_started', `A programmé une session Live: ${data.title}`);
                 } catch (err: any) {
                   handleFirestoreError(err, OperationType.WRITE, 'meditation_live_sessions');
                 } finally {
                   setIsSubmitting(false);
                 }
               }} className="space-y-5">
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Titre du live</label>
                   <input name="title" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold/50 focus:bg-white/10 transition-all font-sans" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Date et heure</label>
                   <input name="date" required type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold/50 focus:bg-white/10 transition-all font-sans" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Image de couverture (Optionnelle)</label>
                   <div className="relative group cursor-pointer w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/10 hover:border-yellow-500/50 rounded-xl px-4 py-8 text-center transition-all">
                     <Camera className="w-8 h-8 text-gray-400 group-hover:text-yellow-500 mx-auto mb-2 transition-colors" />
                     <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Cliquez pour choisir une image de couverture</span>
                     <input name="coverImage" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                   </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full font-bold bg-gold hover:bg-yellow-400 text-black py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 mt-6 font-sans">
                   {isSubmitting ? 'Programmation...' : 'Programmer le Live'}
                 </button>
               </form>
             </div>
          </div>
        )}
      </div>
    );
  }

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
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm text-gray-400 hover:bg-obsidian-light hover:text-gray-200`}
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
                     messages.map((msg, idx) => {
                      const isMine = msg.sender_id === currentUser?.uid;
                      return (
                        <MessageItem 
                          key={msg.id} 
                          message={msg} 
                          isOwn={isMine} 
                          userRole={userProfile?.role || 'user'}
                          onAction={handleMessageAction}
                        />
                      );
                    })
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

                    {/* Reply Preview */}
                    {replyingTo && (
                      <div className="flex items-center justify-between bg-zinc-800 border-l-4 border-yellow-500 p-2 mb-2 rounded-r-lg">
                        <div className="overflow-hidden">
                          <p className="text-xs text-yellow-500 font-bold">Réponse à :</p>
                          <p className="text-sm text-gray-300 truncate">{replyingTo.message}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1">
                          <X size={16} className="text-gray-400 hover:text-white" />
                        </button>
                      </div>
                    )}

                    {/* Forward Modal */}
                    {isForwardModalOpen && selectedMessage && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-[#1a1a1a] border border-zinc-800 w-full max-w-md rounded-2xl p-6">
                          <h3 className="text-xl font-semibold mb-4 text-white">Transférer le message</h3>
                          <div className="max-h-60 overflow-y-auto space-y-3">
                            {availableConversations.map(conv => (
                              <div key={conv.id} className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors" onClick={() => { sendForward(selectedMessage, conv.id); setIsForwardModalOpen(false); }}>
                                <span className="text-gray-200 truncate">{conv.subject || conv.type}</span>
                                <span className="bg-yellow-600 px-2 py-1 rounded text-[10px] text-black font-bold">Envoyer</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setIsForwardModalOpen(false)} className="mt-6 w-full py-2 text-zinc-400 hover:text-white">Annuler</button>
                        </div>
                      </div>
                    )}

                    {/* Info Modal */}
                    {isInfoModalOpen && selectedMessage && (
                      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsInfoModalOpen(false)}>
                        <div className="bg-[#1a1a1a] border border-zinc-800 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                          <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2"><Clock size={18} /> Informations du message</h3>
                          <div className="space-y-4 text-sm">
                            <div className="flex justify-between border-b border-zinc-800 pb-2">
                              <span className="text-zinc-500">Envoyé le :</span>
                              <span className="text-zinc-200">{new Date(selectedMessage.created_at?.seconds * 1000).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">ID :</span>
                              <span className="text-zinc-500 font-mono text-[10px]">{selectedMessage.id}</span>
                            </div>
                          </div>
                          <button onClick={() => setIsInfoModalOpen(false)} className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl transition-colors">Fermer</button>
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
