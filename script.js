const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Hamburger / mobile nav
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
const navOverlay = document.getElementById('nav-overlay');
if (navToggle && navLinks) {
  const closeMenu = () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
    navOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  };
  const openMenu = () => {
    navToggle.classList.add('open');
    navLinks.classList.add('open');
    navOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  navToggle.addEventListener('click', () => {
    navLinks.classList.contains('open') ? closeMenu() : openMenu();
  });
  navOverlay?.addEventListener('click', closeMenu);
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

// Animated stat counters
const counters = document.querySelectorAll('.counter');
if (counters.length) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (eased * target).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach(el => counterObserver.observe(el));
}

const WHATSAPP_NUMBER = '32469226035';

const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
  const serviceSelect = document.getElementById('dienst');
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('dienst');
  if (preset && serviceSelect && [...serviceSelect.options].some(o => o.value === preset)) {
    serviceSelect.value = preset;
  }

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('naam').value.trim();
    const telefoon = document.getElementById('telefoon').value.trim();
    const dienst = serviceSelect.selectedOptions[0]?.text || '';
    const datum = document.getElementById('datum').value;
    const tijd = document.getElementById('tijd').value;
    const bericht = document.getElementById('bericht').value.trim();

    const lines = [
      `Hallo Weblity, ik wil graag een afspraak boeken.`,
      `Naam: ${naam}`,
      `Telefoon: ${telefoon}`,
      `Dienst: ${dienst}`,
      datum ? `Gewenste datum: ${datum}` : null,
      tijd ? `Gewenste tijd: ${tijd}` : null,
      bericht ? `Bericht: ${bericht}` : null,
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');

    const confirm = document.getElementById('booking-confirm');
    if (confirm) confirm.classList.add('show');
  });
}
