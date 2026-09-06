/**
 * Datos semilla: exactamente los mismos que trae Finance.xlsx
 * (categorias, subcategorias, tags, configuracion). Se siembran
 * una sola vez, la primera vez que se abre la app.
 */
const SEED_CATEGORIES = [
  { orig_id: 1, category_name: 'Salario', category_type: 'INCOME', icon: '💼', is_active: 1, sort_order: 1 },
  { orig_id: 2, category_name: 'Bonificación', category_type: 'INCOME', icon: '🎁', is_active: 1, sort_order: 2 },
  { orig_id: 3, category_name: 'Freelance', category_type: 'INCOME', icon: '💻', is_active: 1, sort_order: 3 },
  { orig_id: 4, category_name: 'Inversiones', category_type: 'INCOME', icon: '📈', is_active: 1, sort_order: 4 },
  { orig_id: 5, category_name: 'Venta', category_type: 'INCOME', icon: '💵', is_active: 1, sort_order: 5 },
  { orig_id: 6, category_name: 'Otros ingresos', category_type: 'INCOME', icon: '➕', is_active: 1, sort_order: 6 },
  { orig_id: 7, category_name: 'Alimentación', category_type: 'EXPENSE', icon: '🍔', is_active: 1, sort_order: 1 },
  { orig_id: 8, category_name: 'Vivienda', category_type: 'EXPENSE', icon: '🏠', is_active: 1, sort_order: 2 },
  { orig_id: 9, category_name: 'Transporte', category_type: 'EXPENSE', icon: '🚗', is_active: 1, sort_order: 3 },
  { orig_id: 10, category_name: 'Servicios', category_type: 'EXPENSE', icon: '💡', is_active: 1, sort_order: 4 },
  { orig_id: 11, category_name: 'Salud', category_type: 'EXPENSE', icon: '❤️', is_active: 1, sort_order: 5 },
  { orig_id: 12, category_name: 'Educación', category_type: 'EXPENSE', icon: '📚', is_active: 1, sort_order: 6 },
  { orig_id: 13, category_name: 'Entretenimiento', category_type: 'EXPENSE', icon: '🎮', is_active: 1, sort_order: 7 },
  { orig_id: 14, category_name: 'Compras', category_type: 'EXPENSE', icon: '🛒', is_active: 1, sort_order: 8 },
  { orig_id: 15, category_name: 'Viajes', category_type: 'EXPENSE', icon: '✈️', is_active: 1, sort_order: 9 },
  { orig_id: 16, category_name: 'Impuestos', category_type: 'EXPENSE', icon: '🧾', is_active: 1, sort_order: 10 },
  { orig_id: 17, category_name: 'Deudas', category_type: 'EXPENSE', icon: '💳', is_active: 1, sort_order: 11 },
  { orig_id: 18, category_name: 'Ahorro', category_type: 'EXPENSE', icon: '🏦', is_active: 1, sort_order: 12 },
  { orig_id: 19, category_name: 'Otros gastos', category_type: 'EXPENSE', icon: '➖', is_active: 1, sort_order: 13 },
];

