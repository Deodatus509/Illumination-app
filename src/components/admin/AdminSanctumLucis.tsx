import React, { useState } from 'react';
import { LayoutDashboard, Quote, Calendar, Heart, MessageCircle } from 'lucide-react';
import AdminSpiritualQuotes from './AdminSpiritualQuotes';
import AdminConsultations from './AdminConsultations';
import AdminMeditation from './AdminMeditation';
import AdminRituals from './AdminRituals';

export default function AdminSanctumLucis() {
  const [activeTab, setActiveTab] = useState<'quotes' | 'consultations' | 'meditation' | 'rituals'>('quotes');

  return (
    <div className="space-y-8">
      <div className="bg-obsidian-lighter rounded-xl p-6 border border-obsidian-light">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Gestionnaire Sanctum Lucis</h2>
        
        <div className="flex flex-wrap gap-2 border-b border-obsidian-light pb-4">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'quotes' 
                ? 'bg-mystic-purple text-white' 
                : 'bg-obsidian text-gray-400 hover:text-gray-200'
            }`}
          >
            <Quote className="w-4 h-4" />
            Citations
          </button>
          <button
            onClick={() => setActiveTab('consultations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'consultations' 
                ? 'bg-mystic-purple text-white' 
                : 'bg-obsidian text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Consultations
          </button>
          <button
            onClick={() => setActiveTab('meditation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'meditation' 
                ? 'bg-mystic-purple text-white' 
                : 'bg-obsidian text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Méditation
          </button>
          <button
            onClick={() => setActiveTab('rituals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'rituals' 
                ? 'bg-mystic-purple text-white' 
                : 'bg-obsidian text-gray-400 hover:text-gray-200'
            }`}
          >
            <Heart className="w-4 h-4" />
            Rituels
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'quotes' && <AdminSpiritualQuotes />}
        {activeTab === 'consultations' && <AdminConsultations />}
        {activeTab === 'meditation' && <AdminMeditation />}
        {activeTab === 'rituals' && <AdminRituals />}
      </div>
    </div>
  );
}
