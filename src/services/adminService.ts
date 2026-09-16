import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import {
  initializeApp as createFirebaseApp,
  deleteApp,
} from 'firebase/app';
import {
  getAuth as getSecondaryAuth,
  createUserWithEmailAndPassword,
  signOut as secondarySignOut,
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole, UserStatus } from '../types/auth';
import { ADMIN_EMAIL, ADMIN_UID } from '../types';
import {
  getCachedUsersList,
  setCachedUsersList,
  getCachedUserProfile,
  setCachedUserProfile,
} from '../utils/storage';

/**
 * S'assure que le profil de l'administrateur courant est bien présent et à jour dans Firestore
 * avec role = 'admin' et status = 'approved', afin de valider sans accroc les règles de sécurité Firestore.
 */
export async function ensureAdminDocExists(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const email = (currentUser.email || '').toLowerCase().trim();
  if (email === ADMIN_EMAIL.toLowerCase() || currentUser.uid === ADMIN_UID) {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: currentUser.uid,
          email: currentUser.email,
          role: 'admin',
          status: 'approved',
          derniereConnexion: new Date().toISOString(),
        },
        { merge: true }
      );

      const adminDocRef = doc(db, 'admins', currentUser.uid);
      await setDoc(
        adminDocRef,
        {
          uid: currentUser.uid,
          email: currentUser.email,
          role: 'admin',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Vérification profil administrateur Firestore différée :', e);
    }
  }
}

/**
 * Récupère la liste de tous les utilisateurs enregistrés (Email, Date d'inscription, Rôle, Statut).
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    if (auth.currentUser) {
      await ensureAdminDocExists().catch(() => {});
    }

    const usersColl = collection(db, 'users');
    const snapshot = await getDocs(usersColl);
    const userList: UserProfile[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      userList.push({
        uid: data.uid || d.id,
        email: data.email || '',
        role: (data.role as UserRole) || 'user',
        status: (data.status as UserStatus) || 'pending',
        createdAt: data.createdAt || data.dateCreation || new Date().toISOString(),
      });
    });

    // S'assurer que le super-administrateur principal figure toujours dans la liste
    const hasAdmin = userList.some(
      (u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );
    if (!hasAdmin) {
      userList.unshift({
        uid: 'admin-primary',
        email: ADMIN_EMAIL,
        role: 'admin',
        status: 'approved',
        createdAt: '2026-09-01T00:00:00.000Z',
      });
    }

    userList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setCachedUsersList(
      userList.map((u) => ({
        ...u,
        dateCreation: u.createdAt,
      }))
    );

    return userList;
  } catch (error) {
    console.warn('Erreur getAllUsers Firestore, bascule sur le cache local :', error);
    const cached = getCachedUsersList();
    return cached.map((c) => ({
      uid: c.uid,
      email: c.email,
      role: c.role,
      status: c.status,
      createdAt: c.dateCreation || new Date().toISOString(),
    }));
  }
}

/**
 * Abonnement en temps réel aux utilisateurs enregistrés.
 */
