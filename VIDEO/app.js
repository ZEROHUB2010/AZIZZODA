/**
 * ZEROHUB UI — main application logic
 * Wires together the DOM, the API layer (api.js) and IndexedDB (db.js).
 */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     SPLASH SCREEN
  --------------------------------------------------------- */
  const splash = document.getElementById('splash');
  const splashVideo = document.getElementById('splash-video');
  const splashSkip = document.getElementById('splash-skip');
  const appRoot = document.getElementById('app');
  let splashClosed = false;

  function closeSplash() {
    if (splashClosed) return;
    splashClosed = true;
    splash.classList.add('is-hidden');
    appRoot.hidden = false;
    setTimeout(() => { splash.remove(); }, 650);
    initApp();
  }

  splashVideo.addEventListener('ended', closeSplash);
  splashVideo.addEventListener('error', () => closeSplash());
  splashSkip.addEventListener('click', closeSplash);
  // Safety net: if the intro asset is missing/slow, never trap the user on splash.
  setTimeout(() => { if (!splashClosed) closeSplash(); }, 4500);
  // If the video never even starts loading (e.g. asset absent), bail sooner.
  splashVideo.addEventListener('loadeddata', () => {}, { once: true });
  setTimeout(() => {
    if (!splashClosed && splashVideo.readyState === 0) closeSplash();
  }, 1800);

  /* ---------------------------------------------------------
     TOASTS
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     RIPPLE MICRO-INTERACTION
  --------------------------------------------------------- */
  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('.btn, .pill-btn, .icon-btn, .navbar__item, .filter-chip');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    target.style.position = target.style.position || 'relative';
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */
  const navItems = document.querySelectorAll('.navbar__item');
  const screens = { home: document.getElementById('screen-home'), downloads: document.getElementById('screen-downloads'), history: document.getElementById('screen-history') };

  function switchScreen(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    navItems.forEach(btn => btn.classList.toggle('is-active', btn.dataset.nav === name));
    if (name === 'downloads') renderDownloads();
    if (name === 'history') renderHistory();
  }
  navItems.forEach(btn => btn.addEventListener('click', () => switchScreen(btn.dataset.nav)));

  document.getElementById('btn-settings').addEventListener('click', () => {
    toast(API.isDemo() ? 'Демонстрационный режим включён' : 'Подключён бэкенд ZEROHUB UI');
  });

  /* ---------------------------------------------------------
     HOME — URL ANALYZER
  --------------------------------------------------------- */
  const urlInput = document.getElementById('url-input');
  const searchInput = document.getElementById('search-input');
  const resultsList = document.getElementById('results-list');
  const homeEmpty = document.getElementById('home-empty');

  document.getElementById('btn-paste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { urlInput.value = text; toast('Ссылка скопирована'); }
    } catch {
      toast('Не удалось получить доступ к буферу обмена');
    }
  });

  document.getElementById('btn-analyze').addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) { toast('Вставьте ссылку для анализа'); return; }
    const btn = document.getElementById('btn-analyze');
    btn.disabled = true; btn.textContent = 'Анализ…';
    try {
      const res = await API.analyzeUrl(url);
      renderResults([res.result], res.demo);
      toast('Анализ завершён');
    } catch {
      toast('Произошла ошибка');
    } finally {
      btn.disabled = false; btn.textContent = 'Анализировать';
    }
  });

  document.getElementById('btn-search').addEventListener('click', async () => {
    const q = searchInput.value.trim();
    const btn = document.getElementById('btn-search');
    btn.disabled = true; btn.textContent = 'Поиск…';
    try {
      const res = await API.search(q);
      renderResults(res.results, res.demo);
      toast('Поиск завершён');
    } catch {
      toast('Произошла ошибка');
    } finally {
      btn.disabled = false; btn.textContent = 'Найти';
    }
  });

  function typeIcon(type) {
    return type === 'audio'
      ? '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>';
  }

  function renderResults(items, demo) {
    resultsList.innerHTML = '';
    if (demo) {
      const tag = document.createElement('div');
      tag.className = 'demo-tag';
      tag.textContent = 'Демонстрационный режим';
      resultsList.appendChild(tag);
    }
    items.forEach(item => resultsList.appendChild(buildResultCard(item)));
    resultsList.hidden = items.length === 0;
    homeEmpty.hidden = items.length !== 0;
  }

  function buildResultCard(item) {
    const card = document.createElement('div');
    card.className = 'result-card glass';
    card.innerHTML = `
      <div class="result-card__thumb">${typeIcon(item.type)}<span class="result-card__type-badge">${item.type === 'audio' ? 'MP3' : 'MP4'}</span></div>
      <div class="result-card__info">
        <p class="result-card__name">${escapeHtml(item.title)}</p>
        <div class="result-card__meta"><span>${escapeHtml(item.source)}</span><span>${escapeHtml(item.duration)}</span></div>
        <div class="result-card__actions">
          <button class="pill-btn pill-btn--play" data-action="play">▶ Воспроизвести</button>
          <button class="pill-btn pill-btn--download" data-action="download">↓ Скачать</button>
        </div>
      </div>`;
    card.querySelector('[data-action="play"]').addEventListener('click', () => openPlayer(item, null));
    card.querySelector('[data-action="download"]').addEventListener('click', () => openQualityModal(item));
    return card;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  /* ---------------------------------------------------------
     QUALITY MODAL
  --------------------------------------------------------- */
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
    audioGrid.innerHTML = '<p class="quality-section__label">Загрузка форматов…</p>';
    videoGrid.innerHTML = '';
    showOverlay(qualityOverlay);
    const formats = await API.getFormats(item.id);
    audioGrid.innerHTML = '';
    formats.audio.forEach(f => audioGrid.appendChild(buildQualityOption({
      key: `audio-${f.kbps}`, label: `${f.kbps} kbps`, meta: `${f.format} · ${f.sizeLabel}`,
      payload: { kind: 'audio', quality: `${f.kbps}kbps`, format: f.format }
    })));
    formats.video.forEach(f => videoGrid.appendChild(buildQualityOption({
      key: `video-${f.resolution}`, label: f.resolution, meta: `${f.format} · ${f.sizeLabel}`,
      payload: { kind: 'video', quality: f.resolution, format: f.format }
    })));
  }

  function buildQualityOption({ key, label, meta, payload }) {
    const btn = document.createElement('button');
    btn.className = 'quality-option';
    btn.dataset.key = key;
    btn.innerHTML = `<span class="quality-option__label">${label}</span><span class="quality-option__meta">${meta}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quality-option.is-selected').forEach(o => o.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedFormat = payload;
      qualityConfirm.disabled = false;
    });
    return btn;
  }

  document.getElementById('quality-close').addEventListener('click', () => hideOverlay(qualityOverlay));
  qualityOverlay.addEventListener('click', (e) => { if (e.target === qualityOverlay) hideOverlay(qualityOverlay); });

  qualityConfirm.addEventListener('click', () => {
    if (!currentItem || !selectedFormat) return;
    hideOverlay(qualityOverlay);
    startDownload(currentItem, selectedFormat);
  });

  /* ---------------------------------------------------------
     PLAYER MODAL
  --------------------------------------------------------- */
  const playerOverlay = document.getElementById('player-overlay');
  const playerBody = document.getElementById('player-body');
  const playerTitle = document.getElementById('player-title');

  function openPlayer(item, blobUrl) {
    playerTitle.textContent = item.title;
    playerBody.innerHTML = '';
    if (blobUrl) {
      const el = document.createElement(item.type === 'audio' ? 'audio' : 'video');
      el.src = blobUrl;
      el.controls = true;
      el.playsInline = true;
      playerBody.appendChild(el);
    } else {
      const msg = document.createElement('p');
      msg.className = 'player-unsupported';
      msg.textContent = 'Этот источник не поддерживает встроенное воспроизведение.';
      playerBody.appendChild(msg);
    }
    showOverlay(playerOverlay);
  }
  document.getElementById('player-close').addEventListener('click', () => {
    playerBody.querySelectorAll('video,audio').forEach(m => m.pause());
    hideOverlay(playerOverlay);
  });
  playerOverlay.addEventListener('click', (e) => { if (e.target === playerOverlay) hideOverlay(playerOverlay); });

  function showOverlay(el) { el.hidden = false; }
  function hideOverlay(el) {
    el.classList.add('is-closing');
    setTimeout(() => { el.hidden = true; el.classList.remove('is-closing'); }, 200);
  }

  /* ---------------------------------------------------------
     DOWNLOAD MANAGER
  --------------------------------------------------------- */
  const downloadsList = document.getElementById('downloads-list');
  const downloadsEmpty = document.getElementById('downloads-empty');
  const downloadsBadge = document.getElementById('downloads-badge');
  const jobs = new Map(); // id -> live job (with pause/cancel handles)

  const STATUS_LABEL = {
    queued: 'В очереди', analyzing: 'Анализ', downloading: 'Загрузка',
    paused: 'Приостановлено', error: 'Ошибка', done: 'Завершено', waiting: 'Ожидание'
  };

  async function startDownload(item, format) {
    const id = 'dl-' + Date.now();
    const record = {
      id,
      title: item.title,
      type: format.kind,
      format: format.format,
      quality: format.quality,
      status: 'queued',
      percent: 0,
      speedLabel: '',
      sizeLabel: 'Размер неизвестен',
      createdAt: Date.now(),
      demo: API.isDemo()
    };
    await ZDB.put(record);
    toast('Загрузка началась');
    switchScreen('downloads');
    updateBadge();
    runDownload(record);
  }

  async function runDownload(record) {
    record.status = 'downloading';
    await ZDB.put(record);
    renderDownloads();
    const jobHandle = {};
    jobs.set(record.id, jobHandle);
    try {
      await API.download(jobHandle, async ({ percent, speedLabel }) => {
        const current = await ZDB.get(record.id);
        if (!current || current.status === 'cancelled') return;
        current.percent = percent;
        current.speedLabel = speedLabel;
        await ZDB.put(current);
        renderDownloads();
      });
      const finished = await ZDB.get(record.id);
      if (finished && finished.status !== 'cancelled') {
        finished.status = 'done';
        finished.percent = 100;
        finished.completedAt = Date.now();
        await ZDB.put(finished);
        toast('Загрузка завершена');
      }
    } catch {
      const failed = await ZDB.get(record.id);
      if (failed) { failed.status = 'error'; await ZDB.put(failed); }
      toast('Не удалось скачать файл');
    }
    jobs.delete(record.id);
    updateBadge();
    renderDownloads();
  }

  async function pauseDownload(id) {
    const job = jobs.get(id);
    if (job && job._pause) job._pause();
    jobs.delete(id);
    const rec = await ZDB.get(id);
    if (rec) { rec.status = 'paused'; await ZDB.put(rec); }
    renderDownloads();
  }

  async function resumeDownload(id) {
    const rec = await ZDB.get(id);
    if (!rec) return;
    runDownload(rec);
  }

  async function cancelDownload(id) {
    const job = jobs.get(id);
    if (job && job._cancel) job._cancel();
    jobs.delete(id);
    const rec = await ZDB.get(id);
    if (rec) { rec.status = 'cancelled'; await ZDB.put(rec); }
    renderDownloads();
    updateBadge();
  }

  async function retryDownload(id) {
    const rec = await ZDB.get(id);
    if (!rec) return;
    rec.percent = 0; rec.status = 'queued';
    await ZDB.put(rec);
    runDownload(rec);
  }

  async function deleteRecord(id) {
    await ZDB.delete(id);
    renderDownloads();
    renderHistory();
    updateBadge();
    toast('Файл удалён');
  }

  async function updateBadge() {
    const all = await ZDB.all();
    const active = all.filter(r => ['queued', 'downloading', 'analyzing'].includes(r.status)).length;
    downloadsBadge.hidden = active === 0;
    downloadsBadge.textContent = active;
  }

  function buildDownloadCard(rec) {
    const card = document.createElement('div');
    card.className = 'dl-card glass';
    const meta = `${rec.quality} • ${rec.format}`;
    card.innerHTML = `
      <div class="dl-card__top">
        <div class="dl-card__thumb">${typeIcon(rec.type)}</div>
        <div class="dl-card__info">
          <p class="dl-card__name">${escapeHtml(rec.title)}</p>
          <p class="dl-card__meta">${meta}</p>
        </div>
        <span class="dl-card__status status--${rec.status}">${STATUS_LABEL[rec.status] || rec.status}</span>
      </div>
      ${rec.status !== 'error' ? `
      <div class="progress-track"><div class="progress-fill" style="width:${rec.percent || 0}%"></div></div>
      <div class="dl-card__stats"><span>${(rec.percent||0)}%</span><span>${rec.speedLabel || ''}</span></div>` :
      `<p class="dl-card__meta" style="margin-top:10px;">Не удалось скачать файл</p>`}
      <div class="dl-card__actions"></div>`;

    const actions = card.querySelector('.dl-card__actions');
    if (rec.status === 'downloading') {
      actions.appendChild(makeBtn('Пауза', 'btn--secondary', () => pauseDownload(rec.id)));
      actions.appendChild(makeBtn('Отмена', 'btn--danger', () => cancelDownload(rec.id)));
    } else if (rec.status === 'paused') {
      actions.appendChild(makeBtn('Продолжить', 'btn--primary', () => resumeDownload(rec.id)));
      actions.appendChild(makeBtn('Отмена', 'btn--danger', () => cancelDownload(rec.id)));
    } else if (rec.status === 'error') {
      actions.appendChild(makeBtn('Повторить', 'btn--primary', () => retryDownload(rec.id)));
      actions.appendChild(makeBtn('Удалить', 'btn--ghost', () => deleteRecord(rec.id)));
    } else if (rec.status === 'done') {
      actions.appendChild(makeBtn('Открыть', 'btn--secondary', () => openPlayer(rec, null)));
      actions.appendChild(makeBtn('Поделиться', 'btn--secondary', () => shareRecord(rec)));
      actions.appendChild(makeBtn('Удалить', 'btn--danger', () => deleteRecord(rec.id)));
    } else if (rec.status === 'cancelled') {
      actions.appendChild(makeBtn('Удалить', 'btn--ghost', () => deleteRecord(rec.id)));
    }
    return card;
  }

  function makeBtn(label, cls, handler) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = label;
    b.addEventListener('click', handler);
    return b;
  }

  async function shareRecord(rec) {
    if (navigator.share) {
      try { await navigator.share({ title: rec.title, text: rec.title }); return; } catch { /* user cancelled */ }
    }
    toast('Функция «Поделиться» недоступна в этом браузере');
  }

  async function renderDownloads() {
    const all = await ZDB.all();
    const active = all.filter(r => r.status !== 'done').sort((a,b) => b.createdAt - a.createdAt);
    downloadsList.innerHTML = '';
    active.forEach(rec => downloadsList.appendChild(buildDownloadCard(rec)));
    downloadsEmpty.hidden = active.length !== 0;
    updateBadge();
  }

  /* ---------------------------------------------------------
     HISTORY
  --------------------------------------------------------- */
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const historySearch = document.getElementById('history-search');
  let historyFilter = 'all';

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-selected','false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-selected','true');
      historyFilter = chip.dataset.filter;
      renderHistory();
    });
  });
  historySearch.addEventListener('input', renderHistory);

  function buildHistoryCard(rec) {
    const card = document.createElement('div');
    card.className = 'dl-card glass';
    const date = new Date(rec.completedAt || rec.createdAt).toLocaleDateString('ru-RU', { day:'2-digit', month:'short' });
    card.innerHTML = `
      <div class="dl-card__top">
        <div class="dl-card__thumb">${typeIcon(rec.type)}</div>
        <div class="dl-card__info">
          <p class="dl-card__name">${escapeHtml(rec.title)}</p>
          <p class="dl-card__meta">${rec.quality} • ${rec.format} • ${date}</p>
        </div>
      </div>
      <div class="dl-card__actions"></div>`;
    const actions = card.querySelector('.dl-card__actions');
    actions.appendChild(makeBtn('▶ Играть', 'btn--secondary', () => openPlayer(rec, null)));
    actions.appendChild(makeBtn('↗ Поделиться', 'btn--secondary', () => shareRecord(rec)));
    actions.appendChild(makeBtn('🗑 Удалить', 'btn--danger', () => deleteRecord(rec.id)));
    return card;
  }

  async function renderHistory() {
    const all = await ZDB.all();
    let done = all.filter(r => r.status === 'done');
    if (historyFilter !== 'all') done = done.filter(r => r.type === historyFilter);
    const q = historySearch.value.trim().toLowerCase();
    if (q) done = done.filter(r => r.title.toLowerCase().includes(q));
    done.sort((a,b) => (b.completedAt||0) - (a.completedAt||0));
    historyList.innerHTML = '';
    done.forEach(rec => historyList.appendChild(buildHistoryCard(rec)));
    historyEmpty.hidden = done.length !== 0;
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  function initApp() {
    updateBadge();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }
})();
