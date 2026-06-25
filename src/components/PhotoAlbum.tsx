import React, { useState, useEffect } from 'react';
import { Camera, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';

const PREDEFINED_TITLES: Record<string, string> = {
  'image/Album.jpg': 'Nắm Tay Nhau Đi Suốt Cuộc Đời',
  'image/Album 2.jpg': 'Nét Cười Rạng Rỡ Ngày Chung Đôi',
  'image/Album 3.jpg': 'Biển Chiều Bình Yên',
  'image/Album 4.jpg': 'Tay Trong Tay Nồng Ấm',
  'image/Album 5.jpg': 'Khoảnh Khắc Đẹp Nhất',
  'image/Album 6.jpg': 'Hẹn Ước Trăm Năm',
  'image/Album 7.jpg': 'Chung Bước Đường Tương Lai',
  'image/Album 8.jpg': 'Tình Yêu Thăng Hoa',
  'image/Album 9.jpg': 'Trọn Đời Bên Nhau',
};

// Dynamically discover all Album images in the public/image directory
const globImages = (import.meta as any).glob('/public/image/Album*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP}', { eager: true });

// Sort keys naturally: Album.jpg (0) -> Album 2.jpg (2) -> Album 3.jpg (3) ...
const sortedImageKeys = Object.keys(globImages).sort((a, b) => {
  const getNum = (str: string) => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };
  return getNum(a) - getNum(b);
});

