# Mis Finanzas — PWA de Control de Gastos

App instalable (sin servidor, sin Termux) para controlar gastos,
ingresos, tarjetas, préstamos y presupuestos. Misma arquitectura que
GeoApp: todo corre en el navegador, los datos se guardan en el propio
telefono (IndexedDB), y **no depende de ninguna librería externa** —
funciona offline desde la primera vez que la abrís, sin necesitar
internet ni siquiera para instalarla (salvo para descargar los
archivos la primera vez).

## Que incluye

- **Cuentas**: Efectivo, Cuenta bancaria, Tarjeta de crédito, Préstamo
  (yo debo) y Préstamo (me deben) — cada una con su propio saldo
  calculado automáticamente a partir de tus movimientos (nunca se
  guarda un saldo "suelto" que se pueda desincronizar).
- **Movimientos**: Ingreso, Gasto o Transferencia. Un solo tipo de
  "Transferencia" cubre pagos de tarjeta, pagos de cuota de préstamo,
  y cobros de plata prestada — mové dinero entre cualquier par de
  cuentas y la app calcula el efecto correcto según el tipo de cada
  una.
- **Presupuestos**: límite mensual por categoría de gasto, con barra
  de progreso y alerta en el Inicio cuando te acercás (90%+) o superás
  el límite.
- **Inicio**: patrimonio neto, resumen del mes, alertas de presupuesto,
  próximos vencimientos (tarjetas y cuotas de préstamo) y gasto por
  categoría.
- **Exportar CSV**: todos tus movimientos, con un click, desde la
  pestaña Movimientos.

## Categorías incluidas de entrada

Alimentación, Transporte, Vivienda/Alquiler, Servicios, Salud,
Educación, Entretenimiento, Ropa, Impuestos, Otros gastos — más Sueldo,
Freelance/Negocio y Otros ingresos. Podés agregar o quitar categorías
editando `js/defaults.js` (se siembran solo la primera vez que abrís
la app).

## Como funcionan los saldos (por si te interesa el detalle)

Cada cuenta tiene un "saldo inicial" al crearla. A partir de ahí, el
saldo se recalcula siempre desde tus movimientos:

- **Efectivo/Banco**: sube con ingresos, baja con gastos y con
  transferencias salientes, sube con transferencias entrantes.
- **Tarjeta de crédito**: sube (más deuda) con cada gasto pagado con
  esa tarjeta; baja (menos deuda) con cada transferencia HACIA la
  tarjeta (eso es "pagar la tarjeta").
- **Préstamo (yo debo)**: arranca en el monto que pediste prestado
  (lo ingresás como saldo inicial al crear la cuenta) y baja con cada
  transferencia hacia esa cuenta (eso es "pagar una cuota").
- **Préstamo (me deben)**: arranca en el monto que prestaste; sube si
  transferís más plata hacia esa cuenta (prestás de nuevo); baja con
  una transferencia DESDE esa cuenta hacia tu banco/efectivo (eso es
  "cobrar" lo prestado).

## Instalación (mismo procedimiento que ya conocés)

1. Subí la carpeta `finanzas_pwa/` a GitHub Pages (o cualquier hosting
   HTTPS gratuito) — mismos pasos que ya hicimos con GeoApp.
2. Abrí la URL en Chrome del celular.
3. Menú (⋮) → **"Instalar app"**.
4. Listo — funciona offline desde el primer momento, sin depender de
   ninguna conexión externa.

## Que probé

Corrí la app completa en un navegador real (Chromium headless):
- Cero errores de consola (a diferencia de las apps anteriores, esta
  no tiene ninguna dependencia CDN externa que pueda fallar).
- Creación de las 4 cuentas: Efectivo, Banco, Tarjeta de crédito,
  Préstamo.
- Registré Ingreso, Gasto con tarjeta, pago de tarjeta (transferencia)
  y pago de cuota de préstamo (transferencia) — verifiqué a mano cada
  saldo resultante y coinciden exactamente:
  - Banco: 1000 + 1500 (sueldo) − 50 (pago tarjeta) − 100 (pago
    préstamo) = **$2350.00** ✓.
  - Visa Oro: 0 + 80 (gasto) − 50 (pago) = **$30.00**, disponible
    $1970 de $2000 ✓.
  - Préstamo Auto: 1200 − 100 = **$1100.00**, 1 de 12 cuotas pagadas
    (8.33%) ✓.
- Presupuesto de $50 en Alimentación + gasto de $60 → alerta
  "te pasaste — $60.00 de $50.00 (120%)" apareció correctamente en el
  Inicio y en Presupuestos.
- Exportación CSV: descarga con los datos correctos.
- Recargué la página: todos los datos siguen ahí (IndexedDB
  funcionando).

## Estructura

```
finanzas_pwa/
├── index.html
├── manifest.json
├── service-worker.js
├── icons/
├── css/style.css
└── js/
    ├── idb.js         # base de datos local (4 tablas)
    ├── defaults.js     # categorias por defecto
    ├── calc.js          # motor de calculo (saldos, presupuestos, vencimientos)
    ├── ui.js             # helpers de UI + modal generico
    ├── charts.js          # barras de progreso (sin libreria externa)
    ├── forms.js            # formularios de Cuenta / Movimiento / Presupuesto
    ├── render.js            # las 4 vistas (Inicio, Movimientos, Cuentas, Presupuestos)
    ├── export.js             # exportar CSV
    └── app.js                 # controlador principal
```

## Cosas que podés pedirme despues

- Reportes con gráfico de tendencia mes a mes (ingresos vs gastos).
- Presupuestos por mes especifico (ahora el límite es el mismo todos
  los meses).
- Movimientos recurrentes automáticos (ej. alquiler todos los meses).
- Multi-moneda si alguna vez lo necesitás.
