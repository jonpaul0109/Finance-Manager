/**
 * Categorias por defecto. Se siembran una sola vez en el primer uso.
 * El usuario puede agregar mas o borrar las que no use (excepto que
 * esten en uso por algun movimiento).
 */
const DEFAULT_CATEGORIES = [
  // Gastos
  { name: "Alimentación", type: "expense", color: "#c17a3d" },
  { name: "Transporte", type: "expense", color: "#6b8a5a" },
  { name: "Vivienda / Alquiler", type: "expense", color: "#8a5a2c" },
  { name: "Servicios (luz, agua, internet)", type: "expense", color: "#4c8a9c" },
  { name: "Salud", type: "expense", color: "#a94438" },
  { name: "Educación", type: "expense", color: "#7a6ac1" },
  { name: "Entretenimiento", type: "expense", color: "#c15fa3" },
  { name: "Ropa", type: "expense", color: "#c1a83d" },
  { name: "Impuestos", type: "expense", color: "#6b6b6b" },
  { name: "Otros gastos", type: "expense", color: "#9aa89a" },
  // Ingresos
  { name: "Sueldo", type: "income", color: "#2d9c6d" },
  { name: "Freelance / Negocio", type: "income", color: "#3daa8a" },
  { name: "Otros ingresos", type: "income", color: "#5bbf9f" },
];

async function ensureDefaultCategories() {
  const existing = await FinDB.getAll("categories");
  if (existing.length > 0) return;
  for (const cat of DEFAULT_CATEGORIES) {
    await FinDB.put("categories", { ...cat, is_default: true });
  }
}
