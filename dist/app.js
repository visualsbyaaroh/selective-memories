(() => {
  const data = window.ARCHIVE_DATA;
  const collections = data.collections;
  const state = { search: '', type: 'All', decade: 'All', currentCollection: null, lightboxImages: [], lightboxIndex: 0 };

  const elements = {
    views: { archive: document.querySelector('#archive-view'), index: document.querySelector('#index-view'), about: document.querySelector('#about-view') },
    nav: [...document.querySelectorAll('[data-route]')],
    grid: document.querySelector('#collection-grid'),
    typeFilter: document.querySelector('#type-filter'),
    decadeFilter: document.querySelector('#decade-filter'),
    search: document.querySelector('#search-input'),
    resultCount: document.querySelector('#result-count'),
    clearFilters: document.querySelector('#clear-filters'),
    emptyState: document.querySelector('#empty-state'),
    indexList: document.querySelector('#index-list'),
    previewImage: document.querySelector('#collection-preview-image'),
    collectionView: document.querySelector('#collection-view'),
    collectionContent: document.querySelector('#collection-content'),
    collectionPosition: document.querySelector('#collection-position'),
    backButton: document.querySelector('#back-button'),
    lightbox: document.querySelector('#lightbox'),
    lightboxImage: document.querySelector('#lightbox-image'),
    lightboxCaption: document.querySelector('#lightbox-caption')
  };

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const totalImages = collections.reduce((sum, item) => sum + item.imageCount, 0);
  document.querySelector('#about-collections').textContent = collections.length;
  document.querySelector('#about-images').textContent = totalImages;
  document.querySelector('#about-date').textContent = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(data.generatedAt));

  const types = ['All', ...new Set(collections.map(item => item.type))];
  elements.typeFilter.innerHTML = types.map(type => `<option value="${escapeHtml(type)}">${type === 'All' ? 'All types' : escapeHtml(type)}</option>`).join('');

  const decades = [...new Set(collections.map(item => item.decade))].filter(item => !['Unknown', 'Multiple'].includes(item)).sort();
  elements.decadeFilter.insertAdjacentHTML('beforeend', decades.map(decade => `<option value="${escapeHtml(decade)}">${escapeHtml(decade)}</option>`).join('') + '<option value="Unknown">Date unknown</option><option value="Multiple">Multiple periods</option>');

  function searchableText(item) {
    return [item.title, item.subtitle, item.type, item.year, ...item.people, ...item.subjects].join(' ').toLowerCase();
  }

  function filteredCollections() {
    const query = state.search.trim().toLowerCase();
    return collections.filter(item => {
      const matchesSearch = !query || searchableText(item).includes(query);
      const matchesType = state.type === 'All' || item.type === state.type;
      const matchesDecade = state.decade === 'All' || item.decade === state.decade;
      return matchesSearch && matchesType && matchesDecade;
    });
  }

  function renderArchive() {
    const items = filteredCollections();
    elements.grid.innerHTML = items.map(item => {
      const number = collections.indexOf(item) + 1;
      return `<article class="collection-row" tabindex="0" role="link" data-collection="${item.id}" data-cover="${item.cover}" aria-label="Open ${escapeHtml(item.title)}">
        <span class="row-number">${String(number).padStart(3, '0')}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <span class="row-year">${escapeHtml(item.year)}</span>
        <span class="row-type">${escapeHtml(item.type)}</span>
        <span class="row-count">${item.imageCount}</span>
      </article>`;
    }).join('');
    elements.resultCount.textContent = `${items.length} ${items.length === 1 ? 'collection' : 'collections'}`;
    elements.emptyState.hidden = items.length !== 0;
    const hasFilters = state.search || state.type !== 'All' || state.decade !== 'All';
    elements.clearFilters.hidden = !hasFilters;
    elements.previewImage.src = items[0]?.cover || '';
    elements.previewImage.hidden = !items.length;
  }

  function setRoute(route) {
    const validRoute = elements.views[route] ? route : 'archive';
    Object.entries(elements.views).forEach(([name, view]) => { view.hidden = name !== validRoute; });
    elements.nav.forEach(link => link.setAttribute('aria-current', link.dataset.route === validRoute ? 'page' : 'false'));
    window.scrollTo(0, 0);
  }

  function renderIndex() {
    const map = new Map();
    collections.forEach(item => [...item.people, ...item.subjects].forEach(term => {
      const existing = map.get(term) || new Set();
      existing.add(item.id);
      map.set(term, existing);
    }));
    const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    let previousLetter = '';
    elements.indexList.innerHTML = entries.map(([term, ids]) => {
      const first = term.charAt(0).toUpperCase();
      const letter = first !== previousLetter ? first : '';
      previousLetter = first;
      return `<button class="index-row" type="button" data-index-term="${escapeHtml(term)}"><span class="index-letter">${letter}</span><span class="index-name">${escapeHtml(term)}</span><span class="index-count">${ids.size} ${ids.size === 1 ? 'collection' : 'collections'}</span></button>`;
    }).join('');
  }

  function openCollection(id) {
    const item = collections.find(collection => collection.id === id);
    if (!item) return;
    state.currentCollection = item;
    const people = item.people.length ? item.people.join(', ') : '—';
    const subjects = item.subjects.length ? item.subjects.join(', ') : '—';
    const sections = item.sections.map(section => {
      const images = item.images.filter(image => image.section === section);
      const heading = item.sections.length > 1 ? `<div class="gallery-heading"><h2>${escapeHtml(section)}</h2><span>${images.length} images</span></div>` : '';
      return `<section class="gallery-section">${heading}<div class="image-grid">${images.map((image, index) => {
        const globalIndex = item.images.indexOf(image);
        return `<button class="image-button" type="button" data-image-index="${globalIndex}" aria-label="View image ${globalIndex + 1} of ${item.imageCount}"><img src="${image.src}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async" /></button>`;
      }).join('')}</div></section>`;
    }).join('');
    elements.collectionContent.innerHTML = `
      <div class="collection-hero">
        <h1>${escapeHtml(item.title)}</h1>
        <div class="collection-details">
          <p>${escapeHtml(item.subtitle)}</p>
          <dl>
            <div><dt>Type</dt><dd>${escapeHtml(item.type)}</dd></div>
            <div><dt>Date</dt><dd>${escapeHtml(item.year)}</dd></div>
            <div><dt>People</dt><dd>${escapeHtml(people)}</dd></div>
            <div><dt>Subjects</dt><dd>${escapeHtml(subjects)}</dd></div>
            <div><dt>Images</dt><dd>${item.imageCount}</dd></div>
            ${item.status !== 'Catalogued' ? `<div><dt>Status</dt><dd>${escapeHtml(item.status)}</dd></div>` : ''}
          </dl>
        </div>
      </div>${sections}`;
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
    if (updateHistory) history.pushState({}, '', '#archive');
  }

  function showLightbox(index) {
    if (!state.currentCollection) return;
    state.lightboxImages = state.currentCollection.images;
    state.lightboxIndex = index;
    updateLightbox();
    elements.lightbox.showModal();
  }

  function updateLightbox() {
    const image = state.lightboxImages[state.lightboxIndex];
    if (!image) return;
    elements.lightboxImage.src = image.src;
    elements.lightboxImage.alt = image.alt;
    elements.lightboxCaption.textContent = `${state.currentCollection.title} · ${state.lightboxIndex + 1} / ${state.lightboxImages.length}`;
  }

  function moveLightbox(direction) {
    const length = state.lightboxImages.length;
    state.lightboxIndex = (state.lightboxIndex + direction + length) % length;
    updateLightbox();
  }

  function clearFilters() {
    state.search = '';
    state.type = 'All';
    state.decade = 'All';
    elements.search.value = '';
    elements.decadeFilter.value = 'All';
    elements.typeFilter.value = 'All';
    renderArchive();
  }

  elements.search.addEventListener('input', event => { state.search = event.target.value; renderArchive(); });
  elements.typeFilter.addEventListener('change', event => { state.type = event.target.value; renderArchive(); });
  elements.decadeFilter.addEventListener('change', event => { state.decade = event.target.value; renderArchive(); });
  elements.clearFilters.addEventListener('click', clearFilters);
  document.querySelector('[data-clear]').addEventListener('click', clearFilters);

  elements.grid.addEventListener('click', event => {
    const card = event.target.closest('[data-collection]');
    if (card) openCollection(card.dataset.collection);
  });
  elements.grid.addEventListener('pointerover', event => {
    const row = event.target.closest('[data-cover]');
    if (row) elements.previewImage.src = row.dataset.cover;
  });
  elements.grid.addEventListener('keydown', event => {
    const card = event.target.closest('[data-collection]');
    if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openCollection(card.dataset.collection); }
  });
  elements.backButton.addEventListener('click', () => closeCollection());
  elements.collectionContent.addEventListener('click', event => {
    const button = event.target.closest('[data-image-index]');
    if (button) showLightbox(Number(button.dataset.imageIndex));
  });

  elements.indexList.addEventListener('click', event => {
    const row = event.target.closest('[data-index-term]');
    if (!row) return;
    state.search = row.dataset.indexTerm;
    elements.search.value = state.search;
    location.hash = 'archive';
    renderArchive();
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
  renderArchive();
  renderIndex();
  applyHash();
})();
