import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const VISITOR_ID_KEY = 'illumination_visitor_id';
const SESSION_ID_KEY = 'illumination_session_id';

export function useVisitorTracker() {
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const sessionDocRef = useRef<any>(null);
  const visitorIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isInitialized = useRef<boolean>(false);

  useEffect(() => {
    // 1. Initialize Visitor ID
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    visitorIdRef.current = visitorId;

    // 2. Initialize Session ID (resets on tab close or after some time, using sessionStorage)
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    sessionIdRef.current = sessionId;

    const initTracker = async () => {
      try {
        const docRef = doc(db, 'visitor_logs', sessionId!);
        sessionDocRef.current = docRef;

        const docSnap = await getDoc(docRef);

        // Fetch IP information (fallback and for IP address)
        let ipData = { ip: 'Unknown', country_name: 'Unknown', city: 'Unknown' };
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            ipData = await response.json();
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') {
             console.warn("Tracking: Could not fetch IP data", e.message);
          }
        }

        if (!docRef) return; // Defensive check

        // Try to get precise location via browser Geolocation API
        let preciseLocation: any = null;
        if ("geolocation" in navigator) {
          try {
            // Check permission status first to avoid silent blocking
            try {
              const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
              if (permissionStatus.state === 'prompt') {
                console.log("Tracking: Location permission is prompt state");
              }
            } catch (ignore) {
              // Permission API might not be supported
            }

            preciseLocation = await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const { latitude, longitude, accuracy } = position.coords;
                  console.log(`Tracking: GPS obtained, accuracy: ${accuracy}m`);
                  
                  // Reverse geocode via Nominatim (OSM)
                  try {
                    const revResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`, {
                      headers: { 'User-Agent': 'IlluminationApp/1.1' }
                    });
                    if (revResponse.ok) {
                      const revData = await revResponse.json();
                      resolve({
                        latitude,
                        longitude,
                        accuracy,
                        city: revData.address.city || revData.address.town || revData.address.village || revData.address.municipality || revData.address.county || 'Inconnu',
                        country: revData.address.country || 'Inconnu'
                      });
                    } else {
                      resolve({ latitude, longitude, accuracy });
                    }
                  } catch (e) {
                    resolve({ latitude, longitude, accuracy });
                  }
                },
                (error) => {
                  console.warn("Geolocation denied or failed:", error.message);
                  resolve(null);
                },
                { 
                  timeout: 20000, 
                  enableHighAccuracy: true,
                  maximumAge: 0 
                }
              );
            });
          } catch (e) {
            console.error("Geolocation check failed:", e);
          }
        }

        if (!docSnap.exists()) {
          await setDoc(docRef, {
            visitorId: visitorId,
            ip: ipData.ip,
            country: preciseLocation?.country || ipData.country_name,
            city: preciseLocation?.city || ipData.city,
            latitude: preciseLocation?.latitude || null,
            longitude: preciseLocation?.longitude || null,
            locationAccuracy: preciseLocation?.accuracy || null,
            isPrecise: !!preciseLocation,
            userAgent: navigator.userAgent,
            userId: currentUser?.uid || null,
            userEmail: currentUser?.email || null,
            userName: userProfile?.displayName || null,
            startedAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            pages: [{
              path: window.location.pathname,
              title: document.title,
              enteredAt: new Date().toISOString()
            }]
          });
        } else {
          // Session already exists, just update last active and user info
          const updateData: any = {
            lastActive: serverTimestamp(),
          };
          if (currentUser?.uid) updateData.userId = currentUser.uid;
          if (currentUser?.email) updateData.userEmail = currentUser.email;
          if (userProfile?.displayName) updateData.userName = userProfile.displayName;
          
          if (preciseLocation) {
            updateData.country = preciseLocation.country;
            updateData.city = preciseLocation.city;
            updateData.latitude = preciseLocation.latitude;
            updateData.longitude = preciseLocation.longitude;
            updateData.locationAccuracy = preciseLocation.accuracy;
            updateData.isPrecise = true;
          }

          await updateDoc(docRef, updateData);
        }
        isInitialized.current = true;
      } catch (err) {
        console.error("Tracking Error:", err);
      }
    };

    initTracker();

    // 3. Heartbeat to update last active periodically
    const heartbeat = setInterval(async () => {
      if (sessionDocRef.current && isInitialized.current) {
        try {
          await updateDoc(sessionDocRef.current, {
            lastActive: serverTimestamp()
          });
        } catch (e) {
          // Ignore
        }
      }
    }, 60000); // Every minute

    return () => clearInterval(heartbeat);
  }, [currentUser, userProfile]);

  // Track Page Changes
  useEffect(() => {
    const logPageChange = async () => {
      if (!sessionDocRef.current || !isInitialized.current) return;

      try {
        const now = new Date().toISOString();
        
        // Update the last page's exitedAt and add new page
        // Note: Firestore doesn't support updating the last element of an array easily without reading first.
        // For simplicity, we just push to the array.
        
        await updateDoc(sessionDocRef.current, {
          lastActive: serverTimestamp(),
          pages: arrayUnion({
            path: location.pathname,
            title: document.title || 'Page',
            enteredAt: now
          })
        });
      } catch (err) {
        console.error("Tracking Page Error:", err);
      }
    };

    logPageChange();
  }, [location.pathname]);

  return null;
}
