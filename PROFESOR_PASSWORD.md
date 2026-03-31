# 📝 PROTECCIÓN DEL PANEL DEL PROFESOR

Se ha agregado un sistema de autenticación para proteger el panel del profesor.

## 🔐 Contraseña por defecto

`profesor123`

## 📌 ¿Cómo cambiar la contraseña?

### Opción 1: En desarrollo local

1. Abre `server.js`
2. En la línea 11, cambia:
   ```javascript
   const PROFESOR_PASSWORD = process.env.PROFESOR_PASSWORD || "profesor123";
   ```
   Por tu contraseña:
   ```javascript
   const PROFESOR_PASSWORD =
     process.env.PROFESOR_PASSWORD || "mi-contraseña-segura";
   ```
3. Guarda y reinicia el servidor

### Opción 2: Variable de entorno (RECOMENDADO para producción)

En Railway:

1. Ve a tu proyecto en https://railway.app
2. Selecciona tu aplicación
3. Ve a "Variables"
4. Crea una nueva variable:
   - **Key**: `PROFESOR_PASSWORD`
   - **Value**: `tu-contraseña-segura`
5. Presiona Deploy

En producción con Node local:

```bash
export PROFESOR_PASSWORD="tu-contraseña-segura"
npm start
```

## 🎯 Características de seguridad

✅ **Tokens con expiración** - Se expiran después de 24 horas
✅ **Sesión persistente** - Se guarda en localStorage mientras esté activa
✅ **Logout** - Botón para cerrar sesión
✅ **Protección de endpoints** - El servidor verifica el token en cada request

## 🚀 Flujo de autenticación

1. Profesor abre `/profesor`
2. Ve un modal pidiendo contraseña
3. Ingresa la contraseña
4. El servidor verifica y emite un token
5. El token se guarda en localStorage (24 horas)
6. Todas las requests al API incluyen el token
7. El servidor verifica el token antes de servir datos

## 📱 Lo que los niños ven

Los niños NO pueden acceder a `/profesor` aunque intenten:

- El endpoint devuelve un error de autenticación
- No pueden ver el panel ni los datos de otros alumnos

## ⚠️ Importante

- Usa una contraseña fuerte en producción
- No compartas la contraseña públicamente
- Cambia la contraseña periódicamente si muchos profesores tienen acceso
