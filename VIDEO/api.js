/**
 * ZEROHUB UI — API Layer (Real YouTube Integration via Invidious API)
 */
const API = (() => {

  // Рӯйхати серверҳои кушодаи Invidious барои гирифтани маълумоти воқеӣ аз YouTube
  const INVIDIOUS_INSTANCES = [
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us'
  ];

  let currentInstanceIndex = 0;

  function getApiBase() {
    return INVIDIOUS_INSTANCES[currentInstanceIndex];
  }

  function rotateInstance() {
    currentInstanceIndex = (currentInstanceIndex + 1) % INVIDIOUS_INSTANCES.length;
  }

  async function fetchWithRetry(path, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const url = `${getApiBase()}${path}`;
        const res = await fetch(url, options);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn(`Error connecting to ${getApiBase()}, switching server...`);
        rotateInstance();
      }
    }
    throw new Error('Хатогӣ ҳангоми пайвастшавӣ ба сервер. Лутфан бори дигар кӯшиш кунед.');
  }

  function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  function isDemo() { return false; }

  async function search(query) {
    if (!query) return { demo: false, results: [] };
    const data = await fetchWithRetry(`/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
    const results = data.map(item => ({
      id: item.videoId,
      title: item.title,
      source: 'YouTube',
      duration: formatDuration(item.lengthSeconds),
      type: 'video',
      thumb: item.videoThumbnails ? item.videoThumbnails[0]?.url : '',
      embedUrl: `https://www.youtube.com/embed/${item.videoId}?autoplay=1`
    }));
    return { demo: false, results };
  }

  async function analyzeUrl(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      throw new Error('Линки нодуруст. Лутфан линки воқеии YouTube-ро гузоред.');
    }
    const item = await fetchWithRetry(`/api/v1/videos/${videoId}`);
    return {
      demo: false,
      result: {
        id: item.videoId,
        title: item.title,
        source: 'YouTube',
        duration: formatDuration(item.lengthSeconds),
        type: 'video',
        thumb: item.videoThumbnails ? item.videoThumbnails[0]?.url : '',
        embedUrl: `https://www.youtube.com/embed/${item.videoId}?autoplay=1`
      }
    };
  }

  async function getFormats(itemId) {
    const item = await fetchWithRetry(`/api/v1/videos/${itemId}`);
    
    // Ҷудо кардани сифатҳои видеоӣ
    const videoFormats = (item.formatStreams || []).map(f => ({
      resolution: f.qualityLabel || f.quality,
      format: f.container ? f.container.toUpperCase() : 'MP4',
      sizeLabel: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : 'Сифати баланд',
      url: f.url
    }));

    // Ҷудо кардани аудиоҳо
    const audioFormats = (item.adaptiveFormats || [])
      .filter(f => f.type && f.type.startsWith('audio/'))
      .map(f => ({
        kbps: Math.round((f.bitrate || 128000) / 1000),
        format: 'MP3',
        sizeLabel: f.clength ? `${(parseInt(f.clength) / (1024 * 1024)).toFixed(1)} MB` : 'Аудио',
        url: f.url
      }));

    return {
      demo: false,
      audio: audioFormats.length > 0 ? audioFormats : [{ kbps: 128, format: 'MP3', sizeLabel: 'Стандарт', url: item.formatStreams[0]?.url }],
      video: videoFormats.length > 0 ? videoFormats : [{ resolution: '720p', format: 'MP4', sizeLabel: 'Стандарт', url: item.formatStreams[0]?.url }]
    };
  }

  async function download(job, onProgress) {
    // Боргирии воқеӣ тавассути Fetch Blob
    const response = await fetch(job.downloadUrl);
    if (!response.ok) throw new Error('Мушкилӣ дар боргирӣ');

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (total) {
        const percent = Math.round((loaded / total) * 100);
        const speed = (loaded / (1024 * 1024)).toFixed(1);
        onProgress({ percent, speedLabel: `${speed} MB` });
      } else {
        onProgress({ percent: 50, speedLabel: 'Боргирӣ...' });
      }
    }

    const blob = new Blob(chunks);
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, completed: true };
  }

  return { isDemo, search, analyzeUrl, getFormats, download };
})();
