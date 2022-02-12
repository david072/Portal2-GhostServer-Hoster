import { getUser } from "../authHelper.js";
import { validateContainerId, sendToContainer, getContainerId, containerId } from "./util.js";

let actionModalAcceptedAction = undefined;

const playerTableRowTemplate = `
<td>{playerName}</td>
<td>{playerId}</td>
<td>
	<div class="center">
		<button id="disconnect-player-btn" class="btn waves-effect waves-light" data-playerid={playerId} data-playername={playerName}>
			<i class="material-icons">logout</i>
		</button>
		<button id="ban-player-btn" class="btn waves-effect waves-light red" data-playerid={playerId} data-playername={playerName}>
			<i class="material-icons">cancel</i>
		</button>
	</div>
</td>
`;

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

	const valid = await validateContainerId();
	if (!valid) {
		$('#loading').hide();
		$('#failure').show();
		window.location.href = "../index.html";
		return;
	}

	M.Tabs.init($('.tabs'));
	M.Modal.init($('.modal'), { onCloseEnd: onModalCloseEnd });
	M.Dropdown.init($('.dropdown-trigger'));
	M.Sidenav.init($('.sidenav'));
	$('#no-players-connected-text').hide();

	await refreshConnectedPlayers();

	$('#loading').hide();
	$('#nav').show();
	$('#slide-out').show();
	$('#main-content').show();

	setTimeout(refreshConnectedPlayers, 2000);
});

// Ban player by id / name
$('#ban-player-by-id-button').click((event) => {
	event.preventDefault();
	openIdActionModal("Ban player by ID", "Ban", async () => {
		const playerId = $('#action-by-id-player-id').val();
		const result = await banPlayerById(playerId);
		if (!result) return;
		M.toast({ html: `Player with id ${playerId} banned!` });
	});
});

$('#ban-player-btn').click(banPlayerBtnListener);

function banPlayerBtnListener() {
	const playerId = $(this).data().playerid;
	const playerName = $(this).data().playername;
	openPlayerActionConfirmationModal("Ban player", `Do you really want to ban the player '${playerName}'?`, "Ban", async () => {
		const result = await banPlayerById(playerId);
		if (!result) return;
		M.toast({ html: `Player ${playerName} banned!` });
	});
}

async function banPlayerById(playerId) {
	const res = await sendToContainer(`/banPlayer?player_id=${playerId}`, "PUT");
	if (res.status !== 200) {
		M.toast({ html: `An error occured banning player with id ${playerId}` });
		return false;
	}

	refreshConnectedPlayers();
	return true;
}

$('#ban-player-by-name-button').click((event) => {
	event.preventDefault();
	openNameActionModal("Ban player by name", "Ban", async () => {
		const playerName = $('#action-by-name-player-name').val();
		const res = await sendToContainer(`/banPlayer?name=${playerName}`, "PUT");
		if (res.status !== 200) {
			M.toast({ html: `An error occured banning player ${playerName}` });
			return;
		}

		M.toast({ html: `Player ${playerName} banned!` });
		refreshConnectedPlayers();
	});
});

// Disconnect player by id / name
$('#disconnect-player-by-id-button').click((event) => {
	event.preventDefault();
	openIdActionModal("Disconnect player by ID", "Disconnect", async () => {
		const playerId = $('#action-by-id-player-id').val();
		const result = await disconnectPlayerById(playerId);
		if (!result) return;
		M.toast({ html: `Player with id ${playerId} disconnected!` });
	});
});

$('#disconnect-player-btn').click(disconnectPlayerBtnListener);

function disconnectPlayerBtnListener() {
	const playerId = $(this).data().playerid;
	const playerName = $(this).data().playername;
	openPlayerActionConfirmationModal("Disconnect player", `Do you really want to disconnect the player '${playerName}'?`, "Disconnect", async () => {
		const result = await disconnectPlayerById(playerId, playerName);
		if (!result) return;
		M.toast({ html: `Player ${playerName} disconnected!` })
	});
}

async function disconnectPlayerById(playerId) {
	const res = await sendToContainer(`/disconnectPlayer?player_id=${playerId}`, "PUT");
	if (res.status !== 200) {
		M.toast({ html: `An error occured disconnecting player with id ${playerId}` });
		return false;
	}

	refreshConnectedPlayers();
	return true;
}

$('#disconnect-player-by-name-button').click((event) => {
	event.preventDefault();
	openNameActionModal("Disconnect player by name", "Disconnect", async () => {
		const playerName = $('#action-by-name-player-name').val();
		const res = await sendToContainer(`/disconnectPlayer?name=${playerName}`, "PUT");
		if (res.status !== 200) {
			M.toast({ html: `An error occured disconnecting player ${playerName}` });
			return;
		}

		M.toast({ html: `Player ${playerName} disconnected!` });
		refreshConnectedPlayers();
	});
});

// Refresh connected players
$('#refresh-connected-players-button').click((event) => {
	event.preventDefault();
	refreshConnectedPlayers();
});

async function refreshConnectedPlayers() {
	$('#connected-players-table tbody').empty();

	const players = await sendToContainer("/listPlayers", "GET");
	const html = (await players.json()).map((player) => {
		return playerTableRowTemplate
			.replaceAll("{playerName}", player.name)
			.replaceAll("{playerId}", player.id);
	}).join('');

	if (html.length === 0) {
		$('#connected-players-table').hide();
		$('#no-players-connected-text').show();
		return;
	}

	$('#no-players-connected-text').hide();
	$('#connected-players-table').show().find('tbody').append(html);

	$('#ban-player-btn').click(banPlayerBtnListener);
	$('#disconnect-player-btn').click(disconnectPlayerBtnListener);
}

$('#slide-out-index-btn').click(() => {
	window.location.href = `./index.html?id=${containerId}`;
});




// ========== MODAL HELPERS ==========
$('#action-by-id-form').submit((event) => {
	event.preventDefault();
	if (actionModalAcceptedAction) actionModalAcceptedAction();
	M.Modal.getInstance($('#action-by-id')).close();
});

$('#action-by-name-form').submit((event) => {
	event.preventDefault();
	if (actionModalAcceptedAction) actionModalAcceptedAction();
	M.Modal.getInstance($('#action-by-name')).close();
});

$('#player-action-confirmation-modal-accept-button').click(() => {
	if (actionModalAcceptedAction) actionModalAcceptedAction();
	M.Modal.getInstance($('#player-action-confirmation-modal')).close();
});

function onModalCloseEnd(closedModal) {
	actionModalAcceptedAction = undefined;
	$(`#${closedModal.id}-form`).trigger("reset");
}

function openIdActionModal(title, acceptButtonText, onAccepted) {
	actionModalAcceptedAction = onAccepted;
	$('#action-by-id-title').text(title);
	$('#action-by-id-accept-button').text(acceptButtonText);
	M.Modal.getInstance($('#action-by-id')).open();
}

function openNameActionModal(title, acceptButtonText, onAccepted) {
	actionModalAcceptedAction = onAccepted;
	$('#action-by-name-title').text(title);
	$('#action-by-name-accept-button').text(acceptButtonText);
	M.Modal.getInstance($('#action-by-name')).open();
}

function openPlayerActionConfirmationModal(title, bodyText, acceptButtonText, onAccepted) {
	actionModalAcceptedAction = onAccepted;
	$('#player-action-confirmation-modal-title').text(title);
	$('#player-action-confirmation-modal-body').text(bodyText);
	$('#player-action-confirmation-modal-accept-button').text(acceptButtonText);
	M.Modal.getInstance($('#player-action-confirmation-modal')).open();
}
// ============================