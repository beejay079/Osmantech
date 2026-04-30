// public/js/fix.js
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fix-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = {
      deviceType:    document.getElementById('device-type').value,
      deviceModel:   document.getElementById('device-model').value.trim(),
      issue:         document.getElementById('issue').value.trim(),
      preferredDate: document.getElementById('preferred-date').value,
      serviceType:   document.getElementById('service-type').value,
      phone:         document.getElementById('phone').value.trim(),
      name:          document.getElementById('name')?.value.trim(),
      notes:         document.getElementById('notes')?.value.trim()
    };
    OS.toast('Opening WhatsApp…', 'success', 'Redirecting');
    setTimeout(() => OS.whatsapp.fix(form), 400);
  });
});
