// ==========================================
// CONFIGURACIÓN DE LA API
// ==========================================
// Este archivo se autoconfigura dependiendo de dónde se ejecute

const CONFIG = {
  // Detectar automáticamente si estamos en desarrollo o producción
  API_URL: (() => {
    const href = window.location.href;
    const origin = window.location.origin;
    
    console.log("🔍 Debug config.js");
    console.log("  - href:", href);
    console.log("  - origin:", origin);
    
    // Si estamos en localhost o 127.0.0.1, usar localhost
    if (href.includes("localhost") || href.includes("127.0.0.1")) {
      console.log("  - Modo: DESARROLLO (localhost)");
      return "http://localhost:3000";
    }
    
    // Si estamos en producción (Railway u otro host), usar el dominio actual
    console.log("  - Modo: PRODUCCIÓN");
    return origin;
  })(),
  
  // Endpoints de la API
  get ENDPOINTS() {
    return {
      buscarAlumno: `${this.API_URL}/api/buscar-alumno`,
      entrar: `${this.API_URL}/api/entrar`,
      partida: `${this.API_URL}/api/partida`,
      historial: (id) => `${this.API_URL}/api/alumno/${id}/historial`,
      errores: (id) => `${this.API_URL}/api/partida/${id}/errores`,
      profesor: {
        login: `${this.API_URL}/api/profesor/login`,
        resumen: `${this.API_URL}/api/profesor/resumen`,
        erroresGlobales: `${this.API_URL}/api/profesor/errores-globales`,
        erroresPorAlumno: `${this.API_URL}/api/profesor/errores-por-alumno`,
        operacionesErradas: `${this.API_URL}/api/profesor/operaciones-erradas`,
      }
    };
  }
};

// Debug: mostrar la URL de la API en consola
console.log("🐍 Conectando a API:", CONFIG.API_URL);
