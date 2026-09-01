/**
 * High-performance 2D Canvas Confetti Engine
 * Zero external dependencies, 60fps smooth physics particles.
 */
export function fireConfetti(options = {}) {
  const count = options.count || 80;
  const spread = options.spread || 70;
  const originY = options.originY || 0.6;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const colors = ['#0ea5e9', '#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8'];

  const particles = Array.from({ length: count }, () => {
    const angle = (Math.random() * spread - spread / 2 - 90) * (Math.PI / 180);
    const velocity = 12 + Math.random() * 16;
    return {
      x: canvas.width / 2,
      y: canvas.height * originY,
      vx: Math.cos(angle) * velocity * dpr,
      vy: Math.sin(angle) * velocity * dpr,
      size: (6 + Math.random() * 8) * dpr,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.45 * dpr,
      drag: 0.96
    };
  });

  let startTime = null;
  const duration = 2500; // ms

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - elapsed / duration);

      if (p.opacity > 0 && p.y < canvas.height) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (elapsed < duration && activeCount > 0) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}
