function inicializarHojas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // ===== HOJA PRODUCTOS =====
    let prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    if (!prodSheet) {
      prodSheet = ss.insertSheet(HOJA_PRODUCTOS);
    }
    
    // FORZAR reinicio de Productos
    if (prodSheet.getLastRow() === 0 || prodSheet.getRange("A1").getValue() !== "Código") {
      prodSheet.clear();
      const encabezados = [["Código", "Nombre", "Unidad", "Grupo", "Stock Mínimo", "Precio", "Fecha Creación"]];
      prodSheet.getRange(1, 1, 1, 7).setValues(encabezados);
      const headerRange = prodSheet.getRange(1, 1, 1, 7);
      headerRange.setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
      
      prodSheet.getRange("A:A").setNumberFormat("@");
      prodSheet.getRange("E:E").setNumberFormat("0");
      prodSheet.getRange("F:F").setNumberFormat("#,##0.00");
      prodSheet.getRange("G:G").setNumberFormat("dd/mm/yyyy hh:mm");
      
      prodSheet.setFrozenRows(1);
      prodSheet.autoResizeColumns(1, 7);
    }
    
    // ===== HOJA MOVIMIENTOS =====
    let movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    if (!movSheet) {
      movSheet = ss.insertSheet(HOJA_MOVIMIENTOS);
    }
    
    // FORZAR reinicio de Movimientos
    if (movSheet.getLastRow() === 0 || movSheet.getRange("A1").getValue() !== "Código") {
      movSheet.clear();
      const encabezados = [["Código", "Fecha", "Tipo", "Cantidad", "Usuario", "Timestamp", "Observaciones", "Stock Resultante", "Ubicación"]];
      movSheet.getRange(1, 1, 1, 9).setValues(encabezados);
      const headerRange = movSheet.getRange(1, 1, 1, 9);
      headerRange.setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
      
      movSheet.getRange("A:A").setNumberFormat("@");
      movSheet.getRange("B:B").setNumberFormat("dd/mm/yyyy");
      movSheet.getRange("D:D").setNumberFormat("0.##");
      movSheet.getRange("F:F").setNumberFormat("dd/mm/yyyy hh:mm:ss");
      movSheet.getRange("H:H").setNumberFormat("0.##");
      
      movSheet.setFrozenRows(1);
      movSheet.autoResizeColumns(1, 9);
    }
    
    // ===== HOJA ENTRADA DE PRODUCTOS =====
    let entradaSheet = ss.getSheetByName(HOJA_ENTRADA);
    if (!entradaSheet) {
      entradaSheet = ss.insertSheet(HOJA_ENTRADA);
    }
    
    // FORZAR reinicio de Entrada
    if (entradaSheet.getLastRow() < 14 || entradaSheet.getRange("A14").getValue() !== "codigo unico del producto") {
      entradaSheet.clear();
      const espacios = [];
      for (let i = 0; i < 13; i++) {
        espacios.push([""]);
      }
      entradaSheet.getRange(1, 1, 13, 1).setValues(espacios);
      
      const encabezados = [["codigo unico del producto", "nombre del producto", "cantidad de entrada del producto", "Descripción del Producto", "costo", "precio", "fecha y hora"]];
      entradaSheet.getRange(14, 1, 1, 7).setValues(encabezados);
      const headerRange = entradaSheet.getRange(14, 1, 1, 7);
      headerRange.setBackground("#28a745").setFontColor("white").setFontWeight("bold");
      
      entradaSheet.getRange("A:A").setNumberFormat("@");
      entradaSheet.getRange("C:C").setNumberFormat("0.##");
      entradaSheet.getRange("E:E").setNumberFormat("#,##0.00");
      entradaSheet.getRange("F:F").setNumberFormat("#,##0.00");
      entradaSheet.getRange("G:G").setNumberFormat("dd/mm/yyyy hh:mm:ss");
      
      entradaSheet.setFrozenRows(14);
      entradaSheet.autoResizeColumns(1, 7);
    }
    
    // ===== HOJA INVENTARIO - ESTRUCTURA CORREGIDA =====
    let invSheet = ss.getSheetByName(HOJA_INVENTARIO);
    if (!invSheet) {
      invSheet = ss.insertSheet(HOJA_INVENTARIO);
    }
    
    // FORZAR reinicio COMPLETO de Inventario
    if (invSheet.getLastRow() === 0 || invSheet.getRange("A1").getValue() !== "codigo unico del producto") {
      invSheet.clear();
      const encabezados = [["codigo unico del producto", "nombre del producto", "cantidad de entrada del producto", "Descripción del Producto", "costo", "precio", "ubicacion del producto", "fecha y hora"]];
      invSheet.getRange(1, 1, 1, 8).setValues(encabezados);
      const headerRange = invSheet.getRange(1, 1, 1, 8);
      headerRange.setBackground("#17a2b8").setFontColor("white").setFontWeight("bold");
      
      invSheet.getRange("A:A").setNumberFormat("@");
      invSheet.getRange("C:C").setNumberFormat("0.##");
      invSheet.getRange("E:E").setNumberFormat("#,##0.00");
      invSheet.getRange("F:F").setNumberFormat("#,##0.00");
      invSheet.getRange("H:H").setNumberFormat("dd/mm/yyyy hh:mm:ss");
      
      invSheet.setFrozenRows(1);
      invSheet.autoResizeColumns(1, 8);
      
      Logger.log("✅ Hoja Inventario reinicializada correctamente con estructura completa");
    }
    
    // ===== HOJA UNIDADES =====
    let unidadesSheet = ss.getSheetByName(HOJA_UNIDADES);
    if (!unidadesSheet) {
      unidadesSheet = ss.insertSheet(HOJA_UNIDADES);
      const unidadesPredeterminadas = [
        ["Unidad"],
        ["Unidades"],
        ["Cajas"],
        ["Kilogramos"],
        ["Gramos"],
        ["Toneladas"],
        ["Litros"],
        ["Mililitros"],
        ["Metros"],
        ["Centímetros"],
        ["Metros Cuadrados"],
        ["Metros Cúbicos"],
        ["Piezas"],
        ["Paquetes"],
        ["Docenas"]
      ];
      unidadesSheet.getRange(1, 1, unidadesPredeterminadas.length, 1).setValues(unidadesPredeterminadas);
      unidadesSheet.getRange(1, 1).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    
    // ===== HOJA GRUPOS =====
    let gruposSheet = ss.getSheetByName(HOJA_GRUPOS);
    if (!gruposSheet) {
      gruposSheet = ss.insertSheet(HOJA_GRUPOS);
      const gruposPredeterminados = [
        ["Grupo"],
        ["Consumibles"],
        ["Materia Prima"],
        ["Producto Terminado"],
        ["Producto en Proceso"],
        ["Herramientas"],
        ["Repuestos"],
        ["Equipos"],
        ["Suministros"],
        ["Empaques"],
        ["Químicos"],
        ["General"]
      ];
      gruposSheet.getRange(1, 1, gruposPredeterminados.length, 1).setValues(gruposPredeterminados);
      gruposSheet.getRange(1, 1).setBackground("#5DADE2").setFontColor("white").setFontWeight("bold");
    }
    // ===== HOJA VENTAS =====
let ventasSheet = ss.getSheetByName(HOJA_VENTAS);
if (!ventasSheet) {
  ventasSheet = ss.insertSheet(HOJA_VENTAS);
  const encabezados = [[
    "ID Venta",
    "Fecha",
    "Hora Salida",
    "Hora Finalización",
    "Vendedor",
    "Entregador",
    "Items Vendidos",
    "Monto Cobrado",
    "Envío Cobrado",
    "Total",
    "Lugar Extracción",
    "Lugar Entrega",
    "Observaciones",
    "Timestamp"
  ]];
  ventasSheet.getRange(1, 1, 1, 14).setValues(encabezados);
  ventasSheet.getRange(1, 1, 1, 14)
    .setBackground("#dc3545")
    .setFontColor("white")
    .setFontWeight("bold");
  ventasSheet.setFrozenRows(1);
  ventasSheet.autoResizeColumns(1, 14);
}
    // Inicializar listas de unidades y grupos
    obtenerListas();
    
    return "✅ Sistema inicializado correctamente.\n\n📋 Hojas creadas/verificadas:\n✅ Productos\n✅ Movimientos\n✅ Entrada de Productos\n✅ Inventario (con estructura completa)\n✅ Unidades\n✅ Grupos\n\n⚠️ IMPORTANTE: La hoja Inventario ha sido reinicializada con la estructura correcta.";
  } catch (error) {
    console.error("Error en inicializarHojas:", error);
    return `❌ Error al inicializar sistema: ${error.message}`;
  }
}

