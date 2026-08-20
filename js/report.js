// INITIALIZE SUPABASE (v2 syntax)
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SPAM PREVENTION: 10-minute cooldown per device ---
const COOLDOWN_MS = 10 * 60 * 1000;
const COOLDOWN_KEY = "umrfr_last_report_time";
let cooldownInterval = null;

function getRemainingCooldown() {
    const last = parseInt(localStorage.getItem(COOLDOWN_KEY) || "0", 10);
    const remaining = COOLDOWN_MS - (Date.now() - last);
    return remaining > 0 ? remaining : 0;
}

function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function startCooldown() {
    const notice = document.getElementById("cooldownNotice");
    const form = document.getElementById("faultForm");
    const timerEl = document.getElementById("cooldownTimer");

    notice.style.display = "block";
    form.style.display = "none";

    const tick = () => {
        const remaining = getRemainingCooldown();
        if (remaining <= 0) {
            clearInterval(cooldownInterval);
            notice.style.display = "none";
            form.style.display = "block";
            return;
        }
        timerEl.textContent = formatTime(remaining);
    };

    tick();
    cooldownInterval = setInterval(tick, 1000);
}


document.addEventListener("DOMContentLoaded", () => {

    // Check if this device is still in a cooldown period from a recent submission
    if (getRemainingCooldown() > 0) {
        startCooldown();
    }

    const reporterType = document.getElementById("reporterType");
    const idLabel = document.getElementById("idLabel");
    const reporterId = document.getElementById("reporterId");
    const classroomName = document.getElementById("classroomName");
    const consentCheck = document.getElementById("consentCheck");
    const submitBtn = document.getElementById("submitBtn");
    const faultForm = document.getElementById("faultForm");

    // 1. Dynamically change the ID Label based on Student/Professor selection
    reporterType.addEventListener("change", (event) => {
        idLabel.textContent = event.target.value === "Professor" ? "Employee ID" : "Student ID";
    });

    // 2. Student/Employee ID: numbers only
    reporterId.addEventListener("input", (event) => {
        event.target.value = event.target.value.replace(/[^0-9]/g, "");
    });

    // 3. Classroom name: auto-uppercase for consistency (e.g. "b15" -> "B15")
    classroomName.addEventListener("input", (event) => {
        event.target.value = event.target.value.toUpperCase();
    });

    // 4. Enable the Submit button ONLY if the consent checkbox is ticked
    consentCheck.addEventListener("change", (event) => {
        submitBtn.disabled = !event.target.checked;
    });

    // 5. Handle Form Submission to Supabase
    faultForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = "Submitting...";
        submitBtn.disabled = true;

        try {
            const reportCode = "UM-" + Math.random().toString(36).substring(2, 7).toUpperCase();

            const fileInput = document.getElementById("faultImage");
            const file = fileInput.files[0];
            let imageUrl = null;

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${reportCode}-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('fault-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseClient.storage
                    .from('fault-images')
                    .getPublicUrl(fileName);

                imageUrl = publicUrlData.publicUrl;
            }

            const newTicket = {
                report_code: reportCode,
                reporter_type: reporterType.value,
                reporter_name: document.getElementById("reporterName").value,
                reporter_id_number: reporterId.value,
                classroom_name: classroomName.value,
                equipment_name: document.getElementById("equipmentName").value,
                location_in_room: document.getElementById("locationInRoom").value,
                issue_description: document.getElementById("problemDescription").value,
                image_url: imageUrl,
                status: "Reported"
            };

            const { error: insertError } = await supabaseClient
                .from('fault_tickets')
                .insert([newTicket]);

            if (insertError) throw insertError;

            // Start the 10-minute cooldown for this device
            localStorage.setItem(COOLDOWN_KEY, Date.now().toString());

            // Show success modal instead of a plain alert
            document.getElementById("successCode").textContent = `Report Code: ${reportCode}`;
            document.getElementById("successModal").style.display = "flex";

            faultForm.reset();
            submitBtn.disabled = true;

        } catch (error) {
            console.error("Error submitting report:", error);
            alert("There was an error submitting your report. Please check your database connection and try again.");
        } finally {
            submitBtn.textContent = originalBtnText;
        }
    });
});
