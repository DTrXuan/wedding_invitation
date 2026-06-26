import { useState, useEffect, FormEvent } from 'react';
import { Heart, MessageSquare, Sparkles } from 'lucide-react';
import { db, isFirebaseConfigured, getLocalWishes, saveLocalWish, handleFirestoreError, OperationType, addDocWithTimeout } from '../firebase';
import { collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { WishSubmission } from '../types';
import confetti from 'canvas-confetti';

interface GuestbookProps {
  invitedGuest?: string;
}

export default function Guestbook({ invitedGuest = '' }: GuestbookProps) {
  const [wishesList, setWishesList] = useState<WishSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState(invitedGuest);
  const [wishes, setWishes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (invitedGuest) {
      setName(invitedGuest);
    }
  }, [invitedGuest]);

  useEffect(() => {
    setLoading(true);
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
          setWishesList(list);
          setLoading(false);
        }, (error) => {
          console.warn("Firestore subscription for wishes failed. Falling back to local storage:", error);
          const local = getLocalWishes();
          local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setWishesList(local);
          setLoading(false);
        });
      } catch (err) {
        console.warn("Error setting up Firestore subscription for wishes. Falling back to local storage:", err);
        const local = getLocalWishes();
        local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWishesList(local);
        setLoading(false);
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      // Fallback local storage
      const local = getLocalWishes();
      local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWishesList(local);
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wishes.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      wishes: wishes.trim()
    };

    try {
      if (isFirebaseConfigured && db) {
        const path = 'wishes';
        try {
          await addDocWithTimeout(collection(db, path), {
            ...payload,
            createdAt: serverTimestamp()
          }, 10000);
        } catch (firebaseErr: any) {
          console.warn("Firestore save failed, falling back to local storage backup:", firebaseErr);
          
          // Gracefully fallback to offline local storage so the wedding guest experience is completely uninterrupted
          saveLocalWish(payload);
          const local = getLocalWishes();
          local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setWishesList(local);
          
          // Trigger success state and clean inputs
          setSubmitSuccess(true);
          setName(invitedGuest);
          setWishes('');
          
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.8 }
          });

          setTimeout(() => {
            setSubmitSuccess(false);
          }, 4000);
          
          return;
        }
      } else {
        saveLocalWish(payload);
        // Refresh local list
        const local = getLocalWishes();
        local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWishesList(local);
      }

      setSubmitSuccess(true);
      setName(invitedGuest);
      setWishes('');
      
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.8 }
      });

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 4000);

    } catch (err: any) {
      let errorMessage = 'Có lỗi xảy ra khi gửi lời chúc. Vui lòng thử lại.';
      if (err instanceof Error) {
        errorMessage = `Lỗi hệ thống: ${err.message}`;
      }
      setSubmitError(errorMessage);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="guestbook-container" className="py-6 px-4 text-stone-850">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Form Container Card - Matches user uploaded image exactly */}
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-stone-200/50 shadow-sm p-6 sm:p-8 space-y-5 relative">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Name */}
            <div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên của bạn*"
                className="w-full px-5 py-3.5 bg-white border border-stone-200 rounded-xl text-stone-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#0B2D1B]/30 focus:border-[#0B2D1B] placeholder-stone-400 font-light transition-all"
              />
            </div>

            {/* Textarea Wishes */}
            <div>
              <textarea
                required
                rows={4}
                value={wishes}
                onChange={(e) => setWishes(e.target.value)}
                placeholder="Nhập lời chúc của bạn*"
                className="w-full px-5 py-3.5 bg-white border border-stone-200 rounded-xl text-stone-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#0B2D1B]/30 focus:border-[#0B2D1B] placeholder-stone-400 font-light min-h-[120px] resize-none transition-all"
              />
            </div>

            {/* Error & Success Messages */}
            {submitError && (
              <p className="text-red-500 text-xs text-center font-medium">{submitError}</p>
            )}
            {submitSuccess && (
              <p className="text-green-600 text-xs text-center font-bold flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Gửi lời chúc thành công! Cảm ơn bạn rất nhiều! ✨
              </p>
            )}

            {/* Submit Button aligned to the right (Matches exact image style) */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-[#173322] hover:bg-[#0B2D1B] text-white font-sans font-bold rounded-full text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-95 cursor-pointer disabled:bg-stone-300 disabled:text-stone-500"
              >
                {isSubmitting ? 'ĐANG GỬI...' : 'GỬI LỜI CHÚC'}
              </button>
            </div>

          </form>
        </div>

        {/* Wishes List (Wishes board wall below form) */}
        <div className="space-y-6">
          <div className="text-center">
            <span className="text-amber-600 font-serif italic text-base block mb-1">Lời chúc từ mọi người</span>
            <div className="h-[1px] w-12 bg-[#C39B62]/30 mx-auto"></div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-amber-500/20 border-t-amber-600 rounded-full animate-spin"></div>
            </div>
          ) : wishesList.length === 0 ? (
            <div className="text-center py-6 text-stone-400 text-xs">
              Chưa có lời chúc nào được viết. Hãy gửi lời chúc đầu tiên ở trên!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishesList.slice(0, 15).map((wish, index) => (
                <div 
                  id={`wish-card-${wish.id}`}
                  key={wish.id || index}
                  className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between group"
                >
                  {/* Traditional tiny watermark */}
                  <div className="absolute top-2 right-2 text-amber-600/5 select-none font-serif text-xl font-bold">囍</div>
                  
                  {/* Wish Content Quote block */}
                  <div className="relative z-10 flex-1">
                    <span className="text-amber-600/30 font-serif text-3xl font-extrabold leading-none select-none block mb-1">“</span>
                    <p className="text-stone-700 text-xs font-light italic leading-relaxed mb-4 whitespace-pre-line">
                      {wish.wishes}
                    </p>
                  </div>

                  {/* Sender Profile */}
                  <div className="relative z-10 border-t border-stone-100 pt-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-xs font-bold text-[#0B2D1B]">{wish.name}</h4>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200/30 flex items-center justify-center text-amber-600 shrink-0">
                      <Heart className="w-2.5 h-2.5 fill-amber-500 text-amber-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
