/// <reference types="vite/client" />
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
  getDocFromServer,
  serverTimestamp,
  where,
  increment,
  arrayUnion
} from 'firebase/firestore';
declare const __FIREBASE_APPLET_CONFIG__: {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  databaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

import { RSVPSubmission, WishSubmission, ViewSubmission, Guest } from './types';

// ---------------- CẤU HÌNH FIREBASE CHO GITHUB PAGES / PRODUCTION ----------------
// Vì các khóa và thông số kết nối của Firebase Client SDK hoàn toàn là công khai (public) 
// trên trình duyệt của người dùng cuối, bạn có thể điền thông tin cấu hình Firebase thực tế của bạn 
// vào đây để khi deploy lên GitHub Pages (hoặc hosting tĩnh khác), ứng dụng vẫn kết nối trực tuyến 
// tới cơ sở dữ liệu Firebase của bạn thay vì chạy chế độ ngoại tuyến (localStorage).
const GITHUB_PAGES_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD_Jf4BNJpt1MzkhwMCugLf7z2cOSuZw5A",             // Ví dụ: "AIzaSy..."
  authDomain: "sunny-primacy-vgxqk.firebaseapp.com",         // Ví dụ: "wedding-invitation.firebaseapp.com"
  projectId: "sunny-primacy-vgxqk",          // Ví dụ: "wedding-invitation"
  storageBucket: "sunny-primacy-vgxqk.firebasestorage.app",      // Ví dụ: "wedding-invitation.appspot.com"
  messagingSenderId: "1030577931299",  // Ví dụ: "1234567890"
  appId: "1:1030577931299:web:669a4324f3ec6349ea5d96",              // Ví dụ: "1:1234567890:web:abcdef..."
  databaseId: "ai-studio-thipcitrngxunbch-690599dd-421d-4b5c-bd15-9a21102ee9b1" // ID cơ sở dữ liệu Firestore được chỉ định của bạn
};

// Load values prioritizing Environment Variables, falling back to compile-time injected values and GITHUB_PAGES_FIREBASE_CONFIG
const rawDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || 
  (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? (__FIREBASE_APPLET_CONFIG__.firestoreDatabaseId || __FIREBASE_APPLET_CONFIG__.databaseId) : '') || 
  GITHUB_PAGES_FIREBASE_CONFIG.databaseId || 
  '';

const resolvedDatabaseId = (rawDatabaseId && rawDatabaseId !== '(default)') 
  ? rawDatabaseId 
  : 'ai-studio-thipcitrngxunbch-690599dd-421d-4b5c-bd15-9a21102ee9b1';

const activeConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__.projectId : '') || GITHUB_PAGES_FIREBASE_CONFIG.projectId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__.appId : '') || GITHUB_PAGES_FIREBASE_CONFIG.appId || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__.apiKey : '') || GITHUB_PAGES_FIREBASE_CONFIG.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__.authDomain : '') || GITHUB_PAGES_FIREBASE_CONFIG.authDomain || '',
  firestoreDatabaseId: resolvedDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__.storageBucket : '') || GITHUB_PAGES_FIREBASE_CONFIG.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof __FIREBASE_APPLET_CONFIG__ !== 'undefined' ? __FIREBASE_APPLET_CONFIG__.messagingSenderId : '') || GITHUB_PAGES_FIREBASE_CONFIG.messagingSenderId || '',
};

// Check if Firebase is configured with real credentials
export const isFirebaseConfigured = 
  activeConfig && 
  activeConfig.apiKey && 
  !activeConfig.apiKey.includes('placeholder') &&
  activeConfig.apiKey !== '' &&
  activeConfig.projectId && 
  !activeConfig.projectId.includes('placeholder') &&
  activeConfig.projectId !== '';

let firebaseApp;
let firebaseDb: any = null;
let firebaseAuth: any = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
    console.log('[Firebase Init] Active Project ID:', activeConfig.projectId);
    console.log('[Firebase Init] Resolved Database ID:', activeConfig.firestoreDatabaseId);
    
    if (activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)' && activeConfig.firestoreDatabaseId !== '') {
      firebaseDb = getFirestore(firebaseApp, activeConfig.firestoreDatabaseId);
    } else {
      firebaseDb = getFirestore(firebaseApp);
    }
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

// ---------------- LOCAL VIEWS ANALYTICS ----------------
const LOCAL_VIEWS_KEY = 'vietnamese_wedding_views_real_v1';

