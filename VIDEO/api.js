/**
 * ZEROHUB UI — Robust Standardized API Layer
 */
const API = (() => {

  function isDemo() { return false; }

  function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  // 1. ҶУСТУҶӮ
  async function search(query) {
    if (!query) return { demo: false, results: [] };
    
    try {
      const res = await fetch(`https://api.v3.invidious.io/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const results = (data || []).slice(0, 12).map(item => ({
        id: item.videoId,
        title: item.title || 'Видео',
        source: 'YouTube',
        duration: item.lengthSeconds ? `${Math.floor(item.lengthSeconds / 60)}:${(item.lengthSeconds % 60).toString().padStart(2, '0')}` : '00:00',
        thumb: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${item.videoId}?autoplay=1`,
        directUrl: `https://www.youtube.com/watch?v=${item.videoId}`
      }));

      return { demo: false, results };
    } catch (err) {
      // Алтернатива дар сурати хатогии CORS
      return {
        demo: false,
        results: [
          {
            id: 'search_fallback',
            title: `Ҷустуҷӯ дар YouTube: ${query}`,
            source: 'YouTube Web',
            duration: 'HD',
            thumb: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            embedUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`,
            directUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
          }
        ]
      };
    }
  }

  // 2. АНАЛИЗИ ЛИНК
  async function analyzeUrl(url) {
    const videoId = extractYouTubeId(url);

    if (videoId) {
      return {
        demo: false,
        result: {
          id: videoId,
          title: `Видеои YouTube (${videoId})`,
          source: 'YouTube',
          duration: 'Media',
          thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
          directUrl: url
        }
      };
    }

    return {
      demo: false,
      result: {
        id: 'web_media',
        title: 'Видео аз линк',
        source: 'Web Link',
        duration: 'Media',
        thumb: '',
        embedUrl: url,
        directUrl: url
      }
    };
  }

  // 3. ФОРМАТҲОИ СКАЧАТЬ
  async function getFormats(item) {
    const videoUrl = item.directUrl || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.embedUrl);
    const downloadLink = `https://cobalt.tools/?url=${encodeURIComponent(videoUrl)}`;

    return {
      demo: false,
      audio: [
        { kbps: 320, format: 'MP3', sizeLabel: 'Аудио MP3', url: downloadLink }
      ],
      video: [
        { resolution: '720p HD', format: 'MP4', sizeLabel: 'Видео HD', url: downloadLink }
      ]
    };
  }

  // 4. СКАЧАТЬ
  async function download(job, onProgress) {
    onProgress({ percent: 50, speedLabel: 'Омодасозӣ...' });
    setTimeout(() => {
      onProgress({ percent: 100, speedLabel: 'Тайёр!' });
      window.open(job.downloadUrl, '_blank');
    }, 800);

    return { completed: true };
  }

  return { isDemo, search, analyzeUrl, getFormats, download };
})();
