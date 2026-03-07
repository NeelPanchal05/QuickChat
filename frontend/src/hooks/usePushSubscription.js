import { useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user, token, API } = useAuth();
  
  useEffect(() => {
    if (!user || !token) return;

    const subscribe = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          const res = await axios.get(`${API}/push/vapid_public_key`, {
             headers: { Authorization: `Bearer ${token}` }
          });
          const convertedVapidKey = urlBase64ToUint8Array(res.data.public_key);

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }
        
        await axios.post(`${API}/push/subscribe`, subscription.toJSON(), {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error("Failed to subscribe to push notifications", error);
      }
    };
    
    // Automatically prompt when Chat page loads.
    if (Notification.permission === 'granted') {
      subscribe();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') subscribe();
      });
    }
  }, [user, token, API]);
}
