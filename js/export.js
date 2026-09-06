/**
 * Exportar Movimientos (transacciones + transferencias) a CSV.
 */
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportTransactionsCsv(state) {
  const { transactions, transfers, accounts, categories, subcategories, vehicles, tags, transactionTags } = state;

  const headers = [
    "Fecha", "Tipo", "Monto", "Cuenta Origen", "Cuenta Destino", "Categoria", "Subcategoria",
    "Vehiculo", "Tipo de Pago", "Cuotas", "Etiquetas", "Descripcion",
  ];
  const typeLabels = { INCOME: "Ingreso", EXPENSE: "Gasto" };
  const paymentLabels = PAYMENT_TYPE_LABELS;

  const txRows = transactions.map((tx) => [
    tx.transaction_date || "",
    typeLabels[tx.transaction_type] || tx.transaction_type,
    tx.amount,
    accountName(tx.account_id, accounts),
    "",
    tx.category_id ? categoryName(tx.category_id, categories) : "",
    tx.subcategory_id ? subcategoryName(tx.subcategory_id, subcategories) : "",
    tx.vehicle_id ? vehicleName(tx.vehicle_id, vehicles) : "",
    tx.payment_type ? (paymentLabels[tx.payment_type] || tx.payment_type) : "",
    tx.installments || "",
    tagNamesFor(tx.id, transactionTags, tags).join("; "),
    tx.description || "",
  ]);

  const trRows = transfers.map((tr) => [
    tr.transfer_date || "",
    "Transferencia",
    tr.amount,
    accountName(tr.from_account_id, accounts),
    accountName(tr.to_account_id, accounts),
    "", "", "", "", "", "",
    tr.description || "",
  ]);

  const rows = [...txRows, ...trRows].sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));

  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movimientos_${todayStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
