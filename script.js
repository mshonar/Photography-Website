(function () {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────
  const CONFIG = {
    apiKey:       'ujEAmmWfvbnNWTE13So9mOrvZFMO4_Dvum2ffbmBtvs',
    username:     'shonar',
    collectionId: '1nd7CfRWrcs',  // Unsplash collection ID (from the URL)
    heroBgIndex:  4,               // 0-based index into the fetched photos array
  };

  // ─── STATE ────────────────────────────────────────────────
  const state = {
    photos:       [],
    currentIndex: 0,
    statsCache:   {},
  };

  // ─── SKELETON ─────────────────────────────────────────────
  function showSkeletons(gallery, count) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'gallery-skeleton skeleton';
      frag.appendChild(el);
    }
    gallery.appendChild(frag);
  }

  function clearSkeletons(gallery) {
    gallery.querySelectorAll('.gallery-skeleton').forEach(el => el.remove());
  }

  // ─── API ──────────────────────────────────────────────────
  async function apiGet(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `https://api.unsplash.com/${endpoint}${sep}client_id=${CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}: ${endpoint}`);
    return res.json();
  }

  // ─── DOWNLOAD ─────────────────────────────────────────────
  async function downloadPhoto(photo) {
    try {
      // Unsplash ToS: must trigger the download tracking endpoint before downloading
      const data = await fetch(
        `${photo.links.download_location}&client_id=${CONFIG.apiKey}`
      ).then(r => r.json());
      window.open(data.url || photo.urls.full, '_blank', 'noopener');
    } catch (_) {
      window.open(photo.urls.full, '_blank', 'noopener');
    }
  }

  async function loadLightboxStats(photo) {
    const elViews = document.getElementById('lb-views');
    const elDl    = document.getElementById('lb-downloads');
    elViews.textContent = '–';
    elDl.textContent    = '–';

    if (state.statsCache[photo.id]) {
      const { views, downloads } = state.statsCache[photo.id];
      elViews.textContent = views.toLocaleString();
      elDl.textContent    = downloads.toLocaleString();
      return;
    }

    try {
      const stats = await apiGet(`photos/${photo.id}/statistics`);
      const v = stats.views.total;
      const d = stats.downloads.total;
      state.statsCache[photo.id] = { views: v, downloads: d };
      // Only update DOM if this photo is still the one being viewed
      if (state.photos[state.currentIndex]?.id === photo.id) {
        elViews.textContent = v.toLocaleString();
        elDl.textContent    = d.toLocaleString();
      }
    } catch (_) { /* silently fail */ }
  }

  // ─── HERO ─────────────────────────────────────────────────
  function renderHero(userData, statsData) {
    const firstSentence = userData.bio?.split(/[.!?]/)[0]?.trim();
    document.getElementById('hero-tagline').textContent  = firstSentence || '';
    document.getElementById('stat-views').textContent     = statsData.views.total.toLocaleString();
    document.getElementById('stat-downloads').textContent = statsData.downloads.total.toLocaleString();
    document.getElementById('stat-photos').textContent    = userData.total_photos;

    // Wire the nav Unsplash link to the user's actual profile URL
    const navLink = document.getElementById('nav-unsplash');
    if (navLink && userData.links?.html) navLink.href = userData.links.html;
  }

  // ─── SLIDESHOW ────────────────────────────────────────────
  function startSlideshow(photos) {
    const bgA = document.getElementById('hero-bg-a');
    const bgB = document.getElementById('hero-bg-b');
    const heroSkeleton = document.getElementById('hero-skeleton');

    let front = bgA; // currently visible layer
    let back  = bgB; // hidden layer that loads the next photo
    let idx   = CONFIG.heroBgIndex % photos.length;

    function showSlide() {
      const url = photos[idx].urls.full;

      // Fresh Image() object: onload always fires, even for browser-cached URLs
      const loader = new Image();
      loader.onload = () => {
        back.src = url;
        // Double rAF: let the browser paint the new src before starting the fade
        requestAnimationFrame(() => requestAnimationFrame(() => {
          back.classList.add('is-active');
          front.classList.remove('is-active');
          [front, back] = [back, front];
          heroSkeleton?.remove();
        }));
      };
      loader.onerror = () => {
        idx = (idx + 1) % photos.length;
        showSlide();
      };
      loader.src = url;
    }

    showSlide();
    setInterval(() => {
      idx = (idx + 1) % photos.length;
      showSlide();
    }, 8000);
  }

  // ─── GRAIN ────────────────────────────────────────────────
  function startGrain() {
    const canvas = document.getElementById('hero-grain');
    // Draw at a modest resolution — CSS scales it up, interpolation smooths the texture
    canvas.width  = 512;
    canvas.height = 512;

    const ctx   = canvas.getContext('2d');
    let tick    = 0;

    (function drawFrame() {
      // Update every other frame (~30 fps) — classic film grain cadence
      if (tick++ % 2 === 0) {
        const img = ctx.createImageData(512, 512);
        const d   = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255 | 0;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 38; // alpha; final opacity controlled via CSS
        }
        ctx.putImageData(img, 0, 0);
      }
      requestAnimationFrame(drawFrame);
    })();
  }

  // ─── NAV ──────────────────────────────────────────────────
  function setupNav() {
    const hero = document.getElementById('hero');
    const nav  = document.getElementById('site-nav');
    new IntersectionObserver(
      ([entry]) => nav.classList.toggle('past-hero', !entry.isIntersecting),
      { threshold: 0.15 }
    ).observe(hero);
  }

  // ─── GALLERY ──────────────────────────────────────────────
  function renderGallery(gallery, photos) {
    const frag = document.createDocumentFragment();

    photos.forEach((photo, index) => {
      const item = document.createElement('div');
      item.className     = 'gallery-item';
      item.dataset.index = index;

      const location = photo.location?.name || '';
      item.innerHTML = `
        <img
          src="${photo.urls.regular}"
          alt="${photo.alt_description || 'Photo by Mohammed Shonar'}"
          loading="lazy"
        >
        <div class="item-info">
          <button class="item-download" aria-label="Download photo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          ${location ? `<span class="item-location" data-location>${location}</span>` : ''}
        </div>`;

      frag.appendChild(item);
    });

    gallery.appendChild(frag);
  }

  // Calculates grid-row spans so each item is exactly its natural height.
  // Formula: span = ceil((itemHeight + rowGap) / (rowUnit + rowGap))
  function setupMasonrySpans(gallery) {
    const rowUnit = 4; // matches grid-auto-rows: 4px in CSS
    const rowGap  = parseInt(getComputedStyle(gallery).rowGap) || 8;
    const numCols = getComputedStyle(gallery).gridTemplateColumns.split(' ').length;
    const colWidth = (gallery.clientWidth - rowGap * (numCols - 1)) / numCols;

    gallery.querySelectorAll('.gallery-item').forEach(item => {
      const photo = state.photos[Number(item.dataset.index)];
      if (!photo) return;
      const itemHeight = colWidth * (photo.height / photo.width);
      const span = Math.ceil((itemHeight + rowGap) / (rowUnit + rowGap));
      item.style.gridRow = `span ${span}`;
    });
  }

  function setupReveal(gallery) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.04 }
    );
    gallery.querySelectorAll('.gallery-item').forEach(item => obs.observe(item));
  }

  // ─── LIGHTBOX ─────────────────────────────────────────────
  const lb = {
    el:       document.getElementById('lightbox'),
    img:      document.getElementById('lightbox-img'),
    loc:      document.getElementById('lightbox-location'),
    link:     document.getElementById('lightbox-link'),
    counter:  document.getElementById('lightbox-counter'),
    close:    document.getElementById('lightbox-close'),
    prev:     document.getElementById('lightbox-prev'),
    next:     document.getElementById('lightbox-next'),
    backdrop: document.querySelector('.lightbox-backdrop'),
    download: document.getElementById('lightbox-download'),
  };

  function populateLightbox(photo) {
    lb.img.src         = photo.urls.full;
    lb.img.alt         = photo.alt_description || '';
    lb.loc.textContent = photo.location?.name || '';
    lb.link.href       = photo.links.html;
    lb.counter.textContent = `${state.currentIndex + 1} / ${state.photos.length}`;
    loadLightboxStats(photo);
  }

  function openLightbox(index) {
    state.currentIndex = index;
    populateLightbox(state.photos[index]);
    lb.el.removeAttribute('hidden');
    requestAnimationFrame(() => lb.el.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    lb.close.focus();
  }

  function closeLightbox() {
    lb.el.classList.remove('is-open');
    document.body.style.overflow = '';
    lb.el.addEventListener('transitionend', () => {
      lb.el.setAttribute('hidden', '');
      lb.img.src = '';
    }, { once: true });
  }

  function navigateTo(direction) {
    const len = state.photos.length;
    state.currentIndex = (state.currentIndex + direction + len) % len;
    lb.img.style.opacity = '0';
    lb.img.onload = () => { lb.img.style.opacity = '1'; };
    populateLightbox(state.photos[state.currentIndex]);
  }

  function setupLightbox(gallery) {
    gallery.addEventListener('click', (e) => {
      const dlBtn = e.target.closest('.item-download');
      if (dlBtn) {
        e.stopPropagation();
        const item = dlBtn.closest('.gallery-item');
        downloadPhoto(state.photos[Number(item.dataset.index)]);
        return;
      }
      const item = e.target.closest('.gallery-item');
      if (item) openLightbox(Number(item.dataset.index));
    });

    lb.close.addEventListener('click', closeLightbox);
    lb.backdrop.addEventListener('click', closeLightbox);
    lb.prev.addEventListener('click', () => navigateTo(-1));
    lb.next.addEventListener('click', () => navigateTo(+1));
    lb.download.addEventListener('click', () => downloadPhoto(state.photos[state.currentIndex]));

    document.addEventListener('keydown', (e) => {
      if (!lb.el.classList.contains('is-open')) return;
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowRight') navigateTo(+1);
      if (e.key === 'ArrowLeft')  navigateTo(-1);
    });

    let touchStartX = 0;
    lb.el.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    lb.el.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 50) navigateTo(delta < 0 ? +1 : -1);
    }, { passive: true });
  }

  // ─── IDLE FADE ────────────────────────────────────────────
  function setupIdleFade() {
    const hero = document.getElementById('hero');
    let timer = null;

    function goIdle() {
      hero.classList.add('hero-idle');
    }

    function resetIdle() {
      hero.classList.remove('hero-idle');
      clearTimeout(timer);
      if (window.scrollY < window.innerHeight * 0.5) {
        timer = setTimeout(goIdle, 5000);
      }
    }

    timer = setTimeout(goIdle, 5000);

    ['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(evt => {
      document.addEventListener(evt, resetIdle, { passive: true });
    });

    window.addEventListener('scroll', () => {
      if (window.scrollY > window.innerHeight * 0.5) {
        clearTimeout(timer);
        hero.classList.remove('hero-idle');
      } else {
        resetIdle();
      }
    }, { passive: true });
  }

  // ─── FULLSCREEN ───────────────────────────────────────────
  function setupFullscreen() {
    const btn     = document.getElementById('hero-fullscreen');
    const hero    = document.getElementById('hero');
    const expand  = btn.querySelector('.icon-expand');
    const collapse = btn.querySelector('.icon-collapse');

    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        hero.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    });

    const nav = document.getElementById('site-nav');
    let navIdleTimer = null;

    function startNavIdle() {
      clearTimeout(navIdleTimer);
      nav.classList.remove('nav-idle');
      navIdleTimer = setTimeout(() => nav.classList.add('nav-idle'), 3000);
    }

    function stopNavIdle() {
      clearTimeout(navIdleTimer);
      nav.classList.remove('nav-idle');
    }

    ['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(evt => {
      document.addEventListener(evt, () => {
        if (document.fullscreenElement) startNavIdle();
      }, { passive: true });
    });

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      expand.hidden  = isFs;
      collapse.hidden = !isFs;
      btn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Enter fullscreen');
      if (isFs) startNavIdle();
      else stopNavIdle();
    });
  }

  // ─── INIT ─────────────────────────────────────────────────
  async function init() {
    const gallery = document.getElementById('gallery');
    showSkeletons(gallery, 16);
    setupNav();
    setupIdleFade();
    setupFullscreen();

    try {
      const [userData, statsData] = await Promise.all([
        apiGet(`users/${CONFIG.username}`),
        apiGet(`users/${CONFIG.username}/statistics`),
      ]);

      renderHero(userData, statsData);

      // Fetch both pages of the collection in parallel (API max is 30/page)
      const base = `collections/${CONFIG.collectionId}/photos?per_page=30`;
      const [page1, page2] = await Promise.all([
        apiGet(`${base}&page=1`),
        apiGet(`${base}&page=2`),
      ]);
      const photos = [...page1, ...page2.filter(p => p?.id)];

      state.photos = photos;
      startSlideshow(photos);
      startGrain();
      clearSkeletons(gallery);
      renderGallery(gallery, photos);
      setupMasonrySpans(gallery);
      setupReveal(gallery);
      setupLightbox(gallery);

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => setupMasonrySpans(gallery), 100);
      }, { passive: true });

    } catch (err) {
      console.error('Portfolio failed to load:', err);
      clearSkeletons(gallery);
      gallery.innerHTML = `
        <p style="text-align:center;color:var(--text-muted);padding:4rem 0;width:100%">
          Could not load photos. Please refresh.
        </p>`;
    }
  }

  init();

})();
