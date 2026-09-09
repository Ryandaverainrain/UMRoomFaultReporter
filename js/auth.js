// INITIALIZE SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

// Use window.supabase to create the client without redeclaring conflicting block-scoped variables
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Checks the ADMINS table (not just "are they logged in") — this is the
// single source of truth for admin access, checked here BEFORE ever
// redirecting to admin.html, so a non-admin never even reaches that page.
async function isUserAnAdmin(userId) {
    const { data, error } = await supabaseClient
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) {
        console.error("Admin check failed:", error);
        return false;
    }
    return !!data;
}

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

            UMRFR.setButtonLoading(loginBtn, true, "Authenticating...");
            errorMessage.style.display = "none";

            try {
                // Attempt to sign in with Supabase Auth
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Verify admin status BEFORE going anywhere near admin.html
                const admin = await isUserAnAdmin(data.user.id);
                if (!admin) {
                    await supabaseClient.auth.signOut();
                    errorMessage.textContent = "This account is not authorized for admin access.";
                    errorMessage.style.display = "block";
                    UMRFR.setButtonLoading(loginBtn, false);
                    return;
                }

                // Confirmed admin — safe to go to the dashboard
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

// Function to check if a user is already logged in (and is actually an admin)
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && window.location.pathname.includes('login.html')) {
        const admin = await isUserAnAdmin(session.user.id);
        if (admin) {
            window.location.href = "admin.html";
        } else {
            // Logged in, but as a non-admin (e.g. a student session on this
            // device) — sign them out so the login form is usable again
            await supabaseClient.auth.signOut();
        }
    }
}
