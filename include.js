// Function to load an external HTML file into an element
function loadHeader() {
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading header:', error));
}

// Load the header after the DOM is ready
document.addEventListener("DOMContentLoaded", loadHeader);

