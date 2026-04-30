// public/js/contact.js
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = {
      name:    document.getElementById('name').value.trim(),
      email:   document.getElementById('email').value.trim(),
      phone:   document.getElementById('phone').value.trim(),
      subject: document.getElementById('subject').value.trim(),
      body:    document.getElementById('body').value.trim()
    };
    OS.toast('Opening WhatsApp…', 'success', 'Redirecting');
    setTimeout(() => OS.whatsapp.contact(form), 400);
  });
});
