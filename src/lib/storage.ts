import { supabase } from './supabase';

export const uploadFile = async (file: File, bucket: string): Promise<{ url: string, path: string }> => {
  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uniqueName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading file:', error);
    if (error.message.includes('Bucket not found')) {
      throw new Error(`Le bucket "${bucket}" n'existe pas. Veuillez créer un bucket nommé "${bucket}" dans Supabase (Storage -> Create a new bucket) et cochez "Public bucket".`);
    }
    if (error.message.includes('Failed to fetch')) {
      throw new Error(`Erreur de connexion à Supabase. Vérifiez que votre projet Supabase n'est pas en pause, que vos clés (URL et Anon Key) sont correctes et que les CORS sont configurés.`);
    }
    throw new Error(error.message);
  }

  return { url: getPublicURL(data.path, bucket), path: data.path };
};

export const uploadImage = (file: File) => uploadFile(file, 'blog-images');
export const uploadBlogCover = (file: File) => uploadFile(file, 'blog-covers');
export const uploadBlogBanner = (file: File) => uploadFile(file, 'blog-covers');
export const uploadPDF = (file: File) => uploadFile(file, 'library-pdf');
export const uploadVideo = (file: File) => uploadFile(file, 'course-videos');
export const uploadAudio = (file: File) => uploadFile(file, 'course-audios');
export const uploadAvatar = (file: File) => uploadFile(file, 'user-avatars');
export const uploadCourseImage = (file: File) => uploadFile(file, 'course-thumbnails');
export const uploadLessonFile = (file: File) => uploadFile(file, 'lesson-files');
export const uploadHomepageImage = (file: File) => uploadFile(file, 'homepage');

export const deleteFile = async (urlOrPath: string): Promise<void> => {
  try {
    if (urlOrPath.includes('/storage/v1/object/public/')) {
      const parts = urlOrPath.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        const bucketAndPath = parts[1];
        const firstSlashIndex = bucketAndPath.indexOf('/');
        if (firstSlashIndex !== -1) {
          const bucket = bucketAndPath.substring(0, firstSlashIndex);
          const filePath = bucketAndPath.substring(firstSlashIndex + 1);
          
          const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

          if (error) {
            console.error('Error deleting file:', error);
            if (error.message.includes('Failed to fetch')) {
              throw new Error(`Erreur de connexion à Supabase. Vérifiez que votre projet Supabase n'est pas en pause.`);
            }
            throw new Error(error.message);
          }
          return;
        }
      }
    }
    console.warn('Could not extract bucket and path from:', urlOrPath);
  } catch (err) {
    console.error('Error in deleteFile:', err);
  }
};

export const getPublicURL = (path: string, bucket: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};
