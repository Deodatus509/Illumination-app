import React, { useState } from 'react';
import { LayoutDashboard } from 'lucide-react';
import AdminContentForm from './AdminContentForm';
import AdminContentList from './AdminContentList';

export default function AdminContentManager() {
  const [contentType, setContentType] = useState<'blog' | 'library' | 'academy' | 'lesson'>('blog');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContentType(e.target.value as any);
    setEditingItem(null);
  };

  return (
    <div className="space-y-8">
      <div className="bg-obsidian-lighter rounded-xl p-6 border border-obsidian-light">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Gestionnaire de Contenu Unifié</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <label className="text-gray-400 font-medium whitespace-nowrap">Type de contenu :</label>
          <select
            value={contentType}
            onChange={handleTypeChange}
            className="block w-full sm:w-64 pl-3 pr-8 py-2 border border-obsidian-light rounded-md leading-5 bg-obsidian text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
          >
            <option value="blog">Articles de Blogue</option>
            <option value="library">Ressources Bibliothèque</option>
            <option value="academy">Cours Académie</option>
            <option value="lesson">Leçons</option>
          </select>
        </div>
      </div>

      <AdminContentForm 
        type={contentType} 
        activeTab={contentType}
        editingItem={editingItem}
        onCancelEdit={() => setEditingItem(null)}
      />
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-100 mb-6 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-gold" />
          Liste des contenus
        </h2>
        <AdminContentList 
          type={contentType} 
          activeTab={contentType}
          onEdit={(item) => {
            setEditingItem(item);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
}
