import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
import { UserRole, UserStatus, UserProfile } from '../types/auth';
import { ADMIN_EMAIL, ADMIN_UID } from '../types';
import { syncUserProfile, subscribeToUserProfile } from '../services/firestoreService';
import {
  getCachedUserProfile,
  setCachedUserProfile,
} from '../utils/storage';

export interface AppUser extends UserProfile {
  displayName?: string | null;
  dateCreation?: string;
  isAnonymous?: boolean;
  isLocalFallback?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  loginWithLocalSession: (email: string) => void;
  refreshStatus: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'todolist_active_user_session';

export function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/unauthorized-domain':
      return "Le domaine actuel de votre application n'est pas autorisé dans Firebase Authentication (Authentication > Paramètres > Domaines autorisés).";
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

  // Synchronisation du profil et abonnement temps réel
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    // 1. Vérifier s'il y a une session locale de secours
    try {
      const savedLocal = localStorage.getItem(LOCAL_USER_KEY);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal) as AppUser;
        if (parsed && parsed.uid) {
          const isEmailAdmin = (parsed.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
          const effectiveUser: AppUser = {
            ...parsed,
            role: isEmailAdmin ? 'admin' : (parsed.role || 'user'),
            status: isEmailAdmin ? 'approved' : (parsed.status || 'pending'),
            createdAt: parsed.createdAt || parsed.dateCreation || new Date().toISOString(),
          };
          setUser(effectiveUser);
          setLoading(false);
        }
      }
    } catch {
      // Ignorer
    }

    // 2. Écouter l'état d'authentification Firebase Auth
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (currentUser) {
        const userEmail = currentUser.email || (currentUser.isAnonymous ? 'invite@todolist.local' : '');
        const cleanEmail = userEmail.toLowerCase();
        const isAdminEmail =
          cleanEmail === ADMIN_EMAIL.toLowerCase() || currentUser.uid === ADMIN_UID;

        // Rôles et statuts obligatoires selon le cahier des charges :
        // squeva11@gmail.com (ou UID: G1Dm03dHRvPelWT8c2ydqXLC1Y93) => role 'admin', status 'approved'
        // tout autre utilisateur => role 'user', status 'pending'
        const initialRole: UserRole = isAdminEmail ? 'admin' : 'user';
        const initialStatus: UserStatus = isAdminEmail ? 'approved' : 'pending';

        const initialAppUser: AppUser = {
          uid: currentUser.uid,
          email: userEmail,
          displayName: currentUser.displayName,
          role: initialRole,
          status: initialStatus,
          createdAt: currentUser.metadata.creationTime || new Date().toISOString(),
          dateCreation: currentUser.metadata.creationTime || new Date().toISOString(),
          isAnonymous: currentUser.isAnonymous,
          isLocalFallback: false,
        };
        setUser(initialAppUser);
        setLoading(false);

        try {
          localStorage.removeItem(LOCAL_USER_KEY);
        } catch {
          // Ignorer
        }

        // Synchroniser le profil dans Firestore et récupérer rôle/statut persistés
        try {
          const profile = await syncUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
          });

          setUser({
            uid: currentUser.uid,
            email: currentUser.email || profile.email,
            displayName: currentUser.displayName || profile.displayName,
            role: isAdminEmail ? 'admin' : profile.role,
            status: isAdminEmail ? 'approved' : profile.status,
            createdAt: profile.dateCreation || new Date().toISOString(),
            dateCreation: profile.dateCreation,
            isAnonymous: currentUser.isAnonymous,
            isLocalFallback: false,
          });

          // Écouter les mises à jour en direct (ex: validation de l'admin en temps réel)
          profileUnsub = subscribeToUserProfile(currentUser.uid, (updatedProfile) => {
            setUser((prev) => {
              if (!prev || prev.uid !== currentUser.uid) return prev;
              return {
                ...prev,
                role: isAdminEmail ? 'admin' : updatedProfile.role,
                status: isAdminEmail ? 'approved' : updatedProfile.status,
                displayName: updatedProfile.displayName || prev.displayName,
              };
            });
          });
        } catch (profileErr) {
          console.warn('Initialisation profil Firestore différée :', profileErr);
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
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const refreshStatus = async () => {
    if (!user?.uid) return;
    try {
      const profile = await syncUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      const isAdminEmail =
        (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
        user.uid === ADMIN_UID;
      setUser((prev) =>
        prev
          ? {
              ...prev,
              role: isAdminEmail ? 'admin' : profile.role,
              status: isAdminEmail ? 'approved' : profile.status,
            }
          : null
      );
    } catch (err) {
      console.warn('Rafraîchissement statut impossible :', err);
    }
  };

  const refreshUserProfile = refreshStatus;

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
    const isEmailAdmin = cleanEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const uid = 'user-' + btoa(cleanEmail).replace(/=/g, '').substring(0, 16);

    const cached = getCachedUserProfile(uid);

    const localUser: AppUser = {
      uid,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      role: isEmailAdmin ? 'admin' : (cached?.role || 'user'),
      status: isEmailAdmin ? 'approved' : (cached?.status || 'pending'),
      createdAt: cached?.dateCreation || new Date().toISOString(),
      dateCreation: cached?.dateCreation || new Date().toISOString(),
      isLocalFallback: true,
    };

    setCachedUserProfile({
      uid: localUser.uid,
      email: cleanEmail,
      displayName: localUser.displayName,
      role: localUser.role,
      status: localUser.status,
      dateCreation: localUser.dateCreation || new Date().toISOString(),
    });

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

  const isAdmin = Boolean(
    user &&
      (user.role === 'admin' ||
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
        user.uid === ADMIN_UID)
  );

  const isApproved = Boolean(
    user && (isAdmin || user.status === 'approved')
  );

  const userProfile: UserProfile | null = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email || '',
      role: user.role,
      status: user.status,
      createdAt: user.createdAt || user.dateCreation || new Date().toISOString(),
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        isApproved,
        login,
        signup,
        loginWithGoogle,
        loginAnonymously,
        loginWithLocalSession,
        refreshStatus,
        refreshUserProfile,
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

