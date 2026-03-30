import React from 'react';
import { Twitter, Facebook, Linkedin, Link as LinkIcon } from 'lucide-react';

interface SocialShareProps {
  url: string;
  title: string;
}

export function SocialShare({ url, title }: SocialShareProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papiers !');
    } catch (err) {
      console.error('Erreur lors de la copie du lien:', err);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-400">Partager :</span>
      <div className="flex items-center gap-3">
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 text-gray-400 hover:text-white hover:bg-[#1DA1F2] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur Twitter"
        >
          <Twitter className="w-5 h-5" />
        </a>
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 text-gray-400 hover:text-white hover:bg-[#4267B2] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur Facebook"
        >
          <Facebook className="w-5 h-5" />
        </a>
        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 text-gray-400 hover:text-white hover:bg-[#0077b5] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur LinkedIn"
        >
          <Linkedin className="w-5 h-5" />
        </a>
        <button
          onClick={copyToClipboard}
          className="p-3 text-gray-400 hover:text-obsidian hover:bg-gold bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Copier le lien"
        >
          <LinkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
