Optimización de Rendimiento del Sistema
El reporte y el dashboard están tardando hasta 3 minutos en cargar porque el servidor está realizando búsquedas ineficientes (bucles dentro de bucles). Específicamente, por cada movimiento o producto, el sistema vuelve a leer toda la base de datos de Excel desde cero, lo que colapsa el servidor cuando hay muchos datos.

User Review Required
IMPORTANT

Esta optimización cambiará la forma en que se calcula el inventario y se procesan los reportes en el servidor. El resultado visual será idéntico, pero el tiempo de carga pasará de 3 minutos a menos de 2 segundos. ¿Estás de acuerdo con aplicar estas optimizaciones?

Proposed Changes
1. Optimizar obtenerHistorial()
Actualmente, por cada movimiento de venta, el sistema busca los datos del vendedor leyendo toda la hoja de "Ventas" desde cero.

Solución: Leer la hoja de "Ventas" una sola vez al principio, crear un "diccionario" (Map) en memoria con todos los vendedores, y luego consultar ese diccionario instantáneamente para cada fila.
[MODIFY] 
Service_Analisis.js
Refactorizar el bucle interno para evitar llamadas a obtenerInfoVentaPorObservacion().
2. Optimizar obtenerResumen() y obtenerStock()
Actualmente, para saber el stock del dashboard o del reporte de inventario, el sistema recorre todos los productos y llama a la función calcularStock(codigo), la cual lee la hoja completa de "Movimientos" por cada producto. Si hay 1000 productos, lee la hoja 1000 veces.

Solución: Leer la hoja de "Movimientos" una sola vez, sumar y restar todas las entradas y salidas de todos los productos en un solo recorrido de memoria, y luego usar esos totales.
[MODIFY] 
Service_Analisis.js
Reemplazar calcularStock(codigo) en obtenerResumen() por un cálculo masivo en memoria.
[MODIFY] 
Service_Inventario.js
Reemplazar calcularStock(codigo) en obtenerStock() por un cálculo masivo en memoria.
Verification Plan
Manual Verification
Tras aplicar los cambios, recargaremos la página y generaremos el reporte nuevamente. El reporte debería aparecer casi de forma instantánea sin "congelar" la ventana durante minutos.
Compararemos que las cantidades de "Valor en Inventario" y "Stock Bajo" sigan siendo matemáticamente exactas.
