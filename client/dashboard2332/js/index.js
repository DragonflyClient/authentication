const registerForm = document.getElementById('form-register')
const submitButton = document.getElementById('submit-btn')
const URL = "http://localhost:1337"
const PROD_URL = "https://email-verification.playdragonfly.net"

// Request verification
registerForm.addEventListener('submit', async function (e) {
    console.log('CLICKeD')
    e.preventDefault()

    const formData = new FormData(registerForm);
    const email = formData.get('email');

    const registrationInfo = {
        email
    }
    console.log(registrationInfo.email)
    submitButton.setAttribute('disabled', "true")
    fetch(`${PROD_URL}/register`,
        {
            headers: {
                'Content-Type': 'application/json',
            },
            method: "POST",
            body: JSON.stringify(registrationInfo)
        })
        .then(res => {
            submitButton.removeAttribute('disabled')
            if (res.status === 200 || res.status === 201) {
                res.json().then(data => {
                    console.log(data)
                    Swal.fire({
                        title: 'Success!',
                        html: data.message,
                        icon: 'success',
                        confirmButtonText: 'Cool'
                    })
                })
            } else {
                res.json().then(data => {
                    console.log(data)
                    Swal.fire({
                        title: 'Whoops!',
                        html: data.message,
                        icon: 'error',
                        confirmButtonText: 'Okay'
                    })
                })
            }
        })
        .catch(err => console.log(err))

})
