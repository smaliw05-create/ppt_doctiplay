import './style.css'

console.log('Doctiplay Presentation Initialized');

function init() {
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
        // Once revealed, we can stop observing it
        // observer.unobserve(entry.target); 
      }
    });
  }, {
    threshold: 0.1
    // root: container -- Removing explicit root fixes reveal triggers
  });

  revealElements.forEach(el => observer.observe(el));

  // Force first slide reveal immediately
  const firstSlideReveals = document.querySelectorAll('#slide-1 .reveal');
  firstSlideReveals.forEach(el => {
    el.classList.add('active');
  });

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

  // PDF Export Placeholder
  const pdfBtn = document.getElementById('pdf-export-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      alert("L'export PDF est en cours de finition et sera disponible prochainement.");
    });
  }
}

// Run on load and ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    initMonitor();
  });
} else {
  init();
  setTimeout(initMonitor, 100); // Small delay if already loaded
}


// --- LIVE MONITOR LOGIC ---

const state = {
  fc: 90,
  spo2: 99,
  nibpSys: 100,
  nibpDia: 60,
  targetFc: 90,
  targetSpo2: 99,
  targetNibpSys: 100,
  targetNibpDia: 60
};

// Make accessible to HTML onclick
window.scopeAction = function (type) {
  const toasts = document.querySelectorAll('.scope-toast');
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR');

  let msg = "";

  if (type === 'o2') {
    state.targetSpo2 = 98;
    msg = "O₂ administré";
    let start = state.spo2 > 95 ? 95 : state.spo2;
    animateValue('.val-spo2', start, 98, 2000, 0);
    state.spo2 = 98;
  } else if (type === 'remplissage') {
    state.targetNibpSys = 110;
    state.targetNibpDia = 70;
    msg = "Remplissage initié";
    updateBP(state.nibpSys, state.nibpDia, 110, 70);
    state.nibpSys = 110;
    state.nibpDia = 70;
  } else if (type === 'insuline') {
    state.targetFc = 85;
    msg = "Insulinothérapie débutée";
    animateValue('.val-fc', state.fc, 85, 2000, 0);
    state.fc = 85;
  }

  // Visual feedback
  toasts.forEach(toast => {
    toast.innerText = `[${time}] ${msg}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  });
};

function animateValue(selector, start, end, duration, type) {
  const objects = document.querySelectorAll(selector);
  if (objects.length === 0) return;

  objects.forEach(obj => {
    obj.classList.add('pulse-anim');
    setTimeout(() => obj.classList.remove('pulse-anim'), 300);
  });

  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / (range === 0 ? 1 : range)));

  if (range === 0) return;

  const timer = setInterval(function () {
    current += increment;
    objects.forEach(obj => obj.innerText = current);
    if (current == end) {
      clearInterval(timer);
    }
  }, Math.max(stepTime, 50));
}

function updateBP(s1, d1, s2, d2) {
  const objects = document.querySelectorAll('.val-nibp');
  if (objects.length === 0) return;

  objects.forEach(obj => {
    obj.classList.add('pulse-anim');
    setTimeout(() => obj.classList.remove('pulse-anim'), 300);
  });

  let s = s1;
  let d = d1;
  const timer = setInterval(() => {
    let changed = false;
    if (s != s2) { s += (s < s2 ? 1 : -1); changed = true; }
    if (d != d2 && s % 2 === 0) { d += (d < d2 ? 1 : -1); changed = true; }

    objects.forEach(obj => obj.innerText = `${s}/${d}`);
    if (!changed) clearInterval(timer);
  }, 100);
}


// Canvas Animations
function initMonitor() {
  const monitors = document.querySelectorAll('.live-monitor');

  if (monitors.length === 0) {
    // Retry if not found immediately (e.g. reveal animation delay)
    setTimeout(initMonitor, 500);
    return;
  }

  monitors.forEach(monitor => {
    const ecgCanvas = monitor.querySelector('.ecg-canvas');
    const plethCanvas = monitor.querySelector('.pleth-canvas');

    if (!ecgCanvas || !plethCanvas) return;

    // Robust resize function
    function resize() {
      const parentE = ecgCanvas.parentElement;
      const parentP = plethCanvas.parentElement;

      const rectE = parentE.getBoundingClientRect();
      const rectP = parentP.getBoundingClientRect();

      const wE = rectE.width || parentE.clientWidth;
      const hE = rectE.height || parentE.clientHeight;
      const wP = rectP.width || parentP.clientWidth;
      const hP = rectP.height || parentP.clientHeight;

      if (wE > 0 && hE > 0) {
        ecgCanvas.width = wE;
        ecgCanvas.height = hE;
      }
      if (wP > 0 && hP > 0) {
        plethCanvas.width = wP;
        plethCanvas.height = hP;
      }
    }

    resize();
    setTimeout(resize, 100);
    setTimeout(resize, 1000);
    window.addEventListener('resize', resize);

    const ctxE = ecgCanvas.getContext('2d');
    const ctxP = plethCanvas.getContext('2d');

    let scanX = 0;
    let speed = 1.4;

    function loop() {
      const hE = ecgCanvas.height;
      const midE = hE / 2 + 25;
      const hP = plethCanvas.height;
      const midP = hP / 2 + 15;

      const scanWidth = 14;
      if (scanX + scanWidth < ecgCanvas.width) {
        ctxE.clearRect(scanX, 0, scanWidth, hE);
        ctxP.clearRect(scanX, 0, scanWidth, hP);
      }

      const scaleT = 20;

      // Draw ECG
      ctxE.beginPath();
      ctxE.strokeStyle = '#00ff00';
      ctxE.lineWidth = 1.5;
      const yE_prev = midE + getECG((scanX - speed) * scaleT);
      const yE_curr = midE + getECG(scanX * scaleT);
      ctxE.moveTo(scanX - speed, yE_prev);
      ctxE.lineTo(scanX, yE_curr);
      ctxE.stroke();

      // Draw PLETH
      ctxP.beginPath();
      ctxP.strokeStyle = '#00ffff';
      ctxP.lineWidth = 1.5;
      const yP_prev = midP + getPLETH((scanX - speed) * scaleT);
      const yP_curr = midP + getPLETH(scanX * scaleT);
      ctxP.moveTo(scanX - speed, yP_prev);
      ctxP.lineTo(scanX, yP_curr);
      ctxP.stroke();

      scanX += speed;
      if (scanX >= ecgCanvas.width) {
        scanX = 0;
        ctxE.clearRect(0, 0, speed + 10, hE);
        ctxP.clearRect(0, 0, speed + 10, hP);
      }

      // Update text values per monitor
      const elFc = monitor.querySelector('.val-fc');
      const elSpo2 = monitor.querySelector('.val-spo2');
      const elNibp = monitor.querySelector('.val-nibp');
      if (elFc && elFc.innerText != state.fc) elFc.innerText = state.fc;
      if (elSpo2 && elSpo2.innerText != state.spo2) elSpo2.innerText = state.spo2;
      if (elNibp && elNibp.innerText != `${state.nibpSys}/${state.nibpDia}`) elNibp.innerText = `${state.nibpSys}/${state.nibpDia}`;

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  });

  // Common generators
  function getECG(t) {
    const period = 800;
    const localT = t % period;
    let y = 0;
    if (localT > 180 && localT < 210) y -= 90 * Math.sin((localT - 180) / 30 * Math.PI);
    if (localT > 300 && localT < 450) y -= 12 * Math.sin((localT - 300) / 150 * Math.PI);
    if (localT > 50 && localT < 150) y -= 4 * Math.sin((localT - 50) / 100 * Math.PI);
    return y;
  }

  function getPLETH(t) {
    const period = 800;
    const localT = t % period;
    let y = 0;
    if (localT < 300) y -= Math.sin(localT / 300 * Math.PI) * 45;
    else y -= Math.cos((localT - 300) / 500 * Math.PI / 2) * 45;
    return y;
  }
}
