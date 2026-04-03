import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselItem {
  id: string;
  page: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  orderIndex: number;
  isActive: boolean;
}

interface ImageCarouselProps {
  page: 'home' | 'academy' | 'library' | 'blog';
}

export function ImageCarousel({ page }: ImageCarouselProps) {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [isGloballyActive, setIsGloballyActive] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch global settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'carousels'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          if (settings[page] === false) {
            setIsGloballyActive(false);
            setLoading(false);
            return; // No need to fetch items if globally disabled
          }
        }

        // Fetch carousel items
        const q = query(collection(db, 'carousels'), where('page', '==', page));
        const snapshot = await getDocs(q);
        
        const fetchedItems = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as CarouselItem))
          .filter(item => item.isActive)
          .sort((a, b) => a.orderIndex - b.orderIndex);
          
        setItems(fetchedItems);
      } catch (error) {
        console.error('Error fetching carousels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  }, [items.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [items.length, isPaused, nextSlide]);

  if (loading || !isGloballyActive || items.length < 5) {
    return null; // Don't render anything if loading, disabled, or less than 5 items
  }

  return (
    <div 
      className="relative w-full h-[250px] md:h-[400px] rounded-2xl overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${items[currentIndex].imageUrl}')` }}
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-12">
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-3xl lg:text-4xl font-serif font-bold text-white mb-2 md:mb-4 drop-shadow-lg px-4"
            >
              {items[currentIndex].title}
            </motion.h2>
            
            {items[currentIndex].description && (
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs md:text-base text-gray-200 mb-4 md:mb-6 max-w-2xl drop-shadow-md line-clamp-3 px-4"
              >
                {items[currentIndex].description}
              </motion.p>
            )}

            {items[currentIndex].link ? (
              <motion.a
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                href={items[currentIndex].link}
                className="px-4 py-2 md:px-6 md:py-3 bg-gold text-obsidian text-sm md:text-base font-semibold rounded-full hover:bg-gold-light transition-colors shadow-lg"
              >
                {items[currentIndex].title}
              </motion.a>
            ) : (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="px-4 py-2 md:px-6 md:py-3 bg-gold/90 text-obsidian text-sm md:text-base font-semibold rounded-full shadow-lg"
              >
                {items[currentIndex].title}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100 z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100 z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Progress Bar */}
      {!isPaused && items.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20 z-10">
          <motion.div
            key={currentIndex}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="h-full bg-gold"
          />
        </div>
      )}

      {/* Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                index === currentIndex ? 'bg-gold w-4 md:w-6' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
