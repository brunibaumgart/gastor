import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
	initializeDatabase,
	listLabels,
	listEntriesByScope,
	insertEntry,
	findUserByUsername,
	deleteEntry
} from './db.js';
import session from 'express-session';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = initializeDatabase();

// Basic config
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'gastor-secret-demo');

// Validar SESSION_SECRET en producción
if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
	console.error('ERROR: SESSION_SECRET debe estar configurado en producción');
	process.exit(1);
}

// Keywords to select mode via UI (can be changed later)
const KEYWORDS = {
	casa: process.env.KEYWORD_CASA || 'casa',
	registro: process.env.KEYWORD_REGISTRO || 'registro'
};

const VALID = {
	scopes: ['casa', 'registro'],
	kinds: ['gasto', 'ingreso'],
	currencies: ['pesos', 'dolares'],
	frequencies: ['ninguna', 'mensual', 'semanal', 'diario'],
	people: ['Lucia', 'Bruno', 'Jorge', 'Gabriela']
};

// Trust proxy (necesario para Render y otros servicios detrás de proxy)
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	session({
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // HTTPS en producción
			sameSite: 'lax', // Mejora compatibilidad con proxies
			maxAge: 1000 * 60 * 60 * 8 // 8h
		}
	})
);

// Health
app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

function requireAuth(req, res, next) {
	if (!req.session || !req.session.user) {
		return res.status(401).json({ error: 'No autenticado' });
	}
	next();
}

// Auth
app.post('/api/login', async (req, res) => {
	try {
		const usernameInput = String((req.body?.username || '')).trim().toLowerCase();
		const passwordInput = String(req.body?.password || '');
		
		if (!usernameInput || !passwordInput) {
			return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
		}
		
		const user = await findUserByUsername(db, usernameInput);
		if (!user) {
			console.log(`Login fallido: usuario no encontrado - ${usernameInput}`);
			return res.status(401).json({ error: 'Credenciales inválidas' });
		}
		
		const ok = await bcrypt.compare(passwordInput, user.password_hash);
		if (!ok) {
			console.log(`Login fallido: contraseña incorrecta para usuario - ${usernameInput}`);
			return res.status(401).json({ error: 'Credenciales inválidas' });
		}
		
		// Guardar sesión
		req.session.user = { id: user.id, username: user.username, scope: user.scope };
		
		// Guardar sesión explícitamente
		req.session.save((err) => {
			if (err) {
				console.error('Error guardando sesión:', err);
				return res.status(500).json({ error: 'Error guardando sesión' });
			}
			console.log(`Login exitoso: ${usernameInput} (scope: ${user.scope})`);
			res.json({ ok: true });
		});
	} catch (err) {
		console.error('Error en login:', err);
		res.status(500).json({ error: 'Error de inicio de sesión' });
	}
});

app.post('/api/logout', (req, res) => {
	if (req.session) req.session.destroy(() => {});
	res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
	if (!req.session || !req.session.user) {
		return res.json({ authenticated: false });
	}
	const { username, scope } = req.session.user;
	res.json({
		authenticated: true,
		user: { username, scope },
		valid: { ...VALID, scopes: undefined } // no exponer scopes
	});
});

// Serve app or login without previsualización
app.get('/', (req, res) => {
	const publicDir = path.join(__dirname, '..', 'public');
	if (req.session && req.session.user) {
		return res.sendFile(path.join(publicDir, 'index.html'));
	}
	return res.sendFile(path.join(publicDir, 'login.html'));
});

// Static after root handler
app.use(express.static(path.join(__dirname, '..', 'public')));

// Labels
app.get('/api/labels', requireAuth, async (_req, res) => {
	try {
		const labels = await listLabels(db);
		res.json({ labels });
	} catch (err) {
		res.status(500).json({ error: 'Error obteniendo etiquetas' });
	}
});

// Entries by scope
app.get('/api/entries', requireAuth, async (req, res) => {
	try {
		const scope = req.session.user.scope;
		const rows = await listEntriesByScope(db, scope);
		res.json({ entries: rows });
	} catch (_err) {
		res.status(500).json({ error: 'Error obteniendo movimientos' });
	}
});

