$('#login-form').submit((event) => {
    event.preventDefault();
    $('#submit-button').prop('disabled', true);

    const email = $('#email').val().trim();
    const password = $('#password').val().trim();

    fetch("/auth/generateAuthToken", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    }).then(async (res) => {
        if (res.status !== 200) {
            if (res.status === 404) M.toast({ html: "This account does not exist!" });
            else M.toast({ html: "An error occured" });

            console.log(`Error creating account. Status other than 201 received: ${res.status}`);
            $('#submit-button').prop('disabled', false);
            return;
        }

        const redirectTarget = new URLSearchParams(window.location.search).get("target");
        if (redirectTarget === null) {
            window.location.href = "./index.html";
        }
        else {
            const url = decodeURIComponent(redirectTarget);
            window.location.href = url;
        }
    });
});
