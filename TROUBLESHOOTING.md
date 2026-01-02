# 🔧 Troubleshooting - Problemas de Login

## Problema: No puedo hacer login aunque las credenciales sean correctas

### Soluciones aplicadas:

1. **Trust Proxy configurado** ✅
   - Render y otros servicios están detrás de un proxy
   - Express ahora confía en el proxy con `app.set('trust proxy', 1)`

2. **Cookies mejoradas** ✅
   - Agregado `sameSite: 'lax'` para mejor compatibilidad
   - Las cookies ahora funcionan correctamente detrás del proxy

3. **Logging mejorado** ✅
   - Ahora se registran los intentos de login fallidos
   - Se registra cuando los usuarios se crean correctamente

### Pasos para verificar:

1. **Revisa los logs de Render:**
   - Ve al dashboard de Render
   - Click en "Logs" de tu servicio
   - Busca mensajes como:
     - `"Usuario X creado/actualizado"` - Confirma que los usuarios se crearon
     - `"Login fallido: usuario no encontrado"` - El usuario no existe
     - `"Login fallido: contraseña incorrecta"` - La contraseña está mal
     - `"Login exitoso: X"` - El login funcionó

2. **Verifica las variables de entorno en Render:**
   - `SESSION_SECRET` debe estar configurado
   - `NODE_ENV` debe ser `production` (o no estar configurado)
   - `GASTOR_SEED_USERS` es opcional (si no está, usa usuarios hardcodeados)

3. **Usuarios por defecto:**
   - `bruno` / `@Minijuegos2001` (scope: casa)
   - `lucia` / `Munito23` (scope: casa)
   - `gabriela` / `bruenzo1936` (scope: casa)
   - `jorge` / `gallardo1956` (scope: casa)
   - `registro` / `gallardo1956` (scope: registro)

4. **Prueba el endpoint de health:**
   - Visita: `https://tu-app.onrender.com/api/health`
   - Debe responder: `{"ok":true}`

5. **Verifica que el servicio esté despierto:**
   - En Render free, el servicio se "duerme" después de 15 min
   - La primera carga puede tardar ~30 segundos

### Si aún no funciona:

1. **Limpia las cookies del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a Application/Storage → Cookies
   - Elimina todas las cookies del dominio de Render
   - Intenta login de nuevo

2. **Verifica en la consola del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña "Console"
   - Intenta hacer login y revisa si hay errores

3. **Verifica la respuesta del servidor:**
   - En las herramientas de desarrollador, pestaña "Network"
   - Intenta hacer login
   - Click en la petición `/api/login`
   - Revisa la respuesta del servidor

4. **Revisa los logs en tiempo real:**
   - En Render, ve a "Logs"
   - Intenta hacer login
   - Revisa qué mensajes aparecen

### Debug adicional:

Si necesitas verificar que las sesiones funcionan, puedes agregar temporalmente este endpoint:

```javascript
app.get('/api/debug/session', (req, res) => {
	res.json({
		session: req.session,
		hasSession: !!req.session,
		hasUser: !!(req.session && req.session.user)
	});
});
```

Luego visita: `https://tu-app.onrender.com/api/debug/session`

