/* Shared plumbing for the animated mocks: a demo runs only while it's on
   screen. `running` survives a quick exit/re-entry, so fast scrolling never
   stacks concurrent loops — the old loop simply keeps going. */

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export const runWhileVisible = (
  element: Element,
  loop: (stopped: () => boolean) => Promise<void>,
) => {
  let active = false;
  let running = false;
  const start = async () => {
    if (running) return;
    running = true;
    await loop(() => !active || !element.isConnected);
    running = false;
  };
  if (!('IntersectionObserver' in window)) {
    active = true;
    element.setAttribute('data-animation-state', 'running');
    void start();
    return;
  }
  new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      element.setAttribute('data-animation-state', active ? 'running' : 'paused');
      if (active) void start();
    },
    { threshold: 0.35 },
  ).observe(element);
};
