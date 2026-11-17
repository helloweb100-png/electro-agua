/* =====================================================================
   ELECTRO AGUA · script.js
   JavaScript vanilla (sin librerías): rAF, IntersectionObserver, canvas 2D, SVG.
   Principio: el contenido es visible por defecto; todo efecto solo lo mejora.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   WHATSAPP: una sola constante. 10 dígitos de México, sin el 52.
   Vacía = el botón flotante y el envío se ocultan con elegancia y el
   formulario ofrece copiar el resumen del pedido.
   --------------------------------------------------------------------- */
const WHATSAPP_NUMERO = "";

window.__EA_OK = true; // avisa al respaldo del <head> que el script cargó

/* ---------- Utilidades ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const html = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pad2 = n => String(n).padStart(2, '0');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mqDesk = matchMedia('(min-width:1024px)');
const hoverOK = matchMedia('(hover:hover) and (pointer:fine)').matches;
const safe = (fn, nombre) => { try { fn(); } catch (e) { console.error('[Electro Agua] ' + (nombre || fn.name), e); } };
const isFx = () => html.classList.contains('fx');

/* ---------- WhatsApp ---------- */
const NUM = String(WHATSAPP_NUMERO || '').replace(/\D/g, '');
const HAY_WA = NUM.length >= 10;
function waLink(texto) {
  return 'https://wa.me/52' + NUM.slice(-10) + '?text=' + encodeURIComponent(texto || '');
}

/* ---------- Motor de scroll: un solo bucle rAF que escribe variables CSS ---------- */
const trackers = [];
const onResize = [];
const suave = new Map();
let agendado = false, sigueMoviendo = false;

/** Suaviza un valor hacia su objetivo (movimiento "slow" en los scrubs). */
function sm(clave, objetivo, k = .14) {
  let c = suave.has(clave) ? suave.get(clave) : objetivo;
  c += (objetivo - c) * (reduce ? 1 : k);
  if (Math.abs(objetivo - c) < .0006) c = objetivo; else sigueMoviendo = true;
  suave.set(clave, c);
  return c;
}
function addTracker(fn) { trackers.push(fn); }
function tick() {
  agendado = false; sigueMoviendo = false;
  const vh = innerHeight;
  for (const f of trackers) { try { f(vh); } catch (e) { console.error('[Electro Agua] tracker', e); } }
  if (sigueMoviendo) agendar();
}
function agendar() { if (!agendado) { agendado = true; requestAnimationFrame(tick); } }
addEventListener('scroll', agendar, { passive: true });
let tResize;
addEventListener('resize', () => {
  clearTimeout(tResize);
  tResize = setTimeout(() => { onResize.forEach(f => safe(f, 'resize')); geoRevelar(); agendar(); }, 120);
});
/** Progreso de una sección alta con contenido pinneado (0→1). */
function pinP(el, vh) { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - vh)); }

/* =====================================================================
   1 · CARGADOR (la gota que se llena) · máx. 2.3 s
   ===================================================================== */
function initCargador() {
  const c = $('#cargador');
  if (!c) { listo(); return; }
  const n = $('#carga-n');
  const dur = reduce ? 500 : 1500;
  const tSale = reduce ? 700 : 1700, tFuera = reduce ? 1100 : 2200;
  function paso(now) {
    const p = clamp(now / dur);
    const v = Math.round(p * p * (3 - 2 * p) * 100);
    if (n) n.textContent = pad2(v) + '%';
    if (p < 1) requestAnimationFrame(paso); else { if (n) n.textContent = '100%'; c.classList.add('lleno'); }
  }
  requestAnimationFrame(paso);
  // performance.now() cuenta desde que empezó la navegación: si el script tarda, no se espera de más.
  setTimeout(() => { c.classList.add('sale'); listo(); }, Math.max(0, tSale - performance.now()));
  setTimeout(() => { c.style.display = 'none'; c.setAttribute('aria-hidden', 'true'); }, Math.max(150, tFuera - performance.now()));
}
function listo() {
  html.classList.add('is-ready');
  html.classList.remove('cargando');
  geoRevelar();
  agendar();
}

/* =====================================================================
   2 · REVELADO (IntersectionObserver + respaldo por geometría)
   ===================================================================== */
let pendientes = [], ioRev = null;
function mostrar(el) {
  el.classList.add('is-in');
  pendientes = pendientes.filter(x => x !== el);
  if (ioRev) ioRev.unobserve(el);
}
/** Respaldo: revela todo lo que ya esté dentro de la ventana, aunque el observador falle. */
function geoRevelar() {
  if (!html.classList.contains('is-ready')) return;
  const vh = innerHeight;
  for (const el of pendientes.slice()) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.top < vh * .94 && r.bottom > 0) mostrar(el);
  }
}
let geoCola = false;
function geoAgendar() { if (!geoCola) { geoCola = true; requestAnimationFrame(() => { geoCola = false; geoRevelar(); }); } }

