function obtenerHistorial(filtros) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const ventasSheet = ss.getSheetByName(HOJA_VENTAS);
    
    if (!movSheet || !prodSheet) {
      throw new Error("Las hojas del sistema no existen.");
    }
    
    const movimientos = movSheet.getDataRange().getValues();
    const productos = prodSheet.getDataRange().getValues();
    
    if (movimientos.length <= 1) {
      return [];
    }
    
    // Crear mapa de nombres de productos
    const prodMap = {};
    for (let i = 1; i < productos.length; i++) {
      if (productos[i][0]) {
        prodMap[productos[i][0].toString().toUpperCase()] = productos[i][1];
      }
    }
    
    // Validar fechas
    const fechaDesde = new Date(filtros.fechaDesde + 'T00:00:00');
    const fechaHasta = new Date(filtros.fechaHasta + 'T23:59:59');
    
    if (fechaDesde > fechaHasta) {
      throw new Error("La fecha 'desde' no puede ser posterior a la fecha 'hasta'");
    }
    
    const resultado = [];
    
    // Leer encabezados de movimientos (normalizar sin acentos para evitar desajustes)
    const headersMov = movimientos[0];
    const colMov = {};
    headersMov.forEach((h, i) => {
      // Guardar con nombre original y tambien sin acentos
      const original = h.toString().trim();
      const sinAcentos = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      colMov[original] = i;
      colMov[sinAcentos] = i;
      
      // Fallback robusto para posibles caracteres corruptos (ej. 'Cdigo')
      const lower = original.toLowerCase();
      if (lower.includes('digo')) colMov['Codigo'] = i;
      if (lower.includes('fecha')) colMov['Fecha'] = i;
      if (lower.includes('tipo')) colMov['Tipo'] = i;
      if (lower.includes('cantidad')) colMov['Cantidad'] = i;
      if (lower.includes('usuario')) colMov['Usuario'] = i;
      if (lower.includes('observacion')) colMov['Observaciones'] = i;
      if (lower.includes('ubicaci') || lower.includes('ubicacion')) colMov['Ubicacion'] = i;
    });
    
    Logger.log(" Encabezados Movimientos: " + JSON.stringify(colMov));
    
    // Procesar movimientos con filtros avanzados
    for (let i = 1; i < movimientos.length; i++) {
      const mov = movimientos[i];
      if (!mov[colMov['Codigo']] || !mov[colMov['Fecha']]) continue;
      
      try {
        const fechaMov = new Date(mov[colMov['Fecha']]);
        const tipoMov = mov[colMov['Tipo']] ? mov[colMov['Tipo']].toString().toUpperCase() : "";
        const codigoProducto = mov[colMov['Codigo']].toString().toUpperCase();
        const ubicacionCol = colMov['Ubicacion'] !== undefined ? colMov['Ubicacion'] : 8;
        const ubicacionMov = mov[ubicacionCol] ? mov[ubicacionCol].toString().trim() : "";
        
        // FILTRO POR FECHA
        if (fechaMov < fechaDesde || fechaMov > fechaHasta) {
          continue;
        }
        
        // FILTRO POR TIPO DE MOVIMIENTO
        if (filtros.tipo && tipoMov !== filtros.tipo.toUpperCase()) {
          continue;
        }
        
        // FILTRO POR UBICACION
        if (filtros.ubicacion && filtros.ubicacion !== "" && ubicacionMov !== filtros.ubicacion) {
          continue;
        }
        
        // FILTRO POR PRODUCTO
        if (filtros.producto && filtros.producto !== "" && codigoProducto !== filtros.producto.toUpperCase()) {
          continue;
        }
        
        // Construir registro
        const registro = {
          codigo: mov[colMov['Codigo']],
          fecha: Utilities.formatDate(fechaMov, Session.getScriptTimeZone(), "dd/MM/yyyy"),
          tipo: tipoMov,
          cantidad: parseFloat(mov[colMov['Cantidad']]) || 0,
          producto: prodMap[codigoProducto] || "Producto no encontrado",
          observaciones: mov[colMov['Observaciones']] || "",
          usuario: mov[colMov['Usuario']] || "N/A",
          ubicacion: ubicacionMov || "-"
        };
        
        // Si es una VENTA, intentar obtener informacion del vendedor
        if (tipoMov === 'VENTA' && ventasSheet) {
          const infoVenta = obtenerInfoVentaPorObservacion(mov[colMov['Observaciones']], ventasSheet, codigoProducto);
          if (infoVenta) {
            registro.vendedor = infoVenta.vendedor;
            registro.entregador = infoVenta.entregador;
            registro.lugarEntrega = infoVenta.lugarEntrega;
            registro.montoTotal = infoVenta.montoTotal;
            
            // FILTRO POR VENDEDOR (solo aplica a ventas)
            if (filtros.vendedor && filtros.vendedor !== "" && registro.vendedor !== filtros.vendedor) {
              continue;
            }
          }
        }
        
        resultado.push(registro);
        
      } catch (dateError) {
        console.warn(`Fecha invalida en movimiento fila ${i + 1}:`, mov[colMov['Fecha']]);
        continue;
      }
    }
    
    Logger.log(` Historial generado: ${resultado.length} movimientos encontrados`);
    
    // Ordenar por fecha descendente
    return resultado.sort((a, b) => {
      const fechaA = new Date(a.fecha.split('/').reverse().join('-'));
      const fechaB = new Date(b.fecha.split('/').reverse().join('-'));
      return fechaB - fechaA;
    });
    
  } catch (error) {
    console.error("Error en obtenerHistorial:", error);
    Logger.log("Error stack: " + error.stack);
    return [];
  }
}

