# Documentación del Sistema SGI Comarca

Esta documentación está dividida en dos partes: un manual práctico para quienes usan el sistema en el día a día (Usuarios/Vendedores) y una guía técnica para quienes mantienen o modifican el código (Programadores).

---

# 📖 1. Manual de Usuario (Operativa Diaria)

El Sistema de Control de Inventario (SGI Comarca) es la herramienta principal para gestionar los almacenes, registrar ventas y asentar las finanzas de la empresa de manera remota a través del navegador móvil o de escritorio.

## Menú Principal (Sidebar)
A la izquierda de la pantalla (o tocando el menú hamburguesa ☰ en el móvil) encontrarás los módulos del sistema:

### 📊 Dashboard
- **Resumen general:** Te permite ver de un vistazo rápido cuántos productos tienes, tus movimientos recientes y qué productos tienen stock bajo o están agotados.
- **KPIs (Indicadores Clave):** Muestra el valor en dinero de tu inventario actual calculado en tiempo real.

### 📥 Entrada de Productos
Úsalo cada vez que recibas nueva mercancía.
- **Autocompletado:** Si el producto ya existe, busca por su "Código" y el sistema rellenará su nombre, costo y precio.
- **Nuevo Producto:** Si es un producto que nunca has vendido, llena todos los campos (nombre, descripción, categoría). El sistema lo agregará al catálogo base de manera automática.
- Asegúrate de seleccionar el **Almacén** correcto (ej. Casa Dylan, Casa Luden) a donde físicamente estás ingresando la mercancía.

### 📋 Movimientos
Úsalo para hacer salidas manuales, ajustes por mermas o devoluciones.
- Si vas a hacer una VENTA, NO uses este módulo de ajuste general. Usa el botón específico de **Modal de Ventas**.
- Se requiere que el producto ya esté creado en el sistema para hacerle un ajuste.

### 📦 Inventario (Stock en vivo)
- Consulta el stock de todos tus productos en tiempo real.
- Verás indicadores de color (Rojo para stock en cero, Amarillo para stock bajo).
- La vista incluye un desglose por almacén, mostrándote exactamente cuántas unidades hay en cada casa.

### 💰 Registro de Ventas (Modal)
Este es el motor principal para los vendedores.
1. Selecciona tu **nombre de vendedor** y el canal de origen (Instagram, WhatsApp, etc.).
2. En el "Carrito", agrega los productos que vendiste. Es MUY importante que selecciones **de qué almacén** sacaste el producto. Si sacas un producto de Casa Jean, el sistema descontará el stock estrictamente de esa casa.
3. Si la venta incluye **Costo de Envío**, añádelo en la sección inferior.
4. El sistema restará automáticamente el stock y dejará registrada la transacción en el historial.

### 💳 Finanzas
Registra pagos de servicios, gastos de publicidad, caja chica o ingresos por inversión externa. 
- Distingue entre **Ingresos** (dinero que entra a la empresa no relacionado con ventas directas de catálogo) y **Gastos** (salidas de caja).

### 🔄 Transferencias de Stock (Modal)
Si decides enviar 5 unidades de "Casa Dylan" a "Casa Luden":
1. Abre el modal de transferencia.
2. Ingresa el código del producto, origen, destino y la cantidad.
3. El sistema verificará que origen tenga suficiente stock y hará el traspaso matemáticamente sin alterar tus ingresos o ventas.

---

# 💻 2. Manual del Programador (Arquitectura Técnica)

El SGI Comarca está construido sobre la infraestructura de Google Apps Script. No cuenta con base de datos SQL ni servidor Nodejs en producción; en su lugar, usa `SpreadsheetApp` y la hoja de cálculo referenciada en `SPREADSHEET_ID` como Base de Datos y Backend.

## 2.1 Estructura del Proyecto

### Backend (Archivos `.js`)
Actúan como controladores/servicios API invocados vía `google.script.run` desde el cliente.

