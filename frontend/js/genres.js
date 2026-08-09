// js/genres.js

let GENRES_CACHE = [];

async function loadGenres() {
  GENRES_CACHE = await apiRequest('/genres');
  return GENRES_CACHE;
}

function renderGenreTable() {
  const grid = document.getElementById('genreGrid');
  if (!GENRES_CACHE.length) {
    grid.innerHTML = `<p>No genres yet. Add one to get started.</p>`;
    return;
  }
  grid.innerHTML = GENRES_CACHE.map((g) => `
    <article class="bento-card">
      <div class="bento-card-top">
        <div class="bento-icon"><span class="material-symbols-outlined">category</span></div>
      </div>
      <div class="bento-title">${escapeHtml(g.name)}</div>
      <div class="bento-footer">
        <span></span>
        <div class="bento-actions">
          <button class="btn btn-outline btn-small" data-edit-genre="${g.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-delete-genre="${g.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join('');
}

function validateGenreClientSide(name) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Genre name is required.';
  else if (name.trim().length > 100) errors.name = 'Name must be 100 characters or fewer.';
  return errors;
}

function initGenres() {
  const form = document.getElementById('genreForm');
  const formError = document.getElementById('genreFormError');
  const title = document.getElementById('genreModalTitle');

  document.getElementById('addGenreBtn').addEventListener('click', () => {
    form.reset();
    document.getElementById('genreId').value = '';
    title.textContent = 'Add Genre';
    formError.textContent = '';
    clearFormErrors(form);
    openModal('genreModal');
  });

  document.getElementById('genreGrid').addEventListener('click', async (e) => {
    const editId = e.target.dataset.editGenre;
    const deleteId = e.target.dataset.deleteGenre;

    if (editId) {
      const genre = GENRES_CACHE.find((g) => String(g.id) === editId);
      if (!genre) return;
      form.reset();
      clearFormErrors(form);
      formError.textContent = '';
      document.getElementById('genreId').value = genre.id;
      document.getElementById('genreName').value = genre.name;
      title.textContent = 'Edit Genre';
      openModal('genreModal');
    }

    if (deleteId) {
      if (!confirm('Delete this genre? This cannot be undone.')) return;
      try {
        await apiRequest(`/genres/${deleteId}`, { method: 'DELETE' });
        showToast('Genre deleted.');
        await loadGenres();
        renderGenreTable();
        await populateBookFormDropdowns();
        await populateCatalogFilters();
      } catch (err) {
        showToast(err.message || 'Could not delete genre.', 'error');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    const name = form.name.value;

    const clientErrors = validateGenreClientSide(name);
    if (Object.keys(clientErrors).length) {
      applyFieldErrors(form, clientErrors);
      return;
    }
    clearFormErrors(form);

    const id = document.getElementById('genreId').value;
    try {
      if (id) {
        await apiRequest(`/genres/${id}`, { method: 'PUT', body: { name } });
        showToast('Genre updated.');
      } else {
        await apiRequest('/genres', { method: 'POST', body: { name } });
        showToast('Genre added.');
      }
      closeModal('genreModal');
      await loadGenres();
      renderGenreTable();
      await populateBookFormDropdowns();
      await populateCatalogFilters();
    } catch (err) {
      if (err.fieldErrors) applyFieldErrors(form, err.fieldErrors);
      else formError.textContent = err.message || 'Could not save genre.';
    }
  });
}