// Create entry
app.post('/api/entries', requireAuth, async (req, res) => {
	try {
		const {
			kind,
			is_fixed,
			frequency,
			label,
			amount,
			currency,
			note,
			date,
			due_date
		} = req.body || {};

		// Basic validation
		const scope = req.session.user.scope;
		const kindFinal = (kind || 'gasto').toLowerCase();
		if (!VALID.kinds.includes(kindFinal)) {
			return res.status(400).json({ error: 'tipo inválido (gasto|ingreso)' });
		}
		const fixedBool = Boolean(is_fixed);
		if (!VALID.frequencies.includes(frequency)) {
			return res.status(400).json({ error: 'frecuencia inválida' });
		}
		if (!label || typeof label !== 'string') {
			return res.status(400).json({ error: 'label requerido' });
		}
		const parsedAmount = Number(amount);
		if (!Number.isFinite(parsedAmount)) {
			return res.status(400).json({ error: 'monto inválido' });
		}
		if (!VALID.currencies.includes(currency)) {
			return res.status(400).json({ error: 'tipo de monto inválido' });
		}
		if (!date || typeof date !== 'string') {
			return res.status(400).json({ error: 'fecha requerida (ISO YYYY-MM-DD)' });
		}
		let recordedByFinal = null;
		if (scope === 'casa') {
			// Para CASA, asignar automáticamente el usuario autenticado
			recordedByFinal = req.session.user.username;
		}

		const entry = {
			scope,
			kind: kindFinal,
			is_fixed: fixedBool,
			frequency,
			label: label.trim(),
			amount: parsedAmount,
			currency,
			note: note ? String(note).trim() : null,
			recorded_by: recordedByFinal,
			date,
			due_date: due_date || null
		};

		const result = await insertEntry(db, entry);
		res.status(201).json({ id: result.id });
	} catch (_err) {
		res.status(500).json({ error: 'Error creando movimiento' });
	}
});

// Delete entry (solo para usuario bruno)
app.delete('/api/entries/:id', requireAuth, async (req, res) => {
	try {
		const username = req.session.user.username;
		
		// Solo el usuario "bruno" puede eliminar entradas
		if (username !== 'bruno') {
			return res.status(403).json({ error: 'No tienes permiso para eliminar entradas' });
		}
		
		const entryId = Number(req.params.id);
		if (!Number.isInteger(entryId) || entryId <= 0) {
			return res.status(400).json({ error: 'ID de entrada inválido' });
		}
		
		const result = await deleteEntry(db, entryId);
		if (!result.deleted) {
			return res.status(404).json({ error: 'Entrada no encontrada' });
		}
		
		console.log(`Entrada ${entryId} eliminada por usuario ${username}`);
		res.json({ ok: true, deleted: true });
	} catch (err) {
		console.error('Error eliminando entrada:', err);
		res.status(500).json({ error: 'Error eliminando movimiento' });
	}
});

// Backup de base de datos (solo para usuario bruno)
app.get('/api/backup', requireAuth, (req, res) => {
	try {
		const username = req.session.user.username;
		
		// Solo el usuario "bruno" puede descargar backups
		if (username !== 'bruno') {
			return res.status(403).json({ error: 'No tienes permiso para descargar backups' });
		}
		
		const dbPath = path.join(__dirname, '..', 'data', 'gastor.db');
		
		// Verificar que el archivo existe
		if (!fs.existsSync(dbPath)) {
			return res.status(404).json({ error: 'Base de datos no encontrada' });
		}
		
		// Generar nombre de archivo con timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
		const filename = `gastor-backup-${timestamp}.db`;
		
		// Enviar archivo
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		
		const fileStream = fs.createReadStream(dbPath);
		fileStream.pipe(res);
		
		fileStream.on('error', (err) => {
			console.error('Error leyendo archivo de backup:', err);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Error leyendo archivo de backup' });
			}
		});
		
		console.log(`Backup descargado por usuario ${username} - ${filename}`);
	} catch (err) {
		console.error('Error en backup:', err);
		res.status(500).json({ error: 'Error generando backup' });
	}
});

// Backup de base de datos (solo para usuario bruno)
app.get('/api/backup', requireAuth, (req, res) => {
	try {
		const username = req.session.user.username;
		
		// Solo el usuario "bruno" puede descargar backups
		if (username !== 'bruno') {
			return res.status(403).json({ error: 'No tienes permiso para descargar backups' });
		}
		
		const dbPath = path.join(__dirname, '..', 'data', 'gastor.db');
		
		// Verificar que el archivo existe
		if (!fs.existsSync(dbPath)) {
			return res.status(404).json({ error: 'Base de datos no encontrada' });
		}
		
		// Generar nombre de archivo con timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
		const filename = `gastor-backup-${timestamp}.db`;
		
		// Enviar archivo
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		
		const fileStream = fs.createReadStream(dbPath);
		fileStream.pipe(res);
		
		fileStream.on('error', (err) => {
			console.error('Error leyendo archivo de backup:', err);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Error leyendo archivo de backup' });
			}
		});
		
		console.log(`Backup descargado por usuario ${username} - ${filename}`);
	} catch (err) {
		console.error('Error en backup:', err);
		res.status(500).json({ error: 'Error generando backup' });
	}
});

