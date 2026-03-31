# 🚀 Despliegue en Railway - Snake Matemático

## Paso 1: Ir a Railway.app

1. Ve a https://railway.app
2. Inicia sesión o crea una cuenta (puedes usar GitHub)

## Paso 2: Crear nuevo proyecto

1. Click en **"New Project"**
2. Selecciona **"Deploy from GitHub Repo"**
3. Autoriza a Railway a acceder a tu GitHub

## Paso 3: Seleccionar el repositorio

1. Busca **"SnakeApp-Backend"** en tu lista de repositorios
2. Click para conectar

## Paso 4: Configuración automática

Railway detectará automáticamente:

- ✅ `railway.json` - Configuración de build
- ✅ `package.json` - Dependencias Node.js
- ✅ `server.js` - Script de inicio

Railway comenzará a:

1. 📥 Descargar código
2. 📦 Instalar dependencias (`npm install`)
3. 🔨 Compilar (crear carpeta `/db`)
4. 🚀 Iniciar servidor en puerto 3000

## Paso 5: Variables de entorno (Opcional)

Si quieres cambiar la contraseña del profesor:

1. En la página del proyecto en Railway
2. Click en **"Variables"** (Variables tab)
3. Agregar nueva variable:
   - **Key**: `PROFESOR_PASSWORD`
   - **Value**: `tu_contraseña_segura`
4. El servidor se redesplegará automáticamente

## Paso 6: Obtener URL pública

Una vez desplegado:

1. Click en el proyecto
2. Click en **"Deployments"**
3. Verás una URL como: `https://tuapp-production-xxxx.up.railway.app`

## ✅ ¡Listo!

Ahora puedes acceder a:

- **Juego (Estudiantes)**: https://tuapp-production-xxxx.up.railway.app
- **Panel (Profesor)**: https://tuapp-production-xxxx.up.railway.app/profesor.html

---

## 🔍 Verificar que todo funciona

### Salud del servidor

```
curl https://tuapp-production-xxxx.up.railway.app/api/health
# Respuesta esperada: {"status":"ok"}
```

### Probar login del profesor

```bash
curl -X POST https://tuapp-production-xxxx.up.railway.app/api/profesor/login \
  -H "Content-Type: application/json" \
  -d '{"password":"profesor123"}'
# Respuesta: {"ok":true,"token":"..."}
```

---

## 🐛 Si algo no funciona

### El servidor se queda "Building"

→ Revisa los logs en Railway → Deployments → View Logs

### Error "Module not found"

→ Verifica que `npm install` terminó correctamente

### Contraseña del profesor no funciona

→ Revisa que la variable de entorno está correcta:

- Railway → Variables → `PROFESOR_PASSWORD`

### La BD está vacía

→ Es normal, los estudiantes la llenarán a medida que jueguen

---

## 📝 Notas importantes

1. **La BD persiste** en Railway entre redeploys
2. **Los datos se pierden** solo si eliminas el volumen en Railway
3. **Cambios futuros**:
   - Edita los archivos en `/public` para cambios frontend
   - Edita `server.js` para cambios backend
   - Haz `git push origin railway` para desplegar cambios

---

**¿Necesitas ayuda?** Verifica los logs en Railway → Deployments
