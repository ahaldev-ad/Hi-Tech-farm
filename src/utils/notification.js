// Web & Phone Push Notification Helper

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
      '🟢 Phone Alerts Enabled',
      'You will receive instant pop-up notifications on your phone when environmental thresholds are breached!'
    );
    return true;
  } else {
    alert('Notification permission denied. Please allow notifications in your phone browser settings.');
    return false;
  }
};

export const sendPhonePushNotification = async (title, body) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      registration.showNotification(title, {
        body: body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: 'paradise-alert'
      });
      return;
    }
  }

  // Fallback
  new Notification(title, { body, icon: '/favicon.svg' });
};
