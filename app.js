(function () {
  'use strict';

  /* ==========================================================
     ПЛАШКИ АКТИВНОСТІ (внизу зліва)
     Узагальнені повідомлення без імен і без медичних деталей —
     лише факт активності на сайті (запис / відгук).
     ========================================================== */
  (function activityToast() {
    const toast = document.querySelector('[data-activity-toast]');
    const textEl = document.querySelector('[data-activity-text]');
    const iconEl = document.querySelector('[data-activity-icon]');
    const closeBtn = document.querySelector('[data-activity-close]');
    if (!toast || !textEl) return;

    const messages = [
      { icon: '📅', text: '3 хв тому хтось записався на консультацію' },
      { icon: '⭐', text: 'Вчора залишили відгук ★★★★★' },
      { icon: '📅', text: 'Сьогодні вранці записались на прийом' },
      { icon: '✓', text: 'Цього тижня консультацію вже отримали 12 пацієнтів' },
      { icon: '⭐', text: '2 дні тому залишили новий відгук' },
      { icon: '📅', text: '7 хв тому записались на консультацію' },
      { icon: '📞', text: 'Щойно хтось лишив номер для зворотного дзвінка' },
      { icon: '⭐', text: 'На цьому тижні вже 3 нових відгуки' },
      { icon: '✓', text: 'Сьогодні прийом вже пройшли кілька пацієнтів' },
      { icon: '📅', text: '15 хв тому записались на прийом' },
      { icon: '⭐', text: 'Учора ввечері залишили відгук ★★★★★' },
      { icon: '📅', text: 'Хвилину тому оформили запис на консультацію' },
      { icon: '✓', text: 'Цього місяця консультацію отримали понад 50 пацієнтів' },
      { icon: '📞', text: '5 хв тому надійшла заявка на дзвінок' },
      { icon: '⭐', text: 'Днями залишили новий відгук про прийом' },
    ];

    // перемішуємо порядок, щоб фрази не йшли завжди однаково
    for (let i = messages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [messages[i], messages[j]] = [messages[j], messages[i]];
    }

    let dismissedByUser = false;
    let index = 0;
    let hideTimer = null;

    function showNext() {
      if (dismissedByUser) return;
      const msg = messages[index % messages.length];
      index += 1;
      iconEl.textContent = msg.icon;
      textEl.textContent = msg.text;
      toast.hidden = false;
      requestAnimationFrame(() => toast.classList.add('is-visible'));

      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => { toast.hidden = true; }, 350);
      }, 5000);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        dismissedByUser = true;
        toast.classList.remove('is-visible');
        window.setTimeout(() => { toast.hidden = true; }, 300);
      });
    }

    // перша плашка — через 10 секунд, далі рівно раз на хвилину (не частіше)
    window.setTimeout(() => {
      showNext();
      window.setInterval(showNext, 60000);
    }, 10000);
  })();

  /* ==========================================================
     ЛІНИВЕ ЗАВАНТАЖЕННЯ ФОНОВИХ ФОТО (data-bg)
     Фото поза першим екраном підвантажуються тільки тоді,
     коли наближаються до зони видимості — це прискорює
     початкове завантаження сторінки.

     Виправлення (13.08.2026): на мобільних деякі фото іноді не
     підвантажувались з першого разу. Причина — на телефонах
     (особливо Safari на iOS) адресний рядок ховається/з'являється
     під час скролу і міняє висоту видимої області вже ПІСЛЯ того,
     як спостерігач порахував початкові позиції елементів, тому
     частина фото не потрапляла в поріг видимості вчасно. Тепер:
     1) поріг спрацювання значно більший (800px замість 250px),
        тож фото підвантажується задовго до того, як користувач
        до нього доскролить;
     2) є "страхувальний" примусовий довантажувач — якщо через
        2.5с після повного завантаження сторінки якесь фото ще не
        підвантажилось (спостерігач з якоїсь причини не спрацював),
        воно довантажується примусово, тож порожніх блоків не лишається.
     ========================================================== */
  const lazyBgTargets = document.querySelectorAll('[data-bg]');
  function loadBgEl(el) {
    if (!el.dataset.bg) return;
    el.style.backgroundImage = `url('${el.dataset.bg}')`;
    el.removeAttribute('data-bg');
  }
  if ('IntersectionObserver' in window && lazyBgTargets.length) {
    const bgObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadBgEl(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '800px 0px' });
    lazyBgTargets.forEach((el) => bgObserver.observe(el));

    // страхувальний довантажувач
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.querySelectorAll('[data-bg]').forEach(loadBgEl);
      }, 2500);
    });
  } else {
    // старі браузери без підтримки IntersectionObserver — просто показуємо одразу
    lazyBgTargets.forEach(loadBgEl);
  }

  /* ==========================================================
     МАСКА ТЕЛЕФОНУ (+38 (0__) ___-__-__)
     ========================================================== */
  document.querySelectorAll('[data-phone-mask]').forEach((input) => {
    input.addEventListener('focus', () => {
      if (!input.value) input.value = '+38 (0';
    });
    input.addEventListener('input', () => {
      let digits = input.value.replace(/\D/g, '');
      if (digits.startsWith('380')) digits = digits.slice(2);
      else if (digits.startsWith('38')) digits = digits.slice(2);
      digits = digits.slice(0, 10);
      let formatted = '+38 (';
      formatted += digits.slice(0, 3);
      if (digits.length >= 3) formatted += ') ';
      formatted += digits.slice(3, 6);
      if (digits.length >= 6) formatted += '-';
      formatted += digits.slice(6, 8);
      if (digits.length >= 8) formatted += '-';
      formatted += digits.slice(8, 10);
      input.value = formatted;
    });
  });

  /* ==========================================================
     ПОПАПИ — усі форми відкриваються як попап
     ========================================================== */
  const overlays = {};
  document.querySelectorAll('[data-popup]').forEach((el) => {
    overlays[el.dataset.popup] = el;
  });

  function openPopup(name) {
    const el = overlays[name];
    if (!el) return;
    // закриваємо будь-який інший відкритий попап
    Object.values(overlays).forEach((o) => { o.hidden = true; });
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    const firstInput = el.querySelector('input, textarea');
    if (firstInput) window.setTimeout(() => firstInput.focus(), 50);
  }
  function closeAllPopups() {
    Object.values(overlays).forEach((o) => { o.hidden = true; });
    document.body.style.overflow = '';
    document.querySelectorAll('[data-desired-slot-field]').forEach((el) => { el.value = ''; });
    document.querySelectorAll('[data-popup-slot-note]').forEach((el) => { el.hidden = true; el.textContent = ''; });
  }

  document.querySelectorAll('[data-open-popup]').forEach((btn) => {
    btn.addEventListener('click', () => openPopup(btn.dataset.openPopup));
  });
  document.querySelectorAll('[data-popup-close]').forEach((btn) => {
    btn.addEventListener('click', closeAllPopups);
  });
  Object.values(overlays).forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllPopups(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPopups();
  });

  /* ==========================================================
     ПОПАП ЧЕРЕЗ 3 ХВИЛИНИ (одноразово за сесію)
     ========================================================== */
  const TIMED_DELAY_MS = 180000;
  const TIMED_SESSION_KEY = 'travm_timed_popup_shown';
  window.setTimeout(() => {
    if (sessionStorage.getItem(TIMED_SESSION_KEY)) return;
    // не показуємо, якщо вже відкритий інший попап (наприклад, юзер сам натиснув "записатись")
    const anyOpen = Object.values(overlays).some((o) => !o.hidden);
    if (anyOpen) return;
    openPopup('timed');
    sessionStorage.setItem(TIMED_SESSION_KEY, '1');
  }, TIMED_DELAY_MS);

  /* ==========================================================
     МОБІЛЬНЕ МЕНЮ (простий якір-скрол при натисканні на бургер)
     ========================================================== */
  const burger = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const isOpen = !mobileNav.hidden;
      mobileNav.hidden = isOpen;
      burger.classList.toggle('is-open', !isOpen);
    });
    mobileNav.querySelectorAll('[data-mobile-nav-link]').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.hidden = true;
        burger.classList.remove('is-open');
      });
    });
  }

  /* ==========================================================
     ГОРИЗОНТАЛЬНИЙ СКРОЛ СИМПТОМІВ (стрілки)
     ========================================================== */
  const symptomsScroll = document.querySelector('[data-symptoms-scroll]');
  const symptomsPrev = document.querySelector('.symptoms-prev');
  const symptomsNext = document.querySelector('.symptoms-next');
  const symptomsDots = document.querySelector('[data-symptoms-dots]');
  if (symptomsScroll && symptomsPrev && symptomsNext) {
    const cards = Array.from(symptomsScroll.children);
    const step = () => Math.min(320, symptomsScroll.clientWidth * 0.8);
    symptomsPrev.addEventListener('click', () => symptomsScroll.scrollBy({ left: -step(), behavior: 'smooth' }));
    symptomsNext.addEventListener('click', () => symptomsScroll.scrollBy({ left: step(), behavior: 'smooth' }));

    if (symptomsDots) {
      cards.forEach((card, i) => {
        const dot = document.createElement('span');
        if (i === 0) dot.classList.add('is-active');
        dot.addEventListener('click', () => card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }));
        symptomsDots.appendChild(dot);
      });
      let dotTimer;
      symptomsScroll.addEventListener('scroll', () => {
        window.clearTimeout(dotTimer);
        dotTimer = window.setTimeout(() => {
          const scrollLeft = symptomsScroll.scrollLeft;
          let closest = 0;
          let closestDist = Infinity;
          cards.forEach((card, i) => {
            const dist = Math.abs(card.offsetLeft - scrollLeft);
            if (dist < closestDist) { closestDist = dist; closest = i; }
          });
          Array.from(symptomsDots.children).forEach((d, i) => d.classList.toggle('is-active', i === closest));
        }, 100);
      });
    }
  }

  /* ==========================================================
     ГАЛЕРЕЯ СЕРТИФІКАТІВ (у попапі)
     ========================================================== */
  const certTrack = document.querySelector('[data-cert-track]');
  const certPrev = document.querySelector('.cert-prev');
  const certNext = document.querySelector('.cert-next');
  const certDots = document.querySelector('[data-cert-dots]');
  if (certTrack && certPrev && certNext) {
    const shots = Array.from(certTrack.children);
    certPrev.addEventListener('click', () => certTrack.scrollBy({ left: -certTrack.clientWidth, behavior: 'smooth' }));
    certNext.addEventListener('click', () => certTrack.scrollBy({ left: certTrack.clientWidth, behavior: 'smooth' }));

    if (certDots) {
      shots.forEach((shot, i) => {
        const dot = document.createElement('span');
        if (i === 0) dot.classList.add('is-active');
        dot.addEventListener('click', () => shot.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }));
        certDots.appendChild(dot);
      });
      let certDotTimer;
      certTrack.addEventListener('scroll', () => {
        window.clearTimeout(certDotTimer);
        certDotTimer = window.setTimeout(() => {
          const scrollLeft = certTrack.scrollLeft;
          let closest = 0;
          let closestDist = Infinity;
          shots.forEach((shot, i) => {
            const dist = Math.abs(shot.offsetLeft - scrollLeft);
            if (dist < closestDist) { closestDist = dist; closest = i; }
          });
          Array.from(certDots.children).forEach((d, i) => d.classList.toggle('is-active', i === closest));
        }, 100);
      });
    }
  }

  /* ==========================================================
     СЛАЙДЕР ВІДГУКІВ
     ========================================================== */
  const track = document.querySelector('[data-reviews-track]');
  const dotsWrap = document.querySelector('[data-reviews-dots]');
  const prevBtn = document.querySelector('.reviews-prev');
  const nextBtn = document.querySelector('.reviews-next');

  if (track && dotsWrap) {
    const cards = Array.from(track.children);

    function perView() {
      const w = window.innerWidth;
      if (w <= 760) return 1;
      if (w <= 980) return 2;
      return 4;
    }

    let index = 0;

    function maxIndex() {
      return Math.max(0, cards.length - perView());
    }

    function renderDots() {
      dotsWrap.innerHTML = '';
      const total = maxIndex() + 1;
      for (let i = 0; i < total; i++) {
        const dot = document.createElement('span');
        if (i === index) dot.classList.add('is-active');
        dot.addEventListener('click', () => { index = i; update(); });
        dotsWrap.appendChild(dot);
      }
    }

    function update() {
      index = Math.max(0, Math.min(index, maxIndex()));
      const cardWidth = cards[0].getBoundingClientRect().width;
      const gap = 20;
      track.style.transform = `translateX(-${index * (cardWidth + gap)}px)`;
      renderDots();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { index -= 1; update(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { index += 1; update(); });
    window.addEventListener('resize', update);
    update();
  }

  /* ==========================================================
     ДИНАМІЧНИЙ ЛІЧИЛЬНИК ВІЛЬНИХ СЛОТІВ
     Загальна кількість місць на тиждень (TOTAL_SLOTS) тепер сама
     не фіксована: вона вираховується від номера тижня в році,
     тому щотижня виходить інша цифра (наприклад, один тиждень 28,
     інший 15, інший 37), але завжди в межах 15–40. В межах ОДНОГО
     тижня число стабільне для всіх відвідувачів і змінюється тільки
     з початком нового тижня.
     Понеділок — багато вільних місць (початок тижня),
     до неділі — залишається лише пара місць (тиждень заповнюється).
     ========================================================== */
  const slotsEl = document.querySelector('[data-slots-left]');
  if (slotsEl) {
    const MIN_TOTAL = 15;  // мінімальна можлива місткість тижня
    const MAX_TOTAL = 40;  // максимальна можлива місткість тижня (не більше)

    // номер ISO-тижня в році — щоб цифра трималась стабільною всі 7 днів
    function getISOWeek(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
      const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
      return { week: weekNum, year: d.getUTCFullYear() };
    }

    // детермінований псевдовипадковий генератор від числа-зерна (mulberry32) —
    // та сама цифра для всіх відвідувачів одного тижня, інша наступного тижня
    function seededRandom(seed) {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    const now = new Date();
    const { week, year } = getISOWeek(now);
    const seed = year * 100 + week;
    const rnd = seededRandom(seed);

    const TOTAL_SLOTS = Math.round(MIN_TOTAL + rnd * (MAX_TOTAL - MIN_TOTAL));

    const MAX_LEFT = Math.max(2, Math.round(TOTAL_SLOTS * 0.87)); // вільних на понеділок
    const MIN_LEFT = Math.max(1, Math.round(TOTAL_SLOTS * 0.06)); // вільних на неділю

    // getDay(): 0 = неділя, 1 = понеділок ... 6 = субота
    // переводимо так, щоб понеділок = 0, неділя = 6
    const dayIndex = (now.getDay() + 6) % 7;

    const range = MAX_LEFT - MIN_LEFT;
    const slotsLeft = Math.round(MAX_LEFT - (range * dayIndex) / 6);

    slotsEl.textContent = String(slotsLeft);

    const totalEl = document.querySelector('[data-slots-total]');
    if (totalEl) totalEl.textContent = String(TOTAL_SLOTS);

    const slotsNumberEl = slotsEl.closest('.slots-number');
    if (slotsNumberEl) {
      const bookedPercent = Math.round(((TOTAL_SLOTS - slotsLeft) / TOTAL_SLOTS) * 100);
      slotsNumberEl.style.setProperty('--fill', bookedPercent + '%');
    }
  }

  /* ==========================================================
     ВІДПРАВКА ФОРМ (усі попапи) → send.php
     ========================================================== */
  function wireForm(form) {
    if (!form) return;
    const note = form.querySelector('[data-form-note]');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = new FormData(form);
      const name = String(fields.get('name') || '').trim();
      const phone = String(fields.get('phone') || '').trim();
      let message = String(fields.get('message') || '').trim();
      const service = String(fields.get('service') || '').trim();
      const date = String(fields.get('date') || '').trim();
      const desiredSlot = String(fields.get('desired_slot') || '').trim();
      const extra = [];
      if (service) extra.push('Послуга: ' + service);
      if (date) extra.push('Дата: ' + date);
      if (desiredSlot) extra.push('Бажаний час прийому: ' + desiredSlot);
      if (extra.length) message = (message ? message + '. ' : '') + extra.join('; ');

      if (phone.replace(/\D/g, '').length < 9) {
        showNote('Вкажіть коректний номер телефону.', true);
        return;
      }

      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = 'Надсилаємо…';

      try {
        const response = await fetch('send.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name, phone, message, desired_slot: desiredSlot, website: fields.get('website') })
        });
        const rawText = await response.text();
        let result;
        try { result = JSON.parse(rawText); }
        catch (_) {
          console.error('Мамин Дім: сервер повернув не-JSON відповідь:', rawText);
          throw new Error('bad-json');
        }
        if (!response.ok || !result.success) {
          console.error('Мамин Дім: заявка не надіслана.', result);
          throw new Error('send-failed');
        }
        showNote('Дякуємо! Перенаправляємо…', false);
        form.reset();
        window.setTimeout(() => { window.location.href = 'thank-you.html'; }, 600);
      } catch (_) {
        showNote('Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте нам.', true);
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });

    function showNote(text, isError) {
      if (!note) return;
      note.textContent = text;
      note.hidden = false;
      note.className = 'form-note ' + (isError ? 'is-error' : 'is-ok');
    }
  }

  document.querySelectorAll('[data-popup-form]').forEach(wireForm);

  /* ==========================================================
     СПИСОК ПРОБЛЕМ НА МОБІЛЬНОМУ — показуємо перші 3, решту
     ховаємо за кнопкою "Переглянути всі проблеми"
     ========================================================== */
  const problemsGrid = document.querySelector('[data-problems-grid]');
  const problemsToggle = document.querySelector('[data-problems-toggle]');
  if (problemsGrid && problemsToggle) {
    problemsGrid.setAttribute('data-collapsed', '');
    const toggleText = problemsToggle.querySelector('[data-problems-toggle-text]');
    problemsToggle.addEventListener('click', () => {
      const isCollapsed = problemsGrid.hasAttribute('data-collapsed');
      if (isCollapsed) {
        problemsGrid.removeAttribute('data-collapsed');
        toggleText.textContent = 'Сховати';
        problemsToggle.classList.add('is-open');
      } else {
        problemsGrid.setAttribute('data-collapsed', '');
        toggleText.textContent = 'Переглянути всі проблеми';
        problemsToggle.classList.remove('is-open');
        problemsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ==========================================================
     СЛОТИ — вибір бажаної дати й часу прийому
     Педіатри приймають щодня з 09:00 до 18:00.
     Це не "жива" синхронізація із записом — просто зручний спосіб
     одразу вказати, коли пацієнту зручно, тому статусів
     "вільно/зайнято" тут немає: усі показані варіанти клікабельні,
     клік одразу відкриває форму запису з обраним часом як побажанням.
     ========================================================== */
  (function slotsPicker() {
    const dateTabsEl = document.querySelector('[data-slots-date-tabs]');
    const timeGridEl = document.querySelector('[data-slots-time-grid]');
    if (!dateTabsEl || !timeGridEl) return;

    const CLINIC_NAME = 'Мамин Дім';
    const MONTHS_UA = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    const DAYS_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const WORKING_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
    const START_HOUR = 9;
    const END_HOUR = 18;

    function isWorkingDay(date) {
      return WORKING_WEEKDAYS.indexOf(date.getDay()) !== -1;
    }

    function dateKey(d) {
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    // список найближчих 5 робочих днів педіатра
    const days = [];
    let cursor = new Date();
    let guard = 0;
    while (days.length < 5 && guard < 21) {
      if (isWorkingDay(cursor)) days.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 86400000);
      guard++;
    }

    let activeIndex = 0;

    function renderTabs() {
      dateTabsEl.innerHTML = '';
      days.forEach((d, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slots-date-tab' + (i === activeIndex ? ' is-active' : '');
        const isToday = dateKey(d) === dateKey(new Date());
        const label = isToday ? 'Сьогодні' : DAYS_UA[d.getDay()];
        btn.innerHTML = '<div>' + label + '</div><span>' + d.getDate() + ' ' + MONTHS_UA[d.getMonth()] + '</span>';
        btn.addEventListener('click', () => {
          activeIndex = i;
          renderTabs();
          renderGrid();
        });
        dateTabsEl.appendChild(btn);
      });
    }

    function renderGrid() {
      const d = days[activeIndex];
      timeGridEl.innerHTML = '';

      const now = new Date();
      const isToday = dateKey(d) === dateKey(now);
      const slots = [];
      for (let h = START_HOUR; h < END_HOUR; h++) {
        for (let m = 0; m < 60; m += 30) {
          if (isToday && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()))) continue;
          slots.push({ h, m });
        }
      }

      if (!slots.length) {
        const empty = document.createElement('div');
        empty.className = 'slots-empty';
        empty.textContent = 'На цю дату час прийому вже минув — оберіть інший день';
        timeGridEl.appendChild(empty);
        return;
      }

      const dateLabel = d.getDate() + ' ' + MONTHS_UA[d.getMonth()];

      slots.forEach((s) => {
        const timeStr = String(s.h).padStart(2, '0') + ':' + String(s.m).padStart(2, '0');

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'slots-time-card';
        card.innerHTML =
          '<b>' + timeStr + '</b>' +
          '<em>' + dateLabel + '</em>' +
          '<span>' + CLINIC_NAME + '</span>';

        card.addEventListener('click', () => {
          const slotLabel = timeStr + ', ' + dateLabel;
          document.querySelectorAll('[data-desired-slot-field]').forEach((el) => { el.value = slotLabel; });
          document.querySelectorAll('[data-popup-slot-note]').forEach((el) => {
            el.textContent = '🕒 Обраний час прийому: ' + slotLabel;
            el.hidden = false;
          });
          const openBtn = document.querySelector('[data-open-popup="booking"]');
          if (openBtn) openBtn.click();
        });
        timeGridEl.appendChild(card);
      });
    }

    renderTabs();
    renderGrid();
  })();
})();
