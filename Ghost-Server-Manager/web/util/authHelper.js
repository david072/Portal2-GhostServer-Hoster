export async function getUser() {
	const res = await fetchAuthenticated(`/auth/user`, "GET", false);
	if (res === undefined) return undefined;
	if (res.status !== 200) return undefined;

	const json = await res.json();
	return JSON.parse(json);
};

export async function fetchAuthenticated(url, method, redirect = true) {
	const res = await fetch(url, {
		method: method,
	});

	if (res.status === 401) {
		if (!redirect) return;
		window.location.href = `../login.html?target=${encodeURIComponent(window.location.href)}`;
		return undefined;
	}

	return res;
}
