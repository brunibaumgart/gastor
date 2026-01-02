const state = {
	config: null,
	scope: null,
	entries: [],
	filters: {
		kind: [],
		labels: [],
		dateFrom: '',
		dateTo: '',
		currency: [],
		amountMin: NaN,
		amountMax: NaN,
		fixed: [], // '1' o '0'
		frequency: [],
		dueFrom: '',
		dueTo: '',
		recordedBy: [],
		note: ''
	}
};

function qs(id) {
	return document.getElementById(id);
}

async function fetchMe() {
	const res = await fetch('/api/me');
	if (!res.ok) return { authenticated: false };
	return await res.json();
}

function showOverlay(_show) {}

function ensureFilterPopover() {
	let pop = document.getElementById('filter-popover');
	if (!pop) {
		pop = document.createElement('div');
		pop.id = 'filter-popover';
		pop.className = 'filter-popover';
		pop.style.display = 'none';
		document.body.appendChild(pop);
		// Cerrar al clickear afuera
		document.addEventListener('click', (e) => {
			const open = document.getElementById('filter-popover');
			if (!open || open.style.display === 'none') return;
			if (!open.contains(e.target) && !(e.target.closest('th'))) {
				open.style.display = 'none';
			}
		});
	}
	return pop;
}

function openFilterPopover(key, anchorTh) {
	const pop = ensureFilterPopover();
	const f = state.filters;
	// Construir contenido según columna
	let inner = `<h4>Filtrar ${anchorTh.textContent.trim()}</h4>`;
	function cbList(options, selected) {
		return `
			<div class="options">
				${options.map(o => {
					const value = String(o.value);
					const label = o.label ?? value;
					const checked = selected.includes(value) ? 'checked' : '';
					return `<div class="row" style="align-items:center; gap:8px; margin:4px 0;">
						<input type="checkbox" data-value="${value}" ${checked} />
						<span>${label}</span>
					</div>`;
				}).join('')}
			</div>
		`;
	}
	if (key === 'kind') {
		const opts = [{ value: 'gasto', label: 'Gasto' }, { value: 'ingreso', label: 'Ingreso' }];
		inner += cbList(opts, f.kind);
	} else if (key === 'labels') {
		const labels = uniqueSorted(state.entries.map(e => e.label));
		const opts = labels.map(l => ({ value: l, label: toTitleCaseWords(l) }));
		inner += cbList(opts, f.labels);
	} else if (key === 'currency') {
		const opts = [{ value: 'pesos', label: 'Pesos' }, { value: 'dolares', label: 'Dólares' }];
		inner += cbList(opts, f.currency);
	} else if (key === 'fixed') {
		const opts = [{ value: '1', label: 'Sí' }, { value: '0', label: 'No' }];
		inner += cbList(opts, f.fixed);
	} else if (key === 'frequency') {
		const opts = ['mensual','semanal','diario','ninguna'].map(x => ({ value: x, label: toTitleCaseWords(x) }));
		inner += cbList(opts, f.frequency);
	} else if (key === 'recordedBy') {
		if (state.scope !== 'casa') {
			inner += `<div class="muted">No disponible en Registro.</div>`;
		} else {
			const people = uniqueSorted(state.entries.map(e => e.recorded_by));
			const opts = people.map(p => ({ value: p, label: p }));
			inner += cbList(opts, f.recordedBy);
		}
	} else if (key === 'date' || key === 'due') {
		const from = key === 'date' ? f.dateFrom : f.dueFrom;
		const to = key === 'date' ? f.dateTo : f.dueTo;
		inner += `
			<div class="group">
				<label>Desde</label>
				<input type="date" id="fp-from" value="${from || ''}" />
			</div>
			<div class="group">
				<label>Hasta</label>
				<input type="date" id="fp-to" value="${to || ''}" />
			</div>
		`;
	} else if (key === 'amount') {
		const vmin = Number.isFinite(f.amountMin) ? formatAmountEs(f.amountMin) : '';
		const vmax = Number.isFinite(f.amountMax) ? formatAmountEs(f.amountMax) : '';
		inner += `
			<div class="group">
				<label>Mínimo</label>
				<input type="text" id="fp-min" inputmode="decimal" placeholder="0,00" value="${vmin}" />
			</div>
			<div class="group">
				<label>Máximo</label>
				<input type="text" id="fp-max" inputmode="decimal" placeholder="0,00" value="${vmax}" />
			</div>
		`;
	} else if (key === 'note') {
		inner += `
			<div class="group">
				<label>Contiene</label>
				<input type="text" id="fp-note" placeholder="Texto en nota..." value="${f.note || ''}" />
			</div>
		`;
	}
	inner += `
		<div class="actions">
			<button id="fp-clear" type="button">Limpiar</button>
			<button id="fp-apply" type="button">Aplicar</button>
		</div>
	`;
	pop.innerHTML = inner;
	// Handlers de inputs especiales
	const minEl = document.getElementById('fp-min');
	const maxEl = document.getElementById('fp-max');
	for (const el of [minEl, maxEl]) {
		if (!el) continue;
		el.addEventListener('input', () => { el.value = sanitizeAmountInput(el.value); });
		el.addEventListener('blur', () => {
			const n = parseAmount(el.value);
			if (Number.isFinite(n)) el.value = formatAmountEs(n);
		});
	}
	// Aplicar
	document.getElementById('fp-apply')?.addEventListener('click', () => {
		// leer según key
		if (key === 'kind' || key === 'labels' || key === 'currency' || key === 'fixed' || key === 'frequency' || key === 'recordedBy') {
			const vals = Array.from(pop.querySelectorAll('input[type="checkbox"][data-value]:checked')).map(i => i.getAttribute('data-value'));
			if (key === 'kind') f.kind = vals;
			else if (key === 'labels') f.labels = vals;
			else if (key === 'currency') f.currency = vals;
			else if (key === 'fixed') f.fixed = vals;
			else if (key === 'frequency') f.frequency = vals;
			else if (key === 'recordedBy') f.recordedBy = vals;
		} else if (key === 'date' || key === 'due') {
			const from = document.getElementById('fp-from')?.value || '';
			const to = document.getElementById('fp-to')?.value || '';
			if (key === 'date') { f.dateFrom = from; f.dateTo = to; }
			else { f.dueFrom = from; f.dueTo = to; }
		} else if (key === 'amount') {
			const nmin = parseAmount(document.getElementById('fp-min')?.value || '');
			const nmax = parseAmount(document.getElementById('fp-max')?.value || '');
			f.amountMin = Number.isFinite(nmin) ? nmin : NaN;
			f.amountMax = Number.isFinite(nmax) ? nmax : NaN;
		} else if (key === 'note') {
			f.note = document.getElementById('fp-note')?.value || '';
		}
		applyFiltersAndRender();
		pop.style.display = 'none';
	});
	// Limpiar (solo esa columna)
	document.getElementById('fp-clear')?.addEventListener('click', () => {
		if (key === 'kind') f.kind = [];
		else if (key === 'labels') f.labels = [];
		else if (key === 'currency') f.currency = [];
		else if (key === 'fixed') f.fixed = [];
		else if (key === 'frequency') f.frequency = [];
		else if (key === 'recordedBy') f.recordedBy = [];
		else if (key === 'date') { f.dateFrom = ''; f.dateTo = ''; }
		else if (key === 'due') { f.dueFrom = ''; f.dueTo = ''; }
		else if (key === 'amount') { f.amountMin = NaN; f.amountMax = NaN; }
		else if (key === 'note') { f.note = ''; }
		applyFiltersAndRender();
		pop.style.display = 'none';
	});

	// Posicionar
	const rect = anchorTh.getBoundingClientRect();
	pop.style.left = `${Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - 340)}px`;
	pop.style.top = `${rect.bottom + window.scrollY + 6}px`;
	pop.style.display = 'block';
}

