import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, ArrowLeft, MessageSquare, FileText, Calendar, History, BookOpen,
  Send, Paperclip, Mic, Video, X, Play, Pause, Download, 
  ExternalLink, Plus, Trash2, CheckCircle, Clock, AlertCircle,
  MoreVertical, Info, User, Camera, Globe, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { uploadConsultationFile } from '../lib/storage';

type TabType = 'overview' | 'messages' | 'files' | 'notes' | 'appointments' | 'history';

export function SanctumConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isAuthor, setIsAuthor] = useState(false);
  
  // Messages State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Media State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{ url: string, type: string, name: string } | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'audio' | 'video' | 'document' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');

  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Other Content State
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !currentUser) return;

    const fetchConsultation = async () => {
      try {
        const docRef = doc(db, 'consultations', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConsultation({ id: docSnap.id, ...data });
          setConversationId(data.conversation_id || null);
          
          // Check if user is author/admin/editor
          const role = userProfile?.role;
          setIsAuthor(['admin', 'editor', 'author'].includes(role || ''));
        } else {
          navigate('/sanctum-lucis/consultations');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `consultations/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultation();
  }, [id, currentUser, userProfile, navigate]);

  // Real-time Messages
  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, 'messages'),
      where('conversation_id', '==', conversationId),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setMessages(msgs);
      
      // Mark as read
      msgs.forEach(msg => {
        if (!msg.is_read && msg.sender_id !== currentUser?.uid) {
          updateDoc(doc(db, 'messages', msg.id), { is_read: true });
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    });

    return () => unsubscribe();
  }, [conversationId, currentUser]);

  // Real-time Files
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'consultation_files'), where('consultation_id', '==', id), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [id]);

  // Real-time Notes (Staff only)
  useEffect(() => {
    if (!id || !isAuthor) return;
    const q = query(collection(db, 'consultation_notes'), where('consultation_id', '==', id), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [id, isAuthor]);

  // Real-time Appointments
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'consultation_appointments'), where('consultation_id', '==', id), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { url: string, type: string }) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !mediaData && !conversationId) return;

    setSendingMessage(true);
    try {
      let currentConvoId = conversationId;

      // If no conversation exists, create one (should have been created on approval, but just in case)
      if (!currentConvoId) {
        const convoRef = await addDoc(collection(db, 'conversations'), {
          type: 'consultation',
          consultation_id: id,
          created_by: currentUser?.uid,
          participants: [currentUser?.uid, consultation.user_id].filter(Boolean),
          status: 'open',
          subject: `Consultation: ${consultation.fullName}`,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          last_message: newMessage || 'Média partagé',
          last_message_time: serverTimestamp()
        });
        currentConvoId = convoRef.id;
        setConversationId(currentConvoId);
        await updateDoc(doc(db, 'consultations', id!), { conversation_id: currentConvoId });
      }

      const messageData = {
        conversation_id: currentConvoId,
        sender_id: currentUser?.uid,
        sender_role: userProfile?.role || 'user',
        message: newMessage,
        file_url: mediaData?.url || null,
        file_type: mediaData?.type || null,
        created_at: serverTimestamp(),
        is_read: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      await updateDoc(doc(db, 'conversations', currentConvoId), {
        last_message: newMessage || (mediaData ? `[${mediaData.type}]` : ''),
        last_message_time: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Notify other participant
      const recipientId = currentUser?.uid === consultation.user_id 
        ? consultation.assigned_to 
        : consultation.user_id;

      if (recipientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          title: 'Nouveau message',
          message: `Nouveau message dans votre consultation "${consultation.fullName}"`,
          type: 'consultation',
          isRead: false,
          createdAt: serverTimestamp(),
          link: `/sanctum-lucis/consultations/${id}`
        });
      }

      setNewMessage('');
      setMediaPreview(null);
      setMediaType(null);
      setAudioBlob(null);
      setVideoBlob(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('audio/') ? 'audio' :
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    setSendingMessage(true);
    try {
      const { url } = await uploadConsultationFile(file);
      
      // Also add to consultation_files collection
      await addDoc(collection(db, 'consultation_files'), {
        consultation_id: id,
        file_url: url,
        file_type: type,
        file_name: file.name,
        uploaded_by: currentUser?.uid,
        created_at: serverTimestamp()
      });

      await handleSendMessage(undefined, { url, type });
      setUploadPreview(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert("Erreur lors de l'envoi du fichier. Veuillez réessayer.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('audio/') ? 'audio' :
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    setUploadPreview({
      url: URL.createObjectURL(file),
      type,
      name: file.name
    });
    setMediaType(type as any);
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setMediaPreview(url);
        setMediaType('audio');
        setUploadPreview({ url, type: 'audio', name: `audio_recording_${Date.now()}.webm` });
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert("Impossible d'accéder au micro.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setMediaPreview(url);
        setMediaType('video');
        setUploadPreview({ url, type: 'video', name: `video_recording_${Date.now()}.webm` });
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
    } catch (err) {
      console.error('Error starting video recording:', err);
      alert("Impossible d'accéder à la caméra.");
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSendRecordedMedia = async () => {
    const blob = audioBlob || videoBlob;
    if (!blob && !uploadPreview) return;

    if (blob) {
      const file = new File([blob], `${mediaType === 'audio' ? 'audio' : 'video'}_${Date.now()}.webm`, { type: blob.type });
      await handleFileUpload(file);
    } else if (uploadPreview) {
      // If it was a file select
      const response = await fetch(uploadPreview.url);
      const fileBlob = await response.blob();
      const file = new File([fileBlob], uploadPreview.name, { type: fileBlob.type });
      await handleFileUpload(file);
    }
    
    setMediaPreview(null);
    setUploadPreview(null);
    setAudioBlob(null);
    setVideoBlob(null);
  };

  const handleAddUrlMedia = async () => {
    if (!mediaUrl.trim()) return;
    
    // Simple type detection based on extension
    let type: 'image' | 'audio' | 'video' | 'document' = 'document';
    if (mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i)) type = 'image';
    else if (mediaUrl.match(/\.(mp3|wav|ogg)$/i)) type = 'audio';
    else if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) type = 'video';

    await handleSendMessage(undefined, { url: mediaUrl, type });
    setMediaUrl('');
    setShowMediaUrlInput(false);
  };

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, 'consultation_history'), where('consultation_id', '==', id), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'consultation_history'));

    return () => unsubscribe();
  }, [id]);

  const logHistory = async (eventType: string, description: string) => {
    try {
      await addDoc(collection(db, 'consultation_history'), {
        consultation_id: id,
        event_type: eventType,
        description,
        created_by: currentUser?.uid,
        created_at: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging history:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !isAuthor) return;
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: serverTimestamp()
      };
      
      // Assign to current user if not already assigned and status is being approved/accepted
      if (!consultation.assigned_to && (newStatus === 'approved' || newStatus === 'in_progress')) {
        updateData.assigned_to = currentUser?.uid;
      }

      await updateDoc(doc(db, 'consultations', id), updateData);
      setConsultation({ ...consultation, ...updateData });
      await logHistory('status_change', `Statut changé en : ${statusLabels[newStatus as keyof typeof statusLabels]}`);
      
      // Notify user of status change
      if (consultation.user_id !== currentUser?.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: consultation.user_id,
          title: 'Mise à jour de consultation',
          message: `Le statut de votre consultation "${consultation.fullName}" est passé à : ${statusLabels[newStatus as keyof typeof statusLabels]}`,
          type: 'consultation',
          isRead: false,
          createdAt: serverTimestamp(),
          link: `/sanctum-lucis/consultations/${id}`
        });
      }

      // If approved, ensure conversation exists
      if (newStatus === 'approved' && !conversationId) {
        const convoRef = await addDoc(collection(db, 'conversations'), {
          type: 'consultation',
          consultation_id: id,
          created_by: currentUser?.uid,
          participants: [currentUser?.uid, consultation.user_id].filter(Boolean),
          status: 'open',
          subject: `Consultation: ${consultation.fullName}`,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          last_message: 'Consultation approuvée. Vous pouvez maintenant échanger.',
          last_message_time: serverTimestamp()
        });
        setConversationId(convoRef.id);
        await updateDoc(doc(db, 'consultations', id), { conversation_id: convoRef.id });

        // Add initial message
        await addDoc(collection(db, 'messages'), {
          conversation_id: convoRef.id,
          sender_id: currentUser?.uid,
          sender_role: userProfile?.role || 'admin',
          message: 'Consultation approuvée. Vous pouvez maintenant échanger.',
          created_at: serverTimestamp(),
          is_read: false
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-gold" />
      </div>
    );
  }

  if (!consultation) return null;

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    waiting_user: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    completed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const statusLabels = {
    pending: 'En attente',
    approved: 'Approuvée',
    in_progress: 'En cours',
    waiting_user: 'Attente utilisateur',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };

  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 bg-obsidian-lighter border border-obsidian-light rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-serif font-bold text-white">Consultation: {consultation.fullName}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[consultation.status as keyof typeof statusColors]}`}>
                  {statusLabels[consultation.status as keyof typeof statusLabels]}
                </span>
              </div>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Demandée le {new Date(consultation.created_at?.seconds * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>

          {isAuthor && (
            <div className="flex items-center gap-3">
              <select 
                value={consultation.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-obsidian-lighter border border-obsidian-light rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-gold"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
          {[
            { id: 'overview', label: 'Aperçu', icon: Info },
            { id: 'messages', label: 'Messagerie', icon: MessageSquare },
            { id: 'files', label: 'Fichiers', icon: FileText },
            { id: 'notes', label: 'Notes', icon: BookOpen, staffOnly: true },
            { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
            { id: 'history', label: 'Historique', icon: History }
          ].map((tab) => {
            if (tab.staffOnly && !isAuthor) return null;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-gold text-obsidian shadow-lg shadow-gold/20' 
                    : 'bg-obsidian-lighter text-gray-400 border border-obsidian-light hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-obsidian-lighter border border-obsidian-light rounded-2xl overflow-hidden min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" /> Informations Personnelles
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-obsidian p-4 rounded-xl border border-obsidian-light">
                          <p className="text-xs text-gray-500 mb-1">Nom Complet</p>
                          <p className="text-white font-medium">{consultation.fullName}</p>
                        </div>
                        <div className="bg-obsidian p-4 rounded-xl border border-obsidian-light">
                          <p className="text-xs text-gray-500 mb-1">Date de Naissance</p>
                          <p className="text-white font-medium">{consultation.birthDate || 'Non renseigné'}</p>
                        </div>
                        <div className="bg-obsidian p-4 rounded-xl border border-obsidian-light">
                          <p className="text-xs text-gray-500 mb-1">Heure de Naissance</p>
                          <p className="text-white font-medium">{consultation.birthTime || 'Non renseigné'}</p>
                        </div>
                        <div className="bg-obsidian p-4 rounded-xl border border-obsidian-light">
                          <p className="text-xs text-gray-500 mb-1">Lieu de Naissance</p>
                          <p className="text-white font-medium">{consultation.birthPlace || 'Non renseigné'}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" /> Message Initial
                      </h3>
                      <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light italic text-gray-300">
                        "{consultation.message}"
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> Préférences & Statut
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-obsidian p-4 rounded-xl border border-obsidian-light">
                          <p className="text-xs text-gray-500 mb-1">Date Souhaitée</p>
                          <p className="text-white font-medium">{consultation.preferredDate || 'Dès que possible'}</p>
                        </div>
                        <div className="bg-obsidian p-4 rounded-xl border border-obsidian-light">
                          <p className="text-xs text-gray-500 mb-1">Assigné à</p>
                          <p className="text-white font-medium">{consultation.assigned_to || 'Non assigné'}</p>
                        </div>
                      </div>
                    </section>

                    {consultation.fileUrl && (
                      <section>
                        <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5" /> Document Joint
                        </h3>
                        <a 
                          href={consultation.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-obsidian border border-obsidian-light rounded-xl hover:border-gold transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gold/10 rounded-lg text-gold">
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className="text-sm text-gray-300 group-hover:text-white">Voir le document initial</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gold" />
                        </a>
                      </section>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'messages' && (
              <motion.div 
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-[600px]"
              >
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-obsidian-light scrollbar-track-transparent">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                      <p>Aucun message pour le moment.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMine = msg.sender_id === currentUser?.uid;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          {!isMine && (
                            <span className="text-[10px] uppercase tracking-widest text-gold mb-1 ml-2 font-bold">
                              {msg.sender_role === 'admin' || msg.sender_role === 'editor' || msg.sender_role === 'author' ? 'Expert Sanctum' : 'Utilisateur'}
                            </span>
                          )}
                          <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                            isMine 
                              ? 'bg-gold text-obsidian rounded-tr-none' 
                              : 'bg-obsidian border border-obsidian-light text-gray-200 rounded-tl-none'
                          }`}>
                            {msg.message && <p className="text-sm mb-2">{msg.message}</p>}
                            
                            {msg.file_url && (
                              <div className="mt-3 space-y-2">
                                {msg.file_type === 'image' && (
                                  <div className="relative group/img overflow-hidden rounded-xl border border-black/10 bg-black/5">
                                    <img 
                                      src={msg.file_url} 
                                      alt="Shared" 
                                      className="max-w-full h-auto object-cover transition-transform duration-500 group-hover/img:scale-105" 
                                      referrerPolicy="no-referrer" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                                        <ExternalLink className="w-5 h-5" />
                                      </a>
                                      <a href={msg.file_url} download className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                                        <Download className="w-5 h-5" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {msg.file_type === 'audio' && (
                                  <div className="bg-black/10 p-3 rounded-xl border border-black/5">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="p-2 bg-gold/20 rounded-lg text-gold">
                                        <Mic className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-medium opacity-70">Message Audio</span>
                                    </div>
                                    <audio controls className="w-full h-10 custom-audio">
                                      <source src={msg.file_url} type="audio/mpeg" />
                                      <source src={msg.file_url} type="audio/webm" />
                                      <source src={msg.file_url} type="audio/wav" />
                                      Votre navigateur ne supporte pas la lecture audio.
                                    </audio>
                                  </div>
                                )}
                                {msg.file_type === 'video' && (
                                  <div className="relative rounded-xl overflow-hidden border border-black/10 bg-black shadow-lg aspect-video">
                                    <video 
                                      controls 
                                      playsInline
                                      className="w-full h-full object-contain"
                                      poster={`${msg.file_url}#t=0.1`}
                                    >
                                      <source src={msg.file_url} type="video/mp4" />
                                      <source src={msg.file_url} type="video/webm" />
                                      Votre navigateur ne supporte pas la lecture vidéo.
                                    </video>
                                  </div>
                                )}
                                {msg.file_type === 'document' && (
                                  <div className="space-y-2">
                                    {msg.file_url.toLowerCase().endsWith('.pdf') && (
                                      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-black/10 bg-white/5">
                                        <iframe 
                                          src={`${msg.file_url}#toolbar=0`} 
                                          className="w-full h-full border-none"
                                          title="PDF Preview"
                                        />
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between p-3 bg-black/10 rounded-xl border border-black/5 group/doc">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gold/20 rounded-lg text-gold">
                                          <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-medium truncate max-w-[150px]">Document</span>
                                          <span className="text-[10px] opacity-50">PDF / Fichier</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gold hover:bg-gold/10 rounded-lg transition-colors">
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                        <a href={msg.file_url} download className="p-2 text-gold hover:bg-gold/10 rounded-lg transition-colors">
                                          <Download className="w-4 h-4" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className={`text-[10px] mt-1 text-right opacity-60`}>
                              {msg.created_at ? new Date(msg.created_at.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-obsidian-light bg-obsidian">
                  {/* Media Preview */}
                  {(mediaPreview || uploadPreview) && (
                    <div className="mb-4 p-4 bg-obsidian-lighter rounded-xl border border-gold/30 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {mediaType === 'image' && (
                          <img src={mediaPreview || uploadPreview?.url} className="w-12 h-12 rounded object-cover border border-gold/20" />
                        )}
                        {mediaType === 'audio' && (
                          <div className="p-2 bg-gold/10 rounded-lg text-gold">
                            <Mic className={`w-6 h-6 ${isRecordingAudio ? 'animate-pulse' : ''}`} />
                          </div>
                        )}
                        {mediaType === 'video' && (
                          <div className="p-2 bg-gold/10 rounded-lg text-gold">
                            <Video className={`w-6 h-6 ${isRecordingVideo ? 'animate-pulse' : ''}`} />
                          </div>
                        )}
                        {mediaType === 'document' && (
                          <div className="p-2 bg-gold/10 rounded-lg text-gold">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">
                            {isRecordingAudio ? 'Enregistrement audio...' : 
                             isRecordingVideo ? 'Enregistrement vidéo...' : 
                             'Média prêt à l\'envoi'}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                            {uploadPreview?.name || (mediaType === 'audio' ? 'Audio Recording' : 'Video Recording')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isRecordingAudio && !isRecordingVideo && (
                          <button 
                            onClick={handleSendRecordedMedia} 
                            disabled={sendingMessage}
                            className="p-2 bg-gold text-obsidian rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-gold/20"
                          >
                            {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        )}
                        <button 
                          onClick={() => { 
                            setMediaPreview(null); 
                            setUploadPreview(null);
                            setAudioBlob(null); 
                            setVideoBlob(null); 
                            if (isRecordingAudio) stopAudioRecording();
                            if (isRecordingVideo) stopVideoRecording();
                          }} 
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* URL Input */}
                  {showMediaUrlInput && (
                    <div className="mb-4 flex gap-2">
                      <input 
                        type="url" 
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="Coller l'URL du média (image, audio, vidéo...)"
                        className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-gold"
                      />
                      <button onClick={handleAddUrlMedia} className="px-4 py-2 bg-gold text-obsidian rounded-lg font-bold text-sm">Ajouter</button>
                      <button onClick={() => setShowMediaUrlInput(false)} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex gap-1">
                      <label className="p-2 text-gray-400 hover:text-gold cursor-pointer transition-colors">
                        <Paperclip className="w-5 h-5" />
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                        className={`p-2 transition-colors ${showMediaUrlInput ? 'text-gold' : 'text-gray-400 hover:text-gold'}`}
                      >
                        <LinkIcon className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onMouseDown={startAudioRecording}
                        onMouseUp={stopAudioRecording}
                        onTouchStart={startAudioRecording}
                        onTouchEnd={stopAudioRecording}
                        className={`p-2 transition-colors ${isRecordingAudio ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gold'}`}
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                        className={`p-2 transition-colors ${isRecordingVideo ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gold'}`}
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>

                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrivez un message..."
                      className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold resize-none max-h-32"
                      rows={1}
                    />

                    <button 
                      type="submit"
                      disabled={sendingMessage || !newMessage.trim()}
                      className="p-3 bg-gold text-obsidian rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-all shadow-lg shadow-gold/10"
                    >
                      {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>

                  {isRecordingVideo && (
                    <div className="mt-4 relative rounded-xl overflow-hidden bg-black aspect-video max-w-sm mx-auto">
                      <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 px-2 py-1 rounded text-[10px] font-bold text-white animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full" /> ENREGISTREMENT
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'files' && (
              <motion.div 
                key="files"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-gold" /> Documents partagés
                  </h2>
                  <label className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold text-sm cursor-pointer hover:bg-yellow-400 transition-colors">
                    <Plus className="w-4 h-4" /> Ajouter un fichier
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {files.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-500">
                      Aucun fichier partagé pour le moment.
                    </div>
                  ) : (
                    files.map((file) => (
                      <div key={file.id} className="bg-obsidian rounded-2xl border border-obsidian-light overflow-hidden group hover:border-gold/50 transition-all flex flex-col">
                        {/* Preview Area */}
                        <div className="aspect-video bg-obsidian-lighter relative overflow-hidden flex items-center justify-center">
                          {file.file_type === 'image' && (
                            <img src={file.file_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          {file.file_type === 'video' && (
                            <video className="w-full h-full object-cover">
                              <source src={file.file_url} type="video/mp4" />
                            </video>
                          )}
                          {file.file_type === 'audio' && (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                                <Mic className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-medium text-gray-400">Fichier Audio</span>
                            </div>
                          )}
                          {file.file_type === 'document' && (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                                <FileText className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-medium text-gray-400">Document PDF</span>
                            </div>
                          )}
                          
                          {/* Overlay Actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                              <ExternalLink className="w-5 h-5" />
                            </a>
                            <a href={file.file_url} download className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                              <Download className="w-5 h-5" />
                            </a>
                          </div>
                        </div>

                        {/* Info Area */}
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              file.file_type === 'image' ? 'bg-blue-500/10 text-blue-400' :
                              file.file_type === 'audio' ? 'bg-purple-500/10 text-purple-400' :
                              file.file_type === 'video' ? 'bg-red-500/10 text-red-400' :
                              'bg-gold/10 text-gold'
                            }`}>
                              {file.file_type}
                            </div>
                            {isAuthor && (
                              <button className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-white truncate mb-1">
                            {file.file_name || `Fichier ${file.file_type}`}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Partagé le {new Date(file.created_at?.seconds * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'notes' && isAuthor && (
              <motion.div 
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-gold" /> Notes de suivi (Privé)
                  </h2>
                  <button 
                    onClick={() => setShowAddModal('note')}
                    className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Nouvelle note
                  </button>
                </div>

                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                      Aucune note de suivi pour le moment.
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-obsidian p-6 rounded-xl border border-obsidian-light">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Par un membre de l'équipe</p>
                              <p className="text-[10px] text-gray-500">{new Date(note.created_at?.seconds * 1000).toLocaleString()}</p>
                            </div>
                          </div>
                          <button className="text-gray-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'appointments' && (
              <motion.div 
                key="appointments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-gold" /> Rendez-vous & Sessions
                  </h2>
                  {isAuthor && (
                    <button 
                      onClick={() => setShowAddModal('appointment')}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Planifier une session
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                      Aucun rendez-vous planifié pour le moment.
                    </div>
                  ) : (
                    appointments.map((apt) => (
                      <div key={apt.id} className="bg-obsidian p-6 rounded-xl border border-obsidian-light flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="p-4 bg-gold/10 rounded-xl text-gold flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-xs font-bold uppercase">{new Date(apt.date_time).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                            <span className="text-2xl font-bold">{new Date(apt.date_time).getDate()}</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">{apt.title}</h4>
                            <p className="text-sm text-gray-400 mb-2">{apt.description}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="flex items-center gap-1 text-gold">
                                <Clock className="w-3 h-3" /> {new Date(apt.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <Globe className="w-3 h-3" /> Fuseau horaire local
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="px-6 py-2 bg-gold text-obsidian rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors">
                            Rejoindre
                          </button>
                          {isAuthor && (
                            <button className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                  <History className="w-6 h-6 text-gold" /> Historique de la consultation
                </h2>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gold/50 before:via-gold/20 before:to-transparent">
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Aucun historique disponible pour le moment.
                    </div>
                  ) : (
                    history.map((item, idx) => {
                      const Icon = item.event_type === 'status_change' ? CheckCircle : 
                                   item.event_type === 'note_added' ? FileText :
                                   item.event_type === 'appointment_scheduled' ? Calendar : Plus;
                      
                      return (
                        <div key={item.id} className="relative flex items-center gap-6 group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gold/30 bg-obsidian-lighter text-gold shadow shrink-0 z-10">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 p-4 rounded-xl border border-obsidian-light bg-obsidian shadow hover:border-gold/30 transition-colors">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-white">
                                {item.event_type === 'status_change' && 'Changement de statut'}
                                {item.event_type === 'note_added' && 'Note ajoutée'}
                                {item.event_type === 'appointment_scheduled' && 'Rendez-vous planifié'}
                                {!['status_change', 'note_added', 'appointment_scheduled'].includes(item.event_type) && item.event_type}
                              </div>
                              <time className="font-serif italic text-xs text-gold">
                                {item.created_at?.seconds ? new Date(item.created_at.seconds * 1000).toLocaleDateString() : 'Récemment'}
                              </time>
                            </div>
                            <div className="text-gray-400 text-sm">{item.description}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  {/* Initial creation entry if not in history */}
                  {!history.find(h => h.event_type === 'created') && (
                    <div className="relative flex items-center gap-6 group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gold/30 bg-obsidian-lighter text-gold shadow shrink-0 z-10">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="flex-1 p-4 rounded-xl border border-obsidian-light bg-obsidian shadow">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-white">Consultation créée</div>
                          <time className="font-serif italic text-xs text-gold">
                            {consultation.created_at?.seconds ? new Date(consultation.created_at.seconds * 1000).toLocaleDateString() : ''}
                          </time>
                        </div>
                        <div className="text-gray-400 text-sm">La demande de consultation a été soumise.</div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-obsidian-lighter border border-obsidian-light rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {showAddModal === 'note' && 'Ajouter une note de suivi'}
                {showAddModal === 'appointment' && 'Planifier un rendez-vous'}
              </h3>
              <button onClick={() => setShowAddModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              
              try {
                if (showAddModal === 'note') {
                  const noteText = formData.get('note') as string;
                  await addDoc(collection(db, 'consultation_notes'), {
                    consultation_id: id,
                    note: noteText,
                    created_by: currentUser?.uid,
                    created_at: serverTimestamp()
                  });
                  await logHistory('note_added', `Nouvelle note ajoutée : ${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}`);
                } else if (showAddModal === 'appointment') {
                  const title = formData.get('title') as string;
                  await addDoc(collection(db, 'consultation_appointments'), {
                    consultation_id: id,
                    title,
                    description: formData.get('description'),
                    date_time: formData.get('date_time'),
                    created_by: currentUser?.uid,
                    created_at: serverTimestamp()
                  });
                  await logHistory('appointment_scheduled', `Rendez-vous planifié : ${title}`);
                  
                  // Notify user
                  await addDoc(collection(db, 'notifications'), {
                    userId: consultation.user_id,
                    title: 'Rendez-vous planifié',
                    message: `Un nouveau rendez-vous a été planifié pour votre consultation : ${formData.get('title')}`,
                    type: 'consultation',
                    isRead: false,
                    createdAt: serverTimestamp(),
                    link: `/sanctum-lucis/consultations/${id}`
                  });
                }
                
                setShowAddModal(null);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, 'consultation_content');
              } finally {
                setIsSubmitting(false);
              }
            }} className="space-y-4">
              {showAddModal === 'note' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Note</label>
                  <textarea name="note" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold h-32" />
                </div>
              )}

              {showAddModal === 'appointment' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Titre</label>
                    <input name="title" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <textarea name="description" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold h-20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Date et heure</label>
                    <input name="date_time" type="datetime-local" required className="w-full bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-white outline-none focus:border-gold" />
                  </div>
                </>
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
