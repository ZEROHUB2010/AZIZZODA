/**
 * ZEROHUB UI — API Layer (Powered by Private yt-dlp Server)
 */
const SERVER_URL = "https://zerohub-bacend.onrender.com"; // Линки сервери Render-и ту

const API = (() => {

  // 1. Ҷустуҷӯ дар YouTube
  async function search(query) {
    if (!query) return [];
    
    try {
      const res = await fetch(`https://api.v3.invidious.io/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      if (!res.ok) throw new Error('Search API Error');
      const data = await res.json();
      
      return data.slice(0, 10).map(item => ({
        id: item.videoId,
        title: item.title || 'YouTube Video',
        source: 'YouTube',
        duration: item.lengthSeconds ? `${Math.floor(item.lengthSeconds / 60)}:${(item.lengthSeconds % 60).toString().padStart(2, '0')}` : 'HD',
        thumb: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${item.videoId}?autoplay=1`,
        directUrl: `https://www.youtube.com/watch?v=${item.videoId}`
      }));
    } catch (err) {
      console.warn('Fallback Search:', err);
      return [];
    }
  }

  // 2. Таҳлил ва кашидани линки мустақим тавассути yt-dlp
  async function analyzeUrl(url) {
    const res = await fetch(`${SERVER_URL}/api/get-download-link?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Сервер видеоро коркард карда натавонист');
    
    const data = await res.json();
    return {
      id: 'ytdlp_res',
      title: data.title,
      source: 'yt-dlp Engine',
      duration: data.duration,
      thumb: data.thumbnail,
      embedUrl: url.replace('watch?v=', 'embed/'),
      downloadUrl: data.download_url // Линки мустақими файл
    };
  }

  // 3. Зеркашии мустақим
  function download(item) {
    if (item.downloadUrl) {
      window.open(item.downloadUrl, '_blank');
    } else if (item.directUrl) {
      window.open(`${SERVER_URL}/api/get-download-link?url=${encodeURIComponent(item.directUrl)}`, '_blank');
    }
  }

  return { search, analyzeUrl, download };
})();
