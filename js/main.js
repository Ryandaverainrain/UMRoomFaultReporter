// Wait for the HTML document to fully load
document.addEventListener("DOMContentLoaded", () => {
    
    const menuToggle = document.getElementById("menuToggle");
    const dropdownMenu = document.getElementById("dropdownMenu");

    // Toggle the menu when the hamburger icon is clicked
    menuToggle.addEventListener("click", () => {
        dropdownMenu.classList.toggle("active");
    });

    // Close the menu if the user clicks anywhere outside of it
    document.addEventListener("click", (event) => {
        if (!menuToggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove("active");
        }
    });
});

// FIRST TIME VISITOR POP-UP LOGIC
document.addEventListener("DOMContentLoaded", () => {
    const disclaimerModal = document.getElementById("disclaimerModal");
    const closeModalBtn = document.getElementById("closeModalBtn");

    // Only run this if the modal actually exists on the page
    if (disclaimerModal && closeModalBtn) {
        
        // Check the browser's local storage to see if they've visited before
        const hasAcknowledged = localStorage.getItem("umdcDisclaimerAcknowledged");

        // If they haven't acknowledged it yet, show the modal
        if (!hasAcknowledged) {
            disclaimerModal.style.display = "flex";
            document.body.style.overflow = "hidden"; // Prevent scrolling while modal is open
        }

        // When they click the "I Understand" button
        closeModalBtn.addEventListener("click", () => {
            // Hide the modal
            disclaimerModal.style.display = "none";
            document.body.style.overflow = "auto"; // Restore scrolling
            
            // Save a note in local storage so it never shows again for this user
            localStorage.setItem("umdcDisclaimerAcknowledged", "true");
        });
    }
});