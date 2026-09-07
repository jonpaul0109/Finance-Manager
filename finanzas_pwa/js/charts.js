/**
 * Graficos simples con divs (sin libreria externa, para no depender
 * de ninguna CDN). Barras horizontales de progreso/comparacion.
 */
function renderBarList(container, items, opts) {
  opts = opts || {};
  container.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = opts.emptyText || "Sin datos todavia.";
    container.appendChild(p);
    return;
  }
  const max = Math.max(...items.map((i) => i.value), 0.01);
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = item.label;

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = Math.min(100, (item.value / max) * 100) + "%";
    if (item.color) fill.style.background = item.color;
    if (item.danger) fill.classList.add("bar-danger");
    track.appendChild(fill);

    const val = document.createElement("div");
    val.className = "bar-value";
    val.textContent = opts.formatValue ? opts.formatValue(item.value) : item.value;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(val);
    container.appendChild(row);
  });
}
