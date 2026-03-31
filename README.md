# 🐍 Snake Matemático - Rama Railway

Aplicación web para enseñanza de matemáticas a través de un juego Snake interactivo.

## 🚀 Despliegue en Railway

Esta rama (`railway`) contiene la versión unificada optimizada para Railway.app:
- **Backend + Frontend**: Un único servidor Express.js
- **BD Persistente**: SQLite con almacenamiento real en Railway
- **Configuración Simple**: Railway.json listo para desplegar

### Cómo desplegar

1. **Conectar a Railway**
   ```bash
   git push origin railway
   ```

2. **En Railway.app**
   - New Project → GitHub Repo
   - Selecciona el repositorio y rama `railway`
   - Railway detectará automáticamente `railway.json`

3. **Variables de entorno (opcional)**
   ```
   PROFESOR_PASSWORD=contraseña_segura
   ```

### URLs de acceso

- **Principal**: https://tu-app.up.railway.app
- **Estudiantes**: / (login y juego)
- **Profesor**: /profesor.html
- **API Health**: /api/health

## 🎮 Características

### Estudiantes
- ✅ 8 niveles progresivos
- ✅ Operaciones: Suma, Resta, Multiplicación, División, Jerarquía
- ✅ Análisis automático de errores
- ✅ Controles táctiles y teclado

### Profesores
- 📊 Dashboard en tiempo real
- 📈 Análisis de errores por operación
- 👥 Clasificación de estudiantes
- 🎯 Identificación de operaciones problemáticas

## 🛠️ Desarrollo Local

```bash
npm install
npm start
# Abre http://localhost:3000
```

## 📁 Estructura

```
├── public/           # Frontend (HTML/JS)
├── db/              # Base de datos (auto-creada)
├── server.js        # Servidor principal
├── package.json     # Dependencias
└── railway.json     # Config de Railway
```

## 🔐 Contraseña del Profesor

Por defecto: `profesor123`

Cambia en Railway → Settings → Variables → `PROFESOR_PASSWORD`

---

**Rama**: railway | **Host**: Railway.app | **Versión**: 1.0.0

## 📁 Estructura

```
snake-app/
├── backend/          ← API Node.js (Deploy en Vercel)
│   ├── index.js
│   ├── package.json
│   └── vercel.json
├── frontend/         ← HTML/CSS/JS (Deploy en Netlify)
│   ├── index.html    (Login)
│   ├── juego.html    (Juego)
│   ├── profesor.html (Panel profesor)
│   └── config.js     (Config API)
├── README.md
└── DEPLOYMENT_VERCEL_NETLIFY.md
```

## 🚀 Despliegue

Ver `DEPLOYMENT_VERCEL_NETLIFY.md` para instrucciones detalladas.

### URLs de producción (una vez desplegado):

- **Frontend:** https://snakeapp-frontend.netlify.app
- **Backend:** https://snakeapp-backend.vercel.app

## 🎮 Cómo jugar

1. Abre el frontend en el navegador
2. Ingresa tu nombre
3. Resuelve operaciones matemáticas comiendo respuestas correctas
4. El profesor puede ver tu progreso en el panel

## 🔐 Acceso Profesor

**URL:** `/profesor.html`  
**Contraseña:** Ver variable de entorno `PROFESOR_PASSWORD` en Vercel

## 📊 Para desarrolladores

### Backend (Vercel):

```bash
cd backend
npm install
npm start
```

### Frontend (desarrollo local):

Abre `frontend/index.html` en el navegador (o usa un servidor local)

```bash
python3 -m http.server 8000
# Luego abre http://localhost:8000/frontend/
```

├── package.json
├── db/
│ └── snake.db ← Base de datos (se crea automáticamente)
└── public/
├── index.html ← Página de entrada (Kahoot-style)
├── juego.html ← El juego Snake con tracking
└── profesor.html ← Dashboard del profesor

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
```
