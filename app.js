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