function dividirPalabras(el) {
  const texto = el.textContent.trim();
  const palabras = texto.split(/\s+/);
  el.setAttribute('aria-label', texto);
  el.textContent = '';
  palabras.forEach((w, i) => {
    const m = document.createElement('span');
    m.className = 'mask'; m.style.setProperty('--i', i); m.setAttribute('aria-hidden', 'true');
    const s = document.createElement('span'); s.textContent = w;
    m.appendChild(s); el.appendChild(m);
    if (i < palabras.length - 1) el.appendChild(document.createTextNode(' '));
  });
  el.classList.add('split');
}
function initReveal() {
  $$('[data-split]').forEach(h => safe(() => dividirPalabras(h), 'split'));
  pendientes = $$('[data-reveal],[data-split]');
  if ('IntersectionObserver' in window) {
    ioRev = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting && html.classList.contains('is-ready')) mostrar(e.target); });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    pendientes.forEach(el => ioRev.observe(el));
  }
  addEventListener('scroll', geoAgendar, { passive: true });
  addEventListener('resize', geoAgendar);
  addEventListener('load', () => { geoRevelar(); setTimeout(geoRevelar, 2000); });
  setTimeout(geoRevelar, 2000);
  setTimeout(geoRevelar, 3200);
}

/* =====================================================================
   3 · WHATSAPP (enlaces, flotante, tooltip)
   ===================================================================== */
function initWA() {
  const flot = $('#wa-flot');
  $$('[data-wa]').forEach(a => {
    const msg = a.dataset.msg || 'Hola, quiero información de Electro Agua.';
    if (HAY_WA) {
      a.href = waLink(msg); a.target = '_blank'; a.rel = 'noopener';
    } else {
      // Sin número: el CTA lleva al formulario y precarga la intención del visitante
      a.addEventListener('click', () => {
        const t = $('#f-msg');
        if (t && !t.value.trim()) {
          const limpio = msg.replace(/^Hola,\s*/i, '');
          t.value = limpio.charAt(0).toUpperCase() + limpio.slice(1);
        }
      });
    }
  });
  if (!flot) return;
  if (!HAY_WA) { flot.hidden = true; return; }
  flot.hidden = false;
  flot.href = waLink('Hola, quiero información sobre insumos, refacciones y mantenimiento para mi planta purificadora.');
  const tip = $('.wa-tip', flot);
  setTimeout(() => { tip.classList.add('ver'); setTimeout(() => tip.classList.remove('ver'), 6000); }, 6000);
  // Sube un poco sobre el pie para no tapar contenido
  const pie = $('#pie');
  addTracker(vh => {
    if (!pie) return;
    const up = clamp(vh - pie.getBoundingClientRect().top, 0, 400);
    flot.style.setProperty('--wa-up', up.toFixed(0) + 'px');
  });
}

/* =====================================================================
   4 · HEADER (tema por sección) y MENÚ MÓVIL (foco atrapado, Esc)
   ===================================================================== */
