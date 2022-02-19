import { fetchAuthenticated, getUser } from "./util/authHelper.js";
import { connectCommandTemplate } from "./util/resources.js";
import { copyConnectCmdBtnListener } from "./util/clipboardHelper.js";

const deleteContainerModalBodyDefaultText = "Do you really want to delete the Ghost Server '{name}'? This cannot be reverted!";

const cardHighlightClasses = "grey lighten-4";
const cardTemplate = `
<div class="card {highlightClasses}">
    <div class="card-content">
		<span class="card-title">{name} - Expires {relativeExpiry}</span>
		<div class="divider"></div>

		<h6>Connecting:</h6>
		<p>To connect, paste the text below into your game's console and hit enter:</p>

		<div id="code" class="row s12 valign-wrapper">
			<span id="connect-command-field">${connectCommandTemplate}</span>
			<button id="copy-connect-cmd" class="btn-flat waves-effect" style="padding: 0 8px 0 8px; margin-left: 15px"><i
					id="copy-connect-cmd-icon" class="material-icons" data-wsport="{ws_port}">content_copy</i></button>
		</div>
    </div>
    <div class="card-action">
        <a href="{webinterface_href}">Webinterface</a>
        <a href="#delete-container-modal" id="delete-btn" class="red-text right modal-trigger" data-containerid={id} data-name={data_name}>Delete</a>
    </div>
</div>
`;

let user;

$(document).ready(async () => {
	M.Modal.init($('.modal'));
	M.Dropdown.init($('.dropdown-trigger'));

	user = await getUser();
	if (user === undefined) {
		window.location.href = "./login.html";
		return
	}

	if (user.role === "admin") {
		$('#show-all-ghost-servers-switch-wrapper').show();
	}

	listContainers();
});

$('#logout-btn').click((event) => {
	event.preventDefault();
	document.cookie = "authToken=";
	window.location.href = "./login.html";
});

$('#delete-account').click(async () => {
	M.toast({ html: "Deleting account..." });

	await fetchAuthenticated("/auth/delete", "DELETE");
	document.cookie = "authToken=";
	window.location.href = "./login.html";
});

$('#refresh-containers-btn').click(listContainers);

async function listContainers() {
	$('#container-loading-spinner').show();
	$('#no-containers-text').hide();

	const showAll = $('#show-all-ghost-servers-switch').is(":checked") ? "1" : "0";
	const containers = await (await fetchAuthenticated(`/api/list?showAll=${showAll}`, "GET")).json();

	$('#cards').empty();
	let index = 1;
	containers.forEach(container => {
		const name = container.name ? container.name : `Ghost Server ${index}`;
		const html = getCardHtml(container.id, name, container.wsPort, container.relativeRemainingDuration, container.userId === user.id);

		$('#cards').append(html);
		index++;
	});

	if (containers.length === 0) $('#no-containers-text').show();
	else $('#no-containers-text').hide();

	$('#delete-btn').click(deleteBtnListener);
	$('#copy-connect-cmd').click(copyConnectCmdBtnListener);
	$('#container-loading-spinner').hide();
}

function getCardHtml(id, name, wsPort, relativeRemainingDuration, isOwn) {
	let result = cardTemplate
		.replace("{name}", name)
		.replace("{data_name}", `\"${name}\"`)
		// .replace("{port}", port)
		.replaceAll("{ws_port}", wsPort)
		.replace("{id}", id)
		.replace("{webinterface_href}", `./webinterface/index.html?id=${id}`)
		.replace("{relativeExpiry}", relativeRemainingDuration);

	if (!isOwn) result = result.replace("{highlightClasses}", cardHighlightClasses);
	return result;
}

let idToDelete = undefined;
let nameToDelete = undefined;

function deleteBtnListener() {
	idToDelete = $(this).data().containerid;
	nameToDelete = $(this).data().name;

	const nameEl = $('#delete-container-modal-body');
	nameEl.text(nameEl.text().replace("{name}", nameToDelete));
}

$('#delete-container-modal-confirm-btn').click(async () => {
	if (idToDelete === undefined || nameToDelete === undefined) return;

	M.toast({ html: `Deleting Ghost Server '${nameToDelete}'...` });
	const res = await fetchAuthenticated(`/api/delete?id=${idToDelete}`, "GET");
	if (res.status !== 200) {
		if (res.status === 404) M.toast({ html: "The container was not found!" });
		else M.toast({ html: `An error occured deleting Ghost Server ${nameToDelete}` });

		console.log(`Received status other than 200: ${res.status}`);
		return;
	}

	M.toast({ html: `Ghost Server '${nameToDelete}' deleted!` });
	idToDelete = undefined;
	nameToDelete = undefined;

	await listContainers();
	$('#delete-container-modal-body').text(deleteContainerModalBodyDefaultText);
});

$('#show-all-ghost-servers-switch').change(listContainers);
