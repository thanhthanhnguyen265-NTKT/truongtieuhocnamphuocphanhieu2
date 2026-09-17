import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "intrepid-apricot-ft8c4",
  appId: "1:297582840516:web:580f31e941a28b88f99791",
  apiKey: "AIzaSyCyuXzSBbGBLZFsK-A6FGgkGvbL1RvBUS4",
  authDomain: "intrepid-apricot-ft8c4.firebaseapp.com",
  storageBucket: "intrepid-apricot-ft8c4.firebasestorage.app",
  messagingSenderId: "297582840516",
};

const DATABASE_ID = "ai-studio-trngtiuhcnamphcp-2ebd3689-1588-46cd-b717-8be896179150";

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Initialize Firestore (with fallback if named database is not supported)
let firestoreInstance: Firestore;
try {
  firestoreInstance = getFirestore(app, DATABASE_ID);
} catch (err) {
  console.warn('Could not initialize named firestore, falling back to default:', err);
  firestoreInstance = getFirestore(app);
}

export const firestore = firestoreInstance;

// Auto sign-in anonymously for persistence & security
export async function ensureAuthUser(): Promise<User | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(auth.currentUser);
      }
    }, 2500);

    onAuthStateChanged(auth, async (user) => {
      if (resolved) return;
      if (user) {
        resolved = true;
        clearTimeout(timer);
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(cred.user);
          }
        } catch (e) {
          console.warn('Anonymous sign-in skipped/failed:', e);
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        }
      }
    });
  });
}