function initHeader() {
  const cab = $('#cabecera');
  if (!cab) return;
  const secs = $$('[data-tema]').filter(s => s !== cab);
  html.dataset.tema = 'oscuro';
  addTracker(() => {
    cab.classList.toggle('solido', scrollY > 40);
    let tema = 'oscuro';
    for (const s of secs) {
      const r = s.getBoundingClientRect();
      if (r.top <= 52 && r.bottom > 52) { tema = s.dataset.tema; break; }
    }
    if (cab.dataset.tema !== tema) { cab.dataset.tema = tema; html.dataset.tema = tema; }
  });
}
function initMenu() {
  const b = $('#burger'), m = $('#menu'), cab = $('#cabecera');
  if (!b || !m) return;
  let previo = null;
  function abrir() {
    previo = document.activeElement;
    m.classList.add('abierto'); m.setAttribute('aria-hidden', 'false');
    b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-label', 'Cerrar menú');
    html.classList.add('menu-abierto'); cab.classList.add('menu-on');
    setTimeout(() => { const f = $('a', m); if (f) f.focus(); }, 150);
  }
  function cerrar(devolverFoco = true) {
    m.classList.remove('abierto'); m.setAttribute('aria-hidden', 'true');
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Abrir menú');
    html.classList.remove('menu-abierto'); cab.classList.remove('menu-on');
    if (devolverFoco && previo && previo.focus) previo.focus();
  }
  b.addEventListener('click', () => (m.classList.contains('abierto') ? cerrar() : abrir()));
  m.addEventListener('click', e => { if (e.target.closest('a')) cerrar(false); });
  document.addEventListener('keydown', e => {
    if (!m.classList.contains('abierto')) return;
    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key === 'Tab') {
      const f = [...$$('a[href]', m), b];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  mqDesk.addEventListener && mqDesk.addEventListener('change', e => { if (e.matches) cerrar(false); });
}

/* =====================================================================
   5 · BARRA / TUBO DE FLUJO
   ===================================================================== */
function initFlujo() {
  const etq = $('#tubo-etiq'), pts = $('#tubo-puntos');
  const secs = $$('main > section');
  function puntos() {
    if (!pts) return;
    pts.innerHTML = '';
    const H = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    secs.forEach(s => {
      const y = s.getBoundingClientRect().top + scrollY;
      const i = document.createElement('i');
      i.style.top = clamp(y / H) * 100 + '%';
      pts.appendChild(i);
    });
  }
  puntos(); onResize.push(puntos);
  addEventListener('load', puntos);
  let ult = -1;
  addTracker(() => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = clamp(scrollY / max);
    html.style.setProperty('--flujo', p.toFixed(4));
    const pc = Math.round(p * 100);
    if (pc !== ult && etq) { ult = pc; etq.textContent = 'FLUJO ' + pc + '%'; }
  });
}

/* =====================================================================
   6 · HERO: canvas (burbujas, nieve marina, ondas, arco eléctrico) + orbe 3D
   ===================================================================== */
function initHero() {
  const cv = $('#lienzo'), hero = $('#inicio'), orbe = $('#orbe'), par = $('#orbe-par');
  if (!cv || !hero) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  let W = 1, H = 1, dpr = 1, t = 0, ultimo = 0, visible = true, corriendo = false;
  const burbujas = [], nieve = [], ondas = [];
  let arco = null, proximoArco = 1.8;
  const ptr = { x: -999, y: -999, on: false };
  let rx = 0, ry = 0;

  // Sprite de burbuja pre-renderizado (barato de dibujar)
  const spr = document.createElement('canvas'); spr.width = spr.height = 64;
  (function () {
    const g = spr.getContext('2d');
    const gr = g.createRadialGradient(24, 22, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.35, 'rgba(25,211,243,.38)');
    gr.addColorStop(.8, 'rgba(25,211,243,.12)'); gr.addColorStop(1, 'rgba(25,211,243,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(190,245,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(32, 32, 29, 0, 6.2832); g.stroke();
  })();

  function nueva(inicio) {
    return {
      x0: Math.random() * W, y: inicio ? Math.random() * H : H + 10 + Math.random() * 60,
      r: 1 + Math.random() * 4, v: 12 + Math.random() * 28, ph: Math.random() * 6.28,
      amp: 6 + Math.random() * 14, fr: .6 + Math.random() * 1.2, ox: 0, oy: 0
    };
  }
  function medir() {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 640 ? 24 : Math.min(70, Math.round(W / 20));
    while (burbujas.length < n) burbujas.push(nueva(true));
    burbujas.length = n;
    const ns = W < 640 ? 40 : 90;
    while (nieve.length < ns) nieve.push({ x: Math.random() * W, y: Math.random() * H, r: .4 + Math.random() * .9, v: 3 + Math.random() * 8, ph: Math.random() * 6.28 });
    nieve.length = ns;
  }

  function nuevoArco() {
    if (!orbe) return;
    const hr = hero.getBoundingClientRect(), or = orbe.getBoundingClientRect();
    if (or.bottom < hr.top || or.top > hr.bottom || (parseFloat(par && par.style.getPropertyValue('--hp')) || 0) > .7) return;
    const cx = or.left + or.width / 2 - hr.left, cy = or.top + or.height / 2 - hr.top, R = or.width / 2;
    const a = Math.random() * 6.2832, a2 = a + (Math.random() - .5) * .9, len = 120 + Math.random() * 220;
    const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R;
    arco = { sx, sy, ex: sx + Math.cos(a2) * len, ey: sy + Math.sin(a2) * len, vida: 0, rehecho: false, pts: null };
    armarArco();
  }
  function armarArco() {
    const n = 8, dx = arco.ex - arco.sx, dy = arco.ey - arco.sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, o = (i === 0 || i === n) ? 0 : (Math.random() * 2 - 1) * 12;
      pts.push([arco.sx + dx * k + nx * o, arco.sy + dy * k + ny * o]);
    }
    arco.pts = pts;
  }
  function trazar(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }

  function dibujar(dt) {
    ctx.clearRect(0, 0, W, H);
    // nieve marina
    ctx.fillStyle = 'rgba(200,240,255,1)';
    for (const s of nieve) {
      s.y -= s.v * dt * .5; s.x += Math.sin(t * .5 + s.ph) * .15;
      if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
      ctx.globalAlpha = .22 + .22 * Math.sin(t + s.ph);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // burbujas (se apartan del puntero a 120 px)
    for (const b of burbujas) {
      b.y -= b.v * dt;
      const x = b.x0 + Math.sin(t * b.fr + b.ph) * b.amp;
      if (ptr.on) {
        const dx = x + b.ox - ptr.x, dy = b.y + b.oy - ptr.y, d = Math.hypot(dx, dy);
        if (d < 120 && d > .1) { const f = (120 - d) / 120; b.ox += dx / d * f * 420 * dt; b.oy += dy / d * f * 420 * dt; }
      }
      const dec = Math.pow(.25, dt); b.ox *= dec; b.oy *= dec;
      if (b.y < -20) { Object.assign(b, nueva(false)); }
      const sz = b.r * 4.8;
      ctx.globalAlpha = .85;
      ctx.drawImage(spr, x + b.ox - sz / 2, b.y + b.oy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    // ondas concéntricas (clic / toque)
    for (let i = ondas.length - 1; i >= 0; i--) {
      const o = ondas[i];
      if (o.espera > 0) { o.espera -= dt; continue; }
      o.r += dt * 120; o.a -= dt * .55;
      if (o.a <= 0) { ondas.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(25,211,243,' + o.a.toFixed(3) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.2832); ctx.stroke();
    }
    // arco eléctrico lima
    if (!reduce) {
      proximoArco -= dt;
      if (proximoArco <= 0) { proximoArco = 2.6 + Math.random() * 1.6; nuevoArco(); }
    }
    if (arco) {
      arco.vida += dt;
      if (arco.vida > .09 && !arco.rehecho) { arco.rehecho = true; armarArco(); }
      const a = 1 - arco.vida / .25;
      if (a <= 0) arco = null;
      else {
        ctx.save(); ctx.globalAlpha = clamp(a); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.shadowColor = '#D4FF3F'; ctx.shadowBlur = 12; ctx.strokeStyle = '#D4FF3F'; ctx.lineWidth = 2; trazar(arco.pts);
        ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = .8; trazar(arco.pts);
        ctx.restore();
      }
    }
  }

  function inclinar() {
    if (!orbe) return;
    let oRx = 0, oRy = 0;
    if (hoverOK && ptr.on) {
      const hr = hero.getBoundingClientRect(), or = orbe.getBoundingClientRect();
      const cx = or.left + or.width / 2 - hr.left, cy = or.top + or.height / 2 - hr.top;
      oRy = clamp((ptr.x - cx) / (W * .5), -1, 1) * 12;
      oRx = -clamp((ptr.y - cy) / (H * .5), -1, 1) * 12;
    }
    // balanceo suave constante
    oRx += Math.sin(t * .6) * 3; oRy += Math.cos(t * .5) * 4;
    rx = lerp(rx, oRx, .06); ry = lerp(ry, oRy, .06);
    orbe.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    orbe.style.setProperty('--ry', ry.toFixed(2) + 'deg');
  }

  function cuadro(now) {
    if (!corriendo) return;
    const dt = Math.min(.05, (now - ultimo) / 1000 || .016);
    ultimo = now; t += dt;
    dibujar(dt); inclinar();
    requestAnimationFrame(cuadro);
  }
  function arrancar() {
    if (reduce || corriendo || !visible || document.hidden) return;
    corriendo = true; ultimo = performance.now(); requestAnimationFrame(cuadro);
  }
  function parar() { corriendo = false; }

  medir();
  if (reduce) { dibujar(0); } else { arrancar(); }
  onResize.push(() => { medir(); if (reduce) dibujar(0); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? arrancar() : parar(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : arrancar()));

  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { ptr.on = false; });
  hero.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') ptr.on = false; });
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < 3; i++) ondas.push({ x, y, r: 4, a: .7, espera: i * .16 });
  });

  // Parallax del orbe con el scroll
  let hpUlt = -1;
  addTracker(() => {
    if (!par) return;
    const r = hero.getBoundingClientRect();
    const hp = clamp(-r.top / (r.height * .8));
    if (Math.abs(hp - hpUlt) > .002) { hpUlt = hp; par.style.setProperty('--hp', hp.toFixed(3)); }
  });
}

/* =====================================================================
   7 · MANIFIESTO: lectura por palabras con scrub
   ===================================================================== */
function initManifiesto() {
  const p = $('#manif-texto');
  if (!p || reduce) return;
  const palabras = [];
  (function recorrer(nodo) {
    Array.from(nodo.childNodes).forEach(h => {
      if (h.nodeType === 3) {
        const frag = document.createDocumentFragment();
        h.textContent.split(/(\s+)/).forEach(parte => {
          if (!parte) return;
          if (/^\s+$/.test(parte)) frag.appendChild(document.createTextNode(parte));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = parte; frag.appendChild(s); palabras.push(s); }
        });
        h.replaceWith(frag);
      } else if (h.nodeType === 1) recorrer(h);
    });
  })(p);
  const N = palabras.length;
  const ult = new Array(N).fill(-1);
  addTracker(vh => {
    const r = p.getBoundingClientRect();
    const pr = sm('manif', clamp((vh * .85 - r.top) / (vh * .5)));
    palabras.forEach((w, i) => {
      const o = clamp((pr * (N + 6) - i) / 6);
      const v = +(.14 + .86 * o).toFixed(2);
      if (v !== ult[i]) { ult[i] = v; w.style.opacity = v; w.classList.toggle('on', o > .95); }
    });
  });
}

/* =====================================================================
   8 · SERVICIOS: pila de tarjetas (la anterior se reduce)
   ===================================================================== */
function initServ() {
  const cartas = $$('.carta');
  if (cartas.length < 2 || reduce) return;
  let tops = [];
  const medir = () => { tops = cartas.map(c => parseFloat(getComputedStyle(c).top) || 0); };
  medir(); onResize.push(medir);
  addTracker(vh => {
    cartas.forEach((c, i) => {
      if (i === cartas.length - 1) return;
      const sig = cartas[i + 1].getBoundingClientRect();
      const span = c.offsetHeight + vh * .07;
      const p = clamp(1 - (sig.top - tops[i + 1]) / span);
      c.style.setProperty('--k', sm('c' + i, p).toFixed(3));
    });
  });
}

/* =====================================================================
   9 · ANATOMÍA DE UNA PLANTA (pinneada con scrub)
   ===================================================================== */
function initAnat() {
  const sec = $('#planta'), svg = $('#diag');
  if (!sec || !svg || !isFx()) return;
  const NS = 'http://www.w3.org/2000/svg';
  const nombres = ['SEDIMENTOS', 'CARBÓN ACTIVADO', 'SUAVIZADOR', 'ÓSMOSIS INVERSA', 'LUZ UV', 'LLENADO'];
  const iconos = ['ic-sed', 'ic-carbon', 'ic-suav', 'ic-osm', 'ic-uv', 'ic-lleno'];
  const tubo = $('.tubo', svg), tuboIn = $('.tubo-in', svg);
  const ags = [$('.ag1', svg), $('.ag2', svg), $('.ag3', svg)];
  const gEst = $('.est-grupo', svg), gGot = $('.gotas-grupo', svg);
  const lis = $$('.etapa', sec), medA = $('#med-anillo'), medE = $('#med-etq');
  const MODOS = {
    v: { vb: '0 0 360 330', d: 'M44 24V306', ts: [.05, .23, .41, .59, .77, .95], fs: 12, r: 17 },
    h: { vb: '0 0 1100 520', d: 'M40 130H900C1060 130 1060 390 900 390H40', ts: [.087, .207, .327, .673, .793, .913], fs: 19, r: 28 }
  };
  const etiquetas = ['AGUA CRUDA', 'CLARIFICANDO', 'CLARIFICANDO', 'CASI PURA', 'CASI PURA', 'LISTA PARA ENVASAR'];
  let modo = '', L = 1, ests = [], ts = [], gotas = [], idx = -1, fAct = 0, pAct = 0;

  function construir(m) {
    modo = m;
    const M = MODOS[m];
    svg.setAttribute('viewBox', M.vb);
    svg.style.setProperty('--fs', M.fs + 'px');
    [tubo, tuboIn, ...ags].forEach(p => p.setAttribute('d', M.d));
    L = tubo.getTotalLength();
    ags.forEach(a => { a.style.strokeDasharray = L + ' ' + L; a.style.strokeDashoffset = L; });
    gEst.innerHTML = ''; ests = []; ts = M.ts;
    ts.forEach((t, i) => {
      const pt = tubo.getPointAtLength(L * t);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'est');
      g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      g.innerHTML = '<circle class="est-pulso" r="' + M.r + '"/><g class="est-cuerpo"><circle class="est-c" r="' + M.r + '"/><use href="#' + iconos[i] + '" x="' + (-M.r * .6) + '" y="' + (-M.r * .6) + '" width="' + (M.r * 1.2) + '" height="' + (M.r * 1.2) + '"/></g>';
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('class', 'est-t');
      tx.textContent = pad2(i + 1) + ' ' + nombres[i];
      if (m === 'v') { tx.setAttribute('x', M.r + 14); tx.setAttribute('y', 4); }
      else { tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('y', i < 3 ? -(M.r + 22) : (M.r + 38)); }
      g.appendChild(tx); gEst.appendChild(g); ests.push(g);
    });
    gGot.innerHTML = '';
    gotas = [0, 1, 2, 3].map(k => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'gota-d'); c.setAttribute('r', m === 'v' ? 3 : 4.5); c.setAttribute('opacity', '0');
      gGot.appendChild(c);
      return { c, off: k / 4 };
    });
    idx = -1;
    aplicar(pAct);
  }
  function fDe(p) {
    const k = [[0, 0]];
    ts.forEach((t, i) => k.push([(i + .5) / 6, t]));
    k.push([1, 1]);
    for (let i = 1; i < k.length; i++) {
      if (p <= k[i][0]) { const [p0, f0] = k[i - 1], [p1, f1] = k[i]; return f0 + (f1 - f0) * ((p - p0) / ((p1 - p0) || 1)); }
    }
    return 1;
  }
  function aplicar(p) {
    pAct = p;
    const f = fAct = fDe(p);
    ags[0].style.strokeDashoffset = (L * (1 - f)).toFixed(1);
    ags[1].style.strokeDashoffset = (L * (1 - clamp(f - .25 * (1 - p)))).toFixed(1);
    ags[2].style.strokeDashoffset = (L * (1 - clamp(f - .5 * (1 - p)))).toFixed(1);
    const nuevo = Math.min(5, Math.floor(p * 6));
    ests.forEach((g, i) => { g.classList.toggle('done', i !== nuevo && f >= ts[i] - .001); });
    if (nuevo !== idx) {
      idx = nuevo;
      ests.forEach((g, i) => g.classList.toggle('on', i === idx));
      lis.forEach((li, i) => { li.classList.toggle('on', i === idx); li.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); });
      if (medE) medE.textContent = etiquetas[idx];
    }
    if (medA) medA.style.strokeDashoffset = (100 * (1 - p)).toFixed(1);
  }
  const elegir = () => (mqDesk.matches ? 'h' : 'v');
  construir(elegir());
  onResize.push(() => { const m = elegir(); if (m !== modo) construir(m); });
  mqDesk.addEventListener && mqDesk.addEventListener('change', () => { const m = elegir(); if (m !== modo) construir(m); });
  addTracker(vh => aplicar(sm('anat', pinP(sec, vh))));

  // Gotas que viajan por el agua ya dibujada (solo mientras la sección es visible)
  let vis = false, raf = 0;
  function gotear(now) {
    raf = 0;
    if (!vis || document.hidden) return;
    const s = now / 1000;
    gotas.forEach(d => {
      if (fAct < .015) { d.c.setAttribute('opacity', '0'); return; }
      const u = (s * .15 + d.off) % 1;
      const pt = tubo.getPointAtLength(L * fAct * u);
      d.c.setAttribute('cx', pt.x.toFixed(1)); d.c.setAttribute('cy', pt.y.toFixed(1));
      d.c.setAttribute('opacity', Math.sin(u * Math.PI).toFixed(2));
    });
    raf = requestAnimationFrame(gotear);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(gotear); }).observe(sec);
  }
}

