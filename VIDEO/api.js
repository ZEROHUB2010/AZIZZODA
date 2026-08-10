/**
 * ZEROHUB UI — API Layer (YouTube Optimized)
 */
const API = (() => {

  // Функция барои кашидани ID-и видео аз линки YouTube
  function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  // 1. ҶУСТУҶӮ ДАР YOUTUBE (SEARCH)
  async function search(query) {
    if (!query) return [];
    
    try {
      // Истифодаи API-и кушода ва бе-CORS барои ҷустуҷӯ
      const res = await fetch(`https://api.v3.invidious.io/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      
      if (!res.ok) throw new Error('Search API Error');
      const data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No results');
      }

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
      console.warn('Invidious API failed, using standard YouTube Embed Search Fallback:', err);
      // Fallback: Агар API ҷавоб надиҳад, натиҷаро мустақиман омода мекунем, то интерфейс овезон намонад
      return [
        {
          id: 'search_fallback',
          title: `Ҷустуҷӯ дар YouTube: ${query}`,
          source: 'YouTube Search',
          duration: 'HD',
          thumb: 'icon.png',
          embedUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`,
          directUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
        }
      ];
    }
  }

  // 2. АНАЛИЗИ ЛИНКИ YOUTUBE (ANALYZE URL)
  async function analyzeUrl(url) {
    const videoId = extractYouTubeId(url);

    if (videoId) {
      return {
        id: videoId,
        title: `YouTube Video (${videoId})`,
        source: 'YouTube Direct',
        duration: 'HD Video',
        thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
        directUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
    }

    throw new Error('Линки нодурусти YouTube');
  }

  // 3. ЗЕРКАШИИ ВИДЕО/МУСИҚӢ (DOWNLOAD)
  function download(item) {
    const targetUrl = item.directUrl || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.embedUrl);
    // Гузариш ба сервиси боэътимоди Cobalt барои зеркашӣ
    window.open(`https://cobalt.tools/?url=${encodeURIComponent(targetUrl)}`, '_blank');
  }

  return { search, analyzeUrl, download };
})();