export function subscribeToUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  if (auth.currentUser) {
    ensureAdminDocExists().catch(() => {});
  }

  const usersColl = collection(db, 'users');
  return onSnapshot(
    usersColl,
    (snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        userList.push({
          uid: data.uid || d.id,
          email: data.email || '',
          role: (data.role as UserRole) || 'user',
          status: (data.status as UserStatus) || 'pending',
          createdAt: data.createdAt || data.dateCreation || new Date().toISOString(),
        });
      });

      const hasAdmin = userList.some(
        (u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      );
      if (!hasAdmin) {
        userList.unshift({
          uid: 'admin-primary',
          email: ADMIN_EMAIL,
          role: 'admin',
          status: 'approved',
          createdAt: '2026-09-01T00:00:00.000Z',
        });
      }

      userList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setCachedUsersList(
        userList.map((u) => ({
          ...u,
          dateCreation: u.createdAt,
        }))
      );

      onUpdate(userList);
    },
    (err) => {
      console.warn('Erreur écoute temps réel utilisateurs :', err);
      const cached = getCachedUsersList();
      if (cached.length > 0) {
        onUpdate(
          cached.map((c) => ({
            uid: c.uid,
            email: c.email,
            role: c.role,
            status: c.status,
            createdAt: c.dateCreation || new Date().toISOString(),
          }))
        );
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Modifie le statut d'un utilisateur ('approved', 'disabled', ou 'pending').
 */
export async function updateUserStatus(
  uid: string,
  newStatus: UserStatus
): Promise<void> {
  // 1. Mettre à jour immédiatement le cache local
  const cached = getCachedUsersList();
  const targetUserInCache = cached.find((u) => u.uid === uid);
  const updated = cached.map((u) =>
    u.uid === uid ? { ...u, status: newStatus } : u
  );
  setCachedUsersList(updated);

  const single = getCachedUserProfile(uid);
  if (single) {
    setCachedUserProfile({ ...single, status: newStatus });
  }

  // 2. Synchroniser avec Firestore si l'utilisateur est connecté
  if (auth.currentUser) {
    const targetUid =
      uid === 'admin-primary' && auth.currentUser
        ? auth.currentUser.uid
        : uid;

    try {
      await ensureAdminDocExists();

      const userDocRef = doc(db, 'users', targetUid);
      await setDoc(
        userDocRef,
        {
          uid: targetUid,
          status: newStatus,
          ...(targetUserInCache?.email ? { email: targetUserInCache.email } : {}),
          ...(targetUserInCache?.role ? { role: targetUserInCache.role } : {}),
          dateModification: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (firestoreError: any) {
      console.warn('Information synchronisation statut Firestore :', firestoreError?.message || firestoreError);
      try {
        const userDocRef = doc(db, 'users', targetUid);
        await setDoc(userDocRef, { status: newStatus }, { merge: true });
      } catch (retryErr: any) {
        console.warn('Mise à jour statut préservée localement :', retryErr?.message || retryErr);
      }
    }
  }
}

/**
 * Supprime un utilisateur de Firestore ainsi que l'ensemble de ses données.
 */
export async function deleteUserAndData(uid: string): Promise<void> {
  // 1. Nettoyage local immédiat
  const cached = getCachedUsersList();
  setCachedUsersList(cached.filter((u) => u.uid !== uid));

  // 2. Si connecté à Firebase en tant qu'admin, nettoyer Firestore
  const isAuthAdmin =
    auth.currentUser &&
    ((auth.currentUser.email || '').toLowerCase().trim() === ADMIN_EMAIL.toLowerCase() ||
      auth.currentUser.uid === ADMIN_UID);

  if (isAuthAdmin && auth.currentUser) {
    try {
      await ensureAdminDocExists();

      const spacesColl = collection(db, 'users', uid, 'spaces');
      const projectsColl = collection(db, 'users', uid, 'projects');
      const tasksColl = collection(db, 'users', uid, 'tasks');

      const [spacesSnap, projectsSnap, tasksSnap] = await Promise.all([
        getDocs(spacesColl).catch(() => null),
        getDocs(projectsColl).catch(() => null),
        getDocs(tasksColl).catch(() => null),
      ]);

      const batch = writeBatch(db);
      spacesSnap?.forEach((d) => batch.delete(d.ref));
      projectsSnap?.forEach((d) => batch.delete(d.ref));
      tasksSnap?.forEach((d) => batch.delete(d.ref));

      const userDocRef = doc(db, 'users', uid);
      batch.delete(userDocRef);

      await batch.commit();
    } catch (error) {
      console.warn('Suppression batch échouée, tentative directe :', error);
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (e) {
        console.warn('Erreur finale suppression Firestore (conservé en local) :', e);
      }
    }
  }
}

/**
 * Permet à l'administrateur de créer directement un compte utilisateur pré-approuvé (role: 'user', status: 'approved').
 */
export async function createPreApprovedUser(
  email: string,
  password?: string,
  displayName?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

  let uid = '';
  const pwd = password && password.length >= 6 ? password : 'TempPassword123!';

  try {
    const secondaryApp = createFirebaseApp(firebaseConfig, `admin-sec-${Date.now()}`);
    const secondaryAuth = getSecondaryAuth(secondaryApp);
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, pwd);
    uid = userCred.user.uid;
    await secondarySignOut(secondaryAuth);
    await deleteApp(secondaryApp);
  } catch (authError: any) {
    if (authError.code === 'auth/email-already-in-use') {
      throw new Error('Un compte existe déjà avec cette adresse e-mail.');
    }
    if (authError.code === 'auth/weak-password') {
      throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
    }
    // Génération UID de secours si l'instance secondaire ne peut contacter Auth
    uid = 'admin-created-' + btoa(cleanEmail).replace(/=/g, '').substring(0, 16);
  }

  const now = new Date().toISOString();
  const newProfile: UserProfile = {
    uid,
    email: cleanEmail,
    role: isAdmin ? 'admin' : 'user',
    status: 'approved', // Statut pré-approuvé d'office par l'admin
    createdAt: now,
  };

  // Mettre à jour le cache
  const cached = getCachedUsersList();
  setCachedUsersList([
    {
      uid: newProfile.uid,
      email: newProfile.email,
      displayName: displayName?.trim() || cleanEmail.split('@')[0],
      role: newProfile.role,
      status: newProfile.status,
      dateCreation: now,
    },
    ...cached.filter((u) => u.uid !== uid),
  ]);

  // Si connecté Firebase, synchroniser dans Firestore
  if (auth.currentUser) {
    try {
      await ensureAdminDocExists();
      const userDocRef = doc(db, 'users', uid);
      await setDoc(
        userDocRef,
        {
          ...newProfile,
          displayName: displayName?.trim() || cleanEmail.split('@')[0],
          dateCreation: now,
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Sauvegarde Firestore création utilisateur différée :', fsErr);
    }
  }

  return newProfile;
}

export interface AdminDiagnosticResult {
  isAuthenticated: boolean;
  uid: string | null;
  email: string | null;
  isAnonymous: boolean;
  canReadUsers: boolean;
  readUsersError?: string;
  canWriteAdminDoc: boolean;
  writeAdminDocError?: string;
  canWriteUserDoc: boolean;
  writeUserDocError?: string;
}

/**
 * Exécute un diagnostic direct des permissions Firebase Auth et Firestore
 */
export async function testAdminPermissions(): Promise<AdminDiagnosticResult> {
  const currentUser = auth.currentUser;
  const result: AdminDiagnosticResult = {
    isAuthenticated: Boolean(currentUser),
    uid: currentUser ? currentUser.uid : null,
    email: currentUser ? currentUser.email : null,
    isAnonymous: currentUser ? currentUser.isAnonymous : false,
    canReadUsers: false,
    canWriteAdminDoc: false,
    canWriteUserDoc: false,
  };

  if (!currentUser) {
    result.readUsersError = "Aucun utilisateur n'est connecté dans Firebase Auth.";
    return result;
  }

  // 1. Test lecture users
  try {
    const snap = await getDocs(collection(db, 'users'));
    result.canReadUsers = true;
  } catch (err: any) {
    result.readUsersError = err?.message || String(err);
  }

  // 2. Test écriture doc admin
  try {
    const adminRef = doc(db, 'admins', currentUser.uid);
    await setDoc(
      adminRef,
      {
        uid: currentUser.uid,
        email: currentUser.email,
        role: 'admin',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    result.canWriteAdminDoc = true;
  } catch (err: any) {
    result.writeAdminDocError = err?.message || String(err);
  }

  // 3. Test écriture doc profil
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(
      userRef,
      {
        role: 'admin',
        status: 'approved',
        derniereVerification: new Date().toISOString(),
      },
      { merge: true }
    );
    result.canWriteUserDoc = true;
  } catch (err: any) {
    result.writeUserDocError = err?.message || String(err);
  }

  return result;
}