/* =====================================================================
   10 · FOTO QUE SE ABRE (scroll-zoom en 3 tiempos)
   ===================================================================== */
function initFoto() {
  const sec = $('#garrafon');
  if (!sec || !isFx()) return;
  const tx = [$('.ft1', sec), $('.ft2', sec), $('.ft3', sec), $('.ft-cta', sec)];
  addTracker(vh => {
    const p = pinP(sec, vh);
    const e = ease(clamp(sm('foto', p) / .6));
    sec.style.setProperty('--e', e.toFixed(4));
    tx[0].classList.toggle('on', p > .25);
    tx[1].classList.toggle('on', p > .5);
    tx[2].classList.toggle('on', p > .75);
    tx[3].classList.toggle('on', p > .75);
  });
}

/* =====================================================================
   11 · COMPARADOR arrastrable (con autoanimación hasta que se toca)
   ===================================================================== */
function initComp() {
  const c = $('#comp'), rango = $('#comp-rango');
  if (!c || !rango) return;
  let x = 50, usuario = false, vis = false, raf = 0, arrastrando = false;
  function poner(v) {
    x = clamp(v, 0, 100);
    c.style.setProperty('--x', x.toFixed(2) + '%');
    rango.value = Math.round(x);
    rango.setAttribute('aria-valuetext', 'Se ve ' + Math.round(x) + ' por ciento de la planta sin mantenimiento');
  }
  function auto(now) {
    raf = 0;
    if (usuario || !vis || reduce || document.hidden) return;
    poner(50 + 30 * Math.sin(now / 1000 * .7));
    raf = requestAnimationFrame(auto);
  }
  function desde(e) { const r = c.getBoundingClientRect(); poner((e.clientX - r.left) / r.width * 100); }
  c.addEventListener('pointerdown', e => { usuario = true; arrastrando = true; try { c.setPointerCapture(e.pointerId); } catch (_) { /* nada */ } desde(e); });
  c.addEventListener('pointermove', e => { if (arrastrando) desde(e); });
  const fin = () => { arrastrando = false; };
  c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin);
  rango.addEventListener('input', () => { usuario = true; poner(+rango.value); });
  poner(50);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf && !usuario) raf = requestAnimationFrame(auto); }).observe(c);
  }
}

