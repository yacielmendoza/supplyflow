// Web Audio API Sound Synthesizer for alerts without external audio files
export function playAlertSound(type: 'urgent' | 'success' | 'click' = 'urgent') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'urgent') {
      // Two-tone double chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.setValueAtTime(1174.66, now + 0.15); // D6

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(587.33, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } else if (type === 'success') {
      // Pleasant upward chime
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'click') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.error('Audio playback error', e);
  }
}

// Browser Web Push Notification helper
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Show notification via Service Worker when available (required for Android background)
// Falls back to direct Notification API for browsers without SW support
export async function showLocalNotification(title: string, body: string): Promise<void> {
  playAlertSound('urgent');
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Prefer SW showNotification — works in Android background, iOS PWA background (16.4+)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/pwa-icon.png',
        badge: '/pwa-icon.png',
        requireInteraction: false,
      } as NotificationOptions);
      return;
    } catch (_) {
      // fall through to direct API
    }
  }

  try {
    new Notification(title, { body, icon: '/pwa-icon.png', badge: '/pwa-icon.png' });
  } catch (_) {}
}

// Update the PWA icon badge count (Chrome 81+ Android/desktop, Safari 17+ iOS)
export function setAppBadge(count: number): void {
  if (!('setAppBadge' in navigator)) return;
  if (count > 0) {
    (navigator as any).setAppBadge(count).catch(() => {});
  } else {
    (navigator as any).clearAppBadge?.().catch(() => {});
  }
}

// Generates direct WhatsApp click-to-chat links for rapid zero-friction sharing
export function generateWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function generateRequestWhatsAppSummary(req: {
  requestNumber: number;
  restaurantName: string;
  items: Array<{ productName: string; requestedQty: number; unit: string; suggestedSupplier?: string }>;
  createdByUserName: string;
}): string {
  let msg = `🚨 *SOLICITUD DE ABASTECIMIENTO #${req.requestNumber}*\n`;
  msg += `📍 *Restaurante:* ${req.restaurantName}\n`;
  msg += `👤 *Solicitado por:* ${req.createdByUserName}\n\n`;
  msg += `📦 *PRODUCTOS REQUERIDOS:*\n`;

  req.items.forEach((item, idx) => {
    msg += `${idx + 1}. *${item.productName}* - ${item.requestedQty} ${item.unit} (${item.suggestedSupplier || 'General'})\n`;
  });

  msg += `\n⚡ *Abre la app para asignarte o ir a Modo Compra:* ${window.location.origin}`;
  return msg;
}