const dynamicAlbumImages = sortedImageKeys.map((key, index) => {
  const url = key.replace(/^\/public\//, '');
  const predefinedTitle = PREDEFINED_TITLES[url];
  
  const fileName = key.split('/').pop() || '';
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const numMatch = nameWithoutExt.match(/\d+/);
  const numStr = numMatch ? ` ${numMatch[0]}` : '';

  return {
    id: `dynamic_img_${index}`,
    url: url,
    title: predefinedTitle || `Khoảnh khắc hạnh phúc${numStr}`
  };
});

// Fallback if no images found via glob (e.g. static environments)
const ALBUM_IMAGES = dynamicAlbumImages.length > 0 ? dynamicAlbumImages : [
  {
    id: 'img_1',
    url: 'image/Album.jpg',
    title: 'Nắm Tay Nhau Đi Suốt Cuộc Đời'
  },
  {
    id: 'img_2',
    url: 'image/Album 2.jpg',
    title: 'Nét Cười Rạng Rỡ Ngày Chung Đôi'
  },
  {
    id: 'img_3',
    url: 'image/Album 3.jpg',
    title: 'Biển Chiều Bình Yên'
  },
  {
    id: 'img_4',
    url: 'image/Album 4.jpg',
    title: 'Tay Trong Tay Nồng Ấm'
  },
  {
    id: 'img_5',
    url: 'image/Album 5.jpg',
    title: 'Khoảnh Khắc Đẹp Nhất'
  },
  {
    id: 'img_6',
    url: 'image/Album 6.jpg',
    title: 'Hẹn Ước Trăm Năm'
  },
  {
    id: 'img_7',
    url: 'image/Album 7.jpg',
    title: 'Chung Bước Đường Tương Lai'
  },
  {
    id: 'img_8',
    url: 'image/Album 8.jpg',
    title: 'Tình Yêu Thăng Hoa'
  },
  {
    id: 'img_9',
    url: 'image/Album 9.jpg',
    title: 'Trọn Đời Bên Nhau'
  }
];

const FALLBACK_IMAGES: Record<string, string> = {
  'image/Album.jpg': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&auto=format&fit=crop&q=80',
  'image/Album 2.jpg': 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&auto=format&fit=crop&q=80',
  'image/Album 3.jpg': 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=1000&auto=format&fit=crop&q=80',
  'image/Album 4.jpg': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1000&auto=format&fit=crop&q=80',
  'image/Album 5.jpg': 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1000&auto=format&fit=crop&q=80',
  'image/Album 6.jpg': 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1000&auto=format&fit=crop&q=80',
  'image/Album 7.jpg': 'https://images.unsplash.com/photo-1507504038482-76210f6c315a?w=1000&auto=format&fit=crop&q=80',
  'image/Album 8.jpg': 'https://images.unsplash.com/photo-1510076857177-7470066ef11b?w=1000&auto=format&fit=crop&q=80',
  'image/Album 9.jpg': 'https://images.unsplash.com/photo-1494976373297-81fe34394387?w=1000&auto=format&fit=crop&q=80'
};

export default function PhotoAlbum() {
  const [activeImageIdx, setActiveImageIdx] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const prevImage = () => {
    if (activeImageIdx === null) return;
    setActiveImageIdx((activeImageIdx - 1 + ALBUM_IMAGES.length) % ALBUM_IMAGES.length);
  };

  const nextImage = () => {
    if (activeImageIdx === null) return;
    setActiveImageIdx((activeImageIdx + 1) % ALBUM_IMAGES.length);
  };

  // Touch Swipe Handlers for slideshow
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 50) { // minimum threshold to trigger swipe
      if (diffX > 0) {
        nextImage(); // Swipe left -> Next image
      } else {
        prevImage(); // Swipe right -> Previous image
      }
    }
    setTouchStartX(null);
  };

  // Keyboard navigation controls for desktop UX
  useEffect(() => {
    if (activeImageIdx === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'Escape') setActiveImageIdx(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIdx]);

  return (
    <section id="wedding-album" className="py-10 md:py-12 px-4 max-w-6xl mx-auto text-stone-800 bg-white">
      
      {/* section header */}
      <div className="text-center mb-8 relative">
        <span className="text-amber-600 font-serif italic text-lg block mb-2 tracking-wide">Khoảnh khắc đáng nhớ</span>
        <p className="text-stone-500 text-sm max-w-md mx-auto mt-4 font-light leading-relaxed">
          Từng góc chụp ghi dấu lại hành trình yêu đương, nụ cười ngọt ngào và những kỉ niệm không bao giờ phai mờ.
        </p>
      </div>

      {/* Album grid displaying 4 images in 1 frame */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {ALBUM_IMAGES.slice(0, 4).map((img, idx) => {
          const isLastItem = idx === 3;
          return (
            <div 
              id={`album-item-${idx}`}
              key={img.id}
              onClick={() => setActiveImageIdx(idx)}
              className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-stone-100 border-2 border-amber-500/10 shadow-md cursor-pointer hover:shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-[#C39B62]/40"
            >
              {/* Image */}
              <img 
                src={img.url} 
                alt={img.title}
                className="w-full h-full object-cover filter brightness-95 group-hover:scale-108 transition-all duration-700" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const fb = FALLBACK_IMAGES[img.url];
                  if (fb) e.currentTarget.src = fb;
                }}
              />
              
              {isLastItem ? (
                /* Overlay displaying number of remaining images */
                <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[2px] flex flex-col justify-center items-center text-white transition-all duration-300 group-hover:bg-stone-950/50">
                  <span className="text-3xl md:text-4xl font-serif font-bold text-amber-100 mb-1">
                    +{ALBUM_IMAGES.length - 3}
                  </span>
                  <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-stone-200">
                    Xem thêm ảnh 📸
                  </span>
                </div>
              ) : (
                /* Normal Hover Overlay background details */
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5 text-white select-none">
                  <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-widest mb-1 inline-flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Photo Shoot
                  </span>
                  <h4 className="font-serif text-xs md:text-sm font-semibold tracking-wide truncate">{img.title}</h4>
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-all duration-300">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modern Fullscreen Lightbox Slideshow Overlay */}
      {activeImageIdx !== null && (
        <div 
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-lg z-50 flex flex-col justify-between p-4 md:p-8 animate-fade-in select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          
          {/* Header controls */}
          <div className="flex justify-between items-center text-white/80 shrink-0 border-b border-white/5 pb-4">
            <span className="text-xs font-mono select-none tracking-widest uppercase">
              Ảnh {activeImageIdx + 1} / {ALBUM_IMAGES.length} (Có thể vuốt trái/phải để chuyển ảnh)
            </span>
            <div className="flex items-center gap-4">
              <button
                id="btn-close-lightbox"
                onClick={() => setActiveImageIdx(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 hover:text-white transition-all cursor-pointer text-lg font-bold"
                title="Đóng Album"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central image display with swipe buttons and swiping support */}
          <div className="flex-1 flex items-center justify-between gap-4 py-8 relative">
            <button
              id="btn-lightbox-prev"
              onClick={prevImage}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all absolute left-0 md:static z-20 cursor-pointer shadow-md"
              title="Ảnh trước"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="max-w-4xl max-h-[70vh] w-full h-full flex flex-col justify-center items-center relative z-10 mx-auto">
              <img 
                src={ALBUM_IMAGES[activeImageIdx].url} 
                alt={ALBUM_IMAGES[activeImageIdx].title} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/5"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const fb = FALLBACK_IMAGES[ALBUM_IMAGES[activeImageIdx].url];
                  if (fb) e.currentTarget.src = fb;
                }}
              />
            </div>

            <button
              id="btn-lightbox-next"
              onClick={nextImage}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all absolute right-0 md:static z-20 cursor-pointer shadow-md"
              title="Ảnh tiếp theo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom title display bar */}
          <div className="text-center shrink-0 border-t border-white/5 pt-4 text-white/90">
            <h4 className="font-serif text-base font-semibold tracking-wide">
              {ALBUM_IMAGES[activeImageIdx].title}
            </h4>
            <p className="text-[11px] text-stone-400 mt-1 uppercase font-mono tracking-widest">
              Cô Dâu Bích Trâm ❤️ Chú Rể Trường Xuân
            </p>
          </div>

        </div>
      )}

    </section>
  );
}
