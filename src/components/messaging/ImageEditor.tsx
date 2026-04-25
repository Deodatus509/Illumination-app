import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCcw, Type } from 'lucide-react';

interface ImageEditorProps {
  image: string;
  onClose: () => void;
  onSave: (croppedImage: Blob) => void;
}

export function ImageEditor({ image, onClose, onSave }: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-obsidian-lighter border-b border-white/10 shrink-0">
        <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-white font-semibold">Modifier l'image</h2>
        <button onClick={handleSave} className="p-2 bg-gold text-black rounded-full hover:bg-yellow-400 transition-colors shadow-lg">
          <Check size={24} />
        </button>
      </div>

      <div className="relative flex-1 bg-black">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      <div className="p-6 bg-obsidian-lighter border-t border-white/10 shrink-0 space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-xs text-white uppercase tracking-wider font-bold">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e: any) => setZoom(e.target.value)}
            className="flex-1 accent-gold h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
        </div>
        
        <div className="flex justify-center gap-6">
           <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors" onClick={() => {setZoom(1); setCrop({x:0, y:0});}}>
             <RotateCcw size={20} />
             <span className="text-[10px]">Réinitialiser</span>
           </button>
           <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors opacity-50 cursor-not-allowed">
             <Type size={20} />
             <span className="text-[10px]">Texte (Bientôt)</span>
           </button>
        </div>
      </div>
    </div>
  );
}
