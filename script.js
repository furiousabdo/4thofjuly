/* ==================================================================
   YOU'RE MY 4TH OF JULY — SCRIPT
   Vanilla JS. No dependencies.
   ================================================================== */

/* ==================================================================
   CONFIGURATION — edit these to make the page yours
   ================================================================== */
const CONFIG = {
  // ---- Text content ----
  title: "You're My 4th of July",
  subtitle: "No fireworks could ever outshine the way you light up my life.",
  footerText: "Every firework fades\u2026 but you never stop lighting up my world. \u2764\uFE0F",

  // ---- Fireworks show ----
  fireworksAutoDelayMs: 1400,     // delay after page load before the first show starts
  fireworksDurationMs: 13000,     // total show length (10-15s recommended)
  fireworksIntensity: 1,         // 0.6 = sparse/subtle, 1 = default, 1.5 = dense/dramatic
  fireworksLaunchIntervalMs: 550, // average time between automatic launches during a show

  // ---- Images (drop files into /images with these exact names) ----
  images: {
    photo1: "images/photo1.jpeg",
    photo2: "images/photo2.jpeg",
    photo3: "images/photo3.jpeg",
    photo4: "images/photo4.jpeg",
    photo5: "images/photo5.jpeg",
    booth1: "images/booth1.jpeg",
    booth2: "images/booth2.jpeg",
    booth3: "images/booth3.jpeg",
  },

  // ---- Color palette used by the fireworks engine ----
  colorPalette: [
    "#f2d9a1", // bright gold
    "#d9b673", // gold
    "#c65c50", // warm red
    "#f4efe4", // soft white
    "#8fb8c9", // faint sparkler blue (subtle, keeps it from feeling purely red/gold)
    "#e8927c", // soft coral
  ],

  // ---- Music ----
  musicFile: "audio/4thofjuly.mp3", // drop your mp3 here — filename must match
  musicVolume: 0.45,                 // 0 - 1, the volume music fades in to
  musicFadeMs: 2200,                 // how long the fade-in takes
};

/* ==================================================================
   UTILITIES
   ================================================================== */
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ==================================================================
   STARFIELD — quiet, twinkling background stars on <canvas>
   ================================================================== */