function obtenerResumen() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const prodSheet = ss.getSheetByName(HOJA_PRODUCTOS);
    const movSheet = ss.getSheetByName(HOJA_MOVIMIENTOS);
    
    if (!prodSheet || !movSheet) {
      return { totalProductos: 0, totalMovimientos: 0, sinStock: 0, stockBajo: 0, valorTotalInventario: 0 };
    }
    
    const productos = prodSheet.getDataRange().getValues();
    const movimientos = movSheet.getDataRange().getValues();
    
    const totalProductos = Math.max(0, productos.length - 1);
    const totalMovimientos = Math.max(0, movimientos.length - 1);
    
    // OPTIMIZACIÓN: Calcular stock de TODOS los productos en UN SOLO recorrido
    var stockMap = {};
    var fechaUnMesAtras = new Date();
    fechaUnMesAtras.setMonth(fechaUnMesAtras.getMonth() - 1);
    var movimientosUltimoMes = 0;
    
    for (var m = 1; m < movimientos.length; m++) {
      var cod = movimientos[m][0];
      var fecha = movimientos[m][1];
      var tipo = movimientos[m][2];
      var cant = movimientos[m][3];
      if (!cod) continue;
      
      var codigoNorm = cod.toString().trim().toUpperCase();
      if (!stockMap[codigoNorm]) stockMap[codigoNorm] = 0;
      
      var valor = parseFloat(cant) || 0;
      var tipoMov = tipo ? tipo.toString().toUpperCase() : '';
      
      if (tipoMov === 'INGRESO' || tipoMov === 'AJUSTE_POSITIVO' || tipoMov === 'AJUSTE') {
        stockMap[codigoNorm] += valor;
      } else if (tipoMov === 'SALIDA' || tipoMov === 'AJUSTE_NEGATIVO' || tipoMov === 'VENTA') {
        stockMap[codigoNorm] -= valor;
      }
      
      if (fecha) {
        try {
          var fechaMov = new Date(fecha);
          if (fechaMov >= fechaUnMesAtras) movimientosUltimoMes++;
        } catch (e) { }
      }
    }
    
    let sinStock = 0;
    let stockBajo = 0;
    let valorTotalInventario = 0;
    
    for (let i = 1; i < productos.length; i++) {
      if (!productos[i][0]) continue;
      
      const codigo = productos[i][0].toString().trim().toUpperCase();
      const stockMin = Math.max(0, parseInt(productos[i][4]) || 0);
      const stock = Math.max(0, Math.round((stockMap[codigo] || 0) * 100) / 100);
      const precio = parseFloat(productos[i][5]) || 0;
      
      if (stock <= 0) {
        sinStock++;
      } else if (stock <= stockMin && stockMin > 0) {
        stockBajo++;
      }
      
      valorTotalInventario += (stock * precio);
    }
    
    return {
      totalProductos,
      totalMovimientos,
      sinStock,
      stockBajo,
      valorTotalInventario: Math.round(valorTotalInventario * 100) / 100,
      movimientosUltimoMes
    };
  } catch (error) {
    console.error("Error en obtenerResumen:", error);
    return { totalProductos: 0, totalMovimientos: 0, sinStock: 0, stockBajo: 0, valorTotalInventario: 0 };
  }
}

function obtenerDatosAnaliticos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hojaVentas = ss.getSheetByName(HOJA_VENTAS);
    const hojaInventario = ss.getSheetByName(HOJA_INVENTARIO);
    const hojaProductos = ss.getSheetByName(HOJA_PRODUCTOS);
    
    if (!hojaVentas || !hojaInventario || !hojaProductos) {
      Logger.log(" Faltan hojas requeridas para el dashboard");
      return generarDatosVacios();
    }
    
    const datosVentas = hojaVentas.getDataRange().getValues();
    const datosInventario = hojaInventario.getDataRange().getValues();
    const datosProductos = hojaProductos.getDataRange().getValues();
    
    if (datosVentas.length <= 1) {
      Logger.log(" No hay datos de ventas");
      return generarDatosVacios();
    }
    
    // Procesar datos
    const kpis = calcularKPIsDashboard(datosVentas, datosInventario, datosProductos);
    const ventasMensuales = calcularVentasMensuales(datosVentas, datosProductos);
    const topProductos = calcularTopProductos(datosVentas, datosProductos);
    const stockPorUbicacion = calcularStockPorUbicacion(datosInventario);
    const alertasStock = calcularAlertasStock(datosInventario, datosProductos);
    const mejoresVendedores = calcularMejoresVendedores(datosVentas);
    const topLugares = calcularTopLugares(datosVentas);
    const ventasPorCanal = calcularVentasPorCanal(datosVentas);
    const recomendaciones = generarRecomendaciones(kpis, alertasStock.length);
    
    return {
      kpis,
      ventasMensuales,
      topProductos,
      stockPorUbicacion,
      alertasStock,
      mejoresVendedores,
      topLugares,
      ventasPorCanal,
      recomendaciones
    };
    
  } catch (error) {
    console.error(" Error en obtenerDatosAnaliticos:", error);
    Logger.log("Error stack: " + error.stack);
    return generarDatosVacios();
  }
}

function calcularKPIsDashboard(datosVentas, datosInventario, datosProductos) {
  let ventasTotales = 0;
  let ventasMes = 0;
  let costosTotales = 0;
  let totalTransacciones = 0;
  let totalEnvios = 0;
  let totalEnviosMes = 0;
  let transaccionesConEnvio = 0; //  Contador de entregas con envio cobrado
  
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anoActual = hoy.getFullYear();
  
  Logger.log(" Fecha actual: " + hoy.toLocaleDateString('es-ES'));
  Logger.log(" Mes actual: " + mesActual + " (0=Enero, 11=Diciembre)");
  Logger.log(" Ano actual: " + anoActual);
  
  // Crear mapa de costos
  const costosMap = {};
  for (let i = 1; i < datosInventario.length; i++) {
    const codigo = datosInventario[i][0]?.toString().toUpperCase();
    const costo = Number(datosInventario[i][4]) || 0;
    
    if (codigo && costo > 0) {
      if (!costosMap[codigo]) {
        costosMap[codigo] = { total: 0, count: 0 };
      }
      costosMap[codigo].total += costo;
      costosMap[codigo].count++;
    }
  }
  
  const costoPromedioMap = {};
  Object.keys(costosMap).forEach(codigo => {
    costoPromedioMap[codigo] = costosMap[codigo].total / costosMap[codigo].count;
  });
  
  // ============================================
  //  SECCION CORREGIDA: Procesar Ventas
  // ============================================
  Logger.log("\n Procesando " + (datosVentas.length - 1) + " ventas...");
  
  for (let i = 1; i < datosVentas.length; i++) {
    try {
      const total = Number(datosVentas[i][9]) || 0;        // Columna "Total"
      const envio = Number(datosVentas[i][8]) || 0;        // Columna "Envio Cobrado"
      const fechaVenta = new Date(datosVentas[i][1]);      // Columna "Fecha"
      
      // Validar que la fecha sea valida
      if (isNaN(fechaVenta.getTime())) {
        Logger.log(" Fecha invalida en fila " + (i + 1));
        continue;
      }
      
      // Sumar totales
      ventasTotales += total;
      totalEnvios += envio;
      totalTransacciones++;
      
      if (envio > 0) {
        transaccionesConEnvio++;
      }
      
      //  CORRECCION: Comparar mes y ano correctamente
      const mesVenta = fechaVenta.getMonth();
      const anoVenta = fechaVenta.getFullYear();
      
      if (mesVenta === mesActual && anoVenta === anoActual) {
        ventasMes += total;
        totalEnviosMes += envio;
        
        Logger.log(" Venta del mes actual - Fila " + (i + 1) + ": Envio $" + envio);
      }
      
      // Calcular COGS usando parsearItems (compatible con formato CODE:QTY)
      const items = parsearItems(datosVentas[i][6] || "");
      
      for (const item of items) {
        const costoUnitario = costoPromedioMap[item.codigo] || 0;
        costosTotales += (costoUnitario * item.cantidad);
      }
      
    } catch (error) {
      Logger.log(" Error procesando fila " + (i + 1) + ": " + error.message);
      continue;
    }
  }
  
  Logger.log("\n RESUMEN DE ENVIOS:");
  Logger.log("   Total Envios (historico): $" + totalEnvios.toFixed(2));
  Logger.log("   Envios del Mes: $" + totalEnviosMes.toFixed(2));
  Logger.log("   Transacciones totales: " + totalTransacciones);
  Logger.log("   Transacciones con envio: " + transaccionesConEnvio);
  
  // Calcular Valor de Inventario
  let stockTotal = 0;
  const codigosConStock = new Set();
  let valorInventarioAlCosto = 0;
  
  for (let i = 1; i < datosInventario.length; i++) {
    const codigo = (datosInventario[i][0] || "").toString().toUpperCase();
    const cantidad = Number(datosInventario[i][2]) || 0;
    const costo = Number(datosInventario[i][4]) || 0;
    
    stockTotal += cantidad;
    if (cantidad > 0 && codigo) codigosConStock.add(codigo);
    valorInventarioAlCosto += (cantidad * costo);
  }
  const productosConStock = codigosConStock.size;
  
  // Calcular KPIs
  const rotacionInventario = valorInventarioAlCosto > 0 ? 
    (costosTotales / valorInventarioAlCosto) : 0;
  
  const productosUnicos = datosProductos.length - 1;
  
  const margenPromedio = ventasTotales > 0 ? 
    ((ventasTotales - costosTotales) / ventasTotales * 100) : 0;
  
  const ticketPromedio = totalTransacciones > 0 ? 
    (ventasTotales / totalTransacciones) : 0;
  
  const disponibilidad = productosUnicos > 0 ? 
    (productosConStock / productosUnicos * 100) : 0;
  
  // ============================================
  //  RETURN CORREGIDO
  // ============================================
  return {
    ventasTotales: Math.round(ventasTotales * 100) / 100,
    ventasMes: Math.round(ventasMes * 100) / 100,
    totalEnvios: Math.round(totalEnvios * 100) / 100,
    totalEnviosMes: Math.round(totalEnviosMes * 100) / 100,
    totalTransacciones: totalTransacciones, //  Agregar para calculo de promedio
    transaccionesConEnvio: transaccionesConEnvio, //  Para estadisticas adicionales
    productosUnicos,
    stockTotal,
    margenPromedio: Math.round(margenPromedio * 10) / 10,
    rotacionInventario: Math.round(rotacionInventario * 100) / 100,
    ticketPromedio: Math.round(ticketPromedio * 100) / 100,
    disponibilidad: Math.round(disponibilidad * 10) / 10,
    _debug: {
      costosTotales: Math.round(costosTotales * 100) / 100,
      valorInventarioAlCosto: Math.round(valorInventarioAlCosto * 100) / 100,
      productosConCosto: Object.keys(costoPromedioMap).length,
      mesActual: mesActual,
      anoActual: anoActual
    }
  };
}

