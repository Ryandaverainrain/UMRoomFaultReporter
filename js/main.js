// ============================================================
// SHARED HELPERS — used across student-login.js, report.js, admin.js, auth.js
// ============================================================
window.UMRFR = {

    // --- Loading spinner on a button ---
    // Call setButtonLoading(btn, true) to show a spinner and disable it,
    // remembering the original label so it can be restored later.
    setButtonLoading(btn, isLoading, loadingText) {
        if (isLoading) {
            btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
            btn.innerHTML = `<span class="btn-spinner"></span>${loadingText || "Please wait..."}`;
            btn.disabled = true;
        } else {
            btn.textContent = btn.dataset.originalText || btn.textContent;
            btn.disabled = false;
        }
    },

    // --- 60-second resend cooldown on "Send Code" buttons ---
    // storageKey should be unique per email/action so cooldowns don't
    // cross-contaminate (e.g. "otp_cooldown_" + email).
    startSendCooldown(btn, storageKey, seconds = 60) {
        const key = "umrfr_cooldown_" + storageKey;
        localStorage.setItem(key, Date.now().toString());
        this._tickCooldown(btn, key, seconds);
    },

    checkExistingCooldown(btn, storageKey, seconds = 60) {
        const key = "umrfr_cooldown_" + storageKey;
        const last = parseInt(localStorage.getItem(key) || "0", 10);
        const remaining = seconds - Math.floor((Date.now() - last) / 1000);
        if (remaining > 0) {
            this._tickCooldown(btn, key, seconds);
            return true;
        }
        return false;
    },

    _tickCooldown(btn, key, seconds) {
        btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
        const interval = setInterval(() => {
            const last = parseInt(localStorage.getItem(key) || "0", 10);
            const remaining = seconds - Math.floor((Date.now() - last) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText;
            } else {
                btn.disabled = true;
                btn.textContent = `Resend in ${remaining}s`;
            }
        }, 500);
    },

    // --- Auto-logout after a period of inactivity ---
    // thresholdMs: how long without activity before logging out
    // redirectUrl: where to send them after logout
    startInactivityGuard(supabaseClient, thresholdMs, redirectUrl, storageKey) {
        const key = "umrfr_last_activity_" + storageKey;

        const markActive = () => localStorage.setItem(key, Date.now().toString());
        markActive();

        ["click", "keydown", "scroll", "touchstart"].forEach(evt => {
            document.addEventListener(evt, markActive, { passive: true });
        });

        setInterval(async () => {
            const last = parseInt(localStorage.getItem(key) || "0", 10);
            if (Date.now() - last > thresholdMs) {
                await supabaseClient.auth.signOut();
                window.location.href = redirectUrl;
            }
        }, 30000); // check every 30 seconds
    }
};

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