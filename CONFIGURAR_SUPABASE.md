# 🚀 Configurar PostgreSQL con Supabase (SOLUCIÓN DEFINITIVA)

## ✅ Por qué Supabase

- **100% Gratis** (sin límite de tiempo)
- **PostgreSQL real** - Datos persisten 100% entre deployments
- **Fácil de configurar** - 5 minutos
- **Sin pérdida de datos** - Nunca más perderás datos en deployments

## 📋 Pasos para Configurar

### 1. Crear cuenta en Supabase

1. Ve a https://supabase.com
2. Click en "Start your project"
3. Regístrate con GitHub (recomendado) o email
4. Click en "New Project"

### 2. Crear Proyecto

1. **Nombre del proyecto**: `gastor` (o el que prefieras)
2. **Database Password**: Crea una contraseña fuerte (guárdala)
3. **Region**: Elige la más cercana (ej: South America)
4. **Pricing Plan**: Free (gratis)
5. Click en "Create new project"

### 3. Obtener Connection String

1. Una vez creado el proyecto, ve a **Settings** → **Database**
2. Busca la sección **"Connection string"**
3. Selecciona **"URI"** (no "Session mode")
4. Copia la connection string, se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Reemplaza `[YOUR-PASSWORD]` con la contraseña que creaste
6. Debería quedar algo como:
   ```
   postgresql://postgres:tu-password-aqui@db.xxxxx.supabase.co:5432/postgres
   ```

### 4. Configurar en Render

1. Ve al dashboard de Render
2. Selecciona tu servicio `gastor`
3. Ve a **Environment**
4. Agrega una nueva variable de entorno:
   - **Key**: `DATABASE_URL`
   - **Value**: Pega la connection string completa que copiaste
5. Click en **Save Changes**

### 5. Redeploy

1. Render detectará el cambio automáticamente
2. O puedes hacer un **Manual Deploy** desde el dashboard
3. Espera a que termine el deployment

### 6. Verificar

1. Una vez desplegado, revisa los logs
2. Deberías ver: `✅ Usando PostgreSQL`
3. Si ves `✅ Usando SQLite`, verifica que `DATABASE_URL` esté correctamente configurado

## 🎉 ¡Listo!

Ahora tus datos **NUNCA** se perderán, incluso si Render hace clean builds.

## 📝 Notas Importantes

- **No necesitas hacer backups manuales** cuando usas PostgreSQL
- Los datos están en Supabase, no en Render
- Puedes acceder a tus datos desde el dashboard de Supabase también
- El plan gratuito de Supabase es muy generoso (500MB de base de datos, suficiente para años de uso)

## 🔄 Migrar Datos Existentes (Opcional)

Si ya tienes datos en SQLite y quieres migrarlos:

1. Descarga un backup de SQLite: `https://tu-app.onrender.com/api/backup`
2. Usa una herramienta como [DB Browser for SQLite](https://sqlitebrowser.org/)
3. Exporta los datos a CSV
4. Importa en Supabase desde el dashboard

O simplemente empieza de nuevo - los usuarios se crearán automáticamente.

## 🆘 Troubleshooting

**Error: "connection refused"**
- Verifica que la contraseña en `DATABASE_URL` sea correcta
- Verifica que el proyecto de Supabase esté activo

**Sigue usando SQLite**
- Verifica que `DATABASE_URL` esté en las variables de entorno
- Verifica que no tenga espacios extra
- Revisa los logs para ver el error específico

