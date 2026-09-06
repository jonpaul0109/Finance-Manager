/**
 * Barra de progreso simple (presupuestos, metas, deudas). Sin
 * dependencias externas -- solo un div con ancho proporcional.
 */
function progressBar(pct, over) {
  const clamped = Math.max(0, Math.min(100, pct));
  let tone = "bar-ok";
  if (over) tone = "bar-danger";
  else if (pct >= 80) tone = "bar-warn";
  return el("div", { class: "progress-track" }, [
    el("div", { class: `progress-fill ${tone}`, style: `width:${clamped}%` }),
  ]);
}
