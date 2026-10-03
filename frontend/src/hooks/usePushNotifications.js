import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = (user) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (isMounted) {
            setIsSubscribed(Boolean(sub));
          }
        }
      } catch (err) {
        console.error('Error verificando suscripción:', err);
      }
    };

    verifySubscription();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const requestAndSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Tu navegador no soporta notificaciones push.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();

      if (perm !== 'granted') {
        toast.error('Permiso de notificaciones denegado.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const keyRes = await api.get('/notificaciones/vapid-key');
      const vapidPublicKey = keyRes.data.publicKey;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await api.post('/notificaciones/subscribe', {
        subscription,
        customerId: user?.id || null,
      });

      setIsSubscribed(true);
      toast.success('¡Notificaciones activadas con éxito! 🔔');
    } catch (error) {
      console.error('Error al suscribir a notificaciones:', error);
      toast.error('No se pudo activar las notificaciones.');
    }
  };

  return { isSubscribed, requestAndSubscribe };
};
