function testObtenerHistorial() {
  const filtros = {
    fechaDesde: '2020-01-01',
    fechaHasta: '2030-12-31',
    tipo: '',
    ubicacion: '',
    producto: '',
    vendedor: ''
  };
  const result = obtenerHistorial(filtros);
  Logger.log('Result length: ' + result.length);
  if (result.length > 0) {
    Logger.log('First result: ' + JSON.stringify(result[0]));
  }
}
