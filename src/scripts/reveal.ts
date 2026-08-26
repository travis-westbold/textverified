interface RevealOptions {
  selector: string;
  threshold?: number;
}

export const revealAfterPaint = (selector: string) => {
  const reveal = () => document.querySelectorAll(selector).forEach((element) => {
    element.classList.add('revealed');
  });

  window.requestAnimationFrame(reveal);
  window.setTimeout(reveal, 60);
};

export const revealWhenVisible = ({ selector, threshold = 0.15 }: RevealOptions) => {
  const targets = document.querySelectorAll(selector);
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((target) => target.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold });

  targets.forEach((target) => observer.observe(target));
};
