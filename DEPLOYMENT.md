# 🚀 Guía de Deployment en Railway

Este documento explica cómo desplegar tu aplicación Snake Matemático en Railway para que sea accesible desde cualquier lugar.

## ¿Por qué Railway?

✅ **Totalmente gratis** - Sin tarjeta de crédito requerida
✅ **Súper fácil** - Se conecta directamente a GitHub
✅ **Base de datos persistente** - Tus datos se guardan
✅ **Dominio automático** - Te da un link para compartir

---

## 📋 Paso 1: Preparar tu proyecto

Tu proyecto ya está listo. Verifica que tengas estos archivos:

```
✓ package.json
✓ server.js
✓ Procfile
✓ .env.example
✓ public/config.js (recién creado)
✓ public/index.html
✓ public/juego.html
✓ public/profesor.html
```

---

## 🔑 Paso 2: Subir a GitHub

Si aún no tienes tu proyecto en GitHub:

### a) Crear un repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `snake-matematico`
3. Click en "Create repository"

### b) Subir tu código

```bash
cd /Users/edcruz/Desktop/snake-app

# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Snake Matemático ready for deployment"

# Agregar remote (REEMPLAZA tu-usuario con tu usuario de GitHub)
git remote add origin https://github.com/tu-usuario/snake-matematico.git

# Push (te pedirá usuario/token)
git branch -M main
git push -u origin main
```

---

## 🚀 Paso 3: Desplegar en Railway

### a) Ir a Railway

1. Ve a https://railway.app
2. Click en "Login with GitHub" (crea cuenta si no tienes)
3. Autoriza Railway en GitHub

### b) Crear nuevo proyecto

1. Click en "+ New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca y selecciona `snake-matematico`
4. Click en "Deploy now"

### c) Esperar a que se despliegue

- Railway automáticamente:
  - Instala dependencias (`npm install`)
  - Ejecuta el servidor (`node server.js`)
  - Te da un dominio automático

---

## 🎯 Paso 4: Verificar que funciona

Después de unos minutos, verás en Railway:

- Un dominio tipo: `https://snake-matematico-production.up.railway.app`
- Click en ese dominio para verificar

Deberías ver:

- ✅ Página de login con input para nombre
- ✅ Panel del profesor en `/profesor`

---

## 📱 Paso 5: Descargar ejecutable para los niños (Opcional)

Una vez confirmado que todo funciona en Railway, puedes crear un `.exe` para que los niños descarguen:

```bash
# Instalar pkg globalmente
npm install -g pkg

# Generar ejecutable para Windows
pkg . --targets win-x64

# Esto crea: snake-app-win.exe
```

Los niños pueden ejecutar el `.exe` y accederá automáticamente a tu servidor en Railway.

---

## 🔧 Variables de entorno (Producción)

Railway automáticamente detecta:

- `PORT`: El puerto donde corre la app (lo asigna Railway)
- `NODE_ENV`: Será "production"

El archivo `.env.example` es solo referencia. En Railway no necesitas crear `.env`.

---

## 📚 URLs de la aplicación

Una vez deployado en Railway con URL base `https://tu-dominio.railway.app`:

- **Para niños jugar**: `https://tu-dominio.railway.app/`
- **Panel del profesor**: `https://tu-dominio.railway.app/profesor`
- **API base**: `https://tu-dominio.railway.app/api`

El archivo `public/config.js` se encarga automáticamente de detectar la URL correcta.

---

## 🐛 Solucionar problemas

### "Error 404"

- Espera 2-3 minutos a que Railway termine el deploy
- Recarga la página

### "Error de conexión"

- Verifica en Railway que el build haya sido exitoso (verde ✓)
- Revisa los logs en Railway para errores

### "Base de datos vacía"

- Es normal la primera vez
- Los datos se guardan automáticamente cuando los niños juegan

---

## 🔄 Actualizar el código

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción de cambios"
git push
```

Railway automáticamente redepliega tu aplicación.

---

## ✨ Compartir con los niños

Dales este link (REEMPLAZA con tu dominio de Railway):

```
https://tu-dominio.railway.app/
```

Ellos:

1. Abren el link en el navegador
2. Escriben su nombre
3. ¡A jugar!

Tú puedes ver todo en:

```
https://tu-dominio.railway.app/profesor
```

---

## 🎓 Consejos

- **Backup de datos**: Railway hace backups automáticos
- **Dominio personalizado**: Puedes comprar un dominio y vincularlo en Railway
- **Más poder de cómputo**: Railway ofrece planes pagos si necesitas

---

**¿Preguntas?** Revisa la documentación de Railway: https://docs.railway.app/
