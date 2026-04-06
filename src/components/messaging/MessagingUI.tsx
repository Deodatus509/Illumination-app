import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Paperclip, Loader2, UserCircle, Clock, CheckCircle, XCircle, Search, Filter, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

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
  
  // Filters
  const [filterType, setFilterType] = useState<string>(defaultFilterType);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: selectedConversation.id,
        sender_id: currentUser.uid,
        message: newMessage,
        created_at: serverTimestamp(),
        is_read: false
      });

      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        last_message: newMessage,
        last_message_time: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: selectedConversation.status === 'closed' ? 'open' : selectedConversation.status // Reopen if closed
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
                  <div key={msg.id} className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-obsidian-light flex items-center justify-center flex-shrink-0 mt-auto mb-1">
                        <UserCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    {!isMine && !showAvatar && <div className="w-8" />}
                    
                    <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                      isMine 
                        ? 'bg-mystic-purple text-white rounded-br-sm' 
                        : 'bg-obsidian-lighter text-gray-200 border border-obsidian-light rounded-bl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      <div className={`text-[10px] mt-2 text-right flex items-center justify-end gap-1 ${
                        isMine ? 'text-mystic-purple-light/80' : 'text-gray-500'
                      }`}>
                        {msg.created_at?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMine && (
                          <CheckCircle className={`w-3 h-3 ${msg.is_read ? 'text-green-400' : 'opacity-50'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-obsidian-light bg-obsidian-lighter/80 backdrop-blur-sm">
              {selectedConversation.status === 'closed' && userRole !== 'admin' ? (
                <div className="text-center p-3 bg-obsidian rounded-lg border border-obsidian-light text-gray-400 text-sm">
                  Cette conversation est fermée. Vous ne pouvez plus y répondre.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
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
                      placeholder="Écrivez votre message... (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
                      className="w-full bg-transparent px-4 py-3 text-sm text-gray-200 focus:outline-none resize-none max-h-32 min-h-[44px]"
                      rows={1}
                      disabled={sending || (selectedConversation.status === 'closed' && userRole !== 'admin')}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || (selectedConversation.status === 'closed' && userRole !== 'admin')}
                    className="p-3 bg-mystic-purple text-white rounded-xl hover:bg-mystic-purple-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-mystic-purple/20 flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
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
