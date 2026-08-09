// js/books.js

const UPLOADS_BASE = 'http://localhost:5050/uploads';
let BOOKS_CACHE = [];
let filterDebounceTimer = null;

async function loadBooks() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  const authorId = document.getElementById('filterAuthor').value;
  const genreId = document.getElementById('filterGenre').value;
  const lowStock = document.getElementById('filterLowStock').checked;

  if (search) params.set('search', search);
  if (authorId) params.set('author_id', authorId);
  if (genreId) params.set('genre_id', genreId);
  if (lowStock) params.set('low_stock', 'true');

  const statusEl = document.getElementById('catalogStatus');
  statusEl.textContent = 'Loading catalog\u2026';

  try {
    BOOKS_CACHE = await apiRequest(`/books?${params.toString()}`);
    renderBookGrid();
    statusEl.textContent = `${BOOKS_CACHE.length} book${BOOKS_CACHE.length === 1 ? '' : 's'} found.`;
  } catch (err) {
    statusEl.textContent = '';
    document.getElementById('bookGrid').innerHTML = `<p>Could not load the catalog. ${escapeHtml(err.message || '')}</p>`;
  }
}

function renderBookGrid() {
  const grid = document.getElementById('bookGrid');
  if (!BOOKS_CACHE.length) {
    grid.innerHTML = `<p>No books match your search. Try clearing the filters.</p>`;
    return;
  }
  const loggedIn = Auth.isLoggedIn();

  grid.innerHTML = BOOKS_CACHE.map((b) => {
    const iconStyle = b.cover_image
      ? `style="background-image:url('${UPLOADS_BASE}/${encodeURIComponent(b.cover_image)}')"`
      : '';
    const iconInner = b.cover_image ? '' : '<span class="material-symbols-outlined">menu_book</span>';

    return `
      <article class="bento-card">
        <div class="bento-card-top">
          <div class="bento-icon" ${iconStyle}>${iconInner}</div>
          <span class="bento-chip ${b.low_stock ? 'low-stock' : ''}">${b.low_stock ? 'Low Stock' : 'In Stock'}</span>
        </div>
        <div class="bento-title">${escapeHtml(b.title)}</div>
        <div class="bento-subtitle">by ${escapeHtml(b.author_name)} &middot; ${escapeHtml(b.genre_name)}${b.published_year ? ` &middot; ${b.published_year}` : ''}</div>
        <p class="bento-desc">${escapeHtml(b.description || 'No description available.')}</p>
        <div class="bento-footer">
          <div class="bento-stat">
            <span class="bento-stat-label">Available</span>
            <span class="bento-stat-value">${b.copies_available}/${b.total_copies}</span>
          </div>
          ${loggedIn ? `
          <div class="bento-actions">
            <button class="btn btn-outline btn-small" data-edit-book="${b.id}">Edit</button>
            <button class="btn btn-danger btn-small" data-delete-book="${b.id}">Delete</button>
          </div>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

async function populateCatalogFilters() {
  const authorSel = document.getElementById('filterAuthor');
  const genreSel = document.getElementById('filterGenre');
  const currentAuthor = authorSel.value;
  const currentGenre = genreSel.value;

  authorSel.innerHTML = '<option value="">All authors</option>' +
    AUTHORS_CACHE.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  genreSel.innerHTML = '<option value="">All genres</option>' +
    GENRES_CACHE.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

  authorSel.value = currentAuthor;
  genreSel.value = currentGenre;
}

async function populateBookFormDropdowns() {
  const authorSel = document.getElementById('bookAuthor');
  const genreSel = document.getElementById('bookGenre');
  authorSel.innerHTML = '<option value="">Select an author\u2026</option>' +
    AUTHORS_CACHE.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  genreSel.innerHTML = '<option value="">Select a genre\u2026</option>' +
    GENRES_CACHE.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
}

function validateBookClientSide(form) {
  const errors = {};
  const title = form.title.value.trim();
  const authorId = form.author_id.value;
  const genreId = form.genre_id.value;
  const totalCopies = form.total_copies.value;
  const availableCopies = form.copies_available.value;
  const year = form.published_year.value;

  if (!title) errors.title = 'Title is required.';
  if (!authorId) errors.author_id = 'Please select an author.';
  if (!genreId) errors.genre_id = 'Please select a genre.';
  if (totalCopies === '' || Number(totalCopies) < 0 || !Number.isInteger(Number(totalCopies))) {
    errors.total_copies = 'Enter a whole number of 0 or more.';
  }
  if (availableCopies === '' || Number(availableCopies) < 0 || !Number.isInteger(Number(availableCopies))) {
    errors.copies_available = 'Enter a whole number of 0 or more.';
  }
  if (
    !errors.total_copies && !errors.copies_available &&
    Number(availableCopies) > Number(totalCopies)
  ) {
    errors.copies_available = 'Cannot exceed total copies.';
  }
  if (year && (Number(year) < 1000 || Number(year) > new Date().getFullYear())) {
    errors.published_year = `Enter a year between 1000 and ${new Date().getFullYear()}.`;
  }
  const coverFile = form.cover_image.files[0];
  if (coverFile) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(coverFile.type)) errors.cover_image = 'Only JPEG, PNG, WEBP or GIF images are allowed.';
    else if (coverFile.size > 5 * 1024 * 1024) errors.cover_image = 'Image must be 5MB or smaller.';
  }

  return errors;
}

function initBooks() {
  const modal = document.getElementById('bookModal');
  const form = document.getElementById('bookForm');
  const formError = document.getElementById('bookFormError');
  const title = document.getElementById('bookModalTitle');

  // --- filters ---
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(loadBooks, 300);
  });
  document.getElementById('filterAuthor').addEventListener('change', loadBooks);
  document.getElementById('filterGenre').addEventListener('change', loadBooks);
  document.getElementById('filterLowStock').addEventListener('change', loadBooks);

  // --- add ---
  document.getElementById('addBookBtn').addEventListener('click', async () => {
    form.reset();
    document.getElementById('bookId').value = '';
    title.textContent = 'Add Book';
    formError.textContent = '';
    clearFormErrors(form);
    await populateBookFormDropdowns();
    openModal('bookModal');
  });

  // --- edit / delete (event delegation) ---
  document.getElementById('bookGrid').addEventListener('click', async (e) => {
    const editId = e.target.dataset.editBook;
    const deleteId = e.target.dataset.deleteBook;

    if (editId) {
      const book = BOOKS_CACHE.find((b) => String(b.id) === editId);
      if (!book) return;
      form.reset();
      clearFormErrors(form);
      formError.textContent = '';
      await populateBookFormDropdowns();

      document.getElementById('bookId').value = book.id;
      form.title.value = book.title;
      form.isbn.value = book.isbn || '';
      form.author_id.value = book.author_id;
      form.genre_id.value = book.genre_id;
      form.published_year.value = book.published_year || '';
      form.total_copies.value = book.total_copies;
      form.copies_available.value = book.copies_available;
      form.description.value = book.description || '';
      title.textContent = 'Edit Book';
      openModal('bookModal');
    }

    if (deleteId) {
      if (!confirm('Delete this book? This cannot be undone.')) return;
      try {
        await apiRequest(`/books/${deleteId}`, { method: 'DELETE' });
        showToast('Book deleted.');
        await loadBooks();
      } catch (err) {
        showToast(err.message || 'Could not delete book.', 'error');
      }
    }
  });

  // --- save (create/update) ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    const clientErrors = validateBookClientSide(form);
    if (Object.keys(clientErrors).length) {
      applyFieldErrors(form, clientErrors);
      return;
    }
    clearFormErrors(form);

    const id = document.getElementById('bookId').value;
    const fd = new FormData();
    fd.append('title', form.title.value.trim());
    fd.append('isbn', form.isbn.value.trim());
    fd.append('author_id', form.author_id.value);
    fd.append('genre_id', form.genre_id.value);
    fd.append('published_year', form.published_year.value);
    fd.append('total_copies', form.total_copies.value);
    fd.append('copies_available', form.copies_available.value);
    fd.append('description', form.description.value.trim());
    if (form.cover_image.files[0]) fd.append('cover_image', form.cover_image.files[0]);

    try {
      if (id) {
        await apiRequest(`/books/${id}`, { method: 'PUT', body: fd, isForm: true });
        showToast('Book updated.');
      } else {
        await apiRequest('/books', { method: 'POST', body: fd, isForm: true });
        showToast('Book added.');
      }
      closeModal('bookModal');
      await loadBooks();
    } catch (err) {
      if (err.fieldErrors) applyFieldErrors(form, err.fieldErrors);
      else formError.textContent = err.message || 'Could not save book.';
    }
  });
}
