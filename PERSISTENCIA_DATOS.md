# 📊 Persistencia de Datos en Render

## ⚠️ Importante: ¿Se pierden los datos al hacer deploy?

**Respuesta corta**: Depende del tipo de deployment.

### ✅ Los datos PERSISTEN cuando:
- Haces un **deployment normal** (push a GitHub)
- El servicio se **reinicia** automáticamente
- Render hace un **redeploy automático** por cambios en el código

### ❌ Los datos se PIERDEN cuando:
- Haces un **"Clean Build"** manualmente en Render
- Eliminas y recreas el servicio
- Render hace un **rebuild completo** del contenedor (poco común)

## 🔍 Cómo funciona en Render

En el plan **gratuito** de Render:
- Los archivos en el sistema de archivos **persisten** entre deployments normales
- El archivo `data/gastor.db` se mantiene entre reinicios
- **PERO** no hay garantía absoluta de persistencia en el plan gratuito

## 🛡️ Soluciones Recomendadas

### Opción 1: Backups Manuales (✅ Implementado)
- **Endpoint de backup**: `/api/backup` (solo para usuario bruno)
- **Cómo usar**: 
  1. Inicia sesión como `bruno`
  2. Visita: `https://tu-app.onrender.com/api/backup`
  3. Se descargará automáticamente un archivo `gastor-backup-YYYY-MM-DD-HH-MM.db`
  4. Guarda este archivo en un lugar seguro (tu computadora, Google Drive, etc.)

**⚠️ IMPORTANTE**: Haz un backup ANTES de hacer cualquier cambio importante o deployment que pueda requerir un rebuild.

### Opción 2: Usar un servicio de almacenamiento externo
- Subir la BD a Google Drive, Dropbox, o S3
- Más seguro pero requiere configuración adicional

### Opción 3: Migrar a Railway o Fly.io
- Railway: Mejor persistencia garantizada
- Fly.io: Volúmenes persistentes dedicados

## 📝 Recomendación

1. **Haz backups periódicos** usando el endpoint `/api/backup`
2. **Evita hacer "Clean Build"** a menos que sea absolutamente necesario
3. **Considera migrar a Railway** si necesitas garantía absoluta de persistencia

