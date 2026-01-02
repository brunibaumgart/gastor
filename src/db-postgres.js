import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

let pool = null;

export function initializeDatabase() {
	// Si hay DATABASE_URL, usar PostgreSQL; si no, retornar null (se usará SQLite)
	const databaseUrl = process.env.DATABASE_URL;
	
	if (!databaseUrl) {
		console.log('DATABASE_URL no configurado, usando SQLite');
		return null; // Se usará SQLite
	}
	
	console.log('Usando PostgreSQL');
	
	// Configurar pool de conexiones
	pool = new Pool({
		connectionString: databaseUrl,
		ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
	});
	
	// Probar conexión
	pool.query('SELECT NOW()', (err) => {
		if (err) {
			console.error('Error conectando a PostgreSQL:', err);
		} else {
			console.log('Conectado a PostgreSQL exitosamente');
		}
	});
	
	// Crear tablas si no existen
	initializeTables();
	
	return pool;
}

async function initializeTables() {
	const client = await pool.connect();
	
	try {
		// Crear tabla entries
		await client.query(`
			CREATE TABLE IF NOT EXISTS entries (
				id SERIAL PRIMARY KEY,
				scope TEXT NOT NULL CHECK(scope IN ('casa','registro')),
				kind TEXT NOT NULL CHECK(kind IN ('gasto','ingreso')),
				is_fixed BOOLEAN NOT NULL DEFAULT false,
				frequency TEXT NOT NULL CHECK(frequency IN ('ninguna','mensual','semanal','diario')),
				label TEXT NOT NULL,
				amount REAL NOT NULL,
				currency TEXT NOT NULL CHECK(currency IN ('pesos','dolares')),
				note TEXT,
				recorded_by TEXT,
				date TEXT NOT NULL,
				due_date TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		
		// Crear tabla labels
		await client.query(`
			CREATE TABLE IF NOT EXISTS labels (
				id SERIAL PRIMARY KEY,
				name TEXT UNIQUE NOT NULL
			)
		`);
		
		// Crear tabla users
		await client.query(`
			CREATE TABLE IF NOT EXISTS users (
				id SERIAL PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				scope TEXT NOT NULL CHECK(scope IN ('casa','registro')),
				password_hash TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);
		
		// Seed default labels
		const defaultLabels = [
			'luz', 'agua', 'seguro', 'patente', 'compra', 'sueldo',
			'alquiler', 'internet', 'gas', 'nafta', 'pagos pendientes', 'otros'
		];
		
		for (const label of defaultLabels) {
			await client.query(
				'INSERT INTO labels (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
				[label]
			);
		}
		
		// Seed users
		const seedEnv = process.env.GASTOR_SEED_USERS;
		if (seedEnv) {
			try {
				const arr = JSON.parse(seedEnv);
				if (Array.isArray(arr)) {
					for (const u of arr) {
						if (!u || !u.username || !u.scope) continue;
						let hash = u.passwordHash;
						if (!hash && u.password) {
							hash = bcrypt.hashSync(String(u.password), 10);
						}
						if (!hash) continue;
						await client.query(
							`INSERT INTO users (username, scope, password_hash) 
							 VALUES ($1, $2, $3) 
							 ON CONFLICT (username) 
							 DO UPDATE SET scope = EXCLUDED.scope, password_hash = EXCLUDED.password_hash`,
							[String(u.username).toLowerCase(), String(u.scope).toLowerCase(), hash]
						);
					}
				}
			} catch (err) {
				console.warn('GASTOR_SEED_USERS inválido, saltando seed de usuarios.');
			}
		} else {
			// Fallback: usuarios hardcodeados
			const hardcoded = [
				{ username: 'bruno', scope: 'casa', password: '@Minijuegos2001' },
				{ username: 'lucia', scope: 'casa', password: 'Munito23' },
				{ username: 'gabriela', scope: 'casa', password: 'bruenzo1936' },
				{ username: 'jorge', scope: 'casa', password: 'gallardo1956' },
				{ username: 'registro', scope: 'registro', password: 'gallardo1956' }
			];
			
			console.log('Creando usuarios por defecto...');
			for (const u of hardcoded) {
				const hash = bcrypt.hashSync(String(u.password), 10);
				await client.query(
					`INSERT INTO users (username, scope, password_hash) 
					 VALUES ($1, $2, $3) 
					 ON CONFLICT (username) 
					 DO UPDATE SET scope = EXCLUDED.scope, password_hash = EXCLUDED.password_hash`,
					[String(u.username).toLowerCase(), String(u.scope).toLowerCase(), hash]
				);
				console.log(`Usuario ${u.username} creado/actualizado (scope: ${u.scope})`);
			}
		}
		
		console.log('Tablas de PostgreSQL inicializadas correctamente');
	} catch (err) {
		console.error('Error inicializando tablas PostgreSQL:', err);
	} finally {
		client.release();
	}
}

export function listLabels(db) {
	return new Promise(async (resolve, reject) => {
		try {
			const result = await db.query(
				`SELECT name FROM labels 
				 ORDER BY CASE WHEN name = 'otros' THEN 1 ELSE 0 END, name ASC`
			);
			resolve(result.rows.map(r => r.name));
		} catch (err) {
			reject(err);
		}
	});
}

export function findUserByUsername(db, username) {
	return new Promise(async (resolve, reject) => {
		try {
			const result = await db.query(
				'SELECT id, username, scope, password_hash FROM users WHERE username = $1',
				[username]
			);
			resolve(result.rows[0] || null);
		} catch (err) {
			reject(err);
		}
	});
}

export function listEntriesByScope(db, scope) {
	return new Promise(async (resolve, reject) => {
		try {
			const result = await db.query(
				`SELECT id, scope, kind, is_fixed, frequency, label, amount, currency, note, recorded_by, date, due_date
				 FROM entries
				 WHERE scope = $1
				 ORDER BY date DESC, id DESC`,
				[scope]
			);
			// Convertir is_fixed de boolean a número para compatibilidad
			const rows = result.rows.map(r => ({
				...r,
				is_fixed: r.is_fixed ? 1 : 0
			}));
			resolve(rows);
		} catch (err) {
			reject(err);
		}
	});
}

export function insertEntry(db, entry) {
	const {
		scope,
		kind,
		is_fixed,
		frequency,
		label,
		amount,
		currency,
		note,
		recorded_by,
		date,
		due_date
	} = entry;

	return new Promise(async (resolve, reject) => {
		try {
			const result = await db.query(
				`INSERT INTO entries
					(scope, kind, is_fixed, frequency, label, amount, currency, note, recorded_by, date, due_date)
				VALUES
					($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				RETURNING id`,
				[
					scope,
					kind,
					is_fixed,
					frequency,
					label,
					amount,
					currency,
					note || null,
					recorded_by || null,
					date,
					due_date || null
				]
			);
			resolve({ id: result.rows[0].id });
		} catch (err) {
			reject(err);
		}
	});
}

export function deleteEntry(db, entryId) {
	return new Promise(async (resolve, reject) => {
		try {
			const result = await db.query('DELETE FROM entries WHERE id = $1', [entryId]);
			resolve({ deleted: result.rowCount > 0 });
		} catch (err) {
			reject(err);
		}
	});
}

