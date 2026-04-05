import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Paperclip, Loader2, UserCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
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
}

export function MessagingUI({ userRole, defaultFilterType = 'all' }: MessagingUIProps) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<string>(defaultFilterType);

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
        updated_at: serverTimestamp()
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

  const filteredConversations = conversations.filter(c => filterType === 'all' || c.type === filterType);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden">
      {/* Conversation List */}
      <div className="w-1/3 border-r border-obsidian-light flex flex-col">
        <div className="p-4 border-b border-obsidian-light">
          <h2 className="text-lg font-semibold text-gold mb-4">Conversations</h2>
          {(userRole === 'admin' || userRole === 'supporteur') && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-obsidian border border-obsidian-light rounded-md p-2 text-sm text-gray-200"
            >
              <option value="all">Tous les types</option>
              <option value="contact">Contact</option>
              <option value="consultation">Consultation</option>
              <option value="support">Support</option>
            </select>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">Aucune conversation</div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-obsidian-light cursor-pointer transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-obsidian' : 'hover:bg-obsidian/50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-200 capitalize">{conv.type}</span>
                  <span className="text-xs text-gray-500">
                    {conv.last_message_time?.toDate().toLocaleDateString()}
                  </span>
                </div>
                {conv.subject && <div className="text-sm text-gold mb-1 truncate">{conv.subject}</div>}
                <div className="text-sm text-gray-400 truncate">{conv.last_message}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-obsidian">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-obsidian-light flex justify-between items-center bg-obsidian-lighter">
              <div>
                <h3 className="font-semibold text-gold capitalize">{selectedConversation.type}</h3>
                {selectedConversation.subject && <p className="text-sm text-gray-400">{selectedConversation.subject}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedConversation.status === 'open' ? 'bg-green-500/20 text-green-400' :
                  selectedConversation.status === 'closed' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {selectedConversation.status}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMine = msg.sender_id === currentUser?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMine ? 'bg-mystic-purple text-white rounded-tr-none' : 'bg-obsidian-lighter text-gray-200 border border-obsidian-light rounded-tl-none'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-mystic-purple-light' : 'text-gray-500'}`}>
                        {msg.created_at?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-obsidian-light bg-obsidian-lighter">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-obsidian border border-obsidian-light rounded-full px-4 py-2 text-gray-200 focus:outline-none focus:border-mystic-purple"
                  disabled={selectedConversation.status === 'closed'}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending || selectedConversation.status === 'closed'}
                  className="p-2 bg-gold text-obsidian rounded-full hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Sélectionnez une conversation pour commencer
          </div>
        )}
      </div>
    </div>
  );
}
