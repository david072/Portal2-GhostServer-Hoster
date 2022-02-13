import { fetchAuthenticated } from "../util/authHelper.js";

export let containerId = undefined;

export async function validateContainerId() {
	getContainerId();
	if (containerId === undefined) return;

	const response = await fetchAuthenticated(`/api/validateContainerId?id=${containerId}`, "GET");

	if (response.status !== 200) return null;
	else return await response.json();
}

export function sendToContainer(url, method, redirect = true) {
	getContainerId();
	if (containerId === undefined) return;

	return fetchAuthenticated(`/container${url}${url.indexOf("?") === -1 ? "?" : "&"}id=${containerId}`, method, redirect);
}

export function getContainerId() {
	if (containerId !== undefined) return;
	const param = new URLSearchParams(window.location.search).get("id");
	if (param === null) {
		containerId = undefined;
		return undefined;
	}

	containerId = +param;
	return containerId;
}

export async function authenticate() {
	const user = await getUser();
	if (!user) {
		window.location.href = `../login.html?target=${encodeURIComponent(window.location.href)}`;
		return undefined;
	}

	if (getContainerId() === undefined) {
		$('#loading').hide();
		$('#failure').show();
		$('#failure-text').text("No container id found. (Query parameter 'id' missing)");
		window.location.href = "../index.html";
		return undefined;
	}

	const container = await validateContainerId();
	if (container === null) {
		$('#loading').hide();
		$('#failure').show();
		window.location.href = "../index.html";
		return undefined;
	}

	return container;
}
