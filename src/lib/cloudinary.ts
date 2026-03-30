import { Cloudinary } from '@cloudinary/url-gen';

// Initialisation de l'instance Cloudinary avec votre Cloud Name
export const cld = new Cloudinary({
  cloud: {
    cloudName: 'dwlarpuwo'
  },
  url: {
    secure: true // Toujours utiliser HTTPS
  }
});

/**
 * Génère une URL de téléchargement ou d'accès direct pour un fichier (PDF, Audio, etc.)
 * @param publicId L'identifiant public du fichier sur Cloudinary (ex: "documents/grimoire_secret")
 * @param resourceType Le type de ressource ("image", "video", "raw" pour les PDFs/Zips)
 */
export const getCloudinaryUrl = (publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') => {
  return `https://res.cloudinary.com/dwlarpuwo/${resourceType}/upload/${publicId}`;
};

// Note: Le preset "mache_lakay_preset" sera utilisé lors de la création du composant d'upload (Admin).
export const CLOUDINARY_UPLOAD_PRESET = 'mache_lakay_preset';

export const uploadToCloudinary = async (file: File, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/dwlarpuwo/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erreur lors de l\'upload sur Cloudinary');
  }

  return response.json();
};