function calcularVentasMensuales(datosVentas, datosProductos) {
  const ventasPorMes = {};
  
  for (let i = 1; i < datosVentas.length; i++) {
    const fecha = new Date(datosVentas[i][1]);
    const mesAno = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "yyyy-MM");
    const total = Number(datosVentas[i][9]) || 0; // Col J - Total de la linea
    
    if (!ventasPorMes[mesAno]) {
      ventasPorMes[mesAno] = { ventas: 0, costos: 0 };
    }
    
    ventasPorMes[mesAno].ventas += total;
    
    // Calcular costos usando parsearItems (compatible con formato CODE:QTY)
    const items = parsearItems(datosVentas[i][6] || "");
    
    for (const item of items) {
      const costo = obtenerCostoProducto(item.codigo, datosProductos);
      ventasPorMes[mesAno].costos += costo * item.cantidad;
    }
  }
  
  // Convertir a array y ordenar por fecha
  const resultado = [];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  Object.keys(ventasPorMes).sort().slice(-6).forEach(mesAno => {
    const [ano, mes] = mesAno.split('-');
    const nombreMes = meses[parseInt(mes) - 1];
    
    resultado.push({
      mes: nombreMes,
      ventas: Math.round(ventasPorMes[mesAno].ventas),
      costos: Math.round(ventasPorMes[mesAno].costos)
    });
  });
  
  return resultado;
}

function calcularTopProductos(datosVentas, datosProductos) {
  const productoStats = {};
  
  // Crear mapa de precios y nombres por codigo
  const productosMap = {};
  for (let i = 1; i < datosProductos.length; i++) {
    const codigo = datosProductos[i][0];
    const nombreBase = datosProductos[i][1];
    const precio = Number(datosProductos[i][5]) || 0;
    
    productosMap[codigo] = {
      nombreBase: nombreBase,
      precio: precio,
      nombreCompleto: construirNombreConVariante(codigo, nombreBase)
    };
  }
  
  // Procesar ventas usando parsearItems (compatible con formato CODE:QTY)
  for (let i = 1; i < datosVentas.length; i++) {
    const items = parsearItems(datosVentas[i][6] || "");
    
    for (const item of items) {
      if (!productoStats[item.codigo]) {
        const infoProducto = productosMap[item.codigo];
        
        productoStats[item.codigo] = {
          codigo: item.codigo,
          nombreBase: infoProducto ? infoProducto.nombreBase : "Desconocido",
          nombreCompleto: infoProducto ? infoProducto.nombreCompleto : item.codigo,
          cantidad: 0,
          ingresos: 0,
          precio: infoProducto ? infoProducto.precio : 0
        };
      }
      
      productoStats[item.codigo].cantidad += item.cantidad;
      productoStats[item.codigo].ingresos += (productoStats[item.codigo].precio * item.cantidad);
    }
  }
  
  // Convertir a array y ordenar por ingresos
  const resultado = Object.values(productoStats)
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 5)
    .map(p => ({
      nombre: p.nombreCompleto,        // Nombre con variante para el grafico
      nombreCorto: acortarNombre(p.nombreCompleto, 35), // Version corta si es muy largo
      codigo: p.codigo,                // Para referencia
      cantidad: Math.round(p.cantidad),
      ingresos: Math.round(p.ingresos)
    }));
  
  Logger.log(" Top 5 Productos:");
  resultado.forEach(p => {
    Logger.log(`   ${p.nombre}: ${p.cantidad} uds - $${p.ingresos}`);
  });
  
  return resultado;
}

/**
 * Construye un nombre descriptivo incluyendo la variante del codigo
 * Ejemplos:
 *   TSBL-XL  "Camisa de Compresion (XL)"
 *   BKBK-M  "Camisa de Bersek (M)"
 *   HUB-8  "Hub 8 Puertos"
 */
