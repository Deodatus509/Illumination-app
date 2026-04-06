import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UserRole = 'admin' | 'client' | 'editor' | 'supporteur' | 'author';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  isPremium: boolean;
  createdAt: string;
  subscription?: string;
  progress?: number;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  isAdmin: (userId?: string) => boolean | Promise<boolean>;
  isEditor: () => boolean;
  isSupporteur: () => boolean;
  isAuthor: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        
        // Check if it exists first to create it if needed
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: user.email === 'dieudonnejose41@gmail.com' ? 'admin' : 'client',
            isPremium: false,
            createdAt: new Date().toISOString(),
            subscription: 'free',
            progress: 0,
          };
          await setDoc(userRef, newProfile);
        } else {
          const data = userSnap.data() as UserProfile;
          if (user.email === 'dieudonnejose41@gmail.com' && data.role !== 'admin') {
            await setDoc(userRef, { role: 'admin' }, { merge: true });
          }
        }

        // Listen for real-time updates
        import('firebase/firestore').then(({ onSnapshot }) => {
          profileUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            }
          });
          
          // Also check if user is blocked
          const privateDocRef = doc(db, 'users', user.uid, 'private', 'profile');
          getDoc(privateDocRef).then(privateSnap => {
            if (privateSnap.exists() && privateSnap.data().isBlocked) {
              alert("Votre compte a été bloqué par un administrateur.");
              auth.signOut();
            }
          });
        });
      } else {
        setUserProfile(null);
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  const isAdmin = (userId?: string): boolean | Promise<boolean> => {
    if (userId) {
      if (userProfile?.uid === userId) {
        return userProfile?.role === 'admin';
      }
      return getDoc(doc(db, 'users', userId)).then(snap => {
        if (snap.exists()) {
          return snap.data().role === 'admin';
        }
        return false;
      }).catch(() => false);
    }
    return userProfile?.role === 'admin';
  };

  const isEditor = (): boolean => {
    return userProfile?.role === 'editor' || userProfile?.role === 'admin';
  };

  const isSupporteur = (): boolean => {
    return userProfile?.role === 'supporteur' || userProfile?.role === 'admin';
  };

  const isAuthor = (): boolean => {
    return userProfile?.role === 'author' || userProfile?.role === 'admin';
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      closeAuthModal();
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      closeAuthModal();
    } catch (error) {
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        photoURL: null,
        role: user.email === 'dieudonnejose41@gmail.com' ? 'admin' : 'client',
        isPremium: false,
        createdAt: new Date().toISOString(),
        subscription: 'free',
        progress: 0,
      };
      await setDoc(userRef, newProfile);
      setUserProfile(newProfile);
      closeAuthModal();
    } catch (error) {
      console.error('Error registering with Email', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
      <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      loading, 
      loginWithGoogle, 
      loginWithEmail,
      registerWithEmail,
      logout,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      isAdmin,
      isEditor,
      isSupporteur,
      isAuthor
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
