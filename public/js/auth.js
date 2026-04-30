// public/js/auth.js — handles login.html
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, the login page is disabled — redirect.
  if (OS.user() && OS.token()) {
    const u = OS.user();
    OS.toast(`Already logged in as ${u.name}`, 'info');
    // Admins go to /admin; anyone else (rare) goes to /
    const dest = u.role === 'admin' ? '/admin' : '/';
    setTimeout(() => location.href = dest, 800);
    return;
  }

  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerHTML = '<span class="loading"></span> Signing in…'; btn.disabled = true;
    try {
      const { user, token } = await OS.auth.login({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });
      OS.setToken(token); OS.setUser(user);
      OS.toast(`Welcome back, ${user.name}!`, 'success');
      const next = new URL(location.href).searchParams.get('next') || (user.role === 'admin' ? '/admin' : '/dashboard');
      setTimeout(() => location.href = next, 700);
    } catch (err) {
      OS.toast(err.message, 'error');
      btn.innerHTML = 'Log in'; btn.disabled = false;
    }
  });

  if (registerForm) registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerHTML = '<span class="loading"></span> Creating account…'; btn.disabled = true;
    try {
      const { user, token } = await OS.auth.register({
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value
      });
      OS.setToken(token); OS.setUser(user);
      OS.toast(`Welcome to OSMANTECH, ${user.name}!`, 'success');
      setTimeout(() => location.href = '/dashboard', 700);
    } catch (err) {
      OS.toast(err.message, 'error');
      btn.innerHTML = 'Create account'; btn.disabled = false;
    }
  });
});

// Google sign-in — tries real Google Identity Services if configured; falls back to demo prompt.
window.googleLogin = async function () {
  try {
    const config = await OS.api('/api/config');
    if (config.googleClientId) {
      // Load the GSI script on demand
      await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async (response) => {
          const profile = parseJwt(response.credential);
          try {
            const { user, token } = await OS.auth.google({
              email: profile.email, name: profile.name, sub: profile.sub, picture: profile.picture
            });
            OS.setToken(token); OS.setUser(user);
            OS.toast(`Welcome, ${user.name}!`, 'success');
            setTimeout(() => location.href = '/dashboard', 700);
          } catch (e) { OS.toast(e.message, 'error'); }
        }
      });
      google.accounts.id.prompt();
      return;
    }
  } catch {}

  // Demo fallback
  const name  = prompt('Demo Google sign-in — enter name');
  if (!name) return;
  const email = prompt('Enter email');
  if (!email) return;
  try {
    const { user, token } = await OS.auth.google({ email, name, sub: 'demo-' + Date.now() });
    OS.setToken(token); OS.setUser(user);
    OS.toast(`Welcome, ${user.name}!`, 'success');
    setTimeout(() => location.href = '/dashboard', 700);
  } catch (e) { OS.toast(e.message, 'error'); }
};

function parseJwt (tok) { try { return JSON.parse(atob(tok.split('.')[1])); } catch { return {}; } }
function loadScript (src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
