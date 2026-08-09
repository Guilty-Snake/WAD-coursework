// js/auth.js

function refreshAuthUI() {
  const loggedIn = Auth.isLoggedIn();
  const user = Auth.getUser();

  document.getElementById('loginBtn').classList.toggle('hidden', loggedIn);
  document.getElementById('logoutBtn').classList.toggle('hidden', !loggedIn);
  document.querySelectorAll('.admin-only').forEach((el) => el.classList.toggle('hidden', !loggedIn));

  const chip = document.getElementById('userChip');
  if (loggedIn && user) {
    chip.textContent = `@${user.username}`;
    chip.classList.remove('hidden');
  } else {
    chip.classList.add('hidden');
  }
}

function validateLoginClientSide(username, password) {
  const errors = {};
  if (!username || !username.trim()) errors.username = 'Username is required.';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
}

function initAuth() {
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginFormError = document.getElementById('loginFormError');

  document.getElementById('loginBtn').addEventListener('click', () => {
    loginFormError.textContent = '';
    clearFormErrors(loginForm);
    loginForm.reset();
    openModal('loginModal');
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.clearSession();
    refreshAuthUI();
    showToast('Logged out.');
    navigateTo('catalog'); // admin-only views wouldn't be visible/usable anyway
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginFormError.textContent = '';
    const username = loginForm.username.value;
    const password = loginForm.password.value;

    const clientErrors = validateLoginClientSide(username, password);
    if (Object.keys(clientErrors).length) {
      applyFieldErrors(loginForm, clientErrors);
      return;
    }
    clearFormErrors(loginForm);

    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: { username, password } });
      Auth.setSession(data.token, data.user);
      refreshAuthUI();
      closeModal('loginModal');
      showToast(`Welcome back, ${data.user.username}.`);
    } catch (err) {
      if (err.fieldErrors) applyFieldErrors(loginForm, err.fieldErrors);
      else loginFormError.textContent = err.message || 'Login failed.';
    }
  });

  window.addEventListener('lms:unauthorized', () => {
    refreshAuthUI();
    showToast('Your session expired. Please log in again.', 'error');
  });

  refreshAuthUI();
}
