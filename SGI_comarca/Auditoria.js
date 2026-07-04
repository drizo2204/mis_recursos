function ajustarInventarioAuditoriaDesdeOtroArchivo() {
    // 1. Conectar a la base de datos principal
    const urlPrincipal = "https://docs.google.com/spreadsheets/d/1_WdxwD77PPS_gaQgzhYsyfURwVTn_4LIKghBVrdDiw0/edit";
    const ssPrincipal = SpreadsheetApp.openByUrl(urlPrincipal);

    const hojaInventario = ssPrincipal.getSheetByName("Inventario");
    const hojaMovimientos = ssPrincipal.getSheetByName("Movimientos");

    // 2. Conectar al documento EXTERNO de la auditoría
    const urlAuditoria = "https://docs.google.com/spreadsheets/d/1RvAcwAzn1i1d2AifMbpoU7SUz0sygdP4-SdgGCkr3yc/edit";
    const ssAuditoria = SpreadsheetApp.openByUrl(urlAuditoria);

    const hojaAuditoria = ssAuditoria.getSheetByName("Auditoria_Mayo");

    if (!hojaAuditoria || !hojaInventario || !hojaMovimientos) {
        console.log("❌ Error: No se encontraron las hojas. Verifica los enlaces y nombres.");
        return;
    }

    // Cargar datos en memoria
    const datosAuditoria = hojaAuditoria.getDataRange().getValues();
    const rangoInventario = hojaInventario.getDataRange();
    const datosInventario = rangoInventario.getValues();

    const mapaAuditoria = {};

    // Bucle para leer el archivo externo (Con escudos protectores)
    for (let i = 1; i < datosAuditoria.length; i++) {
        if (datosAuditoria[i].length < 4) continue;

        let codigo = datosAuditoria[i][0];
        if (!codigo || String(codigo).trim() === "") continue;

        mapaAuditoria[codigo] = {
            "Casa Dylan": datosAuditoria[i][2] !== undefined ? datosAuditoria[i][2] : "",
            "Casa Luden": datosAuditoria[i][3] !== undefined ? datosAuditoria[i][3] : "",
            "Casa Jean": datosAuditoria[i][4] !== undefined ? datosAuditoria[i][4] : "" // <-- AHORA INCLUYE A JEAN
        };
    }

    let movimientosNuevos = [];
    let totalAjustes = 0;

    const timeZone = Session.getScriptTimeZone();
    const ahora = new Date();
    const fechaCorta = Utilities.formatDate(ahora, timeZone, "dd/MM/yyyy");
    const fechaLarga = Utilities.formatDate(ahora, timeZone, "dd/MM/yyyy HH:mm:ss");

    // Bucle para cruzar con tu inventario principal
    for (let j = 1; j < datosInventario.length; j++) {
        let codigoInv = datosInventario[j][0];
        let stockActual = datosInventario[j][2];
        let ubicacionInv = datosInventario[j][6];

        // Ahora actúa para los 3 almacenes
        if (ubicacionInv === "Casa Dylan" || ubicacionInv === "Casa Luden" || ubicacionInv === "Casa Jean") {
            if (mapaAuditoria[codigoInv] !== undefined) {
                let stockReal = mapaAuditoria[codigoInv][ubicacionInv];

                if (stockReal !== "" && stockReal !== null && !isNaN(stockReal)) {
                    stockReal = Number(stockReal);
                    stockActual = Number(stockActual);

                    let diferencia = stockReal - stockActual;

                    if (diferencia !== 0) {
                        datosInventario[j][2] = stockReal;

                        movimientosNuevos.push([
                            codigoInv,
                            fechaCorta,
                            "AJUSTE",
                            diferencia,
                            "Auditoría Sistema",
                            fechaLarga,
                            "Ajuste por Auditoría Mayo",
                            stockReal,
                            ubicacionInv
                        ]);

                        totalAjustes++;
                    }
                }
            }
        }
    }

    if (totalAjustes > 0) {
        // Guarda los cambios
        rangoInventario.setValues(datosInventario);

        const ultFilaMov = hojaMovimientos.getLastRow();
        hojaMovimientos.getRange(ultFilaMov + 1, 1, movimientosNuevos.length, movimientosNuevos[0].length).setValues(movimientosNuevos);

        console.log(`✅ ¡Auditoría Finalizada! Se ajustaron ${totalAjustes} cantidades en total (Casa Dylan, Luden y Jean).`);
    } else {
        console.log("👍 Todo coincide a la perfección. No se requirió ningún ajuste.");
    }
}