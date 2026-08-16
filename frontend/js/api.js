// js/api.js
// Thin fetch wrapper shared by every feature module.

const API_BASE = 'http://localhost:5050/api';

const Auth = {
  getToken() { return localStorage.getItem('lms_token'); },
  getUser() {
    const raw = localStorage.getItem('lms_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('lms_token', token);
    localStorage.setItem('lms_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
  },
  isLoggedIn() { return !!this.getToken(); },
};

/**
 * @param {string} path e.g. '/books'
 * @param {object} opts { method, body, isForm }
 */
async function apiRequest(path, opts = {}) {
  const { method = 'GET', body, isForm = false } = opts;
  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkErr) {
    throw { networkError: true, message: 'Could not reach the server. Is the API running?' };
  }

  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed.');
    err.status = res.status;
    err.fieldErrors = data && data.errors;
    if (res.status === 401 || res.status === 403) {
      // stale/expired session - force re-login on next protected action
      Auth.clearSession();
      window.dispatchEvent(new CustomEvent('lms:unauthorized'));
    }
    throw err;
  }
  return data;
}

function showToast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 3200);
}

/** Applies { field: message } errors onto a form's .field-error elements. */
function applyFieldErrors(form, fieldErrors = {}) {
  form.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
  form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.closest('.field')?.classList.add('has-error');
    }
  });
}

function clearFormErrors(form) {
  form.querySelectorAll('.field').forEach((f) => f.classList.remove('has-error'));
  form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
}