- **`config.js`**: Archivo crítico. Contiene el ID de la hoja de cálculo (`SPREADSHEET_ID`) y las constantes para nombres de hojas y diccionarios de tipos.
- **`main.js`**: Punto de entrada de la Web App (`doGet()`). Se encarga de hacer el render de `index.html` y evaluar las plantillas para incrustar los `.html` secundarios.
- **`System_Admin.js`**: Utilidades de mantenimiento. Contiene `inicializarHojas()` (que construye las tablas en la hoja si no existen) y scripts de contingencia como `eliminarVentasDuplicadas()` y `validarIntegridad()`.
- **`Service_Inventario.js`**: Motor transaccional pesado. Aquí residen `calcularStock` (recorre `Movimientos`), `descontarDeInventario` (actualiza stock directamente por celda) y `procesarTransferenciaEntreUbicaciones` (gestiona transacciones lógicas con rollback manual).
- **`Service_Ventas.js`**: `registrarVentaDetallada()` es la función más compleja. Valida stock antes de vender, prorratea costos de envío sobre múltiples ítems en batch y escribe masivamente usando `setValues()`.
- **`Auditoria.js`**: Funciones independientes para cruzar el inventario local con una hoja de auditoría externa y auto-crear movimientos de ajuste.

### Frontend (Archivos `.html`)
El cliente es puro HTML5, CSS Nativo y Vanilla JS. Se incluye en un solo bundle al enviarse al navegador.

- **`index.html`**: Estructura principal y carga de dependencias CDN (ej. Chart.js).
- **`Global_CSS.html`**: Todo el CSS. Destaca por el uso de Variables CSS y Media Queries para hacerlo responsivo (`.app-container`, `.sidebar`).
- **`Global_JS.html`**: El controlador de vistas del SPA (Single Page Application). Contiene la función `showTab()` para simular la navegación mediante la propiedad `display`. Maneja todos los eventos DOM, llamadas asíncronas (`google.script.run.withSuccessHandler()`), y los `setTimeout` de autocompletado para evitar re-renderizados pesados (Debounce manual).

## 2.2 Flujo de Datos Típico (Ej. Vender Producto)
1. **[Global_JS]** El usuario hace submit de `formVenta`. JavaScript local agrupa los ítems del array y llama asíncronamente a `registrarVentaDetallada(datos)`.
2. **[Service_Ventas]** Apps Script recibe el objeto. Lee el array de ítems.
3. **[Service_Inventario]** Llama a `verificarStockEnUbicacion()` para certificar que el stock existe en el almacén especificado.
4. Si pasa, crea un Timestamp (`V-2026...`), formatea la data para la hoja `HOJA_VENTAS` e inserta todo el bloque a través de `hojaVentas.getRange().setValues()`.
5. Ejecuta `descontarDeInventario()` y `registrarMovimiento()`.
6. Retorna un objeto JSON con `success: true/false`.
7. **[Global_JS]** Ejecuta el callback `.withSuccessHandler()`, limpia el formulario en el DOM y recarga el componente visual de stock si está visible.

## 2.3 Recomendaciones Técnicas Inmediatas
- **Usa `LockService`:** Actualmente, si dos hilos de `doGet/doPost` intentan modificar la hoja al mismo tiempo, colisionarán. En cualquier servicio donde modifiques una hoja (Ventas, Inventarios), debes rodear el código crítico con `const lock = LockService.getScriptLock(); lock.waitLock(10000); ... lock.releaseLock();`.
- **Precalcula Stock:** Refactorizar `obtenerStock()` en `Service_Inventario.js`. Al iterar para un reporte, no uses la función de cálculo por cada celda, ya que la complejidad Big O se dispara exponencialmente. Mapea la hoja de base a un Objeto indexado (`{ "CODIGO": { stock: 5 }}`) una sola vez y busca las llaves ahí.
- **Testing Local:** Ya que extrajiste el proyecto vía Clasp, te recomiendo firmemente instalar y usar dependencias de TypeScript o usar un linter (`ESLint`) local antes de hacer push para capturar errores de sintaxis a tiempo.