function construirNombreConVariante(codigo, nombreBase) {
  if (!codigo || !nombreBase) {
    return codigo || nombreBase || "Desconocido";
  }
  
  // Si el codigo no tiene guion, devolver nombre base
  if (codigo.indexOf('-') === -1) {
    return nombreBase;
  }
  
  // Extraer la parte despues del ultimo guion
  const partes = codigo.split('-');
  const variante = partes[partes.length - 1];
  
  // Casos especiales: si la variante es solo numeros, podria no ser una talla
  // Ejemplo: HUB-8  "Hub 8 Puertos" (no agregar variante)
  if (/^\d+$/.test(variante) && nombreBase.toLowerCase().includes(variante)) {
    return nombreBase;
  }
  
  // Casos de tallas comunes
  const tallasComunes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  const esTalla = tallasComunes.includes(variante.toUpperCase());
  
  // Construir nombre descriptivo
  let nombreCompleto = nombreBase;
  
  // Acortar nombre base si es muy largo (mas de 40 caracteres)
  if (nombreCompleto.length > 40) {
    nombreCompleto = nombreCompleto.substring(0, 40);
  }
  
  // Agregar variante entre parentesis
  if (esTalla) {
    nombreCompleto += ` (Talla ${variante})`;
  } else if (variante.length <= 4) {
    nombreCompleto += ` (${variante})`;
  } else {
    nombreCompleto += ` - ${variante}`;
  }
  
  return nombreCompleto;
}

/**
 * Acorta un nombre si supera el limite de caracteres
 */
function acortarNombre(nombre, maxLength) {
  if (!nombre || nombre.length <= maxLength) {
    return nombre;
  }
  
  return nombre.substring(0, maxLength - 3) + '...';
}

/**
 * Parsea items vendidos (mantener funcion existente)
 */
function parsearItems(itemsTexto) {
  const items = [];
  
  if (!itemsTexto || itemsTexto.trim() === "") {
    return items;
  }
  
  const partes = itemsTexto.split(',');
  
  for (const parte of partes) {
    const trimmed = parte.trim();
    
    if (trimmed.includes(':')) {
      const [codigo, cantidad] = trimmed.split(':');
      
      if (codigo && cantidad) {
        items.push({
          codigo: codigo.trim().toUpperCase(),
          cantidad: parseInt(cantidad) || 0
        });
      }
    } else {
      const partesSeparadas = trimmed.split('-');
      if (partesSeparadas.length >= 3) {
        const cantidad = parseInt(partesSeparadas[partesSeparadas.length - 1]);
        const codigo = partesSeparadas.slice(0, -1).join('-');
        
        if (codigo && !isNaN(cantidad)) {
          items.push({
            codigo: codigo.trim().toUpperCase(),
            cantidad: cantidad
          });
        }
      }
    }
  }
  
  return items;
}

function calcularStockPorUbicacion(datosInventario) {
  const stockPorUbicacion = {};
  
  // Columnas: codigo, nombre, cantidad, descripcion, costo, precio, ubicacion, fecha
  for (let i = 1; i < datosInventario.length; i++) {
    const ubicacion = datosInventario[i][6] || "Sin ubicacion";
    const cantidad = Number(datosInventario[i][2]) || 0;
    
    if (!stockPorUbicacion[ubicacion]) {
      stockPorUbicacion[ubicacion] = 0;
    }
    
    stockPorUbicacion[ubicacion] += cantidad;
  }
  
  return Object.keys(stockPorUbicacion).map(ub => ({
    nombre: ub,
    cantidad: Math.round(stockPorUbicacion[ub]),
    value: Math.round(stockPorUbicacion[ub])
  }));
}

function calcularAlertasStock(datosInventario, datosProductos) {
  const alertas = [];
  const stockPorCodigo = {};
  
  // Agrupar stock por codigo
  for (let i = 1; i < datosInventario.length; i++) {
    const codigo = datosInventario[i][0];
    const cantidad = Number(datosInventario[i][2]) || 0;
    
    if (!stockPorCodigo[codigo]) {
      stockPorCodigo[codigo] = 0;
    }
    stockPorCodigo[codigo] += cantidad;
  }
  
  // Verificar contra stock minimo
  for (let i = 1; i < datosProductos.length; i++) {
    const codigo = datosProductos[i][0];
    const nombre = datosProductos[i][1];
    const stockMin = Number(datosProductos[i][4]) || 10;
    const stockActual = stockPorCodigo[codigo] || 0;
    
    if (stockActual <= 5 || stockActual < stockMin) {
      alertas.push({
        codigo,
        nombre,
        stock: stockActual,
        minimo: stockMin
      });
    }
  }
  
  return alertas.slice(0, 6);
}

