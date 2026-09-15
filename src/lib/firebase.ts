import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialisation de Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialisation de Firestore avec l'ID de base spécifique s'il existe
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test de connectivité initial (selon les directives SKILL.md)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Mode hors-ligne ou vérification réseau Firebase requise.');
    }
  }
}
testConnection();
