// js/authors.js

let AUTHORS_CACHE = [];

async function loadAuthors() {
  AUTHORS_CACHE = await apiRequest('/authors');
  return AUTHORS_CACHE;
}

function renderAuthorTable() {
  const grid = document.getElementById('authorGrid');
  if (!AUTHORS_CACHE.length) {
    grid.innerHTML = `<p>No authors yet. Add one to get started.</p>`;
    return;
  }
  grid.innerHTML = AUTHORS_CACHE.map((a) => `
    <article class="bento-card">
      <div class="bento-card-top">
        <div class="bento-icon"><span class="material-symbols-outlined">person</span></div>
      </div>
      <div class="bento-title">${escapeHtml(a.name)}</div>
      <p class="bento-desc">${escapeHtml(a.bio || 'No biography on file.')}</p>
      <div class="bento-footer">
        <span></span>
        <div class="bento-actions">
          <button class="btn btn-outline btn-small" data-edit-author="${a.id}">Edit</button>
          <button class="btn btn-danger btn-small" data-delete-author="${a.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join('');
}

function validateAuthorClientSide(name) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'Author name is required.';
  else if (name.trim().length > 150) errors.name = 'Name must be 150 characters or fewer.';
  return errors;
}

function initAuthors() {
  const modal = document.getElementById('authorModal');
  const form = document.getElementById('authorForm');
  const formError = document.getElementById('authorFormError');
  const title = document.getElementById('authorModalTitle');

  document.getElementById('addAuthorBtn').addEventListener('click', () => {
    form.reset();
    document.getElementById('authorId').value = '';
    title.textContent = 'Add Author';
    formError.textContent = '';
    clearFormErrors(form);
    openModal('authorModal');
  });

  document.getElementById('authorGrid').addEventListener('click', async (e) => {
    const editId = e.target.dataset.editAuthor;
    const deleteId = e.target.dataset.deleteAuthor;

    if (editId) {
      const author = AUTHORS_CACHE.find((a) => String(a.id) === editId);
      if (!author) return;
      form.reset();
      clearFormErrors(form);
      formError.textContent = '';
      document.getElementById('authorId').value = author.id;
      document.getElementById('authorName').value = author.name;
      document.getElementById('authorBio').value = author.bio || '';
      title.textContent = 'Edit Author';
      openModal('authorModal');
    }

    if (deleteId) {
      if (!confirm('Delete this author? This cannot be undone.')) return;
      try {
        await apiRequest(`/authors/${deleteId}`, { method: 'DELETE' });
        showToast('Author deleted.');
        await loadAuthors();
        renderAuthorTable();
        await populateBookFormDropdowns();
        await populateCatalogFilters();
      } catch (err) {
        showToast(err.message || 'Could not delete author.', 'error');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    const name = form.name.value;
    const bio = form.bio.value;

    const clientErrors = validateAuthorClientSide(name);
    if (Object.keys(clientErrors).length) {
      applyFieldErrors(form, clientErrors);
      return;
    }
    clearFormErrors(form);

    const id = document.getElementById('authorId').value;
    try {
      if (id) {
        await apiRequest(`/authors/${id}`, { method: 'PUT', body: { name, bio } });
        showToast('Author updated.');
      } else {
        await apiRequest('/authors', { method: 'POST', body: { name, bio } });
        showToast('Author added.');
      }
      closeModal('authorModal');
      await loadAuthors();
      renderAuthorTable();
      await populateBookFormDropdowns();
      await populateCatalogFilters();
    } catch (err) {
      if (err.fieldErrors) applyFieldErrors(form, err.fieldErrors);
      else formError.textContent = err.message || 'Could not save author.';
    }
  });
}
