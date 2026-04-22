import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, deleteDoc, updateDoc, limit, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowLeft, Users, Calendar, Video, FileText, MessageSquare, Headphones, Play, Send, Plus, Trash2, ExternalLink, Clock, Info, BookOpen, X, Paperclip, Mic, MicOff, Camera, CameraOff, Download, Link as LinkIcon, CheckCircle, History, Globe, MoreVertical, Activity, Monitor, Layout, Shield, HelpCircle, Share, LogOut, Settings, Pin, RefreshCcw, Edit2, Hand, Check } from 'lucide-react';
import { uploadMeditationFile } from '../lib/storage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { MessageItem } from '../components/messaging/MessageItem';
import { LiveStream } from '../components/LiveStream';
import { AudioVisualizer } from '../components/messaging/AudioVisualizer';
import { MemberItem } from '../components/messaging/MemberItem';
import { FullPageOverlay } from '../components/messaging/FullPageOverlay';

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
  const [editingLiveSession, setEditingLiveSession] = useState<any>(null);
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const cancelAudioRef = React.useRef(false);
  const audioStreamRef = React.useRef<MediaStream | null>(null);

  // Live Broadcasting States
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStream, setBroadcastStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [activeScheduleMenu, setActiveScheduleMenu] = useState<string | null>(null);
  const broadcastPreviewRef = React.useRef<HTMLVideoElement>(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Interactions (Reactions & Q&A)
  const [floatingReactions, setFloatingReactions] = useState<{id: string, emoji: string}[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  const activeLive = liveSessions.find(s => {
    if (s.is_active === false || s.ended_at) return false;
    if (!s.start_time) return false;
    const startTime = new Date(s.start_time).getTime();
    const now = new Date().getTime();
    return startTime <= now && startTime + 3600000 > now;
  });

  const canManage = userProfile?.role === 'admin' || userProfile?.role === 'editor' || userProfile?.role === 'author';

  const [showLiveControls, setShowLiveControls] = useState(true);
  const [livePresence, setLivePresence] = useState<any[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<{id: string, message: string}[]>([]);
  const [liveDuration, setLiveDuration] = useState('00:00');
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [participationRequests, setParticipationRequests] = useState<any[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  useEffect(() => {
    if (!activeLive?.id) return;
    const unsub = onSnapshot(collection(db, 'meditation_live_sessions', activeLive.id, 'participation_requests'), (snap) => {
      setParticipationRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [activeLive?.id]);

  useEffect(() => {
    if (activeTab !== 'live') return;
    
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setShowLiveControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowLiveControls(false), 3000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    
    resetTimer();
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearTimeout(timeout);
    }
  }, [activeTab]);

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

    const currentTopicId = activeTab === 'live' ? `live_${conversation.id}` : conversation.id;

    const unsubMessages = onSnapshot(
      query(collection(db, 'meditation_messages'), where('conversation_id', '==', currentTopicId), orderBy('created_at', 'desc')),
      (snap) => setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, 'meditation_messages')
    );

    return () => unsubMessages();
  }, [conversation?.id, activeTab]);

  useEffect(() => {
    if (!activeLive?.id) return;
    
    // Uniquement les nouvelles réactions pour la session active
    const q = query(
      collection(db, 'meditation_live_sessions', activeLive.id, 'reactions'),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Evite de re-montrer nos propres réactions si on les a déjà affichées localement
          if (data.created_by !== currentUser?.uid) {
            const tempId = change.doc.id;
            setFloatingReactions(prev => [...prev, { id: tempId, emoji: data.emoji }]);
            setTimeout(() => {
              setFloatingReactions(prev => prev.filter(r => r.id !== tempId));
            }, 3500);
          }
        }
      });
    });

    return () => unsub();
  }, [activeLive?.id, currentUser?.uid]);

  useEffect(() => {
    if (activeTab === 'live' && activeLive?.id && currentUser) {
      const presenceRef = doc(db, 'meditation_live_sessions', activeLive.id, 'presence', currentUser.uid);
      
      const setPresence = async () => {
        try {
          // Utilisation de setDoc. Attention aux permissions, si non configurées pour 'presence', 
          // ça risque d'échouer silencieusement si on catch. On rajoute dans les rules plus tard si besoin, 
          // ou on accepte l'erreur silencieuse.
          await updateDoc(presenceRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Utilisateur',
            joined_at: serverTimestamp()
          }).catch(async () => {
             // Si ça n'existe pas, on tente de le créer (sauf si permissions l'interdisent, pour le moment pas de sous-collection dans rules)
             try {
                // To avoid rule errors for now, we'll just not enforce it strictly or we update rules 
                // Wait, meditation_live_sessions read/write is authenticated/author. 
                // But members want to write. 
             } catch(e) {}
          });
        } catch(e) {}
      };
      
      // Since rules for meditation_live_sessions allow read: isAuthenticated, write: isAuthor
      // Members cannot write to presence subcollection currently! Wait, we must update firestore rules to allow this.
      // I will update firestore rules next.

      setDoc(presenceRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Utilisateur',
        joined_at: serverTimestamp()
      }).catch(e => console.log('presence set err', e));

      const q = query(collection(db, 'meditation_live_sessions', activeLive.id, 'presence'));
      const unsub = onSnapshot(q, (snap) => {
        setLivePresence(snap.docs.map(d => d.data()));
        
        snap.docChanges().forEach(change => {
            if (change.type === 'added' && change.doc.id !== currentUser.uid) {
                const data = change.doc.data();
                const notifId = `notif_${Date.now()}_${Math.random()}`;
                setLiveNotifications(prev => [...prev, { id: notifId, message: `${data.displayName} a rejoint le Live` }]);
                setTimeout(() => {
                    setLiveNotifications(prev => prev.filter(n => n.id !== notifId));
                }, 3000);
            }
        });
      }, (e) => console.log('presence snap err', e));

      return () => {
        unsub();
        deleteDoc(presenceRef).catch(() => {});
      };
    } else {
      setLivePresence([]);
    }
  }, [activeTab, activeLive?.id, currentUser]);

  useEffect(() => {
    if (activeTab === 'live' && activeLive) {
       const interval = setInterval(() => {
         let diff = 0;
         if (activeLive.started_at) {
            diff = Date.now() - (activeLive.started_at.seconds ? activeLive.started_at.toDate().getTime() : Date.now());
         } else {
            diff = Date.now() - new Date(activeLive.start_time).getTime();
         }
         if (diff < 0) diff = 0;
         const hours = Math.floor(diff / 3600000);
         const minutes = Math.floor((diff % 3600000) / 60000);
         const seconds = Math.floor((diff % 60000) / 1000);
         if (hours > 0) {
             setLiveDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
         } else {
             setLiveDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
         }
       }, 1000);
       return () => clearInterval(interval);
    }
  }, [activeTab, activeLive]);

  useEffect(() => {
    return () => {
      if (broadcastStream) {
        broadcastStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [broadcastStream]);

  useEffect(() => {
    if (isBroadcasting && broadcastStream && broadcastPreviewRef.current) {
      broadcastPreviewRef.current.srcObject = broadcastStream;
    }
  }, [isBroadcasting, broadcastStream, activeTab]);

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
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) input.focus();
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
        case 'pin':
          try {
            const newPinnedState = !msg.isPinned;
            await updateDoc(doc(db, 'meditation_messages', msg.id), { isPinned: newPinnedState });
          } catch(e) {
            console.error('Erreur épinglage:', e);
          }
          break;
        case 'ban':
          if (confirm(`Voulez-vous vraiment bannir l'utilisateur ?`)) {
            alert('Utilisateur banni (simulation temporelle).');
            // Logique de bannissement ici (ajouter une blacklist dans Firestore, etc.)
          }
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
      const currentTopicId = activeTab === 'live' ? `live_${conversation.id}` : conversation.id;
      const messageData = {
        conversation_id: currentTopicId,
        sender_id: currentUser.uid,
        userName: currentUser.displayName || 'Utilisateur',
        message: newMessage,
        type: liveInteractionTab === 'qa' ? 'question' : 'text',
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
      
      const currentTopicId = activeTab === 'live' ? `live_${conversation.id}` : conversation.id;
      await addDoc(collection(db, 'meditation_messages'), {
        conversation_id: currentTopicId,
        sender_id: currentUser.uid,
        userName: currentUser.displayName || 'Utilisateur',
        message: '',
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

  useEffect(() => {
    if (!currentUser || !activeLive?.id) return;
    const myRequest = participationRequests.find(r => r.id === currentUser.uid);
    if (!canManage && myRequest?.status === 'accepted' && !isBroadcasting) {
       // Host accepted! Automatically turn on camera
       startBroadcast();
    }
  }, [participationRequests, currentUser, canManage, activeLive?.id, isBroadcasting]);

  const requestParticipation = async () => {
    if (!currentUser || !activeLive?.id) return;
    try {
      await setDoc(doc(db, 'meditation_live_sessions', activeLive.id, 'participation_requests', currentUser.uid), {
        name: currentUser.displayName || 'Spectateur',
        status: 'pending',
        created_at: serverTimestamp()
      });
      alert("Votre demande de participation a été envoyée au Guide.");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi de la demande.");
    }
  };

  const acceptRequest = async (userId: string) => {
    if (!activeLive?.id) return;
    try {
      await updateDoc(doc(db, 'meditation_live_sessions', activeLive.id, 'participation_requests', userId), {
        status: 'accepted'
      });
      setShowRequestsModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const rejectRequest = async (userId: string) => {
    if (!activeLive?.id) return;
    try {
      await deleteDoc(doc(db, 'meditation_live_sessions', activeLive.id, 'participation_requests', userId));
    } catch (e) {
      console.error(e);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      cancelAudioRef.current = false;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        if (!cancelAudioRef.current) {
          const blob = new Blob(chunks, { type: mimeType });
          const extension = mimeType.split('/')[1].split(';')[0];
          const file = new File([blob], `vocal_meditation_${Date.now()}.${extension}`, { type: mimeType });
          await handleFileUpload(file);
        }
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      };

      recorder.start();
      setAudioRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      alert("Impossible d'accéder au micro.");
    }
  };

  const sendAudioRecording = () => {
    if (audioRecorder && isRecordingAudio) {
      cancelAudioRef.current = false;
      audioRecorder.stop();
      setIsRecordingAudio(false);
      setAudioRecorder(null);
    }
  };

  const cancelAudioRecording = () => {
    if (audioRecorder && isRecordingAudio) {
      cancelAudioRef.current = true;
      audioRecorder.stop();
      setIsRecordingAudio(false);
      setAudioRecorder(null);
    }
  };

  const stopAudioRecording = () => {
    sendAudioRecording(); // fallback/legacy mapping
  };

  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: facingMode } }, 
        audio: true 
      });
      setBroadcastStream(stream);
      setIsBroadcasting(true);
      if (broadcastPreviewRef.current) {
        broadcastPreviewRef.current.srcObject = stream;
      }
      
      // Update start time if first time
      if (activeLive && !activeLive.started_at) {
        await updateDoc(doc(db, 'meditation_live_sessions', activeLive.id), { started_at: serverTimestamp() });
      }

      // Log to history
      await logHistory('live_started', 'A démarré une session Live');
    } catch (error) {
      console.error("Error starting broadcast:", error);
      alert("Impossible d'accéder à la caméra ou au micro. Vérifiez les permissions de votre navigateur.");
    }
  };

  const switchCamera = async () => {
    // Disabled in favor of LiveKit SDK controls
  };

  const stopBroadcast = async () => {
    if (broadcastStream) {
      broadcastStream.getTracks().forEach(track => track.stop());
      setBroadcastStream(null);
    }
    
    if (activeLive && activeLive.id) {
        try {
            await updateDoc(doc(db, 'meditation_live_sessions', activeLive.id), {
                ended_at: serverTimestamp(),
                is_active: false
            });
        } catch (e) {
            console.error("Error updating live session:", e);
        }
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

  const handleEditLiveSession = (session: any) => {
    setEditingLiveSession(session);
    setShowAddModal('live');
  };

  const handleDeleteLiveSession = async (sessionId: string) => {
    if (!canManage) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette session programmée ?")) return;
    
    try {
      await deleteDoc(doc(db, 'meditation_live_sessions', sessionId));
      logHistory('live_deleted', 'A supprimé une session programmée');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'meditation_live_sessions');
    }
  };

  const handleSendReaction = async (emoji: string) => {
    if (!activeLive?.id) return;
    
    // Ajout local immédiat pour ressentir la réaction
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    setFloatingReactions(prev => [...prev, { id: tempId, emoji }]);
    
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== tempId));
    }, 3500);

    // Envoi asynchrone Firestore
    try {
      await addDoc(collection(db, 'meditation_live_sessions', activeLive.id, 'reactions'), {
        emoji,
        created_by: currentUser?.uid || 'anon',
        created_at: serverTimestamp()
      });
    } catch (e) {
      console.error("Error sending reaction:", e);
    }
  };

  const [liveInteractionTab, setLiveInteractionTab] = useState<'chat' | 'qa' | 'schedule'>('chat');

  if (loading) {
    return <div className="min-h-screen bg-obsidian flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
  }

  if (!meditationClass) return null;

    if (activeTab === 'chat') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c0c0e] flex flex-col font-sans h-[100dvh] overflow-hidden text-zinc-200">
        <div className="flex-none h-16 px-4 md:px-6 bg-[#050505] border-b border-white/5 flex items-center justify-between">
          <button onClick={() => setActiveTab('overview')} className="text-zinc-400 hover:text-white transition-colors flex items-center">
            <ArrowLeft className="w-5 h-5 mr-3" />
            <span className="hidden sm:inline font-bold uppercase tracking-widest text-[11px]">Quitter</span>
          </button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gold" /> Messagerie Collective
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{members.length} membres actifs</p>
          </div>

          <button className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
            <Info className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col-reverse space-y-4 space-y-reverse bg-[#08080a] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 py-20 flex flex-col items-center gap-3 w-full my-auto">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                <MessageSquare className="w-8 h-8 opacity-40 text-gold" />
              </div>
              <p className="font-serif italic text-lg tracking-wide">L'espace d'échange est ouvert</p>
              <p className="text-xs uppercase tracking-widest font-bold opacity-60">Soyez le premier à partager une pensée</p>
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

        <div className="flex-none p-3 md:p-4 border-t border-white/5 bg-[#0a0a0c]">
          <div className="max-w-4xl mx-auto w-full">
            {showMediaUrlInput && (
              <div className="mb-3 flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-white/10 animate-in slide-in-from-bottom-2">
                <LinkIcon className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Coller l'URL d'une image..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
                <button onClick={() => setShowMediaUrlInput(false)} className="p-1 hover:bg-white/5 rounded-full text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {replyingTo && !isRecordingAudio && (
              <div className="flex items-center justify-between bg-zinc-900/80 border-l-2 border-yellow-500/50 p-2 md:p-3 mb-2 rounded-r-xl">
                <div className="overflow-hidden">
                  <p className="text-[10px] uppercase tracking-widest text-yellow-500/80 font-bold mb-1">En réponse à</p>
                  <p className="text-sm text-zinc-300 truncate max-w-[250px] md:max-w-md">{replyingTo.message}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-white/5 rounded-full rounded-full transition-colors">
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>
            )}

            {isRecordingAudio && audioStreamRef.current ? (
              <AudioVisualizer 
                stream={audioStreamRef.current} 
                onCancel={cancelAudioRecording} 
                onSend={sendAudioRecording} 
              />
            ) : (
              <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-1 justify-between sm:justify-start">
                  <div className="flex gap-1">
                    <label className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-zinc-400 cursor-pointer transition-colors" title="Joindre un fichier">
                      <Paperclip className="w-5 h-5" />
                      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    </label>
                    <button 
                      type="button"
                      onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                      className={`w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors ${showMediaUrlInput ? 'text-white bg-white/10' : 'text-zinc-400'}`}
                      title="Ajouter une URL"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-1 border-l border-white/5 pl-1 sm:ml-1">
                    <button 
                      type="button"
                      onClick={startAudioRecording}
                      className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-zinc-400 transition-colors"
                      title="Vocal"
                      disabled={isRecordingAudio}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={startVideoRecording}
                      className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-zinc-400 transition-colors"
                      title="Vidéo"
                      disabled={isRecordingVideo}
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Votre message..."
                    className="flex-1 bg-white/5 border border-white/5 rounded-full px-5 py-3 text-white focus:border-yellow-500/30 focus:bg-white/10 outline-none text-sm placeholder:text-zinc-600 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={sendingMessage || (!newMessage.trim() && !mediaUrl)}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 transition-all shadow-xl active:scale-95"
                  >
                    {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'live') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans h-[100dvh] overflow-hidden text-zinc-200">
        
        {/* HEADER */}
        <div className="flex-none h-16 px-4 md:px-6 bg-[#050505] border-b border-white/5 flex items-center justify-between">
          <button onClick={() => setActiveTab('overview')} className="text-zinc-400 hover:text-white transition-colors flex items-center">
            <ArrowLeft className="w-5 h-5 mr-3" />
            <span className="hidden sm:inline font-bold uppercase tracking-widest text-[11px]">Quitter</span>
          </button>

          <div className="flex items-center gap-4">
            {(isBroadcasting || (activeLive && activeLive.started_at)) ? (
              <div className="flex items-center gap-3 bg-red-600/10 border border-red-500/20 px-4 py-1.5 rounded-full">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Live</span>
                <span className="text-[11px] text-white/50 border-l border-white/10 pl-3 font-bold font-mono">{liveDuration}</span>
                <button 
                  onClick={() => setShowPresenceModal(true)}
                  className="text-[11px] text-white/80 hover:text-white border-l border-white/10 pl-3 flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                  title="Voir les personnes actives"
                >
                  <Users size={12}/> {livePresence.length}
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">Studio Fermé</span>
            )}
          </div>

          <div>
             {canManage && !isBroadcasting && (
               <button onClick={() => setShowAddModal('live')} className="px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl text-[11px] uppercase tracking-widest font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                 <Plus size={14} /> <span className="hidden sm:inline">Programmer</span>
               </button>
             )}
          </div>
        </div>

        {/* MAIN STUDIO AREA */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          
          {/* LEFT: PLAYER STAGE */}
          <div className="flex-[3] relative flex flex-col bg-black min-h-0 lg:border-r border-white/5 group">
            
            {/* The Video Canvas */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
               {activeLive ? (
                  <LiveStream roomName={activeLive.id} userName={currentUser?.displayName || 'Spectateur'} />
               ) : (
                  <div className="text-center text-zinc-600">
                    <Video className="w-24 h-24 mx-auto mb-6 opacity-20" />
                    <p className="font-serif italic text-2xl tracking-wide">Le Sanctuaire est fermé</p>
                  </div>
               )}

               {/* Video Overlay Info (Top Left & Network) */}
               {(isBroadcasting || activeLive) && (
                 <div className={`absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 z-20 flex justify-between items-start pointer-events-none transition-all duration-500 ${showLiveControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="flex flex-col gap-2">
                      <div className="bg-black/40 backdrop-blur-md px-4 py-2.5 md:px-5 md:py-3 rounded-2xl md:rounded-[1.25rem] border border-white/10 shadow-2xl flex flex-col items-start bg-gradient-to-br from-black/80 to-transparent">
                         <h2 className="text-base md:text-xl font-serif text-white drop-shadow-md max-w-[150px] sm:max-w-[200px] md:max-w-sm truncate">{activeLive?.title || "Session en direct"}</h2>
                         <p className="text-[9px] md:text-[10px] text-yellow-500/80 mt-1 tracking-widest uppercase font-bold truncate max-w-[150px] md:max-w-[250px]">
                           Animée par {isBroadcasting ? (userProfile?.displayName || "Le Guide") : (activeLive?.created_by_name || "Le Guide")}
                         </p>
                      </div>
                      
                      {/* Notifications UI */}
                      <AnimatePresence>
                        {liveNotifications.map(notif => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className="bg-zinc-900/80 backdrop-blur-md text-[10px] text-white/90 border border-white/10 py-1.5 px-3 rounded-full font-medium inline-flex self-start"
                          >
                            {notif.message}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-2xl">
                       <Activity size={12} className="text-green-500" />
                       <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">Connecté</span>
                    </div>
                 </div>
               )}

               {/* Camera off placeholder */}
               {isVideoOff && isBroadcasting && (
                 <div className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center z-10 transition-all">
                    <CameraOff className="w-24 h-24 text-zinc-800 mb-6" />
                    <p className="font-serif text-white/30 text-2xl italic tracking-wide">Flux visuel coupé</p>
                 </div>
               )}

               {/* Floating Reactions Canvas */}
                <div className="absolute inset-x-0 bottom-24 top-0 pointer-events-none z-30 overflow-hidden">
                  {floatingReactions.map((reaction) => (
                    <motion.div
                      key={reaction.id}
                      initial={{ opacity: 0, y: 100, x: 0, scale: 0.5 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: -400 - Math.random() * 200,
                        x: (Math.random() - 0.5) * 150,
                        scale: [0.5, 1.8, 1.3, 1]
                      }}
                      transition={{ duration: 4 + Math.random() * 2, ease: 'easeOut' }}
                      className="absolute bottom-10 right-[15%] lg:right-[20%] text-5xl lg:text-6xl drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                    >
                      {reaction.emoji}
                    </motion.div>
                  ))}
                </div>
            </div>

            {/* FLOATING CONTROLS PANEL */}
            <div className={`absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 md:gap-4 bg-[#111]/80 hover:bg-[#111]/90 backdrop-blur-2xl border border-white/10 p-2 md:p-3 rounded-[2rem] transition-all z-40 shadow-[0_30px_60px_rgba(0,0,0,0.6)] duration-500 ${showLiveControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              
              {canManage && activeLive && !isBroadcasting ? (
                 <button onClick={startBroadcast} className="bg-white hover:bg-zinc-200 text-black px-6 py-3.5 md:py-4 rounded-[1.5rem] font-bold text-[11px] tracking-widest uppercase transition-all shadow-xl flex items-center gap-3">
                    <Video size={18} /> Diffuser le signal
                 </button>
              ) : isBroadcasting ? (
                 <>
                   <button onClick={toggleMute} className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10'}`}>
                     {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                   </button>
                   <button onClick={toggleVideo} className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10'}`}>
                     {isVideoOff ? <CameraOff size={22} /> : <Video size={22} />}
                   </button>
                   <button onClick={switchCamera} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10" title="Basculer la caméra">
                     <RefreshCcw size={20} />
                   </button>
                   <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Lien copié dans le presse-papiers !"); }} className="hidden sm:flex w-12 h-12 md:w-14 md:h-14 items-center justify-center rounded-full transition-all bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10" title="Partager">
                     <Share size={20} />
                   </button>
                   <div className="w-px h-8 bg-white/10 mx-1 md:mx-2" />
                   <button onClick={stopBroadcast} className="bg-red-600 hover:bg-red-500 text-white w-12 h-12 md:w-auto md:px-6 md:py-4 rounded-full md:rounded-[1.5rem] font-bold text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                     <LogOut size={20} className="md:hidden" />
                     <span className="hidden md:inline">Terminer</span>
                   </button>
                 </>
              ) : !canManage && activeLive ? (
                 <>
                   <button className="bg-zinc-800 text-zinc-500 px-6 py-3.5 md:py-4 rounded-[1.5rem] font-bold text-[11px] tracking-widest uppercase transition-all flex items-center gap-3 cursor-not-allowed border border-white/5">
                      <Activity size={18} /> Signal distant
                   </button>
                   <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Lien copié dans le presse-papiers !"); }} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/10" title="Partager">
                     <Share size={20} />
                   </button>
                 </>
              ) : null}

              {/* Interaction for Spectators & Hosts */}
              {activeLive && !canManage && (
                <button 
                  onClick={requestParticipation} 
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all ml-1 border ${participationRequests.find(r => r.id === currentUser?.uid)?.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' : 'bg-white/5 text-white hover:bg-white/10 border-transparent hover:border-white/10'}`} 
                  title={participationRequests.find(r => r.id === currentUser?.uid)?.status === 'pending' ? "Demande en attente" : "Demander à participer au Live"}
                >
                  <Hand className="w-6 h-6" />
                </button>
              )}

              {activeLive && canManage && (
                <div className="relative ml-1">
                  <button 
                    onClick={() => setShowRequestsModal(true)} 
                    className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all" 
                    title="Demandes de participation"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  {participationRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg animate-pulse">
                      {participationRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT/BOTTOM: CHAT & INTERACTION AREA */}
          <div className="flex-[2] lg:max-w-[400px] xl:max-w-[450px] flex-none h-[50vh] lg:h-full flex flex-col bg-[#050505] z-40 border-t lg:border-t-0 border-white/5 relative">
             
             {/* Tab Bar */}
             <div className="flex border-b border-white/5 bg-[#080808]">
                {[
                  { id: 'chat', label: 'Chat' },
                  { id: 'qa', label: 'Q&A' },
                  { id: 'schedule', label: 'A venir' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLiveInteractionTab(tab.id as 'chat' | 'qa' | 'schedule')}
                    className={`flex-1 py-4.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      liveInteractionTab === tab.id ? 'text-yellow-500 border-b-2 border-yellow-500 bg-white/[0.02]' : 'text-zinc-500 hover:text-white hover:bg-white/[0.02] border-b-2 border-transparent'
                    }`}
                  >
                    {tab.id === 'qa' && <HelpCircle size={14} className={liveInteractionTab === 'qa' ? 'text-yellow-500' : 'text-zinc-600'} />}
                    {tab.label}
                  </button>
                ))}
             </div>

             {/* Dynamic Content */}
             <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar-hide flex flex-col-reverse bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat opacity-95">
               {liveInteractionTab === 'chat' && (
                 <>
                   {/* Pinned Messages Area */}
                   {messages.filter(m => m.type !== 'question' && m.isPinned).length > 0 && (
                     <div className="mb-4 bg-yellow-500/10 border-b border-yellow-500/20 p-3 rounded-lg space-y-2 order-last">
                       <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-bold uppercase tracking-widest"><Pin className="w-3 h-3" /> Message épinglé</div>
                       {messages.filter(m => m.type !== 'question' && m.isPinned).map((msg) => (
                         <div key={`pinned-${msg.id}`} className="bg-[#111113] p-3 rounded-lg border border-yellow-500/30">
                            <span className="text-yellow-500 text-[11px] font-bold">{msg.userName || "Guide"}</span>
                            <p className="text-white text-xs mt-1">{msg.message}</p>
                         </div>
                       ))}
                     </div>
                   )}
                   {messages.filter(m => m.type !== 'question').length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center pb-12 opacity-50">
                       <MessageSquare className="w-16 h-16 text-zinc-800 mb-6" />
                       <p className="text-zinc-500 font-serif text-lg tracking-wide italic">Le Sanctuaire est silencieux.</p>
                     </div>
                   ) : (
                     <div className="space-y-6 flex flex-col-reverse">
                       {messages.filter(m => m.type !== 'question').map((msg) => (
                         <MessageItem 
                           key={msg.id} 
                           message={msg as any} 
                           isOwn={msg.sender_id === currentUser?.uid} 
                           userRole={userProfile?.role || 'user'}
                           onAction={handleMessageAction}
                           isLiveChat={true}
                         />
                       ))}
                     </div>
                   )}
                 </>
               )}

               {liveInteractionTab === 'qa' && (
                 <>
                   {messages.filter(m => m.type === 'question').length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center pb-10 opacity-50">
                        <HelpCircle className="w-16 h-16 text-zinc-800 mb-6" />
                        <h3 className="font-serif text-2xl text-white mb-2 tracking-wide">Q&A</h3>
                        <p className="text-zinc-500 text-sm max-w-[250px] font-medium leading-relaxed">Posez vos questions à l'Animateur. Les réponses de valeur seront traitées en live.</p>
                     </div>
                   ) : (
                     messages.filter(m => m.type === 'question').map((msg) => {
                       const timeString = msg.created_at?.toDate 
                         ? new Date(msg.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                         : '';
                       return (
                         <div key={msg.id} className="flex flex-col items-start space-y-3 mt-6 bg-yellow-500/5 p-6 rounded-[1.5rem] border border-yellow-500/20 relative backdrop-blur-md group">
                           <HelpCircle className="absolute top-6 right-6 w-6 h-6 text-yellow-500/20 group-hover:text-yellow-500/40 transition-colors" />
                           <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">{msg.userName}</span>
                           <p className="text-base text-zinc-100 font-medium leading-relaxed pr-8">{msg.message}</p>
                           {timeString && <span className="block text-[9px] text-yellow-500/50 mt-2 text-right w-full font-bold">{timeString}</span>}
                         </div>
                       );
                     })
                   )}
                 </>
               )}

               {liveInteractionTab === 'schedule' && (
                 <div className="flex flex-col gap-4 py-2" onClick={() => setActiveScheduleMenu(null)}>
                    {liveSessions.map(session => (
                      <div key={session.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-5 items-center hover:bg-white/10 transition-colors group cursor-pointer relative overflow-visible">
                         <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden flex-none relative">
                            <img src={session.image_url || 'https://images.unsplash.com/photo-1507676184212-d0330a1c5068?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/20" />
                         </div>
                         <div className="flex-1 pr-6">
                            <h4 className="text-white font-serif text-lg leading-tight mb-2 pr-4">{session.title}</h4>
                            <div className="flex items-center gap-2 text-yellow-500">
                               <Calendar size={12} />
                               <p className="text-[10px] uppercase tracking-widest font-bold">
                                 {new Date(session.start_time).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                               </p>
                            </div>
                         </div>

                         {canManage && (
                           <div className="absolute top-4 right-4 z-10">
                             <button
                               onClick={(e) => { e.stopPropagation(); setActiveScheduleMenu(activeScheduleMenu === session.id ? null : session.id); }}
                               className="p-1 text-zinc-400 hover:text-white rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                             >
                               <MoreVertical size={16} />
                             </button>
                             
                             <AnimatePresence>
                               {activeScheduleMenu === session.id && (
                                 <motion.div 
                                   initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                   className="absolute right-0 top-full mt-2 w-48 bg-[#161616] border border-white/10 shadow-2xl rounded-xl overflow-hidden py-1"
                                 >
                                   <button 
                                     onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setActiveScheduleMenu(null);
                                       setEditingLiveSession(session);
                                       setShowAddModal('live');
                                     }}
                                     className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                   >
                                     <Edit2 size={14} /> Modifier
                                   </button>
                                   <button 
                                     onClick={(e) => { 
                                       e.stopPropagation(); 
                                       setActiveScheduleMenu(null);
                                       handleDeleteContent('meditation_live_sessions', session.id); 
                                     }}
                                     className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                   >
                                     <Trash2 size={14} /> Supprimer
                                   </button>
                                 </motion.div>
                               )}
                             </AnimatePresence>
                           </div>
                         )}
                      </div>
                    ))}
                    {liveSessions.length === 0 && (
                      <p className="text-zinc-500 text-center text-sm font-serif italic py-8">Aucune session programmée</p>
                    )}
                 </div>
               )}
             </div>

             {/* INPUT AREA (Reactions & Text Box) */}
             {(liveInteractionTab === 'chat' || liveInteractionTab === 'qa') && (
               <div className="p-4 md:p-6 bg-[#050505] border-t border-white/5 flex flex-col gap-4 relative z-50">
                 
                 {/* Reaction Bar */}
                 {activeLive && (
                   <div className="flex items-center justify-end gap-2 px-1">
                     {['❤️', '👏', '🔥', '✨'].map(emoji => (
                       <button
                         key={emoji}
                         onClick={() => handleSendReaction(emoji)}
                         type="button"
                         className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 hover:bg-yellow-500/20 hover:border-yellow-500/50 active:scale-90 transition-all flex items-center justify-center text-lg md:text-xl shadow-lg"
                       >
                         {emoji}
                       </button>
                     ))}
                   </div>
                 )}

                 {/* Text Input Block */}
                 <div className="flex flex-col gap-3">
                   {showMediaUrlInput && (
                     <div className="mb-2 flex items-center gap-2 bg-white/5 p-2 rounded-[1rem] border border-white/10 animate-in slide-in-from-bottom-2">
                       <LinkIcon className="w-4 h-4 text-zinc-400" />
                       <input
                         type="text"
                         placeholder="URL du média..."
                         className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white"
                         value={mediaUrl}
                         onChange={(e) => setMediaUrl(e.target.value)}
                       />
                       <button onClick={() => setShowMediaUrlInput(false)} className="p-1 hover:bg-white/10 rounded-full text-gray-400">
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   )}

                   {replyingTo && !isRecordingAudio && (
                     <div className="flex items-center justify-between text-left bg-zinc-900/80 border-l-2 border-yellow-500/50 p-2 md:p-3 rounded-r-xl">
                       <div className="overflow-hidden">
                         <p className="text-[10px] uppercase tracking-widest text-yellow-500/80 font-bold mb-1">En réponse à</p>
                         <p className="text-sm text-zinc-300 truncate max-w-[250px] md:max-w-xs">{replyingTo.message}</p>
                       </div>
                       <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                         <X size={16} className="text-zinc-500" />
                       </button>
                     </div>
                   )}

                   {isRecordingAudio && audioStreamRef.current ? (
                     <AudioVisualizer 
                       stream={audioStreamRef.current} 
                       onCancel={cancelAudioRecording} 
                       onSend={sendAudioRecording} 
                     />
                   ) : (
                     <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                       <div className="flex items-center gap-1 justify-between">
                         <div className="flex gap-1">
                           <label className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full text-zinc-400 cursor-pointer transition-colors" title="Joindre un fichier">
                             <Paperclip className="w-4 h-4" />
                             <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                           </label>
                           <button 
                             type="button"
                             onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                             className={`w-9 h-9 flex items-center justify-center border transition-colors rounded-full ${showMediaUrlInput ? 'text-white bg-white/10 border-white/20' : 'text-zinc-400 bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
                             title="Ajouter une URL"
                           >
                             <LinkIcon className="w-4 h-4" />
                           </button>
                         </div>
                         <div className="flex gap-1">
                           <button 
                             type="button"
                             onClick={startAudioRecording}
                             className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full text-zinc-400 transition-colors"
                             title="Vocal"
                             disabled={isRecordingAudio}
                           >
                             <Mic className="w-4 h-4" />
                           </button>
                           <button 
                             type="button"
                             onClick={startVideoRecording}
                             className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full text-zinc-400 transition-colors"
                             title="Vidéo"
                             disabled={isRecordingVideo}
                           >
                             <Camera className="w-4 h-4" />
                           </button>
                         </div>
                       </div>
       
                       <div className="flex items-end gap-2 bg-white/5 border border-white/10 p-2 pl-5 rounded-[2rem] focus-within:border-yellow-600/50 focus-within:bg-white/10 transition-all shadow-inner">
                         <input 
                           type="text" 
                           value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                           placeholder={liveInteractionTab === 'chat' ? "Envoyer un message..." : "Poser votre question..."}
                           className="flex-1 bg-transparent border-none text-[15px] text-white focus:outline-none placeholder:text-zinc-600 py-3.5"
                         />
                         <button type="submit" disabled={(!newMessage.trim() && !mediaUrl) || sendingMessage} className="p-3 mb-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-full transition-all shadow-[0_0_15px_rgba(202,138,4,0.3)]">
                           {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin ml-0.5" /> : <Send size={20} className="ml-0.5" />}
                         </button>
                       </div>
                     </form>
                   )}
                 </div>
               </div>
             )}
          </div>
        </div>
        
        {/* Render modal if triggered inside Live mode */}
        {showAddModal === 'live' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-serif text-white font-bold">{editingLiveSession ? 'Modifier la session' : 'Nouvelle session live'}</h3>
                 <button onClick={() => { setShowAddModal(null); setEditingLiveSession(null); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 setIsSubmitting(true);
                 const formData = new FormData(e.currentTarget);
                 try {
                   let imageUrl = editingLiveSession ? editingLiveSession.image_url : null;
                   const fileInput = document.querySelector('input[name="coverImage"]') as HTMLInputElement;
                   if (fileInput && fileInput.files && fileInput.files.length > 0) {
                     const file = fileInput.files[0];
                     const uploadResult = await uploadMeditationFile(file);
                     imageUrl = uploadResult.url;
                   }
                   
                   const data: any = {
                     title: formData.get('title'),
                     start_time: formData.get('date'),
                     image_url: imageUrl
                   };
                   
                   if (editingLiveSession) {
                     data.updated_at = serverTimestamp();
                     await updateDoc(doc(db, 'meditation_live_sessions', editingLiveSession.id), data);
                     await logHistory('live_updated', `A modifié la session Live: ${data.title}`);
                   } else {
                     data.class_id = id;
                     data.created_by = currentUser?.uid;
                     data.created_at = serverTimestamp();
                     await addDoc(collection(db, 'meditation_live_sessions'), data);
                     await logHistory('live_started', `A programmé une session Live: ${data.title}`);
                   }
                   
                   setShowAddModal(null);
                   setEditingLiveSession(null);
                 } catch (err: any) {
                   handleFirestoreError(err, OperationType.WRITE, 'meditation_live_sessions');
                 } finally {
                   setIsSubmitting(false);
                 }
               }} className="space-y-5">
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Titre du live</label>
                   <input name="title" defaultValue={editingLiveSession?.title} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold/50 focus:bg-white/10 transition-all font-sans" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-2">Date et heure</label>
                   <input name="date" defaultValue={editingLiveSession?.start_time} required type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-gold/50 focus:bg-white/10 transition-all font-sans" />
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
                   {isSubmitting ? (editingLiveSession ? 'Mise à jour...' : 'Programmation...') : (editingLiveSession ? 'Enregistrer les modifications' : 'Programmer le Live')}
                 </button>
               </form>
             </div>
          </div>
        )}

        {/* Requests Modal for Hosts */}
        {showRequestsModal && canManage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowRequestsModal(false)}>
             <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-serif text-white font-bold flex items-center gap-2"><Hand className="w-5 h-5" /> Demandes ({participationRequests.filter(r => r.status === 'pending').length})</h3>
                 <button onClick={() => setShowRequestsModal(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                 {participationRequests.filter(r => r.status === 'pending').length === 0 ? (
                   <p className="text-zinc-500 text-center text-sm font-serif italic py-8">Aucune demande en attente</p>
                 ) : (
                   participationRequests.filter(r => r.status === 'pending').map(req => (
                     <div key={req.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="flex-1 min-w-0">
                           <p className="font-bold text-sm text-white truncate">{req.name}</p>
                           <p className="text-[10px] text-zinc-500 capitalize tracking-wide">{req.created_at?.toDate ? new Date(req.created_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Maintenant'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => acceptRequest(req.id)} className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center border border-green-500/50">
                             <Check className="w-4 h-4" />
                           </button>
                           <button onClick={() => rejectRequest(req.id)} className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center border border-red-500/50">
                             <X className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>
        )}

        {/* Members Presence Modal */}
        {showPresenceModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPresenceModal(false)}>
             <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-serif text-white font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Personnes Actives ({livePresence.length})</h3>
                 <button onClick={() => setShowPresenceModal(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                 {livePresence.length === 0 ? (
                   <p className="text-zinc-500 text-center text-sm font-serif italic py-8">Personne n'est actif pour le moment</p>
                 ) : (
                   livePresence.map(user => (
                     <div key={user.uid} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center text-white font-bold shadow-inner relative">
                          {user.displayName?.charAt(0).toUpperCase()}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111]" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="font-bold text-sm text-white truncate">{user.displayName}</p>
                           <p className="text-[10px] text-zinc-500 capitalize tracking-wide">{user.joined_at?.toDate ? new Date(user.joined_at.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Maintenant'}</p>
                        </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian pb-20">
      {/* Hero Section */}
      <div className="relative pt-24 pb-8 min-h-[50vh] flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img 
            src={meditationClass.imageUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80'} 
            alt={meditationClass.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-obsidian/80 via-obsidian/40 to-obsidian" />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <Link to="/sanctum-lucis/meditations" className="inline-flex items-center text-gray-200 hover:text-white bg-black/30 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> Retour aux classes
          </Link>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-auto pt-12">
          <div className="flex flex-wrap gap-3 mb-4">
            {activeLive && (
              <motion.button 
                onClick={() => setActiveTab('live')}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 border border-red-500/50 cursor-pointer hover:bg-red-500 transition-colors"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="tracking-wider uppercase">Live en cours</span>
                <div className="h-4 w-px bg-white/30 mx-1" />
                <div className="flex items-center gap-1 text-xs opacity-90">
                  <Users className="w-3 h-3" />
                  <span>{livePresence.length > 0 ? livePresence.length : members.length}</span>
                </div>
              </motion.button>
            )}
            <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light flex items-center gap-1">
              <Users className="w-4 h-4 text-gold" /> {members.length} membres
            </span>
            <span className="bg-obsidian/80 backdrop-blur-sm text-gray-200 px-3 py-1 rounded-full text-sm font-medium border border-obsidian-light flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gold" /> Prochaine session: {meditationClass.start_date ? new Date(meditationClass.start_date).toLocaleDateString() : 'À définir'}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 line-clamp-2">{meditationClass.title}</h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl line-clamp-3">{meditationClass.description}</p>
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left text-sm text-gray-400 hover:bg-obsidian-light hover:text-gray-200"
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

              {/* Other Tabs handled by FullPageOverlay */}
              {activeTab !== 'overview' && (
                <FullPageOverlay 
                  activeTab={activeTab} 
                  onClose={() => setActiveTab('overview')} 
                  canManage={canManage}
                  setShowAddModal={setShowAddModal}
                >
                  {/* Content Tab */}
                  {activeTab === 'content' && (
                    <div className="bg-obsidian p-8 rounded-xl border border-obsidian-light">
                      <div className="prose prose-invert max-w-none">
                        {meditationClass.longContent || meditationClass.description}
                      </div>
                    </div>
                  )}

                  {/* Audios Tab */}
                  {activeTab === 'audios' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {audios.length === 0 ? (
                        <p className="text-gray-400 col-span-2 text-center py-10">Aucun audio disponible.</p>
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
                                src={audio.audio_url || undefined} 
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
                  )}

                  {/* Videos Tab */}
                  {activeTab === 'videos' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {videos.length === 0 ? (
                        <p className="text-gray-400 col-span-2 text-center py-10">Aucune vidéo disponible.</p>
                      ) : (
                        videos.map(video => (
                          <div key={video.id} className="bg-obsidian border border-obsidian-light rounded-xl overflow-hidden group hover:border-gold/30 transition-all shadow-lg">
                            <div className="aspect-video bg-black relative">
                              <video 
                                src={video.video_url || undefined} 
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
                  )}

                  {/* Docs Tab */}
                  {activeTab === 'docs' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {files.length === 0 ? (
                        <p className="text-gray-400 col-span-2 text-center py-10">Aucun document disponible.</p>
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
                                    src={file.file_url ? `${file.file_url}#toolbar=0&navpanes=0` : undefined} 
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
                  )}

                  {/* Calendar Tab */}
                  {activeTab === 'calendar' && (
                    <div className="space-y-4">
                      {events.length === 0 ? (
                        <p className="text-gray-400 text-center py-10">Aucun événement programmé.</p>
                      ) : (
                        events.map(event => (
                          <div key={event.id} className="bg-obsidian border border-obsidian-light rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group shadow-lg">
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
                  )}

                  {/* Members Tab */}
                  {activeTab === 'members' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {members.map((member, idx) => (
                        <MemberItem key={member.id || idx} member={member} canManage={canManage} />
                      ))}
                    </div>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
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
                              <div className="bg-obsidian border border-obsidian-light p-4 rounded-xl shadow-lg">
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
                  )}

                  {/* Management Tab */}
                  {activeTab === 'management' && canManage && (
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
                            <div className="flex items-center gap-2 flex-shrink-0">
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
                  )}
                </FullPageOverlay>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Content Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                                {uploadPreview.type === 'image' && <img src={uploadPreview.url || undefined} className="w-full h-full object-cover" alt="Preview" />}
                                {uploadPreview.type === 'video' && <video src={uploadPreview.url || undefined} className="w-full h-full object-cover" />}
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
