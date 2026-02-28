(function () {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────
  const CONFIG = {
    apiKey:      'ujEAmmWfvbnNWTE13So9mOrvZFMO4_Dvum2ffbmBtvs',
    username:    'shonar',
    perPage:     30,
    heroBgIndex: 4,  // 0-based: 0 = first photo, 4 = fifth photo, etc.
  };

  // ─── STATE ────────────────────────────────────────────────
  const state = {
    photos:       [],
    currentIndex: 0,
  };

  // ─── UTILITY ──────────────────────────────────────────────
  function formatNum(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

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

  // ─── HERO ─────────────────────────────────────────────────
  function renderHero(userData, statsData) {
    const firstSentence = userData.bio?.split(/[.!?]/)[0]?.trim();
    document.getElementById('hero-tagline').textContent  = firstSentence || '';
    document.getElementById('stat-downloads').textContent = formatNum(statsData.downloads.total);
    document.getElementById('stat-views').textContent     = formatNum(statsData.views.total);
    document.getElementById('stat-photos').textContent    = userData.total_photos;

    // Wire the nav Unsplash link to the user's actual profile URL
    const navLink = document.getElementById('nav-unsplash');
    if (navLink && userData.links?.html) navLink.href = userData.links.html;
  }

  function setHeroBackground(photo) {
    const heroBg      = document.getElementById('hero-bg');
    const heroSkeleton = document.getElementById('hero-skeleton');
    heroBg.onload = () => {
      // Double rAF: ensures display:block is painted before opacity transition fires
      requestAnimationFrame(() => requestAnimationFrame(() => {
        heroBg.classList.add('is-loaded');
        heroSkeleton.remove();
      }));
    };
    heroBg.src = photo.urls.full;
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
      item.className    = 'gallery-item';
      item.dataset.index = index;

      const location = photo.location?.name || '';
      item.innerHTML = `
        <img
          src="${photo.urls.regular}"
          alt="${photo.alt_description || 'Photo by Mohammed Shonar'}"
          loading="lazy"
        >
        <div class="item-info">
          ${location ? `<span class="item-location" data-location>${location}</span>` : ''}
        </div>`;

      frag.appendChild(item);
    });

    gallery.appendChild(frag);
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
  };

  function populateLightbox(photo) {
    lb.img.src         = photo.urls.full;
    lb.img.alt         = photo.alt_description || '';
    lb.loc.textContent = photo.location?.name || '';
    lb.link.href       = photo.links.html;
    lb.counter.textContent = `${state.currentIndex + 1} / ${state.photos.length}`;
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
      const item = e.target.closest('.gallery-item');
      if (item) openLightbox(Number(item.dataset.index));
    });

    lb.close.addEventListener('click', closeLightbox);
    lb.backdrop.addEventListener('click', closeLightbox);
    lb.prev.addEventListener('click', () => navigateTo(-1));
    lb.next.addEventListener('click', () => navigateTo(+1));

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

  // ─── INIT ─────────────────────────────────────────────────
  async function init() {
    const gallery = document.getElementById('gallery');
    showSkeletons(gallery, 16);
    setupNav();

    try {
      const [userData, statsData] = await Promise.all([
        apiGet(`users/${CONFIG.username}`),
        apiGet(`users/${CONFIG.username}/statistics`),
      ]);

      renderHero(userData, statsData);

      const photos = await apiGet(
        `users/${CONFIG.username}/photos?per_page=${CONFIG.perPage}`
      );

      state.photos = photos;
      setHeroBackground(photos[CONFIG.heroBgIndex] ?? photos[0]);
      clearSkeletons(gallery);
      renderGallery(gallery, photos);
      setupReveal(gallery);
      setupLightbox(gallery);

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
