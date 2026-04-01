import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

interface PageBannerProps {
  pageName: string;
  title: string;
}

export function PageBanner({ pageName, title }: PageBannerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const docRef = doc(db, 'page_banners', pageName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().imageUrl) {
          setImageUrl(docSnap.data().imageUrl);
        }
      } catch (err) {
        console.error(`Error fetching banner for ${pageName}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, [pageName]);

  // Default image if none is set
  const bgImage = imageUrl || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80';

  return (
    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 bg-black/60 z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-20 text-center px-4"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight">
          {title}
        </h1>
      </motion.div>
    </div>
  );
}
