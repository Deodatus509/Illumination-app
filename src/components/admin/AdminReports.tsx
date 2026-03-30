import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      // It's possible the collection doesn't exist yet, just set empty array
      console.log("No reports found or error fetching:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved', resolvedAt: new Date().toISOString() });
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Rapports & Signalements</h2>

      <div className="bg-obsidian-lighter rounded-xl border border-obsidian-light overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">Aucun rapport</h3>
            <p className="text-gray-500">Tout fonctionne parfaitement. Aucun signalement n'a été fait.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
              <thead className="bg-obsidian text-gray-400 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-light">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-obsidian/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        {report.type || 'Signalement'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-md truncate">
                      {report.description}
                    </td>
                    <td className="px-6 py-4">
                      {report.status === 'resolved' ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" /> Résolu
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Clock className="w-4 h-4" /> En attente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {report.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolve(report.id)}
                          className="text-sm bg-obsidian border border-obsidian-light hover:border-gold text-gray-300 px-3 py-1.5 rounded transition-colors"
                        >
                          Marquer résolu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
