import { fetchAuthenticated, getUser } from "./util/authHelper.js";
import { connectCommandTemplate } from "./util/resources.js";
import { copyConnectCmdBtnListener } from "./util/clipboardHelper.js";

const deleteContainerModalBodyDefaultText = "Do you really want to delete the Ghost Server '{name}'? This cannot be reverted!";

const cardTemplate = `
<div class="card">
    <div class="card-content">
        <span class="card-title">{name}</span>
		<div class="divider"></div>

		<h6>Connecting:</h6>
		<p>To connect, paste the text below into your game's console and hit enter:</p>

		<div class="row s12 valign-wrapper"
			style="margin: 10px 0 0 0; padding: 10px; background-color: #F8F9FA; border-radius: 10px; border: 1px solid #E8EAED;">
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

$(document).ready(async () => {
	M.Modal.init($('.modal'), { onCloseEnd: onModalCloseEnd });
	const user = await getUser();
	if (user === undefined) {
		window.location.href = "./login.html";
		return
	}

	listContainers();
});

$('#logout-btn').click((event) => {
	event.preventDefault();
	document.cookie = "authToken=";

	window.location.href = "./login.html";
});

$('#refresh-containers-btn').click(() => {
	listContainers();
});

async function listContainers() {
	const containers = await (await fetchAuthenticated(`/api/list`, "GET")).json();

	$('#cards').empty();
	let index = 1;
	containers.forEach(container => {
		const name = container.name ? container.name : `Ghost Server ${index}`;
		const html = getCardHtml(container.id, name, container.wsPort);

		$('#cards').append(html);
		index++;
	});

	if (containers.length === 0) $('#no-containers-text').show();
	else $('#no-containers-text').hide();

	$('#delete-btn').click(deleteBtnListener);
	$('#copy-connect-cmd').click(copyConnectCmdBtnListener);
}

function getCardHtml(id, name, wsPort) {
	return cardTemplate
		.replace("{name}", name)
		.replace("{data_name}", `\"${name}\"`)
		// .replace("{port}", port)
		.replaceAll("{ws_port}", wsPort)
		.replace("{id}", id)
		.replace("{webinterface_href}", `./webinterface/index.html?id=${id}`);
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
	await listContainers();
	$('#delete-container-modal-body').text(deleteContainerModalBodyDefaultText);
});

function onModalCloseEnd(closedModal) {
	if (closedModal.id === "delete-container-modal") {
		idToDelete = undefined;
		nameToDelete = undefined;
	}
}
