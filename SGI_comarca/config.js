const SPREADSHEET_ID = "1Mv6T84RoGYEBBKGfWO67yEugbNvkIr2rhxmYneq11es";
const HOJA_PRODUCTOS = "Productos";
const HOJA_MOVIMIENTOS = "Movimientos";
const HOJA_UNIDADES = "Unidades";
const HOJA_GRUPOS = "Grupos";
const HOJA_INVENTARIO = "Inventario";
const HOJA_ENTRADA = "Entrada de Productos";
const HOJA_VENTAS = "Ventas";
const HOJA_FINANZAS = "Finanzas";

// Índice de columna para Canal de Venta en la hoja Ventas (columna O)
const COL_CANAL_VENTA = 15;

const TIPOS_MOVIMIENTO = {
  INGRESO: "INGRESO",
  SALIDA: "SALIDA",
  VENTA: "VENTA",
  TRANSFERENCIA: "TRANSFERENCIA"
};
const CAMPOS_VENTA = {
  VENDEDOR: "vendedor",
  ENTREGADOR: "entregador",
  ITEMS: "items",
  MONTO_COBRADO: "montoCobrado",
  LUGAR_EXTRACCION: "lugarExtraccion",
  LUGAR_ENTREGA: "lugarEntrega",
  ENVIO_COBRADO: "envioCobrado",
  HORA_SALIDA: "horaSalida",
  HORA_FINALIZACION: "horaFinalizacion",
  CANAL_VENTA: "canalVenta"
};
