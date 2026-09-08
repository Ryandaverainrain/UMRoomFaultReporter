// INITIALIZE SUPABASE
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStudent = null;   // the roster row returned by "Find" (null if none exists yet)
let pendingStudentId = "";   // the ID typed in step 1, kept around for self-registration

const STEPS = ["stepFind", "stepLogin", "stepForgotOtp", "stepActivate", "stepRegister"];

function showStep(id) {
    STEPS.forEach(s => document.getElementById(s).style.display = (s === id ? "block" : "none"));
    document.getElementById("startOverBtn").style.display = (id === "stepFind") ? "none" : "inline-block";
}

function showError(elId, message) {
    const el = document.getElementById(elId);
    el.textContent = message;
    el.classList.add("visible");
}

function clearError(elId) {
    const el = document.getElementById(elId);
    el.textContent = "";
    el.classList.remove("visible");
}

// --- Shared OTP helpers (this is the core mechanic — see database_accounts_setup.sql notes) ---
async function sendOtp(email, shouldCreateUser) {
    return await supabaseClient.auth.signInWithOtp({
        email,
        options: { shouldCreateUser }
    });
}

async function verifyOtpAndSetPassword(email, code, password) {
    const { data, error } = await supabaseClient.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) throw error;
    const { error: pwError } = await supabaseClient.auth.updateUser({ password });
    if (pwError) throw pwError;
    return data;
}

// --- Name ↔ email consistency check ---
// UMDC emails follow lastname.firstname@umindanao.edu.ph (spaces removed,
// lowercase). This confirms the typed name actually matches the typed
// school email, so someone can't register with a fake/mismatched name —
// they also can't change the domain itself, since that part is fixed.
function namesMatchEmail(lastName, firstName, email) {
    const cleanPart = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
    const expectedLocal = `${cleanPart(lastName)}.${cleanPart(firstName)}`;
    const actualLocal = email.split("@")[0].toLowerCase();
    return actualLocal === expectedLocal;
}

