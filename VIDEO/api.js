/**
 * ZEROHUB UI — API layer
 * All network access is isolated here so a real backend can be plugged
 * in later without touching any UI code. When API_BASE_URL is empty or
 * a request fails, the layer transparently falls back to DEMO MODE with
 * static sample data — it never fabricates a "real" progress or a real
 * file size when no backend actually provided one.
 */
const API_BASE_URL = ''; // set to a real backend origin, e.g. 'https://api.zerohub.app'

const API = (() => {

  let demoMode = !API_BASE_URL;

  const AUDIO_BITRATES = [48, 128, 160, 256, 320];
  const VIDEO_RESOLUTIONS = ['144p','240p','360p','480p','720p','1080p','1440p','2160p / 4K'];

  const DEMO_LIBRARY = [
    { id: 'demo-1', title: 'ZEROHUB UI — Demo Trailer',      source: 'demo.tube', duration: '02:14', type: 'video' },
    { id: 'demo-2', title: 'Neon Nights — Synthwave Mix',    source: 'demo.audio', duration: '54:02', type: 'audio' },
    { id: 'demo-3', title: 'Futuristic City Timelapse 4K',   source: 'demo.tube', duration: '05:47', type: 'video' },
    { id: 'demo-4', title: 'Deep Focus — Lo-fi Study Beats', source: 'demo.audio', duration: '31:18', type: 'audio' },
  ];

  function isDemo() { return demoMode; }

  async function request(path, options = {}) {
    if (!API_BASE_URL) throw new Error('NO_BACKEND');
    const res = await fetch(API_BASE_URL + path, options);
    if (!res.ok) throw new Error('BACKEND_ERROR_' + res.status);
    return res.json();
  }

  /** GET /api/search?q=... — falls back to local demo results. */
  async function search(query) {
    try {
      return await request(`/api/search?q=${encodeURIComponent(query)}`);
    } catch {
      demoMode = true;
      const q = query.trim().toLowerCase();
      const results = q
        ? DEMO_LIBRARY.filter(item => item.title.toLowerCase().includes(q))
        : DEMO_LIBRARY;
      return { demo: true, results: results.length ? results : DEMO_LIBRARY };
    }
  }

  /** POST /api/analyze — falls back to a single synthesized demo item from the URL. */
  async function analyzeUrl(url) {
    try {
      return await request('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch {
      demoMode = true;
      let host = 'demo.source';
      try { host = new URL(url).hostname; } catch { /* keep default */ }
      return {
        demo: true,
        result: {
          id: 'analyzed-' + Date.now(),
          title: 'Найденный контент (демо)',
          source: host,
          duration: '03:41',
          type: /\.(mp3|wav|flac|m4a)(\?|$)/i.test(url) ? 'audio' : 'video'
        }
      };
    }
  }

  /** GET /api/formats?id=... — real backend would return real sizes; demo marks them unknown. */
  async function getFormats(itemId) {
    try {
      return await request(`/api/formats?id=${encodeURIComponent(itemId)}`);
    } catch {
      demoMode = true;
      return {
        demo: true,
        audio: AUDIO_BITRATES.map(kbps => ({ kbps, format: 'MP3', sizeLabel: 'Размер неизвестен' })),
        video: VIDEO_RESOLUTIONS.map(res => ({ resolution: res, format: 'MP4', sizeLabel: 'Размер неизвестен' }))
      };
    }
  }

  /**
   * Starts a download.
   * Real mode: expects backend to stream progress via /api/download/progress (polled by getDownloadProgress).
   * Demo mode: simulates a bounded, clearly-fake progression so the UI has something to render —
   * this is never presented to the user as a real transfer (see app.js DEMO_MODE toast/tag).
   */
  async function download(job, onProgress) {
    if (!isDemo()) {
      try {
        const res = await request('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job)
        });
        return res; // real backend returns a downloadId to poll via getDownloadProgress
      } catch {
        demoMode = true;
      }
    }
    return simulateDemoDownload(job, onProgress);
  }

  function simulateDemoDownload(job, onProgress) {
    return new Promise((resolve) => {
      let pct = 0;
      const totalMs = 4200 + Math.random() * 2600;
      const stepMs = 180;
      const steps = totalMs / stepMs;
      const inc = 100 / steps;
      const timer = setInterval(() => {
        pct = Math.min(100, pct + inc * (0.6 + Math.random() * 0.8));
        onProgress({ percent: Math.round(pct), speedLabel: (2 + Math.random() * 7).toFixed(1) + ' MB/s (демо)' });
        if (pct >= 100) {
          clearInterval(timer);
          resolve({ demo: true, completed: true });
        }
      }, stepMs);
      // expose a canceller on the promise-adjacent job object
      job._cancel = () => clearInterval(timer);
      job._pause = () => clearInterval(timer);
    });
  }

  /** GET /api/download/progress?id=... — for a real backend using Range-request resumable transfers. */
  async function getDownloadProgress(downloadId) {
    try {
      return await request(`/api/download/progress?id=${encodeURIComponent(downloadId)}`);
    } catch {
      return null; // demo mode drives progress via the callback in download() instead
    }
  }

  return { isDemo, search, analyzeUrl, getFormats, download, getDownloadProgress, AUDIO_BITRATES, VIDEO_RESOLUTIONS };
})();
