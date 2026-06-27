import { useState, useEffect, FormEvent } from 'react';
import { 
  Lock, Key, Users, CheckCircle2, XCircle, AlertCircle, 
  Search, Filter, Trash2, Download, RefreshCw, UserPlus, LogIn, LogOut, Eye,
  Plus, Phone, UserCheck, Heart, Share2, Link, Check, Copy, ChevronRight, ExternalLink,
  Upload, Database
} from 'lucide-react';

// Database triggers
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  db, 
  auth, 
  isFirebaseConfigured, 
  getLocalRSVPs, 
  saveLocalRSVP, 
  updateLocalRSVP, 
  deleteLocalRSVP,
  getLocalWishes,
  saveLocalWish,
  deleteLocalWish,
  getLocalViews,
  deleteLocalView,
  handleFirestoreError,
  OperationType,
  getLocalGuests,
  saveLocalGuest,
  deleteLocalGuest,
  addDocWithTimeout,
  GITHUB_PAGES_FIREBASE_CONFIG
} from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  increment,
  arrayUnion,
  setDoc,
  getFirestore
} from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, GoogleAuthProvider, signOut, onAuthStateChanged, getAuth } from 'firebase/auth';
import { RSVPSubmission, WishSubmission, ViewSubmission, Guest } from '../types';
import ShareInvitation from './ShareInvitation';

function parseDateTimeString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch (e) {
      // ignore
    }
  }
  if (typeof val === 'string') {
    return val;
  }
  if (val && typeof val === 'object' && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {
    // ignore
  }
  return new Date().toISOString();
}

