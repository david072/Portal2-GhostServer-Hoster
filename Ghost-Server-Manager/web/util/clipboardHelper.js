export async function writeToClipboard(text) {
	if (!navigator.clipboard)
		return fallbackWriteToClipboard(text);

	try {
		await navigator.clipboard.writeText(text);
		return true;
	}
	catch {
		return false;
	}
}

function fallbackWriteToClipboard(text) {
	const elem = $('<textarea></textarea>')
		.text(text)
		.css({ top: -10000, left: -10000, position: "fixed" });
	$('body').append(elem);
	elem.focus().select();

	try {
		const successful = document.execCommand("copy");
		elem.remove();
		return successful;
	}
	catch {
		elem.remove();
		return false;
	}
}

// Used by root index.js and /webinterface/index.js
export async function copyConnectCmdBtnListener() {
	$('#copy-connect-cmd-icon').text("content_copy");
	const text = $('#connect-command-field').text();
	const successful = await writeToClipboard(text);

	if (successful) {
		$('#copy-connect-cmd-icon').text("check").addClass("green-text");
		enqueueResetConnectCommandIcon();
		M.toast({ html: "Copied to clipboard" });
	}
	else {
		$('#copy-connect-cmd-icon').text("close").addClass("red-text");
		enqueueResetConnectCommandIcon();
		M.toast({ html: "Failed to copy to clipboard" });
	}
}

function enqueueResetConnectCommandIcon() {
	setTimeout(() => {
		$('#copy-connect-cmd-icon')
			.text("content_copy")
			.removeClass("green-text red-text");
	}, 1500);
}