function populateSummarySelectors() {
	const monthSel = qs('summary-month');
	const yearSel = qs('summary-year');
	if (!monthSel || !yearSel) return;
	monthSel.innerHTML = '';
	const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
	for (let i = 1; i <= 12; i++) {
		const opt = document.createElement('option');
		opt.value = String(i);
		opt.textContent = monthNames[i - 1];
		monthSel.appendChild(opt);
	}
	yearSel.innerHTML = '';
	const now = new Date();
	const currentYear = now.getFullYear();
	for (let y = currentYear - 5; y <= currentYear + 3; y++) {
		const opt = document.createElement('option');
		opt.value = String(y);
		opt.textContent = String(y);
		yearSel.appendChild(opt);
	}
	monthSel.value = String(now.getMonth() + 1);
	yearSel.value = String(currentYear);
}

async function loadSummary() {
	const monthSel = qs('summary-month');
	const yearSel = qs('summary-year');
	if (!monthSel || !yearSel || !state.scope) return;
	const month = Number(monthSel.value);
	const year = Number(yearSel.value);
	const res = await fetch(`/api/summary?scope=${encodeURIComponent(state.scope)}&year=${year}&month=${month}`);
	if (!res.ok) return;
	const data = await res.json();
	qs('sum-gastos').textContent = formatAmountEs(data.totals.gastos || 0);
	qs('sum-ingresos').textContent = formatAmountEs(data.totals.ingresos || 0);
	const diffEl = qs('sum-diferencia');
	const diff = data.totals.diferencia || 0;
	diffEl.textContent = formatAmountEs(diff);
	diffEl.style.color = diff >= 0 ? 'var(--success)' : 'var(--danger)';

	// by label
	const tbodyLabel = qs('sum-by-label');
	tbodyLabel.innerHTML = '';
	for (const r of data.byLabel) {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${r.label}</td>
			<td>${formatAmountEs(r.gastos || 0)}</td>
			<td>${formatAmountEs(r.ingresos || 0)}</td>
			<td>${renderNetHtml(r.ingresos || 0, r.gastos || 0)}</td>
		`;
		tbodyLabel.appendChild(tr);
	}

	// by fixed
	const tbodyFixed = qs('sum-by-fixed');
	tbodyFixed.innerHTML = '';
	const rowsFixed = [
		{ name: 'Fijo', data: data.byFixed.fijo || { gastos: 0, ingresos: 0, total: 0 } },
		{ name: 'No fijo', data: data.byFixed.noFijo || { gastos: 0, ingresos: 0, total: 0 } }
	];
	for (const r of rowsFixed) {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${r.name}</td>
			<td>${formatAmountEs(r.data.gastos || 0)}</td>
			<td>${formatAmountEs(r.data.ingresos || 0)}</td>
			<td>${renderNetHtml(r.data.ingresos || 0, r.data.gastos || 0)}</td>
		`;
		tbodyFixed.appendChild(tr);
	}

	// by person (only casa)
	const personWrap = document.querySelector('#summary-card h3:nth-of-type(3)');
	const tbodyPerson = qs('sum-by-person');
	if (state.scope === 'casa') {
		if (personWrap) personWrap.style.display = '';
		if (tbodyPerson) {
			tbodyPerson.innerHTML = '';
			for (const r of data.byPerson) {
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${r.person}</td>
					<td>${formatAmountEs(r.gastos || 0)}</td>
					<td>${formatAmountEs(r.ingresos || 0)}</td>
					<td>${renderNetHtml(r.ingresos || 0, r.gastos || 0)}</td>
				`;
				tbodyPerson.appendChild(tr);
			}
		}
	} else {
		if (personWrap) personWrap.style.display = 'none';
		if (tbodyPerson) tbodyPerson.innerHTML = '';
	}
}
function updateScopeUI() {
	const current = qs('current-scope');
	current.textContent = state.scope === 'casa' ? 'Casa' : 'Registro';
	// Mostrar/ocultar campo "Registrado por"
	const recordedHeaderCells = document.querySelectorAll('.col-recorded-by');
	if (state.scope === 'casa') {
		recordedHeaderCells.forEach(el => (el.style.display = ''));
	} else {
		recordedHeaderCells.forEach(el => (el.style.display = 'none'));
	}
}

function toTitleCaseWords(name) {
	const normalized = String(name).replace(/[_]+/g, ' ').trim();
	return normalized.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function loadLabels() {
	const res = await fetch('/api/labels');
	if (!res.ok) throw new Error('No se pudo cargar etiquetas');
	const data = await res.json();
	const select = qs('label');
	select.innerHTML = '';
	for (const name of data.labels) {
		const opt = document.createElement('option');
		opt.value = name;
		opt.textContent = toTitleCaseWords(name);
		select.appendChild(opt);
	}
}

function updateDueDateVisibility() {
	const dueField = qs('due-date-field');
	const dueInput = qs('due_date');
	const labelValue = String(qs('label').value || '').toLowerCase();
	const isPagosPendientes = labelValue.replace(/[_]+/g, ' ').trim() === 'pagos pendientes';
	if (isPagosPendientes) {
		dueField.style.display = '';
	} else {
		dueField.style.display = 'none';
		dueInput.value = '';
	}
}

function formatAmountEs(amount) {
	if (!Number.isFinite(amount)) return '';
	return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function renderNetHtml(ingresos, gastos) {
	const net = (Number(ingresos) || 0) - (Number(gastos) || 0);
	const isNeg = net < 0;
	const color = isNeg ? 'var(--danger)' : 'var(--success)';
	const abs = Math.abs(net);
	const text = (isNeg ? '-' : '') + formatAmountEs(abs);
	return `<span style="color:${color}">${text}</span>`;
}

function parseAmount(input) {
	if (input == null) return NaN;
	let s = String(input).trim();
	if (!s) return NaN;
	// Permitir formatos con . de miles y , decimal
	s = s.replace(/\./g, ''); // remover separadores de miles si hubiera
	s = s.replace(',', '.');  // coma decimal a punto
	const n = Number(s);
	return Number.isFinite(n) ? n : NaN;
}

function sanitizeAmountInput(value) {
	if (value == null) return '';
	let s = String(value);
	// Convertir puntos a comas y eliminar caracteres no permitidos
	s = s.replace(/\./g, ',');
	s = s.replace(/[^\d,]/g, '');
	// Mantener solo una coma
	const parts = s.split(',');
	if (parts.length > 2) {
		s = parts[0] + ',' + parts.slice(1).join('');
	}
	return s;
}

function renderEntries(list) {
	const tbody = qs('entries-body');
	tbody.innerHTML = '';
	for (const e of list) {
		const tr = document.createElement('tr');
		const isFixed = e.is_fixed ? 'Sí' : 'No';
		tr.innerHTML = `
			<td>${e.kind === 'ingreso' ? 'Ingreso' : 'Gasto'}</td>
			<td>${e.date || ''}</td>
			<td>${e.label || ''}</td>
			<td>${e.currency === 'dolares' ? 'USD' : 'ARS'}</td>
			<td>${formatAmountEs(e.amount)}</td>
			<td>${isFixed}</td>
			<td>${e.frequency || ''}</td>
			<td>${e.due_date || ''}</td>
			<td class="col-recorded-by">${e.recorded_by || ''}</td>
			<td>${e.note ? e.note : ''}</td>
		`;
		if (state.scope !== 'casa') {
			const cell = tr.querySelector('.col-recorded-by');
			if (cell) cell.style.display = 'none';
		}
		tbody.appendChild(tr);
	}
}

function uniqueSorted(values) {
	return Array.from(new Set(values.filter(v => v != null && v !== ''))).sort((a, b) =>
		String(a).localeCompare(String(b), 'es', { sensitivity: 'base' })
	);
}

function buildFilterOptions() {
	// Etiquetas
	const labelSel = qs('filter-label');
	if (labelSel) {
		const labels = uniqueSorted(state.entries.map(e => e.label));
		const current = labelSel.value;
		labelSel.innerHTML = '<option value="">Todas</option>';
		for (const l of labels) {
			const opt = document.createElement('option');
			opt.value = l;
			opt.textContent = toTitleCaseWords(l);
			labelSel.appendChild(opt);
		}
		if (labels.includes(current)) labelSel.value = current;
	}
	// Registrado por
	const rbWrap = document.getElementById('filter-recorded-by-wrap');
	const rbSel = qs('filter-recorded-by');
	if (rbSel) {
		const people = uniqueSorted(state.entries.map(e => e.recorded_by));
		const current = rbSel.value;
		rbSel.innerHTML = '<option value="">Todos</option>';
		for (const p of people) {
			const opt = document.createElement('option');
			opt.value = p;
			opt.textContent = p;
			rbSel.appendChild(opt);
		}
		if (people.includes(current)) rbSel.value = current;
		// Mostrar/ocultar wrapper según scope
		if (rbWrap) rbWrap.style.display = state.scope === 'casa' ? '' : 'none';
	}
}

function updateFilterHeadersHighlight(actives) {
	const map = {
		kind: 'th-kind',
		labels: 'th-label',
		date: 'th-date',
		currency: 'th-currency',
		amount: 'th-amount',
		fixed: 'th-fixed',
		frequency: 'th-frequency',
		due: 'th-due',
		recordedBy: 'th-recorded-by',
		note: 'th-note'
	};
	for (const key of Object.keys(map)) {
		const th = document.getElementById(map[key]);
		if (!th) continue;
		if (actives[key]) th.classList.add('filtered'); else th.classList.remove('filtered');
	}
}

function applyFiltersAndRender() {
	const list = state.entries || [];
	const f = state.filters;

	const actives = {
		kind: f.kind.length > 0,
		labels: f.labels.length > 0,
		date: !!f.dateFrom || !!f.dateTo,
		currency: f.currency.length > 0,
		amount: Number.isFinite(f.amountMin) || Number.isFinite(f.amountMax),
		fixed: f.fixed.length > 0,
		frequency: f.frequency.length > 0,
		due: !!f.dueFrom || !!f.dueTo,
		recordedBy: state.scope === 'casa' ? f.recordedBy.length > 0 : false,
		note: (f.note || '').trim().length > 0
	};
	updateFilterHeadersHighlight(actives);

	const filtered = list.filter(e => {
		if (f.kind.length && !f.kind.includes(e.kind)) return false;
		if (f.labels.length && !f.labels.includes(e.label)) return false;
		if (f.currency.length && !f.currency.includes(e.currency)) return false;
		if (f.fixed.length) {
			const val = e.is_fixed ? '1' : '0';
			if (!f.fixed.includes(val)) return false;
		}
		if (f.frequency.length && !f.frequency.includes(e.frequency || 'ninguna')) return false;
		if (state.scope === 'casa' && f.recordedBy.length && !f.recordedBy.includes(e.recorded_by)) return false;
		// Date ranges (inclusive)
		if (f.dateFrom && (!e.date || e.date < f.dateFrom)) return false;
		if (f.dateTo && (!e.date || e.date > f.dateTo)) return false;
		if (f.dueFrom && (!e.due_date || e.due_date < f.dueFrom)) return false;
		if (f.dueTo && (!e.due_date || e.due_date > f.dueTo)) return false;
		// Amount ranges
		if (Number.isFinite(f.amountMin) && !(e.amount >= f.amountMin)) return false;
		if (Number.isFinite(f.amountMax) && !(e.amount <= f.amountMax)) return false;
		// Note contains
		if (f.note) {
			const note = (e.note || '').toLowerCase();
			if (!note.includes(f.note.trim().toLowerCase())) return false;
		}
		return true;
	});
	renderEntries(filtered);
}

async function loadEntries() {
	const res = await fetch(`/api/entries?scope=${encodeURIComponent(state.scope)}`);
	if (!res.ok) return;
	const { entries } = await res.json();
	state.entries = entries || [];
	applyFiltersAndRender();
}

function getFormData() {
	const isFixedChecked = qs('is_fixed').checked;
	return {
		scope: state.scope,
		kind: qs('kind').value,
		is_fixed: isFixedChecked,
		frequency: isFixedChecked ? qs('frequency').value : 'ninguna',
		label: qs('label').value,
		amount: parseAmount(qs('amount').value),
		currency: qs('currency').value,
		note: qs('note').value.trim(),
		date: qs('date').value,
		due_date: qs('due_date').value || null
	};
}

function resetForm() {
	qs('entry-form').reset();
	qs('is_fixed').checked = false;
	qs('frequency').disabled = true;
}

async function onSubmitEntry(e) {
	e.preventDefault();
	qs('form-error').textContent = '';
	qs('form-success').textContent = '';
	try {
		const data = getFormData();
		const res = await fetch('/api/entries', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error || 'Error guardando');
		}
		resetForm();
		qs('form-success').textContent = 'Guardado correctamente.';
		await loadEntries();
	} catch (err) {
		qs('form-error').textContent = err.message;
	}
}

function setupEvents() {
	function updateFrequencyVisibility() {
		const isChecked = qs('is_fixed').checked;
		const freq = qs('frequency');
		freq.disabled = !isChecked;
		freq.style.display = isChecked ? 'inline-block' : 'none';
	}
	qs('is_fixed').addEventListener('change', updateFrequencyVisibility);
	updateFrequencyVisibility();
	qs('label').addEventListener('change', updateDueDateVisibility);
	// Normalizar entrada de monto
	const amountInput = qs('amount');
	amountInput.addEventListener('input', () => {
		const cursorPos = amountInput.selectionStart;
		const before = amountInput.value;
		amountInput.value = sanitizeAmountInput(amountInput.value);
		// intentar mantener posición de cursor si no cambió longitud drásticamente
		const delta = amountInput.value.length - before.length;
		try { amountInput.setSelectionRange(Math.max(0, cursorPos + delta), Math.max(0, cursorPos + delta)); } catch {}
	});
	amountInput.addEventListener('blur', () => {
		const n = parseAmount(amountInput.value);
		if (Number.isFinite(n)) {
			amountInput.value = formatAmountEs(n);
		}
	});
	qs('entry-form').addEventListener('submit', onSubmitEntry);
	// Resumen events
	const mSel = qs('summary-month');
	const ySel = qs('summary-year');
	const refreshBtn = qs('summary-refresh');
	if (mSel && ySel) {
		mSel.addEventListener('change', loadSummary);
		ySel.addEventListener('change', loadSummary);
	}
	if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); loadSummary(); });
	// Reset (limpia todos los filtros)
	const resetBtn = qs('filters-reset');
	if (resetBtn) resetBtn.addEventListener('click', () => {
		state.filters = {
			kind: [],
			labels: [],
			dateFrom: '',
			dateTo: '',
			currency: [],
			amountMin: NaN,
			amountMax: NaN,
			fixed: [],
			frequency: [],
			dueFrom: '',
			dueTo: '',
			recordedBy: [],
			note: ''
		};
		applyFiltersAndRender();
	});
	// Click headers -> popover filtros
	const thMap = {
		'th-kind': 'kind',
		'th-label': 'labels',
		'th-date': 'date',
		'th-currency': 'currency',
		'th-amount': 'amount',
		'th-fixed': 'fixed',
		'th-frequency': 'frequency',
		'th-due': 'due',
		'th-recorded-by': 'recordedBy',
		'th-note': 'note'
	};
	for (const [id, key] of Object.entries(thMap)) {
		const th = document.getElementById(id);
		if (!th) continue;
		th.style.cursor = 'pointer';
		th.addEventListener('click', (e) => {
			openFilterPopover(key, th);
			e.stopPropagation();
		});
	}
	// Login
	const doLogin = async () => {
		const username = (qs('login-username')?.value || '').trim();
		const password = qs('login-password')?.value || '';
		qs('login-error').textContent = '';
		try {
			const res = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Error de inicio de sesión');
			}
			const me = await fetchMe();
			if (!me.authenticated) throw new Error('No autenticado');
			state.scope = me.user.scope;
			showOverlay(false);
			updateScopeUI();
			await loadLabels();
			await loadEntries();
			await loadSummary();
		} catch (e) {
			qs('login-error').textContent = e.message;
		}
	};
	qs('login-submit')?.addEventListener('click', doLogin);
	qs('login-password')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
	qs('login-username')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
	// Logout
	qs('logout')?.addEventListener('click', async () => {
		await fetch('/api/logout', { method: 'POST' });
		location.href = '/';
	});
}

async function boot() {
	setupEvents();
	updateDueDateVisibility();
	populateSummarySelectors();
	const me = await fetchMe();
	if (!me.authenticated) {
		location.href = '/';
		return;
	}
	state.scope = me.user.scope;
	updateScopeUI();
	await loadLabels();
	await loadEntries();
	await loadSummary();
	// Set today date default
	const today = new Date();
	const y = today.getFullYear();
	const m = String(today.getMonth() + 1).padStart(2, '0');
	const d = String(today.getDate()).padStart(2, '0');
	qs('date').value = `${y}-${m}-${d}`;
}

boot().catch(err => {
	// Fallback error display
	alert('Error iniciando la aplicación: ' + err.message);
});


