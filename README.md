# Mis Finanzas — PWA reconstruida sobre Finance.xlsx

Esta versión reemplaza por completo el diseño anterior: la base de
datos local (IndexedDB) ahora replica 1:1 la estructura de tu
`Finance.xlsx` — mismos nombres de campo, mismas categorías y
subcategorías, mismos catálogos. Sigue siendo una PWA sin servidor,
sin Termux, sin ninguna dependencia externa (funciona offline desde la
primera vez que la abrís).

## Qué se implementó (con interfaz completa)

- **Cuentas**: Efectivo, Cuenta bancaria, Tarjeta de crédito (con
  límite, corte, pago, tasa de interés — se guarda también en la tabla
  `credit_cards` dedicada del esquema).
- **Movimientos**: Ingreso, Gasto, Transferencia. Comida (categoría
  Alimentación) despliega un detalle específico: tipo de comida,
  momento (desayuno/almuerzo/cena/merienda), personas, lugar — igual
  que la tabla `food_expenses`. Etiquetas (tags) seleccionables por
  movimiento.
- **Categorías y subcategorías**: las 19 categorías y 56 subcategorías
  exactas de tu Excel (verifiqué programáticamente que coinciden 100%).
- **Tarjetas — Corriente vs Diferido**: se mantiene de la versión
  anterior, con el ciclo real de facturación (corte → pago) y el
  detalle individual de cada compra diferida.
- **Deudas**: cronograma de cuotas real (`debt_installments`),
  generado automáticamente al crear la deuda. Si ponés una tasa de
  interés, usa el sistema de amortización francés (cuota fija,
  capital+interés calculados mes a mes) — si la tasa es 0, reparte el
  capital en partes iguales. Cada pago se aplica a la cuota más
  antigua pendiente primero.
- **Impuestos**: entidad propia con tipo, año fiscal, período, fecha
  límite y estado (pendiente/pagado/vencido).
- **Presupuestos**: uno por mes (año+mes), con un límite por categoría
  (`budget_categories`) — alerta en Inicio si te acercás o superás.
- **Metas de ahorro**: monto objetivo, fecha objetivo opcional,
  cuenta asociada, aportes que quedan registrados como gasto (categoría
  Ahorro) y como `savings_contributions`.
- **Vehículos**: gasto total y del mes, asociable a cualquier gasto
  (se mantiene de la versión anterior, no está en el Excel original
  pero lo agregué a pedido tuyo).

## Qué NO se implementó (a propósito)

Como acordamos: **audit_log** (historial de cambios), **attachments**
(adjuntar archivos) y **notifications** (notificaciones push) — bajo
valor para una app personal offline de un solo usuario.

## Estructura

```
finanzas_pwa/
├── index.html
├── manifest.json
├── service-worker.js
├── icons/
├── css/style.css
└── js/
    ├── idb.js        # IndexedDB: 22 tablas (keyPath "id" interno,
    │                    todos los demas campos calcan el Excel)
    ├── defaults.js     # siembra categorias/subcategorias/tags/settings
    │                     EXACTOS del Excel (verificado programaticamente)
    ├── calc.js          # saldos, amortizacion francesa, presupuestos,
    │                      corriente/diferido, vencimientos
    ├── ui.js             # helpers DOM + formato + enums
    ├── charts.js          # barra de progreso (sin libreria externa)
    ├── forms.js            # Cuenta, Vehiculo, Movimiento, Deuda (+pago),
    │                         Impuesto (+pago), Presupuesto, Meta (+aporte)
    ├── render.js            # las 5 vistas
    ├── export.js             # CSV de movimientos
    └── app.js                 # controlador principal
```

## Cómo lo probé

Corrí la app completa en un navegador real (Chromium headless), cero
errores de consola en todo el flujo:
- Creación de cuenta bancaria y tarjeta de crédito.
- **Deuda con interés**: $1,000 al 12% anual a 6 meses → cuota
  $172.55 (verifiqué la fórmula de amortización francesa a mano:
  coincide exacto). Primera cuota: $10.00 de interés + $162.55 de
  capital → saldo $837.45 (exacto).
- Pago de cuota aplicado correctamente a la más antigua pendiente.
- Presupuesto de $50 en Alimentación + gasto de $60 → alerta "te
  pasaste — 120%" en Inicio y en Metas.
- Gasto de comida con detalle completo (tipo, momento, personas,
  lugar) + etiqueta "Trabajo" — quedó guardado y visible en
  Movimientos.
- Meta de ahorro + aporte de $100 → 10% de progreso mostrado
  correctamente.
- **Encontré y corregí un bug real durante las pruebas**: el campo
  opcional "Fecha objetivo" de una meta de ahorro se rellenaba solo
  con la fecha de hoy en vez de quedar vacío. Ya está arreglado y
  verificado.
- Exportación CSV: descarga con todos los campos correctos.
- Recargué la página: todos los datos persistieron.

## Instalación

Igual que siempre — subí la carpeta a GitHub Pages (o a la carpeta que
ya tengas), abrí la URL en Chrome del celular, menú (⋮) → "Instalar
app".

## Aviso sobre datos existentes

Como el nombre de la base de datos interna cambió (`misfinanzas` →
`financemanager`) y la estructura es distinta a la versión anterior,
**si ya habías cargado datos con la versión previa de la app, no se
van a migrar automáticamente** — esta es una base nueva, limpia, en el
mismo dispositivo. Si necesitás rescatar esos datos viejos, avisame
antes de reinstalar y armamos algo para exportarlos primero.

## Correcciones posteriores

- **Edición de deudas**: si todavía no pagaste ninguna cuota, editar
  monto/tasa/cuotas/fecha ahora **regenera el cronograma completo**
  automáticamente (antes el registro se guardaba pero la cuota y el
  saldo mostrados quedaban congelados del cronograma viejo, dando la
  falsa impresión de que "no se guardaba nada"). Si ya pagaste al
  menos una cuota, esos campos quedan bloqueados (con una nota
  explicando por qué) para no invalidar el historial de pagos, pero
  podés seguir editando nombre, acreedor, tipo, día de pago, cuenta y
  notas normalmente.
- **Corriente/Diferido de tarjetas ahora visible en "Deudas"**: antes
  solo se veía dentro de Cuentas. Ahora la pestaña Deudas tiene una
  sección "💳 Tarjetas de Crédito" con la deuda total, el próximo pago
  (monto + fecha) y el detalle de cada compra diferida — junto a
  Préstamos e Impuestos, como una vista completa de todo lo que debés.
- Se agregaron botones "Editar" explícitos en Cuentas, Deudas,
  Vehículos y Metas (antes había que tocar toda la tarjeta, que no era
  obvio).

## Segunda ronda de correcciones

- La sección "💳 Tarjetas de Crédito" en Deudas ahora tiene sus propios
  botones: **"+ Registrar compra"** (abre el formulario de gasto con
  la tarjeta ya seleccionada, mostrando de una el selector
  Corriente/Diferido), **"Registrar pago"** (transferencia para pagar
  la tarjeta, con la tarjeta ya precargada como destino), **"Editar"**
  y **"Eliminar"** (antes faltaba el botón de eliminar por completo en
  esta sección).
