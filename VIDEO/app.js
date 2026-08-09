/**
 * ZEROHUB UI — Main App Script (Fully Integrated with API)
 */
(() => {
  'use strict';

  // DASHBOARD elements
  const searchInput = document.getElementById('search-input');
  const urlInput = document.getElementById('url-input');
  const btnSearch = document.getElementById('btn-search');
  const btnAnalyze = document.getElementById('btn-analyze');
  const resultsList = document.getElementById('results-list');
  const homeEmpty = document.getElementById('home-empty');

  // PLAYER MODAL elements
  const playerOverlay = document.getElementById('player-overlay');
  const playerBody = document.getElementById('player-body');
  const playerTitle = document.getElementById('player-title');
  const playerClose = document.getElementById('player-close');

  // TOAST ALERT
  function toast(msg) {
    const toastBox = document.getElementById('toast-container');
    if (!toastBox) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastBox.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // 1. ИҶРОИ ҶУСТУҶӮ
  if (btnSearch) {
    btnSearch.addEventListener('click', async () => {
      const q = searchInput ? searchInput.value.trim() : '';
      if (!q) { toast('Калимаро ворид кунед!'); return; }

      btnSearch.disabled = true;
      btnSearch.textContent = 'Ҷустуҷӯ...';

      try {
        const res = await API.search(q);
        renderResults(res.results);
        toast('Натиҷаҳо пайдо шуданд');
      } catch (e) {
        toast('Хатогӣ рӯй дод');
      } finally {
        btnSearch.disabled = false;
        btnSearch.textContent = 'Найти';
      }
    });
  }

  // 2. ИҶРОИ АНАЛИЗИ ЛИНК
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', async () => {
      const url = urlInput ? urlInput.value.trim() : '';
      if (!url) { toast('Линкаро гузоред!'); return; }

      btnAnalyze.disabled = true;
      btnAnalyze.textContent = 'Анализ...';

      try {
        const res = await API.analyzeUrl(url);
        renderResults([res.result]);
        toast('Линк таҳлил шуд');
      } catch (e) {
        toast('Линки нодуруст');
      } finally {
        btnAnalyze.disabled = false;
        btnAnalyze.textContent = 'Анализировать';
      }
    });
  }

  // 3. НАМОИШИ КАРТОЧКАИ ВИДЕОҲО
  function renderResults(items) {
    if (!resultsList) return;
    resultsList.innerHTML = '';

    if (!items || items.length === 0) {
      if (homeEmpty) homeEmpty.hidden = false;
      resultsList.hidden = true;
      return;
    }

    if (homeEmpty) homeEmpty.hidden = true;
    resultsList.hidden = false;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'result-card glass';
      card.style.cssText = 'padding:12px; margin-bottom:12px; border-radius:12px; background:rgba(255,255,255,0.05); display:flex; gap:12px; align-items:center;';
      
      card.innerHTML = `
        <img src="${item.thumb || 'https://via.placeholder.com/100'}" style="width:90px; height:60px; object-fit:cover; border-radius:8px;">
        <div style="flex:1;">
          <h4 style="margin:0 0 6px 0; font-size:14px; color:#fff;">${item.title}</h4>
          <span style="font-size:12px; color:#aaa;">${item.source} • ${item.duration}</span>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button class="play-btn" style="padding:6px 12px; background:#e50914; color:#fff; border:none; border-radius:6px; cursor:pointer;">▶ Тамошо</button>
            <button class="dl-btn" style="padding:6px 12px; background:#333; color:#fff; border:none; border-radius:6px; cursor:pointer;">↓ Скачать</button>
          </div>
        </div>
      `;

      card.querySelector('.play-btn').addEventListener('click', () => openPlayer(item));
      card.querySelector('.dl-btn').addEventListener('click', () => startDownload(item));

      resultsList.appendChild(card);
    });
  }

  // 4. ПЛЕЕРИ ВИДЕО
  function openPlayer(item) {
    if (!playerOverlay || !playerBody) return;
    if (playerTitle) playerTitle.textContent = item.title;
    
    playerBody.innerHTML = `
      <iframe src="${item.embedUrl}" style="width:100%; height:250px; border:none; border-radius:12px;" allowfullscreen autoplay></iframe>
    `;

    playerOverlay.hidden = false;
    playerOverlay.style.display = 'flex';
  }

  if (playerClose) {
    playerClose.addEventListener('click', () => {
      if (playerOverlay) {
        playerOverlay.hidden = true;
        playerOverlay.style.display = 'none';
      }
      if (playerBody) playerBody.innerHTML = '';
    });
  }

  // 5. БОРГИРИИ ВИДЕО
  async function startDownload(item) {
    toast('Форматҳо гирифта мешаванд...');
    const formats = await API.getFormats(item);
    if (formats.video && formats.video[0]) {
      API.download({ downloadUrl: formats.video[0].url }, (p) => {
        toast(p.speedLabel);
      });
    }
  }

})();
