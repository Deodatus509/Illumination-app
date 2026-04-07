import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, Edit2, Trash2, Check, X, MessageCircle, Eye, Send, ExternalLink, Paperclip, FileText, Camera, Mic, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import { useNavigate } from 'react-router-dom';
import { uploadConsultationFile } from '../../lib/storage';

export default function AdminConsultations() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'services' | 'requests'>('requests');
  
  // Services State
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [currentService, setCurrentService] = useState<any>({ title: '', description: '', price: 0, is_active: true });

  // Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen && selectedRequest) {
      const q = query(
        collection(db, 'messages'),
        where('conversation_id', '==', selectedRequest.conversation_id),
        orderBy('created_at', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
      
      return () => unsubscribe();
    }
  }, [isChatOpen, selectedRequest]);

  const handleSendChatMessage = async (e?: React.FormEvent, mediaData?: { url: string, type: string }) => {
    if (e) e.preventDefault();
    if (!newChatMessage.trim() && !mediaData && !selectedRequest || !currentUser) return;

    setSendingMessage(true);
    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: selectedRequest.conversation_id,
        sender_id: currentUser.uid,
        senderName: userProfile?.displayName || currentUser.displayName || 'Admin',
        sender_role: userProfile?.role || 'admin',
        message: newChatMessage.trim(),
        file_url: mediaData?.url || null,
        file_type: mediaData?.type || null,
        created_at: serverTimestamp(),
        is_read: false
      });
      
      if (selectedRequest.conversation_id) {
        await updateDoc(doc(db, 'conversations', selectedRequest.conversation_id), {
          last_message: newChatMessage.trim() || (mediaData ? `[${mediaData.type}]` : ''),
          last_message_time: serverTimestamp(),
          updated_at: serverTimestamp()
        });

        // Notify user
        await addDoc(collection(db, 'notifications'), {
          userId: selectedRequest.user_id,
          title: 'Nouveau message',
          message: `Nouveau message dans votre consultation "${selectedRequest.fullName}"`,
          type: 'consultation',
          isRead: false,
          createdAt: serverTimestamp(),
          link: `/sanctum-lucis/consultations/${selectedRequest.id}`
        });
      }

      setNewChatMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedRequest) return;
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('audio/') ? 'audio' :
                 file.type.startsWith('video/') ? 'video' : 'document';
    
    setSendingMessage(true);
    try {
      const { url } = await uploadConsultationFile(file);
      
      // Also add to consultation_files collection
      await addDoc(collection(db, 'consultation_files'), {
        consultation_id: selectedRequest.id,
        file_url: url,
        file_type: type,
        uploaded_by: currentUser?.uid,
        created_at: serverTimestamp()
      });

      await handleSendChatMessage(undefined, { url, type });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'services') {
      fetchServices();
    } else {
      fetchRequests();
    }
  }, [activeTab]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const q = query(collection(db, 'consultation_services'));
      const snapshot = await getDocs(q);
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'consultation_services');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const q = query(collection(db, 'consultations'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      // Fetch all services once
      const servicesSnap = await getDocs(collection(db, 'consultation_services'));
      const servicesMap = new Map(servicesSnap.docs.map(d => [d.id, d.data().title || 'Service inconnu']));

      // Fetch users involved in these requests
      const userIds = Array.from(new Set(snapshot.docs.map(doc => doc.data().user_id).filter(Boolean)));
      const usersMap = new Map();
      
      // Firestore 'in' query limit is 30, but let's just fetch them individually or in chunks if needed
      // For simplicity in this admin context, we'll fetch them in parallel but efficiently
      await Promise.all(userIds.map(async (uid) => {
        const userSnap = await getDoc(doc(db, 'users', uid as string));
        if (userSnap.exists()) {
          usersMap.set(uid, userSnap.data().displayName || userSnap.data().name || 'Utilisateur inconnu');
        }
      }));

      const requestsData = snapshot.docs.map((requestDoc) => {
        const data = requestDoc.data();
        return { 
          id: requestDoc.id, 
          ...data,
          userName: usersMap.get(data.user_id) || 'Utilisateur inconnu',
          serviceName: servicesMap.get(data.service_id) || 'Service inconnu'
        };
      });
      
      setRequests(requestsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'consultations');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSaveService = async () => {
    if (!currentService.title || !currentService.description) return;
    setLoadingServices(true);
    try {
      if (currentService.id) {
        await updateDoc(doc(db, 'consultation_services', currentService.id), {
          title: currentService.title,
          description: currentService.description,
          price: Number(currentService.price),
          is_active: currentService.is_active
        });
      } else {
        await addDoc(collection(db, 'consultation_services'), {
          title: currentService.title,
          description: currentService.description,
          price: Number(currentService.price),
          is_active: currentService.is_active
        });
      }
      setIsEditingService(false);
      setCurrentService({ title: '', description: '', price: 0, is_active: true });
      fetchServices();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'consultation_services');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Supprimer ce service ?')) return;
    try {
      await deleteDoc(doc(db, 'consultation_services', id));
      fetchServices();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `consultation_services/${id}`);
    }
  };

  const logHistory = async (id: string, eventType: string, description: string) => {
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

  const handleUpdateRequestStatus = async (id: string, status: string, userId?: string) => {
    try {
      const updateData: any = { 
        status,
        updated_at: serverTimestamp()
      };
      
      // Assign to current admin if status is being accepted/approved
      if (status === 'accepted' || status === 'approved' || status === 'in_progress') {
        updateData.assigned_to = currentUser?.uid;
      }

      await updateDoc(doc(db, 'consultations', id), updateData);
      
      const statusLabels: any = {
        pending: 'En attente',
        approved: 'Approuvée',
        accepted: 'Acceptée',
        in_progress: 'En cours',
        waiting_user: 'En attente utilisateur',
        completed: 'Terminée',
        cancelled: 'Annulée'
      };
      
      await logHistory(id, 'status_change', `Statut changé en : ${statusLabels[status] || status}`);

      // Notify user of status change
      if (userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          title: 'Mise à jour de consultation',
          message: `Le statut de votre consultation est passé à : ${statusLabels[status] || status}`,
          type: 'consultation',
          isRead: false,
          createdAt: serverTimestamp(),
          link: `/sanctum-lucis/consultations/${id}`
        });
      }

      // If accepted, create a conversation
      if (status === 'accepted' && userId && currentUser) {
        // Check if conversation already exists
        const q = query(collection(db, 'conversations'), where('consultation_id', '==', id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          const convoRef = await addDoc(collection(db, 'conversations'), {
            type: 'consultation',
            created_by: currentUser.uid,
            consultation_id: id,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            status: 'open',
            participants: [userId, currentUser.uid],
            last_message: 'Consultation acceptée. Vous pouvez maintenant discuter ici.',
            last_message_time: serverTimestamp(),
            subject: 'Consultation Spirituelle'
          });

          await updateDoc(doc(db, 'consultations', id), { conversation_id: convoRef.id });

          await addDoc(collection(db, 'messages'), {
            conversation_id: convoRef.id,
            sender_id: currentUser.uid,
            senderName: userProfile?.displayName || currentUser.displayName || 'Admin',
            sender_role: userProfile?.role || 'admin',
            message: 'Consultation acceptée. Vous pouvez maintenant discuter ici.',
            created_at: serverTimestamp(),
            is_read: false
          });

          await addDoc(collection(db, 'notifications'), {
            userId: userId,
            title: 'Consultation acceptée',
            message: `Votre demande de consultation a été acceptée. Vous pouvez maintenant discuter avec un administrateur.`,
            type: 'consultation',
            isRead: false,
            createdAt: serverTimestamp(),
            link: '/dashboard/messages'
          });
        }
      }

      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consultations/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-obsidian-light pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'requests' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Demandes
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'services' ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Services
        </button>
      </div>

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-200">Services de Consultation</h3>
            <button
              onClick={() => {
                setCurrentService({ title: '', description: '', price: 0, is_active: true });
                setIsEditingService(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-mystic-purple text-white rounded-md hover:bg-mystic-purple-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau Service
            </button>
          </div>

          {isEditingService && (
            <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
                  <input
                    type="text"
                    value={currentService.title}
                    onChange={(e) => setCurrentService({ ...currentService, title: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prix (€)</label>
                  <input
                    type="number"
                    value={currentService.price}
                    onChange={(e) => setCurrentService({ ...currentService, price: e.target.value })}
                    className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={currentService.description}
                  onChange={(e) => setCurrentService({ ...currentService, description: e.target.value })}
                  className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentService.is_active}
                  onChange={(e) => setCurrentService({ ...currentService, is_active: e.target.checked })}
                  className="rounded border-obsidian-light bg-obsidian text-mystic-purple focus:ring-mystic-purple"
                />
                <label className="text-sm text-gray-300">Actif</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsEditingService(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveService}
                  disabled={loadingServices}
                  className="px-4 py-2 bg-gold text-obsidian font-medium rounded-md hover:bg-gold-light transition-colors flex items-center gap-2"
                >
                  {loadingServices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div key={service.id} className="bg-obsidian-lighter p-4 rounded-lg border border-obsidian-light relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentService(service);
                      setIsEditingService(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-lg font-bold text-gray-200 mb-1">{service.title}</h4>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{service.description}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gold font-medium">{service.price} €</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${service.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {service.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {selectedRequest ? (
            <div className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-200 mb-1">Demande de {selectedRequest.userName}</h3>
                  <p className="text-gold">{selectedRequest.serviceName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate(`/sanctum-lucis/consultations/${selectedRequest.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir les détails complets
                  </button>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="bg-obsidian p-4 rounded-lg border border-obsidian-light mb-6 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Détails de l'utilisateur :</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
                    <p><span className="text-gray-500">Nom complet:</span> {selectedRequest.fullName}</p>
                    <p><span className="text-gray-500">Date de naissance:</span> {selectedRequest.birthDate || 'Non renseigné'}</p>
                    <p><span className="text-gray-500">Heure de naissance:</span> {selectedRequest.birthTime || 'Non renseigné'}</p>
                    <p><span className="text-gray-500">Lieu de naissance:</span> {selectedRequest.birthPlace || 'Non renseigné'}</p>
                    <p><span className="text-gray-500">Date souhaitée:</span> {selectedRequest.preferredDate || 'Non renseigné'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Message de l'utilisateur :</h4>
                  <p className="text-gray-200 whitespace-pre-wrap">{selectedRequest.message}</p>
                </div>
                {selectedRequest.fileUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Pièce jointe :</h4>
                    <a href={selectedRequest.fileUrl} target="_blank" rel="noopener noreferrer" className="text-mystic-purple hover:underline">
                      Voir le document
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Statut :</span>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => handleUpdateRequestStatus(selectedRequest.id, e.target.value, selectedRequest.user_id)}
                  className="bg-obsidian border border-obsidian-light rounded-md p-2 text-gray-200"
                >
                  <option value="pending">En attente</option>
                  <option value="accepted">Approuvé</option>
                  <option value="in_progress">En cours</option>
                  <option value="waiting_user">En attente du client</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
                
                {/* Future: Chat button */}
                <div className="ml-auto flex gap-2">
                  <button 
                    onClick={() => navigate(`/sanctum-lucis/consultations/${selectedRequest.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-md hover:bg-gold-light transition-colors font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir l'espace complet
                  </button>
                  <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-mystic-purple/20 text-mystic-purple-light rounded-md hover:bg-mystic-purple/30 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {isChatOpen ? 'Fermer la messagerie rapide' : 'Ouvrir la messagerie rapide'}
                  </button>
                </div>
              </div>

              {isChatOpen && (
                <div className="mt-6 border border-obsidian-light rounded-xl overflow-hidden flex flex-col h-[400px]">
                  <div className="bg-obsidian-light/30 p-4 border-b border-obsidian-light">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-mystic-purple" />
                      Messagerie avec {selectedRequest.userName}
                    </h4>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-obsidian/50">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Aucun message. Commencez la discussion !</p>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender_id === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                          <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>
                          <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.sender_id === currentUser?.uid ? 'bg-mystic-purple text-white rounded-tr-none' : 'bg-obsidian border border-obsidian-light text-gray-200 rounded-tl-none'}`}>
                            {msg.message && <p className="mb-2">{msg.message}</p>}
                            
                            {msg.file_url && (
                              <div className="mt-2">
                                {msg.file_type === 'image' && (
                                  <img src={msg.file_url} alt="Shared" className="rounded-lg max-w-full h-auto border border-black/10" referrerPolicy="no-referrer" />
                                )}
                                {msg.file_type === 'audio' && (
                                  <audio controls className="w-full h-10">
                                    <source src={msg.file_url} type="audio/mpeg" />
                                  </audio>
                                )}
                                {msg.file_type === 'video' && (
                                  <video controls className="w-full rounded-lg">
                                    <source src={msg.file_url} type="video/mp4" />
                                  </video>
                                )}
                                {msg.file_type === 'document' && (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-lg text-xs hover:bg-black/20 transition-colors">
                                    <FileText className="w-4 h-4" /> Télécharger le document
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 bg-obsidian border-t border-obsidian-light">
                    <form onSubmit={handleSendChatMessage} className="flex gap-2 items-end">
                      <label className="p-2 text-gray-400 hover:text-mystic-purple cursor-pointer transition-colors">
                        <Paperclip className="w-5 h-5" />
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                      </label>
                      <textarea
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="Écrivez votre message..."
                        className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-lg px-4 py-2 text-white focus:border-mystic-purple focus:ring-1 focus:ring-mystic-purple outline-none resize-none max-h-32"
                        rows={1}
                      />
                      <button 
                        type="submit"
                        disabled={sendingMessage || (!newChatMessage.trim())}
                        className="p-2 bg-mystic-purple text-white rounded-lg hover:bg-mystic-purple-light disabled:opacity-50 transition-colors"
                      >
                        {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-obsidian-light text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Utilisateur</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">Aucune demande de consultation.</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="border-b border-obsidian-light/50 hover:bg-obsidian-light/20 transition-colors">
                        <td className="py-4 text-gray-200">{req.userName}</td>
                        <td className="py-4 text-gold">{req.serviceName}</td>
                        <td className="py-4 text-gray-400">
                          {req.created_at?.toDate ? req.created_at.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            req.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                            req.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {req.status === 'pending' ? 'En attente' :
                             req.status === 'approved' ? 'Approuvé' :
                             req.status === 'completed' ? 'Terminé' : 'Rejeté'}
                          </span>
                        </td>
                        <td className="py-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/sanctum-lucis/consultations/${req.id}`)}
                            className="p-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors"
                            title="Ouvrir l'espace complet"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="p-2 text-gray-400 hover:text-gold transition-colors"
                            title="Voir les détails rapides"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
