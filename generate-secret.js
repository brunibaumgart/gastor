#!/usr/bin/env node
/**
 * Script para generar un SESSION_SECRET seguro
 * Uso: node generate-secret.js
 */

import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('hex');
console.log('\n🔐 SESSION_SECRET generado:');
console.log(secret);
console.log('\n📋 Copia este valor y úsalo como variable de entorno SESSION_SECRET\n');

