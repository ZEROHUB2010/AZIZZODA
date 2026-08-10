/**
 * ZEROHUB UI — Main App Logic
 */
document.addEventListener('DOMContentLoaded', () => {

  // 1. СИСТЕМАИ ОГОҲИҲО (TOAST NOTIFICATION)
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
  }

  // 2. УНСУРҲОИ ИНТЕРФЕЙС
  const btnSearch = document.getElementById('btn-search');
  const searchInput = document.getElementById('search-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const urlInput = document.getElementById('url-input');
  const resultsList = document.getElementById('results-list');

  // ПЛЕЕРИ ВИДЕО (MODAL PLAYER)
  const modal = document.getElementById('player-modal');
  const closeModal = document.getElementById('close-modal');
  const modalBody = document.getElementById('modal-player-body');

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      modal.style.display = 'none';
      modalBody.innerHTML = ''; // Тоза кардани iframe барои қатъи видео
    });
  }

  // 3. РЕНДЕРИНГИ КАРТОЧКАҲОИ НАТИҶА
  function renderResults(items) {
    resultsList.innerHTML = '';
    if (!items || items.length === 0) {
      resultsList.innerHTML = '<div style="text-align:center; color:#aaa; padding: 20px;">Натиҷае пайдо нашуд</div>';
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'result-item';
      el.innerHTML = `
        <img src="${item.thumb}" onerror="this.src='icon.png'">
        <div class="result-info">
          <div class="result-title">${item.title}</div>
          <div class="result-meta">${item.source} • ${item.duration}</div>
          <div class="result-actions">
            <button class="action-btn btn-play">▶ Тамошо</button>
            <button class="action-btn btn-dl">↓ Скачать</button>
          </div>
        </div>
      `;

      // Пайваст кардани тугмаи "Тамошо"
      el.querySelector('.btn-play').addEventListener('click', () => openPlayer(item));

      // Пайваст кардани тугмаи "Скачать" ба yt-dlp
      el.querySelector('.btn-dl').addEventListener('click', async (e) => {
        const targetBtn = e.currentTarget;
        const originalText = targetBtn.textContent;
        
        try {
          targetBtn.textContent = '⏱...';
          targetBtn.disabled = true;
          toast('Линки зеркашӣ омода шуда истодааст...');
          await window.API.download(item);
        } catch (err) {
          console.error(err);
          toast('Хатогӣ ҳангоми кашидани линк');
        } finally {
          targetBtn.textContent = originalText;
          targetBtn.disabled = false;
        }
      });

      resultsList.appendChild(el);
    });
  }

  // 4. КУШОДАНИ ПЛЕЕРИ ВИДЕО
  function openPlayer(item) {
    modalBody.innerHTML = `<iframe src="${item.embedUrl}" allowfullscreen autoplay allow="autoplay"></iframe>`;
    modal.style.display = 'flex';
  }

  // 5. АМАЛИЁТИ ҶУСТУҶӮ (SEARCH)
  if (btnSearch) {
    btnSearch.addEventListener('click', async () => {
      const q = searchInput.value.trim();
      if (!q) { 
        toast('Лутфан номи видеоро ворид кунед!'); 
        return; 
      }

      btnSearch.disabled = true;
      btnSearch.textContent = 'Ҷустуҷӯ...';
      resultsList.innerHTML = '<div style="text-align:center; color:#aaa; padding: 20px;">Дар ҳоли ҷустуҷӯ...</div>';

      try {
        const results = await window.API.search(q);
        renderResults(results);
        toast('Натиҷаҳо пайдо шуданд!');
      } catch (err) {
        console.error(err);
        toast('Хатогӣ ҳангоми ҷустуҷӯ');
        resultsList.innerHTML = '<div style="text-align:center; color:#ff4b2b; padding: 20px;">Хатогӣ рух дод, дубора санҷед.</div>';
      } finally {
        btnSearch.disabled = false;
        btnSearch.textContent = 'Ҷустуҷӯ';
      }
    });
  }

  // 6. АМАЛИЁТИ АНАЛИЗИ ЛИНК (ANALYZE URL)
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) { 
        toast('Лутфан линки YouTube-ро гузоред!'); 
        return; 
      }

      btnAnalyze.disabled = true;
      btnAnalyze.textContent = 'Анализ...';

      try {
        const result = await window.API.analyzeUrl(url);
        renderResults([result]);
        toast('Линк тавассути yt-dlp таҳлил шуд!');
      } catch (err) {
        console.error(err);
        toast('Хатогӣ: Серверро тафтиш кунед');
      } finally {
        btnAnalyze.disabled = false;
        btnAnalyze.textContent = 'Анализ';
      }
    });
  }

});
