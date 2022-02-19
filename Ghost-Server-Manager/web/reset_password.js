let email;
let token;

$(document).ready(async () => {
	email = new URLSearchParams(window.location.search).get("email");
	token = new URLSearchParams(window.location.search).get("token");

	if (email === null || token === null) {
		$('#main-content').hide();
		$('#failure').show();
		window.location.href = "./index.html";
		return;
	}

	const response = await fetch("/auth/validatePasswordResetCredentials", {
		method: "POST",
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token: token, email: email })
	});

	if (response.status !== 200) {
		$('#loading').hide();
		$('#failure').show();
		if (response.status === 401)
			$('#failure-text').text("Page load failed! Could not validate this token or email.");
		else
			$('#failure-text').text("Page load failed! An error occured.");
		return;
	}

	$('#loading').hide();
	$('#main-content').show();
});

$('#reset-password-form').submit(async (event) => {
	event.preventDefault();

	$('#submit-button').prop("disabled", true);

	const newPassword = $('#password').val().trim();

	const response = await fetch("/auth/resetPassword", {
		method: "POST",
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: email, token: token, newPassword: newPassword })
	});

	if (response.status !== 200) {
		M.toast({ html: "Password reset failed!" });
		$('#submit-button').prop("disabled", false);
		return;
	}

	$('#main-content').hide();
	$('#success').show();

	$('#submit-button').prop("disabled", false);
	window.location.href = "./login.html";
});
