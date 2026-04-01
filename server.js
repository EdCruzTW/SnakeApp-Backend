const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Configuración de base de datos (persiste en Railway)
const dbDir = path.join(__dirname, "db");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ── Configuración de contraseña del profesor
const PROFESOR_PASSWORD = process.env.PROFESOR_PASSWORD || "profesor123";
const PROFESSOR_TOKENS = new Map();

// ── CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  credentials: true
}));

// ── Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "public")));

// ── Base de datos
const db = new Database(path.join(dbDir, "snake.db"));
db.pragma("journal_mode = WAL");

// Inicializar tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS alumnos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    pin             TEXT NOT NULL UNIQUE,
    escuela         TEXT,
    grupo           TEXT,
    veces_jugadas   INTEGER DEFAULT 0,
    creado          TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS partidas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id  INTEGER NOT NULL REFERENCES alumnos(id),
    puntuacion INTEGER NOT NULL DEFAULT 0,
    nivel_max  INTEGER NOT NULL DEFAULT 1,
    fecha      TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS errores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    partida_id INTEGER NOT NULL REFERENCES partidas(id),
    operacion  TEXT NOT NULL,
    respuesta_dada    INTEGER NOT NULL,
    respuesta_correcta INTEGER NOT NULL,
    tipo_op    TEXT NOT NULL
  );
`);

// ── Middlewares
app.use(express.json());

// ── Funciones helper para PIN ────────────────────────────────────────────────
function generarPINUnico(longitud = 6) {
  let pin;
  let intento = 0;
  const maxIntentos = 100;
  
  do {
    pin = Math.floor(Math.random() * Math.pow(10, longitud))
      .toString()
      .padStart(longitud, '0');
    intento++;
    
    if (intento > maxIntentos) {
      throw new Error("No se pudo generar PIN único");
    }
  } while (db.prepare(`SELECT id FROM alumnos WHERE pin = ?`).get(pin));
  
  return pin;
}

// ── API: Autenticación del profesor
app.post("/api/profesor/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Contraseña requerida" });
  
  if (password !== PROFESOR_PASSWORD) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  PROFESSOR_TOKENS.set(token, Date.now() + (24 * 60 * 60 * 1000));
  
  res.json({ ok: true, token });
});

// ── Verificar token del profesor
function verifyProfessorToken(req, res, next) {
  const token = req.headers['x-professor-token'] || req.query.token;
  
  if (!token || !PROFESSOR_TOKENS.has(token)) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  if (Date.now() > PROFESSOR_TOKENS.get(token)) {
    PROFESSOR_TOKENS.delete(token);
    return res.status(401).json({ error: "Token expirado" });
  }
  
  next();
}

// ── API: Registro de nuevo alumno (sin PIN aún)
app.post("/api/alumno/registrar", (req, res) => {
  try {
    const { nombre, escuela, grupo } = req.body;
    
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "Nombre requerido" });
    }
    
    const nombreLimpio = nombre.trim();
    
    // Verificar si ya existe alumno con este nombre
    const existente = db.prepare(`SELECT id FROM alumnos WHERE nombre = ?`).get(nombreLimpio);
    if (existente) {
      return res.status(409).json({ error: "Este nombre ya está registrado" });
    }
    
    // Generar PIN único
    const pin = generarPINUnico(6);
    
    // Insertar alumno
    const stmt = db.prepare(`
      INSERT INTO alumnos (nombre, pin, escuela, grupo, veces_jugadas)
      VALUES (?, ?, ?, ?, 0)
    `);
    const result = stmt.run(nombreLimpio, pin, escuela || null, grupo || null);
    
    res.json({
      ok: true,
      alumno: {
        id: result.lastInsertRowid,
        nombre: nombreLimpio,
        pin: pin,
        escuela: escuela || null,
        grupo: grupo || null
      }
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Login de alumno con nombre + PIN
app.post("/api/alumno/login", (req, res) => {
  try {
    const { nombre, pin } = req.body;
    
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "Nombre requerido" });
    }
    if (!pin || !pin.trim()) {
      return res.status(400).json({ error: "PIN requerido" });
    }
    
    const nombreLimpio = nombre.trim();
    const pinLimpio = pin.trim();
    
    // Buscar alumno por nombre y PIN
    const alumno = db.prepare(`
      SELECT id, nombre, escuela, grupo, veces_jugadas 
      FROM alumnos 
      WHERE nombre = ? AND pin = ?
    `).get(nombreLimpio, pinLimpio);
    
    if (!alumno) {
      return res.status(401).json({ error: "Nombre o PIN incorrectos" });
    }
    
    // Incrementar contador de veces jugadas
    db.prepare(`UPDATE alumnos SET veces_jugadas = veces_jugadas + 1 WHERE id = ?`).run(alumno.id);
    
    const stats = db.prepare(`
      SELECT COUNT(*) as partidas, COALESCE(MAX(puntuacion), 0) as mejor
      FROM partidas WHERE alumno_id = ?
    `).get(alumno.id);
    
    res.json({
      ok: true,
      alumno: { id: alumno.id, nombre: alumno.nombre },
      stats
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Alumno entra (DEPRECATED - mantener para compatibilidad)
app.post("/api/entrar", (req, res) => {
  try {
    const nombre = (req.body.nombre || "").trim();
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

    // Buscar alumno existente
    let alumno = db.prepare(`SELECT id FROM alumnos WHERE nombre = ?`).get(nombre);
    
    // Si no existe, crear con PIN aleatorio
    if (!alumno) {
      const pin = generarPINUnico(6);
      const stmt = db.prepare(`INSERT INTO alumnos (nombre, pin) VALUES (?, ?)`);
      const result = stmt.run(nombre, pin);
      alumno = { id: result.lastInsertRowid, nombre, pin };
    }
    
    const stats = db.prepare(`
      SELECT COUNT(*) as partidas, COALESCE(MAX(puntuacion),0) as mejor
      FROM partidas WHERE alumno_id = ?
    `).get(alumno.id);
    
    res.json({ alumno, stats });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Guardar partida
app.post("/api/partida", (req, res) => {
  try {
    const { alumno_id, puntuacion, nivel_max, errores } = req.body;
    if (!alumno_id) return res.status(400).json({ error: "alumno_id requerido" });

    const result = db.prepare(`
      INSERT INTO partidas (alumno_id, puntuacion, nivel_max) VALUES (?, ?, ?)
    `).run(alumno_id, puntuacion || 0, nivel_max || 1);
    
    const partida_id = result.lastInsertRowid;

    if (Array.isArray(errores) && errores.length > 0) {
      const insertError = db.prepare(`
        INSERT INTO errores (partida_id, operacion, respuesta_dada, respuesta_correcta, tipo_op)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((errs) => {
        for (const e of errs) {
          insertError.run(partida_id, e.operacion, e.respuesta_dada, e.respuesta_correcta, e.tipo_op);
        }
      });
      
      transaction(errores);
    }
    
    res.json({ ok: true, partida_id });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Historial de un alumno
