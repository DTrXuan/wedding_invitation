import { Heart } from 'lucide-react';
import { WeddingCoupleInfo } from '../types';

interface IntroProps {
  groom: WeddingCoupleInfo;
  bride: WeddingCoupleInfo;
}

export default function GroomBrideIntro({ groom, bride }: IntroProps) {
  return (
    <section id="groom-bride-intro" className="py-16 px-4 max-w-4xl mx-auto text-stone-850 bg-white">
      {/* section header */}
      <div className="text-center mb-12 relative">
        <h2 className="font-serif text-3xl md:text-4xl text-[#0B2D1B] font-bold tracking-tight inline-block relative pb-4">
          Cô Dâu &amp; Chú Rể
          <div className="absolute bottom-0 left-1/4 right-1/4 h-[1.5px] bg-gradient-to-r from-transparent via-[#C39B62] to-transparent"></div>
        </h2>
        <p className="text-stone-500 text-sm max-w-md mx-auto mt-4 font-light leading-relaxed">
          Hai tâm hồn tìm thấy sự đồng điệu và nguyện ước kề vai sát cánh suốt cuộc đời.
        </p>
      </div>

      {/* Grid of Couple side-by-side on 1 row */}
      <div className="grid grid-cols-2 gap-4 sm:gap-10 max-w-2xl mx-auto items-start">
        
        {/* Groom Side */}
        <div className="flex flex-col items-center text-center">
          {/* Circular avatar container */}
          <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-full p-1 border-2 border-[#C39B62]/50 shadow-lg overflow-hidden bg-white shrink-0">
            <img 
              src={groom.avatar} 
              alt="Chú rể" 
              className="w-full h-full object-cover rounded-full filter brightness-95 scale-102 hover:scale-108 transition-transform duration-500"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=80";
              }}
            />
          </div>
          
          {/* Role block */}
          <span className="text-[#0B2D1B] font-serif text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase mt-4 block">
            Trưởng Nam
          </span>
          
          {/* Name block */}
          <h3 className="font-serif text-base sm:text-2xl font-bold text-stone-900 mt-1 leading-tight">
            {groom.name}
          </h3>
        </div>

        {/* Bride Side */}
        <div className="flex flex-col items-center text-center">
          {/* Circular avatar container */}
          <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-full p-1 border-2 border-[#C39B62]/50 shadow-lg overflow-hidden bg-white shrink-0">
            <img 
              src={bride.avatar} 
              alt="Cô dâu" 
              className="w-full h-full object-cover rounded-full filter brightness-95 scale-102 hover:scale-108 transition-transform duration-500"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1549417229-aa67d3263c09?w=500&auto=format&fit=crop&q=80";
              }}
            />
          </div>
          
          {/* Role block */}
          <span className="text-[#0B2D1B] font-serif text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase mt-4 block">
            Quý Nữ
          </span>
          
          {/* Name block */}
          <h3 className="font-serif text-base sm:text-2xl font-bold text-stone-900 mt-1 leading-tight">
            {bride.name}
          </h3>
        </div>

      </div>
    </section>
  );
}