document.addEventListener("DOMContentLoaded", async () => {

    // If already logged in, skip straight to the report form
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = "report.html";
        return;
    }

    // Password show/hide toggles
    document.querySelectorAll(".password-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            const isHidden = input.type === "password";
            input.type = isHidden ? "text" : "password";
            btn.textContent = isHidden ? "HIDE" : "SHOW";
        });
    });

    // Numeric-only filters
    document.getElementById("findStudentId").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
    });
    ["forgotCode", "activateCode", "registerCode"].forEach(id => {
        document.getElementById(id).addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
        });
    });

    document.getElementById("startOverBtn").addEventListener("click", () => {
        currentStudent = null;
        pendingStudentId = "";
        document.getElementById("findStudentId").value = "";
        clearError("findError");
        showStep("stepFind");
    });

    // ---------------- STEP 1: FIND ----------------
    document.getElementById("findBtn").addEventListener("click", async () => {
        clearError("findError");
        const studentId = document.getElementById("findStudentId").value.trim();

        if (studentId.length === 0) {
            showError("findError", "Please enter your Student ID.");
            return;
        }

        pendingStudentId = studentId;

        try {
            const { data, error } = await supabaseClient
                .from("students")
                .select("*")
                .eq("student_id", studentId)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Branch C: no account at all
                currentStudent = null;
                clearError("registerError");
                document.getElementById("regLastName").value = "";
                document.getElementById("regFirstName").value = "";
                document.getElementById("regProgram").value = "";
                document.getElementById("regEmail").value = "";
                document.getElementById("registerOtpFields").style.display = "none";
                showStep("stepRegister");
                return;
            }

            currentStudent = data;
            const fullName = `${data.first_name} ${data.last_name}`;

            if (data.user_id) {
                // Branch A: exists and activated
                document.getElementById("loginName").textContent = fullName;
                document.getElementById("loginProgram").textContent = data.year_program;
                document.getElementById("loginEmail").textContent = data.umdc_email;
                document.getElementById("loginPassword").value = "";
                clearError("loginError");
                showStep("stepLogin");
            } else {
                // Branch B: exists but no password yet (pre-loaded roster)
                document.getElementById("activateName").textContent = fullName;
                document.getElementById("activateProgram").textContent = data.year_program;
                document.getElementById("activateEmail").textContent = data.umdc_email;
                document.getElementById("activateOtpFields").style.display = "none";
                clearError("activateError");
                showStep("stepActivate");
            }
        } catch (err) {
            console.error(err);
            showError("findError", "Something went wrong looking that up. Please try again.");
        }
    });

    // ---------------- BRANCH A: LOG IN ----------------
    document.getElementById("loginBtn").addEventListener("click", async () => {
        clearError("loginError");
        const password = document.getElementById("loginPassword").value;

        if (!password) {
            showError("loginError", "Please enter your password.");
            return;
        }

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: currentStudent.umdc_email,
                password
            });
            if (error) throw error;
            window.location.href = "report.html";
        } catch (err) {
            console.error(err);
            showError("loginError", "Incorrect password. Please try again.");
        }
    });

    document.getElementById("forgotPasswordLink").addEventListener("click", () => {
        document.getElementById("forgotEmailDisplay").textContent = currentStudent.umdc_email;
        document.getElementById("forgotOtpFields").style.display = "none";
        clearError("forgotError");
        showStep("stepForgotOtp");
    });

    // ---------------- BRANCH A2: FORGOT PASSWORD ----------------
    document.getElementById("forgotSendCodeBtn").addEventListener("click", async (e) => {
        clearError("forgotError");
        try {
            const { error } = await sendOtp(currentStudent.umdc_email, false);
            if (error) throw error;
            document.getElementById("forgotOtpFields").style.display = "block";
            e.target.textContent = "Code Sent — Resend";
        } catch (err) {
            console.error(err);
            showError("forgotError", "Couldn't send the code. Please try again in a moment.");
        }
    });

    document.getElementById("forgotResetBtn").addEventListener("click", async () => {
        clearError("forgotError");
        const code = document.getElementById("forgotCode").value.trim();
        const pw = document.getElementById("forgotNewPassword").value;
        const confirmPw = document.getElementById("forgotConfirmPassword").value;

        if (code.length !== 6) { showError("forgotError", "Enter the 6-digit code from your email."); return; }
        if (pw.length < 6) { showError("forgotError", "Password must be at least 6 characters."); return; }
        if (pw !== confirmPw) { showError("forgotError", "Passwords don't match."); return; }

        try {
            await verifyOtpAndSetPassword(currentStudent.umdc_email, code, pw);
            window.location.href = "report.html";
        } catch (err) {
            console.error(err);
            showError("forgotError", "That code is invalid or has expired. Try sending a new one.");
        }
    });

    // ---------------- BRANCH B: ACTIVATE EXISTING ROSTER ROW ----------------
    document.getElementById("activateSendCodeBtn").addEventListener("click", async (e) => {
        clearError("activateError");
        try {
            const { error } = await sendOtp(currentStudent.umdc_email, true);
            if (error) throw error;
            document.getElementById("activateOtpFields").style.display = "block";
            e.target.textContent = "Code Sent — Resend";
        } catch (err) {
            console.error(err);
            showError("activateError", "Couldn't send the code. Please try again in a moment.");
        }
    });

    document.getElementById("activateBtn").addEventListener("click", async () => {
        clearError("activateError");
        const code = document.getElementById("activateCode").value.trim();
        const pw = document.getElementById("activatePassword").value;
        const confirmPw = document.getElementById("activateConfirmPassword").value;

        if (code.length !== 6) { showError("activateError", "Enter the 6-digit code from your email."); return; }
        if (pw.length < 6) { showError("activateError", "Password must be at least 6 characters."); return; }
        if (pw !== confirmPw) { showError("activateError", "Passwords don't match."); return; }

        try {
            const authData = await verifyOtpAndSetPassword(currentStudent.umdc_email, code, pw);
            const userId = authData.user.id;

            const { error: claimError } = await supabaseClient
                .from("students")
                .update({ user_id: userId })
                .eq("id", currentStudent.id);

            if (claimError) throw claimError;
            window.location.href = "report.html";
        } catch (err) {
            console.error(err);
            showError("activateError", "That code is invalid or has expired. Try sending a new one.");
        }
    });

    // ---------------- BRANCH C: SELF-REGISTER ----------------
    document.getElementById("registerSendCodeBtn").addEventListener("click", async (e) => {
        clearError("registerError");
        const lastName = document.getElementById("regLastName").value.trim();
        const firstName = document.getElementById("regFirstName").value.trim();
        const program = document.getElementById("regProgram").value.trim();
        const email = document.getElementById("regEmail").value.trim().toLowerCase();

        if (!lastName || !firstName || !program || !email) {
            showError("registerError", "Please fill in all fields.");
            return;
        }
        if (!email.endsWith("@umindanao.edu.ph")) {
            showError("registerError", "Please use your @umindanao.edu.ph email — no Gmail, iCloud, or other providers.");
            return;
        }
        if (!namesMatchEmail(lastName, firstName, email)) {
            showError("registerError",
                `That email doesn't match your name. It should be lastname.firstname@umindanao.edu.ph — e.g. for ${firstName} ${lastName}, that'd be ${lastName.toLowerCase().replace(/[^a-z]/g, "")}.${firstName.toLowerCase().replace(/[^a-z]/g, "")}@umindanao.edu.ph`);
            return;
        }

        try {
            const { error } = await sendOtp(email, true);
            if (error) throw error;
            document.getElementById("registerOtpFields").style.display = "block";
            e.target.textContent = "Code Sent — Resend";
        } catch (err) {
            console.error(err);
            showError("registerError", "Couldn't send the code. Please try again in a moment.");
        }
    });

    document.getElementById("registerCreateBtn").addEventListener("click", async () => {
        clearError("registerOtpError");
        const code = document.getElementById("registerCode").value.trim();
        const pw = document.getElementById("registerPassword").value;
        const confirmPw = document.getElementById("registerConfirmPassword").value;
        const email = document.getElementById("regEmail").value.trim().toLowerCase();

        if (code.length !== 6) { showError("registerOtpError", "Enter the 6-digit code from your email."); return; }
        if (pw.length < 6) { showError("registerOtpError", "Password must be at least 6 characters."); return; }
        if (pw !== confirmPw) { showError("registerOtpError", "Passwords don't match."); return; }

        try {
            const authData = await verifyOtpAndSetPassword(email, code, pw);
            const userId = authData.user.id;

            const { error: insertError } = await supabaseClient
                .from("students")
                .insert([{
                    student_id: pendingStudentId,
                    last_name: document.getElementById("regLastName").value.trim(),
                    first_name: document.getElementById("regFirstName").value.trim(),
                    year_program: document.getElementById("regProgram").value.trim(),
                    umdc_email: email,
                    user_id: userId
                }]);

            if (insertError) throw insertError;
            window.location.href = "report.html";
        } catch (err) {
            console.error(err);
            showError("registerOtpError", "That code is invalid or has expired. Try sending a new one.");
        }
    });
});
