/**
 * Base de datos local (IndexedDB), estructurada 1:1 sobre el esquema
 * de Finance.xlsx (misma nomenclatura de campos que las hojas del
 * Excel), para que los datos calcen si alguna vez los queres cruzar
 * con esa planilla. NO se implementan (a proposito, bajo valor para
 * uso personal offline): audit_log, attachments, notifications.
 */
const FinDB = (() => {
  const DB_NAME = "financemanager";
  const DB_VERSION = 1;
  const STORES = [
    "users", "accounts", "credit_cards", "categories", "subcategories",
    "tags", "transaction_tags", "transactions", "transfers",
    "budgets", "budget_categories", "debts", "debt_installments",
    "debt_payments", "credit_card_payments", "savings_goals",
    "savings_contributions", "taxes", "food_expenses",
    "recurring_transactions", "app_settings", "vehicles",
  ];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            // keyPath generico "id" -- mapeamos el _id especifico del
            // esquema (ej. account_id) al campo "id" al guardar/leer,
            // asi todos los stores funcionan igual con autoIncrement.
            db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function put(storeName, record) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = record.id ? store.put(record) : store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function getAll(storeName) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function get(storeName, id) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  }

  function remove(storeName, id) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    }));
  }

  // Guarda varios registros de una sola vez (usado para sembrar datos
  // y para crear un cronograma completo de cuotas de un tiron).
  function putMany(storeName, records) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      records.forEach((r) => (r.id ? store.put(r) : store.add(r)));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    }));
  }

  return { open, put, putMany, getAll, get, remove };
})();
