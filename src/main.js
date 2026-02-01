import './style.css'

console.log('Doctiplay Presentation Initialized');

const container = document.getElementById('main');
const indicator = document.getElementById('indicator');

// Progress bar
if (container && indicator) {
  container.addEventListener('scroll', () => {
    const scrollPos = container.scrollTop;
    const height = container.scrollHeight - container.clientHeight;
    const scrolled = height > 0 ? (scrollPos / height) * 100 : 0;
    indicator.style.height = scrolled + '%';
  });
}

// Reveal animations
const revealElements = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, {
  threshold: 0.1
});

revealElements.forEach(el => observer.observe(el));

// Force first slide reveal immediately
const firstSlideReveals = document.querySelectorAll('#slide-1 .reveal');
firstSlideReveals.forEach(el => el.classList.add('active'));

// Keyboard navigation
if (container) {
  window.addEventListener('keydown', (e) => {
    const viewH = container.clientHeight;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      container.scrollBy({ top: viewH, left: 0, behavior: 'smooth' });
    }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      container.scrollBy({ top: -viewH, left: 0, behavior: 'smooth' });
    }
  });
}

// Smooth scroll for anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = document.querySelector(id);
    if (target && container) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
