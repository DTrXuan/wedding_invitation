import { useState } from 'react';
import { Gift, Copy, Check, Heart } from 'lucide-react';
import { WeddingCoupleInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import OptimizedImage from './OptimizedImage';

interface WeddingGiftsProps {
  groom: WeddingCoupleInfo;
  bride: WeddingCoupleInfo;
}

export default function WeddingGifts({ groom, bride }: WeddingGiftsProps) {
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [showQRs, setShowQRs] = useState(false);

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(identifier);
    setTimeout(() => setCopiedState(null), 2000);
  };

  return (
    <section id="wedding-gifts-section" className="py-6 md:py-8 text-stone-850">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-6 relative">
          <span className="text-amber-600 font-serif italic text-lg block mb-1 tracking-wide">Mừng cưới từ xa</span>
          <h2 className="font-serif text-2xl md:text-3xl text-[#0B2D1B] font-bold tracking-tight inline-block relative pb-3">
            Hộp Thư Mừng Cưới 🧧
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[1.5px] bg-gradient-to-r from-transparent via-[#C39B62] to-transparent"></div>
          </h2>
        </div>

        {/* Interactive Big Gift Icon */}
        <div className="flex flex-col items-center justify-center my-8 px-4">
          <button
            onClick={() => setShowQRs(!showQRs)}
            className="group relative cursor-pointer flex flex-col items-center justify-center bg-[#FCFAF5] border-2 border-dashed border-[#C39B62]/40 rounded-full w-28 h-28 sm:w-32 sm:h-32 shadow-[0_10px_30px_rgba(195,155,98,0.15)] hover:shadow-[0_15px_35px_rgba(195,155,98,0.25)] hover:scale-105 active:scale-95 transition-all duration-300 ring-8 ring-amber-500/5 select-none focus:outline-none"
            aria-label="Toggle QR codes"
          >
            {/* Pulsing glow background */}
            <span className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping opacity-25 pointer-events-none group-hover:opacity-40"></span>
            
            {/* Gift Icon enlarged to be big */}
            <Gift className="w-14 h-14 sm:w-16 sm:h-16 text-amber-600 group-hover:text-amber-500 transition-colors duration-300" />
            
            {/* Tiny tag decoration */}
            <div className="absolute -top-1 px-3 py-0.5 bg-[#0B2D1B] text-amber-100 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm select-none border border-amber-500/20">
              Nhấn để mở
            </div>
          </button>
        </div>

        {/* Toggleable QR Cards Section */}
        <AnimatePresence>
          {showQRs && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="overflow-hidden px-4"
            >
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-stretch max-w-3xl mx-auto py-6">
                {/* Groom Account Card */}
                <div className="bg-white border-2 border-[#C39B62]/20 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-center text-center relative overflow-hidden group">
                  {/* Soft gold backdrop decoration */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>
                  
                  <div>
                    <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-[#0B2D1B] text-[10px] font-bold font-mono tracking-widest uppercase rounded-full mb-4">
                      Mừng cưới Chú Rể 🤵
                    </span>
                    
                    {/* VietQR code image container */}
                    <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-150 inline-block mb-4 shadow-inner">
                      <OptimizedImage 
                        src={groom.qrCodeUrl} 
                        alt="Mã QR Chuyển Khoản Chú Rể" 
                        fallbackSrc="image/QR_chure.jpg"
                        className="w-40 h-40 object-contain mx-auto rounded-lg"
                        containerClassName="w-40 h-40"
                      />
                    </div>

                    {/* Account Details */}
                    <div className="space-y-2.5 text-xs text-stone-650 max-w-xs mx-auto text-left">
                      <div className="flex justify-between border-b border-stone-100 pb-1.5">
                        <span className="text-stone-400">Chủ tài khoản:</span>
                        <span className="font-serif font-bold text-stone-900 uppercase">{groom.name}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                        <span className="text-stone-400">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900 tracking-wider bg-stone-50 px-2 py-0.5 rounded border border-stone-100 select-all">{groom.bankAccount}</span>
                          <button
                            onClick={() => handleCopy(groom.bankAccount, 'groom')}
                            className="p-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-700 transition-all rounded-lg cursor-pointer flex items-center justify-center border border-amber-200/50"
                            title="Sao chép số tài khoản"
                          >
                            {copiedState === 'groom' ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
                                <Check className="w-3.5 h-3.5" /> Đã sao chép!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold">
                                <Copy className="w-3.5 h-3.5" /> Sao chép
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between pb-1.5">
                        <span className="text-stone-400">Ngân hàng:</span>
                        <span className="font-medium text-stone-850 text-right max-w-[180px] truncate" title={groom.bankName}>
                          {groom.bankName.replace("Ngân hàng Cổ phần Quân đội", "MB Bank").replace("Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam", "Vietcombank")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bride Account Card */}
                <div className="bg-white border-2 border-[#C39B62]/20 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-center text-center relative overflow-hidden group">
                  {/* Soft gold backdrop decoration */}
                  <div className="absolute top-0 left-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:scale-150 transition-all duration-500"></div>

                  <div>
                    <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-[#0B2D1B] text-[10px] font-bold font-mono tracking-widest uppercase rounded-full mb-4">
                      Mừng cưới Cô Dâu 👰
                    </span>

                    {/* VietQR code image container */}
                    <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-150 inline-block mb-4 shadow-inner">
                      <OptimizedImage 
                        src={bride.qrCodeUrl} 
                        alt="Mã QR Chuyển Khoản Cô Dâu" 
                        fallbackSrc="image/QR_codau.jpg"
                        className="w-40 h-40 object-contain mx-auto rounded-lg"
                        containerClassName="w-40 h-40"
                      />
                    </div>

                    {/* Account Details */}
                    <div className="space-y-2.5 text-xs text-stone-650 max-w-xs mx-auto text-left">
                      <div className="flex justify-between border-b border-stone-100 pb-1.5">
                        <span className="text-stone-400">Chủ tài khoản:</span>
                        <span className="font-serif font-bold text-stone-900 uppercase">{bride.name}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                        <span className="text-stone-400">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900 tracking-wider bg-stone-50 px-2 py-0.5 rounded border border-stone-100 select-all">{bride.bankAccount}</span>
                          <button
                            onClick={() => handleCopy(bride.bankAccount, 'bride')}
                            className="p-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-700 transition-all rounded-lg cursor-pointer flex items-center justify-center border border-amber-200/50"
                            title="Sao chép số tài khoản"
                          >
                            {copiedState === 'bride' ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
                                <Check className="w-3.5 h-3.5" /> Đã sao chép!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold">
                                <Copy className="w-3.5 h-3.5" /> Sao chép
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between pb-1.5">
                        <span className="text-stone-400">Ngân hàng:</span>
                        <span className="font-medium text-stone-850 text-right max-w-[180px] truncate" title={bride.bankName}>
                          {bride.bankName.replace("Ngân hàng Cổ phần Quân đội", "MB Bank").replace("Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam", "Vietcombank")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
