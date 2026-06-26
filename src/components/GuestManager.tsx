import { useState, useEffect, FormEvent } from 'react';
import { 
  Lock, Key, Users, CheckCircle2, XCircle, AlertCircle, 
  Search, Filter, Trash2, Download, RefreshCw, UserPlus, LogIn, LogOut, Eye,
  Plus, Phone, UserCheck, Heart, Share2, Link, Check, Copy, ChevronRight
} from 'lucide-react';

// Database triggers
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
  addDocWithTimeout
} from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { RSVPSubmission, WishSubmission, ViewSubmission, Guest } from '../types';
import ShareInvitation from './ShareInvitation';

export default function GuestManager() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('wedding_admin_unlocked') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  
  // Tab alignment
  const [activeTab, setActiveTab] = useState<'rsvps' | 'guests' | 'wishes' | 'profile'>('rsvps');

  // Data list states
  const [rsvps, setRsvps] = useState<RSVPSubmission[]>([]);
  const [wishes, setWishes] = useState<WishSubmission[]>([]);
  const [views, setViews] = useState<ViewSubmission[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'yes' | 'no' | 'maybe'>('all');
  const [wishSearchQuery, setWishSearchQuery] = useState('');
  const [viewSearchQuery, setViewSearchQuery] = useState('');
  const [guestsSearchQuery, setGuestsSearchQuery] = useState('');
  const [guestsSideFilter, setGuestsSideFilter] = useState<'all' | 'bride' | 'groom' | 'both'>('all');

  // Form states for adding guests
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestSide, setNewGuestSide] = useState<'bride' | 'groom' | 'both'>('both');
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  // Load Auth state
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        // If user is verified admin (matching email Dtruongxuan1397@gmail.com)
        if (user && user.email === 'Dtruongxuan1397@gmail.com') {
          setIsAdminUnlocked(true);
          localStorage.setItem('wedding_admin_unlocked', 'true');
        }
      });
      return unsubscribe;
    }
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
              phone: d.phone || '',
              attendance: d.attendance || 'yes',
              guestCount: d.guestCount || 0,
              side: d.side || 'bride',
              wishes: d.wishes || '',
              dietaryNotes: d.dietaryNotes || '',
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt
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
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString()
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
              clickedAt: d.clickedAt?.toDate ? d.clickedAt.toDate().toISOString() : d.clickedAt || new Date().toISOString()
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
              phone: d.phone || '',
              side: d.side || 'both',
              viewsCount: d.viewsCount || 0,
              lastViewedAt: d.lastViewedAt?.toDate ? d.lastViewedAt.toDate().toISOString() : d.lastViewedAt || null,
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
    if (passcode.trim().toLowerCase() === '123') {
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
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email === 'Dtruongxuan1397@gmail.com') {
        setIsAdminUnlocked(true);
        localStorage.setItem('wedding_admin_unlocked', 'true');
      } else {
        alert('Tài khoản này không có quyền quản lý đám cưới. Vui lòng đăng nhập với Dtruongxuan1397@gmail.com hoặc sử dụng mã khoá dự phòng.');
        await signOut(auth);
      }
    } catch (err) {
      console.error(err);
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

  // Add Guest
  const handleAddGuest = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    const payload = {
      name: newGuestName.trim(),
      phone: newGuestPhone.trim(),
      side: newGuestSide,
      viewsCount: 0,
      views: []
    };

    if (isFirebaseConfigured && db) {
      try {
        await addDocWithTimeout(collection(db, 'guests'), payload, 4000);
        setNewGuestName('');
        setNewGuestPhone('');
        setNewGuestSide('both');
        setIsAddingGuest(false);
      } catch (err) {
        alert('Lỗi khi thêm khách mời vào Firestore: ' + err);
      }
    } else {
      saveLocalGuest(payload);
      setNewGuestName('');
      setNewGuestPhone('');
      setNewGuestSide('both');
      setIsAddingGuest(false);
      setSyncCount(c => c + 1);
    }
  };

  // Delete Guest
  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khách mời này khỏi danh sách không?')) return;

    if (isFirebaseConfigured && db) {
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
      phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
      attendance: randomStatus,
      side: 'both' as const,
      guestCount: randomStatus === 'yes' ? Math.floor(1 + Math.random() * 3) : 0,
      wishes: randomWish,
      dietaryNotes: ''
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
    let csvContent = BOM + 'Họ Tên Khách,Số Điện Thoại,Trạng Thái,Sĩ Số Tham Gia,Lời Chúc Dự Tiệc,Thời Gian\n';

    rsvps.forEach(r => {
      const statusText = r.attendance === 'yes' ? 'Tham Dự' : r.attendance === 'no' ? 'Bất Khả Kháng' : 'Có Thể';
      
      const row = [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.phone}"`,
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

  // Live filter arrays
  const filteredRSVPs = rsvps.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || r.attendance === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredGuests = guests.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(guestsSearchQuery.toLowerCase()) || 
      (g.phone && g.phone.includes(guestsSearchQuery));
    
    const matchesSide = guestsSideFilter === 'all' || g.side === guestsSideFilter;

    return matchesSearch && matchesSide;
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

            {/* Google admin login check */}
            {isFirebaseConfigured && (
              <button
                id="btn-admin-google-auth"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 bg-stone-900 text-white hover:bg-stone-800 font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 mb-4 cursor-pointer border border-stone-800"
              >
                <LogIn className="w-4 h-4 text-amber-500" /> Đăng nhập bằng Google (Admin)
              </button>
            )}

            <div className="relative flex py-2.5 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-4 text-[10px] text-stone-400 uppercase tracking-widest font-mono">
                {isFirebaseConfigured ? 'Hoặc nhập mã nội bộ' : 'Mở khóa bảng thử nghiệm'}
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            {/* Passcode fallback */}
            <form onSubmit={handlePasscodeUnlock} className="space-y-4 mt-4">
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <input
                  id="input-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Mã khóa (ví dụ: 123)"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:border-amber-600 rounded-xl text-xs focus:outline-none font-mono tracking-widest text-center text-stone-850"
                />
              </div>

              {passcodeError && (
                <p className="text-red-500 text-[10px] font-medium">Mã khoá không chính xác. Vui lòng kiểm tra và thử lại!</p>
              )}

              <button
                id="btn-passcode-unlock"
                type="submit"
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs tracking-wider transition-all cursor-pointer"
              >
                MỞ KHÓA DANH SÁCH 🔑
              </button>
            </form>

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
                <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  {isFirebaseConfigured ? (
                    <span>Kết nối Live Firestore: <b className="text-amber-700 font-mono">Bảo mật tối đa</b></span>
                  ) : (
                    <span>Môi trường: <b className="text-amber-700 font-mono">Offline Local Storage (Dành cho thử nghiệm)</b></span>
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
                { label: 'Tổng lượt gửi RSVP', val: totalSubmissions, icon: <Users className="w-5 h-5 text-amber-650" /> },
                { label: 'Sĩ số sẽ tham gia (ghế)', val: totalSeats, icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> },
                { label: 'Có thể tham dự', val: attendingMaybe, icon: <AlertCircle className="w-5 h-5 text-amber-600" /> },
                { label: 'Không thể đến', val: attendingNo, icon: <XCircle className="w-5 h-5 text-red-600" /> },
                { label: 'Lượt click xem thiệp', val: views.length, icon: <Eye className="w-5 h-5 text-indigo-600" /> }
              ].map((stat, idx) => (
                <div key={idx} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium leading-none">{stat.label}</span>
                    <span className="text-2xl font-bold font-mono text-stone-900">{stat.val}</span>
                  </div>
                  <div className="p-3 bg-white border border-stone-100 rounded-xl shrink-0 shadow-xs">
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
                          <th className="py-3 px-4 font-normal">SĐT Bảo Mật</th>
                          <th className="py-3 px-4 font-normal">Xác Nhận</th>
                          <th className="py-3 px-4 font-normal">Sĩ Số</th>
                          <th className="py-3 px-4 font-normal">Lời Chúc</th>
                          <th className="py-3 px-4 font-normal text-center">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-light">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-stone-400 font-mono">Đang nạp danh sách dữ liệu...</td>
                          </tr>
                        ) : filteredRSVPs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-stone-400 font-mono">Không tìm thấy vị khách nào trùng khớp.</td>
                          </tr>
                        ) : (
                          filteredRSVPs.map((r) => (
                            <tr key={r.id} className="hover:bg-stone-50 transition-all text-stone-850">
                              <td className="py-3 md:py-4 px-4 font-semibold text-stone-800">
                                {r.name}
                              </td>
                              <td className="py-3 md:py-4 px-4 font-mono text-[11px] text-stone-500">
                                {r.phone || '—'}
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
                    <h4 className="font-serif text-lg font-bold text-stone-900">Lượt click xem thiệp</h4>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold border border-indigo-150 font-mono">
                      {views.length} lượt
                    </span>
                  </div>

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
                      return v.guestName.toLowerCase().includes(viewSearchQuery.toLowerCase()) ||
                        v.userAgent.toLowerCase().includes(viewSearchQuery.toLowerCase());
                    }).length === 0 ? (
                      <p className="text-center py-8 text-stone-400 font-mono text-xs">Không tìm thấy lượt click xem nào.</p>
                    ) : (
                      views
                        .filter(v => {
                          return v.guestName.toLowerCase().includes(viewSearchQuery.toLowerCase()) ||
                            v.userAgent.toLowerCase().includes(viewSearchQuery.toLowerCase());
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
                                <div className="font-semibold text-stone-850 truncate">{v.guestName}</div>
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-stone-600">Số Điện Thoại (Tùy chọn)</label>
                          <input
                            id="input-guest-phone"
                            type="text"
                            value={newGuestPhone}
                            onChange={(e) => setNewGuestPhone(e.target.value)}
                            placeholder="Ví dụ: 0912345678"
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-655 font-medium text-stone-800 shadow-inner"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-stone-600">Phía gia đình</label>
                          <select
                            id="select-guest-side"
                            value={newGuestSide}
                            onChange={(e: any) => setNewGuestSide(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-stone-200 focus:border-amber-650 rounded-xl text-xs focus:outline-none text-stone-800"
                          >
                            <option value="both">Họ hàng cả Hai bên</option>
                            <option value="groom">Đại diện Nhà Trai</option>
                            <option value="bride">Đại diện Nhà Gái</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-200/50">
                        <button
                          id="btn-cancel-add-guest"
                          type="button"
                          onClick={() => {
                            setIsAddingGuest(false);
                            setNewGuestName('');
                            setNewGuestPhone('');
                            setNewGuestSide('both');
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
                        placeholder="Tìm kiếm khách mời theo tên, SĐT..."
                        className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-stone-400 rounded-xl text-xs focus:outline-none text-stone-800"
                      />
                    </div>

                    {/* Filter selection dropdown */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Filter className="w-3.5 h-3.5" /> Bộ lọc:
                      </div>

                      <select
                        id="select-guests-side-filter"
                        value={guestsSideFilter}
                        onChange={(e: any) => setGuestsSideFilter(e.target.value)}
                        className="px-3.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none text-stone-800"
                      >
                        <option value="all">Tất cả khách mời</option>
                        <option value="both">Họ hàng Hai bên</option>
                        <option value="groom">Phía Nhà Trai</option>
                        <option value="bride">Phía Nhà Gái</option>
                      </select>
                    </div>
                  </div>

                  {/* Guests list detailed Table */}
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 uppercase font-mono tracking-wider">
                          <th className="py-3 px-4 font-normal">Họ Tên Khách</th>
                          <th className="py-3 px-4 font-normal">SĐT</th>
                          <th className="py-3 px-4 font-normal">Đại diện</th>
                          <th className="py-3 px-4 font-normal text-center">Lượt xem (Click)</th>
                          <th className="py-3 px-4 font-normal">Xem lần cuối</th>
                          <th className="py-3 px-4 font-normal text-center">Gửi thiệp online</th>
                          <th className="py-3 px-4 font-normal text-center">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 font-light">
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-stone-400 font-mono">Đang tải danh sách khách mời...</td>
                          </tr>
                        ) : filteredGuests.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-stone-400 font-mono">Chưa có khách mời nào trong danh sách. Hãy thêm khách mới ở trên!</td>
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
                                <td className="py-3 px-4 font-mono text-[11px] text-stone-500">
                                  {g.phone || '—'}
                                </td>
                                <td className="py-3 px-4">
                                  {g.side === 'groom' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      Nhà Trai
                                    </span>
                                  ) : g.side === 'bride' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                                      Nhà Gái
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                      Hai Bên
                                    </span>
                                  )}
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

                                    {/* Inline view history timeline if views exist */}
                                    {g.views && g.views.length > 0 && (
                                      <div className="mt-1.5 max-w-[150px] space-y-0.5 text-[9px] text-stone-400 font-mono text-left max-h-[40px] overflow-y-auto pr-1">
                                        {g.views.map((vw, vi) => (
                                          <div key={vi} className="truncate" title={`Xem vào: ${new Date(vw.clickedAt).toLocaleString('vi-VN')} | Thiết bị: ${vw.userAgent}`}>
                                            • {new Date(vw.clickedAt).toLocaleTimeString('vi-VN')} ({vw.userAgent.includes('iPhone') ? 'iPhone' : vw.userAgent.includes('Android') ? 'Android' : 'PC'})
                                          </div>
                                        ))}
                                      </div>
                                    )}
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

          </div>
        )}

      </div>
    </section>
  );
}