function validarIntegridad() {
  const errores = [];
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    const hojasRequeridas = [HOJA_PRODUCTOS, HOJA_MOVIMIENTOS, HOJA_UNIDADES, HOJA_GRUPOS];
    hojasRequeridas.forEach(nombreHoja => {
      if (!ss.getSheetByName(nombreHoja)) {
        errores.push(`Falta la hoja requerida: ${nombreHoja}`);
      }
    });
    
    if (errores.length > 0) {
      return { errores };
    }
    
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    const productos = prodSheet.getDataRange().getValues();
    const movimientos = movSheet.getDataRange().getValues();
    
    const codigosVistos = new Set();
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][0]) continue;
      
      const codigo = productos[i][0].toString().trim().toUpperCase();
      if (codigosVistos.has(codigo)) {
        errores.push(`Código de producto duplicado: ${productos[i][0]}`);
      }
      codigosVistos.add(codigo);
      
      if (!productos[i][1] || productos[i][1].toString().trim().length < 2) {
        errores.push(`Producto ${codigo} tiene nombre inválido`);
      }
      
      const stockMin = productos[i][4];
      if (stockMin && (isNaN(stockMin) || stockMin < 0)) {
        errores.push(`Producto ${codigo} tiene stock mínimo inválido: ${stockMin}`);
      }
    }
    
    const codigosProductos = new Set();
    for (let i = 1; i < productos.length; i++) {
      if (productos[i][0]) {
        codigosProductos.add(productos[i][0].toString().trim().toUpperCase());
      }
    }
    
    for (let i = 1; i < movimientos.length; i++) {
      if (!movimientos[i][0]) continue;
      
      const codigo = movimientos[i][0].toString().trim().toUpperCase();
      const tipo = movimientos[i][2] ? movimientos[i][2].toString().toUpperCase() : "";
      const cantidad = movimientos[i][3];
      
      if (!codigosProductos.has(codigo)) {
        errores.push(`Movimiento para producto inexistente: ${movimientos[i][0]} (fila ${i + 1})`);
      }
      
      if (tipo && !Object.values(TIPOS_MOVIMIENTO).includes(tipo)) {
        errores.push(`Tipo de movimiento inválido: ${tipo} (fila ${i + 1})`);
      }
      
      if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
        errores.push(`Cantidad inválida en movimiento: ${cantidad} (fila ${i + 1})`);
      }
      
      if (movimientos[i][1]) {
        try {
          new Date(movimientos[i][1]);
        } catch (e) {
          errores.push(`Fecha inválida en movimiento (fila ${i + 1}): ${movimientos[i][1]}`);
        }
      }
    }
    
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][0]) continue;
      
      const codigo = productos[i][0];
      const stock = calcularStock(codigo);
      
      if (stock < 0) {
        errores.push(`Producto ${codigo} tiene stock negativo: ${stock}`);
      }
    }
    
    return { errores };
  } catch (error) {
    errores.push(`Error al validar integridad: ${error.message}`);
    return { errores };
  }
}
/**
 * Función AVANZADA para eliminar duplicados basándose en el CONTENIDO.
 * Ignora el ID y compara: Vendedor + Items + Total + Lugar Entrega + Fecha.
 * Mantiene la primera aparición y elimina las copias posteriores.
 */
