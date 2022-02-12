export const apiBaseUrl = "http://p2-ghost-server.ddnss.de:8080";

export async function getUser() {
	const res = await fetchAuthenticated(`${apiBaseUrl}/auth/user`, "GET", false);
	if (res === undefined) return undefined;
	if (res.status !== 200) return undefined;

	const json = await res.json();
	return JSON.parse(json);
};

export async function fetchAuthenticated(url, method, redirect = true) {
	const authToken = getAuthToken();
	if (!authToken) {
		if (!redirect) return;
		window.location.href = `../login.html?target=${encodeURIComponent(window.location.href)}`;
		return undefined;
	}

	const res = await fetch(url, {
		method: method,
		headers: {
			"Authorization": `Basic ${authToken}`
		}
	});

	return res;
}

function getAuthToken() {
	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		cookie = cookie.trim();
		if (cookie.trim().indexOf("authToken=") !== 0) return;

		return cookie.substring("authToken=".length);
	}

	return undefined;
}
