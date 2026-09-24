// Cricket Arcade — drawing helpers (adapted from Scrapcore ZERO's renderer).
// All coords are logical units.

const R = {
  ctx: null,
  init(ctx) { this.ctx = ctx; },

  clear(color) {
    const v = Display.viewRect();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(v.x - 4, v.y - 4, v.w + 8, v.h + 8);
  },

  circle(x, y, r, fill, stroke, lw) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 6; c.stroke(); }
  },

  ellipse(x, y, rx, ry, fill) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  },

  rect(x, y, w, h, fill, stroke, lw) {
    const c = this.ctx;
    if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 6; c.strokeRect(x, y, w, h); }
  },

  roundRectPath(x, y, w, h, rad) {
    const c = this.ctx;
    rad = Math.min(rad, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  },

  roundRect(x, y, w, h, rad, fill, stroke, lw) {
    const c = this.ctx;
    this.roundRectPath(x, y, w, h, rad);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 6; c.stroke(); }
  },

  // Sporty panel with a slanted accent cut on one corner (plan 28).
  panel(x, y, w, h, fill, edge) {
    const c = this.ctx;
    const cut = Math.min(28, h * 0.3);
    c.beginPath();
    c.moveTo(x + 14, y);
    c.lineTo(x + w - cut, y);
    c.lineTo(x + w, y + cut);
    c.lineTo(x + w, y + h - 14);
    c.quadraticCurveTo(x + w, y + h, x + w - 14, y + h);
    c.lineTo(x + 14, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - 14);
    c.lineTo(x, y + 14);
    c.quadraticCurveTo(x, y, x + 14, y);
    c.closePath();
    c.fillStyle = fill || CONFIG.COLOR.panel;
    c.fill();
    if (edge !== false) {
      c.strokeStyle = edge || CONFIG.COLOR.panelEdge;
      c.lineWidth = 3;
      c.stroke();
    }
  },

  // Chunky outlined text.
  text(str, x, y, size, color, align, outline) {
    const c = this.ctx;
    c.font = `900 ${size}px ${CONFIG.FONT}`;
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    if (outline !== false) {
      c.lineJoin = 'round';
      c.strokeStyle = typeof outline === 'string' ? outline : CONFIG.COLOR.ink;
      c.lineWidth = Math.max(3, size * 0.16);
      c.strokeText(str, x, y);
    }
    c.fillStyle = color;
    c.fillText(str, x, y);
  },

  plainText(str, x, y, size, color, align, weight) {
    const c = this.ctx;
    c.font = `${weight || 700} ${size}px Arial, sans-serif`;
    c.textAlign = align || 'left';
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(str, x, y);
  },

  poly(pts, fill, stroke, lw) {
    if (!pts || pts.length < 3) return;
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  },

  line(x1, y1, x2, y2, color, lw) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.strokeStyle = color;
    c.lineWidth = lw || 2;
    c.lineCap = 'round';
    c.stroke();
  },
};
