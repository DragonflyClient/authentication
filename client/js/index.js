const registerForm = document.getElementById('form-register');
const submitButton = document.getElementById('submit-btn');
const URL = 'http://localhost:1337';
const PROD_URL = 'https://email-verification.playdragonfly.net';

const Toast = Swal.mixin({
	toast: true,
	position: 'top-end',
	showConfirmButton: false,
	timer: 3000,
	timerProgressBar: true,
	didOpen: toast => {
		toast.addEventListener('mouseenter', Swal.stopTimer);
		toast.addEventListener('mouseleave', Swal.resumeTimer);
	}
});

const params = new URLSearchParams(window.location.search);

window.addEventListener('load', () => {
	const partnerStatus = params.get('partner_status');

	if (partnerStatus === 'success') {
		Toast.fire({
			icon: 'success',
			title: `Successfully activated ${params.get('utm_campaign')}'s partner code!`
		});
		window.history.pushState({}, document.title, './');
	} else if (partnerStatus === 'failure') {
		const partnerError = params.get('partner_error');
		if (partnerError === 'not_found') {
			const partnerName = params.get('partner_name');
			console.log(partnerName, 'OB');
			if (partnerName === 'undefined') {
				Toast.fire({
					icon: 'error',
					title: 'Please specify a partner code.'
				});
			} else {
				Toast.fire({
					icon: 'error',
					title: `Partner "${params.get('partner_name')}" couldn't be found!`
				});
			}
			window.history.pushState({}, document.title, './');
		}
	}
});

// Request verification
registerForm.addEventListener('submit', async function (e) {
	e.preventDefault();

	const formData = new FormData(registerForm);
	const email = formData.get('email');

	const registrationInfo = {
		email
	};

	console.log(registrationInfo);
	submitButton.setAttribute('disabled', 'true');
	fetch(`${PROD_URL}/register`, {
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify(registrationInfo)
	})
		.then(res => {
			submitButton.removeAttribute('disabled');
			if (res.status === 200 || res.status === 201) {
				res.json().then(data => {
					console.log(data);
					Swal.fire({
						title: 'Success!',
						html: data.message,
						icon: 'success',
						confirmButtonText: 'Cool'
					});
				});
			} else {
				res.json().then(data => {
					console.log(data);
					Swal.fire({
						title: 'Whoops!',
						html: data.message,
						icon: 'error',
						confirmButtonText: 'Okay'
					});
				});
			}
		})
		.catch(err => console.log(err));
});
