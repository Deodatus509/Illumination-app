import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Globe, Monitor, Clock, User, Link as LinkIcon, MapPin, Search, Calendar } from 'lucide-react';
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logs Table */}
        <div className="lg:col-span-2 overflow-hidden bg-obsidian-lighter rounded-xl border border-obsidian-light shadow-xl">
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

        {/* Log Detail Panel */}
        <div className="space-y-6">
          {selectedLog ? (
            <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light p-6 sticky top-24 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-serif text-xl font-bold text-gold">Détails du Visiteur</h3>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-obsidian-light rounded-lg">
                  <User className="w-5 h-5 text-gold mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Identité</p>
                    <p className="text-gray-200 font-medium">{selectedLog.userName || 'Anonyme'}</p>
                    <p className="text-xs text-gray-400">{selectedLog.userEmail || 'Pas d\'email'}</p>
                    <p className="text-[10px] text-gray-600 mt-1 font-mono">UID: {selectedLog.visitorId}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-obsidian-light rounded-lg">
                  <MapPin className={`w-5 h-5 mt-1 ${selectedLog.isPrecise ? 'text-green-400' : 'text-amber-400'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Provenance</p>
                      {selectedLog.isPrecise ? (
                        <div className="flex flex-col items-end">
                          <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full font-medium uppercase tracking-tighter">
                            Position GPS réelle
                          </span>
                          {selectedLog.locationAccuracy && (
                            <span className="text-[9px] text-gray-500 mt-1">Précision: +/- {Math.round(selectedLog.locationAccuracy)}m</span>
                          )}
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full font-medium uppercase tracking-tighter">
                          Estimation via IP
                        </span>
                      )}
                    </div>
                    <p className="text-gray-200 font-medium">{selectedLog.city}, {selectedLog.country}</p>
                    <p className="text-xs text-gray-400">IP: {selectedLog.ip}</p>
                    {!selectedLog.isPrecise && (
                      <p className="text-[9px] text-amber-500/70 mt-1 italic leading-tight">
                        Note: La localisation IP correspond souvent au siège du fournisseur internet (ex: Delmas).
                      </p>
                    )}
                    {selectedLog.latitude && selectedLog.longitude && (
                      <a 
                        href={`https://www.google.com/maps?q=${selectedLog.latitude},${selectedLog.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-400 hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        Voir sur Google Maps
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-obsidian-light rounded-lg">
                  <Monitor className="w-5 h-5 text-gold mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Appareil / Navigateur</p>
                    <p className="text-xs text-gray-300 break-all">{selectedLog.userAgent}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="w-4 h-4 text-gold" />
                    <h4 className="text-sm font-medium text-gray-200">Parcours (Pages visitées)</h4>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedLog.pages?.map((page, idx) => (
                      <div key={idx} className="relative pl-4 border-l border-gold/20 pb-4 last:pb-0">
                        <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                        <p className="text-xs font-medium text-gray-200 truncate" title={page.path}>
                          {page.title || 'Inconnu'}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">{page.path}</p>
                        <p className="text-[9px] text-gray-600 flex items-center gap-1 mt-1">
                          <Calendar className="w-2 h-2" />
                          {new Date(page.enteredAt).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-obsidian-light">
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Début: {formatDate(selectedLog.startedAt)}</span>
                    <span>Actif: {formatDate(selectedLog.lastActive)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-obsidian-lighter/50 rounded-xl border border-obsidian-light border-dashed p-12 text-center flex flex-col items-center justify-center">
              <MapPin className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-500 font-serif">Sélectionnez un visiteur pour voir son parcours détaillé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
