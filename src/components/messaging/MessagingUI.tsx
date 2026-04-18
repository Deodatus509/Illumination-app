import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Send, Paperclip, Loader2, UserCircle, Clock, CheckCircle, XCircle, Search, 
  Filter, MessageSquare, Mic, Video, Camera, Download, ExternalLink, 
  FileText, X, Link as LinkIcon 
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { uploadConsultationFile } from '../../lib/storage';
import { MessageItem } from './MessageItem';

interface Conversation {
  id: string;
  type: string;
  created_by: string;
  assigned_to?: string;
  consultation_id?: string;
  created_at: any;
  updated_at: any;
  status: string;
  participants: string[];
  last_message: string;
  last_message_time: any;
  subject?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  file_url?: string;
  file_type?: string;
  created_at: any;
  is_read: boolean;
}

interface MessagingUIProps {
  userRole: 'user' | 'admin' | 'editor' | 'supporteur';
  defaultFilterType?: string;
  initialConsultationId?: string;
}

export function MessagingUI({ userRole, defaultFilterType = 'all', initialConsultationId }: MessagingUIProps) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Media State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{ url: string, type: string, name: string } | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'audio' | 'video' | 'document' | null>(null);
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');

  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>(defaultFilterType);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Interaction State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // New Handlers
  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    document.querySelector('textarea')?.focus();
  };

  const handleForward = (msg: Message) => {
    setSelectedMessage(msg);
    setIsForwardModalOpen(true);
  };

  const handleInfo = (msg: Message) => {
    setSelectedMessage(msg);
    setIsInfoModalOpen(true);
  };

  const sendForward = async (msg: Message, targetConversationId: string) => {
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
  };

  // Handle initial consultation ID
  useEffect(() => {
    if (initialConsultationId && conversations.length > 0 && !selectedConversation) {
      const convo = conversations.find(c => c.consultation_id === initialConsultationId);
      if (convo) {
        setSelectedConversation(convo);
      } else if (userRole === 'user') {
        // If no conversation exists for this consultation, we might want to create one
        // or show a UI to start one. For now, we just wait for the user to send a message.
        // Actually, we can create an empty conversation or just pre-fill the subject.
      }
    }
  }, [initialConsultationId, conversations, selectedConversation, userRole]);

  useEffect(() => {
    if (!currentUser) return;

    let q;
    if (userRole === 'admin' || userRole === 'supporteur') {
      q = query(
        collection(db, 'conversations'),
        orderBy('updated_at', 'desc')
      );
    } else if (userRole === 'editor') {
      q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('updated_at', 'desc')
      );
    } else {
      q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('updated_at', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(convos);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'conversations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('conversation_id', '==', selectedConversation.id),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
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
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { url: string, type: string }) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !mediaData && !selectedConversation || !currentUser) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: selectedConversation!.id,
        sender_id: currentUser.uid,
        message: newMessage,
        reply_to_id: replyingTo?.id || null, // Add this
        file_url: mediaData?.url || null,
        file_type: mediaData?.type || null,
        created_at: serverTimestamp(),
        is_read: false
      });

      setReplyingTo(null); // Reset reply state

      await updateDoc(doc(db, 'conversations', selectedConversation!.id), {
        last_message: newMessage || (mediaData ? `[${mediaData.type}]` : ''),
        last_message_time: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: selectedConversation!.status === 'closed' ? 'open' : selectedConversation!.status
      });

      // If admin/support replies, add them to participants if not already
      if ((userRole === 'admin' || userRole === 'supporteur' || userRole === 'editor') && !selectedConversation.participants.includes(currentUser.uid)) {
        await updateDoc(doc(db, 'conversations', selectedConversation.id), {
          participants: [...selectedConversation.participants, currentUser.uid]
        });
      }

      // Create notifications for other participants
      const otherParticipants = selectedConversation.participants.filter(p => p !== currentUser.uid);
      for (const participantId of otherParticipants) {
        await addDoc(collection(db, 'notifications'), {
          userId: participantId,
          title: 'Nouveau message',
          message: `Vous avez reçu un nouveau message dans la conversation : ${selectedConversation.subject || selectedConversation.type}`,
          type: 'message',
          isRead: false,
          createdAt: serverTimestamp(),
          link: '/dashboard/messages'
        });
      }

      setNewMessage('');
      setMediaPreview(null);
      setUploadPreview(null);
      setMediaType(null);
      setAudioBlob(null);
      setVideoBlob(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setSending(false);
    }
  };

  const handleToggleStatus = async (newStatus: string) => {
    if (!selectedConversation) return;
    try {
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        status: newStatus,
        updated_at: serverTimestamp()
      });
      setSelectedConversation({ ...selectedConversation, status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'conversations');
    }
  };

  const handleFileUpload = async (file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('audio/') ? 'audio' :
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    setSending(true);
    try {
      const { url } = await uploadConsultationFile(file);
      await handleSendMessage(undefined, { url, type });
    } catch (error) {
      console.error('Upload error:', error);
      alert("Erreur lors de l'envoi du fichier.");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('audio/') ? 'audio' :
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    const url = URL.createObjectURL(file);
    setUploadPreview({ url, type, name: file.name });
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
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
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
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
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
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleSendRecordedMedia = async () => {
    const blob = audioBlob || videoBlob;
    if (!blob && !uploadPreview) return;

    if (blob) {
      const file = new File([blob], `${mediaType === 'audio' ? 'audio' : 'video'}_${Date.now()}.webm`, { type: blob.type });
      await handleFileUpload(file);
    } else if (uploadPreview) {
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
    let type: 'image' | 'audio' | 'video' | 'document' = 'document';
    if (mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i)) type = 'image';
    else if (mediaUrl.match(/\.(mp3|wav|ogg)$/i)) type = 'audio';
    else if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) type = 'video';
    await handleSendMessage(undefined, { url: mediaUrl, type });
    setMediaUrl('');
    setShowMediaUrlInput(false);
  };

  const handleMessageAction = async (action: string, msg: Message) => {
    try {
      switch (action) {
        case 'delete':
          if (confirm('Voulez-vous vraiment supprimer ce message ?')) await deleteDoc(doc(db, 'messages', msg.id));
          break;
        case 'edit':
          const newValue = prompt("Modifier le message :", msg.message);
          if (newValue !== null) await updateDoc(doc(db, 'messages', msg.id), { message: newValue });
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

  const filteredConversations = conversations.filter(c => {
    const matchType = filterType === 'all' || c.type === filterType;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchSearch = searchQuery === '' || 
      (c.subject?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.last_message?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchType && matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden shadow-2xl">
      {/* Conversation List */}
      <div className="w-1/3 border-r border-obsidian-light flex flex-col bg-obsidian/50">
        <div className="p-4 border-b border-obsidian-light space-y-4">
          <h2 className="text-lg font-semibold text-gold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-obsidian border border-obsidian-light rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-mystic-purple transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {(userRole === 'admin' || userRole === 'supporteur') && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 bg-obsidian border border-obsidian-light rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-mystic-purple"
              >
                <option value="all">Tous types</option>
                <option value="contact">Contact</option>
                <option value="consultation">Consultation</option>
                <option value="support">Support</option>
              </select>
            )}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 bg-obsidian border border-obsidian-light rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-mystic-purple"
            >
              <option value="all">Tous statuts</option>
              <option value="open">Ouvert</option>
              <option value="pending">En attente</option>
              <option value="closed">Fermé</option>
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-obsidian-light scrollbar-track-transparent">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Aucune conversation trouvée</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-obsidian-light cursor-pointer transition-all duration-200 ${
                  selectedConversation?.id === conv.id 
                    ? 'bg-mystic-purple/10 border-l-2 border-l-mystic-purple-light' 
                    : 'hover:bg-obsidian border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      conv.status === 'open' ? 'bg-green-500' :
                      conv.status === 'closed' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    <span className="font-medium text-gray-200 capitalize text-sm">{conv.type}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {conv.last_message_time?.toDate().toLocaleDateString()}
                  </span>
                </div>
                {conv.subject && <div className="text-sm font-medium text-gold mb-1 truncate">{conv.subject}</div>}
                <div className="text-xs text-gray-400 truncate">{conv.last_message}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-obsidian relative">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-obsidian-light flex justify-between items-center bg-obsidian-lighter/80 backdrop-blur-sm sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-gold capitalize flex items-center gap-2">
                  {selectedConversation.subject || selectedConversation.type}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Créé le {selectedConversation.created_at?.toDate().toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
                  selectedConversation.status === 'open' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  selectedConversation.status === 'closed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>
                  {selectedConversation.status === 'open' ? 'Ouvert' : selectedConversation.status === 'closed' ? 'Fermé' : 'En attente'}
                </span>
                
                {(userRole === 'admin' || userRole === 'supporteur') && (
                  <select
                    value={selectedConversation.status}
                    onChange={(e) => handleToggleStatus(e.target.value)}
                    className="bg-obsidian border border-obsidian-light rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-mystic-purple"
                  >
                    <option value="open">Marquer Ouvert</option>
                    <option value="pending">Marquer En attente</option>
                    <option value="closed">Marquer Fermé</option>
                  </select>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-obsidian-light scrollbar-track-transparent">
              {messages.map((msg, index) => {
                const isMine = msg.sender_id === currentUser?.uid;
                const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                
                return (
                  <MessageItem 
                    key={msg.id} 
                    message={msg} 
                    isOwn={isMine} 
                    userRole={userRole}
                    onAction={handleMessageAction}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-obsidian-light bg-obsidian-lighter/80 backdrop-blur-sm">
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
                      {conversations.filter(c => c.id !== selectedConversation!.id).map(conv => (
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

              {/* Media Preview */}
              {(mediaPreview || uploadPreview) && (
                <div className="mb-4 p-4 bg-obsidian rounded-xl border border-gold/30 flex items-center justify-between">
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
                        disabled={sending}
                        className="p-2 bg-gold text-obsidian rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-gold/20"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                    placeholder="Coller l'URL du média..."
                    className="flex-1 bg-obsidian border border-obsidian-light rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-gold"
                  />
                  <button onClick={handleAddUrlMedia} className="px-4 py-2 bg-gold text-obsidian rounded-lg font-bold text-sm">Ajouter</button>
                  <button onClick={() => setShowMediaUrlInput(false)} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
                </div>
              )}

              {selectedConversation.status === 'closed' && userRole !== 'admin' ? (
                <div className="text-center p-3 bg-obsidian rounded-lg border border-obsidian-light text-gray-400 text-sm">
                  Cette conversation est fermée. Vous ne pouvez plus y répondre.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                  <div className="flex gap-1 mb-1">
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
                  <div className="flex-1 bg-obsidian border border-obsidian-light rounded-2xl overflow-hidden focus-within:border-mystic-purple focus-within:ring-1 focus-within:ring-mystic-purple transition-all">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Écrivez votre message..."
                      className="w-full bg-transparent px-4 py-3 text-sm text-gray-200 focus:outline-none resize-none max-h-32 min-h-[44px]"
                      rows={1}
                      disabled={sending || (selectedConversation.status === 'closed' && userRole !== 'admin')}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !uploadPreview) || sending || (selectedConversation.status === 'closed' && userRole !== 'admin')}
                    className="p-3 bg-mystic-purple text-white rounded-xl hover:bg-mystic-purple-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-mystic-purple/20 flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              )}

              {isRecordingVideo && (
                <div className="mt-4 relative rounded-xl overflow-hidden bg-black aspect-video max-w-sm mx-auto">
                  <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 px-2 py-1 rounded text-[10px] font-bold text-white animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" /> ENREGISTREMENT
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <div className="w-20 h-20 bg-obsidian-light rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">Messagerie</h3>
            <p className="max-w-md">
              Sélectionnez une conversation dans la liste de gauche pour afficher les messages ou répondre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
