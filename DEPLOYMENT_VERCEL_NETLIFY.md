# 🚀 Guía de Despliegue: Frontend + Backend Separado

Ahora tu proyecto está dividido en **Frontend** (HTML/CSS/JS) y **Backend** (Node.js/Express):

```
snake-app/
├── backend/          ← API Node.js (Vercel)
│   ├── index.js
│   ├── package.json
│   └── vercel.json
├── frontend/         ← HTML/CSS/JS estáticos (Netlify)
│   ├── index.html
│   ├── juego.html
│   ├── profesor.html
│   └── config.js
└── public/          ← Archivos antiguos (puedes eliminar después)
```

---

## 📡 PASO 1: Desplegar Backend en Vercel

### 1.1 Crear un repositorio separado para el Backend

```bash
mkdir ~/snake-app-backend
cd ~/snake-app-backend
git init
# Copiar archivos de backend/ aquí
cp -r ~/Desktop/snake-app/backend/* .
git add -A
git commit -m "Initial backend setup"
git remote add origin https://github.com/EdCruzTW/SnakeApp-Backend.git
git push -u origin main
```

### 1.2 Desplegar en Vercel

1. Ve a https://vercel.com/new
2. Conecta tu GitHub y selecciona el repo `SnakeApp-Backend`
3. Vercel detectará automáticamente que es un proyecto Node.js
4. En "Environment Variables", añade:
   - `PROFESOR_PASSWORD` = tu contraseña (ej: `profesor123`)
5. Click en "Deploy"
6. Copia la URL que te da Vercel (ej: `https://snake-app-backend.vercel.app`)

---

## 🎨 PASO 2: Desplegar Frontend en Netlify

### 2.1 Actualizar config.js con la URL de Vercel

1. Abre `/frontend/config.js`
2. Busca esta línea:
   ```javascript
   return "https://snake-app-backend.vercel.app"; // ← CAMBIAR ESTO
   ```
3. Reemplázala con la URL real que obtuviste de Vercel

### 2.2 Crear repositorio separado para el Frontend

```bash
mkdir ~/snake-app-frontend
cd ~/snake-app-frontend
git init
# Copiar archivos de frontend/ aquí
cp -r ~/Desktop/snake-app/frontend/* .
git add -A
git commit -m "Initial frontend setup"
git remote add origin https://github.com/EdCruzTW/SnakeApp-Frontend.git
git push -u origin main
```

### 2.3 Desplegar en Netlify

1. Ve a https://app.netlify.com/
2. Click en "Add new site" → "Import an existing project"
3. Conecta tu GitHub y selecciona `SnakeApp-Frontend`
4. Build settings:
   - **Build command:** (dejar vacío - son archivos estáticos)
   - **Publish directory:** `.` (la raíz)
5. Click en "Deploy site"
6. Copia la URL (ej: `https://snake-app-frontend.netlify.app`)

---

## ✅ Verificar que funciona

1. **Test Backend:**

   ```bash
   curl -X POST https://tu-vercel-url.vercel.app/api/profesor/login \
     -H "Content-Type: application/json" \
     -d '{"password":"profesor123"}'
   ```

   Deberías recibir un `token`.

2. **Test Frontend:**
   - Abre: https://tu-netlify-url.netlify.app/
   - Deberías ver la pantalla de login
   - Intenta crear un alumno

3. **Test Profesor:**
   - Ve a: https://tu-netlify-url.netlify.app/profesor.html
   - Ingresa la contraseña
   - Deberías ver el panel de análisis

---

## 🔄 Flujo de Actualización

Después de hacer cambios:

### Para cambios en Backend:

```bash
cd ~/snake-app-backend
git add -A && git commit -m "Descripción" && git push
# Vercel se redeploya automáticamente
```

### Para cambios en Frontend:

```bash
cd ~/snake-app-frontend
git add -A && git commit -m "Descripción" && git push
# Netlify se redeploya automáticamente
```

---

## 📝 Actualizar config.js

Siempre que cambies la URL del backend, actualiza `frontend/config.js`:

```javascript
const CONFIG = {
  API_URL: (() => {
    const href = window.location.href;
    const origin = window.location.origin;

    if (href.includes("localhost") || href.includes("127.0.0.1")) {
      return "http://localhost:3000";
    }

    // ← CAMBIAR ESTO a tu URL de Vercel
    return "https://tu-url-vercel.vercel.app";
  })(),
  // ...
};
```

---

## 🎓 Diferencias con Railway

- **Railway:** Todo junto (frontend + backend)
- **Vercel + Netlify:** Separado (mejor rendimiento, más flexible)

Ahora estudiantes acceden a Netlify (rápido, CDN global) y se conectan a Vercel para datos (API escalable).

---

## 🆘 Troubleshooting

**Q: "Error de conexión" desde estudiantes**

- Verifica que `config.js` tiene la URL correcta de Vercel
- Confirma que Vercel está online (Dashboard → Deployments)

**Q: CORS errors**

- El backend ya permite todas las origins
- Si persiste, abre issue en Backend

**Q: Profesor panel no abre**

- Verifica en DevTools (F12) si se conecta a Vercel
- Confirma contraseña en Vercel environment variables

---

¡Listo! Tu app ahora corre en infraestructura profesional. 🚀
