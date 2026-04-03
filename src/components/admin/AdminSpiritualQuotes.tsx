import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSpiritualQuotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<any>({ text: '', author: '', category: '', is_active: true });
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const q = query(collection(db, 'spiritual_quotes'));
      const snapshot = await getDocs(q);
      const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuotes(quotesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'spiritual_quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentQuote.text || !currentQuote.author) return;
    
    setLoading(true);
    try {
      if (currentQuote.id) {
        await updateDoc(doc(db, 'spiritual_quotes', currentQuote.id), {
          text: currentQuote.text,
          author: currentQuote.author,
          category: currentQuote.category,
          is_active: currentQuote.is_active
        });
      } else {
        await addDoc(collection(db, 'spiritual_quotes'), {
          text: currentQuote.text,
          author: currentQuote.author,
          category: currentQuote.category,
          is_active: currentQuote.is_active,
          created_at: serverTimestamp(),
          created_by: currentUser?.uid
        });
      }
      setIsEditing(false);
      setCurrentQuote({ text: '', author: '', category: '', is_active: true });
      fetchQuotes();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'spiritual_quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette citation ?')) return;
    try {
      await deleteDoc(doc(db, 'spiritual_quotes', id));
      fetchQuotes();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `spiritual_quotes/${id}`);
    }
  };

  if (loading && quotes.length === 0) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gold" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-200">Citations Spirituelles</h3>
        <button
          onClick={() => {
            setCurrentQuote({ text: '', author: '', category: '', is_active: true });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-mystic-purple text-white rounded-md hover:bg-mystic-purple-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Citation
        </button>
      </div>

      {isEditing && (
        <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Citation</label>
            <textarea
              value={currentQuote.text}
              onChange={(e) => setCurrentQuote({ ...currentQuote, text: e.target.value })}
              className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Auteur</label>
              <input
                type="text"
                value={currentQuote.author}
                onChange={(e) => setCurrentQuote({ ...currentQuote, author: e.target.value })}
                className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
              <input
                type="text"
                value={currentQuote.category}
                onChange={(e) => setCurrentQuote({ ...currentQuote, category: e.target.value })}
                className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={currentQuote.is_active}
              onChange={(e) => setCurrentQuote({ ...currentQuote, is_active: e.target.checked })}
              className="rounded border-obsidian-light bg-obsidian text-mystic-purple focus:ring-mystic-purple"
            />
            <label className="text-sm text-gray-300">Actif</label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-gold text-obsidian font-medium rounded-md hover:bg-gold-light transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotes.map((quote) => (
          <div key={quote.id} className="bg-obsidian-lighter p-4 rounded-lg border border-obsidian-light relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={() => {
                  setCurrentQuote(quote);
                  setIsEditing(true);
                }}
                className="p-1 text-gray-400 hover:text-gold transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(quote.id)}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-200 italic mb-2">"{quote.text}"</p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gold">— {quote.author}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${quote.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {quote.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
