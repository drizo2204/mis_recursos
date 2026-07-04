function registrarMovimientoFinanciero(datos) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let hojaFinanzas = ss.getSheetByName(HOJA_FINANZAS);

    // Si no existe la hoja, crearla con encabezados
    if (!hojaFinanzas) {
      hojaFinanzas = ss.insertSheet(HOJA_FINANZAS);
      const encabezados = [[
        "ID_Movimiento",
        "Fecha",
        "Tipo",
        "Categoría",
        "Monto",
        "Responsable",
        "Observaciones"
      ]];
      hojaFinanzas.getRange(1, 1, 1, 7).setValues(encabezados);
      hojaFinanzas.getRange(1, 1, 1, 7)
        .setBackground("#28a745")
        .setFontColor("white")
        .setFontWeight("bold");
      hojaFinanzas.setFrozenRows(1);
      hojaFinanzas.autoResizeColumns(1, 7);
    }

    // ========================================
    // VALIDACIONES
    // ========================================
    if (!datos.tipo || (datos.tipo !== "Ingreso" && datos.tipo !== "Gasto")) {
      return { success: false, message: "❌ El tipo de movimiento es obligatorio (Ingreso o Gasto)." };
    }

    if (!datos.categoria) {
      return { success: false, message: "❌ La categoría es obligatoria." };
    }

    const monto = parseFloat(datos.monto);
    if (isNaN(monto) || monto <= 0) {
      return { success: false, message: "❌ El monto debe ser un número mayor a 0." };
    }

    if (!datos.responsable) {
      return { success: false, message: "❌ El responsable es obligatorio." };
    }

    if (!datos.fecha) {
      return { success: false, message: "❌ La fecha es obligatoria." };
    }

    // ========================================
    // GENERAR ID ÚNICO
    // ========================================
    const timestamp = new Date();
    const idMovimiento = "FIN-" + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");

    // ========================================
    // GUARDAR EN LA HOJA
    // ========================================
    hojaFinanzas.appendRow([
      idMovimiento,
      datos.fecha,
      datos.tipo,
      datos.categoria,
      monto,               // Se guarda como número
      datos.responsable,
      datos.observaciones || ""
    ]);

    Logger.log("✅ Movimiento financiero registrado: " + idMovimiento);

    // ========================================
    // RESPUESTA EXITOSA
    // ========================================
    const emoji = datos.tipo === "Ingreso" ? "📈" : "📉";

    return {
      success: true,
      message: `✅ Movimiento financiero registrado exitosamente.\n\n` +
               `📋 ID: ${idMovimiento}\n` +
               `📅 Fecha: ${datos.fecha}\n` +
               `${emoji} Tipo: ${datos.tipo}\n` +
               `🏷️ Categoría: ${datos.categoria}\n` +
               `💰 Monto: $${monto.toFixed(2)}\n` +
               `👤 Responsable: ${datos.responsable}\n` +
               (datos.observaciones ? `📝 Observaciones: ${datos.observaciones}` : "")
    };

  } catch (error) {
    console.error("❌ Error en registrarMovimientoFinanciero:", error);
    Logger.log("Error stack: " + error.stack);
    return {
      success: false,
      message: `❌ Error del sistema: ${error.message}\n\nEl movimiento NO ha sido registrado.`
    };
  }
}

// ─────────────────────────────────────────────────────────
// NUEVO: Obtener historial de finanzas para la UI
// ─────────────────────────────────────────────────────────
function obtenerHistorialFinanzas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoja = ss.getSheetByName(HOJA_FINANZAS);
    if (!hoja || hoja.getLastRow() <= 1) {
      return { movimientos: [] };
    }
    const datos = hoja.getDataRange().getValues();
    const encabezados = datos[0]; // ID, Fecha, Tipo, Categoria, Monto, Responsable, Observaciones
    const movimientos = [];
    for (var i = 1; i < datos.length; i++) {
      var fila = datos[i];
      if (!fila[0]) continue;
      movimientos.push({
        id:          String(fila[0] || ''),
        fecha:       fila[1] ? Utilities.formatDate(new Date(fila[1]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
        tipo:        String(fila[2] || ''),
        categoria:   String(fila[3] || ''),
        monto:       parseFloat(fila[4]) || 0,
        responsable: String(fila[5] || ''),
        descripcion: String(fila[6] || '')
      });
    }
    // Ordenar por fecha descendente (más recientes primero)
    movimientos.sort(function(a, b) {
      return b.id.localeCompare(a.id);
    });
    return { movimientos: movimientos };
  } catch (e) {
    Logger.log('Error obtenerHistorialFinanzas: ' + e.message);
    return { movimientos: [] };
  }
}
