import React, { useState } from 'react';
import { Twitter, Facebook, Linkedin, Link as LinkIcon, Instagram, MessageCircle, Send, Check } from 'lucide-react';

interface SocialShareProps {
  url: string;
  title: string;
}

export function SocialShare({ url, title }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle} ${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie du lien:', err);
    }
  };

  const shareToInstagram = async () => {
    // Instagram doesn't have a web share URL. We copy the link and open IG.
    await copyToClipboard();
    window.open('https://instagram.com', '_blank');
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-400">Partager :</span>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 text-gray-400 hover:text-white hover:bg-[#1877F2] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur Facebook"
        >
          <Facebook className="w-5 h-5" />
        </a>
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 text-gray-400 hover:text-white hover:bg-[#25D366] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
        <a
          href={shareLinks.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 text-gray-400 hover:text-white hover:bg-[#0088cc] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur Telegram"
        >
          <Send className="w-5 h-5" />
        </a>
        <button
          onClick={shareToInstagram}
          className="p-3 text-gray-400 hover:text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#bc1888] bg-obsidian-lighter rounded-full transition-all shadow-sm hover:shadow-md"
          title="Partager sur Instagram (Copie le lien)"
        >
          <Instagram className="w-5 h-5" />
        </button>
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
          className={`p-3 rounded-full transition-all shadow-sm hover:shadow-md ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'text-gray-400 hover:text-obsidian hover:bg-gold bg-obsidian-lighter'
          }`}
          title="Copier le lien"
        >
          {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
