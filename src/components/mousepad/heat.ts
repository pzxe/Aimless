/** Paints a heat grid (0..255 per cell) onto a canvas: dark to cyan to the accent colour. */
export function drawHeat(canvas: HTMLCanvasElement, grid: readonly number[], cols: number, rows: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  const cw = w / cols
  const ch = h / rows
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = (grid[y * cols + x] ?? 0) / 255
      if (v <= 0.02) continue
      // cool cyan at low density, hot red-pink at high density
      const hue = 190 - v * 190
      ctx.fillStyle = `hsla(${hue}, 95%, ${50 + v * 6}%, ${0.18 + v * 0.7})`
      ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5)
    }
  }
}
