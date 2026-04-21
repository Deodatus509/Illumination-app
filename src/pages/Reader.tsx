import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function Reader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const url = searchParams.get('file');
  const title = searchParams.get('title') || 'Document';
  
  const [zoom, setZoom] = React.useState(1);

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-obsidian text-gray-200">
        <p>Document introuvable.</p>
        <button onClick={() => navigate(-1)} className="ml-4 text-gold">Retour</button>
      </div>
    );
  }

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex flex-col bg-obsidian text-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-obsidian-lighter border-b border-obsidian-light z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-obsidian rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-300" />
          </button>
          <h1 className="text-lg font-serif font-bold text-gold truncate max-w-sm">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-obsidian rounded-full"><ZoomOut className="w-5 h-5"/></button>
          <button onClick={() => setZoom(1)} className="p-2 hover:bg-obsidian rounded-full text-sm">100%</button>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-obsidian rounded-full"><ZoomIn className="w-5 h-5"/></button>
          <button onClick={handleDownload} className="p-2 bg-gold/10 text-gold rounded-md hover:bg-gold/20 flex items-center gap-2 px-3">
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Télécharger</span>
          </button>
        </div>
      </header>

      {/* Viewer Area */}
      <div className="flex-grow bg-obsidian-darker w-full overflow-hidden flex items-center justify-center">
        <div className="w-full h-full p-4 overflow-auto" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
          <iframe 
            src={url ? `${url}#toolbar=0&navpanes=0&scrollbar=0` : undefined} 
            className="w-full h-full bg-white shadow-2xl rounded-sm" 
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
