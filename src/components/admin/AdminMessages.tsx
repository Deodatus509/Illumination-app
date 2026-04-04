import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Mail, Trash2, CheckCircle, Clock, Loader2, AlertTriangle, MessageCircle, Send, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminMessages() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  
  // Chat State
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
      setLoading(false);
    }, (err) => {
      console.error("Erreur lors du chargement des messages:", err);
      setError("Erreur lors du chargement des messages.");
      handleFirestoreError(err, OperationType.LIST, 'messages');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedMessage) {
      const q = query(
        collection(db, `messages/${selectedMessage.id}/replies`),
        orderBy('createdAt', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
      
      return () => unsubscribe();
    }
  }, [selectedMessage]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedMessage || !currentUser) return;

    setSendingReply(true);
    try {
      await addDoc(collection(db, `messages/${selectedMessage.id}/replies`), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Support',
        message: newReply.trim(),
        createdAt: serverTimestamp()
      });
      
      // Mark original message as read if we reply
      if (selectedMessage.status !== 'read') {
        await updateDoc(doc(db, 'messages', selectedMessage.id), { status: 'read' });
      }
      
      setNewReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages/replies');
    } finally {
      setSendingReply(false);
    }
  };

  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'messages', id), {
        status: currentStatus === 'read' ? 'unread' : 'read'
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour du message:", err);
      handleFirestoreError(err, OperationType.UPDATE, 'messages');
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal.id) return;
    
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });

    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (err) {
      console.error("Erreur lors de la suppression du message:", err);
      handleFirestoreError(err, OperationType.DELETE, 'messages');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de confirmation */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian w-full max-w-md rounded-2xl border border-obsidian-light p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Confirmer la suppression</h3>
            </div>
            
            <p className="text-gray-300 mb-8">
              Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.
            </p>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmModal({ isOpen: false, id: null })}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de chat */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-obsidian w-full max-w-2xl h-[80vh] rounded-2xl border border-obsidian-light shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-obsidian-light/30 p-4 border-b border-obsidian-light flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-mystic-purple" />
                  Messagerie avec {selectedMessage.name}
                </h3>
                <p className="text-sm text-gray-400">{selectedMessage.subject}</p>
              </div>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-obsidian/50">
              <div className="flex flex-col items-start">
                <span className="text-xs text-gray-500 mb-1 px-1">{selectedMessage.name}</span>
                <div className="px-4 py-2 rounded-2xl max-w-[80%] bg-obsidian border border-obsidian-light text-gray-200 rounded-tl-none whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
              
              {replies.map((reply) => (
                <div key={reply.id} className={`flex flex-col ${reply.senderId === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1 px-1">{reply.senderName}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${reply.senderId === currentUser?.uid ? 'bg-mystic-purple text-white rounded-tr-none' : 'bg-obsidian border border-obsidian-light text-gray-200 rounded-tl-none'} whitespace-pre-wrap`}>
                    {reply.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-obsidian border-t border-obsidian-light">
              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Écrivez votre réponse..."
                  className="flex-1 bg-obsidian-lighter border border-obsidian-light rounded-lg px-4 py-2 text-white focus:border-mystic-purple focus:ring-1 focus:ring-mystic-purple outline-none"
                />
                <button 
                  type="submit"
                  disabled={sendingReply || !newReply.trim()}
                  className="p-2 bg-mystic-purple text-white rounded-lg hover:bg-mystic-purple-light disabled:opacity-50 transition-colors"
                >
                  {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-obsidian rounded-lg border border-obsidian-light">
          <Mail className="w-5 h-5 text-gold" />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Messages de Contact</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`p-6 rounded-xl border transition-colors ${
              message.status === 'read' 
                ? 'bg-obsidian border-obsidian-light opacity-75' 
                : 'bg-obsidian-lighter border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
            }`}
          >
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  {message.subject}
                  {message.status !== 'read' && (
                    <span className="px-2 py-1 text-xs font-bold bg-gold text-obsidian rounded-full">Nouveau</span>
                  )}
                </h3>
                <div className="text-sm text-gray-400 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span>De: <span className="text-gray-300 font-medium">{message.name}</span> ({message.email})</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {message.createdAt?.toDate().toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMessage(message)}
                  className="p-2 text-mystic-purple-light hover:bg-mystic-purple/10 rounded-lg transition-colors"
                  title="Répondre"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleMarkAsRead(message.id, message.status)}
                  className={`p-2 rounded-lg transition-colors ${
                    message.status === 'read'
                      ? 'text-gray-400 hover:text-white hover:bg-obsidian-light'
                      : 'text-green-400 hover:bg-green-400/10'
                  }`}
                  title={message.status === 'read' ? "Marquer comme non lu" : "Marquer comme lu"}
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(message.id)}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Supprimer le message"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="bg-obsidian p-4 rounded-lg border border-obsidian-light text-gray-300 whitespace-pre-wrap">
              {message.message}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 bg-obsidian-lighter rounded-xl border border-obsidian-light">
            <Mail className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">Aucun message</h3>
            <p className="text-gray-500 mt-2">Les messages envoyés via le formulaire de contact apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}