function calcularMejoresVendedores(datosVentas) {
  const vendedorStats = {};
  
  for (let i = 1; i < datosVentas.length; i++) {
    const vendedor = datosVentas[i][4] || "Sin vendedor";
    const total = Number(datosVentas[i][9]) || 0;
    
    if (!vendedorStats[vendedor]) {
      vendedorStats[vendedor] = { ventas: 0, monto: 0 };
    }
    
    vendedorStats[vendedor].ventas++;
    vendedorStats[vendedor].monto += total;
  }
  
  return Object.keys(vendedorStats)
    .map(v => ({
      nombre: v,
      ventas: vendedorStats[v].ventas,
      monto: Math.round(vendedorStats[v].monto * 100) / 100
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 3);
}

function calcularTopLugares(datosVentas) {
  const lugarStats = {};
  
  for (let i = 1; i < datosVentas.length; i++) {
    const lugar = datosVentas[i][11] || "Sin especificar";
    const total = Number(datosVentas[i][9]) || 0;
    
    if (!lugarStats[lugar]) {
      lugarStats[lugar] = { entregas: 0, monto: 0 };
    }
    
    lugarStats[lugar].entregas++;
    lugarStats[lugar].monto += total;
  }
  
  return Object.keys(lugarStats)
    .map(l => ({
      lugar: l,
      entregas: lugarStats[l].entregas,
      monto: Math.round(lugarStats[l].monto)
    }))
    .sort((a, b) => b.entregas - a.entregas)
    .slice(0, 4);
}

function calcularVentasPorCanal(datosVentas) {
  const canalStats = {};
  
  for (let i = 1; i < datosVentas.length; i++) {
    const canal = datosVentas[i][14] || "No especificado";
    const total = Number(datosVentas[i][9]) || 0;
    
    if (!canalStats[canal]) {
      canalStats[canal] = { cantidad: 0, monto: 0 };
    }
    
    canalStats[canal].cantidad++;
    canalStats[canal].monto += total;
  }
  
  return Object.keys(canalStats)
    .map(c => ({
      canal: c,
      cantidad: canalStats[c].cantidad,
      monto: Math.round(canalStats[c].monto * 100) / 100
    }))
    .sort((a, b) => b.monto - a.monto);
}

function generarRecomendaciones(kpis, alertasCount) {
  const recomendaciones = [];
  
  // Alertas de stock
  if (alertasCount > 0) {
    recomendaciones.push({
      tipo: 'critico',
      texto: `${alertasCount} producto(s) con stock critico - Requieren reabastecimiento inmediato`
    });
  }
  
  // Rotacion de inventario
  if (kpis.rotacionInventario > 6) {
    recomendaciones.push({
      tipo: 'advertencia',
      texto: `Rotacion alta (${kpis.rotacionInventario}x) - Considera aumentar stock de productos populares`
    });
  } else if (kpis.rotacionInventario < 2) {
    recomendaciones.push({
      tipo: 'advertencia',
      texto: `Rotacion baja (${kpis.rotacionInventario}x) - Evalua productos de lenta rotacion`
    });
  } else {
    recomendaciones.push({
      tipo: 'exito',
      texto: `Rotacion optima (${kpis.rotacionInventario}x) - Manten el equilibrio actual`
    });
  }
  
  // Margen de ganancia
  if (kpis.margenPromedio >= 40) {
    recomendaciones.push({
      tipo: 'exito',
      texto: `Margen saludable (${kpis.margenPromedio}%) - Manten la estrategia de precios`
    });
  } else if (kpis.margenPromedio < 25) {
    recomendaciones.push({
      tipo: 'critico',
      texto: `Margen bajo (${kpis.margenPromedio}%) - Revisa estructura de costos y precios`
    });
  }
  
  // Disponibilidad
  if (kpis.disponibilidad < 80) {
    recomendaciones.push({
      tipo: 'advertencia',
      texto: `Disponibilidad baja (${kpis.disponibilidad}%) - Objetivo: >95%`
    });
  } else {
    recomendaciones.push({
      tipo: 'info',
      texto: `Disponibilidad de stock al ${kpis.disponibilidad}% - Objetivo: >95%`
    });
  }
  
  return recomendaciones;
}

function exportarStockCSV() {
  try {
    const resultado = obtenerStockPorUbicacion();
    const ubicaciones = resultado.ubicaciones || [];
    const productos = resultado.productos || [];
    
    if (productos.length === 0) {
      return null;
    }
    
    let csv = "\uFEFF"; // BOM for UTF-8
    
    // Header row with dynamic warehouse columns
    csv += "Codigo,Nombre,Grupo";
    for (var u = 0; u < ubicaciones.length; u++) {
      csv += ',"' + ubicaciones[u] + '"';
    }
    csv += ",Total,Costo,Precio,Valor Total,Estado\n";
    
    productos.forEach(function(producto) {
      // Calculate total as strict sum of all warehouse quantities
      var totalCalculado = 0;
      for (var u = 0; u < ubicaciones.length; u++) {
        totalCalculado += Number(producto.ubicaciones[ubicaciones[u]]) || 0;
      }
      
      var estado = "Normal";
      if (totalCalculado <= 0) {
        estado = "Sin Stock";
      } else if (totalCalculado <= producto.stockMin && producto.stockMin > 0) {
        estado = "Stock Bajo";
      }
      
      var precio = Number(producto.precio) || 0;
      var valorTotal = totalCalculado * precio;
      
      csv += '"' + producto.codigo + '","' + producto.nombre + '","' + (producto.grupo || 'General') + '"';
      
      // Per-warehouse quantities
      for (var u = 0; u < ubicaciones.length; u++) {
        csv += ',' + (Number(producto.ubicaciones[ubicaciones[u]]) || 0);
      }
      
      var costo = Number(producto.costo) || 0;
      
      csv += ',' + totalCalculado + ',' + costo + ',' + precio + ',' + valorTotal.toFixed(2) + ',"' + estado + '"\n';
    });
    
    const fechaHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm-ss");
    const nombreArchivo = `Inventario_${fechaHora}.csv`;
    
    const blob = Utilities.newBlob(csv, 'text/csv; charset=utf-8', nombreArchivo);
    
    let carpeta;
    try {
      carpeta = DriveApp.getFoldersByName("Reportes Inventario").next();
    } catch (e) {
      carpeta = DriveApp.getRootFolder();
    }
    
    const archivo = carpeta.createFile(blob);
    
    return archivo.getUrl();
  } catch (error) {
    console.error("Error en exportarStockCSV:", error);
    return null;
  }
}

function exportarReporteConFiltros(filtros, movimientos) {
  try {
    if (!movimientos || movimientos.length === 0) {
      return null;
    }
    
    let csv = "\uFEFF"; // BOM para UTF-8
    
    // Encabezado del reporte
    csv += "=== REPORTE DE MOVIMIENTOS ===\n";
    csv += "Fecha de generacion: " + new Date().toLocaleString('es-ES') + "\n";
    csv += "Periodo: " + filtros.fechaDesde + " al " + filtros.fechaHasta + "\n";
    
    if (filtros.tipo) csv += "Tipo de movimiento: " + getTipoMovimientoTexto(filtros.tipo) + "\n";
    if (filtros.ubicacion) csv += "Ubicacion: " + filtros.ubicacion + "\n";
    if (filtros.producto) csv += "Producto: " + filtros.producto + "\n";
    if (filtros.vendedor) csv += "Vendedor: " + filtros.vendedor + "\n";
    
    csv += "Total de movimientos: " + movimientos.length + "\n\n";
    
    // Encabezados de la tabla
    csv += "Fecha,Codigo,Producto,Tipo,Cantidad,Ubicacion,Observaciones,Usuario";
    
    // Si hay ventas en el reporte, agregar columnas adicionales
    const hayVentas = movimientos.some(m => m.tipo === 'VENTA');
    if (hayVentas) {
      csv += ",Vendedor,Entregador,Lugar Entrega,Monto Total";
    }
    csv += "\n";
    
    // Datos
    movimientos.forEach(m => {
      csv += `"${m.fecha}",`;
      csv += `"${m.codigo}",`;
      csv += `"${m.producto}",`;
      csv += `"${getTipoMovimientoTexto(m.tipo)}",`;
      csv += `"${m.cantidad}",`;
      csv += `"${m.ubicacion || '-'}",`;
      csv += `"${m.observaciones}",`;
      csv += `"${m.usuario}"`;
      
      if (hayVentas) {
        csv += `,"${m.vendedor || '-'}"`;
        csv += `,"${m.entregador || '-'}"`;
        csv += `,"${m.lugarEntrega || '-'}"`;
        csv += `,"${m.montoTotal ? '$' + m.montoTotal.toFixed(2) : '-'}"`;
      }
      
      csv += "\n";
    });
    
    // Resumen estadistico
    csv += "\n=== RESUMEN ===\n";
    
    const resumen = calcularResumenMovimientos(movimientos);
    csv += "Total de movimientos: " + resumen.total + "\n";
    
    Object.keys(resumen.porTipo).forEach(tipo => {
      csv += getTipoMovimientoTexto(tipo) + ": " + resumen.porTipo[tipo] + "\n";
    });
    
    if (resumen.totalVentas > 0) {
      csv += "\nTotal en ventas: $" + resumen.totalVentas.toFixed(2) + "\n";
    }
    
    // Crear archivo
    const fechaHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm-ss");
    const nombreArchivo = `Reporte_Movimientos_${fechaHora}.csv`;
    
    const blob = Utilities.newBlob(csv, 'text/csv; charset=utf-8', nombreArchivo);
    
    let carpeta;
    try {
      carpeta = DriveApp.getFoldersByName("Reportes Inventario").next();
    } catch (e) {
      carpeta = DriveApp.getRootFolder();
    }
    
    const archivo = carpeta.createFile(blob);
    
    return archivo.getUrl();
  } catch (error) {
    console.error("Error en exportarReporteConFiltros:", error);
    return null;
  }
}

function calcularResumenMovimientos(movimientos) {
  const resumen = {
    total: movimientos.length,
    porTipo: {},
    totalVentas: 0
  };
  
  movimientos.forEach(m => {
    // Contar por tipo
    if (!resumen.porTipo[m.tipo]) {
      resumen.porTipo[m.tipo] = 0;
    }
    resumen.porTipo[m.tipo]++;
    
    // Sumar ventas
    if (m.tipo === 'VENTA' && m.montoTotal) {
      resumen.totalVentas += m.montoTotal;
    }
  });
  
  return resumen;
}

// NOTE: parsearItems is defined once above (around line 566).
// Do NOT duplicate it here.

/**
 * Obtiene el costo promedio de un producto desde Inventario
 */
function obtenerCostoProducto(codigo, datosProductos) {
  // Esta funcion ahora busca en datosInventario en lugar de datosProductos
  // Se mantiene por compatibilidad pero el calculo principal usa el mapa
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaInventario = ss.getSheetByName(HOJA_INVENTARIO);
  
  if (!hojaInventario) return 0;
  
  const datosInventario = hojaInventario.getDataRange().getValues();
  const codigoUpper = codigo.toString().toUpperCase();
  
  let totalCosto = 0;
  let count = 0;
  
  for (let i = 1; i < datosInventario.length; i++) {
    const codigoInv = datosInventario[i][0]?.toString().toUpperCase();
    
    if (codigoInv === codigoUpper) {
      const costo = Number(datosInventario[i][4]) || 0;
      if (costo > 0) {
        totalCosto += costo;
        count++;
      }
    }
  }
  
  return count > 0 ? (totalCosto / count) : 0;
}

/**
 * Obtiene el nombre de un producto
 */
function obtenerNombreProducto(codigo, datosProductos) {
  const codigoUpper = codigo.toString().toUpperCase();
  
  for (let i = 1; i < datosProductos.length; i++) {
    const codigoProd = datosProductos[i][0]?.toString().toUpperCase();
    
    if (codigoProd === codigoUpper) {
      return datosProductos[i][1] || "Desconocido";
    }
  }
  
  return "Producto no encontrado";
}

/**
 * Funcion de prueba para verificar el calculo
 */
function testRotacionInventario() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hojaVentas = ss.getSheetByName(HOJA_VENTAS);
    const hojaInventario = ss.getSheetByName(HOJA_INVENTARIO);
    const hojaProductos = ss.getSheetByName(HOJA_PRODUCTOS);
    
    const datosVentas = hojaVentas.getDataRange().getValues();
    const datosInventario = hojaInventario.getDataRange().getValues();
    const datosProductos = hojaProductos.getDataRange().getValues();
    
    const kpis = calcularKPIsDashboard(datosVentas, datosInventario, datosProductos);
    
    Logger.log("========================================");
    Logger.log("RESULTADOS DEL TEST:");
    Logger.log("========================================");
    Logger.log("Ventas Totales: $" + kpis.ventasTotales);
    Logger.log("Rotacion Inventario: " + kpis.rotacionInventario + "x");
    Logger.log("Margen Promedio: " + kpis.margenPromedio + "%");
    Logger.log("----------------------------------------");
    Logger.log("DEBUG:");
    Logger.log("COGS: $" + kpis._debug.costosTotales);
    Logger.log("Valor Inventario: $" + kpis._debug.valorInventarioAlCosto);
    Logger.log("Productos con Costo: " + kpis._debug.productosConCosto);
    Logger.log("========================================");
    
    return kpis;
  } catch (error) {
    Logger.log(" Error en test: " + error.message);
    Logger.log(error.stack);
  }
}

