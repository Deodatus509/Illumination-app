/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Placeholder imports for pages
import { Home } from './pages/Home';
import { Blog } from './pages/Blog';
import { Library } from './pages/Library';
import { Academy } from './pages/Academy';
import { Dashboard } from './pages/Dashboard';
import { CourseView } from './pages/CourseView';
import { LessonView } from './pages/LessonView';
import Profile from './pages/Profile';
import { AdminPanel } from './pages/AdminPanel';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { NotFound } from './pages/NotFound';
import { SanctumLucis } from './pages/SanctumLucis';
import { SanctumConsultations } from './pages/SanctumConsultations';
import { SanctumMeditations } from './pages/SanctumMeditations';
import { SanctumMeditationDetail } from './pages/SanctumMeditationDetail';
import { SanctumRituals } from './pages/SanctumRituals';
import { SanctumRitualDetail } from './pages/SanctumRitualDetail';
import { SanctumRitualPropose } from './pages/SanctumRitualPropose';
import { UserMessages } from './pages/UserMessages';
import { EditorMessages } from './pages/EditorMessages';
import { SupporteurMessages } from './pages/SupporteurMessages';
import { EditorDashboard } from './pages/EditorDashboard';
import { SupporteurDashboard } from './pages/SupporteurDashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-obsidian text-gray-200">
              <Navbar />
              <AuthModal />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:id" element={<Blog />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/library/:id" element={<Library />} />
                  <Route path="/academy" element={<Academy />} />
                  <Route path="/academy/:courseId" element={<CourseView />} />
                  <Route path="/course/:courseId" element={<CourseView />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/messages" element={<UserMessages />} />
                  <Route 
                    path="/editor" 
                    element={
                      <ProtectedRoute requireEditor>
                        <EditorDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/editor/messages" 
                    element={
                      <ProtectedRoute requireEditor>
                        <EditorMessages />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supporteur" 
                    element={
                      <ProtectedRoute requireSupporteur>
                        <SupporteurDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supporteur/messages" 
                    element={
                      <ProtectedRoute requireSupporteur>
                        <SupporteurMessages />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/sanctum-lucis" element={<SanctumLucis />} />
                  <Route path="/sanctum-lucis/consultations" element={<SanctumConsultations />} />
                  <Route path="/sanctum-lucis/meditations" element={<SanctumMeditations />} />
                  <Route path="/sanctum-lucis/meditations/:id" element={<SanctumMeditationDetail />} />
                  <Route path="/sanctum-lucis/rituals" element={<SanctumRituals />} />
                  <Route path="/sanctum-lucis/rituals/propose" element={<SanctumRitualPropose />} />
                  <Route path="/sanctum-lucis/rituals/:id" element={<SanctumRitualDetail />} />
                  <Route 
                    path="/admin/*" 
                    element={
                      <ProtectedRoute requireStaff>
                        <AdminPanel />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/lesson/:lessonId" element={<LessonView />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
