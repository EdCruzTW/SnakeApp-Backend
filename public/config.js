// ==========================================
// CONFIGURACIÓN DE LA API
// ==========================================
// Este archivo se autoconfigura dependiendo de dónde se ejecute

const CONFIG = {
  // La API está en el mismo servidor que el frontend
  API_URL: (() => {
    const origin = window.location.origin;
    console.log("🔍 Usando API en el mismo servidor:", origin);
    return origin; // El servidor Express sirve tanto API como frontend
  })(),
  
  // Endpoints de la API
  get ENDPOINTS() {
    return {
      alumno: {
        registrar: `${this.API_URL}/api/alumno/registrar`,
        login: `${this.API_URL}/api/alumno/login`,
      },
      buscarAlumno: `${this.API_URL}/api/buscar-alumno`,
      entrar: `${this.API_URL}/api/entrar`,
      partida: `${this.API_URL}/api/partida`,
      ranking: `${this.API_URL}/api/ranking`,
      historial: (id) => `${this.API_URL}/api/alumno/${id}/historial`,
      errores: (id) => `${this.API_URL}/api/partida/${id}/errores`,
      profesor: {
        login: `${this.API_URL}/api/profesor/login`,
        password: `${this.API_URL}/api/profesor/password`,
        resumen: `${this.API_URL}/api/profesor/resumen`,
        erroresGlobales: `${this.API_URL}/api/profesor/errores-globales`,
        erroresPorAlumno: `${this.API_URL}/api/profesor/errores-por-alumno`,
        operacionesErradas: `${this.API_URL}/api/profesor/operaciones-erradas`,
        precisionPorOperacion: `${this.API_URL}/api/profesor/precision-por-operacion`,
        evolucion: `${this.API_URL}/api/profesor/evolucion`,
        exportar: `${this.API_URL}/api/profesor/exportar`,
        backupJson: `${this.API_URL}/api/profesor/backup-json`,
      }
      ,
      alumnoActualizar: (id) => `${this.API_URL}/api/alumno/${id}`
    };
  }
};

// Debug: mostrar la URL de la API en consola
console.log("🐍 Conectando a API:", CONFIG.API_URL);
