import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Loader2, Plus, Edit2, Trash2, Check, X, Users } from 'lucide-react';

export default function AdminMeditation() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentClass, setCurrentClass] = useState<any>({ title: '', description: '', price: 0, start_date: '', is_active: true });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const q = query(collection(db, 'meditation_classes'));
      const snapshot = await getDocs(q);
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'meditation_classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentClass.title || !currentClass.start_date) return;
    setLoading(true);
    try {
      if (currentClass.id) {
        await updateDoc(doc(db, 'meditation_classes', currentClass.id), {
          title: currentClass.title,
          description: currentClass.description,
          price: Number(currentClass.price),
          start_date: currentClass.start_date,
          is_active: currentClass.is_active
        });
      } else {
        await addDoc(collection(db, 'meditation_classes'), {
          title: currentClass.title,
          description: currentClass.description,
          price: Number(currentClass.price),
          start_date: currentClass.start_date,
          is_active: currentClass.is_active,
          created_at: serverTimestamp()
        });
      }
      setIsEditing(false);
      setCurrentClass({ title: '', description: '', price: 0, start_date: '', is_active: true });
      fetchClasses();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'meditation_classes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette classe ?')) return;
    try {
      await deleteDoc(doc(db, 'meditation_classes', id));
      fetchClasses();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `meditation_classes/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-200">Classes de Méditation</h3>
        <button
          onClick={() => {
            setCurrentClass({ title: '', description: '', price: 0, start_date: '', is_active: true });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-mystic-purple text-white rounded-md hover:bg-mystic-purple-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Classe
        </button>
      </div>

      {isEditing && (
        <div className="bg-obsidian p-6 rounded-xl border border-obsidian-light space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
              <input
                type="text"
                value={currentClass.title}
                onChange={(e) => setCurrentClass({ ...currentClass, title: e.target.value })}
                className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date et Heure</label>
              <input
                type="datetime-local"
                value={currentClass.start_date}
                onChange={(e) => setCurrentClass({ ...currentClass, start_date: e.target.value })}
                className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={currentClass.description}
                onChange={(e) => setCurrentClass({ ...currentClass, description: e.target.value })}
                className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Prix (€)</label>
              <input
                type="number"
                value={currentClass.price}
                onChange={(e) => setCurrentClass({ ...currentClass, price: e.target.value })}
                className="w-full bg-obsidian-lighter border border-obsidian-light rounded-md p-2 text-gray-200"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={currentClass.is_active}
                onChange={(e) => setCurrentClass({ ...currentClass, is_active: e.target.checked })}
                className="rounded border-obsidian-light bg-obsidian text-mystic-purple focus:ring-mystic-purple"
              />
              <label className="text-sm text-gray-300">Actif</label>
            </div>
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
        {classes.map((cls) => (
          <div key={cls.id} className="bg-obsidian-lighter p-4 rounded-lg border border-obsidian-light relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={() => {
                  setCurrentClass(cls);
                  setIsEditing(true);
                }}
                className="p-1 text-gray-400 hover:text-gold transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cls.id)}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-lg font-bold text-gray-200 mb-1">{cls.title}</h4>
            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{cls.description}</p>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-mystic-purple-light">
                {new Date(cls.start_date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
              </span>
              <span className="text-gold font-medium">{cls.price > 0 ? `${cls.price} €` : 'Gratuit'}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-obsidian-light pt-2 mt-2">
              <span className="flex items-center gap-1 text-gray-400">
                <Users className="w-4 h-4" />
                Membres
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${cls.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {cls.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
