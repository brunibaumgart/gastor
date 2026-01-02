### Propuestas de valor para Gastor (roadmap sugerido)

Nota: orden aproximado por impacto vs. esfuerzo.

- **Seguridad y cuentas**
  - Forzar HTTPS detrás de proxy (si el hosting no lo impone).
  - Rotación del `SESSION_SECRET` por entorno; expiración forzada de sesiones inactivas.
  - Cerrar sesión en todos los dispositivos desde la cuenta.
  - Registro de actividad (quién creó/edito/borró y cuándo).

- **Experiencia de uso (UX)**
  - Atajos rápidos: tecla “N” para nuevo movimiento, “/” para foco en filtros, “S” para guardar.
  - Edición y eliminación inline de movimientos (con confirmación).
  - Paginación/virtualización en tabla para listas grandes.
  - Modo oscuro/claro con preferencia del sistema y toggle.

- **Datos y reportes**
  - Presupuestos por etiqueta/mes (objetivo vs. ejecutado).
  - Filtros guardados y vistas favoritas (ej. “Gastos fijos del mes”).
  - Metas anuales (ahorro, reducción de gastos), con tracking mensual.
  - Conversión automática ARS/USD con tipo de cambio configurable por mes.
  - Comparativas intermensuales e interanuales (variación %).

- **Automatizaciones**
  - Recurrentes: generar automáticamente movimientos fijos al inicio del período.
  - Recordatorios: alertas por vencimientos próximos (email/Telegram/WhatsApp Bot).
  - Reglas automáticas por texto de nota/lugar para etiquetar y clasificar.

- **Exportación e importación**
  - Exportar CSV/Excel por rango y por resumen.
  - Importar CSV (ej: extractos bancarios) con mapeo de columnas y previsualización.
  - Exportar PDF del “Resumen mensual” con totales y gráficos.

- **Operación y mantenimiento**
  - Backups automáticos de SQLite (diario/semanal) a almacenamiento externo (p. ej. S3/Drive).
  - Comando “migraciones” para evolucionar esquema sin downtime.
  - Logs estructurados (JSON) y visor simple en UI admin.
  - Monitor de salud: pings, uso de disco y tamaño de DB.

- **Mobile / PWA**
  - Instalable (PWA): icono en home, splash, offline básico.
  - Caché de etiquetas y últimas operaciones para carga instantánea.
  - Diseño responsive optimizado (inputs grandes, teclado numérico).

- **Calidad de vida (familia)**
  - Etiquetas administrables (crear/renombrar/archivar) con colores/íconos.
  - Comentarios/adjuntos por movimiento (foto de factura o comprobante).
  - Menciones en notas (@bruno, @lucia) para marcar responsables/seguimiento.

- **Gráficos y visualización**
  - Barras apiladas gastos/ingresos por mes.
  - Torta por etiqueta (top 5) y “otros” agrupado.
  - Línea de tendencia de diferencia (ingresos − gastos).

- **Accesibilidad**
  - Navegación 100% con teclado, roles ARIA, contraste verificado.
  - Textos y números con localización “es-AR” en toda la UI.

- **Hardening técnico**
  - Validación del lado cliente y servidor con el mismo esquema (ej. Zod/Valibot).
  - Rate limiting y protección CSRF en rutas sensibles.
  - Test unitarios de utilidades y flujos críticos (creación/filtrado/resumen).
  - Separar capas: `core de dominio` + `infra` (Express/SQLite) para facilitar cambios.

- **Futuro (si crece)**
  - Pasar de SQLite a Postgres administrado (cuando el volumen/usuarios lo exija).
  - Multi-hogar/multi-registro con espacios aislados por familia.
  - Roles (admin/miembro/solo lectura) y auditoría completa.

#### Siguientes pasos sugeridos (rápidos y con alto impacto)
1) Presupuestos por etiqueta y resumen mensual con semáforos (cumple/no cumple).  
2) Recurrentes automáticos con recordatorios de vencimiento.  
3) Exportar CSV y PDF del resumen.  
4) Backups automáticos y botón “descargar respaldo”.  

