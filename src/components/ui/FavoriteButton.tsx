import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { cn } from '../../lib/utils';

interface FavoriteButtonProps {
  itemId: string;
  itemType: 'ritual' | 'course' | 'post' | 'libraryItem';
  className?: string;
  showText?: boolean;
}

export function FavoriteButton({ itemId, itemType, className = '', showText = false }: FavoriteButtonProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || !itemId) return;
    
    const checkFavorite = async () => {
      try {
        const q = query(
          collection(db, 'favorites'),
          where('userId', '==', currentUser.uid),
          where('itemId', '==', itemId),
          where('itemType', '==', itemType)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setIsFavorite(true);
          setFavoriteId(snap.docs[0].id);
        }
      } catch (error) {
        console.error("Error checking favorite:", error);
      }
    };
    checkFavorite();
  }, [currentUser, itemId, itemType]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      openAuthModal();
      return;
    }

    setLoading(true);
    try {
      if (isFavorite && favoriteId) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const docRef = await addDoc(collection(db, 'favorites'), {
          userId: currentUser.uid,
          itemId,
          itemType,
          createdAt: new Date()
        });
        setIsFavorite(true);
        setFavoriteId(docRef.id);
      }
    } catch (error) {
      handleFirestoreError(error, isFavorite ? OperationType.DELETE : OperationType.WRITE, 'favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleFavorite}
      disabled={loading}
      className={cn(
        "transition-colors flex items-center justify-center gap-2",
        isFavorite 
          ? "text-red-500 hover:text-red-600" 
          : "text-gray-300 hover:text-red-400",
        !showText && "p-2 rounded-full bg-obsidian/50 backdrop-blur-sm",
        className
      )}
      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
      )}
      {showText && <span>{isFavorite ? "Favori" : "Ajouter aux favoris"}</span>}
    </button>
  );
}
