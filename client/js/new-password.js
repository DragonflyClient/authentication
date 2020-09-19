console.clear()
const URLParams = new URLSearchParams(window.location.search)
const formNewPassword = document.getElementById('form-new-password')
const emailHash = URLParams.get('r')
const resetCode = URLParams.get('c')
const PROD_URL = "https://email-verification.playdragonfly.net"
const errorExpressions = ["Whoops!", "Damn.", "Noo", "Oh noo."]
const successExpressions = ["Great!", "Well done!", "Let's go!"]

const possibleErrors = [
    {
        id: 98434,
        message: "Reset link invalid"
    },
    {
        id: 38942,
        message: "An internal exception occurred. Please try again later"
    },
    {
        id: 28476,
        message: "Password reset link expired"
    },
    {
        id: 48312,
        message: "Email not in verification process"
    }
]

var passwordCheck = function () {
    if (document.getElementById('password').value ==
        document.getElementById('confirm-password').value) {
        document.getElementById('password-warning').innerHTML = '';
        document.getElementById('form-submit').removeAttribute('disabled')
    } else {
        document.getElementById('form-submit').setAttribute('disabled', 'true')
        document.getElementById('password-warning').innerHTML = 'Passwords do not match';
    }
}

fetch(`${PROD_URL}/reset-password/${emailHash}/${resetCode}`, {
    headers: {
        'Content-Type': 'application/json',
    },
    method: "GET",
})
    .then(res => {
        if (res.status === 200 || res.status === 201) {
            res.json().then(data => {
                console.log(data)
            })
        } else {
            res.json().then(data => {
                const found = possibleErrors.find(el => el.id === data.errorId)
                window.location.href = `https://playdragonfly.net/register/error.html?e=${found.id}`
            })
        }
    })
    .catch(err => {
        console.log(err, "err")
    })

formNewPassword.addEventListener('submit', (e) => {
    e.preventDefault()
    const formData = new FormData(formNewPassword)
    const password = formData.get('password')

    const resetInformation = {
        password,
    }

    fetch(`${PROD_URL}/new-password/${emailHash}/${resetCode}`, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify(resetInformation)
    })
        .then(res => {
            if (res.status === 200 || res.status === 201) {
                res.json().then(data => {
                    console.log(data)
                    if (data.error) {
                        Swal.fire({
                            title: errorExpressions[Math.floor(Math.random() * errorExpressions.length)],
                            html: data.error,
                            icon: 'error',
                            confirmButtonText: 'Okay'
                        })
                    } else {
                        window.location.href = `https://playdragonfly.net/register/success?s=23829`
                    }
                })
            } else {
                res.json().then(data => {

                    if (data.errorId) {
                        const found = possibleErrors.find(el => el.id === data.errorId)
                        window.location.href = `https://playdragonfly.net/register/error.html?e=${found.id}`
                    } else {
                        console.log("Error without error code")
                    }
                })
            }
        })
})