/**
 * ========================================
 * DASHBOARD DARK THEME - Backend Data
 * ========================================
 * Returns a JSON object with the exact structure expected by the
 * dark-theme Chart.js dashboard frontend.
 */
function obtenerDatosDashboardBackend() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hojaVentas = ss.getSheetByName(HOJA_VENTAS);
    const hojaInventario = ss.getSheetByName(HOJA_INVENTARIO);
    const hojaProductos = ss.getSheetByName(HOJA_PRODUCTOS);
    const hojaFinanzas = ss.getSheetByName(HOJA_FINANZAS);
    const hojaMovimientos = ss.getSheetByName(HOJA_MOVIMIENTOS);

    //  Read raw data 
    const datosVentas = hojaVentas ? hojaVentas.getDataRange().getValues() : [];
    const datosInventario = hojaInventario ? hojaInventario.getDataRange().getValues() : [];
    const datosProductos = hojaProductos ? hojaProductos.getDataRange().getValues() : [];
    const datosFinanzas = hojaFinanzas ? hojaFinanzas.getDataRange().getValues() : [];
    const datosMovimientos = hojaMovimientos ? hojaMovimientos.getDataRange().getValues() : [];

    //  Helpers 
    const tz = Session.getScriptTimeZone();
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anoActual = hoy.getFullYear();

    // Day-of-week names (English keys for the frontend mapping)
    const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    //  1) Process Sales rows 
    // Ventas col: 0=ID, 1=Fecha, 4=Vendedor, 6=Item(CODE:QTY), 7=Monto, 8=Envio, 9=Total
    const vendedorMesMap = {};     // "YYYY-MM|vendedor"  {total, ventas}
    const ventasDiaMap = {};       // "YYYY-MM-DD"  {total, ventas}
    const ventasDiaSemanaMap = {}; // "Monday"  {total, ventas}
    const ventasMesMap = {};       // "YYYY-MM"  {total, ventas}
    const productoQtyMap = {};     // "CODE"  qty
    const prodVendMap = {};        // "vendedor|CODE"  qty
    const vendedoresSet = new Set();
    const canalMap = {};           // "canal" -> {monto, cantidad}
    const mesesSet = new Set();

    let totalGeneral = 0;
    let totalTransacciones = 0;
    let totalEnvios = 0;
    let totalEnviosMes = 0;
    let costosTotales = 0;
    let mejorDia = { fecha: '', total: 0, ventas: 0 };
    let mejorVendedorNombre = '';
    let mejorVendedorTotal = 0;

    // Crear mapa de costos desde inventario para cálculos de márgen
    const costosMap = {};
    for (let i = 1; i < datosInventario.length; i++) {
      const codInv = (datosInventario[i][0] || '').toString().toUpperCase();
      const costoInv = Number(datosInventario[i][4]) || 0;
      if (codInv && costoInv > 0) {
        if (!costosMap[codInv]) costosMap[codInv] = { total: 0, count: 0 };
        costosMap[codInv].total += costoInv;
        costosMap[codInv].count++;
      }
    }
    const costoPromedioMap = {};
    Object.keys(costosMap).forEach(c => {
      costoPromedioMap[c] = costosMap[c].total / costosMap[c].count;
    });

    // ID-based grouping for transaction count (one sale = one ID)
    const ventasIDset = new Set();

    for (let i = 1; i < datosVentas.length; i++) {
      const row = datosVentas[i];
      if (!row[0] || !row[1]) continue;

      let fecha;
      try {
        fecha = new Date(row[1]);
        if (isNaN(fecha.getTime())) continue;
      } catch (e) { continue; }

      const vendedor = (row[4] || 'Sin vendedor').toString().trim();
      const total = Number(row[9]) || 0;
      const envio = Number(row[8]) || 0;
      const itemText = (row[6] || '').toString();
      const canal = (row[14] || 'No especificado').toString().trim();

      // Acumular envíos
      totalEnvios += envio;
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anoActual) {
        totalEnviosMes += envio;
      }

      // Calcular costos (COGS) para márgen
      const itemsParsed = parsearItems(itemText);
      for (const it of itemsParsed) {
        costosTotales += (costoPromedioMap[it.codigo] || 0) * it.cantidad;
      }
      const fechaStr = Utilities.formatDate(fecha, tz, 'yyyy-MM-dd');
      const mesStr = Utilities.formatDate(fecha, tz, 'yyyy-MM');
      const dow = DOW_NAMES[fecha.getDay()];

      vendedoresSet.add(vendedor);
      mesesSet.add(mesStr);
      totalGeneral += total;

      // Transaction count based on unique ID
      const idVenta = row[0].toString();
      if (!ventasIDset.has(idVenta)) {
        ventasIDset.add(idVenta);
        totalTransacciones++;
      }

      // vendedores_mes
      const vmKey = mesStr + '|' + vendedor;
      if (!vendedorMesMap[vmKey]) vendedorMesMap[vmKey] = { mes: mesStr, vendedor: vendedor, total: 0, ventas: 0 };
      vendedorMesMap[vmKey].total += total;
      vendedorMesMap[vmKey].ventas++;

      // ventas_dia
      if (!ventasDiaMap[fechaStr]) ventasDiaMap[fechaStr] = { fecha: fechaStr, total: 0, ventas: 0 };
      ventasDiaMap[fechaStr].total += total;
      ventasDiaMap[fechaStr].ventas++;

      // ventas_dia_semana
      if (!ventasDiaSemanaMap[dow]) ventasDiaSemanaMap[dow] = { DiaSemana: dow, total: 0, ventas: 0 };
      ventasDiaSemanaMap[dow].total += total;
      ventasDiaSemanaMap[dow].ventas++;

      // ventas_mes
      if (!ventasMesMap[mesStr]) ventasMesMap[mesStr] = { mes: mesStr, total: 0, ventas: 0 };
      ventasMesMap[mesStr].total += total;
      ventasMesMap[mesStr].ventas++;

      // Parse items for product stats
      const items = parsearItems(itemText);
      for (const item of items) {
        const code = item.codigo;
        if (!productoQtyMap[code]) productoQtyMap[code] = 0;
        productoQtyMap[code] += item.cantidad;

        const pvKey = vendedor + '|' + code;
        if (!prodVendMap[pvKey]) prodVendMap[pvKey] = { vendedor: vendedor, producto: code, cantidad: 0 };
        prodVendMap[pvKey].cantidad += item.cantidad;
      }

      // ventas por canal
      if (!canalMap[canal]) canalMap[canal] = { canal: canal, monto: 0, cantidad: 0 };
      canalMap[canal].monto += total;
      canalMap[canal].cantidad++;
    }

    //  2) Build vendedores_mes array 
    const vendedores_mes = Object.values(vendedorMesMap).sort((a, b) => {
      if (a.mes !== b.mes) return a.mes.localeCompare(b.mes);
      return a.vendedor.localeCompare(b.vendedor);
    });

    // Round totals
    vendedores_mes.forEach(r => { r.total = Math.round(r.total * 100) / 100; });

    //  3) Build top_productos 
    const top_productos = Object.keys(productoQtyMap)
      .map(code => ({ producto: code, cantidad: productoQtyMap[code] }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 15);

    //  4) Build productos_vendedor 
    const productos_vendedor = Object.values(prodVendMap)
      .sort((a, b) => a.vendedor.localeCompare(b.vendedor) || b.cantidad - a.cantidad);

    //  5) Build ventas_dia 
    const ventas_dia = Object.values(ventasDiaMap).sort((a, b) => a.fecha.localeCompare(b.fecha));
    ventas_dia.forEach(d => { d.total = Math.round(d.total * 100) / 100; });

    //  6) Build ventas_dia_semana (ordered MonSun) 
    const dowOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const ventas_dia_semana = dowOrder
      .filter(d => ventasDiaSemanaMap[d])
      .map(d => {
        const v = ventasDiaSemanaMap[d];
        return { DiaSemana: v.DiaSemana, total: Math.round(v.total * 100) / 100, ventas: v.ventas };
      });

    //  7) Build top_dias 
    const top_dias = Object.values(ventasDiaMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(d => ({ fecha: d.fecha, total: Math.round(d.total * 100) / 100, ventas: d.ventas }));

    //  8) Build ventas_mes 
    const meses = Array.from(mesesSet).sort();
    const ventas_mes = meses.map(m => {
      const v = ventasMesMap[m] || { total: 0, ventas: 0 };
      return { mes: m, total: Math.round(v.total * 100) / 100, ventas: v.ventas };
    });

    //  9) vendedores list 
    const vendedores = Array.from(vendedoresSet).sort();

    //  10) Best seller & best day for header KPIs 
    const vendTotals = {};
    vendedores_mes.forEach(r => {
      if (!vendTotals[r.vendedor]) vendTotals[r.vendedor] = 0;
      vendTotals[r.vendedor] += r.total;
    });
    let bestVendor = '', bestVendorTotal = 0;
    Object.keys(vendTotals).forEach(v => {
      if (vendTotals[v] > bestVendorTotal) { bestVendor = v; bestVendorTotal = vendTotals[v]; }
    });

    const bestDay = top_dias.length > 0 ? top_dias[0] : { fecha: '-', total: 0, ventas: 0 };

    // Determine period label
    const periodoLabel = meses.length > 0
      ? _mesCorto(meses[0]) + ' - ' + _mesCorto(meses[meses.length - 1])
      : 'Sin datos';

    //  11) Inventory summary (Calculated exactly like Panel de Inventario)
    let totalPiezas = 0;
    let valorInventario = 0;
    const stockMap = {};  // cod -> stock acumulado
    
    // Primero, sumarizamos todo desde Movimientos
    for (let i = 1; i < datosMovimientos.length; i++) {
      const cod = datosMovimientos[i][0];
      const tipo = datosMovimientos[i][2];
      const cant = datosMovimientos[i][3];
      if (!cod) continue;
      
      const codigoNorm = cod.toString().trim().toUpperCase();
      if (!stockMap[codigoNorm]) stockMap[codigoNorm] = 0;
      
      const valor = parseFloat(cant) || 0;
      const tipoMov = tipo ? tipo.toString().toUpperCase() : '';
      
      if (tipoMov === 'INGRESO' || tipoMov === 'AJUSTE_POSITIVO' || tipoMov === 'AJUSTE') {
        stockMap[codigoNorm] += valor;
      } else if (tipoMov === 'SALIDA' || tipoMov === 'AJUSTE_NEGATIVO' || tipoMov === 'VENTA') {
        stockMap[codigoNorm] -= valor;
      }
    }

    // Luego, procesamos todo contra la hoja de Productos para sacar nombres, stockMin y precios
    const inventarioRealMap = {};
    for (let i = 1; i < datosProductos.length; i++) {
      const code = (datosProductos[i][0] || '').toString().trim().toUpperCase();
      if (!code) continue;
      
      const nombre = (datosProductos[i][1] || '').toString();
      const grupo = (datosProductos[i][3] || '').toString();
      const stockMin = Number(datosProductos[i][4]) || 0;
      const precio = Number(datosProductos[i][5]) || 0;
      
      const stockFinal = Math.max(0, Math.round((stockMap[code] || 0) * 100) / 100);
      
      totalPiezas += stockFinal;
      valorInventario += stockFinal * precio;
      
      let estado = 'Normal';
      if (stockFinal <= 0) estado = 'Sin Stock';
      else if (stockFinal <= stockMin && stockMin > 0) estado = 'Stock Bajo';
      
      inventarioRealMap[code] = {
        codigo: code,
        nombre: nombre,
        grupo: grupo,
        stock: stockFinal,
        precio: precio,
        stockMin: stockMin,
        estado: estado
      };
    }
    
    const inventarioReal = Object.values(inventarioRealMap).sort((a, b) => a.codigo.localeCompare(b.codigo));


    //  12) Finance summary 
    let ingresosMes = 0, gastosMes = 0, ingresosTot = 0, gastosTot = 0;
    const finanzasHistorial = [];

    for (let i = 1; i < datosFinanzas.length; i++) {
      const row = datosFinanzas[i];
      if (!row[0]) continue;

      const tipo = (row[2] || '').toString().trim();
      const monto = Number(row[4]) || 0;

      if (tipo === 'Ingreso') ingresosTot += monto;
      if (tipo === 'Gasto') gastosTot += monto;

      // Check if this month
      let fechaFin;
      try { fechaFin = new Date(row[1]); } catch (e) { fechaFin = null; }
      if (fechaFin && fechaFin.getMonth() === mesActual && fechaFin.getFullYear() === anoActual) {
        if (tipo === 'Ingreso') ingresosMes += monto;
        if (tipo === 'Gasto') gastosMes += monto;
      }

      finanzasHistorial.push({
        id: row[0], fecha: row[1],
        tipo: tipo, categoria: row[3],
        monto: monto, responsable: row[5],
        obs: row[6] || ''
      });
    }

    // Utilidad neta = ventas del mes - gastos del mes
    const ventasDelMes = ventas_mes.find(m => {
      const [y, mo] = m.mes.split('-');
      return parseInt(y) === anoActual && parseInt(mo) === (mesActual + 1);
    });
    const ingresosVentasMes = ventasDelMes ? ventasDelMes.total : 0;
    const utilidadNeta = Math.round((ingresosVentasMes - gastosMes) * 100) / 100;

    // KPIs adicionales: envíos, rotación, márgen
    const margenPromedio = totalGeneral > 0
      ? Math.round((totalGeneral - costosTotales) / totalGeneral * 1000) / 10
      : 0;
    const rotacionInventario = valorInventario > 0
      ? Math.round(costosTotales / valorInventario * 100) / 100
      : 0;

    //  BUILD RESULT 
    return {
      vendedores_mes: vendedores_mes,
      top_productos: top_productos,
      productos_vendedor: productos_vendedor,
      ventas_dia: ventas_dia,
      ventas_dia_semana: ventas_dia_semana,
      top_dias: top_dias,
      ventas_mes: ventas_mes,
      vendedores: vendedores,
      meses: meses,
      // Canal
      ventasPorCanal: Object.values(canalMap).sort((a, b) => b.monto - a.monto),
      // Header KPIs
      totalGeneral: Math.round(totalGeneral * 100) / 100,
      totalTransacciones: totalTransacciones,
      periodoLabel: periodoLabel,
      mejorVendedor: bestVendor,
      mejorVendedorTotal: Math.round(bestVendorTotal * 100) / 100,
      mejorDia: bestDay,
      // Envíos, Rotación, Márgen
      totalEnvios: Math.round(totalEnvios * 100) / 100,
      totalEnviosMes: Math.round(totalEnviosMes * 100) / 100,
      margenPromedio: margenPromedio,
      rotacionInventario: rotacionInventario,
      // Inventory
      inventario: { totalPiezas: totalPiezas, valorTotal: Math.round(valorInventario * 100) / 100 },
      inventarioReal: inventarioReal,
      // Finance
      finanzas: {
        ingresosMes: Math.round(ingresosMes * 100) / 100,
        gastosMes: Math.round(gastosMes * 100) / 100,
        utilidadNeta: utilidadNeta,
        ingresosTot: Math.round(ingresosTot * 100) / 100,
        gastosTot: Math.round(gastosTot * 100) / 100
      },
      finanzasHistorial: finanzasHistorial
    };

  } catch (error) {
    console.error(' Error en obtenerDatosDashboardBackend:', error);
    Logger.log('Error stack: ' + error.stack);
    return _dashboardVacio();
  }
}

