# 🚀 Guía de Deployment - Gastor

Esta guía te ayudará a deployar Gastor de forma gratuita con persistencia de datos.

## Opciones de Deployment Gratuito

### Opción 1: Render.com (Recomendado) ⭐

**Ventajas:**
- Tier gratuito disponible
- Persistencia de archivos (SQLite funciona)
- HTTPS automático
- Fácil configuración

**Limitaciones del plan gratuito:**
- El servicio se "duerme" después de 15 minutos de inactividad
- Tarda ~30 segundos en despertar la primera vez
- 750 horas gratis por mes

#### Pasos para deployar en Render:

1. **Crear cuenta en Render.com**
   - Ve a https://render.com
   - Regístrate con GitHub (recomendado)

2. **Conectar tu repositorio**
   - En el dashboard, click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub/GitLab/Bitbucket
   - Selecciona el repositorio de Gastor

3. **Configurar el servicio**
   - **Name**: `gastor` (o el que prefieras)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. **Configurar Variables de Entorno**
   En la sección "Environment Variables", agrega:

   ```
   NODE_ENV=production
   SESSION_SECRET=<genera-un-secreto-aleatorio-aqui>
   GASTOR_SEED_USERS=[{"username":"bruno","scope":"casa","password":"@Minijuegos2001"},{"username":"lucia","scope":"casa","password":"Munito23"},{"username":"gabriela","scope":"casa","password":"bruenzo1936"},{"username":"jorge","scope":"casa","password":"gallardo1956"},{"username":"registro","scope":"registro","password":"gallardo1956"}]
   ```

   **⚠️ IMPORTANTE**: 
   - Genera un `SESSION_SECRET` seguro (puedes usar: `openssl rand -hex 32`)
   - Los usuarios se crearán automáticamente al iniciar
   - Considera cambiar las contraseñas después del primer login

5. **Deploy**
   - Click en "Create Web Service"
   - Render construirá y desplegará tu app automáticamente
   - Espera a que termine (5-10 minutos)

6. **Acceder a tu app**
   - Una vez deployado, tendrás una URL como: `https://gastor.onrender.com`
   - La primera carga puede tardar ~30 segundos (servicio durmiendo)

### Opción 2: Railway.app

**Ventajas:**
- Tier gratuito con $5 de crédito mensual
- Persistencia de archivos
- No se duerme automáticamente

**Pasos:**
1. Ve a https://railway.app
2. Conecta tu repositorio
3. Railway detectará automáticamente Node.js
4. Agrega las mismas variables de entorno que en Render
5. Deploy automático

### Opción 3: Fly.io

**Ventajas:**
- Gratis con límites generosos
- Persistencia con volúmenes

**Pasos:**
1. Instala Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Crea app: `fly launch`
4. Crea volumen: `fly volumes create gastor_data --size 1`
5. Configura en `fly.toml` el mount del volumen

## 🔒 Seguridad Post-Deployment

1. **Cambiar contraseñas**: Después del primer login, cambia las contraseñas de los usuarios
2. **HTTPS**: Render y Railway lo proporcionan automáticamente
3. **SESSION_SECRET**: Asegúrate de usar un secreto fuerte y único

## 📊 Persistencia de Datos

- **SQLite**: Los datos se guardan en `data/gastor.db`
- En Render/Railway, este archivo persiste entre reinicios
- **Backup recomendado**: Considera hacer backups periódicos del archivo `.db`

## 🔄 Actualizar la App

1. Haz push a tu repositorio
2. Render/Railway detectará los cambios automáticamente
3. Se reconstruirá y redesplegará automáticamente

## 🐛 Troubleshooting

**El servicio no inicia:**
- Revisa los logs en el dashboard de Render/Railway
- Verifica que todas las variables de entorno estén configuradas

**Los datos se pierden:**
- Verifica que el directorio `data/` tenga permisos de escritura
- En algunos servicios, puede necesitarse un volumen persistente

**Error de conexión:**
- Si usas Render free, espera ~30 segundos en la primera carga (servicio durmiendo)

## 📝 Notas

- El plan gratuito de Render tiene limitaciones de "sleep" pero es suficiente para uso familiar
- Para uso más intensivo, considera un plan de pago o Railway
- Los datos persisten mientras el servicio esté activo

