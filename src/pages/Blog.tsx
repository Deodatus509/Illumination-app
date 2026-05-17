import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ChevronRight, Search, Clock, MessageSquare, Send, ThumbsUp, ThumbsDown, Trash2, ArrowUpDown, Edit2, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, increment, getDocs, writeBatch, orderBy, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { SocialShare } from '../components/SocialShare';
import { ImageCarousel } from '../components/ui/ImageCarousel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDate } from '../lib/dateUtils';
import { cn } from '../lib/utils';
import { FavoriteButton } from '../components/ui/FavoriteButton';

interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  userReaction?: 'like' | 'dislike';
  parentId?: string;
}

const POSTS_PER_PAGE = 5;
const COMMENTS_PER_PAGE = 5;

const calculateReadTime = (text: string) => {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export function Blog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, loginWithGoogle, openAuthModal } = useAuth();
  const { theme } = useTheme();
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [postNotFound, setPostNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userReactions, setUserReactions] = useState<Record<string, 'like' | 'dislike'>>({});
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string, author: string} | null>(null);
  
  const [commentSortOrder, setCommentSortOrder] = useState<'newest' | 'oldest' | 'most_liked' | 'least_liked'>('newest');
  const [commentPage, setCommentPage] = useState(1);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [postSortOrder, setPostSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [postReactions, setPostReactions] = useState<Record<string, Record<string, number>>>({});
  const [userPostReactions, setUserPostReactions] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [banner, setBanner] = useState<{ imageUrl: string; linkUrl: string; isActive: boolean } | null>(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const docRef = doc(db, 'settings', 'blogBanner');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBanner(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching blog banner:", error);
      }
    };
    fetchBanner();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(fetchedPosts);
      
      if (id) {
        const post = fetchedPosts.find(p => p.id === id);
        if (post) {
          setSelectedPost(post);
          setPostNotFound(false);
        } else {
          setPostNotFound(true);
        }
      } else {
        setSelectedPost(null);
        setPostNotFound(false);
      }
      
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogPosts');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const categories = useMemo(() => Array.from(new Set(posts.map(p => p.category || 'Général'))), [posts]);
  const authors = useMemo(() => Array.from(new Set(posts.map(p => p.author))), [posts]);
  const tags = useMemo(() => Array.from(new Set(posts.flatMap(p => p.tags || []))), [posts]);

  const isPremium = userProfile?.isPremium || userProfile?.role === 'admin';

  const similarPosts = useMemo(() => {
    if (!selectedPost) return [];
    return posts.filter(p => 
      p.id !== selectedPost.id && 
      (p.category === selectedPost.category || 
       (p.tags && selectedPost.tags && p.tags.some((t: string) => selectedPost.tags.includes(t))))
    ).slice(0, 3);
  }, [posts, selectedPost]);

  const filteredPosts = useMemo(() => {
    let filtered = posts.filter(post => {
      const matchesSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            post.previewContent?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? (post.category || 'Général') === selectedCategory : true;
      const matchesAuthor = selectedAuthor ? post.author === selectedAuthor : true;
      const matchesTag = selectedTag ? post.tags?.includes(selectedTag) : true;
      return matchesSearch && matchesCategory && matchesAuthor && matchesTag;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return postSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [posts, searchQuery, selectedCategory, selectedAuthor, selectedTag, postSortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedAuthor, selectedTag, postSortOrder]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  useEffect(() => {
    if (!selectedPost) return;

    const commentsQuery = query(collection(db, 'comments'), where('postId', '==', selectedPost.id));
    
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      setComments(prev => ({
        ...prev,
        [selectedPost.id]: fetchedComments
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'comments');
    });

    return () => unsubscribeComments();
  }, [selectedPost]);

  useEffect(() => {
    if (!userProfile) {
      setUserReactions({});
      return;
    }

    const reactionsQuery = query(collection(db, 'commentReactions'), where('userId', '==', userProfile.uid));
    
    const unsubscribeReactions = onSnapshot(reactionsQuery, (snapshot) => {
      const newReactions: Record<string, 'like' | 'dislike'> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        newReactions[data.commentId] = data.type;
      });
      setUserReactions(newReactions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'commentReactions');
    });

    return () => unsubscribeReactions();
  }, [userProfile]);

  useEffect(() => {
    if (!selectedPost) return;

    const postReactionsQuery = query(collection(db, 'postReactions'), where('postId', '==', selectedPost.id));
    
    const unsubscribePostReactions = onSnapshot(postReactionsQuery, (snapshot) => {
      const counts: Record<string, number> = { like: 0, inspiring: 0 };
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        counts[data.type] = (counts[data.type] || 0) + 1;
      });
      setPostReactions(prev => ({
        ...prev,
        [selectedPost.id]: counts
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'postReactions');
    });

    return () => unsubscribePostReactions();
  }, [selectedPost]);

  useEffect(() => {
    if (!userProfile || !selectedPost) {
      setUserPostReactions({});
      return;
    }

    const userPostReactionsQuery = query(
      collection(db, 'postReactions'), 
      where('postId', '==', selectedPost.id),
      where('userId', '==', userProfile.uid)
    );
    
    const unsubscribeUserPostReactions = onSnapshot(userPostReactionsQuery, (snapshot) => {
      const newReactions: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        newReactions[data.postId] = data.type;
      });
      setUserPostReactions(newReactions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'postReactions');
    });

    return () => unsubscribeUserPostReactions();
  }, [userProfile, selectedPost]);

  const handlePostReaction = async (type: 'like' | 'inspiring') => {
    if (!userProfile || !selectedPost) {
      openAuthModal('login');
      return;
    }
    
    try {
      const currentReaction = userPostReactions[selectedPost.id];
      
      const reactionQuery = query(
        collection(db, 'postReactions'), 
        where('postId', '==', selectedPost.id), 
        where('userId', '==', userProfile.uid)
      );
      const reactionSnapshot = await getDocs(reactionQuery);
      
      if (currentReaction === type) {
        // Remove reaction
        if (!reactionSnapshot.empty) {
          await deleteDoc(reactionSnapshot.docs[0].ref);
        }
      } else {
        // Add or change reaction
        if (!reactionSnapshot.empty) {
          await updateDoc(reactionSnapshot.docs[0].ref, { type });
        } else {
          await addDoc(collection(db, 'postReactions'), {
            postId: selectedPost.id,
            userId: userProfile.uid,
            type
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `postReactions`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost || !userProfile) return;

    try {
      await addDoc(collection(db, 'comments'), {
        postId: selectedPost.id,
        author: userProfile.displayName || 'Anonyme',
        authorId: userProfile.uid,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        parentId: replyingTo ? replyingTo.id : null,
      });
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim() || !selectedPost || !userProfile) return;

    setIsSubmittingReply(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: selectedPost.id,
        author: userProfile.displayName || 'Anonyme',
        authorId: userProfile.uid,
        content: replyContent.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        parentId: parentId,
      });
      setReplyContent('');
      setActiveReplyId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editedCommentContent.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        content: editedCommentContent.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingCommentId(null);
      setEditedCommentContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'comments');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      
      // Also delete associated reactions
      const reactionsQuery = query(collection(db, 'commentReactions'), where('commentId', '==', commentId));
      const reactionsSnapshot = await getDocs(reactionsQuery);
      const batch = writeBatch(db);
      reactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
    }
    setCommentToDelete(null);
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!userProfile || !selectedPost) {
      openAuthModal('login');
      return;
    }
    
    try {
      const currentReaction = userReactions[commentId];
      const commentRef = doc(db, 'comments', commentId);
      
      // Find the reaction document for this user and comment
      const reactionQuery = query(
        collection(db, 'commentReactions'), 
        where('commentId', '==', commentId), 
        where('userId', '==', userProfile.uid)
      );
      const reactionSnapshot = await getDocs(reactionQuery);
      
      if (currentReaction === type) {
        // Remove reaction
        if (!reactionSnapshot.empty) {
          await deleteDoc(reactionSnapshot.docs[0].ref);
        }
        await updateDoc(commentRef, {
          [type + 's']: increment(-1)
        });
      } else {
        // Add or change reaction
        if (!reactionSnapshot.empty) {
          await updateDoc(reactionSnapshot.docs[0].ref, { type });
        } else {
          await addDoc(collection(db, 'commentReactions'), {
            commentId,
            userId: userProfile.uid,
            type
          });
        }
        
        const updates: any = {
          [type + 's']: increment(1)
        };
        if (currentReaction) {
          updates[currentReaction + 's'] = increment(-1);
        }
        await updateDoc(commentRef, updates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (postNotFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Contenu introuvable</h2>
          <button 
            onClick={() => navigate('/blog')}
            className="text-gold hover:underline"
          >
            Retour au Blogue
          </button>
        </div>
      </div>
    );
  }

  if (selectedPost) {
    const postComments = comments[selectedPost.id] || [];
    
    // Split into top-level and replies
    const topLevelComments = postComments.filter(c => !c.parentId).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      switch (commentSortOrder) {
        case 'newest': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'most_liked': return b.likes - a.likes;
        case 'least_liked': return a.likes - b.likes;
        default: return dateB - dateA;
      }
    });

    const totalCommentPages = Math.ceil(topLevelComments.length / COMMENTS_PER_PAGE);
    const paginatedTopLevel = topLevelComments.slice(
      (commentPage - 1) * COMMENTS_PER_PAGE,
      commentPage * COMMENTS_PER_PAGE
    );

    const readTime = calculateReadTime(selectedPost.content || selectedPost.fullContent || '');

    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <button 
          onClick={() => navigate('/blog')}
          className="text-gold hover:text-gold-light mb-8 flex items-center gap-2 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Retour au Blogue
        </button>
        
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-12">
            <article className="bg-obsidian-lighter rounded-2xl overflow-hidden border border-obsidian-light shadow-2xl">
              <img 
                src={selectedPost.coverImage || undefined} 
                alt={selectedPost.title} 
                className="w-full h-64 md:h-96 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-8 md:p-12">
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-gold mb-6 leading-tight">
                  {selectedPost.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-10 border-b border-obsidian-light pb-6">
                  <span>Déodatus Yosèf</span>
                  <span>•</span>
                  <span>{formatDate(selectedPost.createdAt)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {readTime} min de lecture</span>
                </div>

                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedPost.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-obsidian border border-obsidian-light rounded-full text-sm text-gray-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mb-8 flex items-center gap-4">
                  <SocialShare url={`${window.location.origin}/blog/${selectedPost.id}`} title={selectedPost.title} />
                  <FavoriteButton itemId={selectedPost.id} itemType="post" className="border border-obsidian-light" />
                </div>

                <div className="relative">
                  {/* Content Rendering */}
                  <div className={`prose prose-gold max-w-none text-gray-300 leading-relaxed text-lg ${theme === 'dark' ? 'prose-invert' : ''}`}>
                    {(userProfile?.isPremium || userProfile?.role === 'admin') || !selectedPost.isPremiumOnly ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedPost.content || selectedPost.fullContent}
                      </ReactMarkdown>
                    ) : (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedPost.previewContent}
                        </ReactMarkdown>
                        {/* The Fade Out Mask */}
                        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-obsidian-lighter to-transparent pointer-events-none" />
                      </>
                    )}
                  </div>

                  {/* Teasing CTA for non-premium */}
                  {!((userProfile?.isPremium || userProfile?.role === 'admin')) && selectedPost.isPremiumOnly && (
                    <div className="mt-8 p-8 bg-obsidian border border-mystic-purple/30 rounded-xl text-center relative z-10">
                      <Lock className="w-8 h-8 text-gold mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-100 mb-2">Contenu Réservé</h3>
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Cet enseignement est réservé aux membres Premium. Élevez votre niveau d'accès pour lire la suite et débloquer tous les mystères.
                      </p>
                      {!userProfile ? (
                        <button 
                          onClick={() => openAuthModal('login')}
                          className="px-6 py-3 bg-gold text-obsidian font-bold rounded-md hover:bg-gold-light transition-colors"
                        >
                          Se connecter pour s'abonner
                        </button>
                      ) : (
                        <button className="px-6 py-3 bg-mystic-purple-light text-white font-bold rounded-md hover:bg-mystic-purple transition-colors">
                          Devenir Premium
                        </button>
                      )}
                    </div>
                  )}

                  {/* Post Reactions */}
                  <div className="mt-12 pt-8 border-t border-obsidian-light flex items-center gap-4">
                    <button
                      onClick={() => handlePostReaction('like')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                        userPostReactions[selectedPost.id] === 'like'
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-obsidian border-obsidian-light text-gray-400 hover:text-gold hover:border-gold/50'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      <span>J'aime ({postReactions[selectedPost.id]?.like || 0})</span>
                    </button>
                    <button
                      onClick={() => handlePostReaction('inspiring')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                        userPostReactions[selectedPost.id] === 'inspiring'
                          ? 'bg-mystic-purple/20 border-mystic-purple text-mystic-purple-light'
                          : 'bg-obsidian border-obsidian-light text-gray-400 hover:text-mystic-purple-light hover:border-mystic-purple/50'
                      }`}
                    >
                      <span className="text-lg">✨</span>
                      <span>Inspirant ({postReactions[selectedPost.id]?.inspiring || 0})</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* Comments Section */}
            <div className="bg-obsidian-lighter rounded-2xl p-8 border border-obsidian-light">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h3 className="text-2xl font-serif font-bold text-gold flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" /> Discussions ({postComments.length})
                </h3>
                {postComments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    <select
                      value={commentSortOrder}
                      onChange={(e) => setCommentSortOrder(e.target.value as any)}
                      className="bg-obsidian border border-obsidian-light text-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:border-gold appearance-none cursor-pointer"
                    >
                      <option value="newest">Plus récents</option>
                      <option value="oldest">Plus anciens</option>
                      <option value="most_liked">Plus aimés</option>
                      <option value="least_liked">Moins aimés</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* Comment Form */}
              <div className="mb-10">
                {!userProfile ? (
                  <div 
                    onClick={() => openAuthModal('login')}
                    className="w-full bg-obsidian border border-obsidian-light rounded-xl p-4 text-gray-500 cursor-pointer hover:border-gold/50 hover:text-gray-300 transition-colors flex items-center h-16"
                  >
                    Connectez-vous pour commenter...
                  </div>
                ) : (
                  <div className="relative">
                    {replyingTo && (
                      <div className="flex items-center justify-between bg-obsidian-light/50 px-4 py-2 rounded-t-xl border border-b-0 border-obsidian-light">
                        <span className="text-xs text-gray-400">En réponse à <span className="text-gold font-bold">{replyingTo.author}</span></span>
                        <button 
                          onClick={() => setReplyingTo(null)}
                          className="text-gray-500 hover:text-gray-300 text-xs"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleAddComment}>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Partagez vos réflexions..."
                        className={`w-full bg-obsidian border border-obsidian-light p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent resize-none h-32 ${replyingTo ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className={`absolute bottom-4 right-4 p-2 bg-gold text-obsidian rounded-lg hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Comments List */}
              <div className={cn("space-y-6 transition-all duration-500", focusedCommentId ? "relative z-10" : "")} 
                   onClick={(e) => {
                     if (focusedCommentId && (e.target as HTMLElement).closest('.comment-card') === null) {
                       setFocusedCommentId(null);
                     }
                   }}>
                {paginatedTopLevel.length > 0 ? (
                  paginatedTopLevel.map((comment) => {
                    const replies = postComments.filter(c => c.parentId === comment.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    const isFocused = focusedCommentId === comment.id;
                    
                    return (
                      <div 
                        key={comment.id} 
                        className={cn(
                          "space-y-4 transition-all duration-500",
                          focusedCommentId && !isFocused ? "opacity-30 scale-[0.98] blur-[1px]" : "opacity-100 scale-100 blur-0"
                        )}
                      >
                        <div 
                          className={cn(
                            "comment-card bg-obsidian p-6 rounded-xl border relative group transition-all duration-500 cursor-pointer",
                            isFocused ? "border-gold shadow-[0_0_30px_rgba(212,175,55,0.2)] ring-1 ring-gold/20 translate-y-[-4px]" : "border-obsidian-light hover:border-gold/30"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedCommentId(isFocused ? null : comment.id);
                          }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="font-bold text-gray-200">{comment.author}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                              {userProfile?.uid === comment.authorId && (
                                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditedCommentContent(comment.content);
                                    }}
                                    className="text-gray-500 hover:text-gold"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setCommentToDelete(comment.id)}
                                    className="text-gray-500 hover:text-red-400"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="mb-4">
                              <textarea
                                value={editedCommentContent}
                                onChange={(e) => setEditedCommentContent(e.target.value)}
                                className="w-full bg-obsidian-light border border-obsidian-lighter p-3 text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold resize-none h-24 mb-2"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={!editedCommentContent.trim()}
                                  className="px-3 py-1 text-sm bg-gold text-obsidian rounded hover:bg-gold-light disabled:opacity-50 transition-colors"
                                >
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 leading-relaxed mb-4">{comment.content}</p>
                          )}
                          
                          {/* Reactions & Reply */}
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => handleReaction(comment.id, 'like')}
                                className={`flex items-center gap-1 text-sm transition-colors ${userReactions[comment.id] === 'like' ? 'text-gold' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                <ThumbsUp className="w-4 h-4" /> {comment.likes}
                              </button>
                              <button 
                                onClick={() => handleReaction(comment.id, 'dislike')}
                                className={`flex items-center gap-1 text-sm transition-colors ${userReactions[comment.id] === 'dislike' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                <ThumbsDown className="w-4 h-4" /> {comment.dislikes}
                              </button>
                            </div>
                            <div className="w-px h-4 bg-obsidian-light"></div>
                            <button
                              onClick={() => {
                                if (!userProfile) {
                                  openAuthModal('login');
                                  return;
                                }
                                setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                                setReplyContent('');
                              }}
                              className={`text-sm transition-colors flex items-center gap-1 ${activeReplyId === comment.id ? 'text-gold' : 'text-gray-500 hover:text-gold'}`}
                            >
                              Répondre
                            </button>
                          </div>
                          
                          {/* Inline Reply Form */}
                          <AnimatePresence>
                            {activeReplyId === comment.id && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-obsidian-light overflow-hidden"
                              >
                                <div className="relative">
                                  <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`Répondre à ${comment.author}...`}
                                    autoFocus
                                    className="w-full bg-obsidian-light border border-obsidian-lighter p-3 text-sm text-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gold resize-none h-24"
                                  />
                                  <div className="flex justify-end gap-3 mt-2">
                                    <button
                                      onClick={() => setActiveReplyId(null)}
                                      className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                                    >
                                      Annuler
                                    </button>
                                    <button
                                      onClick={() => handleReplySubmit(comment.id)}
                                      disabled={!replyContent.trim() || isSubmittingReply}
                                      className="px-4 py-2 text-xs font-bold bg-gold text-obsidian rounded-lg hover:bg-gold-light disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                      {isSubmittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                      Répondre
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Nested Replies */}
                        {replies.length > 0 && (
                          <div className="pl-8 space-y-4 border-l-2 border-obsidian-light/50 ml-4">
                            {replies.map(reply => (
                              <div key={reply.id} className="bg-obsidian-lighter/30 p-5 rounded-xl border border-obsidian-light relative group transition-all duration-300">
                                <div className="flex justify-between items-start mb-3">
                                  <span className="font-bold text-gray-300 text-sm">{reply.author}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-gray-500">{formatDate(reply.createdAt)}</span>
                                    {userProfile?.uid === reply.authorId && (
                                      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => {
                                            setEditingCommentId(reply.id);
                                            setEditedCommentContent(reply.content);
                                          }}
                                          className="text-gray-500 hover:text-gold"
                                          title="Modifier"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button 
                                          onClick={() => setCommentToDelete(reply.id)}
                                          className="text-gray-500 hover:text-red-400"
                                          title="Supprimer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {editingCommentId === reply.id ? (
                                  <div className="mb-3">
                                    <textarea
                                      value={editedCommentContent}
                                      onChange={(e) => setEditedCommentContent(e.target.value)}
                                      className="w-full bg-obsidian-light border border-obsidian-lighter p-2 text-sm text-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gold resize-none h-16 mb-2"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setEditingCommentId(null)}
                                        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        onClick={() => handleEditComment(reply.id)}
                                        disabled={!editedCommentContent.trim()}
                                        className="px-2 py-1 text-xs bg-gold text-obsidian rounded hover:bg-gold-light disabled:opacity-50 transition-colors"
                                      >
                                        Enregistrer
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 leading-relaxed text-sm mb-3">{reply.content}</p>
                                )}
                                
                                <div className="flex items-center gap-4">
                                  <button 
                                    onClick={() => handleReaction(reply.id, 'like')}
                                    className={`flex items-center gap-1 text-xs transition-colors ${userReactions[reply.id] === 'like' ? 'text-gold' : 'text-gray-500 hover:text-gray-300'}`}
                                  >
                                    <ThumbsUp className="w-3 h-3" /> {reply.likes}
                                  </button>
                                  <button 
                                    onClick={() => handleReaction(reply.id, 'dislike')}
                                    className={`flex items-center gap-1 text-xs transition-colors ${userReactions[reply.id] === 'dislike' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                                  >
                                    <ThumbsDown className="w-3 h-3" /> {reply.dislikes}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-8">Soyez le premier à partager vos pensées sur cet article.</p>
                )}
              </div>

              {/* Comment Pagination */}
              {totalCommentPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setCommentPage(p => Math.max(1, p - 1))}
                    disabled={commentPage === 1}
                    className="px-3 py-1 bg-obsidian border border-obsidian-light rounded-md text-gray-400 hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Précédent
                  </button>
                  {Array.from({ length: totalCommentPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCommentPage(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        commentPage === page 
                          ? 'bg-gold text-obsidian' 
                          : 'bg-obsidian border border-obsidian-light text-gray-400 hover:text-gold'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCommentPage(p => Math.min(totalCommentPages, p + 1))}
                    disabled={commentPage === totalCommentPages}
                    className="px-3 py-1 bg-obsidian border border-obsidian-light rounded-md text-gray-400 hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>

            {/* Similar Posts Section */}
            {similarPosts.length > 0 && (
              <div className="mt-12">
                <h3 className="text-2xl font-serif font-bold text-gray-100 mb-6 border-b border-obsidian-light pb-2">Articles Similaires</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {similarPosts.map(post => (
                    <div 
                      key={post.id} 
                      className="bg-obsidian-lighter rounded-xl overflow-hidden border border-obsidian-light hover:border-gold/30 transition-colors cursor-pointer group flex flex-col"
                      onClick={() => {
                        navigate('/blog/' + post.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <div className="h-32 overflow-hidden bg-obsidian">
                        <img 
                          src={post.coverImage || post.mediaUrl || undefined} 
                          alt={post.title} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <h4 className="text-md font-bold text-gray-200 group-hover:text-gold transition-colors line-clamp-2 mb-2">{post.title}</h4>
                        <div className="mt-auto text-xs text-gray-500 flex justify-between items-center">
                          <span>{post.category || 'Général'}</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light sticky top-24 shadow-lg">
              <h4 className="text-lg font-serif font-bold text-gray-100 mb-4 border-b border-obsidian-light pb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" />
                Articles Récents
              </h4>
              <div className="space-y-3">
                {posts.filter(p => p.id !== selectedPost.id).slice(0, 3).map(post => (
                  <div 
                    key={post.id} 
                    className="group cursor-pointer p-3 rounded-xl hover:bg-obsidian transition-all border border-transparent hover:border-obsidian-light"
                    onClick={() => {
                      navigate('/blog/' + post.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <h5 className="text-sm font-medium text-gray-300 group-hover:text-gold transition-colors line-clamp-2 mb-2">{post.title}</h5>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/50"></span>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {commentToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-obsidian-lighter border border-obsidian-light rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold text-gray-100 mb-4">Supprimer le commentaire ?</h3>
                <p className="text-gray-400 mb-6">Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?</p>
                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setCommentToDelete(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={() => handleDeleteComment(commentToDelete)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        <ImageCarousel page="blog" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        {banner?.isActive && banner?.imageUrl && (
        <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl border border-obsidian-light">
          {banner.linkUrl ? (
            <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <img src={banner.imageUrl || undefined} alt="Blog Banner" className="w-full h-auto max-h-64 object-cover" referrerPolicy="no-referrer" />
            </a>
          ) : (
            <img src={banner.imageUrl || undefined} alt="Blog Banner" className="w-full h-auto max-h-64 object-cover" referrerPolicy="no-referrer" />
          )}
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gold mb-4">Le Blogue Initiatique</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Explorez les textes, réflexions et enseignements ésotériques partagés par Déodatus Yosèf.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-1/4 space-y-8">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full pl-12 pr-4 py-3 bg-obsidian-lighter border border-obsidian-light rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all shadow-lg"
            />
          </div>

          {/* Categories Filter */}
          <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light">
            <h3 className="text-lg font-serif font-bold text-gray-100 mb-4 border-b border-obsidian-light pb-2">Catégories</h3>
            <select
              value={selectedCategory || ''}
              onChange={(e) => { setSelectedCategory(e.target.value || null); setCurrentPage(1); }}
              className="w-full bg-obsidian border border-obsidian-light text-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-gold"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Authors Filter */}
          <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light">
            <h3 className="text-lg font-serif font-bold text-gray-100 mb-4 border-b border-obsidian-light pb-2">Auteurs</h3>
            <select
              value={selectedAuthor || ''}
              onChange={(e) => { setSelectedAuthor(e.target.value || null); setCurrentPage(1); }}
              className="w-full bg-obsidian border border-obsidian-light text-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-gold"
            >
              <option value="">Tous les auteurs</option>
              {authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* Tags Filter */}
          {tags.length > 0 && (
            <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light">
              <h3 className="text-lg font-serif font-bold text-gray-100 mb-4 border-b border-obsidian-light pb-2">Mots-clés</h3>
              <select
                value={selectedTag || ''}
                onChange={(e) => { setSelectedTag(e.target.value || null); setCurrentPage(1); }}
                className="w-full bg-obsidian border border-obsidian-light text-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-gold"
              >
                <option value="">Tous les mots-clés</option>
                {tags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Filter */}
          <div className="bg-obsidian-lighter rounded-2xl p-6 border border-obsidian-light">
            <h3 className="text-lg font-serif font-bold text-gray-100 mb-4 border-b border-obsidian-light pb-2">Trier par date</h3>
            <select
              value={postSortOrder}
              onChange={(e) => { setPostSortOrder(e.target.value as 'newest' | 'oldest'); setCurrentPage(1); }}
              className="w-full bg-obsidian border border-obsidian-light text-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-gold"
            >
              <option value="newest">Plus récents d'abord</option>
              <option value="oldest">Plus anciens d'abord</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          {/* Posts Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-obsidian-lighter rounded-xl overflow-hidden border border-obsidian-light animate-pulse flex flex-col h-[400px]">
                  <div className="h-48 bg-obsidian shrink-0"></div>
                  <div className="p-6 flex flex-col flex-grow space-y-4">
                    <div className="flex justify-between">
                      <div className="h-4 bg-obsidian rounded w-1/4"></div>
                      <div className="h-4 bg-obsidian rounded w-1/4"></div>
                    </div>
                    <div className="h-8 bg-obsidian rounded w-3/4"></div>
                    <div className="space-y-2 flex-grow">
                      <div className="h-4 bg-obsidian rounded w-full"></div>
                      <div className="h-4 bg-obsidian rounded w-full"></div>
                      <div className="h-4 bg-obsidian rounded w-2/3"></div>
                    </div>
                    <div className="flex justify-between mt-auto">
                      <div className="h-4 bg-obsidian rounded w-1/4"></div>
                      <div className="h-4 bg-obsidian rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {paginatedPosts.map((post, index) => {
                const readTime = calculateReadTime(post.content || post.fullContent || '');
                return (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-obsidian-lighter rounded-xl overflow-hidden border border-obsidian-light hover:border-gold/30 transition-all cursor-pointer group flex flex-col"
                    onClick={() => navigate('/blog/' + post.id)}
                  >
                    <div className={cn(
                      "h-48 overflow-hidden relative shrink-0",
                      post.isPremiumOnly ? "after:absolute after:inset-0 after:border-2 after:border-gold/50 after:rounded-t-xl" : ""
                    )}>
                      <img 
                        src={post.coverImage || undefined} 
                        alt={post.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {post.isPremiumOnly && (
                        <div className="absolute top-4 right-4 bg-gold text-obsidian px-3 py-1 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-tighter shadow-lg shadow-black/40">
                          <Lock className="w-3 h-3" /> Premium
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "p-6 flex flex-col flex-grow border-t-0",
                      post.isPremiumOnly ? "border-x border-b border-gold/30 rounded-b-xl" : ""
                    )}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-mystic-purple-light font-bold uppercase tracking-wider bg-mystic-purple/20 px-2 py-1 rounded">
                            {post.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {readTime} min
                        </div>
                      </div>
                      <h2 className="text-2xl font-serif font-bold text-gray-100 mb-3 group-hover:text-gold transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-gray-400 line-clamp-3 text-sm leading-relaxed flex-grow">
                        {post.previewContent}
                      </p>
                      {post.tags && post.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-1 bg-obsidian border border-obsidian-light rounded text-xs text-gray-400">
                              #{tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="px-2 py-1 bg-obsidian border border-obsidian-light rounded text-xs text-gray-400">
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-6 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Par {post.author}</span>
                        <div className="flex items-center text-gold text-sm font-medium">
                          Lire l'article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">Aucun article ne correspond à votre recherche.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-obsidian-lighter border border-obsidian-light text-gray-400 hover:text-gold hover:border-gold/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-gold text-obsidian' 
                      : 'bg-obsidian-lighter border border-obsidian-light text-gray-400 hover:text-gold hover:border-gold/50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-obsidian-lighter border border-obsidian-light text-gray-400 hover:text-gold hover:border-gold/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
