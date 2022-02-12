import { getUser, fetchAuthenticated } from "../util/authHelper.js";
import { connectCommandTemplate } from "../util/resources.js";
import { validateContainerId, sendToContainer, containerId, getContainerId } from "./util.js";

$(document).ready(async () => {
	const user = await getUser();
	if (!user) {
		window.location.href = `../login.html?target=${encodeURIComponent(window.location.href)}`;
		return;
	}

	if (getContainerId() === undefined) {
		$('#loading').hide();
		$('#failure').show();
		$('#failure-text').text("No container id found. (Query parameter 'id' missing)");
		window.location.href = "../index.html";
		return;
	}

	const container = await validateContainerId();
	if (container === null) {
		$('#loading').hide();
		$('#failure').show();
		window.location.href = "../index.html";
		return;
	}

	$('#connect-command-field').text(connectCommandTemplate.replace("{ws_port}", container.wsPort));

	M.Modal.init($('.modal'));
	await fetchSettings();

	$('#loading').hide();
	$('#nav').show();
	$('#slide-out').show();
	$('#main-content').show();
});

async function fetchSettings() {
	const response = await sendToContainer("/settings", "GET");
	const json = await response.json();
	$('#countdown-duration').val(json.duration);
	$('#pre-countdown-cmd').val(json.preCommands);
	$('#post-countdown-cmd').val(json.postCommands);
	M.updateTextFields();
}

$('#save-settings-btn').click(async () => {
	$('#save-settings-btn').addClass("disabled");
	$('#save-settings-btn').text("Saving...");

	const duration = $('#countdown-duration').val().trim();
	const preCommands = $('#pre-countdown-cmd').val().trim();
	const postCommands = $('#post-countdown-cmd').val().trim();

	await sendToContainer(`/settings?preCommands=${preCommands}&postCommands=${postCommands}&duration=${duration}`, "PUT");
	M.toast({ html: "Settings successfully saved!" });

	$('#save-settings-btn').removeClass("disabled");
	$('#save-settings-btn').text("Save");
});

$('#start-countdown-button').click(async (event) => {
	await sendToContainer(`/startCountdown`, "PUT");
	M.toast({ html: "Countdown started!" });
});

$('#stop-server-modal-accept-button').click(async (event) => {
	event.preventDefault();
	M.Modal.getInstance($('#stop-server-modal')).close();

	M.toast({ html: "Stopping this Ghost Server..." });

	if (containerId === undefined) getContainerId();
	const res = await fetchAuthenticated(`/api/delete?id=${containerId}`, "GET");

	if (res.status !== 200) {
		if (res.status === 404) M.toast({ html: "The container was not found!" });
		else M.toast({ html: `An error occured deleting Ghost Server ${nameToDelete}` });

		console.log(`Received status other than 200: ${res.status}`);
		return;
	}

	M.toast({ html: "Ghost Server deleted!" });

	$('#nav').hide();
	$('#slide-out').hide();
	$('#main-content').hide();
	$('#failure-text').text("The Ghost Server was deleted!");
	$('#failure').show();
	window.location.href = "../index.html";
});

$('#slide-out-player-management-btn').click(() => {
	window.location.href = `./player_management.html?id=${containerId}`;
});