/** Helper: short month label "Nov 25" from "2025-11" */
function _mesCorto(mesStr) {
  const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [y, m] = mesStr.split('-');
  return mNames[parseInt(m) - 1] + ' ' + y.slice(2);
}

/** Empty dashboard data fallback */
function _dashboardVacio() {
  return {
    vendedores_mes: [], top_productos: [], productos_vendedor: [],
    ventas_dia: [], ventas_dia_semana: [], top_dias: [],
    ventas_mes: [], vendedores: [], meses: [],
    totalGeneral: 0, totalTransacciones: 0, periodoLabel: 'Sin datos',
    mejorVendedor: '-', mejorVendedorTotal: 0,
    mejorDia: { fecha: '-', total: 0, ventas: 0 },
    inventario: { totalPiezas: 0, valorTotal: 0 },
    inventarioReal: [],
    finanzas: { ingresosMes: 0, gastosMes: 0, utilidadNeta: 0, ingresosTot: 0, gastosTot: 0 },
    finanzasHistorial: []
  };
}
function obtenerFiltrosReporte() {
  try {
    return {
      ubicaciones: obtenerUbicaciones() || [],
      productos: obtenerProductosParaFiltro() || [],
      vendedores: obtenerVendedores() || []
    };
  } catch (e) {
    Logger.log("Error en obtenerFiltrosReporte: " + e.message);
    return { ubicaciones: [], productos: [], vendedores: [] };
  }
}
