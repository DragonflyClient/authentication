const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('e');
const errorField = document.getElementById('error-message')

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
    },
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

const found = possibleErrors.find(el => el.id == error)
errorField.innerHTML = found.message || "You should not be here. 🤨"