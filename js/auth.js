// INITIALIZE SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

// Use window.supabase to create the client without redeclaring conflicting block-scoped variables
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const errorMessage = document.getElementById("errorMessage");

    // Check if user is already logged in
    checkSession();

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            const email = document.getElementById("adminEmail").value;
            const password = document.getElementById("adminPassword").value;

            loginBtn.textContent = "Log In";
            UMRFR.setButtonLoading(loginBtn, true, "Authenticating...");
            errorMessage.style.display = "none";

            try {
                // Attempt to sign in with Supabase Auth
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Success! Redirect to the admin dashboard
                window.location.href = "admin.html";

            } catch (error) {
                console.error("Login error:", error.message);
                errorMessage.textContent = "Invalid email or password.";
                errorMessage.style.display = "block";
                UMRFR.setButtonLoading(loginBtn, false);
            }
        });
    }
});

// Function to check if a user is already logged in
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // If they are on the login page but already logged in, send them straight to admin
    if (session && window.location.pathname.includes('login.html')) {
        window.location.href = "admin.html";
    }
}