export function getLocalViews(): ViewSubmission[] {
  const data = localStorage.getItem(LOCAL_VIEWS_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveLocalView(guestName: string): ViewSubmission {
  const list = getLocalViews();
  const newView: ViewSubmission = {
    id: 'view_' + Math.random().toString(36).substring(2, 11),
    guestName: guestName || 'Quý khách ẩn danh',
    userAgent: navigator.userAgent,
    clickedAt: new Date().toISOString()
  };
  list.unshift(newView);
  localStorage.setItem(LOCAL_VIEWS_KEY, JSON.stringify(list));
  return newView;
}

export function deleteLocalView(id: string): ViewSubmission[] {
  const list = getLocalViews();
  const filtered = list.filter(v => v.id !== id);
  localStorage.setItem(LOCAL_VIEWS_KEY, JSON.stringify(filtered));
  return filtered;
}

// Helper to perform a Firestore write with a timeout to prevent hanging on offline clients
export async function addDocWithTimeout(collectionRef: any, data: any, timeoutMs: number = 4000) {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Firebase operation timed out (Firestore may be offline or configuration is incorrect)'));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([
      addDoc(collectionRef, data),
      timeoutPromise
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function trackCardView(guestName: string) {
  const nameToSave = guestName ? guestName.trim() : 'Quý khách ẩn danh';
  try {
    if (isFirebaseConfigured && db) {
      // 1. Log to general views collection
      await addDocWithTimeout(collection(db, 'views'), {
        guestName: nameToSave,
        userAgent: navigator.userAgent,
        clickedAt: serverTimestamp()
      }, 4000);

      // 2. Log/Update corresponding Guest in guests collection
      if (guestName) {
        const guestsRef = collection(db, 'guests');
        const q = query(guestsRef, where('name', '==', nameToSave));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          for (const docSnap of querySnapshot.docs) {
            const guestDocRef = doc(db, 'guests', docSnap.id);
            await updateDoc(guestDocRef, {
              viewsCount: increment(1),
              lastViewedAt: serverTimestamp(),
              views: arrayUnion({
                clickedAt: new Date().toISOString(),
                userAgent: navigator.userAgent
              })
            });
          }
        } else {
          // If guest does not exist, auto-create them
          await addDocWithTimeout(guestsRef, {
            name: nameToSave,
            viewsCount: 1,
            lastViewedAt: serverTimestamp(),
            views: [{
              clickedAt: new Date().toISOString(),
              userAgent: navigator.userAgent
            }]
          }, 4000);
        }
      }
    } else {
      saveLocalView(nameToSave);
      trackLocalGuestView(nameToSave);
    }
  } catch (error) {
    console.warn("Firestore view tracking failed, falling back to local storage:", error);
    saveLocalView(nameToSave);
    trackLocalGuestView(nameToSave);
  }
}

// ---------------- LOCAL GUESTS MANAGEMENT ----------------
const LOCAL_GUESTS_KEY = 'vietnamese_wedding_guests_real_v1';

export function getLocalGuests(): Guest[] {
  const data = localStorage.getItem(LOCAL_GUESTS_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveLocalGuest(guest: Omit<Guest, 'id' | 'viewsCount'>): Guest {
  const list = getLocalGuests();
  const newGuest: Guest = {
    ...guest,
    id: 'guest_' + Math.random().toString(36).substring(2, 11),
    viewsCount: 0,
    views: []
  };
  list.unshift(newGuest);
  localStorage.setItem(LOCAL_GUESTS_KEY, JSON.stringify(list));
  return newGuest;
}

export function deleteLocalGuest(id: string): Guest[] {
  const list = getLocalGuests();
  const filtered = list.filter(g => g.id !== id);
  localStorage.setItem(LOCAL_GUESTS_KEY, JSON.stringify(filtered));
  return filtered;
}

export function trackLocalGuestView(guestName: string): Guest[] {
  const list = getLocalGuests();
  const nameToSave = guestName ? guestName.trim() : 'Quý khách ẩn danh';
  let found = false;
  const updatedList = list.map(g => {
    if (g.name.trim() === nameToSave) {
      found = true;
      return {
        ...g,
        viewsCount: g.viewsCount + 1,
        lastViewedAt: new Date().toISOString(),
        views: [
          ...(g.views || []),
          {
            clickedAt: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        ]
      };
    }
    return g;
  });

  if (!found && guestName) {
    const newGuest: Guest = {
      id: 'guest_' + Math.random().toString(36).substring(2, 11),
      name: nameToSave,
      viewsCount: 1,
      lastViewedAt: new Date().toISOString(),
      views: [{
        clickedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      }]
    };
    updatedList.unshift(newGuest);
  }

  localStorage.setItem(LOCAL_GUESTS_KEY, JSON.stringify(updatedList));
  return updatedList;
}



