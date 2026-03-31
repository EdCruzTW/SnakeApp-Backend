# 🐍 Snake Matemático — Guía de instalación

## Requisitos
- Node.js 18 o superior (https://nodejs.org)

## Instalación (solo la primera vez)

```bash
# 1. Entra a la carpeta del proyecto
cd snake-matematico

# 2. Instala las dependencias
npm install

# 3. Inicia el servidor
npm start
```

Abre en el navegador: **http://localhost:3000**

---

## Páginas disponibles

| URL | Descripción |
|-----|-------------|
| `http://localhost:3000/` | Entrada de alumnos (estilo Kahoot) |
| `http://localhost:3000/juego` | El juego |
| `http://localhost:3000/profesor` | Panel del profesor con análisis |

---

## Para que los alumnos jueguen desde otra computadora

1. Averigua tu IP local:
   - Windows: `ipconfig` en CMD → busca "IPv4"
   - Mac/Linux: `ifconfig` o `ip addr`
2. Comparte esta URL con los alumnos:  
   `http://[TU-IP]:3000`  
   Ejemplo: `http://192.168.1.15:3000`

Todos deben estar conectados a la misma red Wi-Fi.

---

## Estructura de archivos

```
snake-matematico/
├── server.js          ← Backend (Express + SQLite)
├── package.json
├── db/
│   └── snake.db       ← Base de datos (se crea automáticamente)
└── public/
    ├── index.html     ← Página de entrada (Kahoot-style)
    ├── juego.html     ← El juego Snake con tracking
    └── profesor.html  ← Dashboard del profesor
```

---

## Base de datos

La base de datos SQLite se crea automáticamente en `db/snake.db`.  
No necesitas instalar nada extra — SQLite va incluido con `better-sqlite3`.

### Tablas
- `alumnos` — nombre y fecha de registro
- `partidas` — puntuación, nivel máximo, fecha
- `errores` — operación, respuesta dada, respuesta correcta, tipo

---

## API disponible

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/entrar` | Registrar/buscar alumno por nombre |
| POST | `/api/partida` | Guardar partida con errores |
| GET  | `/api/alumno/:id/historial` | Historial de partidas de un alumno |
| GET  | `/api/partida/:id/errores` | Errores de una partida específica |
| GET  | `/api/profesor/resumen` | Todos los alumnos con estadísticas |
| GET  | `/api/profesor/errores-globales` | Errores agrupados por tipo |
| GET  | `/api/profesor/errores-por-alumno` | Heatmap alumno × tipo |
| GET  | `/api/profesor/operaciones-erradas` | Top 20 operaciones más fallidas |
# SnakeApp
