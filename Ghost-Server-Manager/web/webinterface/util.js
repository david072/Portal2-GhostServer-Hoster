import { fetchAuthenticated } from "../util/authHelper.js";
import { apiBaseUrl } from "../util/resources.js";

export let containerId = undefined;

export async function validateContainerId() {
    getContainerId();
    if (containerId === undefined) return;

    const response = await fetchAuthenticated(`${apiBaseUrl}/api/validateContainerId?id=${containerId}`, "GET");

    if (response.status !== 200) return null;
    else return await response.json();
}

export function sendToContainer(url, method, redirect = true) {
    getContainerId();
    if (containerId === undefined) return;

    return fetchAuthenticated(`${apiBaseUrl}/container${url}${url.indexOf("?") === -1 ? "?" : "&"}id=${containerId}`, method, redirect);
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