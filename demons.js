(() => {
  const menu = document.getElementById('main-menu');
  const toggle = document.querySelector('.menu-toggle');
  const mobile = window.matchMedia('(max-width: 900px)');
  const setMenu = open => {
    menu?.classList.toggle('menu-collapsed', mobile.matches && !open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
  if (menu && toggle) {
    toggle.hidden = false;
    setMenu(!mobile.matches);
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    mobile.addEventListener('change', () => setMenu(!mobile.matches));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobile.matches && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false); toggle.focus();
      }
    });
    const page = location.pathname.split('/').pop() || 'index.html';
    menu.querySelectorAll('a').forEach(link => {
      if (link.getAttribute('href') === page || (page.startsWith('gallery-') && link.getAttribute('href') === 'gallery.html')) link.setAttribute('aria-current', 'page');
    });
  }
  const motion = document.getElementById('motion-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  try { paused = paused || localStorage.getItem('demons-motion') === 'off'; } catch {}
  const applyMotion = () => {
    document.body.classList.toggle('motion-paused', paused);
    if (motion) { motion.textContent = paused ? 'Effetti: in pausa' : 'Effetti: attivi'; motion.setAttribute('aria-pressed', String(paused)); }
  };
  applyMotion();
  if (motion) {
    motion.hidden = false;
    motion.addEventListener('click', () => { paused = !paused; applyMotion(); try { localStorage.setItem('demons-motion', paused ? 'off' : 'on'); } catch {} });
  }
  reduced.addEventListener('change', e => { paused = e.matches; applyMotion(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!paused) entry.target.classList.add('reveal-ready');
      observer.unobserve(entry.target);
    }), {threshold: .12});
    document.querySelectorAll('.editorial-card,.section-heading,.world-links,.info-block').forEach(el => observer.observe(el));
  }
})();