(function initStarfield() {
  const canvas = document.getElementById("star-canvas");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    seedStars();
  }

  function seedStars() {
    const count = Math.round((window.innerWidth * window.innerHeight) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.9,
      r: rand(0.4, 1.6) * dpr,
      baseAlpha: rand(0.25, 0.9),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.4, 1.1),
    }));
  }

  let t = 0;
  function draw() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const alpha = s.baseAlpha * (0.5 + 0.5 * twinkle);
      ctx.beginPath();
      ctx.fillStyle = `rgba(244, 239, 228, ${alpha.toFixed(3)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();

/* ==================================================================
   FIREWORKS ENGINE
   Rockets launch with trails + gravity, then explode into glowing,
   fading particles with varied shapes/sizes and additive "bloom".
   ================================================================== */
const Fireworks = (function () {
  const canvas = document.getElementById("fireworks-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  let w, h, dpr;
  let rockets = [];
  let particles = [];
  let running = false;
  let rafId = null;
  let launchTimer = null;
  let stopTimer = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  class Rocket {
    constructor() {
      this.x = rand(w * 0.12, w * 0.88);
      this.y = h + 10;
      this.targetY = rand(h * 0.14, h * 0.5);
      this.vy = rand(-13, -17) * dpr;
      this.vx = rand(-0.6, 0.6) * dpr;
      this.color = pick(CONFIG.colorPalette);
      this.trail = [];
      this.dead = false;
    }
    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 10) this.trail.shift();
      this.vy += 0.12 * dpr; // gravity easing the rocket's ascent
      this.x += this.vx;
      this.y += this.vy;
      if (this.vy >= -2 || this.y <= this.targetY) {
        this.dead = true;
        explode(this.x, this.y, this.color);
      }
    }
    draw() {
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        const alpha = (i / this.trail.length) * 0.5;
        ctx.beginPath();
        ctx.strokeStyle = hexToRgba(this.color, alpha);
        ctx.lineWidth = 1.6 * dpr;
        ctx.moveTo(p.x, p.y);
        const next = this.trail[i + 1] || { x: this.x, y: this.y };
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 5 * dpr);
      grad.addColorStop(0, hexToRgba("#ffffff", 0.9));
      grad.addColorStop(1, hexToRgba(this.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color, opts = {}) {
      this.x = x;
      this.y = y;
      this.color = color;
      const angle = opts.angle ?? rand(0, Math.PI * 2);
      const speed = opts.speed ?? rand(1.5, 7) * dpr;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.gravity = (opts.gravity ?? 0.045) * dpr;
      this.drag = opts.drag ?? 0.985;
      this.life = 1;
      this.decay = opts.decay ?? rand(0.008, 0.016);
      this.size = (opts.size ?? rand(1.2, 2.6)) * dpr;
      this.spark = opts.spark ?? false;
      this.trail = [];
    }
    update() {
      if (this.spark) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 4) this.trail.shift();
      }
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
    }
    draw() {
      if (this.life <= 0) return;
      const alpha = clamp(this.life, 0, 1);
      if (this.spark && this.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = hexToRgba(this.color, alpha * 0.5);
        ctx.lineWidth = this.size * 0.6;
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (const p of this.trail) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.fillStyle = hexToRgba(this.color, alpha);
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hexToRgba(hex, alpha) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function explode(x, y, color) {
    const intensity = CONFIG.fireworksIntensity;
    const shapeRoll = Math.random();
    const baseCount = Math.round(rand(55, 90) * intensity);

    if (shapeRoll < 0.55) {
      for (let i = 0; i < baseCount; i++) {
        const angle = (Math.PI * 2 * i) / baseCount + rand(-0.06, 0.06);
        particles.push(
          new Particle(x, y, color, {
            angle,
            speed: rand(2, 7.5) * dpr,
            spark: Math.random() < 0.3,
          })
        );
      }
    } else if (shapeRoll < 0.8) {
      const ringCount = Math.round(baseCount * 0.55);
      for (let ring = 0; ring < 2; ring++) {
        const speedBase = ring === 0 ? rand(2, 4) : rand(5, 8.5);
        for (let i = 0; i < ringCount; i++) {
          const angle = (Math.PI * 2 * i) / ringCount + rand(-0.08, 0.08);
          particles.push(
            new Particle(x, y, ring === 0 ? color : pick(CONFIG.colorPalette), {
              angle,
              speed: speedBase * dpr,
              spark: Math.random() < 0.25,
            })
          );
        }
      }
    } else {
      for (let i = 0; i < baseCount * 0.8; i++) {
        const angle = rand(0, Math.PI * 2);
        particles.push(
          new Particle(x, y, color, {
            angle,
            speed: rand(1.5, 5) * dpr,
            gravity: 0.09,
            decay: rand(0.006, 0.012),
            spark: true,
          })
        );
      }
    }

    for (let i = 0; i < 6 * intensity; i++) {
      particles.push(
        new Particle(x, y, "#ffffff", {
          angle: rand(0, Math.PI * 2),
          speed: rand(0.5, 3) * dpr,
          size: rand(2, 3.4),
          decay: rand(0.02, 0.035),
        })
      );
    }
  }

  function launchRocket() {
    rockets.push(new Rocket());
  }

  function tick() {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(7, 10, 20, 0.22)";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";

    for (const r of rockets) { r.update(); r.draw(); }
    rockets = rockets.filter((r) => !r.dead);

    for (const p of particles) { p.update(); p.draw(); }
    particles = particles.filter((p) => p.life > 0);

    ctx.globalCompositeOperation = "source-over";

    if (running || particles.length || rockets.length) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, w, h);
    }
  }

  function scheduleLaunches() {
    const delay = CONFIG.fireworksLaunchIntervalMs / CONFIG.fireworksIntensity;
    launchTimer = setTimeout(() => {
      if (!running) return;
      const burstCount = Math.random() < 0.25 ? 2 : 1;
      for (let i = 0; i < burstCount; i++) {
        setTimeout(launchRocket, i * 160);
      }
      scheduleLaunches();
    }, rand(delay * 0.6, delay * 1.4));
  }

  function start() {
    if (running) return; // guard against overlapping shows
    running = true;
    canvas.classList.add("is-active");
    launchRocket();
    scheduleLaunches();

    if (!rafId) rafId = requestAnimationFrame(tick);

    clearTimeout(stopTimer);
    stopTimer = setTimeout(stop, CONFIG.fireworksDurationMs);
  }

  function stop() {
    running = false;
    clearTimeout(launchTimer);
  }

  return { start, get isRunning() { return running; } };
})();

/* ==================================================================
   FIREWORKS TRIGGERS — auto show on load + replay button
   ================================================================== */
window.addEventListener("load", () => {
  setTimeout(() => Fireworks.start(), CONFIG.fireworksAutoDelayMs);
});

const fireworksBtn = document.getElementById("fireworks-btn");
fireworksBtn.addEventListener("click", () => {
  if (Fireworks.isRunning) return; // prevent overlapping/broken shows
  fireworksBtn.classList.add("is-launching");
  Fireworks.start();
  setTimeout(() => fireworksBtn.classList.remove("is-launching"), 600);
});

/* ==================================================================
   BACKGROUND MUSIC — fades in after first interaction, loops, toggle
   ================================================================== */
(function initMusic() {
  const audio = document.getElementById("bg-music");
  const toggleBtn = document.getElementById("music-toggle");
  const iconOn = toggleBtn.querySelector(".music-toggle__icon--on");
  const iconOff = toggleBtn.querySelector(".music-toggle__icon--off");
  const audioSource = audio.querySelector("source");

  audio.volume = 0;
  if (audioSource) {
    audioSource.src = CONFIG.musicFile;
  } else {
    audio.src = CONFIG.musicFile;
  }
  audio.loop = true;
  audio.autoplay = true;
  audio.playsInline = true;
  audio.preload = "auto";
  audio.load();

  let started = false;
  let userMuted = false;
  let fadeInterval = null;

  function fadeVolume(to, duration) {
    clearInterval(fadeInterval);
    const from = audio.volume;
    const steps = 30;
    const stepTime = duration / steps;
    let i = 0;
    fadeInterval = setInterval(() => {
      i++;
      audio.volume = clamp(from + (to - from) * (i / steps), 0, 1);
      if (i >= steps) clearInterval(fadeInterval);
    }, stepTime);
  }

  function startMusic() {
    if (started) return;
    started = true;
    audio.play().then(() => {
      if (!userMuted) fadeVolume(CONFIG.musicVolume, CONFIG.musicFadeMs);
    }).catch(() => {
      started = false;
    });
  }

  const interactionEvents = ["click", "keydown", "touchstart"];
  function onFirstInteraction() {
    startMusic();
    interactionEvents.forEach((evt) => window.removeEventListener(evt, onFirstInteraction));
  }
  interactionEvents.forEach((evt) => window.addEventListener(evt, onFirstInteraction, { passive: true }));

  window.addEventListener("load", () => {
    startMusic();
  });

  toggleBtn.addEventListener("click", () => {
    if (!started) {
      startMusic();
    }

    userMuted = !userMuted;
    toggleBtn.classList.toggle("is-muted", userMuted);
    iconOn.hidden = userMuted;
    iconOff.hidden = !userMuted;

    if (!started) {
      if (userMuted) {
        audio.volume = 0;
      }
      return;
    }

    if (userMuted) {
      fadeVolume(0, 400);
    } else {
      fadeVolume(CONFIG.musicVolume, 500);
    }
  });
})();

/* ==================================================================
   SCROLL REVEAL — fades + rises sections into view
   ================================================================== */
(function initScrollReveal() {
  const hero = document.querySelector(".hero__content");
  requestAnimationFrame(() => {
    setTimeout(() => hero.classList.add("is-visible"), 120);
  });

  const revealTargets = document.querySelectorAll("[data-reveal]:not(.hero__content)");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
  );
  revealTargets.forEach((el) => observer.observe(el));
})();

/* ==================================================================
   AMBIENT FLOATING PARTICLES — soft glowing motes drifting upward
   ================================================================== */
(function initAmbientParticles() {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "ambient-particle";
    const size = rand(2, 4.5);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${rand(0, 100)}vw`;
    el.style.bottom = `${rand(-10, 10)}vh`;
    el.style.setProperty("--drift", `${rand(-40, 40)}px`);
    el.style.setProperty("--peak-opacity", `${rand(0.25, 0.7)}`);
    el.style.animationDuration = `${rand(14, 28)}s`;
    el.style.animationDelay = `${rand(0, 20)}s`;
    document.body.appendChild(el);
  }
})();

/* ==================================================================
   PARALLAX — subtle depth on the ambient glows as the page scrolls
   ================================================================== */
(function initParallax() {
  const goldGlow = document.querySelector(".sky-glow--gold");
  const redGlow = document.querySelector(".sky-glow--red");
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      goldGlow.style.transform = `translateY(${y * 0.12}px)`;
      redGlow.style.transform = `translateY(${y * -0.08}px)`;
      ticking = false;
    });
  }, { passive: true });
})();
