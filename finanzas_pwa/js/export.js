/**
 * Exportacion de movimientos a CSV (sin dependencias externas).
 */
function exportTransactionsCsv(state) {
  const { accounts, transactions, categories } = state;
  const headers = ["Fecha", "Tipo", "Monto", "Cuenta Origen", "Cuenta Destino", "Categoria", "Nota"];
  const typeLabels = { income: "Ingreso", expense: "Gasto", transfer: "Transferencia" };

  const rows = [...transactions]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map((tx) => [
      tx.date || "",
      typeLabels[tx.type] || tx.type,
      tx.amount,
      tx.from_account_id ? accountName(tx.from_account_id, accounts) : "",
      tx.to_account_id ? accountName(tx.to_account_id, accounts) : "",
      tx.category_id ? categoryName(tx.category_id, categories) : "",
      tx.note || "",
    ]);

  const csvLines = [headers, ...rows].map((row) =>
    row.map((cell) => {
      const s = String(cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")
  );
  const csvContent = "\uFEFF" + csvLines.join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `movimientos_${todayStr()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
