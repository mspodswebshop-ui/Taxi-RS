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
