const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS Configuration para permitir clientes remotos ───────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  process.env.ALLOWED_ORIGIN // Para producción en Railway
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todas las origins por ahora (cambiar en producción)
    }
  },
  credentials: true
}));

// ── Base de datos ─────────────────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, "db", "snake.db"));

// Inicializar tablas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre   TEXT NOT NULL UNIQUE,
      creado   TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS partidas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      alumno_id  INTEGER NOT NULL REFERENCES alumnos(id),
      puntuacion INTEGER NOT NULL DEFAULT 0,
      nivel_max  INTEGER NOT NULL DEFAULT 1,
      fecha      TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS errores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      partida_id INTEGER NOT NULL REFERENCES partidas(id),
      operacion  TEXT NOT NULL,
      respuesta_dada    INTEGER NOT NULL,
      respuesta_correcta INTEGER NOT NULL,
      tipo_op    TEXT NOT NULL
    )
  `);
});

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── API: Buscar alumno (solo lectura, sin guardar) ──────────────────────────
app.post("/api/buscar-alumno", (req, res) => {
  const nombre = (req.body.nombre || "").trim();
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  db.get(`SELECT * FROM alumnos WHERE nombre = ?`, [nombre], (err, alumno) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!alumno) return res.json({ found: false });
    
    db.get(`
      SELECT COUNT(*) as partidas, COALESCE(MAX(puntuacion),0) as mejor
      FROM partidas WHERE alumno_id = ?
    `, [alumno.id], (err, stats) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ found: true, alumno, stats });
    });
  });
});

// ── API: Alumno entra (crea nuevo si no existe) ──────────────────────────────
app.post("/api/entrar", (req, res) => {
  const nombre = (req.body.nombre || "").trim();
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  // Insertar o ignorar si ya existe
  db.run(`INSERT OR IGNORE INTO alumnos (nombre) VALUES (?)`, [nombre], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get(`SELECT * FROM alumnos WHERE nombre = ?`, [nombre], (err, alumno) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(`
        SELECT COUNT(*) as partidas, COALESCE(MAX(puntuacion),0) as mejor
        FROM partidas WHERE alumno_id = ?
      `, [alumno.id], (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ alumno, stats });
      });
    });
  });
});

// ── API: Guardar partida completa ─────────────────────────────────────────────
app.post("/api/partida", (req, res) => {
  const { alumno_id, puntuacion, nivel_max, errores } = req.body;

  if (!alumno_id) return res.status(400).json({ error: "alumno_id requerido" });

  db.run(`
    INSERT INTO partidas (alumno_id, puntuacion, nivel_max) VALUES (?, ?, ?)
  `, [alumno_id, puntuacion || 0, nivel_max || 1], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const partida_id = this.lastID;

    if (Array.isArray(errores) && errores.length > 0) {
      const insertError = db.prepare(`
        INSERT INTO errores (partida_id, operacion, respuesta_dada, respuesta_correcta, tipo_op)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      let pending = errores.length;
      let hasError = false;

      errores.forEach(e => {
        db.run(
          `INSERT INTO errores (partida_id, operacion, respuesta_dada, respuesta_correcta, tipo_op)
           VALUES (?, ?, ?, ?, ?)`,
          [partida_id, e.operacion, e.respuesta_dada, e.respuesta_correcta, e.tipo_op],
          function(err) {
            if (err) hasError = true;
            pending--;
            if (pending === 0) {
              if (hasError) return res.status(500).json({ error: "Error al guardar errores" });
              res.json({ ok: true, partida_id });
            }
          }
        );
      });
    } else {
      res.json({ ok: true, partida_id });
    }
  });
});

// ── API: Historial de un alumno ───────────────────────────────────────────────
app.get("/api/alumno/:id/historial", (req, res) => {
  db.all(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM errores WHERE partida_id = p.id) as total_errores
    FROM partidas p
    WHERE p.alumno_id = ?
    ORDER BY p.fecha DESC LIMIT 20
  `, [req.params.id], (err, partidas) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(partidas || []);
  });
});

// ── API: Errores de una partida ───────────────────────────────────────────────
app.get("/api/partida/:id/errores", (req, res) => {
  db.all(`
    SELECT * FROM errores WHERE partida_id = ?
  `, [req.params.id], (err, errores) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(errores || []);
  });
});

// ── API: Dashboard del profesor ───────────────────────────────────────────────
app.get("/api/profesor/resumen", (req, res) => {
  db.all(`
    SELECT a.id, a.nombre, a.creado,
      COUNT(p.id) as partidas_jugadas,
      COALESCE(MAX(p.puntuacion), 0) as mejor_puntuacion,
      COALESCE(AVG(p.puntuacion), 0) as promedio_puntuacion,
      COALESCE(MAX(p.nivel_max), 1) as nivel_max_alcanzado
    FROM alumnos a
    LEFT JOIN partidas p ON p.alumno_id = a.id
    GROUP BY a.id
    ORDER BY mejor_puntuacion DESC
  `, (err, alumnos) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(alumnos || []);
  });
});

app.get("/api/profesor/errores-globales", (req, res) => {
  db.all(`
    SELECT tipo_op,
      COUNT(*) as total_errores,
      COUNT(DISTINCT e.partida_id) as partidas_afectadas
    FROM errores e
    GROUP BY tipo_op
    ORDER BY total_errores DESC
  `, (err, errores) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(errores || []);
  });
});

app.get("/api/profesor/errores-por-alumno", (req, res) => {
  db.all(`
    SELECT a.nombre, e.tipo_op, COUNT(*) as errores
    FROM errores e
    JOIN partidas p ON p.id = e.partida_id
    JOIN alumnos a ON a.id = p.alumno_id
    GROUP BY a.id, e.tipo_op
    ORDER BY a.nombre, errores DESC
  `, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data || []);
  });
});

app.get("/api/profesor/operaciones-erradas", (req, res) => {
  db.all(`
    SELECT e.operacion, e.respuesta_correcta, e.tipo_op, COUNT(*) as frecuencia
    FROM errores e
    GROUP BY e.operacion, e.respuesta_correcta
    ORDER BY frecuencia DESC
    LIMIT 20
  `, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data || []);
  });
});

// ── API: Eliminar alumno 
app.delete("/api/alumno/:id", (req, res) => {
  const alumnoId = req.params.id;
  
  // Primero eliminar errores de las partidas de este alumno
  db.run(`
    DELETE FROM errores 
    WHERE partida_id IN (SELECT id FROM partidas WHERE alumno_id = ?)
  `, [alumnoId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Luego eliminar las partidas
    db.run(`DELETE FROM partidas WHERE alumno_id = ?`, [alumnoId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Finalmente eliminar el alumno
      db.run(`DELETE FROM alumnos WHERE id = ?`, [alumnoId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, message: "Alumno eliminado correctamente" });
      });
    });
  });
});

// ── Rutas de páginas ──────────────────────────────────────────────────────────
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/juego", (_, res) => res.sendFile(path.join(__dirname, "public", "juego.html")));
app.get("/profesor", (_, res) => res.sendFile(path.join(__dirname, "public", "profesor.html")));

app.listen(PORT, () => {
  console.log(`\n🐍 Snake Matemático corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel del profesor: http://localhost:${PORT}/profesor\n`);
});
