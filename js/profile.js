const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "student-login.html";
        return;
    }

    UMRFR.startInactivityGuard(supabaseClient, 12 * 60 * 60 * 1000, "student-login.html", "student");

    try {
        const { data, error } = await supabaseClient
            .from("students")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
        if (error) throw error;

        if (data) {
            document.getElementById("profileName").textContent = `${data.first_name} ${data.last_name}`;
            document.getElementById("profileRole").textContent = `${data.year_program} · Student ID ${data.student_id}`;
            document.getElementById("profileAvatar").textContent = data.first_name.charAt(0).toUpperCase();
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
});
