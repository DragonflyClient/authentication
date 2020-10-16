console.clear()
const urlParams = new URLSearchParams(window.location.search);
const success = urlParams.get('s');
const errorField = document.getElementById('error-message')

const possibleSuccesses = [
    {
        id: 45834,
        message: "Account successfully created"
    },
    {
        id: 23829,
        message: "Password successfully reset"
    },
    {
        id: 78432,
        message: "Email successfully updated"
    }
]

console.log(success)
const found = possibleSuccesses.find(el => el.id == success)
errorField.innerHTML = found.message || "You should not be here. 🤨"