/* =====================================================================
   12 · SITUACIONES: carril horizontal (pin en escritorio / nativo en móvil)
   ===================================================================== */
function initSit() {
  const sec = $('#situaciones'), car = $('#carril'), pista = $('#pista');
  if (!sec || !car || !pista) return;
  const stage = $('.sit-stage', sec), barra = $('.sit-barra i', sec), n = $('#sit-n');
  let max = 0;
  const pin = () => isFx() && mqDesk.matches;
  const medir = () => { max = Math.max(0, pista.scrollWidth - stage.clientWidth); };
  medir(); onResize.push(medir); addEventListener('load', medir);
  function poner(p) {
    if (barra) barra.style.setProperty('--p', clamp(p).toFixed(3));
    if (n) n.textContent = pad2(Math.round(clamp(p) * 4) + 1);
  }
  addTracker(vh => {
    if (pin()) {
      const p = sm('sit', pinP(sec, vh));
      pista.style.setProperty('--tx', (-p * max).toFixed(1) + 'px');
      poner(p);
    } else if (pista.style.getPropertyValue('--tx')) pista.style.removeProperty('--tx');
  });
  car.addEventListener('scroll', () => {
    if (pin()) return;
    const m = car.scrollWidth - car.clientWidth;
    poner(m > 0 ? car.scrollLeft / m : 0);
  }, { passive: true });
  poner(0);
}

