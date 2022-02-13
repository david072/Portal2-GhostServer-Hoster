$(document).ready(() => {
	$('#confirm-password').on("input", updateConfirmPasswordValidity);
	$('#password').on("input", updateConfirmPasswordValidity);
});

function updateConfirmPasswordValidity() {
	const password = $('#password').val().trim();
	const confirmPassword = $('#confirm-password').val().trim();

	if ((confirmPassword.length === 0 && password.length === 0) || confirmPassword !== password) {
		$('#confirm-password').addClass("invalid");
		$('#confirm-password').removeClass("valid");
	}
	else {
		$('#confirm-password').removeClass("invalid");
		$('#confirm-password').addClass("valid");
	}
}

$('#register-form').submit((event) => {
	event.preventDefault();
	$('#submit-button').prop('disabled', true);

	const email = $('#email').val().trim();
	const password = $('#password').val().trim();
	const confirmPassword = $('#confirm-password').val().trim();

	if (confirmPassword !== password) {
		$('#submit-button').prop('disabled', false);
		return;
	}

	fetch("/auth/register", {
		method: "POST",
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: email, password: password })
	}).then((res) => {
		if (res.status !== 201) {
			if (res.status === 409) M.toast({ html: "An account with this email already exists!" });
			else M.toast({ html: "An error occured" });

			console.log(`Error creating account. Status other than 201 received: ${res.status}`);
			$('#submit-button').prop('disabled', false);
			return;
		}

		window.location.href = "./login.html";
	});
});
