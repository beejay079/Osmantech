// public/js/notifications.js
document.addEventListener('DOMContentLoaded', () => {
  if (!OS.user()) {
    OS.toast('Please log in', 'error');
    setTimeout(() => location.href = '/login?next=/notifications', 900);
    return;
  }
  render();
});

async function render () {
  const el = document.getElementById('notifications-list');
  try {
    const { notifications } = await OS.notifications.list();
    if (!notifications.length) {
      el.innerHTML = `<div class="empty"><div class="ico">🔔</div><h3>All caught up</h3><p>No notifications yet.</p></div>`;
      return;
    }
    el.innerHTML = notifications.map(n => `
      <div class="card card-body mb-4" style="${n.read ? 'opacity:.7' : ''};${!n.read ? 'border-left:3px solid var(--orange);' : ''}" onclick="open${n.read ? 'Link' : 'Read'}(${n.id}, '${OS.escape(n.link || '')}')">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.25rem;">
          <strong>${OS.escape(n.title)}</strong>
          <span class="muted small">${OS.dateTime(n.created_at)}</span>
        </div>
        <p style="margin:0;color:var(--ink-2);">${OS.escape(n.message || '')}</p>
        ${n.link && !n.read ? `<div style="margin-top:.5rem;"><span style="color:var(--orange);font-weight:600;">View →</span></div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<p class="muted">${OS.escape(e.message)}</p>`;
  }
}

window.openRead = async function (id, link) {
  try { await OS.notifications.read(id); } catch {}
  if (link) location.href = link; else render();
};
window.openLink = function (id, link) { if (link) location.href = link; };

window.markAllRead = async function () {
  try { await OS.notifications.readAll(); OS.toast('All marked as read', 'success'); render(); }
  catch (e) { OS.toast(e.message, 'error'); }
};
