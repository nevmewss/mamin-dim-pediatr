document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.querySelectorAll('.accordion details').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    document.querySelectorAll('.accordion details[open]').forEach((other) => {
      if (other !== item) other.removeAttribute('open');
    });
  });
});

document.querySelectorAll('.service-cards, .doctor-grid, .price-grid').forEach((track) => {
  const controls = document.createElement('div');
  controls.className = 'mobile-slider-controls';
  controls.innerHTML = `
    <button class="slider-prev" type="button" aria-label="Попередній слайд">←</button>
    <span class="slider-status" aria-live="polite"></span>
    <button class="slider-next" type="button" aria-label="Наступний слайд">→</button>
  `;
  track.after(controls);

  const cards = [...track.children];
  const previous = controls.querySelector('.slider-prev');
  const next = controls.querySelector('.slider-next');
  const status = controls.querySelector('.slider-status');
  const step = () => {
    if (!cards[0]) return track.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  };
  const update = () => {
    const overflowing = track.scrollWidth > track.clientWidth + 2;
    controls.classList.toggle('is-active', overflowing);
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    const current = Math.min(cards.length, Math.round(track.scrollLeft / Math.max(1, step())) + 1);
    status.textContent = `${current} / ${cards.length}`;
  };

  previous.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  requestAnimationFrame(update);
});

const availabilityRemaining = document.querySelector('#availability-remaining');
const availabilityTotal = document.querySelector('#availability-total');
const availabilityProgress = document.querySelector('#availability-progress');

if (availabilityRemaining && availabilityTotal && availabilityProgress) {
  const kyivFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  });

  const stableHash = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const dateKey = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');

  const updateAvailability = () => {
    const values = Object.fromEntries(
      kyivFormatter.formatToParts(new Date())
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    );
    const kyivDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
    const weekdayIndex = (kyivDate.getUTCDay() + 6) % 7;
    const monday = new Date(kyivDate);
    monday.setUTCDate(kyivDate.getUTCDate() - weekdayIndex);
    const weekKey = dateKey(monday);
    const total = 15 + (stableHash(`capacity-${weekKey}`) % 11);

    const effectiveDate = new Date(kyivDate);
    let effectiveKey;
    if (Number(values.hour) < 12) {
      if (weekdayIndex === 0) {
        effectiveKey = `${weekKey}-opening`;
      } else {
        effectiveDate.setUTCDate(effectiveDate.getUTCDate() - 1);
        effectiveKey = dateKey(effectiveDate);
      }
    } else {
      effectiveKey = dateKey(effectiveDate);
    }

    const dailyRanges = [
      [0.58, 0.82],
      [0.46, 0.72],
      [0.34, 0.60],
      [0.22, 0.46],
      [0.10, 0.32],
      [0.06, 0.24],
      [0.04, 0.18]
    ];
    const effectiveWeekday = (effectiveDate.getUTCDay() + 6) % 7;
    const [minimum, maximum] = dailyRanges[effectiveWeekday];
    const fraction = (stableHash(`remaining-${weekKey}-${effectiveKey}`) % 1000) / 999;
    const remaining = Math.max(1, Math.min(total - 1, Math.round(total * (minimum + fraction * (maximum - minimum)))));

    availabilityRemaining.textContent = String(remaining);
    availabilityTotal.textContent = String(total);
    availabilityProgress.style.width = `${Math.round((remaining / total) * 100)}%`;
    availabilityRemaining.parentElement.setAttribute('aria-label', `Залишилося ${remaining} місць із ${total}`);
  };

  updateAvailability();
  window.setInterval(updateAvailability, 60_000);
}
