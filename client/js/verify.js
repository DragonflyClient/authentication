const urlParams = new URLSearchParams(window.location.search);
const emailInput = document.getElementById('input-email')
const cont = document.getElementById('cont')
const registerForm = document.getElementById('form-register')
const submitButton = document.getElementById('submit-registration')
const possibleErrors = [
    {
        id: 34718,
        message: "Account already created"
    },
    {
        id: 22836,
        message: "Email verification code expired"
    },
    {
        id: 48312,
        message: "Email not in verification process"
    }
]

const possibleSuccesses = [
    {
        id: 45834,
        message: "Account successfully created"
    },
    {
        id: 78432,
        message: "Email successfully updated"
    }
]

const emailHash = urlParams.get('r');
const validationCode = urlParams.get('c');
const change = urlParams.get('change')
const URL = "http://localhost:1337"
const PROD_URL = "https://email-verification.playdragonfly.net"
const errorExpressions = ["Whoops!", "Damn.", "Noo", "Oh noo."]
const successExpressions = ["Great!", "Well done!", "Let's go!"]

console.log(change)

let email;
window.onload = () => {
    if (!emailHash) window.location.href = "/"
}

fetch(`${PROD_URL}/verify/${emailHash}/${validationCode}`, {
    headers: {
        'Content-Type': 'application/json',
    },
    method: "GET",
})
    .then(res => {
        if (res.status === 200 || res.status === 201) {
            res.json().then(async data => {
                console.log(data)
                email = data.email
                if (!change) {
                    emailInput.placeholder = data.email
                } else {
                    const result = await fetch(`https://email-verification.playdragonfly.net/verify/change/${emailHash}/${validationCode}`, {
                        method: "POST"
                    })
                    const postData = await result.json()
                    console.log(postData)
                    if (postData.success) {
                        const found = possibleSuccesses.find(el => el.id === postData.successId)
                        window.location.href = `https://playdragonfly.net/register/success?s=${found.id}`
                    }
                }
            })
        } else {
            res.json().then(data => {
                const found = possibleErrors.find(el => el.id === data.errorId)
                window.location.href = `https://playdragonfly.net/register/error?e=${found.id}`
            })
        }
    })
    .catch(err => {
        console.log(err, "err")
    })


if (!change) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault()

        const formData = new FormData(registerForm);
        const user = formData.get('user');
        const password = formData.get('password')

        const registrationInfo = {
            email,
            user,
            password
        }

        submitButton.setAttribute('disabled', "true")
        fetch(`${PROD_URL}/verify/${emailHash}/${validationCode}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            method: "POST",
            credentials: "include",
            body: JSON.stringify(registrationInfo)
        })
            .then(res => {
                submitButton.removeAttribute('disabled')
                if (res.status === 200 || res.status === 201) {
                    res.json().then(data => {
                        if (data.error) {
                            Swal.fire({
                                title: errorExpressions[Math.floor(Math.random() * errorExpressions.length)],
                                html: data.error,
                                icon: 'error',
                                confirmButtonText: 'Okay'
                            })
                        } else {
                            if (data.successId) {
                                const found = possibleSuccesses.find(el => el.id === data.successId)
                                window.location.href = `https://playdragonfly.net/register/success?s=${found.id}`
                            } else {
                                console.log("Error without error code")
                            }
                        }
                        console.log(data, "success")
                    })
                } else {
                    res.json().then(data => {
                        Swal.fire({
                            title: errorExpressions[Math.floor(Math.random() * errorExpressions.length)],
                            html: data.message,
                            icon: 'error',
                            confirmButtonText: 'Okay'
                        })
                    })
                }
            })
            .catch(err => console.log(err))
    })
}