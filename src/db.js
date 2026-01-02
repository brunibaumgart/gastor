import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'gastor.db');

export function initializeDatabase() {
	// Ensure data directory exists
	try {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	} catch (err) {
		console.error('Error creando directorio data:', err);
		throw err;
	}

	sqlite3.verbose();
	const db = new sqlite3.Database(DB_FILE);

	// Create tables if not exist
	db.serialize(() => {
		db.run(`
			CREATE TABLE IF NOT EXISTS entries (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				scope TEXT NOT NULL CHECK(scope IN ('casa','registro')),
				kind TEXT NOT NULL CHECK(kind IN ('gasto','ingreso')),
				is_fixed INTEGER NOT NULL CHECK(is_fixed IN (0,1)),
				frequency TEXT NOT NULL CHECK(frequency IN ('ninguna','mensual','semanal','diario')),
				label TEXT NOT NULL,
				amount REAL NOT NULL,
				currency TEXT NOT NULL CHECK(currency IN ('pesos','dolares')),
				note TEXT,
				recorded_by TEXT,
				date TEXT NOT NULL,
				due_date TEXT
			);
		`);

		db.run(`
			CREATE TABLE IF NOT EXISTS labels (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT UNIQUE NOT NULL
			);
		`);
		db.run(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT UNIQUE NOT NULL,
				scope TEXT NOT NULL CHECK(scope IN ('casa','registro')),
				password_hash TEXT NOT NULL
			);
		`);

		// Ensure 'kind' column exists for existing databases (migration)
		db.all(`PRAGMA table_info(entries);`, (err, rows) => {
			if (err) {
				// eslint-disable-next-line no-console
				console.error('Error leyendo esquema:', err);
				return;
			}
			const hasKind = rows.some(r => String(r.name) === 'kind');
			if (!hasKind) {
				db.run(`ALTER TABLE entries ADD COLUMN kind TEXT NOT NULL DEFAULT 'gasto';`);
			}
		});

		// Seed default labels
		const defaultLabels = [
			'luz',
			'agua',
			'seguro',
			'patente',
			'compra',
			'sueldo',
			'alquiler',
			'internet',
			'gas',
			'nafta',
			'pagos pendientes',
			'otros'
		];

		const insertStmt = db.prepare('INSERT OR IGNORE INTO labels (name) VALUES (?)');
		for (const l of defaultLabels) {
			insertStmt.run(l);
		}
		insertStmt.finalize();

		// Seed users from environment (recommended: provide bcrypt hashes, not contraseñas en texto)
		// GASTOR_SEED_USERS accepts JSON array of objects:
		//  - { "username": "bruno", "scope": "casa", "passwordHash": "$2a$10$..." }
		//  - or { "username": "bruno", "scope": "casa", "password": "plaintext" }  // se hashea en runtime
		const seedEnv = process.env.GASTOR_SEED_USERS;
		if (seedEnv) {
			try {
				const arr = JSON.parse(seedEnv);
				if (Array.isArray(arr)) {
					for (const u of arr) {
						if (!u || !u.username || !u.scope) continue;
						let hash = u.passwordHash;
						if (!hash && u.password) {
							const saltRounds = 10;
							hash = bcrypt.hashSync(String(u.password), saltRounds);
						}
						if (!hash) continue;
						db.run(
							'INSERT INTO users (username, scope, password_hash) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET scope=excluded.scope, password_hash=excluded.password_hash',
							[String(u.username).toLowerCase(), String(u.scope).toLowerCase(), hash]
						);
					}
				}
			} catch {
				// eslint-disable-next-line no-console
				console.warn('GASTOR_SEED_USERS inválido, saltando seed de usuarios.');
			}
		} else {
			// Fallback temporal a pedido del usuario: seed embebido (se puede quitar luego)
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
				db.run(
					'INSERT INTO users (username, scope, password_hash) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET scope=excluded.scope, password_hash=excluded.password_hash',
					[String(u.username).toLowerCase(), String(u.scope).toLowerCase(), hash],
					function(err) {
						if (err) {
							console.error(`Error creando usuario ${u.username}:`, err);
						} else {
							console.log(`Usuario ${u.username} creado/actualizado (scope: ${u.scope})`);
						}
					}
				);
			}
		}
	});

	return db;
}

export function listLabels(db) {
	return new Promise((resolve, reject) => {
		db.all(`SELECT name FROM labels
						ORDER BY CASE WHEN name = 'otros' THEN 1 ELSE 0 END, name ASC`, (err, rows) => {
			if (err) return reject(err);
			resolve(rows.map(r => r.name));
		});
	});
}

export function findUserByUsername(db, username) {
	return new Promise((resolve, reject) => {
		db.get('SELECT id, username, scope, password_hash FROM users WHERE username = ?', [username], (err, row) => {
			if (err) return reject(err);
			resolve(row || null);
		});
	});
}

export function listEntriesByScope(db, scope) {
	return new Promise((resolve, reject) => {
		db.all(
			`SELECT id, scope, kind, is_fixed, frequency, label, amount, currency, note, recorded_by, date, due_date
			 FROM entries
			 WHERE scope = ?
			 ORDER BY date DESC, id DESC`,
			[scope],
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			}
		);
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

	return new Promise((resolve, reject) => {
		const sql = `
			INSERT INTO entries
				(scope, kind, is_fixed, frequency, label, amount, currency, note, recorded_by, date, due_date)
			VALUES
				(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;
		const params = [
			scope,
			kind,
			is_fixed ? 1 : 0,
			frequency,
			label,
			amount,
			currency,
			note || null,
			recorded_by || null,
			date,
			due_date || null
		];
		db.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve({ id: this.lastID });
		});
	});
}


