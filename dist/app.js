(() => {
  const data = window.ARCHIVE_DATA;
  const collections = data.collections;
  const state = {
    search: '', type: 'All', decade: 'All', currentCollection: null,
    lightboxImages: [], lightboxIndex: 0, returnRoute: 'archive',
    canvas: { x: 0, y: 0, dragging: false, moved: false, pointerX: 0, pointerY: 0, velocityX: -0.08, velocityY: -0.025 }
  };

  const elements = {
    views: { archive: document.querySelector('#archive-view'), index: document.querySelector('#index-view'), about: document.querySelector('#about-view') },
    nav: [...document.querySelectorAll('[data-route]')],
    stage: document.querySelector('#archive-stage'), plane: document.querySelector('#archive-plane'), archiveCount: document.querySelector('#archive-count'),
    grid: document.querySelector('#collection-grid'), typeFilter: document.querySelector('#type-filter'), decadeFilter: document.querySelector('#decade-filter'),
    search: document.querySelector('#search-input'), resultCount: document.querySelector('#result-count'), clearFilters: document.querySelector('#clear-filters'),
    emptyState: document.querySelector('#empty-state'), previewImage: document.querySelector('#collection-preview-image'), previewFrame: document.querySelector('#preview-frame'),
    previewGate: document.querySelector('#preview-gate'), collectionView: document.querySelector('#collection-view'), collectionContent: document.querySelector('#collection-content'),
    collectionPosition: document.querySelector('#collection-position'), backButton: document.querySelector('#back-button'), lightbox: document.querySelector('#lightbox'),
    lightboxImage: document.querySelector('#lightbox-image'), lightboxCaption: document.querySelector('#lightbox-caption')
  };

  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const isSensitive = item => Boolean(item.sensitive);
  const displayTitle = item => `${item.title}${isSensitive(item) ? ' (NSFW)' : ''}`;
  const totalImages = collections.reduce((sum, item) => sum + item.imageCount, 0);
  document.querySelector('#about-collections').textContent = collections.length;
  document.querySelector('#about-images').textContent = totalImages;
  document.querySelector('#about-date').textContent = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(data.generatedAt));
  elements.archiveCount.textContent = `${collections.length} collections · ${totalImages} images`;

  const types = ['All', ...new Set(collections.map(item => item.type))];
  elements.typeFilter.innerHTML = types.map(type => `<option value="${escapeHtml(type)}">${type === 'All' ? 'All types' : escapeHtml(type)}</option>`).join('');
  const decades = [...new Set(collections.map(item => item.decade))].filter(item => !['—', 'Multiple'].includes(item)).sort();
  elements.decadeFilter.insertAdjacentHTML('beforeend', decades.map(decade => `<option value="${escapeHtml(decade)}">${escapeHtml(decade)}</option>`).join('') + '<option value="—">—</option><option value="Multiple">Multiple periods</option>');

  function searchableText(item) {
    return [item.title, item.subtitle, item.type, item.year, ...item.people, ...item.subjects].join(' ').toLowerCase();
  }

  function filteredCollections() {
    const query = state.search.trim().toLowerCase();
    return collections.filter(item => (!query || searchableText(item).includes(query)) && (state.type === 'All' || item.type === state.type) && (state.decade === 'All' || item.decade === state.decade));
  }

  function setPreview(item) {
    if (!item) {
      elements.previewImage.hidden = true;
      elements.previewGate.hidden = true;
      return;
    }
    elements.previewImage.hidden = false;
    elements.previewImage.src = item.cover;
    elements.previewFrame.classList.toggle('is-sensitive', isSensitive(item));
    elements.previewFrame.classList.remove('is-revealed');
    elements.previewGate.hidden = !isSensitive(item);
  }

  function renderIndex() {
    const items = filteredCollections();
    elements.grid.innerHTML = items.map(item => {
      const number = collections.indexOf(item) + 1;
      return `<article class="collection-row${isSensitive(item) ? ' is-sensitive' : ''}" tabindex="0" role="link" data-collection="${item.id}" aria-label="Open ${escapeHtml(displayTitle(item))}">
        <span class="row-number">${String(number).padStart(3, '0')}</span><h2>${escapeHtml(displayTitle(item))}</h2>
        <span class="row-year">${escapeHtml(item.year)}</span><span class="row-type">${escapeHtml(item.type)}</span><span class="row-count">${item.imageCount}</span>
      </article>`;
    }).join('');
    elements.resultCount.textContent = `${items.length} ${items.length === 1 ? 'collection' : 'collections'}`;
    elements.emptyState.hidden = items.length !== 0;
    elements.clearFilters.hidden = !(state.search || state.type !== 'All' || state.decade !== 'All');
    setPreview(items[0]);
  }

  function canvasDimensions() {
    const mobile = window.innerWidth < 640;
    return mobile
      ? { width: 1120, height: 3300, minWidth: 125, range: 78, columns: 4, cellWidth: 280, cellHeight: 300 }
      : { width: 3010, height: 2160, minWidth: 175, range: 110, columns: 7, cellWidth: 430, cellHeight: 360 };
  }

  function hashNumber(value) {
    let hash = 2166136261;
    for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return hash >>> 0;
  }

  function renderCanvas() {
    const dims = canvasDimensions();
    elements.plane.innerHTML = collections.map((item, index) => {
      const seed = hashNumber(item.id + item.title);
      const width = dims.minWidth + (seed % dims.range);
      const column = index % dims.columns;
      const row = Math.floor(index / dims.columns);
      const jitterX = (seed % 91) - 45;
      const jitterY = (Math.floor(seed / 97) % 81) - 40;
      const x = 80 + column * dims.cellWidth + jitterX;
      const y = 55 + row * dims.cellHeight + jitterY;
      return `<article class="archive-tile${isSensitive(item) ? ' is-sensitive' : ''}" data-collection="${item.id}" data-x="${x}" data-y="${y}" style="--tile-width:${width}px">
        <div class="archive-tile-image"><button class="archive-tile-open" type="button" aria-label="Open ${escapeHtml(displayTitle(item))}"><img src="${item.cover}" alt="" loading="lazy" decoding="async" draggable="false" /></button>
        ${isSensitive(item) ? '<div class="sensitive-gate"><button type="button" data-reveal-tile>Reveal</button><span>Caution, NSFW material</span></div>' : ''}</div>
        <h2>${escapeHtml(displayTitle(item))}</h2></article>`;
    }).join('');
    updateCanvas();
  }

  function wrap(value, size, itemSize) {
    const gutter = 90;
    return ((value + gutter) % (size + itemSize + gutter) + (size + itemSize + gutter)) % (size + itemSize + gutter) - itemSize;
  }

  function updateCanvas() {
    const dims = canvasDimensions();
    const viewport = elements.stage.getBoundingClientRect();
    elements.plane.querySelectorAll('.archive-tile').forEach(tile => {
      const tileWidth = Number.parseFloat(getComputedStyle(tile).getPropertyValue('--tile-width')) || 200;
      const x = wrap(Number(tile.dataset.x) + state.canvas.x, Math.max(viewport.width, dims.width), tileWidth);
      const y = wrap(Number(tile.dataset.y) + state.canvas.y, Math.max(viewport.height, dims.height), tile.offsetHeight || 260);
      tile.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }

  function animateCanvas() {
    if (!state.canvas.dragging && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !elements.views.archive.hidden) {
      state.canvas.x += state.canvas.velocityX;
      state.canvas.y += state.canvas.velocityY;
      updateCanvas();
    }
    requestAnimationFrame(animateCanvas);
  }

  function setRoute(route) {
    const validRoute = elements.views[route] ? route : 'archive';
    Object.entries(elements.views).forEach(([name, view]) => { view.hidden = name !== validRoute; });
    elements.nav.forEach(link => link.setAttribute('aria-current', link.dataset.route === validRoute ? 'page' : 'false'));
    if (validRoute === 'archive') requestAnimationFrame(updateCanvas);
    window.scrollTo(0, 0);
  }

  function sensitiveImageMarkup(item, image, globalIndex) {
    const caption = image.description ? `<figcaption>${escapeHtml(image.description)}</figcaption>` : '';
    const gate = isSensitive(item) ? '<div class="sensitive-gate"><button type="button" data-reveal-image>Reveal</button><span>Caution, NSFW material</span></div>' : '';
    return `<figure class="image-item${isSensitive(item) ? ' is-sensitive' : ''}"><div class="image-shell"><button class="image-button" type="button" data-image-index="${globalIndex}" aria-label="View image ${globalIndex + 1} of ${item.imageCount}"><img src="${image.src}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async" /></button>${gate}</div>${caption}</figure>`;
  }

  function openCollection(id) {
    const item = collections.find(collection => collection.id === id);
    if (!item) return;
    state.returnRoute = Object.entries(elements.views).find(([, view]) => !view.hidden)?.[0] || 'archive';
    elements.backButton.innerHTML = `<span aria-hidden="true">←</span> ${state.returnRoute === 'index' ? 'Index' : 'Archive'}`;
    state.currentCollection = item;
    const people = item.people.length ? item.people.join(', ') : '—';
    const subjects = item.subjects.length ? item.subjects.join(', ') : '—';
    const sections = item.sections.map(section => {
      const images = item.images.filter(image => image.section === section);
      const heading = item.sections.length > 1 ? `<div class="gallery-heading"><h2>${escapeHtml(section)}</h2><span>${images.length} images</span></div>` : '';
      return `<section class="gallery-section">${heading}<div class="image-grid">${images.map(image => sensitiveImageMarkup(item, image, item.images.indexOf(image))).join('')}</div></section>`;
    }).join('');
    const downloads = item.downloads?.length ? `<section class="download-section"><div class="gallery-heading"><h2>Full issues</h2><span>${item.downloads.length} files</span></div><div class="download-list">${item.downloads.map(download => `<a class="download-row" href="${escapeHtml(download.url)}" download><span>${escapeHtml(download.label)}</span><span>${escapeHtml(download.size)}</span><span>Download</span></a>`).join('')}</div></section>` : '';
    elements.collectionContent.innerHTML = `<div class="collection-hero${isSensitive(item) ? ' is-sensitive' : ''}"><h1>${escapeHtml(displayTitle(item))}</h1><div class="collection-details"><p>${escapeHtml(item.subtitle)}</p><dl><div><dt>Type</dt><dd>${escapeHtml(item.type)}</dd></div><div><dt>Date</dt><dd>${escapeHtml(item.year)}</dd></div><div><dt>People</dt><dd>${escapeHtml(people)}</dd></div><div><dt>Subjects</dt><dd>${escapeHtml(subjects)}</dd></div><div><dt>Images</dt><dd>${item.imageCount}</dd></div>${item.status !== 'Catalogued' ? `<div><dt>Status</dt><dd>${escapeHtml(item.status)}</dd></div>` : ''}</dl></div></div>${downloads}${sections}`;
    const position = collections.indexOf(item) + 1;
    elements.collectionPosition.textContent = `${String(position).padStart(2, '0')} / ${String(collections.length).padStart(2, '0')}`;
    elements.collectionView.hidden = false;
    document.body.classList.add('is-locked');
    elements.collectionView.scrollTop = 0;
    history.pushState({ collection: id }, '', `#collection/${id}`);
  }

  function closeCollection({ updateHistory = true } = {}) {
    elements.collectionView.hidden = true;
    document.body.classList.remove('is-locked');
    state.currentCollection = null;
    if (updateHistory) history.pushState({}, '', `#${state.returnRoute}`);
  }

  function showLightbox(index) {
    if (!state.currentCollection) return;
    state.lightboxImages = state.currentCollection.images; state.lightboxIndex = index; updateLightbox(); elements.lightbox.showModal();
  }

  function updateLightbox() {
    const image = state.lightboxImages[state.lightboxIndex];
    if (!image) return;
    elements.lightboxImage.src = image.src; elements.lightboxImage.alt = image.alt;
    const position = `${state.currentCollection.title} · ${state.lightboxIndex + 1} / ${state.lightboxImages.length}`;
    elements.lightboxCaption.textContent = image.description ? `${image.description} · ${position}` : position;
  }

  function moveLightbox(direction) {
    state.lightboxIndex = (state.lightboxIndex + direction + state.lightboxImages.length) % state.lightboxImages.length; updateLightbox();
  }

  function clearFilters() {
    state.search = ''; state.type = 'All'; state.decade = 'All';
    elements.search.value = ''; elements.decadeFilter.value = 'All'; elements.typeFilter.value = 'All'; renderIndex();
  }

  elements.search.addEventListener('input', event => { state.search = event.target.value; renderIndex(); });
  elements.typeFilter.addEventListener('change', event => { state.type = event.target.value; renderIndex(); });
  elements.decadeFilter.addEventListener('change', event => { state.decade = event.target.value; renderIndex(); });
  elements.clearFilters.addEventListener('click', clearFilters);
  document.querySelector('[data-clear]').addEventListener('click', clearFilters);
  elements.grid.addEventListener('click', event => { const card = event.target.closest('[data-collection]'); if (card) openCollection(card.dataset.collection); });
  elements.grid.addEventListener('pointerover', event => { const row = event.target.closest('[data-collection]'); if (row) setPreview(collections.find(item => item.id === row.dataset.collection)); });
  elements.grid.addEventListener('keydown', event => { const card = event.target.closest('[data-collection]'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openCollection(card.dataset.collection); } });
  document.querySelector('[data-reveal-preview]').addEventListener('click', () => elements.previewFrame.classList.add('is-revealed'));

  elements.stage.addEventListener('pointerdown', event => {
    if (event.target.closest('[data-reveal-tile]')) return;
    state.canvas.dragging = true; state.canvas.moved = false; state.canvas.pointerX = event.clientX; state.canvas.pointerY = event.clientY;
    elements.stage.setPointerCapture(event.pointerId);
  });
  elements.stage.addEventListener('pointermove', event => {
    if (!state.canvas.dragging) return;
    const dx = event.clientX - state.canvas.pointerX; const dy = event.clientY - state.canvas.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 3) state.canvas.moved = true;
    state.canvas.x += dx; state.canvas.y += dy; state.canvas.pointerX = event.clientX; state.canvas.pointerY = event.clientY; updateCanvas();
  });
  const endDrag = () => { state.canvas.dragging = false; };
  elements.stage.addEventListener('pointerup', endDrag);
  elements.stage.addEventListener('pointercancel', endDrag);
  elements.plane.addEventListener('click', event => {
    const reveal = event.target.closest('[data-reveal-tile]');
    if (reveal) { reveal.closest('.archive-tile').classList.add('is-revealed'); return; }
    const tile = event.target.closest('[data-collection]');
    if (tile && !state.canvas.moved) openCollection(tile.dataset.collection);
  });
  window.addEventListener('resize', renderCanvas);

  elements.backButton.addEventListener('click', () => closeCollection());
  elements.collectionContent.addEventListener('click', event => {
    const reveal = event.target.closest('[data-reveal-image]');
    if (reveal) { reveal.closest('.image-item').classList.add('is-revealed'); return; }
    const button = event.target.closest('[data-image-index]');
    if (button && (!state.currentCollection.sensitive || button.closest('.image-item').classList.contains('is-revealed'))) showLightbox(Number(button.dataset.imageIndex));
  });
  elements.lightbox.querySelector('.lightbox-close').addEventListener('click', () => elements.lightbox.close());
  elements.lightbox.querySelector('.previous').addEventListener('click', () => moveLightbox(-1));
  elements.lightbox.querySelector('.next').addEventListener('click', () => moveLightbox(1));
  elements.lightbox.addEventListener('click', event => { if (event.target === elements.lightbox) elements.lightbox.close(); });
  document.addEventListener('keydown', event => {
    if (!elements.lightbox.open) return;
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
  });

  function applyHash() {
    const hash = location.hash.replace(/^#/, '') || 'archive';
    if (hash.startsWith('collection/')) {
      const id = hash.split('/')[1];
      if (!state.currentCollection || state.currentCollection.id !== id) openCollection(id);
      return;
    }
    if (!elements.collectionView.hidden) closeCollection({ updateHistory: false });
    setRoute(hash);
  }

  window.addEventListener('popstate', applyHash);
  window.addEventListener('hashchange', applyHash);
  renderCanvas(); renderIndex(); applyHash(); requestAnimationFrame(animateCanvas);
})();