function eliminarVentasDuplicadas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_VENTAS);
  
  if (!hoja) {
    Logger.log("❌ No se encontró la hoja de Ventas.");
    return "No se encontró la hoja.";
  }

  const datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return "No hay datos.";

  const filasUnicas = [];
  const huellasVistas = new Set(); // Aquí guardaremos la "firma" de cada venta
  let duplicadosEncontrados = 0;

  // Índices de columnas basados en tu imagen (A=0, B=1, etc.)
  // Ajusta estos números si tus columnas cambian
  const COL_FECHA = 1;     // B: Fecha
  const COL_VENDEDOR = 4;  // E: Vendedor
  const COL_ITEMS = 6;     // G: Items Vendidos
  const COL_TOTAL = 9;     // J: Total
  const COL_LUGAR = 11;    // L: Lugar Entrega

  // Recorremos cada fila
  for (let i = 0; i < datos.length; i++) {
    // Si es el encabezado (fila 0), lo guardamos siempre
    if (i === 0) {
      filasUnicas.push(datos[i]);
      continue;
    }

    const fila = datos[i];

    // Formateamos la fecha corta (sin hora) para comparar
    // Esto agrupa ventas hechas el mismo día
    let fechaCorta = "";
    try {
      if (fila[COL_FECHA] instanceof Date) {
        fechaCorta = Utilities.formatDate(fila[COL_FECHA], Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        fechaCorta = String(fila[COL_FECHA]).split(' ')[0]; // Intento básico si es texto
      }
    } catch (e) { fechaCorta = "error-fecha"; }

    // CREAMOS LA "HUELLA DIGITAL" ÚNICA DE LA VENTA
    // Concatenamos: Fecha + Vendedor + ItemsExactos + TotalExacto + Lugar
    const huella = [
      fechaCorta,
      fila[COL_VENDEDOR],
      fila[COL_ITEMS],
      fila[COL_TOTAL],
      fila[COL_LUGAR]
    ].join("|").toUpperCase().trim();

    // Verificamos si esa combinación exacta ya existía antes
    if (huellasVistas.has(huella)) {
      duplicadosEncontrados++;
      Logger.log(`🗑️ Duplicado encontrado (Fila ${i+1}): ${huella}`);
      // NO lo agregamos a filasUnicas, así que se elimina
    } else {
      // Es una venta nueva/única, la guardamos
      huellasVistas.add(huella);
      filasUnicas.push(fila);
    }
  }

  if (duplicadosEncontrados > 0) {
    // Sobrescribimos la hoja con los datos limpios
    hoja.clearContents();
    hoja.getRange(1, 1, filasUnicas.length, filasUnicas[0].length).setValues(filasUnicas);
    
    const msg = `✅ Limpieza PROFUNDA completada. Se eliminaron ${duplicadosEncontrados} ventas con contenido duplicado.`;
    Logger.log(msg);
    return msg;
  } else {
    const msg = "✅ No se encontraron duplicados de contenido.";
    Logger.log(msg);
    return msg;
  }
}
/**
 * Función de emergencia para restaurar Fechas y Horas borradas
 * extrayendo la información directamente del ID de Venta (Columna A).
 * Formato esperado ID: V-YYYYMMDD-HHMMSS
 */
