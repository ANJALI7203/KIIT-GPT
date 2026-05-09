/* ═══════════════════════════════════════════════
   KIIT-GPT · main.js  (shared across all pages)
═══════════════════════════════════════════════ */

// ── Mobile nav toggle ────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const hamburger  = document.getElementById("hamburger");
  const mobileNav  = document.getElementById("mobileNav");
  const navLinks   = document.querySelectorAll(".topnav .nav-links a, .mobile-nav a");

  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", () => {
      mobileNav.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove("open");
      }
    });
  }

  // ── Active link highlight ─────────────────
  const path = window.location.pathname.split("/").pop() || "index.html";
  navLinks.forEach(a => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });

  // ── Scroll-triggered fade-ups ─────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".scroll-reveal").forEach(el => observer.observe(el));

  // ── Animate counter numbers ──────────────
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const duration = 1600;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = prefix + (Number.isInteger(target) ? Math.floor(current) : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll(".counter").forEach(el => counterObserver.observe(el));
});

// ── CSS for scroll-reveal ─────────────────────
const style = document.createElement("style");
style.textContent = `
  .scroll-reveal {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.55s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.4,0,.2,1);
  }
  .scroll-reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(style);