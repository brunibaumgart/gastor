# Gastor - Gastos/Ingresos Familia

Aplicación simple para registrar gastos/ingresos del hogar y del registro, con separación por "palabra clave" para no ver ambos ámbitos a la vez.

## Stack
- Node.js + Express
- SQLite (archivo local)
- HTML/CSS/JS simples (sin framework)

## Requisitos
- Node.js 18+

## Instalación
```bash
npm install
npm start
```

La app corre en `http://localhost:3000`.

## Palabras clave (modo)
Por defecto:
- Casa: `casa`
- Registro: `registro`

Se pueden cambiar con variables de entorno:
```bash
KEYWORD_CASA="mi-clave-casa" KEYWORD_REGISTRO="mi-clave-registro" npm start
```

## Campos
Movimiento (ambos ámbitos):
- etiqueta (ej: luz, agua, seguro, patente, compra, sueldo, etc.)
- monto (número)
- tipo de monto (pesos/dolares)
- adicional (comentario)
- fecha (YYYY-MM-DD)
- vencimiento (opcional)
- fijo (sí/no) + frecuencia (mensual/semanal/diario)

Solo en Casa:
- registrado por (Lucia, Bruno, Jorge, Gabriela)

## API
- GET `/api/labels`
- GET `/api/entries?scope=casa|registro`
- POST `/api/entries`
  - body JSON:
    ```json
    {
      "scope": "casa | registro",
      "is_fixed": true,
      "frequency": "ninguna | mensual | semanal | diario",
      "label": "luz",
      "amount": 1000,
      "currency": "pesos | dolares",
      "note": "opcional",
      "recorded_by": "Lucia (solo casa)",
      "date": "YYYY-MM-DD",
      "due_date": "YYYY-MM-DD (opcional)"
    }
    ```

## 🚀 Despliegue en servidor gratuito

**📖 Ver [DEPLOY.md](./DEPLOY.md) para instrucciones detalladas de deployment.**

Funciona en servicios que soporten Node.js con almacenamiento de archivos (para el `.db`):
- **Render.com** (recomendado) - Tier gratuito con persistencia
- **Railway.app** - $5 crédito mensual gratis
- **Fly.io** - Gratis con volúmenes persistentes

> **Nota**: SQLite escribe en disco; verifique que el hosting permita escritura persistente. Render y Railway lo soportan en sus planes gratuitos.

### Variables de entorno requeridas para producción:
- `SESSION_SECRET`: Secreto para las sesiones (obligatorio en producción)
- `GASTOR_SEED_USERS`: JSON array con usuarios iniciales (opcional)
- `PORT`: Puerto del servidor (se asigna automáticamente en la mayoría de servicios)

## Notas
- La base se crea automáticamente en `data/gastor.db`.
- Las etiquetas iniciales se siembran al iniciar.


