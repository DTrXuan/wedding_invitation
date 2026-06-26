import { useState, useEffect } from 'react';
import { 
  Heart, Calendar, MapPin, Sparkles, ChevronDown, 
  Compass, ArrowUp, Milestone, MessageSquareHeart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

// Import subcomponents
import WeddingCeremonyInfo from './components/WeddingCeremonyInfo';
import CountdownRSVP from './components/CountdownRSVP';
import PhotoAlbum from './components/PhotoAlbum';
import Guestbook from './components/Guestbook';
import WeddingGifts from './components/WeddingGifts';
import ShareInvitation from './components/ShareInvitation';
import GuestManager from './components/GuestManager';
import MusicPlayer from './components/MusicPlayer';
import LiveSchedule from './components/LiveSchedule';
import { WeddingCoupleInfo } from './types';
import OptimizedImage from './components/OptimizedImage';

export default function App() {
  const [invitedGuest, setInvitedGuest] = useState<string>('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentPage, setCurrentPage] = useState<'invitation' | 'schedule' | 'admin'>('invitation');
  const [isCardOpened, setIsCardOpened] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(true);

  // Parse custom invitee parameter '?to=name'
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toParam = params.get('to');
    const adminParam = params.get('admin');
    if (toParam) {
      setInvitedGuest(toParam);
      if (adminParam === 'true' || window.location.hash === '#admin') {
        setShowAdminPanel(true);
      } else {
        setShowAdminPanel(false);
      }
    } else {
      setShowAdminPanel(true);
    }

    // Scroll top monitor
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);

    // Hash routing listener
    const handleHashChange = () => {
      if (window.location.hash === '#schedule') {
        setCurrentPage('schedule');
        window.scrollTo({ top: 0 });
      } else if (window.location.hash === '#admin') {
        setCurrentPage('admin');
        window.scrollTo({ top: 0 });
      } else {
        setCurrentPage('invitation');
      }

      if (window.location.hash === '#admin') {
        setShowAdminPanel(true);
      }
    };
    handleHashChange(); // Run once at load
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Lock scroll when card is not opened yet
  useEffect(() => {
    if (!isCardOpened && currentPage === 'invitation') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCardOpened, currentPage]);

  const handleOpenCard = () => {
    setIsCardOpened(true);

    // Fire a magnificent celebratory confetti explosion!
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#C39B62', '#e2b370', '#f1d6ab', '#f59e0b', '#ec4899', '#f43f5e'] // Luxury warm gold, wedding colors, and rose tones
    });
    
    // Staggered elegant side bursts for extra depth and celebration
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.85 },
        colors: ['#C39B62', '#e2b370', '#f59e0b']
      });
    }, 200);
    
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.85 },
        colors: ['#C39B62', '#e2b370', '#f59e0b']
      });
    }, 350);

    // Programmatically play music after interaction
    setTimeout(() => {
      const playBtn = document.getElementById('btn-play-music');
      if (playBtn) {
        playBtn.click();
      }
    }, 300);
  };

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Pre-configured couple bios
  const groomInfo: WeddingCoupleInfo = {
    name: "Đoàn Trường Xuân",
    shortName: "Trường Xuân",
    avatar: "image/Groom.jpg",
    father: "Đoàn Trường Minh",
    mother: "Lê Thị Thanh Thủy",
    birthdate: "Trưởng Nam",
    description: "Sự hiện diện của quý vị là niềm vinh hạnh lớn nhất cho gia đình chúng tôi!",
    bankName: "TimoBank",
    bankAccount: "0945405234",
    bankBranch: "Chi nhánh Hà Nội",
    qrCodeUrl: "https://api.vietqr.io/image/970454-0945405234-qr_only.png?accountName=DOAN%20TRUONG%20XUAN"
  };

  const brideInfo: WeddingCoupleInfo = {
    name: "Lê Bích Trâm",
    shortName: "Bích Trâm",
    avatar: "image/Bride.jpg",
    father: "Lê Thanh Tâm",
    mother: "Nguyễn Thị Tiền",
    birthdate: "Quý Nữ",
    description: "Hân hạnh được chào đón và đón tiếp quý khách tại tiệc cưới Aladin của chúng tôi!",
    bankName: "Vietcombank",
    bankAccount: "1027558429",
    bankBranch: "Chi nhánh Đà Nẵng",
    qrCodeUrl: "https://api.vietqr.io/image/970436-1027558429-qr_only.png?accountName=LE%20BICH%20TRAM"
  };

  const weddingDateTimestamp = new Date("2026-07-12T11:00:00").getTime();

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-[#FDFCF9] text-stone-850 font-sans relative selection:bg-amber-100 selection:text-stone-900 overflow-x-hidden py-10">
        <GuestManager />
      </div>
    );
  }

  if (currentPage === 'schedule') {
    return (
      <div className="min-h-screen bg-[#FAF4EB] text-stone-850 font-sans relative selection:bg-amber-100 selection:text-stone-900 overflow-x-hidden">
        <MusicPlayer />
        <LiveSchedule onBackToInvitation={() => { window.location.hash = ''; }} isGuest={!!invitedGuest} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-850 font-sans relative selection:bg-amber-100 selection:text-[#0C2340] overflow-x-hidden">
      
      {/* 🧧 TRADITIONAL PREMIUM RED ENVELOPE OPENING COVER SCREEN 🧧 */}
      <AnimatePresence>
        {!isCardOpened && (
          <motion.div
            key="envelope-screen"
            initial={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: '-100%',
              transition: { duration: 0.8, ease: [0.77, 0, 0.175, 1] }
            }}
            className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-center items-center bg-gradient-to-b from-[#132A1C] via-[#0B2D1B] to-[#04140C] text-amber-100 px-4 select-none"
          >
            {/* Elegant thin border */}
            <div className="absolute inset-4 sm:inset-6 border border-white/5 rounded-3xl pointer-events-none"></div>
            
            {/* Elegant luxury corner watermark graphic overlays similar to the uploaded image */}
            <div className="absolute -top-12 -left-12 w-64 h-64 border-r border-b border-white/[0.03] rounded-br-[80px] pointer-events-none select-none"></div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 border-l border-t border-white/[0.03] rounded-tl-[80px] pointer-events-none select-none"></div>
            
            {/* Traditional oriental corner accents inside the container */}
            <div className="absolute top-10 left-10 w-8 h-8 border-t border-l border-amber-500/20 pointer-events-none"></div>
            <div className="absolute top-10 right-10 w-8 h-8 border-t border-r border-amber-500/20 pointer-events-none"></div>
            <div className="absolute bottom-10 left-10 w-8 h-8 border-b border-l border-amber-500/20 pointer-events-none"></div>
            <div className="absolute bottom-10 right-10 w-8 h-8 border-b border-r border-amber-500/20 pointer-events-none"></div>

            {/* Main content wrap matching image style perfectly */}
            <div className="max-w-md w-full text-center space-y-6 z-10 flex flex-col items-center">
              
              {/* Glowing circular medallion icon at the top */}
              <div className="relative w-20 h-20 bg-[#FAF2E5]/5 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-[#FAF2E5]/15 mb-2 animate-pulse">
                <div className="absolute inset-1 rounded-full border border-dashed border-amber-400/20"></div>
                <span className="text-3xl text-amber-200 select-none font-serif">囍</span>
              </div>

              {/* Groom & Bride names in centered display serif typography */}
              <div className="space-y-1.5 text-center">
                <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-white drop-shadow-sm">
                  Trường Xuân
                </h1>
                <p className="text-amber-200/60 font-serif italic text-lg leading-none">&amp;</p>
                <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-white drop-shadow-sm">
                  Bích Trâm
                </h1>
              </div>

              {/* Elegant horizontal divider with central symbol matching image */}
              <div className="flex items-center justify-center gap-3 w-32 py-1">
                <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent to-amber-200/40"></div>
                <span className="text-amber-200/60 text-[10px]">❦</span>
                <div className="h-[0.5px] flex-1 bg-gradient-to-l from-transparent to-amber-200/40"></div>
              </div>

              {/* Date display text block */}
              <p className="text-lg sm:text-xl font-serif text-amber-100/90 tracking-wide font-light">
                12 tháng 7, 2026
              </p>

              {/* Personal Invite Section (keeping Trân Trọng Kính Mời + Guest Name) */}
              <div className="space-y-1 pt-1.5 pb-2">
                <p className="text-stone-300 text-xs uppercase tracking-[0.2em] font-serif italic font-light opacity-85">
                  Trân trọng kính mời
                </p>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-amber-100 tracking-wide">
                  {invitedGuest ? invitedGuest : 'Quý khách & Bạn hữu'}
                </h2>
              </div>

              {/* Highlight Wedding Party Time Box - Highly Visible! */}
              <div className="w-full max-w-xs bg-[#FAF2E5]/5 border border-amber-500/25 rounded-2xl p-4 shadow-inner text-center space-y-1 backdrop-blur-xs">
                <p className="text-[9px] uppercase tracking-widest text-amber-300 font-bold">
                  Tiệc Cưới Bắt Đầu Vào Lúc
                </p>
                <p className="text-sm font-extrabold text-white tracking-wide">
                  11:00 Trưa — Chủ Nhật, 12/07/2026
                </p>
                <p className="text-[10px] text-amber-100/60 font-light leading-relaxed">
                  tại Nhà Hàng Aladin
                </p>
              </div>

              {/* Glowing "Mở thiệp" button matching the exact design and hover effects */}
              <div className="pt-6 relative flex flex-col items-center">
                <motion.button
                  id="btn-open-envelope"
                  onClick={handleOpenCard}
                  animate={{
                    scale: [1, 1.04, 1],
                    boxShadow: [
                      "0 0 15px rgba(232, 239, 233, 0.25)",
                      "0 0 35px rgba(250, 242, 229, 0.6)",
                      "0 0 15px rgba(232, 239, 233, 0.25)"
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="cursor-pointer px-16 py-4 bg-gradient-to-r from-[#FAF2E5] via-[#E8EFE9] to-[#FAF2E5] text-[#0B2D1B] font-sans font-extrabold rounded-full text-sm uppercase tracking-[0.25em] shadow-[0_0_25px_rgba(232,239,233,0.35)] transition-all duration-300 ring-4 ring-white/15 hover:ring-amber-200/40 relative z-10"
                >
                  Mở thiệp
                </motion.button>
                {/* Decorative subtle radiating waves behind the button */}
                <span className="absolute w-44 h-12 bg-[#E8EFE9]/10 rounded-full animate-ping pointer-events-none opacity-40"></span>
              </div>
            </div>
            
            {/* Soft decorative visual background emblem */}
            <div className="absolute bottom-6 opacity-5 pointer-events-none select-none text-[10px] tracking-widest uppercase font-serif">
              ✧ Happy Wedding Day ✧
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 STICKY CORE HEADER / NAVIGATION 🚀 */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg bg-[#0B2D1B]/95 backdrop-blur-md rounded-full px-5 py-2.5 border border-amber-500/20 shadow-xl flex items-center justify-between text-amber-100 animate-fade-in">
        <span className="font-serif text-xs font-extrabold tracking-widest text-amber-300 flex items-center gap-1.5 selection:bg-transparent">
          囍 Trường Xuân &amp; Bích Trâm
        </span>
        <div className="flex items-center gap-1.5 md:gap-3">
          <button
            id="nav-btn-invitation"
            onClick={() => { window.location.hash = ''; }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
              currentPage === 'invitation' 
                ? 'bg-amber-400 text-[#0B2D1B] shadow-sm' 
                : 'text-amber-200/70 hover:text-white bg-transparent'
            }`}
          >
            Thiệp Cưới 💌
          </button>
          <button
            id="nav-btn-schedule"
            onClick={() => { window.location.hash = '#schedule'; }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1 ${
              currentPage === 'schedule'
                ? 'bg-amber-400 text-[#0B2D1B] shadow-sm'
                : 'text-amber-200/70 hover:text-white bg-transparent'
            }`}
          >
            Lịch Trình Live 🟢
          </button>
        </div>
      </nav>

      {/* Floating Background Music Core Widget */}
      <MusicPlayer />

      {/* 1. HERO HOME COVER (SANG TRỌNG TRUYỀN THỐNG SONG LONG XANH LÁ THEO HÌNH ĐÍNH KÈM) */}
      <header className="relative min-h-screen flex flex-col items-center pt-16 pb-10 px-4 overflow-hidden bg-[#FCFAF5] text-stone-800">
        
        {/* Deep Forest Green top background panel with curved bottom contour */}
        <div className="absolute top-0 left-0 right-0 h-[65vh] md:h-[70vh] bg-gradient-to-b from-[#061F12] to-[#0B2D1B] rounded-b-[40px] sm:rounded-b-[80px] md:rounded-b-[150px] z-0 shadow-lg"></div>

        {/* Intricate decorative border layout inside the green panel */}
        <div className="absolute inset-x-4 top-4 bottom-[38vh] md:bottom-[33vh] border border-white/10 rounded-2xl pointer-events-none z-10"></div>
        <div className="absolute inset-x-5 top-5 bottom-[39vh] md:bottom-[34vh] border-2 border-white/15 rounded-2xl pointer-events-none z-10"></div>

        {/* Soft elegant backing light glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-400/5 rounded-full blur-3xl z-0 pointer-events-none"></div>

        {/* Core content wrapper */}
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center pt-8 sm:pt-12 text-center">
          
          {/* Welcome gold motto */}
          <span className="text-[#C39B62] font-serif text-[10px] sm:text-xs tracking-[0.3em] font-semibold uppercase mb-6 sm:mb-8 animate-fade-in block">
            Welcome To Our Wedding
          </span>

          {/* Core Traditional Couples Row with Song Hỷ 囍 */}
          <div className="w-full max-w-2xl grid grid-cols-12 gap-2 items-center px-2 sm:px-6">
            
            {/* Groom side */}
            <div className="col-span-4 text-right space-y-1">
              <span className="text-[#CDE4DB]/75 font-serif text-[10px] sm:text-xs tracking-wider font-light block uppercase">
                Trưởng Nam
              </span>
              <h2 className="font-serif text-lg sm:text-2xl md:text-3xl font-bold text-white tracking-wide uppercase leading-tight">
                Trường Xuân
              </h2>
            </div>

            {/* Centered Song Hy Symbol */}
            <div className="col-span-4 flex justify-center">
              <span className="text-[#CDE4DB] font-serif text-5xl sm:text-7xl md:text-8xl font-light select-none leading-none animate-pulse-slow">
                囍
              </span>
            </div>

            {/* Bride side */}
            <div className="col-span-4 text-left space-y-1">
              <span className="text-[#CDE4DB]/75 font-serif text-[10px] sm:text-xs tracking-wider font-light block uppercase">
                Quý Nữ
              </span>
              <h2 className="font-serif text-lg sm:text-2xl md:text-3xl font-bold text-white tracking-wide uppercase leading-tight">
                Bích Trâm
              </h2>
            </div>

          </div>

          {/* Arced gold sentiment with stars */}
          <div className="mt-6 sm:mt-8 select-none">
            <span className="text-[#C39B62] font-serif italic text-xs sm:text-sm tracking-[0.25em] font-medium uppercase inline-flex items-center gap-2">
              ✦ Love never fails ✦
            </span>
          </div>

          {/* 🏛️ ELegant Tall Roman Arch Framing the Pre-Wedding photo 🏛️ */}
          <div className="relative mt-8 sm:mt-10 w-[270px] sm:w-[360px] md:w-[410px] aspect-[2/3] rounded-t-[135px] sm:rounded-t-[180px] md:rounded-t-[205px] overflow-hidden border-[6px] sm:border-[8px] border-white shadow-2xl z-20 bg-stone-100 transition-all duration-500 hover:scale-[1.01] hover:shadow-3xl">
            <OptimizedImage 
              src="image/anhbia.jpg" 
              alt="Ảnh bìa cưới Trường Xuân và Bích Trâm" 
              fallbackSrc="https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&auto=format&fit=crop"
              loading="eager"
              width={800}
              quality={85}
              className="filter brightness-[97%] animate-ken-burns"
              fetchPriority="high"
            />
          </div>

          {/* 💌 PERSONALIZED GUEST INVITE CARD - PLACED DIRECTLY BELOW ARCH 💌 */}
          <div className="mt-8 sm:mt-12 w-full max-w-md px-4">
            {invitedGuest ? (
              <div className="bg-[#FAF2E5] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 text-stone-900 shadow-xl relative animate-scale-up">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 block mb-1">Trân Trọng Kính Mời Quý Khách</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0B2D1B] mb-3 truncate">
                  {invitedGuest}
                </h2>
                <div className="w-8 h-8 rounded-full bg-amber-100/50 flex items-center justify-center mx-auto mb-4 text-[#0B2D1B] shrink-0">
                  <Heart className="w-4 h-4 fill-[#0B2D1B] text-[#0B2D1B] animate-pulse" />
                </div>
                <p className="text-stone-650 text-xs font-light leading-relaxed mb-1">
                  Sự hiện diện kính mời của bạn là vinh hạnh lớn nhất của gia đình hai bên Nhà Trai & Nhà Gái, cùng nhau chung vui và nâng chén rượu mừng cho ngày hạnh phúc trăm năm của Đoàn Trường Xuân & Lê Bích Trâm.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-sm mx-auto">
                <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                  Tình yêu của hai chúng tôi vượt qua những thăng trầm để hôm nay, trước sự chứng kiến của người thân và bè bạn bè, nguyện hứa trọn đời kề vai sát cánh.
                </p>
                <div className="text-xs sm:text-sm tracking-widest font-mono text-[#0B2D1B] font-bold pb-2">
                  CHỦ NHẬT, 12 THÁNG 07 NĂM 2026
                </div>
              </div>
            )}
          </div>

          {/* Animated bounce indicator scroll down */}
          <button 
            id="btn-scroll-indicator"
            onClick={() => handleScrollToSection('ceremony-details')}
            className="mt-4 sm:mt-6 flex flex-col items-center gap-1.5 focus:outline-none hover:text-[#0B2D1B] transition-colors cursor-pointer text-stone-400"
          >
            <span className="text-[10px] tracking-widest font-mono uppercase font-light text-stone-500">Cuộn màn hình</span>
            <ChevronDown className="w-5 h-5 animate-bounce text-stone-500" />
          </button>
        </div>
      </header>

      {/* 2. THÔNG TIN LỄ CƯỚI (THEO CẤU TRÚC HÌNH ĐÍNH KÈM) */}
      <section id="ceremony-details">
        <div className="bg-[#0B2D1B] py-2.5 text-center select-none shadow-sm">
          <h2 className="font-serif text-xs sm:text-sm font-bold text-white tracking-[0.25em] uppercase">
            Thông Tin Lễ Cưới
          </h2>
        </div>
        <WeddingCeremonyInfo 
          groomName={groomInfo.name} 
          brideName={brideInfo.name}
          groomFather={groomInfo.father}
          groomMother={groomInfo.mother}
          brideFather={brideInfo.father}
          brideMother={brideInfo.mother}
          groomRole={groomInfo.birthdate}
          brideRole={brideInfo.birthdate}
        />
      </section>

      {/* 3. ALBUM ẢNH CƯỚI (ĐẠI DIỆN 4 HÌNH, XEM THÊM THÌ BẤM VÀO) */}
      <div id="section-album">
        <div className="bg-[#0B2D1B] py-2.5 text-center select-none shadow-sm">
          <h2 className="font-serif text-xs sm:text-sm font-bold text-white tracking-[0.25em] uppercase">
            Album Ảnh Cưới
          </h2>
        </div>
        <PhotoAlbum />
      </div>

      {/* 4. THÔNG TIN TIỆC CƯỚI (NGÀY CƯỚI, ĐẾM NGƯỢC, ĐỊA ĐIỂM, XÁC NHẬN RSVP) */}
      <section id="party-details">
        <div className="bg-[#0B2D1B] py-2.5 text-center select-none shadow-sm">
          <h2 className="font-serif text-xs sm:text-sm font-bold text-white tracking-[0.25em] uppercase">
            Thông Tin Tiệc Cưới
          </h2>
        </div>
        <CountdownRSVP weddingDateTimestamp={weddingDateTimestamp} invitedGuest={invitedGuest} />
      </section>

      {/* 5. LỜI CHÚC & MỪNG CƯỚI (SỔ LƯU BÚT + PHONG BAO MỪNG CƯỚI CHUNG MỘT PHẦN) */}
      <section id="guestbook-and-gifts" className="bg-[#FCFAF5]">
        <div className="bg-[#0B2D1B] py-2.5 text-center select-none shadow-sm">
          <h2 className="font-serif text-xs sm:text-sm font-bold text-white tracking-[0.25em] uppercase">
            Lời Chúc &amp; Mừng Cưới
          </h2>
        </div>
        <Guestbook invitedGuest={invitedGuest} />
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-[1px] bg-stone-200/65"></div>
        </div>
        <WeddingGifts groom={groomInfo} bride={brideInfo} />
      </section>

      {/* UTILITY: SHARE CARD INVITATION GENERATOR */}
      {!invitedGuest && <ShareInvitation />}

      {/* 8. FOOTER - GRATITUDE COUPLERS */}
      <footer className="bg-stone-900 text-stone-400 py-16 px-4 border-t border-stone-850 text-center select-none relative overflow-hidden">
        
        {/* Soft layout background */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-md mx-auto space-y-6">
          <Heart className="w-8 h-8 text-amber-600 mx-auto fill-amber-500 animate-pulse" />
          
          <h3 className="font-serif text-2xl font-bold text-white tracking-wide">
            Chân Thành Cảm Ơn!
          </h3>
          
          <p className="text-xs font-light leading-relaxed text-stone-450 max-w-sm mx-auto">
            Sự có mặt, những lời chúc mừng và tình cảm nồng ấm của quý khách là món quà quý giá nhất dành cho hai chúng tôi. Hân hạnh được đón tiếp bạn sắp tới!
          </p>

          <div className="w-8 h-[1px] bg-stone-800 mx-auto"></div>

          <div className="text-[11px] font-mono uppercase tracking-widest text-amber-500 font-semibold">
            Trường Xuân &amp; Bích Trâm
          </div>

        </div>
      </footer>

      {/* BACK TO TOP FLOATING TRIGGER BUTTON */}
      {showScrollTop && (
        <button
          id="btn-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[#0B2D1B] text-amber-100 hover:bg-[#071D11] border border-amber-500/20 shadow-xl flex items-center justify-center transition-all animate-bounce cursor-pointer"
          title="Về đầu trang"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

    </div>
  );
}
