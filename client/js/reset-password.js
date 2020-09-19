console.clear()
const URL = "http://localhost:1337"
const PROD_URL = "https://email-verification.playdragonfly.net"
const errorExpressions = ["Whoops!", "Damn.", "Noo", "Oh noo."]
const successExpressions = ["Great!", "Well done!", "Let's go!"]

const pwResetForm = document.getElementById('form-password-reset')

pwResetForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const formData = new FormData(pwResetForm)
    const email = formData.get("email")

    console.log(email)

    fetch(`${PROD_URL}/reset-password/${email}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        method: "POST"
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
                        Swal.fire({
                            title: successExpressions[Math.floor(Math.random() * successExpressions.length)],
                            html: "A link to reset your password has been sent to your email address",
                            icon: 'success',
                            confirmButtonText: 'Okay'
                        })
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