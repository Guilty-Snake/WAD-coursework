// js/main.js

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }
  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }
  
  const VIEW_TITLES = { catalog: 'Catalog', authors: 'Authors', genres: 'Genres' };
  
  function navigateTo(view) {
    // Admin-only views quietly fall back to the catalog if logged out
    // (defence in depth — the API rejects the underlying writes regardless).
    if ((view === 'authors' || view === 'genres') && !Auth.isLoggedIn()) {
      view = 'catalog';
    }
  
    document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
  
    document.querySelectorAll('.nav-item[data-nav]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.nav === view);
    });
  
    document.getElementById('pageTitle').textContent = VIEW_TITLES[view] || 'Catalog';
    document.getElementById('catalogSearchWrap').classList.toggle('hidden', view !== 'catalog');
  
    document.getElementById('sidebar').classList.remove('open');
  
    if (view === 'authors') renderAuthorTable();
    if (view === 'genres') renderGenreTable();
  }
  
  function initNav() {
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(el.dataset.nav);
      });
    });
  
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
  
  function initModals() {
    document.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => closeModal(el.dataset.close));
    });
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((m) => m.classList.add('hidden'));
      }
    });
  }
  
  async function bootstrap() {
    initNav();
    initModals();
    initAuth();
    initAuthors();
    initGenres();
    initBooks();
  
    try {
      await Promise.all([loadAuthors(), loadGenres()]);
    } catch (err) {
      showToast('Could not load reference data. Is the API running?', 'error');
    }
    renderAuthorTable();
    renderGenreTable();
    await populateCatalogFilters();
    await populateBookFormDropdowns();
    await loadBooks();
  
    navigateTo('catalog');
  }
  
  document.addEventListener('DOMContentLoaded', bootstrap);
  