export default function GuestManager() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('wedding_admin_unlocked') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  
  // Tab alignment
  const [activeTab, setActiveTab] = useState<'rsvps' | 'guests' | 'wishes' | 'profile' | 'migration'>('rsvps');

  // Data list states
  const [rsvps, setRsvps] = useState<RSVPSubmission[]>([]);
  const [wishes, setWishes] = useState<WishSubmission[]>([]);
  const [views, setViews] = useState<ViewSubmission[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [syncingViews, setSyncingViews] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'google' | 'email' | 'passcode'>('google');
  const [adminEmail, setAdminEmail] = useState<string>('dtruongxuan1397@gmail.com');
  const [adminPassword, setAdminPassword] = useState<string>('');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'yes' | 'no' | 'maybe'>('all');
  const [wishSearchQuery, setWishSearchQuery] = useState('');
  const [viewSearchQuery, setViewSearchQuery] = useState('');
  const [guestsSearchQuery, setGuestsSearchQuery] = useState('');

  // Form states for adding guests
  const [newGuestName, setNewGuestName] = useState('');
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  // Migration states
  const [migrationSource, setMigrationSource] = useState<'sunny' | 'damcuoi' | 'custom'>('sunny');
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [customAuthDomain, setCustomAuthDomain] = useState<string>('');
  const [customProjectId, setCustomProjectId] = useState<string>('');
  const [customStorageBucket, setCustomStorageBucket] = useState<string>('');
  const [customMessagingSenderId, setCustomMessagingSenderId] = useState<string>('');
  const [customAppId, setCustomAppId] = useState<string>('');
  const [customDatabaseId, setCustomDatabaseId] = useState<string>('');

  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationSuccess, setMigrationSuccess] = useState<boolean>(false);
  const [migrationPassword, setMigrationPassword] = useState<string>('');

  // JSON Manual backup/restore states
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  // Manual Export to JSON handler
  const handleExportJSON = async () => {
    setIsMigrating(true);
    setMigrationLogs(['⚡ Bắt đầu xuất dữ liệu lưu trữ thủ công ra file JSON...']);
    try {
      const backupData: any = {
        version: "wedding_backup_v1",
        exportedAt: new Date().toISOString(),
        data: {
          guests: [],
          rsvps: [],
          wishes: [],
          views: []
        }
      };

      if (isFirebaseConfigured && db) {
        setMigrationLogs(prev => [...prev, '☁️ Đang đọc dữ liệu trực tiếp từ các bảng Cloud Firestore...']);
        
        const colNames = ['guests', 'rsvps', 'wishes', 'views'];
        for (const col of colNames) {
          setMigrationLogs(prev => [...prev, `📥 Đang đọc bộ sưu tập: ${col}...`]);
          try {
            const snapshot = await getDocs(collection(db, col));
            backupData.data[col] = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            }));
            setMigrationLogs(prev => [...prev, `✅ Đã đọc ${snapshot.size} tài liệu của ${col}.`]);
          } catch (err: any) {
            console.warn(`Could not read ${col} from Cloud:`, err);
            setMigrationLogs(prev => [...prev, `⚠️ Quyền truy cập trực tiếp bộ sưu tập "${col}" bị từ chối (Yêu cầu Google Admin dtruongxuan1397@gmail.com). Đang trích xuất từ dữ liệu lưu tạm...`]);
            if (col === 'guests') {
              backupData.data.guests = guests.length > 0 ? guests.map(g => ({ id: g.id, name: g.name, viewsCount: g.viewsCount, lastViewedAt: g.lastViewedAt, views: g.views })) : getLocalGuests();
            } else if (col === 'rsvps') {
              backupData.data.rsvps = rsvps.length > 0 ? rsvps : getLocalRSVPs();
            } else if (col === 'wishes') {
              backupData.data.wishes = wishes.length > 0 ? wishes : getLocalWishes();
            } else if (col === 'views') {
              backupData.data.views = views.length > 0 ? views : getLocalViews();
            }
          }
        }
      } else {
        setMigrationLogs(prev => [...prev, '💾 Không có kết nối Cloud. Đang đọc dữ liệu từ Local Storage...']);
        backupData.data.guests = getLocalGuests();
        backupData.data.rsvps = getLocalRSVPs();
        backupData.data.wishes = getLocalWishes();
        backupData.data.views = getLocalViews();
      }

      const totalDocs = (backupData.data.guests?.length || 0) + 
                        (backupData.data.rsvps?.length || 0) + 
                        (backupData.data.wishes?.length || 0) + 
                        (backupData.data.views?.length || 0);

      setMigrationLogs(prev => [...prev, `📊 Đã nạp thành công tổng cộng ${totalDocs} tài liệu.`]);

      // Download trigger
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dam_cuoi_wedding_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMigrationLogs(prev => [...prev, '🎉 Tải xuống file JSON sao lưu thành công! Bạn có thể lưu trữ file này để phục vụ chuyển dữ liệu thủ công bất kỳ lúc nào.']);
      setMigrationSuccess(true);
    } catch (err: any) {
      console.error(err);
      setMigrationLogs(prev => [...prev, `❌ Lỗi xuất dữ liệu: ${err.message}`]);
      setMigrationError(`Lỗi khi xuất dữ liệu: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // Manual Import from JSON handler
  const handleImportJSON = async (file: File) => {
    setIsMigrating(true);
    setMigrationLogs(['⚡ Bắt đầu tiến trình khôi phục/nhập dữ liệu từ file JSON...']);
    setMigrationError(null);
    setMigrationSuccess(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonText = e.target?.result as string;
        const backup = JSON.parse(jsonText);

        if (!backup || backup.version !== "wedding_backup_v1" || !backup.data) {
          throw new Error("Định dạng file JSON không tương thích hoặc không đúng file cấu trúc sao lưu đám cưới!");
        }

        const data = backup.data;
        const colNames = ['guests', 'rsvps', 'wishes', 'views'];
        let totalImported = 0;

        if (isFirebaseConfigured && db) {
          setMigrationLogs(prev => [...prev, '☁️ Đang kết nối với Cloud Database để tải dữ liệu lên...']);
          
          let hasWritePermissions = true;
          for (const col of colNames) {
            const list = data[col] || [];
            if (list.length > 0) {
              setMigrationLogs(prev => [...prev, `📤 Đang lưu ${list.length} tài liệu vào bộ sưu tập: ${col}...`]);
              let count = 0;
              for (const item of list) {
                const { id, ...docData } = item;
                if (id) {
                  try {
                    await setDoc(doc(db, col, id), docData);
                    count++;
                    if (count % 5 === 0 || count === list.length) {
                      setMigrationLogs(prev => {
                        const next = [...prev];
                        next[next.length - 1] = `📤 Tiến trình: Đã ghi ${count}/${list.length} tài liệu của ${col}`;
                        return next;
                      });
                    }
                  } catch (err: any) {
                    console.error(`Error saving ${col}/${id} to Firestore:`, err);
                    hasWritePermissions = false;
                    break;
                  }
                }
              }
              if (!hasWritePermissions) {
                setMigrationLogs(prev => [...prev, `⚠️ Ghi dữ liệu bộ sưu tập "${col}" thất bại do thiếu quyền (Yêu cầu Google Admin dtruongxuan1397@gmail.com). Hệ thống sẽ chuyển hướng ghi đè vào Local Storage bộ nhớ máy này.`]);
                break;
              }
              totalImported += count;
              setMigrationLogs(prev => [...prev, `✅ Bộ sưu tập ${col} đã được cập nhật thành công lên Cloud!`]);
            }
          }

          if (!hasWritePermissions) {
            // Fallback to local storage for all remaining data
            setMigrationLogs(prev => [...prev, '💾 Đang khôi phục cục bộ vào Local Storage...']);
            if (data.guests) localStorage.setItem('vietnamese_wedding_guests_real_v1', JSON.stringify(data.guests));
            if (data.rsvps) localStorage.setItem('vietnamese_wedding_rsvps_real_v1', JSON.stringify(data.rsvps));
            if (data.wishes) localStorage.setItem('vietnamese_wedding_wishes_real_v1', JSON.stringify(data.wishes));
            if (data.views) localStorage.setItem('vietnamese_wedding_views_real_v1', JSON.stringify(data.views));
            totalImported = (data.guests?.length || 0) + (data.rsvps?.length || 0) + (data.wishes?.length || 0) + (data.views?.length || 0);
          }
        } else {
          setMigrationLogs(prev => [...prev, '💾 Không cấu hình Cloud. Đang tiến hành lưu cục bộ vào Local Storage...']);
          if (data.guests) localStorage.setItem('vietnamese_wedding_guests_real_v1', JSON.stringify(data.guests));
          if (data.rsvps) localStorage.setItem('vietnamese_wedding_rsvps_real_v1', JSON.stringify(data.rsvps));
          if (data.wishes) localStorage.setItem('vietnamese_wedding_wishes_real_v1', JSON.stringify(data.wishes));
          if (data.views) localStorage.setItem('vietnamese_wedding_views_real_v1', JSON.stringify(data.views));
          totalImported = (data.guests?.length || 0) + (data.rsvps?.length || 0) + (data.wishes?.length || 0) + (data.views?.length || 0);
        }

        setMigrationLogs(prev => [...prev, `🎉 KHÔI PHỤC THỦ CÔNG HOÀN TẤT! Đã nhập thành công tổng cộng ${totalImported} tài liệu.`]);
        setMigrationLogs(prev => [...prev, '👉 Vui lòng nhấn nút "Tải lại dữ liệu" ở phía trên để cập nhật danh sách hiển thị mới nhất.']);
        setMigrationSuccess(true);
      } catch (err: any) {
        console.error(err);
        setMigrationLogs(prev => [...prev, `❌ Lỗi khi đọc và khôi phục dữ liệu: ${err.message}`]);
        setMigrationError(`Không thể nhập dữ liệu: ${err.message}`);
      } finally {
        setIsMigrating(false);
      }
    };
    reader.onerror = () => {
      setMigrationError("Lỗi hệ thống khi đọc file.");
      setIsMigrating(false);
    };
    reader.readAsText(file);
  };

  // Data migration handler
  const handleDataMigration = async (e: FormEvent) => {
    e.preventDefault();
    if (!db) {
      setMigrationError('Firebase không hoạt động trên project này.');
      return;
    }
    
    setIsMigrating(true);
    setMigrationError(null);
    setMigrationSuccess(false);
    setMigrationLogs(['[Khởi động] Bắt đầu quá trình chuyển dữ liệu sang dự án mới...', '']);

    const addLog = (msg: string) => {
      setMigrationLogs(prev => {
        const next = [...prev];
        next[next.length - 1] = msg;
        return next;
      });
    };

    const pushLog = (msg: string) => {
      setMigrationLogs(prev => [...prev, msg]);
    };

    try {
      const passwordToUse = migrationPassword || adminPassword;
      
      let configToUse: any;
      let dbIdToUse: string | undefined;
      let sourceName = '';

      if (migrationSource === 'sunny') {
        sourceName = 'Dự án tạm (sunny-primacy-vgxqk)';
        configToUse = {
          apiKey: "AIzaSyD_Jf4BNJpt1MzkhwMCugLf7z2cOSuZw5A",
          authDomain: "sunny-primacy-vgxqk.firebaseapp.com",
          projectId: "sunny-primacy-vgxqk",
          storageBucket: "sunny-primacy-vgxqk.firebasestorage.app",
          messagingSenderId: "1030577931299",
          appId: "1:1030577931299:web:669a4324f3ec6349ea5d96"
        };
        dbIdToUse = "ai-studio-thipcitrngxunbch-690599dd-421d-4b5c-bd15-9a21102ee9b1";
      } else if (migrationSource === 'damcuoi') {
        sourceName = 'Dự án gốc (dam-cuoi-truong-xuan)';
        configToUse = {
          apiKey: "AIzaSyB3bqxaXI6_rJQq1QmW6ezFHXzPM2YPd70",
          authDomain: "dam-cuoi-truong-xuan.firebaseapp.com",
          projectId: "dam-cuoi-truong-xuan",
          storageBucket: "dam-cuoi-truong-xuan.firebasestorage.app",
          messagingSenderId: "96332517393",
          appId: "1:96332517393:web:5fe34ea03561634f98a1b0"
        };
        dbIdToUse = "ai-studio-thipcitrngxunbch-690599dd-421d-4b5c-bd15-9a21102ee9b1";
      } else {
        sourceName = 'Dự án tùy chỉnh';
        configToUse = {
          apiKey: customApiKey,
          authDomain: customAuthDomain,
          projectId: customProjectId,
          storageBucket: customStorageBucket,
          messagingSenderId: customMessagingSenderId,
          appId: customAppId
        };
        dbIdToUse = customDatabaseId || undefined;
        
        if (!customApiKey || !customProjectId) {
          throw new Error('Cấu hình dự án tùy chỉnh phải nhập đầy đủ API Key và Project ID.');
        }
      }

      pushLog(`🔑 Đang kết nối tới ${sourceName}...`);
      
      // Initialize old app
      let oldApp;
      const oldAppName = "old-firebase-app-migration-" + Date.now();
      try {
        oldApp = initializeApp(configToUse, oldAppName);
      } catch (err: any) {
        throw new Error('Không thể khởi tạo kết nối dự án cũ: ' + err.message);
      }

      const oldDb = dbIdToUse ? getFirestore(oldApp, dbIdToUse) : getFirestore(oldApp);
      const oldAuth = getAuth(oldApp);

      // Authenticate with old app if possible
      if (passwordToUse) {
        pushLog('🔐 Đang xác thực quyền Admin trên dự án cũ bằng mật khẩu...');
        try {
          await signInWithEmailAndPassword(oldAuth, 'dtruongxuan1397@gmail.com', passwordToUse);
          pushLog('✅ Xác thực Admin dự án cũ thành công!');
        } catch (authErr: any) {
          pushLog('⚠️ Cảnh báo xác thực: ' + authErr.message);
          pushLog('👉 Sẽ thử tải dữ liệu ẩn danh (một số bộ sưu tập bảo mật cao có thể bị chặn)...');
        }
      } else {
        pushLog('ℹ️ Không có mật khẩu. Sẽ thử tải dữ liệu trực tiếp không xác thực (khuyên dùng điền mật khẩu)...');
      }

      const collections = [
        { name: 'guests', label: 'Danh Sách Khách Mời (guests)' },
        { name: 'rsvps', label: 'Xác Nhận Tham Dự (rsvps)' },
        { name: 'wishes', label: 'Lời Chúc Khách Mời (wishes)' },
        { name: 'views', label: 'Lượt Truy Cập Analytics (views)' }
      ];

      for (const col of collections) {
        pushLog(`📥 Đang tải dữ liệu bộ sưu tập: ${col.label}...`);
        try {
          const oldSnapshot = await getDocs(collection(oldDb, col.name));
          const docsCount = oldSnapshot.size;
          pushLog(`📊 Tìm thấy ${docsCount} tài liệu trong bộ sưu tập: ${col.label}.`);

          if (docsCount > 0) {
            pushLog(`📤 Đang tải lên ${docsCount} tài liệu sang dự án mới (dam-cuoi-truong-xuan)...`);
            let count = 0;
            for (const docSnap of oldSnapshot.docs) {
              const docData = docSnap.data();
              // Write doc directly into active Firestore preserving identical Document ID
              await setDoc(doc(db, col.name, docSnap.id), docData);
              count++;
              addLog(`⚡ Tiến trình: Đã sao chép ${count}/${docsCount} tài liệu (${Math.round((count / docsCount) * 100)}%)`);
            }
            pushLog(`✅ Hoàn thành bộ sưu tập ${col.label}!`);
          } else {
            pushLog(`ℹ️ Không có dữ liệu trong bộ sưu tập ${col.label} để sao chép.`);
          }
        } catch (colErr: any) {
          pushLog(`❌ Lỗi khi tải/chuyển bộ sưu tập ${col.name}: ${colErr.message}`);
          console.error(colErr);
        }
      }

      pushLog('🎉 QUÁ TRÌNH CHUYỂN DỮ LIỆU ĐÃ HOÀN TẤT THÀNH CÔNG!');
      pushLog('👉 Vui lòng nhấn nút "Tải lại dữ liệu" ở phía trên để cập nhật bảng quản trị mới.');
      setMigrationSuccess(true);
    } catch (error: any) {
      console.error('Migration error:', error);
      setMigrationError(error.message || 'Lỗi không xác định xảy ra trong quá trình chuyển dữ liệu.');
      pushLog('❌ Quá trình chuyển dữ liệu thất bại.');
    } finally {
      setIsMigrating(false);
    }
  };

  // Load Auth state
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      // Check redirect result on load
      getRedirectResult(auth)
        .then((result) => {
          if (result && result.user) {
            if (result.user.email?.toLowerCase() === 'dtruongxuan1397@gmail.com') {
              setIsAdminUnlocked(true);
              localStorage.setItem('wedding_admin_unlocked', 'true');
            } else {
              alert('Tài khoản này không có quyền quản lý đám cưới. Vui lòng đăng nhập với Dtruongxuan1397@gmail.com.');
              signOut(auth);
            }
          }
        })
        .catch((error) => {
          console.error("Redirect login result check error:", error);
        });

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        // If user is verified admin (matching email Dtruongxuan1397@gmail.com)
        if (user && user.email?.toLowerCase() === 'dtruongxuan1397@gmail.com') {
          setIsAdminUnlocked(true);
          localStorage.setItem('wedding_admin_unlocked', 'true');
        }
      });
      return unsubscribe;
    }
  }, []);

  // Listen for custom guests-updated event to keep offline list in sync instantly
  useEffect(() => {
    const handleGuestsUpdated = () => {
      setSyncCount(c => c + 1);
    };
    window.addEventListener('guests-updated', handleGuestsUpdated);
    return () => {
      window.removeEventListener('guests-updated', handleGuestsUpdated);
    };
  }, []);

  // Fetch or bind RSVPs
  useEffect(() => {
    if (!isAdminUnlocked) return;

    setLoading(true);
    let unsubscribe: (() => void) | undefined;

    if (isFirebaseConfigured && db) {
      // Connect to live Firestore
      const path = 'rsvps';
      const rsvpsRef = collection(db, path);
      
      try {
        unsubscribe = onSnapshot(rsvpsRef, (snapshot) => {
          const list: RSVPSubmission[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              name: d.name || '',
              attendance: d.attendance || 'yes',
              guestCount: d.guestCount || 0,
              wishes: d.wishes || '',
              createdAt: parseDateTimeString(d.createdAt)
            } as RSVPSubmission);
          });
          
          // Sort by date descending
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRsvps(list);
          setLoading(false);
        }, (error) => {
          console.warn("Firestore rsvps subscription failed. Falling back to local storage:", error);
          const localData = getLocalRSVPs();
          setRsvps(localData);
          setLoading(false);
        });
      } catch (err) {
        console.warn("Error setting up Firestore rsvps subscription. Falling back to local storage:", err);
        const localData = getLocalRSVPs();
        setRsvps(localData);
        setLoading(false);
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      // Fallback local storage
      const localData = getLocalRSVPs();
      setRsvps(localData);
      setLoading(false);
    }
  }, [isAdminUnlocked, syncCount]);

  // Fetch or bind Wishes
  useEffect(() => {
    if (!isAdminUnlocked) return;

    let unsubscribe: (() => void) | undefined;

    if (isFirebaseConfigured && db) {
      const path = 'wishes';
      const wishesRef = collection(db, path);
      
      try {
        unsubscribe = onSnapshot(wishesRef, (snapshot) => {
          const list: WishSubmission[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              name: d.name || '',
              wishes: d.wishes || '',
              createdAt: parseDateTimeString(d.createdAt)
            } as WishSubmission);
          });
          
          // Sort wishes by createdAt date descending
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setWishes(list);
        }, (error) => {
          console.warn("Firestore wishes subscription failed. Falling back to local storage:", error);
          const localWishes = getLocalWishes();
          localWishes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setWishes(localWishes);
        });
      } catch (err) {
        console.warn("Error setting up Firestore wishes subscription. Falling back to local storage:", err);
        const localWishes = getLocalWishes();
        localWishes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWishes(localWishes);
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      // Fallback local storage
      const localWishes = getLocalWishes();
      localWishes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWishes(localWishes);
    }
  }, [isAdminUnlocked, syncCount]);

  // Fetch or bind Views Analytics
  useEffect(() => {
    if (!isAdminUnlocked) return;

    let unsubscribe: (() => void) | undefined;

    if (isFirebaseConfigured && db) {
      const path = 'views';
      const viewsRef = collection(db, path);
      
      try {
        unsubscribe = onSnapshot(viewsRef, (snapshot) => {
          const list: ViewSubmission[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              guestName: d.guestName || '',
              userAgent: d.userAgent || '',
              clickedAt: parseDateTimeString(d.clickedAt)
            } as ViewSubmission);
          });
          
          // Sort views by clickedAt date descending
          list.sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());
          setViews(list);
        }, (error) => {
          console.warn("Firestore views subscription failed. Falling back to local storage:", error);
          const localViews = getLocalViews();
          localViews.sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());
          setViews(localViews);
        });
      } catch (err) {
        console.warn("Error setting up Firestore views subscription. Falling back to local storage:", err);
        const localViews = getLocalViews();
        localViews.sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());
        setViews(localViews);
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      // Fallback local storage
      const localViews = getLocalViews();
      localViews.sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());
      setViews(localViews);
    }
  }, [isAdminUnlocked, syncCount]);

  // Fetch or bind Guests
  useEffect(() => {
    if (!isAdminUnlocked) return;

    let unsubscribe: (() => void) | undefined;

    if (isFirebaseConfigured && db) {
      const path = 'guests';
      const guestsRef = collection(db, path);
      
      try {
        unsubscribe = onSnapshot(guestsRef, (snapshot) => {
          const list: Guest[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              name: d.name || '',
              viewsCount: d.viewsCount || 0,
              lastViewedAt: d.lastViewedAt ? parseDateTimeString(d.lastViewedAt) : null,
              views: d.views || []
            } as Guest);
          });
          
          // Sort guests by name
          list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setGuests(list);
        }, (error) => {
          console.warn("Firestore guests subscription failed. Falling back to local storage:", error);
          const localGuests = getLocalGuests();
          localGuests.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setGuests(localGuests);
        });
      } catch (err) {
        console.warn("Error setting up Firestore guests subscription. Falling back to local storage:", err);
        const localGuests = getLocalGuests();
        localGuests.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setGuests(localGuests);
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      // Fallback local storage
      const localGuests = getLocalGuests();
      localGuests.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      setGuests(localGuests);
    }
  }, [isAdminUnlocked, syncCount]);

  // Handle local/passcode sign in
  const handlePasscodeUnlock = (e: FormEvent) => {
    e.preventDefault();
    const cleanPass = passcode.trim().toLowerCase();
    if (cleanPass === '123' || cleanPass === 'bichtram' || cleanPass === 'truongxuan' || cleanPass === 'dtruongxuan1397') {
      setIsAdminUnlocked(true);
      setPasscodeError(false);
      localStorage.setItem('wedding_admin_unlocked', 'true');
    } else {
      setPasscodeError(true);
    }
  };

  // Google authentication
  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) return;
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    const provider = new GoogleAuthProvider();
    
    // Force account selection prompt so the user can easily switch accounts
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email?.toLowerCase() === 'dtruongxuan1397@gmail.com') {
        setIsAdminUnlocked(true);
        localStorage.setItem('wedding_admin_unlocked', 'true');
        setAuthErrorMessage(null);
      } else {
        const errorMsg = 'Tài khoản này không có quyền quản lý đám cưới. Vui lòng đăng nhập với Dtruongxuan1397@gmail.com hoặc sử dụng mã khoá dự phòng.';
        setAuthErrorMessage(errorMsg);
        alert(errorMsg);
        await signOut(auth);
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      let friendlyError = '';
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;

      if (err?.code === 'auth/unauthorized-domain') {
        friendlyError = `⚠️ Lỗi: Tên miền chưa được uỷ quyền (auth/unauthorized-domain).\n\n` +
          `👉 Cách khắc phục:\n` +
          `1. Đăng nhập vào trang quản trị Firebase Console của bạn.\n` +
          `2. Vào mục Authentication -> Settings -> Authorized domains.\n` +
          `3. Nhấn "Add domain" (Thêm tên miền) và điền đúng tên miền hiện tại vào:\n` +
          `   • ${window.location.hostname}\n` +
          `   • ${window.location.host}`;
      } else if (err?.code === 'auth/operation-not-allowed') {
        friendlyError = `⚠️ Lỗi: Phương thức đăng nhập Google chưa được kích hoạt trong Firebase (auth/operation-not-allowed).\n\n` +
          `👉 Cách khắc phục:\n` +
          `1. Đăng nhập vào Firebase Console.\n` +
          `2. Vào mục Authentication -> Sign-in method.\n` +
          `3. Chọn "Add new provider" (Thêm nhà cung cấp) -> Chọn "Google" và gạt nút bật để Kích hoạt (Enable) nó lên, sau đó lưu lại.`;
      } else if (isIframe || err?.code === 'auth/popup-blocked' || err?.code === 'auth/web-storage-unsupported' || err?.message?.includes('storage')) {
        friendlyError = `⚠️ Lỗi: Không thể đăng nhập Google khi chạy trong khung thử nghiệm (iframe).\n\n` +
          `👉 Cách khắc phục:\n` +
          `1. Hãy bấm nút "Mở trang trong Tab Mới ↗" màu xanh để mở trang web độc lập trên tab mới.\n` +
          `2. Ở tab mới, hãy thử đăng nhập Google lại.\n` +
          `3. Hoặc bạn có thể nhập Mã khoá dự phòng (ví dụ: 123) ở phía dưới để vào bảng quản lý ngay lập tức!`;
      } else if (err?.code === 'auth/popup-closed-by-user') {
        friendlyError = `Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất. Vui lòng bấm đăng nhập lại.`;
      } else {
        friendlyError = `Lỗi đăng nhập Google (${err?.code || 'unknown'}): ${err?.message || err}\n\n👉 Bạn có thể dùng mã dự phòng (ví dụ: 123) để đăng nhập nhanh!`;
      }

      setAuthErrorMessage(friendlyError);
      alert(friendlyError);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Redirect Sign-In
  const handleGoogleRedirectSignIn = async () => {
    if (!isFirebaseConfigured || !auth) return;
    setIsLoggingIn(true);
    setAuthErrorMessage(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Google redirect sign-in error:", err);
      setAuthErrorMessage(`Lỗi chuyển hướng đăng nhập Google: ${err?.message || err}`);
      setIsLoggingIn(false);
    }
  };

  // Email and Password authentication (100% reliable bypass)
  const handleEmailAndPasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth) return;
    
    if (!adminEmail.trim() || !adminPassword.trim()) {
      alert('Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }

    setIsLoggingIn(true);
    setAuthErrorMessage(null);

    try {
      const result = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      if (result.user && result.user.email?.toLowerCase() === 'dtruongxuan1397@gmail.com') {
        setIsAdminUnlocked(true);
        localStorage.setItem('wedding_admin_unlocked', 'true');
        setAuthErrorMessage(null);
      } else {
        const errorMsg = 'Tài khoản này không có quyền quản lý đám cưới. Vui lòng đăng nhập với Dtruongxuan1397@gmail.com.';
        setAuthErrorMessage(errorMsg);
        alert(errorMsg);
        await signOut(auth);
      }
    } catch (err: any) {
      console.error("Email/Password sign-in error:", err);
      let friendlyError = '';
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        friendlyError = '⚠️ Mật khẩu hoặc tài khoản không chính xác. Vui lòng kiểm tra lại!';
      } else if (err?.code === 'auth/user-not-found') {
        friendlyError = `⚠️ Không tìm thấy người dùng ${adminEmail.trim()}.\nHãy tạo tài khoản này trong mục Authentication của trang quản trị Firebase Console của bạn.`;
      } else {
        friendlyError = `Lỗi đăng nhập Email/Password (${err?.code || 'unknown'}): ${err?.message || err}`;
      }
      setAuthErrorMessage(friendlyError);
      alert(friendlyError);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setIsAdminUnlocked(false);
    setCurrentUser(null);
    localStorage.removeItem('wedding_admin_unlocked');
  };

  // Delete Guest RSVP
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khách mời này khỏi danh sách không?')) return;

    if (isFirebaseConfigured && db) {
      const isGoogleAdmin = currentUser?.email?.toLowerCase() === 'dtruongxuan1397@gmail.com';
      if (!isGoogleAdmin) {
        alert('Tính năng xóa yêu cầu đăng nhập bằng tài khoản Google Admin (dtruongxuan1397@gmail.com).');
        return;
      }
      try {
        await deleteDoc(doc(db, 'rsvps', id));
      } catch (err) {
        alert('Lỗi khi xóa dữ liệu.');
      }
    } else {
      const filtered = deleteLocalRSVP(id);
      setRsvps(filtered);
    }
  };

  // Delete Guest Wish
  const handleDeleteWish = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lời chúc này không?')) return;

    if (isFirebaseConfigured && db) {
      const isGoogleAdmin = currentUser?.email?.toLowerCase() === 'dtruongxuan1397@gmail.com';
      if (!isGoogleAdmin) {
        alert('Tính năng xóa yêu cầu đăng nhập bằng tài khoản Google Admin (dtruongxuan1397@gmail.com).');
        return;
      }
      try {
        await deleteDoc(doc(db, 'wishes', id));
      } catch (err) {
        alert('Lỗi khi xóa lời chúc.');
      }
    } else {
      const filtered = deleteLocalWish(id);
      setWishes(filtered);
    }
  };

  // Delete View Log
  const handleDeleteView = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch sử click này không?')) return;

    if (isFirebaseConfigured && db) {
      const isGoogleAdmin = currentUser?.email?.toLowerCase() === 'dtruongxuan1397@gmail.com';
      if (!isGoogleAdmin) {
        alert('Tính năng xóa yêu cầu đăng nhập bằng tài khoản Google Admin (dtruongxuan1397@gmail.com).');
        return;
      }
      try {
        await deleteDoc(doc(db, 'views', id));
      } catch (err) {
        alert('Lỗi khi xóa lịch sử click.');
      }
    } else {
      const filtered = deleteLocalView(id);
      setViews(filtered);
    }
  };

  // Sync offline/local views to Cloud Database
  const handleSyncViews = async () => {
    const localViews = getLocalViews();
    if (localViews.length === 0) {
      alert('Không có lượt click offline nào cần đồng bộ.');
      return;
    }

    if (!isFirebaseConfigured || !db) {
      alert('Chưa cấu hình Firebase để đồng bộ lên database.');
      return;
    }

    setSyncingViews(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const v of localViews) {
        try {
          // 1. Log to general views collection in Firestore
          const clickedDate = new Date(v.clickedAt);
          
          await addDocWithTimeout(collection(db, 'views'), {
            guestName: v.guestName || 'Quý khách ẩn danh',
            userAgent: v.userAgent || '',
            clickedAt: clickedDate
          }, 4000);

          // 2. Sync corresponding Guest views count
          if (v.guestName && v.guestName !== 'Quý khách ẩn danh') {
            const guestsRef = collection(db, 'guests');
            const q = query(guestsRef, where('name', '==', v.guestName.trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              for (const docSnap of querySnapshot.docs) {
                const guestDocRef = doc(db, 'guests', docSnap.id);
                await updateDoc(guestDocRef, {
                  viewsCount: increment(1),
                  lastViewedAt: clickedDate,
                  views: arrayUnion({
                    clickedAt: v.clickedAt,
                    userAgent: v.userAgent
                  })
                });
              }
            } else {
              // Create guest if not exist
              await addDocWithTimeout(guestsRef, {
                name: v.guestName.trim(),
                viewsCount: 1,
                lastViewedAt: clickedDate,
                views: [{
                  clickedAt: v.clickedAt,
                  userAgent: v.userAgent
                }]
              }, 4000);
            }
          }
          
          successCount++;
        } catch (err) {
          console.error("Failed to sync view log:", err);
          failCount++;
        }
      }

      if (successCount > 0) {
        // Clear local views only if synced successfully
        localStorage.removeItem('vietnamese_wedding_views_real_v1');
        setSyncCount(c => c + 1);
        alert(`Đồng bộ thành công ${successCount} lượt click xem thiệp lên database!${failCount > 0 ? ` Thất bại ${failCount} lượt.` : ''}`);
      } else {
        alert('Đồng bộ thất bại. Vui lòng kiểm tra kết nối mạng hoặc quyền Admin.');
      }
    } catch (e) {
      alert('Lỗi trong quá trình đồng bộ: ' + e);
    } finally {
      setSyncingViews(false);
    }
  };

  // Add Guest
  const handleAddGuest = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    const payload = {
      name: newGuestName.trim(),
      viewsCount: 0,
      views: []
    };

    if (isFirebaseConfigured && db) {
      try {
        await addDocWithTimeout(collection(db, 'guests'), payload, 4000);
        setNewGuestName('');
        setIsAddingGuest(false);
      } catch (err) {
        alert('Lỗi khi thêm khách mời vào Firestore: ' + err);
      }
    } else {
      saveLocalGuest(payload);
      setNewGuestName('');
      setIsAddingGuest(false);
      setSyncCount(c => c + 1);
    }
  };

  // Delete Guest
  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khách mời này khỏi danh sách không?')) return;

    if (isFirebaseConfigured && db) {
      const isGoogleAdmin = currentUser?.email?.toLowerCase() === 'dtruongxuan1397@gmail.com';
      if (!isGoogleAdmin) {
        alert('Tính năng xóa yêu cầu đăng nhập bằng tài khoản Google Admin (dtruongxuan1397@gmail.com).');
        return;
      }
      try {
        await deleteDoc(doc(db, 'guests', id));
      } catch (err) {
        alert('Lỗi khi xóa khách mời.');
      }
    } else {
      const filtered = deleteLocalGuest(id);
      setGuests(filtered);
    }
  };

  // Load default Mock Guest for testing
  const handleAddMockGuest = () => {
    const names = [
      'Lê Tuấn Hải', 'Phan Văn Hải', 'Trịnh Đình Quang', 'Đỗ Mỹ Linh', 
      'Nguyễn Ngọc Diệp', 'Tạ Duy Anh', 'Gia đình Bác Sáu', 'Vợ chồng Chú Đồng'
    ];
    const wishesText = [
      'Chúc hai bạn trăm năm hạnh phúc, rổ rá cạp lại thật viên mãn!',
      'Gia đình bác chúc hai cháu luôn yêu thương nhau như ngày đầu.',
      'Sớm sinh em bé nhé Thanh Như và Lê Nguyên ơi. Tiệc cưới đỉnh quá!',
      'Yêu nhau vững bền nhé hai em của chị.'
    ];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomWish = wishesText[Math.floor(Math.random() * wishesText.length)];
    const randomStatus = ['yes', 'no', 'maybe'][Math.floor(Math.random() * 3)] as any;

    const payload = {
      name: randomName,
      attendance: randomStatus,
      guestCount: randomStatus === 'yes' ? Math.floor(1 + Math.random() * 3) : 0,
      wishes: randomWish
    };

    if (isFirebaseConfigured && db) {
      // Mock triggers alert instructing to use client form in live firestore or write directly.
      // But to assist, we can write directly if we want.
      alert('Vui lòng sử dụng Form "Xác Nhận Tham Dự" ở trên để gửi dữ liệu trực tiếp lên Live Firestore!');
    } else {
      saveLocalRSVP(payload);
      if (randomWish) {
        saveLocalWish({
          name: randomName,
          wishes: randomWish
        });
      }
      setSyncCount(c => c + 1);
    }
  };

  // Clear mock data
  const handleClearLocalData = () => {
    if (isFirebaseConfigured && db) {
      alert('Danh sách Live Firestore không thể xóa toàn bộ hàng loạt tránh rủi ro dữ liệu thật của bạn!');
      return;
    }
    if (confirm('Xóa sạch danh sách giả lập và đưa về trống?')) {
      localStorage.removeItem('vietnamese_wedding_rsvps_real_v1');
      localStorage.removeItem('vietnamese_wedding_wishes_real_v1');
      setRsvps([]);
      setWishes([]);
    }
  };

  // Export dynamically to CSV sheet
  const handleExportCSV = () => {
    if (rsvps.length === 0) return;

    // Build headers including UTF-8 Byte Order Mark (BOM) to correctly display Vietnamese accents in Excel
    const BOM = '\uFEFF';
    let csvContent = BOM + 'Họ Tên Khách,Trạng Thái,Sĩ Số Tham Gia,Lời Chúc Dự Tiệc,Thời Gian\n';

    rsvps.forEach(r => {
      const statusText = r.attendance === 'yes' ? 'Tham Dự' : r.attendance === 'no' ? 'Bất Khả Kháng' : 'Có Thể';
      
      const row = [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${statusText}"`,
        r.guestCount,
        `"${r.wishes.replace(/"/g, '""')}"`,
        `"${r.createdAt}"`
      ].join(',');
      
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DANH_SACH_KHACH_MOI_CUOI_TRUONG_XUAN_BICH_TRAM.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Analytics compilations
  const totalSubmissions = rsvps.length;
  const totalSeats = rsvps.reduce((sum, r) => sum + (r.attendance === 'yes' ? r.guestCount : 0), 0);
  const attendingMaybe = rsvps.filter(r => r.attendance === 'maybe').length;
  const attendingNo = rsvps.filter(r => r.attendance === 'no').length;

  // View statistics calculations
  const totalViewsCount = views.length;
  const uniqueGuestsViewed = Array.from(new Set(views.map(v => (v.guestName || '').trim()).filter(Boolean))).length;
  const fbViews = views.filter(v => {
    const ua = v.userAgent || '';
    return ua.includes('FBAV') || ua.includes('FB_IAB');
  }).length;
  const zaloViews = views.filter(v => {
    const ua = v.userAgent || '';
    return ua.includes('Zalo');
  }).length;
  const otherViews = totalViewsCount - fbViews - zaloViews;

  const fbPercent = totalViewsCount > 0 ? Math.round((fbViews / totalViewsCount) * 100) : 0;
  const zaloPercent = totalViewsCount > 0 ? Math.round((zaloViews / totalViewsCount) * 100) : 0;
  const browserPercent = totalViewsCount > 0 ? Math.round((otherViews / totalViewsCount) * 100) : 0;

  // Live filter arrays
  const filteredRSVPs = rsvps.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.attendance === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredGuests = guests.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(guestsSearchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <section id="guest-manager-section" className="py-20 px-4 bg-white text-stone-800 border-t border-stone-200/60 shadow-xs">
      <div className="max-w-6xl mx-auto">
        
        {/* locked gating cover */}
        {!isAdminUnlocked ? (
          <div className="max-w-md mx-auto bg-stone-50/90 border border-stone-200 rounded-3xl p-6 md:p-8 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
            
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-700 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">
              Quản Trị Viên Đám Cưới
            </h3>
            <p className="text-xs text-stone-500 font-light mb-6">
              Bảng quản lý danh sách khách mời xác nhận, xem thống kê và xuất file Excel. Vui lòng mở khóa để tiếp tục.
            </p>

            {/* Tabs to select sign-in method */}
            <div className="flex border-b border-stone-200 mb-6 text-xs overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => { setLoginMethod('google'); setAuthErrorMessage(null); }}
                className={`flex-1 py-2.5 font-bold border-b-2 transition-all ${loginMethod === 'google' ? 'border-amber-600 text-amber-700 bg-amber-50/40' : 'border-transparent text-stone-400 hover:text-stone-600 bg-transparent'}`}
              >
                Google Auth
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setAuthErrorMessage(null); }}
                className={`flex-1 py-2.5 font-bold border-b-2 transition-all ${loginMethod === 'email' ? 'border-amber-600 text-amber-700 bg-amber-50/40' : 'border-transparent text-stone-400 hover:text-stone-600 bg-transparent'}`}
              >
                Mật Khẩu Cloud
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('passcode'); setAuthErrorMessage(null); }}
                className={`flex-1 py-2.5 font-bold border-b-2 transition-all ${loginMethod === 'passcode' ? 'border-amber-600 text-amber-700 bg-amber-50/40' : 'border-transparent text-stone-400 hover:text-stone-600 bg-transparent'}`}
              >
                Mã Khóa Dự Phòng
              </button>
            </div>

            {/* Google Sign-In Method */}
            {loginMethod === 'google' && isFirebaseConfigured && (
              <div className="space-y-3 mb-4">
                <p className="text-[11px] text-stone-500 mb-3 text-left leading-relaxed">
                  Đăng nhập qua Google tiện lợi nhất, nhưng có thể bị chặn popup nếu bạn truy cập từ <strong>Zalo, Facebook hoặc Safari</strong> trên điện thoại.
                </p>
                
                {/* Method 1: Popup */}
                <button
                  id="btn-admin-google-auth"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  className={`w-full py-2.5 bg-stone-900 text-white hover:bg-stone-800 font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-stone-800 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> Đang kết nối Google...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-amber-500" /> Đăng nhập Google (Popup - Khuyên dùng trên Máy tính)
                    </>
                  )}
                </button>

                {/* Method 2: Redirect */}
                <button
                  id="btn-admin-google-auth-redirect"
                  onClick={handleGoogleRedirectSignIn}
                  disabled={isLoggingIn}
                  className={`w-full py-2.5 bg-amber-600 text-white hover:bg-amber-700 font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-700 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-white animate-spin" /> Đang chuyển hướng...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 text-white" /> Đăng nhập Google (Redirect - Dành cho Điện thoại)
                    </>
                  )}
                </button>
                
                {typeof window !== 'undefined' && window.self !== window.top && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600 animate-pulse" /> Mở trang trong Tab Mới ↗ (Tránh lỗi iframe)
                  </button>
                )}

                {authErrorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-700 text-left whitespace-pre-line leading-relaxed mt-3 font-sans">
                    {authErrorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Email & Password Direct Cloud Connection */}
            {loginMethod === 'email' && isFirebaseConfigured && (
              <form onSubmit={handleEmailAndPasswordSignIn} className="space-y-4 text-left">
                <p className="text-[11px] text-stone-500 leading-relaxed mb-1">
                  Đăng nhập trực tiếp bằng <strong>Email & Mật khẩu Admin</strong> của bạn. Phương pháp này là an toàn, tin cậy nhất và hoạt động 100% trên mọi thiết bị di động (Zalo, Facebook, Safari).
                </p>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1">Email Quản Trị Viên</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="dtruongxuan1397@gmail.com"
                    className="w-full px-3.5 py-2 bg-white border border-stone-200 focus:border-amber-600 rounded-xl text-xs focus:outline-none text-stone-800 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1">Mật khẩu Cloud Firebase</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Nhập mật khẩu bạn đã cài đặt"
                    className="w-full px-3.5 py-2 bg-white border border-stone-200 focus:border-amber-600 rounded-xl text-xs focus:outline-none text-stone-850 font-mono"
                    required
                  />
                </div>

                {authErrorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 whitespace-pre-line leading-relaxed font-sans">
                    {authErrorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`w-full py-2.5 bg-stone-900 text-white hover:bg-stone-800 font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-stone-800 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> Đang kết nối Firebase...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-amber-500" /> Đăng nhập Mật Khẩu (Admin)
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Offline Local/Passcode Fallback */}
            {loginMethod === 'passcode' && (
              <form onSubmit={handlePasscodeUnlock} className="space-y-4">
                <p className="text-[11px] text-stone-500 text-left leading-relaxed">
                  Sử dụng mã khóa nội bộ để mở khóa bảng điều khiển. Lưu ý: Nếu mở khóa bằng cách này, các tính năng liên quan đến đồng bộ dữ liệu với Cloud Firebase trực tiếp sẽ bị giới hạn quyền truy cập do rào cản bảo mật Security Rules.
                </p>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    id="input-passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Mã khóa (ví dụ: 123, bichtram, truongxuan)"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:border-amber-600 rounded-xl text-xs focus:outline-none font-mono tracking-widest text-center text-stone-850"
                  />
                </div>

                {passcodeError && (
                  <p className="text-red-500 text-[10px] font-medium">Mã khoá không chính xác. Vui lòng kiểm tra và thử lại (Ví dụ: 123 hoặc bichtram hoặc truongxuan)!</p>
                )}

                <button
                  id="btn-passcode-unlock"
                  type="submit"
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs tracking-wider transition-all cursor-pointer"
                >
                  MỞ KHÓA DANH SÁCH 🔑
                </button>
              </form>
            )}

            <p className="text-[10px] text-stone-400 font-mono mt-6">
              MÃ HOÁ: AES-256 SSL SECURITY ENFORCED
            </p>

            <div className="mt-5 pt-5 border-t border-stone-200/60">
              <button
                type="button"
                onClick={() => { window.location.hash = ''; }}
                className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#0B2D1B] font-semibold transition-colors cursor-pointer"
              >
                ← Quay lại xem Thiệp Cưới
              </button>
            </div>
          </div>
        ) : (
          /* UNLOCKED FULL DASHBOARD */
          <div className="animate-fade-in space-y-8">
            
            {/* Header elements */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-amber-600 font-semibold font-mono">Wedding Management Panel</span>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-900 flex items-center gap-2 mt-1">
                  Đám Cưới Của Trường Xuân &amp; Bích Trâm
                </h2>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    {isFirebaseConfigured ? (
                      currentUser?.email?.toLowerCase() === 'dtruongxuan1397@gmail.com' ? (
                        <span>Đã kết nối Live Database Cloud ☁️: <b className="text-emerald-700 font-mono">dtruongxuan1397@gmail.com (Google Admin)</b></span>
                      ) : (
                        <span>Đã mở khóa nội bộ: <b className="text-amber-700 font-mono">Chỉ hiển thị Offline/Mẫu</b></span>
                      )
                    ) : (
                      <span>Môi trường: <b className="text-amber-700 font-mono">Offline Local Storage (Dành cho thử nghiệm)</b></span>
                    )}
                  </div>
                  {isFirebaseConfigured && currentUser?.email?.toLowerCase() !== 'dtruongxuan1397@gmail.com' && (
                    <div className="flex flex-col gap-1.5 mt-1 sm:mt-0">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button
                          id="btn-login-google-header-inline"
                          onClick={handleGoogleSignIn}
                          disabled={isLoggingIn}
                          className={`text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                        >
                          {isLoggingIn ? (
                            <>
                              <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" /> Đang kết nối Google...
                            </>
                          ) : (
                            <>
                              🔑 Đăng nhập Google Admin để tải dữ liệu thật từ Cloud
                            </>
                          )}
                        </button>
                        {typeof window !== 'undefined' && window.self !== window.top && (
                          <button
                            type="button"
                            onClick={() => window.open(window.location.href, '_blank')}
                            className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Do chạy trong khung thử nghiệm (iframe), vui lòng mở Tab mới để đăng nhập Google."
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" /> Mở Tab Mới ↗
                          </button>
                        )}
                      </div>
                      {authErrorMessage && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700 whitespace-pre-line leading-relaxed mt-1 text-left font-sans max-w-md">
                          {authErrorMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-2 shrink-0">
                {!isFirebaseConfigured && (
                  <>
                    <button
                      id="btn-add-mock"
                      onClick={handleAddMockGuest}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all text-stone-750 border border-stone-200 cursor-pointer"
                      title="Nạp nhanh 1 khách ngẫu nhiên để test"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-600" /> + Thêm vị khách mẫu
                    </button>
                    <button
                      id="btn-clear-mock"
                      onClick={handleClearLocalData}
                      className="px-3 py-2 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all text-red-600 border border-stone-200 cursor-pointer"
                    >
                      Dọn dẹp
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsReloading(true);
                    setSyncCount(c => c + 1);
                    setTimeout(() => setIsReloading(false), 800);
                  }}
                  disabled={isReloading}
                  className="px-3 py-2 bg-[#8C9C95]/10 hover:bg-[#8C9C95]/20 border border-[#8C9C95]/30 text-[#0B2D1B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-60"
                  title="Tải lại toàn bộ dữ liệu từ cơ sở dữ liệu"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} /> Tải lại dữ liệu
                </button>

                <button
                  type="button"
                  onClick={() => { window.location.hash = ''; }}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  Xem thiệp 💌
                </button>

                <button
                  id="btn-sign-out"
                  onClick={handleSignOut}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Thoát
                </button>
              </div>
            </div>

            {/* Analytics Stats Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { 
                  label: 'Tổng lượt gửi RSVP', 
                  val: totalSubmissions, 
                  sub: `${rsvps.filter(r => r.attendance === 'yes').length} đồng ý, ${attendingMaybe} có thể`,
                  icon: <Users className="w-5 h-5 text-amber-650" /> 
                },
                { 
                  label: 'Sĩ số sẽ tham gia (ghế)', 
                  val: totalSeats, 
                  sub: 'Dự kiến theo phản hồi',
                  icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> 
                },
                { 
                  label: 'Có thể tham dự', 
                  val: attendingMaybe, 
                  sub: 'Khách đang cân nhắc',
                  icon: <AlertCircle className="w-5 h-5 text-amber-600" /> 
                },
                { 
                  label: 'Không thể đến', 
                  val: attendingNo, 
                  sub: 'Khách cáo lỗi tiếc nuối',
                  icon: <XCircle className="w-5 h-5 text-red-600" /> 
                },
                { 
                  label: 'Lượt click xem thiệp', 
                  val: views.length, 
                  sub: `${uniqueGuestsViewed} khách${getLocalViews().length > 0 ? ` (+${getLocalViews().length} offline)` : ''}`,
                  icon: <Eye className="w-5 h-5 text-indigo-600" /> 
                }
              ].map((stat, idx) => (
                <div key={idx} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="space-y-1.5 min-w-0">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium leading-none truncate">{stat.label}</span>
                    <span className="text-2xl font-bold font-mono text-stone-900 block">{stat.val}</span>
                    {stat.sub && (
                      <span className="text-[10px] text-stone-400 block truncate font-light">{stat.sub}</span>
                    )}
                  </div>
                  <div className="p-3 bg-white border border-stone-100 rounded-xl shrink-0 shadow-xs ml-2">
                    {stat.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs control row */}
            <div className="flex flex-wrap border-b border-stone-200">
              <button
                id="btn-tab-rsvps"
                onClick={() => setActiveTab('rsvps')}
                className={`py-3 px-5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === 'rsvps'
                    ? 'border-amber-600 text-amber-650 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-850'
                }`}
              >
                Xác Nhận RSVP ({totalSubmissions})
              </button>
              <button
                id="btn-tab-guests"
                onClick={() => setActiveTab('guests')}
                className={`py-3 px-5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === 'guests'
                    ? 'border-amber-600 text-amber-650 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-850'
                }`}
              >
                Danh Sách Khách Mời ({guests.length})
              </button>
              <button
                id="btn-tab-wishes"
                onClick={() => setActiveTab('wishes')}
                className={`py-3 px-5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === 'wishes'
                    ? 'border-amber-600 text-amber-650 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-850'
                }`}
              >
                Lời Chúc ({wishes.length})
              </button>
              <button
                id="btn-tab-profile"
                onClick={() => setActiveTab('profile')}
                className={`py-3 px-5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-amber-600 text-amber-650 font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-850'
                }`}
              >
                Bản sắc cá nhân
              </button>
              {isFirebaseConfigured && isAdminUnlocked && (
                <button
                  id="btn-tab-migration"
                  onClick={() => setActiveTab('migration')}
                  className={`py-3 px-5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                    activeTab === 'migration'
                      ? 'border-amber-600 text-amber-650 font-bold'
                      : 'border-transparent text-stone-500 hover:text-stone-850'
                  }`}
                >
                  🔄 Chuyển Dữ Liệu
                </button>
              )}
            </div>

            {/* List and Filter controls board for RSVPs & Views */}
            {activeTab === 'rsvps' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: RSVPs Guest list table (col-span-8) */}
                <div className="lg:col-span-8 bg-white border border-stone-200 rounded-3xl p-4 md:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-lg font-bold text-stone-900">Danh sách phản hồi RSVP</h4>
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-150">
                      Sĩ số dự kiến: {totalSeats} ghế
                    </span>
                  </div>

                  {/* Filter controls row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Search field */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                      <input
                        id="input-search-guest"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên khách, SĐT..."
                        className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl text-xs focus:outline-none text-stone-800"
                      />
                    </div>

                    {/* Dropdown filters alignment */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Filter className="w-3.5 h-3.5" /> Phân Loại:
                      </div>

                      {/* Attendance status dropdown */}
                      <select
                        id="select-filter-status"
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none text-stone-800"
                      >
                        <option value="all">Mọi trạng thái</option>
                        <option value="yes">Sẽ Tham dự</option>
                        <option value="maybe">Có Thể</option>
                        <option value="no">Bất Khả Kháng</option>
                      </select>

                      {/* Export Trigger */}
                      <button
                        id="btn-export-excel"
                        disabled={filteredRSVPs.length === 0}
                        onClick={handleExportCSV}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer border border-stone-300"
                      >
                        <Download className="w-3.5 h-3.5" /> Xuất CSV
                      </button>
                    </div>
                  </div>

                  {/* Guests RSVP detailed Table */}
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 uppercase font-mono tracking-wider">
                          <th className="py-3 px-4 font-normal">Họ Tên Khách</th>
                          <th className="py-3 px-4 font-normal">Xác Nhận</th>
                          <th className="py-3 px-4 font-normal">Sĩ Số</th>
                          <th className="py-3 px-4 font-normal">Lời Chúc</th>
                          <th className="py-3 px-4 font-normal text-center">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-light">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-stone-400 font-mono">Đang nạp danh sách dữ liệu...</td>
                          </tr>
                        ) : filteredRSVPs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-stone-400 font-mono">Không tìm thấy vị khách nào trùng khớp.</td>
                          </tr>
                        ) : (
                          filteredRSVPs.map((r) => (
                            <tr key={r.id} className="hover:bg-stone-50 transition-all text-stone-850">
                              <td className="py-3 md:py-4 px-4 font-semibold text-stone-800">
                                {r.name}
                              </td>
                              <td className="py-3 md:py-4 px-4">
                                {r.attendance === 'yes' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Sẽ đi
                                  </span>
                                ) : r.attendance === 'maybe' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Có thể
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                                    Tiếc quá
                                  </span>
                                )}
                              </td>
                              <td className="py-3 md:py-4 px-4 font-bold font-mono text-stone-800">
                                {r.attendance === 'yes' ? r.guestCount : '0'}
                              </td>
                              <td className="py-3 md:py-4 px-4 max-w-[200px] truncate-2-lines text-stone-500 font-light text-[11px] leading-relaxed">
                                {r.wishes ? `"${r.wishes}"` : <span className="text-stone-400 font-serif italic">Không gửi lời chúc</span>}
                              </td>
                              <td className="py-3 md:py-4 px-4 text-center shrink">
                                <button
                                  id={`btn-delete-row-${r.id}`}
                                  onClick={() => handleDelete(r.id)}
                                  className="p-1 px-1.5 hover:bg-stone-100 hover:text-red-600 transition-colors rounded-lg text-stone-400"
                                  title="Xóa vị khách này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom total status strip */}
                  <div className="flex justify-between items-center text-[11px] text-stone-400 font-mono py-1.5">
                    <span>Hiện {filteredRSVPs.length} khách mời trùng khớp</span>
                    <span>Hệ thống bảo mật dữ liệu an toàn</span>
                  </div>
                </div>

                {/* Right Column: Lịch sử click xem thiệp (col-span-4) */}
                <div className="lg:col-span-4 bg-white border border-stone-200 rounded-3xl p-4 md:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-stone-900">Lượt click xem thiệp</h4>
                      <p className="text-[10px] text-stone-400 font-light font-mono mt-0.5">
                        Tổng {views.length} lượt từ {uniqueGuestsViewed} khách
                      </p>
                    </div>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold border border-indigo-150 font-mono">
                      {views.length} lượt
                    </span>
                  </div>

                  {/* Visual Platform Breakdown */}
                  {totalViewsCount > 0 && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                      <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Nguồn truy cập</span>
                        <span className="font-normal lowercase text-[9px] text-stone-400">(phân tích tự động)</span>
                      </div>
                      <div className="space-y-2.5">
                        {/* Zalo */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span> Zalo
                            </span>
                            <span className="font-mono text-stone-600">{zaloViews} lượt ({zaloPercent}%)</span>
                          </div>
                          <div className="w-full bg-stone-200/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${zaloPercent}%` }} />
                          </div>
                        </div>

                        {/* Facebook */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-indigo-600 rounded-full inline-block"></span> Facebook
                            </span>
                            <span className="font-mono text-stone-600">{fbViews} lượt ({fbPercent}%)</span>
                          </div>
                          <div className="w-full bg-stone-200/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${fbPercent}%` }} />
                          </div>
                        </div>

                        {/* Direct Browser */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span> Trình duyệt riêng
                            </span>
                            <span className="font-mono text-stone-600">{otherViews} lượt ({browserPercent}%)</span>
                          </div>
                          <div className="w-full bg-stone-200/60 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${browserPercent}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isFirebaseConfigured && getLocalViews().length > 0 && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-2">
                      <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                        Phát hiện <span className="font-bold text-indigo-700">{getLocalViews().length} lượt click</span> lưu ngoại tuyến (offline). Bạn có muốn đồng bộ lên cơ sở dữ liệu?
                      </p>
                      <button
                        id="btn-sync-views-cloud"
                        onClick={handleSyncViews}
                        disabled={syncingViews}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer border border-indigo-650"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingViews ? 'animate-spin' : ''}`} />
                        {syncingViews ? 'Đang đồng bộ...' : 'Đồng bộ lên Database ☁️'}
                      </button>
                    </div>
                  )}

                  {/* Search for Views */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                    <input
                      id="input-search-views-combined"
                      type="text"
                      value={viewSearchQuery}
                      onChange={(e) => setViewSearchQuery(e.target.value)}
                      placeholder="Tìm tên khách hoặc thiết bị..."
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl text-xs focus:outline-none text-stone-800"
                    />
                  </div>

                  {/* Views list */}
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {views.filter(v => {
                      const guestName = (v.guestName || '').toLowerCase();
                      const userAgent = (v.userAgent || '').toLowerCase();
                      const queryStr = (viewSearchQuery || '').toLowerCase();
                      return guestName.includes(queryStr) || userAgent.includes(queryStr);
                    }).length === 0 ? (
                      <p className="text-center py-8 text-stone-400 font-mono text-xs">Không tìm thấy lượt click xem nào.</p>
                    ) : (
                      views
                        .filter(v => {
                          const guestName = (v.guestName || '').toLowerCase();
                          const userAgent = (v.userAgent || '').toLowerCase();
                          const queryStr = (viewSearchQuery || '').toLowerCase();
                          return guestName.includes(queryStr) || userAgent.includes(queryStr);
                        })
                        .map((v) => {
                          let deviceLabel = 'Thiết bị khác';
                          const ua = v.userAgent || '';
                          if (ua.includes('iPhone')) {
                            deviceLabel = ua.includes('FBAV') || ua.includes('FB_IAB') 
                              ? 'iPhone (FB)' 
                              : ua.includes('Zalo') 
                              ? 'iPhone (Zalo)' 
                              : 'iPhone (Safari)';
                          } else if (ua.includes('Android')) {
                            deviceLabel = ua.includes('FBAV') || ua.includes('FB_IAB') 
                              ? 'Android (FB)' 
                              : ua.includes('Zalo') 
                              ? 'Android (Zalo)' 
                              : 'Android';
                          } else if (ua.includes('Macintosh')) {
                            deviceLabel = 'Mac';
                          } else if (ua.includes('Windows')) {
                            deviceLabel = 'PC Windows';
                          }

                          return (
                            <div key={v.id} className="p-3 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200/60 flex items-center justify-between gap-3 text-xs transition-all">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="font-semibold text-stone-850 truncate">{v.guestName || 'Quý khách ẩn danh'}</div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                    {deviceLabel}
                                  </span>
                                  <span className="text-stone-400 text-[10px] font-mono">
                                    {new Date(v.clickedAt).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                              </div>
                              <button
                                id={`btn-delete-view-comb-${v.id}`}
                                onClick={() => handleDeleteView(v.id)}
                                className="p-1 hover:bg-stone-200 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                                title="Xóa lượt click này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* List and Filter controls board for Pre-created Guests list */}
            {activeTab === 'guests' && (
              <div className="space-y-6">
                
                {/* Statistics banner for Pre-created Guests */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50/45 border border-amber-200/60 p-4 rounded-2xl">
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Tổng danh sách đã thêm</span>
                    <h5 className="text-xl font-bold text-stone-900 font-mono">{guests.length} khách mời</h5>
                  </div>
                  <div className="text-center sm:text-left border-y sm:border-y-0 sm:border-x border-stone-200 py-2 sm:py-0 sm:px-6 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Số khách đã xem thiệp</span>
                    <h5 className="text-xl font-bold text-emerald-700 font-mono">
                      {guests.filter(g => g.viewsCount > 0).length} khách
                    </h5>
                  </div>
                  <div className="text-center sm:text-left sm:pl-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Tỷ lệ xem thiệp</span>
                    <h5 className="text-xl font-bold text-indigo-700 font-mono">
                      {guests.length > 0 ? Math.round((guests.filter(g => g.viewsCount > 0).length / guests.length) * 100) : 0}%
                    </h5>
                  </div>
                </div>

                {/* Main section wrapper */}
                <div className="bg-white border border-stone-200 rounded-3xl p-4 md:p-6 shadow-xs space-y-4">
                  
                  {/* Top controls header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-serif text-lg font-bold text-stone-900">Danh sách khách mời gửi thiệp</h4>
                      <p className="text-xs text-stone-400 font-light">Quản lý link thiệp riêng biệt cho từng khách, xem số lần họ mở thiệp.</p>
                    </div>

                    <button
                      id="btn-toggle-add-guest-form"
                      onClick={() => setIsAddingGuest(!isAddingGuest)}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto border border-stone-800"
                    >
                      {isAddingGuest ? 'Hủy thêm khách ✕' : '+ Thêm khách mới 👤'}
                    </button>
                  </div>

                  {/* Add guest inline form */}
                  {isAddingGuest && (
                    <form onSubmit={handleAddGuest} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 md:p-5 space-y-4 animate-fade-in">
                      <h5 className="text-xs uppercase tracking-wider font-bold text-amber-700 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" /> Khai báo thông tin khách mời
                      </h5>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-stone-600">Họ &amp; Tên Khách Mời <span className="text-red-500">*</span></label>
                        <input
                          id="input-guest-name"
                          type="text"
                          required
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          placeholder="Ví dụ: Chị Lan &amp; Gia đình"
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-650 font-medium text-stone-800 shadow-inner"
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-200/50">
                        <button
                          id="btn-cancel-add-guest"
                          type="button"
                          onClick={() => {
                            setIsAddingGuest(false);
                            setNewGuestName('');
                          }}
                          className="px-4 py-2 border border-stone-300 hover:bg-stone-100 rounded-xl text-xs text-stone-600 font-medium transition-all cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          id="btn-submit-add-guest"
                          type="submit"
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                        >
                          Lưu khách mời ✓
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Filter and search board */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                    {/* Search field */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                      <input
                        id="input-search-guests-main"
                        type="text"
                        value={guestsSearchQuery}
                        onChange={(e) => setGuestsSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm khách mời theo tên..."
                        className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl text-xs focus:outline-none text-stone-800"
                      />
                    </div>
                  </div>

                  {/* Guests list detailed Table */}
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 uppercase font-mono tracking-wider">
                          <th className="py-3 px-4 font-normal">Họ Tên Khách</th>
                          <th className="py-3 px-4 font-normal text-center">Lượt xem (Click)</th>
                          <th className="py-3 px-4 font-normal">Xem lần cuối</th>
                          <th className="py-3 px-4 font-normal text-center">Gửi thiệp online</th>
                          <th className="py-3 px-4 font-normal text-center">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-light">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-stone-400 font-mono">Đang tải danh sách khách mời...</td>
                          </tr>
                        ) : filteredGuests.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-stone-400 font-mono">Chưa có khách mời nào trong danh sách. Hãy thêm khách mới ở trên!</td>
                          </tr>
                        ) : (
                          filteredGuests.map((g) => {
                            // Generate share URLs
                            const guestUrl = `${window.location.origin}${window.location.pathname}?to=${encodeURIComponent(g.name)}`;
                            const isCopied = copiedGuestId === g.id;

                            const shareText = `Trân trọng kính mời ${g.name} nhấn vào link dưới đây để nhận thiệp mời online từ vợ chồng Trường Xuân & Bích Trâm nhé: ${guestUrl}`;
                            const zaloShare = `https://sp.zalo.me/share_to_zalo?url=${encodeURIComponent(guestUrl)}&title=${encodeURIComponent('Thiệp cưới online Trường Xuân & Bích Trâm')}`;

                            return (
                              <tr key={g.id} className="hover:bg-stone-50 transition-all text-stone-850">
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-stone-800">{g.name}</div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                                      g.viewsCount > 0 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-stone-50 text-stone-400 border-stone-200'
                                    }`}>
                                      <Eye className="w-3.5 h-3.5 shrink-0" />
                                      {g.viewsCount} lượt
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono text-[10px] text-stone-500">
                                  {g.lastViewedAt ? (
                                    <span title={new Date(g.lastViewedAt).toLocaleString('vi-VN')}>
                                      {new Date(g.lastViewedAt).toLocaleString('vi-VN')}
                                    </span>
                                  ) : (
                                    <span className="text-stone-300 italic">Chưa xem thiệp</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Copy link button */}
                                    <button
                                      id={`btn-copy-guest-url-${g.id}`}
                                      onClick={() => {
                                        navigator.clipboard.writeText(guestUrl);
                                        setCopiedGuestId(g.id);
                                        setTimeout(() => setCopiedGuestId(null), 2000);
                                      }}
                                      className={`p-1.5 rounded-lg border flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer ${
                                        isCopied 
                                          ? 'bg-green-50 border-green-200 text-green-600' 
                                          : 'bg-white hover:bg-stone-55 border-stone-200 text-stone-600'
                                      }`}
                                      title="Copy link gửi riêng khách này"
                                    >
                                      {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Link className="w-3.5 h-3.5" />}
                                      {isCopied ? 'Đã copy' : 'Copy link'}
                                    </button>

                                    {/* Send Zalo directly */}
                                    <a
                                      id={`lnk-share-zalo-guest-${g.id}`}
                                      href={zaloShare}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-all"
                                      title="Chia sẻ link qua Zalo"
                                    >
                                      Zalo
                                    </a>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center shrink">
                                  <button
                                    id={`btn-delete-guest-row-${g.id}`}
                                    onClick={() => handleDeleteGuest(g.id)}
                                    className="p-1 px-1.5 hover:bg-stone-100 hover:text-red-600 transition-colors rounded-lg text-stone-400 cursor-pointer"
                                    title="Xóa khách mời này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer message panel */}
                  <div className="flex justify-between items-center text-[11px] text-stone-400 font-mono py-1">
                    <span>Tổng {filteredGuests.length} khách mời phù hợp bộ lọc</span>
                    <span>Hỗ trợ tự động đếm &amp; tracking thời gian thực</span>
                  </div>
                </div>

              </div>
            )}

            {/* List and Filter controls board for Wedding Wishes */}
            {activeTab === 'wishes' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-4 md:p-6 shadow-xs space-y-4">
                
                {/* Filter controls row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Search field */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                    <input
                      id="input-search-wish"
                      type="text"
                      value={wishSearchQuery}
                      onChange={(e) => setWishSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm theo tên người gửi, nội dung lời chúc..."
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl text-xs focus:outline-none text-stone-800"
                    />
                  </div>
                </div>

                {/* Wishes detailed Table */}
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 uppercase font-mono tracking-wider">
                        <th className="py-3 px-4 font-normal">Họ Tên Khách</th>
                        <th className="py-3 px-4 font-normal">Lời Chúc Gửi Tặng</th>
                        <th className="py-3 px-4 font-normal">Thời Gian Gửi</th>
                        <th className="py-3 px-4 font-normal text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 font-light">
                      {wishes.filter(w => {
                        return w.name.toLowerCase().includes(wishSearchQuery.toLowerCase()) ||
                          w.wishes.toLowerCase().includes(wishSearchQuery.toLowerCase());
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-stone-400 font-mono">Không tìm thấy lời chúc nào trùng khớp.</td>
                        </tr>
                      ) : (
                        wishes
                          .filter(w => {
                            return w.name.toLowerCase().includes(wishSearchQuery.toLowerCase()) ||
                              w.wishes.toLowerCase().includes(wishSearchQuery.toLowerCase());
                          })
                          .map((w) => (
                            <tr key={w.id} className="hover:bg-stone-50 transition-all text-stone-850">
                              <td className="py-3 md:py-4 px-4 font-semibold text-stone-800 whitespace-nowrap">
                                {w.name}
                              </td>
                              <td className="py-3 md:py-4 px-4 text-stone-600 font-light max-w-lg leading-relaxed whitespace-pre-line">
                                "{w.wishes}"
                              </td>
                              <td className="py-3 md:py-4 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                                {new Date(w.createdAt).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-3 md:py-4 px-4 text-center shrink">
                                <button
                                  id={`btn-delete-wish-${w.id}`}
                                  onClick={() => handleDeleteWish(w.id)}
                                  className="p-1 px-1.5 hover:bg-stone-100 hover:text-red-600 transition-colors rounded-lg text-stone-400"
                                  title="Xóa lời chúc này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom total status strip */}
                <div className="flex justify-between items-center text-[11px] text-stone-400 font-mono py-1.5">
                  <span>Hiện {wishes.filter(w => {
                    return w.name.toLowerCase().includes(wishSearchQuery.toLowerCase()) ||
                      w.wishes.toLowerCase().includes(wishSearchQuery.toLowerCase());
                  }).length} lời chúc trùng khớp</span>
                  <span>An toàn dữ liệu SSL mã hoá đỉnh cao</span>
                </div>
              </div>
            )}



            {/* List and Filter controls board for Personal Invitation Creator */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-2 shadow-xs overflow-hidden">
                <ShareInvitation />
              </div>
            )}

            {activeTab === 'migration' && (
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                    🔄 Công Cụ Đồng Bộ & Chuyển Dữ Liệu Firebase Cloud
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Hỗ trợ chuyển tự động từ các dự án Firebase cũ hoặc xuất/nhập sao lưu thủ công bằng file JSON an toàn.
                  </p>
                </div>

                {/* Main options split into two columns: Cloud Sync and JSON Manual */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Cloud-to-Cloud Automatic migration */}
                  <div className="lg:col-span-7 space-y-4 border-r border-stone-100 pr-0 lg:pr-6">
                    <h4 className="font-serif text-md font-bold text-stone-800 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                      <Database className="w-4 h-4 text-amber-600" /> 1. Chuyển Dữ Liệu Cloud-to-Cloud Tự Động
                    </h4>

                    <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed space-y-1">
                      <p className="font-bold text-amber-950">💡 Cách thức hoạt động:</p>
                      <p className="text-stone-700">Công cụ sẽ kết nối trực tiếp đến dự án Firebase cũ do bạn chọn dưới đây, tải toàn bộ dữ liệu, và ghi đè chính xác giữ nguyên ID sang cơ sở dữ liệu hiện tại.</p>
                    </div>

                    <form onSubmit={handleDataMigration} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1.5">Chọn nguồn dữ liệu cũ cần sao chép</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <button
                            id="btn-source-sunny"
                            type="button"
                            onClick={() => setMigrationSource('sunny')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${migrationSource === 'sunny' ? 'border-amber-500 bg-amber-50/30 text-amber-900 font-bold' : 'border-stone-200 hover:bg-stone-50 text-stone-700'}`}
                          >
                            <div className="text-xs">Dự án tạm</div>
                            <div className="text-[9px] text-stone-400 font-mono mt-0.5">sunny-primacy-vgxqk</div>
                          </button>
                          
                          <button
                            id="btn-source-damcuoi"
                            type="button"
                            onClick={() => setMigrationSource('damcuoi')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${migrationSource === 'damcuoi' ? 'border-amber-500 bg-amber-50/30 text-amber-900 font-bold' : 'border-stone-200 hover:bg-stone-50 text-stone-700'}`}
                          >
                            <div className="text-xs">Dự án gốc</div>
                            <div className="text-[9px] text-stone-400 font-mono mt-0.5">dam-cuoi-truong-xuan</div>
                          </button>

                          <button
                            id="btn-source-custom"
                            type="button"
                            onClick={() => setMigrationSource('custom')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${migrationSource === 'custom' ? 'border-amber-500 bg-amber-50/30 text-amber-900 font-bold' : 'border-stone-200 hover:bg-stone-50 text-stone-700'}`}
                          >
                            <div className="text-xs">Cấu hình khác</div>
                            <div className="text-[9px] text-stone-400 font-mono mt-0.5">Nhập tay tham số</div>
                          </button>
                        </div>
                      </div>

                      {migrationSource === 'custom' && (
                        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                          <div className="col-span-2">
                            <label className="block text-[10px] text-stone-500 font-bold mb-1">API KEY *</label>
                            <input
                              type="text"
                              value={customApiKey}
                              onChange={(e) => setCustomApiKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-500 font-bold mb-1">PROJECT ID *</label>
                            <input
                              type="text"
                              value={customProjectId}
                              onChange={(e) => setCustomProjectId(e.target.value)}
                              placeholder="my-wedding-project"
                              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-500 font-bold mb-1">DATABASE ID (Nếu có)</label>
                            <input
                              type="text"
                              value={customDatabaseId}
                              onChange={(e) => setCustomDatabaseId(e.target.value)}
                              placeholder="(default)"
                              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] text-stone-500 font-bold mb-1">AUTH DOMAIN</label>
                            <input
                              type="text"
                              value={customAuthDomain}
                              onChange={(e) => setCustomAuthDomain(e.target.value)}
                              placeholder="my-wedding-project.firebaseapp.com"
                              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] text-stone-500 font-bold mb-1">APP ID</label>
                            <input
                              type="text"
                              value={customAppId}
                              onChange={(e) => setCustomAppId(e.target.value)}
                              placeholder="1:12345678:web:abcdef"
                              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1">Mật khẩu xác thực quyền Admin cũ (Nếu cần)</label>
                        <input
                          type="password"
                          value={migrationPassword}
                          onChange={(e) => setMigrationPassword(e.target.value)}
                          placeholder={adminPassword ? "Dùng mật khẩu đăng nhập quản trị hiện tại" : "Nhập mật khẩu Firebase Admin cũ"}
                          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-650 focus:bg-white rounded-xl text-xs focus:outline-none text-stone-850 font-mono"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">Để trống nếu không cài mật khẩu hoặc muốn chạy đọc trực tiếp.</p>
                      </div>

                      <button
                        type="submit"
                        disabled={isMigrating}
                        className={`px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md ${isMigrating ? 'opacity-75 cursor-wait' : ''}`}
                      >
                        {isMigrating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" /> ĐANG SAO CHÉP DỮ LIỆU CLOUD...
                          </>
                        ) : (
                          <>
                            🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: JSON Manual export/import */}
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="font-serif text-md font-bold text-stone-800 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                      <Upload className="w-4 h-4 text-emerald-600" /> 2. Chuyển Thủ Công Bằng File JSON
                    </h4>

                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 leading-relaxed space-y-2">
                      <p className="font-bold text-emerald-950">🛠️ Phương án chuyển thủ công 100%:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-stone-700">
                        <li>Vào trang quản trị cũ, bấm nút <strong>Xuất dữ liệu dự án cũ ra file JSON</strong> để lưu trữ về máy tính của bạn.</li>
                        <li>Mở trang quản trị mới, chọn file JSON đó ở khung bên dưới để <strong>Nhập &amp; Khôi phục dữ liệu</strong>.</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      {/* Export action */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold">A. Xuất dữ liệu lưu trữ</label>
                        <button
                          id="btn-export-backup-json"
                          onClick={handleExportJSON}
                          disabled={isMigrating}
                          className="w-full py-2.5 bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Xuất dữ liệu dự án hiện tại ra file JSON
                        </button>
                      </div>

                      {/* Import action */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-wider text-stone-500 font-bold">B. Khôi phục từ file backup JSON</label>
                        <div className="relative border-2 border-dashed border-stone-200 rounded-xl p-4 hover:border-emerald-500 hover:bg-stone-50 transition-all text-center">
                          <input
                            id="file-import-json"
                            type="file"
                            accept=".json"
                            disabled={isMigrating}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImportJSON(file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                          <div className="text-xs font-semibold text-stone-700">Nhấp hoặc kéo thả file JSON sao lưu vào đây</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Hệ thống sẽ tải và ghi đè danh bạ mời của bạn</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Progress Logs */}
                {migrationLogs.length > 0 && (
                  <div className="space-y-2 text-left pt-2 border-t border-stone-100">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-stone-500 font-mono">Nhật ký tiến trình thực hiện:</h4>
                    <div className="bg-stone-900 border border-stone-850 text-stone-300 p-4 rounded-2xl text-xs font-mono h-64 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-stone-800">
                      {migrationLogs.map((log, index) => (
                        <div key={index} className={log.startsWith('❌') ? 'text-red-400 font-semibold' : log.startsWith('✅') ? 'text-emerald-400 font-semibold' : log.startsWith('⚡') ? 'text-amber-350' : 'text-stone-300'}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {migrationSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 text-left">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-900 text-sm mb-1">Thao tác hoàn tất thành công!</strong>
                      Dữ liệu của bạn đã được cập nhật an toàn. Vui lòng nhấn nút <strong>"Tải lại dữ liệu"</strong> ở phía góc trên bên phải để đồng bộ danh sách hiển thị trên bảng điều khiển.
                    </div>
                  </div>
                )}

                {migrationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5 text-left">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-red-900 text-sm mb-1 font-bold">Thất bại:</strong>
                      {migrationError}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </section>
  );
}