// Monthly summary
app.get('/api/summary', async (req, res) => {
	try {
		const scope = String(req.query.scope || '').toLowerCase();
		const year = Number(req.query.year);
		const month = Number(req.query.month); // 1-12
		if (!VALID.scopes.includes(scope)) {
			return res.status(400).json({ error: 'scope inválido' });
		}
		if (!Number.isInteger(year) || year < 1970 || year > 3000) {
			return res.status(400).json({ error: 'año inválido' });
		}
		if (!Number.isInteger(month) || month < 1 || month > 12) {
			return res.status(400).json({ error: 'mes inválido (1-12)' });
		}
		const start = `${year}-${String(month).padStart(2, '0')}-01`;
		const nextMonth = month === 12 ? 1 : month + 1;
		const nextYear = month === 12 ? year + 1 : year;
		const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

		function all(sql, params = []) {
			return new Promise((resolve, reject) => {
				db.all(sql, params, (err, rows) => {
					if (err) return reject(err);
					resolve(rows || []);
				});
			});
		}

		// Totals by kind
		const totalsRows = await all(
			`SELECT kind, SUM(amount) as total
			 FROM entries
			 WHERE scope = ? AND date >= ? AND date < ?
			 GROUP BY kind`,
			[scope, start, end]
		);
		const totals = { gastos: 0, ingresos: 0, diferencia: 0 };
		for (const r of totalsRows) {
			if (r.kind === 'gasto') totals.gastos = r.total || 0;
			if (r.kind === 'ingreso') totals.ingresos = r.total || 0;
		}
		totals.diferencia = (totals.ingresos || 0) - (totals.gastos || 0);

		// By label (aggregate gasto/ingreso per label)
		const byLabelRows = await all(
			`SELECT label, kind, SUM(amount) as total
			 FROM entries
			 WHERE scope = ? AND date >= ? AND date < ?
			 GROUP BY label, kind
			 ORDER BY label ASC`,
			[scope, start, end]
		);
		const byLabelMap = new Map();
		for (const r of byLabelRows) {
			if (!byLabelMap.has(r.label)) byLabelMap.set(r.label, { label: r.label, gastos: 0, ingresos: 0, total: 0 });
			const obj = byLabelMap.get(r.label);
			if (r.kind === 'gasto') obj.gastos = r.total || 0;
			if (r.kind === 'ingreso') obj.ingresos = r.total || 0;
			obj.total = (obj.gastos || 0) + (obj.ingresos || 0);
		}
		const byLabel = Array.from(byLabelMap.values());

		// Fixed vs not fixed (is_fixed)
		const byFixedRows = await all(
			`SELECT is_fixed, kind, SUM(amount) as total
			 FROM entries
			 WHERE scope = ? AND date >= ? AND date < ?
			 GROUP BY is_fixed, kind`,
			[scope, start, end]
		);
		const byFixed = {
			fijo: { gastos: 0, ingresos: 0, total: 0 },
			noFijo: { gastos: 0, ingresos: 0, total: 0 }
		};
		for (const r of byFixedRows) {
			const bucket = r.is_fixed ? byFixed.fijo : byFixed.noFijo;
			if (r.kind === 'gasto') bucket.gastos = r.total || 0;
			if (r.kind === 'ingreso') bucket.ingresos = r.total || 0;
			bucket.total = (bucket.gastos || 0) + (bucket.ingresos || 0);
		}

		// By person (only casa)
		let byPerson = [];
		if (scope === 'casa') {
			const byPersonRows = await all(
				`SELECT recorded_by as person, kind, SUM(amount) as total
				 FROM entries
				 WHERE scope = ? AND date >= ? AND date < ? AND recorded_by IS NOT NULL
				 GROUP BY recorded_by, kind
				 ORDER BY recorded_by ASC`,
				[scope, start, end]
			);
			const map = new Map();
			for (const r of byPersonRows) {
				if (!map.has(r.person)) map.set(r.person, { person: r.person, gastos: 0, ingresos: 0, total: 0 });
				const obj = map.get(r.person);
				if (r.kind === 'gasto') obj.gastos = r.total || 0;
				if (r.kind === 'ingreso') obj.ingresos = r.total || 0;
				obj.total = (obj.gastos || 0) + (obj.ingresos || 0);
			}
			byPerson = Array.from(map.values());
		}

		res.json({
			period: { year, month, start, end },
			scope,
			totals,
			byLabel,
			byFixed,
			byPerson
		});
	} catch (_err) {
		res.status(500).json({ error: 'Error generando resumen' });
	}
});

app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Servidor escuchando en http://localhost:${PORT}`);
});