function recuperarFechasPerdidas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName(HOJA_VENTAS);
  
  if (!hoja) return "No se encontró la hoja Ventas";

  const datos = hoja.getDataRange().getValues();
  // Índices de columnas (A=0, B=1, C=2...)
  const COL_ID = 0;
  const COL_FECHA = 1;
  const COL_HORA_SALIDA = 2;
  
  const actualizaciones = [];
  let recuperados = 0;

  // Empezamos en 1 para saltar encabezados
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const idVenta = String(fila[COL_ID]);
    const tieneFecha = fila[COL_FECHA] && String(fila[COL_FECHA]).trim() !== "";
    
    // Si falta la fecha Y el ID tiene el formato correcto
    if (!tieneFecha && idVenta.startsWith("V-")) {
      try {
        // Extraer partes del ID: V-20251108-181518
        // Partes: ["V", "20251108", "181518"]
        const partes = idVenta.split('-');
        
        if (partes.length >= 3) {
          const fechaStr = partes[1]; // 20251108
          const horaStr = partes[2];  // 181518
          
          // Reconstruir Fecha: Año, Mes (base 0), Día
          const anio = parseInt(fechaStr.substring(0, 4));
          const mes = parseInt(fechaStr.substring(4, 6)) - 1; 
          const dia = parseInt(fechaStr.substring(6, 8));
          
          // Reconstruir Hora
          const hora = parseInt(horaStr.substring(0, 2));
          const min = parseInt(horaStr.substring(2, 4));
          
          // Crear objeto fecha
          const fechaObj = new Date(anio, mes, dia, hora, min);
          
          // Formatear para la celda
          // Nota: Hora Salida la estimamos con la hora del ID si está vacía
          const fechaFormateada = Utilities.formatDate(fechaObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
          const horaFormateada = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          
          // Guardar coordenadas para actualizar: [fila (base 1), col (base 1), valor]
          // Actualizar Fecha (Col 2)
          hoja.getRange(i + 1, 2).setValue(fechaFormateada);
          
          // Actualizar Hora Salida (Col 3) solo si está vacía
          if (!fila[COL_HORA_SALIDA]) {
            hoja.getRange(i + 1, 3).setValue(horaFormateada);
          }
          
          recuperados++;
        }
      } catch (e) {
        Logger.log(`Error en fila ${i+1}: ${e.message}`);
      }
    }
  }
  
  const msj = `✅ Proceso terminado. Se recuperaron ${recuperados} filas con fechas perdidas.`;
  Logger.log(msj);
  return msj;
}
