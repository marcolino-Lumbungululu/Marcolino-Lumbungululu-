import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Service worker cached core assets for offline navigation
    },
  });
  if (navigator.onLine) {
    const prewarmAssets = [
      '/images/nexus_emblem_1794644383713.jpg',
      '/images/album_christian_1794644383534.jpg',
      '/images/album_angola_1794644385016.jpg',
      '/images/album_focus_1794644386210.jpg',
    ];
    void navigator.serviceWorker.ready.then(async () => {
      if ('caches' in window) {
        const cache = await caches.open('nexus-local-images');
        await Promise.all(
          prewarmAssets.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res.ok) await cache.put(url, res.clone());
            } catch {
              // Ignore offline fetch failures
            }
          })
        );
      }
      for (const url of prewarmAssets) {
        const img = new Image();
        img.src = url;
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