app.get("/api/alumno/:id/historial", (req, res) => {
  try {
    const partidas = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM errores WHERE partida_id = p.id) as total_errores
      FROM partidas p
      WHERE p.alumno_id = ?
      ORDER BY p.fecha DESC LIMIT 20
    `).all(req.params.id);
    
    res.json(partidas || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Errores de una partida
app.get("/api/partida/:id/errores", (req, res) => {
  try {
    const errores = db.prepare(`
      SELECT * FROM errores WHERE partida_id = ?
    `).all(req.params.id);
    
    res.json(errores || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Dashboard del profesor
app.get("/api/profesor/resumen", verifyProfessorToken, (req, res) => {
  try {
    const alumnos = db.prepare(`
      SELECT a.id, a.nombre, a.creado,
        COUNT(p.id) as partidas_jugadas,
        COALESCE(MAX(p.puntuacion), 0) as mejor_puntuacion,
        COALESCE(AVG(p.puntuacion), 0) as promedio_puntuacion,
        COALESCE(MAX(p.nivel_max), 1) as nivel_max_alcanzado
      FROM alumnos a
      LEFT JOIN partidas p ON p.alumno_id = a.id
      GROUP BY a.id
      ORDER BY mejor_puntuacion DESC
    `).all();
    
    res.json(alumnos || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profesor/errores-globales", verifyProfessorToken, (req, res) => {
  try {
    const errores = db.prepare(`
      SELECT tipo_op,
        COUNT(*) as total_errores,
        COUNT(DISTINCT e.partida_id) as partidas_afectadas
      FROM errores e
      GROUP BY tipo_op
      ORDER BY total_errores DESC
    `).all();
    
    res.json(errores || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profesor/errores-por-alumno", verifyProfessorToken, (req, res) => {
  try {
    const data = db.prepare(`
      SELECT a.nombre, e.tipo_op, COUNT(*) as errores
      FROM errores e
      JOIN partidas p ON p.id = e.partida_id
      JOIN alumnos a ON a.id = p.alumno_id
      GROUP BY a.id, e.tipo_op
      ORDER BY a.nombre, errores DESC
    `).all();
    
    res.json(data || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profesor/operaciones-erradas", verifyProfessorToken, (req, res) => {
  try {
    const data = db.prepare(`
      SELECT e.operacion, e.respuesta_correcta, e.tipo_op, COUNT(*) as frecuencia
      FROM errores e
      GROUP BY e.operacion, e.respuesta_correcta
      ORDER BY frecuencia DESC
      LIMIT 20
    `).all();
    
    res.json(data || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Eliminar alumno
app.delete("/api/alumno/:id", (req, res) => {
  try {
    const alumnoId = req.params.id;
    
    const transaction = db.transaction(() => {
      db.prepare(`DELETE FROM errores WHERE partida_id IN (SELECT id FROM partidas WHERE alumno_id = ?)`).run(alumnoId);
      db.prepare(`DELETE FROM partidas WHERE alumno_id = ?`).run(alumnoId);
      db.prepare(`DELETE FROM alumnos WHERE id = ?`).run(alumnoId);
    });
    
    transaction();
    res.json({ ok: true, message: "Alumno eliminado correctamente" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ── Servir SPA: redirigir rutas desconocidas a index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🐍 Snake Matemático corriendo en puerto ${PORT}`);
  console.log(`✅ API + Frontend disponible\n`);
});

module.exports = app;