const SEED_SUBCATEGORIES = [
  { orig_id: 1, orig_category_id: 7, subcategory_name: 'Supermercado', is_active: 1, sort_order: 1 },
  { orig_id: 2, orig_category_id: 7, subcategory_name: 'Restaurantes', is_active: 1, sort_order: 2 },
  { orig_id: 3, orig_category_id: 7, subcategory_name: 'Delivery', is_active: 1, sort_order: 3 },
  { orig_id: 4, orig_category_id: 7, subcategory_name: 'Cafeterías', is_active: 1, sort_order: 4 },
  { orig_id: 5, orig_category_id: 7, subcategory_name: 'Otros', is_active: 1, sort_order: 5 },
  { orig_id: 6, orig_category_id: 8, subcategory_name: 'Arriendo', is_active: 1, sort_order: 1 },
  { orig_id: 7, orig_category_id: 8, subcategory_name: 'Hipoteca', is_active: 1, sort_order: 2 },
  { orig_id: 8, orig_category_id: 8, subcategory_name: 'Mantenimiento', is_active: 1, sort_order: 3 },
  { orig_id: 9, orig_category_id: 8, subcategory_name: 'Reparaciones', is_active: 1, sort_order: 4 },
  { orig_id: 10, orig_category_id: 8, subcategory_name: 'Otros', is_active: 1, sort_order: 5 },
  { orig_id: 11, orig_category_id: 9, subcategory_name: 'Combustible', is_active: 1, sort_order: 1 },
  { orig_id: 12, orig_category_id: 9, subcategory_name: 'Taxi', is_active: 1, sort_order: 2 },
  { orig_id: 13, orig_category_id: 9, subcategory_name: 'Transporte público', is_active: 1, sort_order: 3 },
  { orig_id: 14, orig_category_id: 9, subcategory_name: 'Mantenimiento', is_active: 1, sort_order: 4 },
  { orig_id: 15, orig_category_id: 9, subcategory_name: 'Estacionamiento', is_active: 1, sort_order: 5 },
  { orig_id: 16, orig_category_id: 9, subcategory_name: 'Otros', is_active: 1, sort_order: 6 },
  { orig_id: 17, orig_category_id: 10, subcategory_name: 'Electricidad', is_active: 1, sort_order: 1 },
  { orig_id: 18, orig_category_id: 10, subcategory_name: 'Agua', is_active: 1, sort_order: 2 },
  { orig_id: 19, orig_category_id: 10, subcategory_name: 'Internet', is_active: 1, sort_order: 3 },
  { orig_id: 20, orig_category_id: 10, subcategory_name: 'Telefonía', is_active: 1, sort_order: 4 },
  { orig_id: 21, orig_category_id: 10, subcategory_name: 'Streaming', is_active: 1, sort_order: 5 },
  { orig_id: 22, orig_category_id: 10, subcategory_name: 'Otros', is_active: 1, sort_order: 6 },
  { orig_id: 23, orig_category_id: 11, subcategory_name: 'Medicinas', is_active: 1, sort_order: 1 },
  { orig_id: 24, orig_category_id: 11, subcategory_name: 'Consultas', is_active: 1, sort_order: 2 },
  { orig_id: 25, orig_category_id: 11, subcategory_name: 'Exámenes', is_active: 1, sort_order: 3 },
  { orig_id: 26, orig_category_id: 11, subcategory_name: 'Seguro', is_active: 1, sort_order: 4 },
  { orig_id: 27, orig_category_id: 11, subcategory_name: 'Otros', is_active: 1, sort_order: 5 },
  { orig_id: 28, orig_category_id: 12, subcategory_name: 'Cursos', is_active: 1, sort_order: 1 },
  { orig_id: 29, orig_category_id: 12, subcategory_name: 'Libros', is_active: 1, sort_order: 2 },
  { orig_id: 30, orig_category_id: 12, subcategory_name: 'Materiales', is_active: 1, sort_order: 3 },
  { orig_id: 31, orig_category_id: 12, subcategory_name: 'Matrícula', is_active: 1, sort_order: 4 },
  { orig_id: 32, orig_category_id: 12, subcategory_name: 'Otros', is_active: 1, sort_order: 5 },
  { orig_id: 33, orig_category_id: 13, subcategory_name: 'Cine', is_active: 1, sort_order: 1 },
  { orig_id: 34, orig_category_id: 13, subcategory_name: 'Videojuegos', is_active: 1, sort_order: 2 },
  { orig_id: 35, orig_category_id: 13, subcategory_name: 'Eventos', is_active: 1, sort_order: 3 },
  { orig_id: 36, orig_category_id: 13, subcategory_name: 'Hobbies', is_active: 1, sort_order: 4 },
  { orig_id: 37, orig_category_id: 13, subcategory_name: 'Otros', is_active: 1, sort_order: 5 },
  { orig_id: 38, orig_category_id: 14, subcategory_name: 'Ropa', is_active: 1, sort_order: 1 },
  { orig_id: 39, orig_category_id: 14, subcategory_name: 'Electrónica', is_active: 1, sort_order: 2 },
  { orig_id: 40, orig_category_id: 14, subcategory_name: 'Hogar', is_active: 1, sort_order: 3 },
  { orig_id: 41, orig_category_id: 14, subcategory_name: 'Accesorios', is_active: 1, sort_order: 4 },
  { orig_id: 42, orig_category_id: 14, subcategory_name: 'Otros', is_active: 1, sort_order: 5 },
  { orig_id: 43, orig_category_id: 15, subcategory_name: 'Alojamiento', is_active: 1, sort_order: 1 },
  { orig_id: 44, orig_category_id: 15, subcategory_name: 'Vuelos', is_active: 1, sort_order: 2 },
  { orig_id: 45, orig_category_id: 15, subcategory_name: 'Transporte', is_active: 1, sort_order: 3 },
  { orig_id: 46, orig_category_id: 15, subcategory_name: 'Comida', is_active: 1, sort_order: 4 },
  { orig_id: 47, orig_category_id: 15, subcategory_name: 'Actividades', is_active: 1, sort_order: 5 },
  { orig_id: 48, orig_category_id: 15, subcategory_name: 'Otros', is_active: 1, sort_order: 6 },
  { orig_id: 49, orig_category_id: 17, subcategory_name: 'Tarjeta de crédito', is_active: 1, sort_order: 1 },
  { orig_id: 50, orig_category_id: 17, subcategory_name: 'Préstamo', is_active: 1, sort_order: 2 },
  { orig_id: 51, orig_category_id: 17, subcategory_name: 'Intereses', is_active: 1, sort_order: 3 },
  { orig_id: 52, orig_category_id: 17, subcategory_name: 'Otros', is_active: 1, sort_order: 4 },
  { orig_id: 53, orig_category_id: 18, subcategory_name: 'Fondo de emergencia', is_active: 1, sort_order: 1 },
  { orig_id: 54, orig_category_id: 18, subcategory_name: 'Meta de ahorro', is_active: 1, sort_order: 2 },
  { orig_id: 55, orig_category_id: 18, subcategory_name: 'Inversión', is_active: 1, sort_order: 3 },
  { orig_id: 56, orig_category_id: 18, subcategory_name: 'Otros', is_active: 1, sort_order: 4 },
];

