import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Link, MailOpen, Heart } from 'lucide-react';
import { syncGuestFromRSVP } from '../firebase';

export default function ShareInvitation() {
  const [guestName, setGuestName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Generate the clean URL
  const currentDomain = window.location.origin + window.location.pathname;
  const encodedGuest = encodeURIComponent(guestName.trim());
  const invitationUrl = guestName.trim() 
    ? `${currentDomain}?to=${encodedGuest}` 
    : currentDomain;

  // Custom greeting template
  const guestDisplay = guestName.trim() || 'Quý khách';
  const customMessage = `Vì điều kiện làm việc xa, không kịp đưa thiệp mời tận tay đến ${guestDisplay}, nên vợ chồng Trường Xuân & Bích Trâm xin được gửi thiệp mời online.

${guestDisplay} nhấn vào link để cùng theo dõi ngày cưới, địa điểm để tiện đến tham dự chung vui với vợ chồng Trường Xuân & Bích Trâm nhé.

🔗 ${invitationUrl}

Trân trọng kính mời! ❤️`;

  const ensureGuestAdded = async () => {
    const trimmedName = guestName.trim();
    if (trimmedName) {
      try {
        await syncGuestFromRSVP(trimmedName);
      } catch (err) {
        console.warn("Failed to automatically synchronize guest:", err);
      }
    }
  };

  const handleCopyLink = async () => {
    navigator.clipboard.writeText(invitationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    await ensureGuestAdded();
  };

  const handleCopyText = async () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    await ensureGuestAdded();
  };

  const handleShareZalo = async () => {
    // Standard Zalo share portal
    const url = `https://sp.zalo.me/share_to_zalo?url=${encodeURIComponent(invitationUrl)}&title=${encodeURIComponent('Thiệp cưới online Trường Xuân & Bích Trâm')}`;
    window.open(url, '_blank');
    await ensureGuestAdded();
  };

  const handleShareMessenger = async () => {
    // Standard Facebook Messenger send action
    const url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(invitationUrl)}&app_id=123456789&redirect_uri=${encodeURIComponent(invitationUrl)}`;
    window.open(url, '_blank');
    await ensureGuestAdded();
  };

  return (
    <section id="invitation-generator" className="py-20 bg-stone-50 border-t border-stone-200 text-stone-800">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* section header */}
        <div className="text-center mb-16 relative">
          <span className="text-amber-600 font-serif italic text-lg block mb-2 tracking-wide font-medium">Bản sắc cá nhân</span>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 font-bold tracking-tight inline-block relative pb-4">
            Cá Nhân Hóa & Chia Sẻ Thiệp
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
          </h2>
          <p className="text-stone-550 text-sm max-w-md mx-auto mt-4 font-light leading-relaxed">
            Nhập tên khách mời của bạn để tạo thiệp online mang dấu ấn riêng biệt, sau đó gửi trực tiếp qua Zalo hoặc Messenger cực kỳ nhanh chóng.
          </p>
        </div>

        {/* Dynamic interactive box layout */}
        <div className="grid md:grid-cols-12 gap-8 items-stretch">
          
          {/* Creator panel - 6 columns */}
          <div className="md:col-span-6 bg-white border border-stone-200 shadow-xl rounded-3xl p-6 md:p-8 flex flex-col justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-600" /> Tạo Link Gửi Thiệp
              </h3>
              <p className="text-stone-400 text-xs font-light mb-6">
                Mỗi khách mời sẽ nhận được 1 link riêng biệt mở ra bức thư có lời tựa chào mừng đích danh họ ở đầu trang!
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Tên khách mời muốn gửi:</label>
                  <input
                    id="input-creator-guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ví dụ: Anh Đồng & Bạn bè / Gia đình Cô Út"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-650 font-medium text-stone-800"
                  />
                </div>

                <div className="bg-stone-50 p-4 border border-stone-200/60 rounded-2xl">
                  <span className="text-[10px] tracking-wider font-semibold text-amber-700 uppercase block mb-1">Mẫu tin nhắn gửi khách:</span>
                  <p className="text-[11px] text-stone-500 font-light truncate leading-relaxed max-h-[100px] overflow-hidden whitespace-pre-line text-ellipsis border-b border-stone-100 pb-2 mb-2">
                    {customMessage}
                  </p>
                  <button
                    id="btn-copy-template-text"
                    onClick={handleCopyText}
                    className="w-full py-1.5 border border-stone-300 hover:bg-stone-100 rounded-lg text-[11px] font-semibold text-stone-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedText ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                    {copiedText ? 'Đã sao chép tin nhắn!' : 'Sao chép mẫu tin nhắn kèm link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Platform sharing triggers */}
            <div className="mt-6 pt-6 border-t border-stone-100 space-y-2.5">
              <div className="flex gap-2">
                <button
                  id="btn-share-zalo"
                  onClick={handleShareZalo}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4.5 h-4.5 shrink-0" /> Gửi qua Zalo
                </button>
                <button
                  id="btn-share-messenger"
                  onClick={handleShareMessenger}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4.5 h-4.5 shrink-0" /> Gửi Messenger
                </button>
              </div>

              <button
                id="btn-copy-invitation-url"
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-stone-900 text-white hover:bg-stone-855 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-stone-800"
              >
                {copiedLink ? <Check className="w-4.5 h-4.5 text-green-400 shrink-0" /> : <Link className="w-4.5 h-4.5 shrink-0" />}
                {copiedLink ? 'Đã sao chép link!' : 'Copy link thiệp mời cá nhân'}
              </button>
            </div>
          </div>

          {/* Invitation envelope mockup preview - 6 columns */}
          <div className="md:col-span-6 flex flex-col justify-center">
            <div className="bg-gradient-to-br from-stone-50 via-white to-stone-100 border border-stone-250 shadow-2xl rounded-3xl p-6 text-stone-800 relative overflow-hidden flex flex-col justify-between items-center text-center aspect-[5/3] group select-none min-h-[300px]">
              
              {/* Background elegant golden borders */}
              <div className="absolute inset-3 border border-stone-200 rounded-2xl pointer-events-none"></div>
              <div className="absolute inset-4 border border-stone-150 rounded-2xl pointer-events-none"></div>
              
              <div className="relative z-10 w-full flex flex-col justify-between h-full py-2 items-center">
                <Heart className="w-8 h-8 text-amber-600 fill-amber-100 animate-pulse" />

                <div className="space-y-1.5 my-4">
                  <span className="text-[10px] tracking-widest uppercase font-mono text-amber-800 font-semibold">TRÂN TRỌNG KÍNH MỜI</span>
                  
                  {/* Guest Name Display */}
                  <div className="bg-stone-100/85 backdrop-blur-sm border border-stone-200 px-6 py-2.5 rounded-2xl min-h-[50px] flex items-center justify-center max-w-[280px] mx-auto shadow-inner">
                    <span className="font-serif text-lg font-bold text-stone-900 tracking-wide truncate">
                      {guestName.trim() || 'Quý Khách Mời'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 text-[10px] text-stone-550 font-serif italic">
                  <span className="flex items-center gap-1"><MailOpen className="w-3.5 h-3.5 text-amber-700" /> Gửi Gắm Tình Yêu & Sự Trân Quý</span>
                  <span>Ngày 12 Tháng 07 Năm 2026</span>
                </div>
              </div>

              {/* Decorative corner borders */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-stone-300 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-stone-300 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-stone-300 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-stone-300 rounded-br-2xl"></div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
