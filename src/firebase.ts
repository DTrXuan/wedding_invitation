import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { RSVPSubmission, WishSubmission } from './types';

// Check if Firebase is configured with real credentials
export const isFirebaseConfigured = 
  firebaseConfig && 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('placeholder') &&
  firebaseConfig.projectId && 
  !firebaseConfig.projectId.includes('placeholder');

let firebaseApp;
let firebaseDb: any = null;
let firebaseAuth: any = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    firebaseAuth = getAuth(firebaseApp);
  } catch (error) {
    console.error('Lỗi khởi tạo Firebase:', error);
  }
}

export const db = firebaseDb;
export const auth = firebaseAuth;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const authCurrentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authCurrentUser?.uid || null,
      email: authCurrentUser?.email || null,
      emailVerified: authCurrentUser?.emailVerified || null,
      isAnonymous: authCurrentUser?.isAnonymous || null,
      tenantId: authCurrentUser?.tenantId || null,
      providerInfo: authCurrentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure the client tries connection validation on mount as critical constraint
export async function testConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Vui lòng kiểm tra cấu hình kết nối mạng hoặc cấu hình Firebase.");
    }
  }
}

// ---------------- LOCAL STORAGE MOCKENGINE FOR ZERO-COLD-START PREVIEWS ----------------
// When firebase is not configured, we simulate rsvps in localStorage to make the app interactive right away.
// It pre-seeds elements so the user gets a rich, functional experience of the guest list dashboard.
const LOCAL_STORAGE_KEY = 'vietnamese_wedding_rsvps_real_v1';

const mockReservations: RSVPSubmission[] = [];

export function getLocalRSVPs(): RSVPSubmission[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockReservations));
    return mockReservations;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return mockReservations;
  }
}

export function saveLocalRSVP(rsvp: Omit<RSVPSubmission, 'id' | 'createdAt'>): RSVPSubmission {
  const list = getLocalRSVPs();
  const newRsvp: RSVPSubmission = {
    ...rsvp,
    id: 'rsvp_' + Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString()
  };
  list.unshift(newRsvp);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return newRsvp;
}

export function updateLocalRSVP(id: string, updatedFields: Partial<RSVPSubmission>): RSVPSubmission[] {
  const list = getLocalRSVPs();
  const index = list.findIndex(r => r.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updatedFields };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  }
  return list;
}

export function deleteLocalRSVP(id: string): RSVPSubmission[] {
  const list = getLocalRSVPs();
  const filtered = list.filter(r => r.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

const LOCAL_WISHES_KEY = 'vietnamese_wedding_wishes_real_v1';

export function getLocalWishes(): WishSubmission[] {
  const data = localStorage.getItem(LOCAL_WISHES_KEY);
  if (!data) {
    const defaultWishes: WishSubmission[] = [];
    localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(defaultWishes));
    return defaultWishes;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveLocalWish(wish: Omit<WishSubmission, 'id' | 'createdAt'>): WishSubmission {
  const list = getLocalWishes();
  const newWish: WishSubmission = {
    ...wish,
    id: 'wish_' + Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString()
  };
  list.unshift(newWish);
  localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(list));
  return newWish;
}

export function deleteLocalWish(id: string): WishSubmission[] {
  const list = getLocalWishes();
  const filtered = list.filter(w => w.id !== id);
  localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(filtered));
  return filtered;
}
