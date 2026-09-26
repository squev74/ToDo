import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { KnowledgeDoc } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || null,
    },
    operationType,
    path,
  };
  console.error('Firestore KnowledgeBase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Récupère l'ensemble des SOP / documents de la base de connaissance pour un utilisateur donné.
 */
export async function fetchKnowledgeDocs(userId: string): Promise<KnowledgeDoc[]> {
  const path = `users/${userId}/knowledgeDocs`;
  try {
    const collRef = collection(db, 'users', userId, 'knowledgeDocs');
    const snapshot = await getDocs(collRef);
    const docs: KnowledgeDoc[] = [];

    snapshot.forEach((firestoreDoc) => {
      const data = firestoreDoc.data();
      docs.push({
        id: firestoreDoc.id,
        spaceId: data.spaceId || undefined,
        title: data.title || '',
        category: data.category || 'other',
        tags: Array.isArray(data.tags) ? data.tags : [],
        contentHtml: data.contentHtml || '',
        summary: data.summary || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, userId);
    return [];
  }
}

/**
 * Enregistre ou met à jour une fiche de connaissance dans Firestore.
 */
export async function saveKnowledgeDoc(userId: string, kbDoc: KnowledgeDoc): Promise<void> {
  const path = `users/${userId}/knowledgeDocs/${kbDoc.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'knowledgeDocs', kbDoc.id);
    const payload = {
      id: kbDoc.id,
      spaceId: kbDoc.spaceId || null,
      title: kbDoc.title,
      category: kbDoc.category,
      tags: kbDoc.tags,
      contentHtml: kbDoc.contentHtml,
      summary: kbDoc.summary || '',
      createdAt: kbDoc.createdAt,
      updatedAt: kbDoc.updatedAt,
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, userId);
  }
}

/**
 * Supprime une fiche de connaissance de Firestore.
 */
export async function deleteKnowledgeDoc(userId: string, docId: string): Promise<void> {
  const path = `users/${userId}/knowledgeDocs/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'knowledgeDocs', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, userId);
  }
}
