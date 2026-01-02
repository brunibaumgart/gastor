async function doLogin() {
	const userEl = document.getElementById('login-username');
	const passEl = document.getElementById('login-password');
	const errEl = document.getElementById('login-error');
	errEl.textContent = '';
	const username = (userEl?.value || '').trim();
	const password = passEl?.value || '';
	try {
		const res = await fetch('/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error || 'Credenciales inválidas');
		}
		location.href = '/';
	} catch (e) {
		errEl.textContent = e.message;
	}
}

document.getElementById('login-submit')?.addEventListener('click', doLogin);
document.getElementById('login-password')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-username')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });


