import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Globe, Monitor, Clock, User, Link as LinkIcon, MapPin, Search, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VisitorLog {
  id: string;
  visitorId: string;
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  isPrecise?: boolean;
  pages: Array<{
    path: string;
    title: string;
    enteredAt: any;
  }>;
  startedAt: any;
  lastActive: any;
}

export function AdminTracking() {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<VisitorLog | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'visitor_logs'), orderBy('lastActive', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitorLog));
        setLogs(data);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    (log.ip?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.country?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.userName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.visitorId?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, 'dd/MM/yyyy HH:mm:ss', { locale: fr });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (selectedLog) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedLog(null)} 
          className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>

        <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-start mb-6">
            <h3 className="font-serif text-2xl font-bold text-gold">Détails du Visiteur</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start gap-4 p-4 bg-obsidian-light rounded-xl border border-obsidian">
              <User className="w-6 h-6 text-gold mt-1" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Identité</p>
                <p className="text-gray-100 font-bold text-lg">{selectedLog.userName || 'Anonyme'}</p>
                <p className="text-sm text-gray-400">{selectedLog.userEmail || 'Pas d\'email'}</p>
                <p className="text-xs text-gray-500 mt-2 font-mono break-all">UID: {selectedLog.visitorId}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-obsidian-light rounded-xl border border-obsidian">
              <MapPin className={`w-6 h-6 mt-1 ${selectedLog.isPrecise ? 'text-green-400' : 'text-amber-400'}`} />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Provenance</p>
                  {selectedLog.isPrecise ? (
                    <div className="flex flex-col items-end">
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] rounded-full font-bold uppercase tracking-wider border border-green-500/20">
                        Position GPS réelle
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] rounded-full font-bold uppercase tracking-wider border border-amber-500/20">
                      Estimation via IP
                    </span>
                  )}
                </div>
                <p className="text-gray-100 font-bold text-lg">{selectedLog.city || 'Ville Inconnue'}, {selectedLog.country || 'Pays Inconnu'}</p>
                <p className="text-sm text-gray-400">IP: {selectedLog.ip}</p>
                
                {selectedLog.isPrecise && selectedLog.locationAccuracy && (
                  <p className="text-[10px] text-gray-400 mt-2">Précision: +/- {Math.round(selectedLog.locationAccuracy)}m</p>
                )}
                {!selectedLog.isPrecise && (
                  <p className="text-[10px] text-amber-500/70 mt-2 italic leading-relaxed">
                    Note: La localisation IP correspond souvent au siège du fournisseur internet plutôt qu'à l'adresse exacte.
                  </p>
                )}
                
                {selectedLog.latitude && selectedLog.longitude && (
                  <a 
                    href={`https://www.google.com/maps?q=${selectedLog.latitude},${selectedLog.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Voir sur Google Maps
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-obsidian-light rounded-xl border border-obsidian md:col-span-2">
              <Monitor className="w-6 h-6 text-gold mt-1 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Appareil / Navigateur</p>
                <p className="text-sm text-gray-300 break-all leading-relaxed">{selectedLog.userAgent}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-gold" />
              <h4 className="text-lg font-bold text-gray-100 font-serif">Parcours (Pages visitées)</h4>
              <span className="bg-obsidian px-2 py-0.5 rounded-full text-xs text-gray-400 font-medium ml-2">
                {selectedLog.pages?.length || 0} pages
              </span>
            </div>
            
            <div className="bg-obsidian rounded-xl border border-obsidian-light p-4">
              {selectedLog.pages && selectedLog.pages.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedLog.pages.map((page, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-gold/20 pb-4 last:pb-0 group">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(255,215,0,0.5)] group-hover:scale-150 transition-transform" />
                      <p className="text-sm font-bold text-gray-200 mb-0.5 group-hover:text-gold transition-colors" title={page.path}>
                        {page.title || 'Inconnu'}
                      </p>
                      <p className="text-xs text-gray-400 mb-1">{page.path}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        {new Date(page.enteredAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">Aucune page visitée enregistrée.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-obsidian-light flex justify-between bg-obsidian-light/30 p-3 rounded-lg text-sm text-gray-400 font-medium">
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Début: {formatDate(selectedLog.startedAt)}</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold/50" /> Dernier signal: {formatDate(selectedLog.lastActive)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-serif font-bold text-gold">Retraçage des Visiteurs</h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher IP, Pays, Nom..."
            className="w-full pl-10 pr-4 py-2 bg-obsidian-light border border-obsidian-lighter rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-obsidian-light text-gray-400 font-medium">
              <tr>
                <th className="px-4 py-3">Visiteur / IP</th>
                <th className="px-4 py-3">Localisation</th>
                <th className="px-4 py-3">Dernière Activité</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-light">
              {filteredLogs.map((log) => (
                <tr 
                  key={log.id} 
                  className={`hover:bg-obsidian-light/50 transition-colors cursor-pointer ${selectedLog?.id === log.id ? 'bg-gold/5' : ''}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-200">
                        {log.userName || log.userEmail || 'Visiteur Anonyme'}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {log.ip}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className={`w-3 h-3 ${log.isPrecise ? 'text-green-400' : 'text-amber-400'}`} />
                      <span className="text-gray-300">{log.country || 'Inconnu'}</span>
                      {log.city && <span className="text-gray-500 text-xs">({log.city})</span>}
                      {log.isPrecise ? (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full font-medium">
                          <MapPin className="w-2 h-2" />
                          GPS
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full font-medium">
                          <Monitor className="w-2 h-2" />
                          IP (Approximatif)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(log.lastActive)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      className="text-gold hover:underline text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Aucun log trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
