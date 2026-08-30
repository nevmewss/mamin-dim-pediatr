(() => {
  const dialog = document.querySelector('#booking-dialog');
  const form = document.querySelector('[data-booking-form]');
  const note = document.querySelector('[data-form-note]');
  const dateInput = document.querySelector('[data-booking-date]');

  if (dateInput) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dateInput.min = localToday;
  }

  document.querySelectorAll('[data-open-booking]').forEach((button) => {
    button.addEventListener('click', () => dialog?.showModal());
  });

  document.querySelectorAll('[data-close-booking]').forEach((button) => {
    button.addEventListener('click', () => dialog?.close());
  });

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    if (!String(data.phone || '').replace(/\D/g, '').match(/\d{9,}/)) {
      note.textContent = 'Вкажіть коректний номер телефону.';
      return;
    }
    submit.disabled = true;
    note.textContent = 'Надсилаємо…';
    try {
      const response = await fetch('send.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Помилка надсилання.');
      form.reset();
      note.textContent = 'Дякуємо! Заявку прийнято.';
    } catch (error) {
      note.textContent = location.hostname.endsWith('github.io')
        ? 'На GitHub Pages форма доступна лише візуально: для надсилання потрібен PHP-хостинг.'
        : (error.message || 'Не вдалося надіслати заявку. Спробуйте ще раз.');
    } finally {
      submit.disabled = false;
    }
  });
})();
