const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Configuración de base de datos
// Prioridad:
// 1. DB_PATH definido manualmente
// 2. Volumen persistente de Railway
// 3. Ruta local por defecto
const defaultDbPath = path.join(__dirname, "db", "snake.db");
const railwayVolumeMountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : railwayVolumeMountPath
    ? path.join(railwayVolumeMountPath, "snake.db")
    : defaultDbPath;
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ── Configuración de contraseña del profesor
const DEFAULT_PROFESOR_PASSWORD = process.env.PROFESOR_PASSWORD || "profesor123";
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
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
console.log("💾 SQLite DB path:", DB_PATH);
if (railwayVolumeMountPath) {
  console.log("🚂 Railway volume mount path detectado:", railwayVolumeMountPath);
}

// Inicializar tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS alumnos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    usuario         TEXT UNIQUE,
    pin             TEXT NOT NULL UNIQUE,
    edad            INTEGER,
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

  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const columnasAlumnos = db.prepare(`PRAGMA table_info(alumnos)`).all();
const nombresColumnasAlumnos = columnasAlumnos.map(c => c.name);

if (!nombresColumnasAlumnos.includes("usuario")) {
  db.exec(`ALTER TABLE alumnos ADD COLUMN usuario TEXT`);
}
if (!nombresColumnasAlumnos.includes("edad")) {
  db.exec(`ALTER TABLE alumnos ADD COLUMN edad INTEGER`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_alumnos_usuario_unique ON alumnos(usuario)`);
db.prepare(`
  INSERT OR IGNORE INTO app_settings (key, value)
  VALUES ('profesor_password', ?)
`).run(DEFAULT_PROFESOR_PASSWORD);

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

function normalizarTexto(valor = "") {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toLowerCase();
}

function textoEnMayusculas(valor = "") {
  return String(valor)
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getProfesorPassword() {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'profesor_password'`).get();
  return row?.value || DEFAULT_PROFESOR_PASSWORD;
}

function setProfesorPassword(password) {
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('profesor_password', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(password);
}

function csvEscape(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).replace(/"/g, '""');
  if (/[",\n;]/.test(texto)) return `"${texto}"`;
  return texto;
}

function generarUsuarioBase(nombre) {
  const limpio = normalizarTexto(nombre);
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "alumno";

  const primera = partes[0].slice(0, 3);
  const segunda = partes[1] ? partes[1].slice(0, 2) : "";
  const base = (primera + segunda).replace(/[^a-z0-9]/g, "");
  return base.length >= 3 ? base : (limpio.replace(/\s+/g, "").slice(0, 6) || "alumno");
}

function generarUsuarioUnico(nombre) {
  const base = generarUsuarioBase(nombre);
  let intento = 1;
  let candidato = base;

  while (db.prepare(`SELECT id FROM alumnos WHERE usuario = ?`).get(candidato)) {
    intento += 1;
    candidato = `${base}${intento}`;
    if (intento > 9999) {
      throw new Error("No se pudo generar usuario único");
    }
  }

  return candidato;
}

function completarUsuariosFaltantes() {
  const alumnosSinUsuario = db.prepare(`SELECT id, nombre FROM alumnos WHERE usuario IS NULL OR usuario = ''`).all();
  if (alumnosSinUsuario.length === 0) return;

  const updateUsuario = db.prepare(`UPDATE alumnos SET usuario = ? WHERE id = ?`);
  const tx = db.transaction((alumnos) => {
    for (const alumno of alumnos) {
      const usuario = generarUsuarioUnico(alumno.nombre || "alumno");
      updateUsuario.run(usuario, alumno.id);
    }
  });

  tx(alumnosSinUsuario);
}

completarUsuariosFaltantes();

// ── API: Autenticación del profesor
app.post("/api/profesor/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Contraseña requerida" });
  
  if (password !== getProfesorPassword()) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  PROFESSOR_TOKENS.set(token, Date.now() + (24 * 60 * 60 * 1000));
  
  res.json({ ok: true, token });
});

