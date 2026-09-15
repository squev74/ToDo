import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  isAnonymous?: boolean;
  isLocalFallback?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  loginWithLocalSession: (email: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'todolist_active_user_session';

export function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/operation-not-allowed':
      return "Le fournisseur d'authentification Email/Mot de passe n'est pas encore activé dans votre console Firebase (Authentication > Sign-in method). Vous pouvez utiliser l'accès direct ci-dessous ou activer ce fournisseur dans Firebase.";
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà associée à un compte existant.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Veuillez patienter un instant.';
    case 'auth/network-request-failed':
      return 'Problème de connexion réseau. Veuillez vérifier votre accès Internet.';
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion Google a été fermée.';
    default:
      return 'Une erreur est survenue lors de l’authentification. Veuillez réessayer.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Vérifier d'abord s'il y a une session locale de secours
    try {
      const savedLocal = localStorage.getItem(LOCAL_USER_KEY);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal) as AppUser;
        if (parsed && parsed.uid) {
          setUser(parsed);
          setLoading(false);
        }
      }
    } catch {
      // Ignorer
    }

    // 2. Écouter l'état d'authentification Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email || (currentUser.isAnonymous ? 'Invité (Anonyme)' : null),
          displayName: currentUser.displayName,
          isAnonymous: currentUser.isAnonymous,
          isLocalFallback: false,
        });
        try {
          localStorage.removeItem(LOCAL_USER_KEY);
        } catch {
          // Ignorer
        }
      } else {
        // Ne réinitialiser que si on n'avait pas de session locale de secours
        try {
          const savedLocal = localStorage.getItem(LOCAL_USER_KEY);
          if (!savedLocal) {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAnonymously = async () => {
    await signInAnonymously(auth);
  };

  const loginWithLocalSession = (email: string) => {
    const cleanEmail = email.trim() || 'utilisateur@demo.local';
    const localUser: AppUser = {
      uid: 'user-' + btoa(cleanEmail).replace(/=/g, '').substring(0, 16),
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      isLocalFallback: true,
    };
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
    } catch {
      // Ignorer
    }
    setUser(localUser);
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_USER_KEY);
    } catch {
      // Ignorer
    }
    setUser(null);
    try {
      await signOut(auth);
    } catch {
      // Ignorer
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        loginAnonymously,
        loginWithLocalSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