/* =====================================================================
   13 · BENTO: inclinación 3D con brillo que sigue al cursor
   ===================================================================== */
function initBento() {
  if (!hoverOK || reduce) return;
  $$('.celda').forEach(c => {
    const el = $('.celda-in', c);
    if (!el) return;
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((px - .5) * 12).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    c.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

/* =====================================================================
   14 · PROCESO: tubería que se dibuja con el scroll
   ===================================================================== */
function initProc() {
  const w = $('#proc-wrap');
  if (!w) return;
  const linea = $('.proc-linea', w), nodos = $$('.nodo-n', w);
  addTracker(vh => {
    const r = w.getBoundingClientRect();
    const y = vh * .6 - r.top;
    const p = sm('proc', clamp((y - 28) / Math.max(1, r.height - 56)));
    linea.style.setProperty('--p', p.toFixed(4));
    nodos.forEach(n => {
      const nr = n.getBoundingClientRect();
      n.classList.toggle('on', (nr.top + nr.height / 2 - r.top) <= y);
    });
  });
}

/* =====================================================================
   15 · FAQ: acordeón animado, uno abierto a la vez
   ===================================================================== */
function initFaq() {
  if (!isFx()) return;
  const items = $$('.faq-item');
  function abrir(it) { it.open = true; void $('.faq-resp', it).offsetHeight; it.classList.add('abierto'); }
  function cerrar(it) {
    it.classList.remove('abierto');
    const resp = $('.faq-resp', it);
    let hecho = false;
    const fin = () => { if (hecho) return; hecho = true; if (!it.classList.contains('abierto')) it.open = false; };
    resp.addEventListener('transitionend', e => { if (e.target === resp) fin(); }, { once: true });
    setTimeout(fin, 700);
  }
  items.forEach(it => {
    $('summary', it).addEventListener('click', e => {
      e.preventDefault();
      if (it.classList.contains('abierto')) { cerrar(it); return; }
      items.forEach(o => { if (o !== it && o.classList.contains('abierto')) cerrar(o); });
      abrir(it);
    });
  });
}

/* =====================================================================
   16 · CONTACTO: nivel de agua que sube + asistente de pedido en 3 pasos
   ===================================================================== */
function initContacto() {
  const sec = $('#contacto'), nivel = $('#nivel');
  if (sec && nivel && !reduce) {
    addTracker(vh => {
      const r = sec.getBoundingClientRect();
      nivel.style.setProperty('--p', sm('nivel', clamp((vh - r.top) / (r.height * .9))).toFixed(3));
    });
  }
  const f = $('#pedido');
  if (!f) return;
  const pasos = $$('.paso-f', f), barra = $('#form-barra'), txt = $('#form-paso-txt'), err = $('#form-error');
  const bAtras = $('#btn-atras'), bSig = $('#btn-sig'), bEnv = $('#btn-enviar'), aviso = $('#aviso-wa'), bCop = $('#btn-copiar');
  const gracias = $('#gracias'), graciasTxt = $('#gracias-txt'), bNuevo = $('#btn-nuevo');
  let paso = 1;

  function ver(n) {
    paso = n;
    pasos.forEach((s, i) => { s.hidden = (i + 1) !== n; });
    barra.style.width = (n / 3 * 100).toFixed(2) + '%';
    txt.textContent = 'PASO ' + n + ' DE 3';
    bAtras.hidden = n === 1;
    bSig.hidden = n === 3;
    bEnv.hidden = !(n === 3 && HAY_WA);
    aviso.hidden = !(n === 3 && !HAY_WA);
    err.textContent = '';
  }
  function validar(n) {
    if (n === 1 && !$$('input[name="tipo"]:checked', f).length) return 'Elige al menos una opción para continuar.';
    if (n === 2 && !$('input[name="etapa"]:checked', f)) return 'Elige la etapa o marca "No sé".';
    if (n === 3 && !$('#f-nombre').value.trim()) return 'Cuéntanos cómo te llamas para poder ayudarte.';
    return '';
  }
  function resumen() {
    const nombre = $('#f-nombre').value.trim(), pl = $('#f-planta').value.trim(), msg = $('#f-msg').value.trim();
    const tipos = $$('input[name="tipo"]:checked', f).map(i => i.value).join(', ');
    const e = $('input[name="etapa"]:checked', f);
    let t = 'Hola, soy ' + nombre + (pl ? ' de ' + pl : '') + '. Necesito: ' + tipos + '. Etapa: ' + (e ? e.value : 'No sé') + '.';
    if (msg) t += ' ' + msg;
    return t;
  }
  function terminar(texto) {
    pasos.forEach(s => { s.hidden = true; });
    [bAtras, bSig, bEnv, aviso].forEach(b => { b.hidden = true; });
    $('.form-paso-txt', f).textContent = 'LISTO';
    barra.style.width = '100%';
    graciasTxt.textContent = texto;
    gracias.hidden = false; gracias.focus();
  }
  function siguiente() {
    const m = validar(paso);
    if (m) { err.textContent = m; return; }
    ver(paso + 1);
    const primero = $('input,textarea', pasos[paso - 1]);
    if (primero) primero.focus({ preventScroll: true });
  }
  bSig.addEventListener('click', siguiente);
  bAtras.addEventListener('click', () => ver(paso - 1));
  f.addEventListener('change', () => { err.textContent = ''; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (paso < 3) { siguiente(); return; }
    const m = validar(3);
    if (m) { err.textContent = m; return; }
    if (!HAY_WA) return;
    window.open(waLink(resumen()), '_blank', 'noopener');
    terminar('Ya preparamos tu mensaje con el resumen de tu pedido. Si no se abrió WhatsApp, vuelve a intentarlo.');
  });
  bCop.addEventListener('click', () => {
    const m = validar(3);
    if (m) { err.textContent = m; return; }
    const t = resumen();
    const listo = () => terminar('Copiamos el resumen de tu pedido. Estamos habilitando nuestra línea directa: en cuanto esté lista, pégalo y te atendemos.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(listo, () => copiarAlterno(t, listo));
    else copiarAlterno(t, listo);
  });
  function copiarAlterno(t, cb) {
    const a = document.createElement('textarea');
    a.value = t; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (_) { /* nada */ }
    a.remove(); cb();
  }
  bNuevo.addEventListener('click', () => { f.reset(); gracias.hidden = true; ver(1); });
  ver(1);

  // CTA grande: lleva al formulario y enfoca el primer paso
  const cta = $('#cta-pedido');
  if (cta) cta.addEventListener('click', e => {
    e.preventDefault();
    f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { const p = $('input', f); if (p && gracias.hidden) p.focus({ preventScroll: true }); }, 600);
  });
}

/* =====================================================================
   17 · Botones magnéticos (solo escritorio con puntero)
   ===================================================================== */
function initMag() {
  if (!hoverOK || reduce) return;
  const btns = $$('.btn-mag');
  addEventListener('pointermove', e => {
    btns.forEach(b => {
      const r = b.getBoundingClientRect();
      const mx = parseFloat(b.dataset.mx) || 0, my = parseFloat(b.dataset.my) || 0;
      const cx = r.left + r.width / 2 - mx, cy = r.top + r.height / 2 - my;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const cerca = Math.abs(dx) < r.width / 2 + 80 && Math.abs(dy) < r.height / 2 + 80;
      const nx = cerca ? dx * .25 : 0, ny = cerca ? dy * .25 : 0;
      if (nx !== mx || ny !== my) {
        b.dataset.mx = nx; b.dataset.my = ny;
        b.style.setProperty('--mx', nx.toFixed(1) + 'px'); b.style.setProperty('--my', ny.toFixed(1) + 'px');
      }
    });
  }, { passive: true });
}

/* =====================================================================
   18 · Varios: año del pie
   ===================================================================== */
function initMisc() {
  const a = $('#anio');
  if (a) a.textContent = new Date().getFullYear();
}

/* ---------- Arranque ---------- */
function init() {
  if (!reduce) html.classList.add('fx');
  safe(initCargador, 'cargador');
  safe(initReveal, 'reveal');
  safe(initWA, 'wa');
  safe(initHeader, 'header');
  safe(initMenu, 'menu');
  safe(initFlujo, 'flujo');
  safe(initHero, 'hero');
  safe(initManifiesto, 'manifiesto');
  safe(initServ, 'servicios');
  safe(initAnat, 'anatomia');
  safe(initFoto, 'foto');
  safe(initComp, 'comparador');
  safe(initSit, 'situaciones');
  safe(initBento, 'bento');
  safe(initProc, 'proceso');
  safe(initFaq, 'faq');
  safe(initContacto, 'contacto');
  safe(initMag, 'magneticos');
  safe(initMisc, 'misc');
  agendar();
  addEventListener('load', () => { onResize.forEach(f => safe(f, 'load')); agendar(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
