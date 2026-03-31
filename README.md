# 🐍 Snake Matemático

Aplicación educativa interactiva: juego Snake con análisis automático de errores matemáticos y panel de profesor para monitoreo.

## 🚀 Despliegue en Railway (recomendado)

### Pasos rápidos:

1. **Ve a https://railway.app** y crea una cuenta (con GitHub)
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Selecciona **SnakeApp-Backend** (rama `railway`)
4. Railway detectará `railway.json` y desplegará automáticamente
5. En 2-3 minutos tendrás la URL pública

### Acceso después del despliegue:

- **Estudiantes**: `https://tu-app.up.railway.app`
- **Profesor**: `https://tu-app.up.railway.app/profesor.html`
- **Contraseña profesor**: `profesor123` (cambiar en Variables de Railway)

Ver **RAILWAY_DEPLOYMENT.md** para instrucciones detalladas.

## 🎮 Características

### Para Estudiantes

- ✅ 8 niveles progresivos
- ✅ Operaciones: Suma → Resta → Multiplicación → División → Jerarquía
- ✅ Análisis automático de errores
- ✅ Controles táctiles y teclado

### Para Profesores

- 📊 Dashboard con ranking de estudiantes
- 📈 Análisis de errores por tipo de operación
- 🎯 Identificación de operaciones problemáticas
- 👥 Historial individual de cada estudiante

## 🛠️ Desarrollo local

```bash
npm install
npm start
# Abre http://localhost:3000
```

## 📁 Estructura

```
├── server.js          # Servidor Express (API + frontend estático)
├── public/            # Archivos frontend (HTML/JS)
│   ├── index.html     # Login estudiantes
│   ├── juego.html     # Juego Snake
│   ├── profesor.html  # Panel profesor
│   └── config.js      # Configuración API
├── db/                # Base de datos SQLite (auto-creada)
├── package.json       # Dependencias
└── railway.json       # Config Railway
```

## 🔐 Contraseña del Profesor

Por defecto: `profesor123`

Cambiar en Railway:

- Settings → Variables → `PROFESOR_PASSWORD`

---

**Stack:** Node.js 20.x + Express + SQLite | **Host:** Railway.app
