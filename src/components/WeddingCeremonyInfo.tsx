import { Heart } from 'lucide-react';

interface CeremonyInfoProps {
  groomFather?: string;
  groomMother?: string;
  brideFather?: string;
  brideMother?: string;
  groomName: string;
  brideName: string;
  groomRole?: string;
  brideRole?: string;
}

export default function WeddingCeremonyInfo({
  groomFather = "Đoàn Trường Minh",
  groomMother = "Lê Thị Thanh Thủy",
  brideFather = "Lê Thanh Tâm",
  brideMother = "Nguyễn Thị Tiền",
  groomName = "Đoàn Trường Xuân",
  brideName = "Lê Bích Trâm",
  groomRole = "TRƯỞNG NAM",
  brideRole = "QUÝ NỮ"
}: CeremonyInfoProps) {
  return (
    <div className="py-10 px-4 bg-white text-stone-800">
      <div className="max-w-xl mx-auto bg-[#FCFAF5] border-[3px] border-[#C39B62]/20 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        {/* Decorative corner motifs */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#C39B62]/40 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#C39B62]/40 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#C39B62]/40 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#C39B62]/40 rounded-br-lg"></div>

        {/* Traditional Dragon/Phoenix Watermark Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-center bg-no-repeat bg-contain" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop')` }}></div>

        {/* Parents Section */}
        <div className="grid grid-cols-2 gap-4 text-center text-xs text-stone-600 relative z-10">
          {/* Groom Parents */}
          <div className="space-y-1">
            <p className="font-serif italic text-stone-400">Ông bà</p>
            <p className="font-serif font-bold text-[#0B2D1B] text-sm tracking-wide">{groomFather}</p>
            <p className="font-serif font-bold text-[#0B2D1B] text-sm tracking-wide">{groomMother}</p>
            <p className="text-[10px] text-stone-400 leading-normal pt-1 px-1">
              14 Hùng Vương, Xã Khe Sanh, Tỉnh Quảng Trị
            </p>
          </div>

          {/* Vertical Separator Line */}
          <div className="absolute left-1/2 top-2 bottom-2 w-[1px] bg-[#C39B62]/30 -translate-x-1/2"></div>

          {/* Bride Parents */}
          <div className="space-y-1">
            <p className="font-serif italic text-stone-400">Ông bà</p>
            <p className="font-serif font-bold text-[#0B2D1B] text-sm tracking-wide">{brideFather}</p>
            <p className="font-serif font-bold text-[#0B2D1B] text-sm tracking-wide">{brideMother}</p>
            <p className="text-[10px] text-stone-400 leading-normal pt-1 px-1">
              Ấp Long thạnh A, Hồng Ngự, Đồng Tháp
            </p>
          </div>
        </div>

        {/* Báo tin Title */}
        <div className="text-center mt-12 mb-8 relative z-10 space-y-1.5">
          <p className="font-serif text-[11px] uppercase tracking-[0.2em] text-[#C39B62] font-semibold">
            Trân trọng báo tin
          </p>
          <p className="font-serif text-[12px] uppercase tracking-[0.15em] text-[#0B2D1B] font-bold">
            Lễ Thành Hôn Của Con Chúng Tôi
          </p>
          <div className="w-16 h-[1px] bg-[#C39B62]/30 mx-auto mt-2"></div>
        </div>

        {/* Groom & Bride names styled elegantly */}
        <div className="text-center relative z-10 space-y-6 my-8">
          <div>
            <h3 className="font-cursive text-4xl sm:text-5xl text-[#0B2D1B] font-normal leading-none">
              {groomName}
            </h3>
            <p className="text-[10px] tracking-[0.3em] font-serif text-stone-400 uppercase mt-2">
              {groomRole}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-stone-300"></div>
            <span className="font-cursive text-2xl text-[#C39B62] font-semibold">&</span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-stone-300"></div>
          </div>

          <div>
            <h3 className="font-cursive text-4xl sm:text-5xl text-[#0B2D1B] font-normal leading-none">
              {brideName}
            </h3>
            <p className="text-[10px] tracking-[0.3em] font-serif text-stone-400 uppercase mt-2">
              {brideRole}
            </p>
          </div>
        </div>

        {/* Ceremony details */}
        <div className="text-center mt-10 space-y-4 relative z-10 pt-4 border-t border-[#C39B62]/10">
          <div className="space-y-1">
            <p className="font-serif text-[11px] uppercase tracking-[0.15em] text-[#C39B62] font-semibold">
              Lễ Thành Hôn Được Cử Hành Tại
            </p>
            <p className="font-serif text-lg font-bold text-[#0B2D1B] tracking-wide">
              TƯ GIA
            </p>
            <p className="text-xs text-stone-500 font-light">
              VÀO LÚC 09:00
            </p>
          </div>

          {/* Date Picker Design Block */}
          <div className="max-w-xs mx-auto py-3 px-4 bg-white/60 border border-[#C39B62]/10 rounded-xl space-y-1 shadow-sm">
            <div className="flex items-center justify-center gap-4 text-base font-serif text-stone-700">
              <span className="uppercase tracking-wider">Chủ Nhật</span>
              <span className="h-4 w-[1px] bg-stone-300"></span>
              <span className="text-3xl font-bold text-[#0B2D1B] font-sans leading-none">12</span>
              <span className="h-4 w-[1px] bg-stone-300"></span>
              <span className="uppercase tracking-wider">Tháng 07</span>
            </div>
            <div className="text-sm text-stone-400 font-serif font-light pt-0.5">
              2026
            </div>
            <div className="text-xs text-stone-400 italic">
              (Tức ngày 28 tháng 05 năm Bính Ngọ)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
