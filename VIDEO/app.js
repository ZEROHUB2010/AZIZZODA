/**
 * ZEROHUB UI — Application Logic (Updated with Real Video Player)
 */
(() => {
  'use strict';

  /* SPLASH SCREEN */
  const splash = document.getElementById('splash');
  const splashVideo = document.getElementById('splash-video');
  const splashSkip = document.getElementById('splash-skip');
  const appRoot = document.getElementById('app');
  let splashClosed = false;

  function closeSplash() {
    if (splashClosed) return;
    splashClosed = true;
    if (splash) splash.classList.add('is-hidden');
    if (appRoot) appRoot.hidden = false;
    setTimeout(() => { if (splash) splash.remove(); }, 650);
    initApp();
  }

  if (splashVideo) {
    splashVideo.addEventListener('ended', closeSplash);
    splashVideo.addEventListener('error', closeSplash);
  }
  if (splashSkip) splashSkip.addEventListener('click', closeSplash);
  setTimeout(() => { if (!splashClosed) closeSplash(); }, 3000);

  /* TOASTS */
  const toastContainer = document.getElementById('toast-container');
  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', () => el.remove());
    }, 2600);
  }

  /* NAVIGATION */
  const navItems = document.querySelectorAll('.navbar__item');
  const screens = { home: document.getElementById('screen-home'), downloads: document.getElementById('screen-downloads'), history: document.getElementById('screen-history') };

  function switchScreen(name) {
    Object.entries(screens).forEach(([key, el]) => { if(el) el.hidden = key !== name; });
    navItems.forEach(btn => btn.classList.toggle('is-active', btn.dataset.nav === name));
    if (name === 'downloads') renderDownloads();
    if (name === 'history') renderHistory();
  }
  navItems.forEach(btn => btn.addEventListener('click', () => switchScreen(btn.dataset.nav)));

  /* SEARCH & ANALYZE */
  const urlInput = document.getElementById('url-input');
  const searchInput = document.getElementById('search-input');
  const resultsList = document.getElementById('results-list');
  const homeEmpty = document.getElementById('home-empty');

  document.getElementById('btn-paste')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { urlInput.value = text; toast('Ссылка скопирована'); }
    } catch { toast('Буфер хориҷ карда нашуд'); }
  });

  document.getElementById('btn-analyze')?.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) { toast('Линкаро ворид кунед'); return; }
    const btn = document.getElementById('btn-analyze');
    btn.disabled = true; btn.textContent = 'Анализ…';
    try {
      const res = await API.analyzeUrl(url);
      renderResults([res.result]);
      toast('Видео пайдо шуд');
    } catch(e) {
      toast(e.message || 'Хатогӣ дар сайт');
    } finally {
      btn.disabled = false; btn.textContent = 'Анализировать';
    }
  });

  document.getElementById('btn-search')?.addEventListener('click', async () => {
    const q = searchInput.value.trim();
    if (!q) return;
    const btn = document.getElementById('btn-search');
    btn.disabled = true; btn.textContent = 'Ҷустуҷӯ…';
    try {
      const res = await API.search(q);
      renderResults(res.results);
      toast('Ҷустуҷӯ ба охир расид');
    } catch {
      toast('Хатогӣ дар ҷустуҷӯ');
    } finally {
      btn.disabled = false; btn.textContent = 'Найти';
    }
  });

  function renderResults(items) {
    resultsList.innerHTML = '';
    items.forEach(item => resultsList.appendChild(buildResultCard(item)));
    resultsList.hidden = items.length === 0;
    if(homeEmpty) homeEmpty.hidden = items.length !== 0;
  }

  function buildResultCard(item) {
    const card = document.createElement('div');
    card.className = 'result-card glass';
    card.innerHTML = `
      <div class="result-card__thumb">
        ${item.thumb ? `<img src="${item.thumb}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <span class="result-card__type-badge">MP4</span>
      </div>
      <div class="result-card__info">
        <p class="result-card__name">${escapeHtml(item.title)}</p>
        <div class="result-card__meta"><span>${escapeHtml(item.source)}</span><span>${escapeHtml(item.duration)}</span></div>
        <div class="result-card__actions">
          <button class="pill-btn pill-btn--play" data-action="play">▶ Воспроизвести</button>
          <button class="pill-btn pill-btn--download" data-action="download">↓ Скачать</button>
        </div>
      </div>`;

    card.querySelector('[data-action="play"]').addEventListener('click', () => openRealPlayer(item));
    card.querySelector('[data-action="download"]').addEventListener('click', () => openQualityModal(item));
    return card;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  /* QUALITY MODAL & DOWNLOAD */
  const qualityOverlay = document.getElementById('quality-overlay');
  const audioGrid = document.getElementById('audio-quality-grid');
  const videoGrid = document.getElementById('video-quality-grid');
  const qualityConfirm = document.getElementById('quality-confirm');
  let currentItem = null;
  let selectedFormat = null;

  async function openQualityModal(item) {
    currentItem = item;
    selectedFormat = null;
    qualityConfirm.disabled = true;
    audioGrid.innerHTML = '<p class="quality-section__label">Форматҳо боргирӣ мешаванд...</p>';
    videoGrid.innerHTML = '';
    qualityOverlay.hidden = false;

    try {
      const formats = await API.getFormats(item.id);
      audioGrid.innerHTML = '';
      formats.audio.forEach(f => audioGrid.appendChild(buildQualityOption({
        label: `${f.kbps} kbps`, meta: `${f.format} · ${f.sizeLabel}`,
        payload: { kind: 'audio', quality: `${f.kbps}kbps`, format: f.format, url: f.url }
      })));
      formats.video.forEach(f => videoGrid.appendChild(buildQualityOption({
        label: f.resolution, meta: `${f.format} · ${f.sizeLabel}`,
        payload: { kind: 'video', quality: f.resolution, format: f.format, url: f.url }
      })));
    } catch {
      toast('Хато дар гирифтани сифатҳо');
    }
  }

  function buildQualityOption({ label, meta, payload }) {
    const btn = document.createElement('button');
    btn.className = 'quality-option';
    btn.innerHTML = `<span class="quality-option__label">${label}</span><span class="quality-option__meta">${meta}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quality-option.is-selected').forEach(o => o.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedFormat = payload;
      qualityConfirm.disabled = false;
    });
    return btn;
  }

  document.getElementById('quality-close')?.addEventListener('click', () => qualityOverlay.hidden = true);

  qualityConfirm?.addEventListener('click', () => {
    if (!currentItem || !selectedFormat) return;
    qualityOverlay.hidden = true;
    startDownload(currentItem, selectedFormat);
  });

  /* PLAYER MODAL (REAL EMBED VIDEO) */
  const playerOverlay = document.getElementById('player-overlay');
  const playerBody = document.getElementById('player-body');
  const playerTitle = document.getElementById('player-title');

  function openRealPlayer(item) {
    if (playerTitle) playerTitle.textContent = item.title;
    playerBody.innerHTML = '';

    if (item.embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = item.embedUrl;
      iframe.style.width = '100%';
      iframe.style.height = '240px';
      iframe.style.borderRadius = '16px';
      iframe.style.border = 'none';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      playerBody.appendChild(iframe);
    } else if (item.blobUrl) {
      const video = document.createElement('video');
      video.src = item.blobUrl;
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.borderRadius = '16px';
      playerBody.appendChild(video);
    }

    playerOverlay.hidden = false;
  }

  document.getElementById('player-close')?.addEventListener('click', () => {
    playerBody.innerHTML = '';
    playerOverlay.hidden = true;
  });

  /* DOWNLOAD MANAGER & INDEXEDDB */
  async function startDownload(item, format) {
    const id = 'dl-' + Date.now();
    const record = {
      id, title: item.title, type: format.kind, format: format.format,
      quality: format.quality, status: 'downloading', percent: 0,
      downloadUrl: format.url, createdAt: Date.now()
    };
    await ZDB.put(record);
    toast('Боргирӣ оғоз шуд');
    switchScreen('downloads');
    
    try {
      const result = await API.download(record, async ({ percent, speedLabel }) => {
        record.percent = percent;
        record.speedLabel = speedLabel;
        await ZDB.put(record);
        renderDownloads();
      });

      record.status = 'done';
      record.percent = 100;
      record.blobUrl = result.blobUrl;
      record.completedAt = Date.now();
      await ZDB.put(record);
      toast('Боргирӣ ба охир расид!');
    } catch {
      record.status = 'error';
      await ZDB.put(record);
      toast('Хато дар боргирӣ');
    }
    renderDownloads();
  }

  async function renderDownloads() {
    const downloadsList = document.getElementById('downloads-list');
    const downloadsEmpty = document.getElementById('downloads-empty');
    if (!downloadsList) return;
    const all = await ZDB.all();
    const active = all.filter(r => r.status !== 'done');
    downloadsList.innerHTML = '';
    active.forEach(rec => downloadsList.appendChild(buildDlCard(rec)));
    if(downloadsEmpty) downloadsEmpty.hidden = active.length !== 0;
  }

  async function renderHistory() {
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    if (!historyList) return;
    const all = await ZDB.all();
    const done = all.filter(r => r.status === 'done');
    historyList.innerHTML = '';
    done.forEach(rec => historyList.appendChild(buildDlCard(rec, true)));
    if(historyEmpty) historyEmpty.hidden = done.length !== 0;
  }

  function buildDlCard(rec, isHistory = false) {
    const card = document.createElement('div');
    card.className = 'dl-card glass';
    card.innerHTML = `
      <div class="dl-card__top">
        <div class="dl-card__info">
          <p class="dl-card__name">${escapeHtml(rec.title)}</p>
          <p class="dl-card__meta">${rec.quality} • ${rec.format}</p>
        </div>
      </div>
      ${!isHistory ? `
        <div class="progress-track"><div class="progress-fill" style="width:${rec.percent}%"></div></div>
        <div class="dl-card__stats"><span>${rec.percent}%</span></div>
      ` : ''}
      <div class="dl-card__actions" style="margin-top:10px;"></div>`;

    const actions = card.querySelector('.dl-card__actions');
    if (isHistory || rec.status === 'done') {
      const btnPlay = document.createElement('button');
      btnPlay.className = 'btn btn--primary';
      btnPlay.textContent = '▶ Тамошо кардан';
      btnPlay.addEventListener('click', () => openRealPlayer(rec));
      actions.appendChild(btnPlay);
    }
    return card;
  }

  function initApp() { switchScreen('home'); }
})();
