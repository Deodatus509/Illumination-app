import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, BookOpen, Video, FileText, TrendingUp, DollarSign } from 'lucide-react';

export default function AdminStatistics() {
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    library: 0,
    posts: 0,
    enrollments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const librarySnap = await getDocs(collection(db, 'library'));
        const postsSnap = await getDocs(collection(db, 'posts'));
        const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));

        setStats({
          users: usersSnap.size,
          courses: coursesSnap.size,
          library: librarySnap.size,
          posts: postsSnap.size,
          enrollments: enrollmentsSnap.size
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Utilisateurs Totaux', value: stats.users, icon: Users, color: 'text-blue-400' },
    { title: 'Formations', value: stats.courses, icon: Video, color: 'text-green-400' },
    { title: 'Inscriptions', value: stats.enrollments, icon: TrendingUp, color: 'text-purple-400' },
    { title: 'Documents Bibliothèque', value: stats.library, icon: BookOpen, color: 'text-yellow-400' },
    { title: 'Articles de Blog', value: stats.posts, icon: FileText, color: 'text-pink-400' },
    { title: 'Revenus (Est.)', value: '--- €', icon: DollarSign, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Tableau de bord des statistiques</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-obsidian-lighter p-6 rounded-xl border border-obsidian-light flex items-center gap-4">
              <div className={`p-4 bg-obsidian rounded-lg border border-obsidian-light ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