app.post("/api/profesor/password", verifyProfessorToken, (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Contraseña actual y nueva requeridas" });
    }
    if (current_password !== getProfesorPassword()) {
      return res.status(401).json({ error: "La contraseña actual no coincide" });
    }
    if (String(new_password).trim().length < 6) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }

    setProfesorPassword(String(new_password).trim());
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
    const { nombre, apellido_paterno, apellido_materno, edad, escuela, grupo } = req.body;

    const nombreCampo = textoEnMayusculas(nombre || "");
    const paternoCampo = textoEnMayusculas(apellido_paterno || "");
    const maternoCampo = textoEnMayusculas(apellido_materno || "");

    const nombreLimpio = [nombreCampo, paternoCampo, maternoCampo]
      .filter(Boolean)
      .join(" ");

    if (!nombreLimpio) {
      return res.status(400).json({ error: "Nombre requerido" });
    }

    if (!nombreCampo || !paternoCampo || !maternoCampo) {
      return res.status(400).json({ error: "Nombre y apellidos requeridos" });
    }

    const escuelaLimpia = escuela ? textoEnMayusculas(escuela) : null;
    const grupoLimpio = grupo ? textoEnMayusculas(grupo) : null;
    const edadNumero = Number(edad);
    
    if (!Number.isInteger(edadNumero) || edadNumero < 0) {
      return res.status(400).json({ error: "Edad inválida" });
    }
    
    // Generar PIN único
    const pin = generarPINUnico(6);
    const usuario = generarUsuarioUnico(nombreLimpio);
    
    // Insertar alumno
    const stmt = db.prepare(`
      INSERT INTO alumnos (nombre, usuario, pin, edad, escuela, grupo, veces_jugadas)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    const result = stmt.run(nombreLimpio, usuario, pin, edadNumero, escuelaLimpia, grupoLimpio);
    
    res.json({
      ok: true,
      alumno: {
        id: result.lastInsertRowid,
        nombre: nombreLimpio,
        usuario,
        pin: pin,
        edad: edadNumero,
        escuela: escuelaLimpia,
        grupo: grupoLimpio
      }
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Login de alumno con nombre + PIN
app.post("/api/alumno/login", (req, res) => {
  try {
    const { usuario, pin } = req.body;
    
    if (!usuario || !usuario.trim()) {
      return res.status(400).json({ error: "Usuario requerido" });
    }
    if (!pin || !pin.trim()) {
      return res.status(400).json({ error: "PIN requerido" });
    }
    
    const usuarioLimpio = usuario.trim().toLowerCase();
    const pinLimpio = pin.trim();
    
    // Buscar alumno por usuario y PIN
    const alumno = db.prepare(`
      SELECT id, nombre, usuario, escuela, grupo, veces_jugadas 
      FROM alumnos 
      WHERE usuario = ? AND pin = ?
    `).get(usuarioLimpio, pinLimpio);
    
    if (!alumno) {
      return res.status(401).json({ error: "Usuario o PIN incorrectos" });
    }
    
    // Incrementar contador de veces jugadas
    db.prepare(`UPDATE alumnos SET veces_jugadas = veces_jugadas + 1 WHERE id = ?`).run(alumno.id);
    
    const stats = db.prepare(`
      SELECT COUNT(*) as partidas, COALESCE(MAX(puntuacion), 0) as mejor
      FROM partidas WHERE alumno_id = ?
    `).get(alumno.id);
    
    res.json({
      ok: true,
      alumno: { id: alumno.id, nombre: alumno.nombre, usuario: alumno.usuario },
      stats
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Alumno entra (DEPRECATED - mantener para compatibilidad)
app.post("/api/entrar", (req, res) => {
  try {
    const nombre = textoEnMayusculas(req.body.nombre || "");
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

    // Buscar alumno existente
    let alumno = db.prepare(`SELECT id FROM alumnos WHERE nombre = ?`).get(nombre);
    
    // Si no existe, crear con PIN aleatorio
    if (!alumno) {
      const pin = generarPINUnico(6);
      const usuario = generarUsuarioUnico(nombre);
      const stmt = db.prepare(`INSERT INTO alumnos (nombre, usuario, pin) VALUES (?, ?, ?)`);
      const result = stmt.run(nombre, usuario, pin);
      alumno = { id: result.lastInsertRowid, nombre, usuario, pin };
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

// ── API: Ranking público para vista del juego
app.get("/api/ranking", (req, res) => {
  try {
    const alumnoId = Number(req.query.alumno_id) || null;

    const ranking = db.prepare(`
      SELECT
        a.id,
        a.nombre,
        a.usuario,
        COALESCE(MAX(p.puntuacion), 0) AS mejor_puntuacion,
        COUNT(p.id) AS partidas_jugadas
      FROM alumnos a
      LEFT JOIN partidas p ON p.alumno_id = a.id
      GROUP BY a.id
      HAVING COUNT(p.id) > 0
      ORDER BY mejor_puntuacion DESC, partidas_jugadas ASC, a.nombre ASC
      LIMIT 10
    `).all();

    let posicionActual = null;
    if (alumnoId) {
      const posicion = db.prepare(`
        WITH ranking AS (
          SELECT
            a.id,
            COALESCE(MAX(p.puntuacion), 0) AS mejor_puntuacion,
            COUNT(p.id) AS partidas_jugadas,
            ROW_NUMBER() OVER (
              ORDER BY COALESCE(MAX(p.puntuacion), 0) DESC, COUNT(p.id) ASC, a.nombre ASC
            ) AS posicion
          FROM alumnos a
          LEFT JOIN partidas p ON p.alumno_id = a.id
          GROUP BY a.id
          HAVING COUNT(p.id) > 0
        )
        SELECT posicion, mejor_puntuacion, partidas_jugadas
        FROM ranking
        WHERE id = ?
      `).get(alumnoId);

      posicionActual = posicion || null;
    }

    res.json({
      top: ranking,
      current: posicionActual
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Dashboard del profesor
app.get("/api/profesor/resumen", verifyProfessorToken, (req, res) => {
  try {
    const alumnos = db.prepare(`
      SELECT a.id, a.nombre, a.usuario, a.pin, a.edad, a.escuela, a.grupo, a.creado, a.veces_jugadas,
        COUNT(p.id) as partidas_jugadas,
        COALESCE(MAX(p.puntuacion), 0) as mejor_puntuacion,
        COALESCE(AVG(p.puntuacion), 0) as promedio_puntuacion,
        COALESCE(MAX(p.nivel_max), 1) as nivel_max_alcanzado,
        MAX(p.fecha) as ultima_partida
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

app.patch("/api/alumno/:id", verifyProfessorToken, (req, res) => {
  try {
    const alumnoId = Number(req.params.id);
    if (!alumnoId) return res.status(400).json({ error: "Alumno inválido" });

    const alumnoActual = db.prepare(`
      SELECT id, nombre, usuario, pin, edad, escuela, grupo
      FROM alumnos
      WHERE id = ?
    `).get(alumnoId);

    if (!alumnoActual) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }

    const {
      nombre,
      edad,
      escuela,
      grupo,
      regenerar_pin
    } = req.body || {};

    const nombreNormalizado = nombre !== undefined
      ? textoEnMayusculas(nombre)
      : alumnoActual.nombre;
    const escuelaNormalizada = escuela !== undefined
      ? (escuela ? textoEnMayusculas(escuela) : null)
      : alumnoActual.escuela;
    const grupoNormalizado = grupo !== undefined
      ? (grupo ? textoEnMayusculas(grupo) : null)
      : alumnoActual.grupo;
    const edadNormalizada = edad !== undefined && edad !== null && edad !== ""
      ? Number(edad)
      : null;

    if (!nombreNormalizado) {
      return res.status(400).json({ error: "Nombre requerido" });
    }
    if (edad !== undefined && edad !== null && edad !== "" && (!Number.isInteger(edadNormalizada) || edadNormalizada < 0)) {
      return res.status(400).json({ error: "Edad inválida" });
    }

    const pinActualizado = regenerar_pin ? generarPINUnico(6) : alumnoActual.pin;

    db.prepare(`
      UPDATE alumnos
      SET nombre = ?, pin = ?, edad = ?, escuela = ?, grupo = ?
      WHERE id = ?
    `).run(
      nombreNormalizado,
      pinActualizado,
      edadNormalizada,
      escuelaNormalizada,
      grupoNormalizado,
      alumnoId
    );

    const actualizado = db.prepare(`
      SELECT id, nombre, usuario, pin, edad, escuela, grupo, veces_jugadas
      FROM alumnos
      WHERE id = ?
    `).get(alumnoId);

    res.json({ ok: true, alumno: actualizado });
  } catch (e) {
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

app.get("/api/profesor/precision-por-operacion", verifyProfessorToken, (req, res) => {
  try {
    const errores = db.prepare(`
      SELECT tipo_op, COUNT(*) as total_errores
      FROM errores
      GROUP BY tipo_op
    `).all();

    const partidas = db.prepare(`
      SELECT nivel_max, COUNT(*) as total_partidas
      FROM partidas
      GROUP BY nivel_max
    `).all();

    const intentosEstimados = {
      'Suma': 0,
      'Resta': 0,
      'Multiplicación': 0,
      'División': 0,
      'Jerarquía (+×)': 0,
      'Jerarquía (−×)': 0,
      'Jerarquía (+÷)': 0,
      'Jerarquía (−÷)': 0,
      'Orden jerarquico': 0,
      'Doble multiplicación': 0,
      'Mixta avanzada': 0
    };

    partidas.forEach(p => {
      const factor = Math.max(1, p.total_partidas);
      if (p.nivel_max >= 1) { intentosEstimados['Suma'] += factor * 3; intentosEstimados['Resta'] += factor * 3; }
      if (p.nivel_max >= 2) { intentosEstimados['Multiplicación'] += factor * 3; }
      if (p.nivel_max >= 3) { intentosEstimados['División'] += factor * 2; }
      if (p.nivel_max >= 4) { intentosEstimados['Jerarquía (+×)'] += factor * 2; intentosEstimados['Jerarquía (−×)'] += factor; }
      if (p.nivel_max >= 5) { intentosEstimados['Jerarquía (+÷)'] += factor; intentosEstimados['Jerarquía (−÷)'] += factor; }
      if (p.nivel_max >= 6) { intentosEstimados['Orden jerarquico'] += factor * 2; }
      if (p.nivel_max >= 7) { intentosEstimados['Doble multiplicación'] += factor; intentosEstimados['Mixta avanzada'] += factor; }
    });

    const data = Object.entries(intentosEstimados)
      .map(([tipo_op, intentos]) => {
        const err = errores.find(e => e.tipo_op === tipo_op)?.total_errores || 0;
        const intentosBase = Math.max(intentos, err);
        const precision = intentosBase > 0 ? Math.max(0, ((intentosBase - err) / intentosBase) * 100) : 100;
        return {
          tipo_op,
          intentos_estimados: intentosBase,
          errores: err,
          precision: Math.round(precision * 10) / 10
        };
      })
      .filter(item => item.intentos_estimados > 0)
      .sort((a, b) => a.precision - b.precision);

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profesor/evolucion", verifyProfessorToken, (req, res) => {
  try {
    const partidasPorDia = db.prepare(`
      SELECT
        substr(fecha, 1, 10) as fecha,
        COUNT(*) as partidas,
        ROUND(AVG(puntuacion), 1) as promedio_puntuacion,
        MAX(puntuacion) as mejor_puntuacion,
        ROUND(AVG(nivel_max), 1) as promedio_nivel
      FROM partidas
      GROUP BY substr(fecha, 1, 10)
      ORDER BY fecha ASC
      LIMIT 14
    `).all();

    const erroresPorDia = db.prepare(`
      SELECT
        substr(p.fecha, 1, 10) as fecha,
        COUNT(e.id) as errores
      FROM partidas p
      LEFT JOIN errores e ON e.partida_id = p.id
      GROUP BY substr(p.fecha, 1, 10)
      ORDER BY fecha ASC
      LIMIT 14
    `).all();

    const mapaErrores = {};
    erroresPorDia.forEach(row => { mapaErrores[row.fecha] = row.errores; });

    const data = partidasPorDia.map(row => ({
      ...row,
      errores: mapaErrores[row.fecha] || 0
    }));

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profesor/exportar", verifyProfessorToken, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        a.id AS alumno_id,
        a.nombre,
        a.usuario,
        a.edad,
        a.escuela,
        a.grupo,
        a.veces_jugadas,
        p.id AS partida_id,
        p.fecha,
        p.puntuacion,
        p.nivel_max,
        COALESCE((SELECT COUNT(*) FROM errores e WHERE e.partida_id = p.id), 0) AS total_errores
      FROM alumnos a
      LEFT JOIN partidas p ON p.alumno_id = a.id
      ORDER BY a.nombre ASC, p.fecha DESC
    `).all();

    const header = [
      "alumno_id",
      "nombre",
      "usuario",
      "edad",
      "escuela",
      "grupo",
      "veces_jugadas",
      "partida_id",
      "fecha",
      "puntuacion",
      "nivel_max",
      "total_errores"
    ];

    const lines = [header.join(";")];
    for (const row of rows) {
      const line = [
        csvEscape(row.alumno_id),
        csvEscape(row.nombre),
        csvEscape(row.usuario),
        csvEscape(row.edad),
        csvEscape(row.escuela),
        csvEscape(row.grupo),
        csvEscape(row.veces_jugadas),
        csvEscape(row.partida_id),
        csvEscape(row.fecha),
        csvEscape(row.puntuacion),
        csvEscape(row.nivel_max),
        csvEscape(row.total_errores)
      ].join(";");
      lines.push(line);
    }

    const csv = `\uFEFF${lines.join("\n")}`;
    const fileName = `reporte-snake-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/profesor/backup-json", verifyProfessorToken, (req, res) => {
  try {
    const alumnos = db.prepare(`
      SELECT id, nombre, usuario, pin, edad, escuela, grupo, veces_jugadas, creado
      FROM alumnos
      ORDER BY nombre ASC
    `).all();
    const partidas = db.prepare(`
      SELECT id, alumno_id, puntuacion, nivel_max, fecha
      FROM partidas
      ORDER BY fecha DESC
    `).all();
    const errores = db.prepare(`
      SELECT id, partida_id, operacion, respuesta_dada, respuesta_correcta, tipo_op
      FROM errores
      ORDER BY id ASC
    `).all();

    const payload = {
      exported_at: new Date().toISOString(),
      alumnos,
      partidas,
      errores
    };

    const fileName = `backup-snake-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Eliminar alumno
app.delete("/api/alumno/:id", verifyProfessorToken, (req, res) => {
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