const SEED_TAGS = [
  { orig_id: 1, tag_name: 'Trabajo' },
  { orig_id: 2, tag_name: 'Personal' },
  { orig_id: 3, tag_name: 'Viaje' },
  { orig_id: 4, tag_name: 'Proyecto' },
  { orig_id: 5, tag_name: 'Imprevisto' },
  { orig_id: 6, tag_name: 'Necesario' },
  { orig_id: 7, tag_name: 'No necesario' },
];

const SEED_APP_SETTINGS = [
  { setting_key: 'currency', setting_value: 'USD', setting_type: 'TEXT', description: 'Moneda principal' },
  { setting_key: 'date_format', setting_value: 'YYYY-MM-DD', setting_type: 'TEXT', description: 'Formato interno de fecha' },
  { setting_key: 'first_day_of_week', setting_value: '1', setting_type: 'INTEGER', description: '1=Lunes, 7=Domingo' },
];

async function ensureSeedData() {
  const users = await FinDB.getAll("users");
  let userId;
  if (!users.length) {
    userId = await FinDB.put("users", {
      username: "yo", display_name: "Mi cuenta", email: "", is_active: 1,
      created_at: nowIso(), updated_at: nowIso(),
    });
  } else {
    userId = users[0].id;
  }

  const existingCats = await FinDB.getAll("categories");
  let catIdMap = {};
  if (!existingCats.length) {
    for (const c of SEED_CATEGORIES) {
      const { orig_id, ...rest } = c;
      const newId = await FinDB.put("categories", rest);
      catIdMap[orig_id] = newId;
    }
    for (const s of SEED_SUBCATEGORIES) {
      const { orig_id, orig_category_id, ...rest } = s;
      await FinDB.put("subcategories", { ...rest, category_id: catIdMap[orig_category_id] });
    }
  }

  const existingTags = await FinDB.getAll("tags");
  if (!existingTags.length) {
    for (const t of SEED_TAGS) {
      const { orig_id, ...rest } = t;
      await FinDB.put("tags", rest);
    }
  }

  const existingSettings = await FinDB.getAll("app_settings");
  if (!existingSettings.length) {
    for (const s of SEED_APP_SETTINGS) {
      await FinDB.put("app_settings", { ...s, updated_at: nowIso() });
    }
  }

  return userId;
}
