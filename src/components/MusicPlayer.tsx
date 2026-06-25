import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music } from 'lucide-react';

/**
 * ĐƯỜNG DẪN NHẠC NỀN ĐÁM CƯỚI
 * Bạn có thể thay đổi đường dẫn này thành liên kết của bạn (ví dụ: Google Drive trực tiếp, Dropbox raw=1)
 * Hoặc tải tệp .mp3 của bạn lên thư mục 'public/audio/' rồi đổi giá trị dưới đây thành '/audio/ten_file_cua_ban.mp3'
 */
const WEDDING_MUSIC_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Khởi tạo đối tượng Audio
    const audio = new Audio(WEDDING_MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.5; // Thiết lập âm lượng vừa phải (50%)
    audioRef.current = audio;

    // Lắng nghe các lỗi tải tệp (nếu có)
    const handleError = () => {
      console.warn('Không thể phát tệp âm thanh từ liên kết được cung cấp. Vui lòng kiểm tra lại định dạng tệp .mp3 trực tiếp.');
      setIsPlaying(false);
    };
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Cần tương tác từ người dùng để bắt đầu âm thanh:', err);
          // Thử lại hoặc giữ trạng thái pause
          setIsPlaying(false);
        });
    }
  };

  return (
    <div id="wedding-music-player" className="fixed bottom-6 left-6 z-40 select-none">
      <div className="relative flex items-center justify-center">
        
        {/* Vòng tròn sóng phát sáng khi đang phát nhạc */}
        {isPlaying && (
          <>
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-amber-500/10 animate-ping opacity-75"></span>
            <span className="absolute inline-flex h-14 w-14 rounded-full bg-amber-500/15 animate-pulse opacity-50"></span>
          </>
        )}

        {/* Nút nhấn tròn phát/dừng nhạc thiết kế tinh tế */}
        <button
          id="btn-toggle-music"
          onClick={togglePlay}
          className={`relative w-12 h-12 flex items-center justify-center rounded-full bg-[#0B2D1B] border-2 border-amber-400/40 text-amber-200 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group focus:outline-none ${
            isPlaying ? 'animate-spin-slow' : ''
          }`}
          title={isPlaying ? 'Tạm dừng nhạc nền' : 'Phát nhạc nền lễ cưới'}
        >
          {/* Biểu tượng phát nhạc động */}
          {isPlaying ? (
            <Music className="w-5.5 h-5.5 text-amber-300 animate-pulse" />
          ) : (
            <Play className="w-5.5 h-5.5 ml-0.5 text-amber-200 group-hover:text-amber-100 transition-colors" />
          )}

          {/* Dấu chấm nhỏ báo hiệu nhạc đang tạm dừng ở trên góc nút */}
          {!isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
