// Web & High-Priority Phone Push Notification Helper

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registered:', registration);
      return registration;
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    alert('This browser does not support phone push notifications.');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await registerServiceWorker();
    sendPhonePushNotification(
      '🟢 Critical Phone Alerts Enabled',
      'High-priority alerts will now pop up on your phone with vibration and lock screen visibility!'
    );
    return true;
  } else {
    alert('Notification permission denied. Please allow notifications in your phone browser settings.');
    return false;
  }
};

export const sendPhonePushNotification = async (title, body) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const formattedTitle = title.includes('🚨') ? title : `🚨 CRITICAL ALERT: ${title}`;

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      registration.showNotification(formattedTitle, {
        body: body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [500, 100, 500, 100, 500, 100, 1000], // Heavy attention vibration pulse
        requireInteraction: true,                       // Keeps notification pinned on screen until dismissed!
        renotify: true,                                 // Re-triggers alert sound and vibration
        tag: 'critical-paradise-alert'
      });
      return;
    }
  }

  // Fallback
  new Notification(formattedTitle, { 
    body, 
    icon: '/favicon.svg',
    requireInteraction: true
  });
};
