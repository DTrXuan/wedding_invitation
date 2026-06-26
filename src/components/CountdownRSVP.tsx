import { useState, useEffect, FormEvent } from 'react';
import { Calendar, MapPin, Users, Heart, ClipboardCheck, ArrowUpRight, CheckCircle2, Sparkles, Clock, Bell, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

// Import our database and service handles
import { db, saveLocalRSVP, saveLocalWish, isFirebaseConfigured, handleFirestoreError, OperationType, addDocWithTimeout, syncGuestFromRSVP } from '../firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { WeddingEventDetails } from '../types';

interface CountdownRSVPProps {
  weddingDateTimestamp: number;
  invitedGuest?: string;
}

const WEDDING_EVENTS: WeddingEventDetails[] = [
  {
    title: "TIỆC CƯỚI CHUNG VUI",
    side: 'bride',
    time: "11:00 - Chủ Nhật, 12/07/2026 (Nhằm ngày 28/05 Âm Lịch)",
    dateTimestamp: new Date("2026-07-12T11:00:00").getTime(),
    venueName: "Nhà Hàng Aladin",
    address: "132 Lê Duẩn - Xã Khe Sanh - Tỉnh Quảng Trị (Bên cạnh Ngân hàng VietinBank)",
    mapEmbedUrl: "https://maps.google.com/maps?q=16.6283567,106.7389581&t=&z=18&ie=UTF8&iwloc=&output=embed",
    mapDirectionsUrl: "https://www.google.com/maps/place/Nh%C3%A0+H%C3%A0ng+Aladin/@16.6283114,106.7388563,48m/data=!3m1!1e3!4m6!3m5!1s0x314089d07657bee9:0xa35ba70764226796!8m2!3d16.6283567!4d106.7389581!16s%2Fg%2F11fjyx928f?entry=ttu&g_ep=EgoyMDI2MDYyMi4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    title: "LỄ THÀNH HÔN TẠI TƯ GIA (Nhà Trai)",
    side: 'groom',
    time: "09:00 - Chủ Nhật, 12/07/2026 (Nhằm ngày 28/05 Âm Lịch)",
    dateTimestamp: new Date("2026-07-12T09:00:00").getTime(),
    venueName: "Tư gia Nhà Trai",
    address: "14 Hùng Vương - Xã Khe Sanh, Tỉnh Quảng Trị",
    mapEmbedUrl: "https://maps.google.com/maps?q=14%20H%C3%B9ng%20V%C6%B0%C6%A1ng%20Khe%20Sanh%20Qu%E1%BA%A3ng%20Tr%E1%BB%8B&t=&z=16&ie=UTF8&iwloc=&output=embed",
    mapDirectionsUrl: "https://www.google.com/maps/search/?api=1&query=14+H%C3%B9ng+V%C6%B0%C6%A1ng+Khe+Sanh+Qu%E1%BA%A3ng+Tr%E1%BB%8B"
  }
];

export default function CountdownRSVP({ weddingDateTimestamp, invitedGuest }: CountdownRSVPProps) {
  // Countdown states
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [activeEventTab, setActiveEventTab] = useState<'bride' | 'groom'>('bride');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState(invitedGuest || '');
  const [phone, setPhone] = useState('');
  const [attendance, setAttendance] = useState<'yes' | 'no' | 'maybe'>('yes');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [wishes, setWishes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync invited guest name when prop changes
  useEffect(() => {
    if (invitedGuest) {
      setName(invitedGuest);
    }
  }, [invitedGuest]);

  // Countdown clock effect
  useEffect(() => {
    const calculateTime = () => {
      const difference = weddingDateTimestamp - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [weddingDateTimestamp]);

  const activeEvent = WEDDING_EVENTS.find(e => e.side === activeEventTab) || WEDDING_EVENTS[0];

  // Submit RSVP Form Logic
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      attendance,
      guestCount: attendance === 'yes' ? guestCount : 0,
      wishes: wishes.trim()
    };

    try {
      // Sync or auto-create guest in guests collection
      await syncGuestFromRSVP(name.trim(), phone.trim(), activeEvent.side || 'both');

      if (isFirebaseConfigured && db) {
        // Safe database save on Firestore
        const path = 'rsvps';
        try {
          await addDocWithTimeout(collection(db, path), {
            ...payload,
            createdAt: serverTimestamp()
          }, 4000);

          // Concurrently save the wish to the public wishes board if any
          if (wishes.trim()) {
            await addDocWithTimeout(collection(db, 'wishes'), {
              name: name.trim(),
              wishes: wishes.trim(),
              createdAt: serverTimestamp()
            }, 4000);
          }
        } catch (error) {
          console.warn("Firestore RSVP save failed, falling back to local storage:", error);
          // Graceful fallback so user is never blocked by database/network errors
          saveLocalRSVP(payload);
          if (wishes.trim()) {
            saveLocalWish({
              name: name.trim(),
              wishes: wishes.trim()
            });
          }
        }
      } else {
        // Fallback to offline Local Storage Mockengine
        saveLocalRSVP(payload);
        if (wishes.trim()) {
          saveLocalWish({
            name: name.trim(),
            wishes: wishes.trim()
          });
        }
      }

      // Success
      setIsSubmitted(true);
      
      // Celebrate with fireworks!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
    } catch (err: any) {
      let errorMessage = 'Một lỗi bảo mật hoặc kết nối đã xảy ra. Vui lòng thực hiện lại.';
      if (err instanceof Error) {
        errorMessage = `Lỗi hệ thống: ${err.message}`;
      }
      setSubmitError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setAttendance('yes');
    setGuestCount(1);
    setWishes('');
    setIsSubmitted(false);
  };

  return (
    <section id="rsvp-and-venues" className="py-10 md:py-12 bg-white text-stone-850">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Countdown Visual Circle Layout */}
        <div className="text-center mb-10">
          <span className="text-amber-600 font-serif italic text-lg block mb-2 tracking-wide font-medium">Cùng nhau đếm ngược</span>
          <h2 className="font-serif text-3xl md:text-4xl text-[#0B2D1B] font-bold tracking-tight mb-8">
            Thời Gian Đến Ngày Trọng Đại
          </h2>
          
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            {[
              { label: 'Ngày', val: timeLeft.days, id: 'countdown-days' },
              { label: 'Giờ', val: timeLeft.hours, id: 'countdown-hours' },
              { label: 'Phút', val: timeLeft.minutes, id: 'countdown-minutes' },
              { label: 'Giây', val: timeLeft.seconds, id: 'countdown-seconds' }
            ].map(item => (
              <div 
                id={item.id}
                key={item.label}
                className="w-16 h-16 md:w-18 md:h-18 rounded-full bg-[#0B2D1B] border border-amber-500/30 flex flex-col justify-center items-center shadow-md animate-fade-in"
              >
                <span className="font-serif text-lg md:text-xl font-bold text-amber-100">{String(item.val).padStart(2, '0')}</span>
                <span className="text-[9px] md:text-[10px] text-amber-200/70 font-medium uppercase tracking-wider">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wedding Event Info & Map */}
        <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-stretch mt-10">
          
          {/* Venues / Map section - 8 columns */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-white rounded-3xl border-2 border-amber-500/10 shadow-xl overflow-hidden flex flex-col flex-1 h-full">
              
              {/* Tabs header */}
              <div className="flex bg-[#FAF2E5]/50 border-b border-amber-500/10 shrink-0">
                <button
                  id="tab-venue-bride"
                  onClick={() => setActiveEventTab('bride')}
                  className={`flex-1 text-center py-4 font-serif text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                    activeEventTab === 'bride' 
                      ? 'bg-[#0B2D1B] text-white' 
                      : 'text-stone-500 hover:text-[#0B2D1B] bg-[#FAF2E5]/20'
                  }`}
                >
                  🏰 Tiệc Cưới (Nhà Hàng Aladin)
                </button>
                <button
                  id="tab-venue-groom"
                  className={`flex-1 text-center py-4 font-serif text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                    activeEventTab === 'groom' 
                      ? 'bg-[#0B2D1B] text-white' 
                      : 'text-stone-500 hover:text-[#0B2D1B] bg-[#FAF2E5]/20'
                  }`}
                  onClick={() => setActiveEventTab('groom')}
                >
                  🏡 Hôn Lễ (Tư Gia Nhà Trai)
                </button>
              </div>

              {/* Venue details */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" /> {activeEvent.title}
                  </h3>
                  
                  <div className="space-y-3.5 mb-6 text-sm text-stone-600 font-light pr-2">
                    <div className="flex items-start gap-2.5">
                      <span className="font-semibold text-stone-800 shrink-0 w-24">Thời gian:</span>
                      <span>{activeEvent.time}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-semibold text-stone-800 shrink-0 w-24">Địa điểm:</span>
                      <span className="font-medium text-stone-800">{activeEvent.venueName}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-semibold text-stone-800 shrink-0 w-24">Địa chỉ:</span>
                      <span>{activeEvent.address}</span>
                    </div>
                  </div>
                </div>

                {/* Google Maps iFrame */}
                <div className="relative rounded-2xl overflow-hidden border border-stone-200/60 grow h-64 shadow-inner mb-6">
                  <iframe
                    src={activeEvent.mapEmbedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen={false}
                    loading="lazy"
                    title={`Bản đồ đi tới ${activeEvent.venueName}`}
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>

                {/* Directions external triggers */}
                <a
                  id="btn-directions-map"
                  href={activeEvent.mapDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#0B2D1B] text-amber-100 hover:bg-[#071D11] rounded-xl text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer border border-amber-500/20"
                >
                  <MapPin className="w-4 h-4 text-amber-400" /> Chỉ đường qua Google Maps <ArrowUpRight className="w-4 h-4 text-amber-300" />
                </a>
              </div>
            </div>
          </div>

          {/* RSVP FORM section - 4 columns */}
          <div className="lg:col-span-4 flex flex-col lg:justify-center lg:self-center">
            <div className="bg-white rounded-3xl border-2 border-amber-500/10 shadow-xl p-5 md:p-6 flex flex-col justify-center items-center text-center relative overflow-hidden h-auto min-h-[180px] z-10 space-y-4 select-none">
              {/* Top abstract rose pattern */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full blur-2xl z-0"></div>

              {!isSubmitted ? (
                <>
                  <div>
                    <p className="text-stone-500 text-xs font-light max-w-sm leading-relaxed">
                      Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi. Xin xác nhận để chúng tôi chuẩn bị chu đáo nhất.
                    </p>
                  </div>

                  <button
                    id="btn-open-rsvp-modal"
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-8 py-3.5 bg-[#0B2D1B] text-amber-100 hover:bg-[#071D11] rounded-xl text-xs font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-amber-500/20 flex items-center gap-2"
                  >
                    <span>Xác nhận tham dự 💌</span>
                  </button>
                </>
              ) : (
                /* Confetti celebration success screen with Live Schedule Notification */
                <div id="rsvp-success-screen" className="relative z-10 flex flex-col items-center justify-center text-center py-4 px-2 animate-scale-up h-full my-auto text-stone-850 select-none">
                  <div className="w-14 h-14 bg-green-50 rounded-full border border-green-200 flex items-center justify-center text-green-600 mb-4 shrink-0 shadow-inner">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#0B2D1B] mb-2">Xác Nhận Thành Công!</h3>
                  
                  <div className="bg-[#FAF2E5]/50 border border-amber-500/10 rounded-2xl p-4 mb-4 text-[11px] text-stone-650 leading-relaxed w-full max-w-sm text-left">
                    <p className="font-semibold text-[#0B2D1B] mb-1">Thông tin đã ghi nhận bảo mật:</p>
                    <p>Khách mời: <span className="font-bold text-stone-900">{name}</span></p>
                    <p>Trạng thái: <span className="font-semibold text-green-600">
                      {attendance === 'yes' ? 'Sẽ tham dự 🎉' : 'Rất tiếc không thể đến ✉️'}
                    </span></p>
                  </div>

                  {/* 🔔 HIGH QUALITY LIVE SCHEDULE TRACKING NOTIFICATION CARD 🔔 */}
                  <div className="bg-[#FAF2E5]/50 border border-amber-500/20 rounded-2xl p-4 mb-5 text-left max-w-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl"></div>
                    <div className="flex gap-2.5 items-start">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0B2D1B] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Theo Dõi Lịch Trình Live!
                        </h4>
                        <p className="text-[11px] text-stone-650 leading-relaxed mt-1 font-light">
                          Đại gia đình đã mở tính năng <strong>Theo dõi Lịch trình Đám cưới Trực tiếp (Live)</strong>. Quý khách có thể xem thời gian xuất phát, làm lễ, khai tiệc và các nội dung cập nhật thực tế ngay trên thiết bị cầm tay.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      id="btn-rsvp-success-to-schedule"
                      type="button"
                      onClick={() => { window.location.hash = '#schedule'; }}
                      className="w-full mt-3 py-2 bg-[#0B2D1B] text-amber-100 hover:bg-[#071D11] rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer shadow flex items-center justify-center gap-1.5 border border-amber-500/20"
                    >
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> Xem Lịch Trình Trực Tiếp Ngay 🔔
                    </button>
                  </div>

                  <div className="flex gap-2 w-full max-w-sm justify-center">
                    <button
                      id="btn-rsvp-view-modal"
                      onClick={() => setIsModalOpen(true)}
                      className="flex-1 py-2 bg-[#0B2D1B]/5 hover:bg-[#0B2D1B]/10 text-[#0B2D1B] text-xs font-semibold rounded-xl transition-all cursor-pointer border border-[#0B2D1B]/20"
                    >
                      Xem chi tiết / Thay đổi
                    </button>
                    <button
                      id="btn-rsvp-reset"
                      onClick={handleResetForm}
                      className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-750 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-stone-300"
                    >
                      Gửi xác nhận mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 🕊️ ELEGANT MODAL POPUP FOR RSVP Matching the user uploaded design exactly 🕊️ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-100 w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all cursor-pointer z-20"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Form / Content inside Modal */}
              <div className="p-6 sm:p-8 overflow-y-auto select-none">
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Header */}
                    <div className="text-center sm:text-left pt-1">
                      <h3 className="font-sans text-2xl font-bold text-stone-900 tracking-tight mb-1">
                        Xác nhận tham dự
                      </h3>
                      <p className="text-stone-500 text-xs leading-relaxed font-light">
                        Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi. Xin xác nhận để chúng tôi chuẩn bị chu đáo nhất.
                      </p>
                    </div>

                    {/* Input: Tên của bạn */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-stone-700 tracking-wide uppercase">
                          Họ và tên của bạn
                        </label>
                        {name && name === invitedGuest && (
                          <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full animate-pulse">
                            Đã tự động lấy tên ✨
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8C9C95]/20 focus:border-[#8C9C95] font-medium placeholder-stone-400 transition-all text-stone-800"
                      />
                    </div>

                    {/* Attendance Selection: Bạn sẽ đến chứ? */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-stone-700 tracking-wide uppercase">
                        Bạn sẽ đến chứ?
                      </label>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Option: Tôi sẽ đến */}
                        <button
                          type="button"
                          onClick={() => {
                            setAttendance('yes');
                            if (guestCount === 0) setGuestCount(1);
                          }}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-center transition-all cursor-pointer border ${
                            attendance === 'yes'
                              ? 'border-[#8C9C95] bg-[#8C9C95]/5 text-stone-900 font-bold shadow-xs'
                              : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                            attendance === 'yes'
                              ? 'bg-[#8C9C95] border-[#8C9C95] text-white'
                              : 'border-stone-300 bg-white text-transparent'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-xs font-semibold">Tôi sẽ đến</span>
                        </button>

                        {/* Option: Rất tiếc, tôi không thể đến */}
                        <button
                          type="button"
                          onClick={() => {
                            setAttendance('no');
                            setGuestCount(0);
                          }}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-center transition-all cursor-pointer border ${
                            attendance === 'no'
                              ? 'border-rose-300 bg-rose-50/50 text-stone-900 font-bold shadow-xs'
                              : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                            attendance === 'no'
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'border-stone-300 bg-white text-transparent'
                          }`}>
                            <X className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-xs font-semibold">Rất tiếc</span>
                        </button>
                      </div>
                    </div>

                    {/* Conditional inputs based on attendance */}
                    {attendance === 'yes' && (
                      <div className="space-y-4 pt-1">
                        {/* Mobile Optimized Guest Count plus/minus control */}
                        <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200/60">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-700 tracking-wide uppercase">Số lượng người đi cùng</span>
                            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{guestCount} người</span>
                          </div>
                          <div className="flex items-center justify-center gap-6 py-1">
                            <button
                              type="button"
                              disabled={guestCount <= 1}
                              onClick={() => setGuestCount(prev => Math.max(1, prev - 1))}
                              className="w-10 h-10 rounded-full bg-white border border-stone-250 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-100 active:scale-90 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            >
                              -
                            </button>
                            <span className="text-lg font-serif font-extrabold text-[#0B2D1B] w-12 text-center">{guestCount}</span>
                            <button
                              type="button"
                              onClick={() => setGuestCount(prev => Math.min(10, prev + 1))}
                              className="w-10 h-10 rounded-full bg-white border border-stone-250 flex items-center justify-center text-stone-600 font-bold hover:bg-stone-100 active:scale-90 transition-all shadow-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {submitError && (
                      <p className="text-red-500 text-xs font-medium text-center">{submitError}</p>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 mt-6 bg-[#0B2D1B] hover:bg-[#071D11] text-amber-100 disabled:bg-stone-300 disabled:text-stone-500 font-sans font-bold rounded-xl text-sm tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'ĐANG GỬI XÁC NHẬN...' : 'Gửi xác nhận'}
                    </button>
                  </form>
                ) : (
                  /* Success screen inside Modal */
                  <div className="flex flex-col items-center justify-center text-center py-6">
                    <div className="w-14 h-14 bg-green-50 rounded-full border border-green-200 flex items-center justify-center text-green-600 mb-4 shrink-0 shadow-inner">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h3 className="font-sans text-xl font-bold text-stone-900 mb-2">Xác Nhận Thành Công!</h3>
                    <p className="text-stone-500 text-xs font-light mb-6 leading-relaxed max-w-xs">
                      Cảm ơn <strong>{name}</strong> đã phản hồi tham dự đám cưới của chúng tôi. Sự hiện diện của bạn là niềm vinh hạnh lớn!
                    </p>

                    <div className="bg-[#FAF2E5]/50 border border-amber-500/10 rounded-2xl p-4 mb-5 text-xs text-stone-650 leading-relaxed w-full max-w-sm text-left">
                      <p className="font-semibold text-[#0B2D1B] mb-1">Thông tin đã ghi nhận:</p>
                      <p>Khách mời: <span className="font-bold text-stone-900">{name}</span></p>
                      <p>Trạng thái: <span className="font-semibold text-green-600">
                        {attendance === 'yes' ? 'Sẽ tham dự 🎉' : 'Rất tiếc không thể đến ✉️'}
                      </span></p>
                    </div>

                    <div className="flex gap-2 w-full max-w-sm">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 bg-[#0B2D1B] text-amber-100 hover:bg-[#071D11] text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Đóng cửa sổ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleResetForm();
                        }}
                        className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-750 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-stone-300"
                      >
                        Xác nhận mới
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
