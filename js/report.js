// INITIALIZE SUPABASE (v2 syntax)
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SPAM PREVENTION: cooldown per device (duration is admin-configurable) ---
let COOLDOWN_MS = 10 * 60 * 1000;
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
    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownInterval = setInterval(tick, 1000);
}

// ============================================================
// CAMERA FLOW STATE
// ============================================================
let mediaStream = null;
let capturedCanvas = null;   // holds the raw captured photo (before annotation)
let arrows = [];             // [{x1,y1,x2,y2}, ...] in annotate-canvas pixel space
let referencePoint = null;
let flashOn = false;
let pendingReportCode = null;
let studentProfile = null;
let currentSession = null;

function showCamStep(id) {
    ["camStepInstruction", "camStepReference", "camStepLive", "camStepReview", "camStepAnnotate"]
        .forEach(s => document.getElementById(s).style.display = (s === id ? "flex" : "none"));
}

function openCameraOverlay() {
    document.getElementById("cameraOverlay").style.display = "flex";
    showCamStep("camStepInstruction");
}

function closeCameraOverlay() {
    stopStream();
    document.getElementById("cameraOverlay").style.display = "none";
}

function stopStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
}

async function startCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });
        const video = document.getElementById("camVideo");
        video.srcObject = mediaStream;

        const track = mediaStream.getVideoTracks()[0];
        const flashBtn = document.getElementById("camFlashBtn");
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        flashBtn.style.display = caps.torch ? "flex" : "none";
        flashOn = false;
        flashBtn.classList.remove("active");
    } catch (err) {
        console.error("Camera error:", err);
        alert("Couldn't access your camera. Please allow camera permission and try again.");
        closeCameraOverlay();
    }
}

function capturePhoto() {
    const video = document.getElementById("camVideo");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedCanvas = canvas;

    document.getElementById("camReviewImg").src = canvas.toDataURL("image/jpeg", 0.9);
    stopStream();
    showCamStep("camStepReview");
}

function initAnnotateCanvas() {
    arrows = [];
    document.getElementById("camArrowCount").textContent = "0";

    const canvas = document.getElementById("camAnnotateCanvas");
    canvas.width = capturedCanvas.width;
    canvas.height = capturedCanvas.height;
    redrawAnnotateCanvas();

    showCamStep("camStepAnnotate");
}

function redrawAnnotateCanvas() {
    const canvas = document.getElementById("camAnnotateCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(capturedCanvas, 0, 0);

    arrows.forEach(a => drawArrow(ctx, a.x1, a.y1, a.x2, a.y2));
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const headLength = Math.max(18, canvasScaleFactor() * 22);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.strokeStyle = "#FF3B30";
    ctx.fillStyle = "#FF3B30";
    ctx.lineWidth = Math.max(4, canvasScaleFactor() * 5);
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 7), y2 - headLength * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 7), y2 - headLength * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
}

function canvasScaleFactor() {
    // scales stroke/arrowhead sizing relative to the photo's real resolution
    const canvas = document.getElementById("camAnnotateCanvas");
    return canvas.width / 1000;
}

function getCanvasPoint(e) {
    const canvas = document.getElementById("camAnnotateCanvas");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function setupAnnotateDrawing() {
    const canvas = document.getElementById("camAnnotateCanvas");
    let drawing = false;
    let start = null;

    const onDown = (e) => {
        if (arrows.length >= 2) return;
        drawing = true;
        start = getCanvasPoint(e);
    };
    const onMove = (e) => {
        if (!drawing) return;
        const point = getCanvasPoint(e);
        redrawAnnotateCanvas();
        drawArrow(canvas.getContext("2d"), start.x, start.y, point.x, point.y);
    };
    const onUp = (e) => {
        if (!drawing) return;
        drawing = false;
        const point = getCanvasPoint(e);
        const dist = Math.hypot(point.x - start.x, point.y - start.y);
        if (dist > 20) {
            arrows.push({ x1: start.x, y1: start.y, x2: point.x, y2: point.y });
            document.getElementById("camArrowCount").textContent = arrows.length;
        }
        redrawAnnotateCanvas();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);
}


document.addEventListener("DOMContentLoaded", async () => {

    // --- REQUIRE LOGIN: bounce to student-login.html if not authenticated ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "student-login.html";
        return;
    }
    currentSession = session;

    UMRFR.startInactivityGuard(supabaseClient, 12 * 60 * 60 * 1000, "student-login.html", "student");

    try {
        const { data: settingRow } = await supabaseClient
            .from("app_settings")
            .select("value")
            .eq("key", "report_cooldown_minutes")
            .maybeSingle();
        if (settingRow) COOLDOWN_MS = parseInt(settingRow.value, 10) * 60 * 1000;
    } catch (err) {
        console.error("Could not load cooldown setting, using default:", err);
    }

    try {
        const { data, error } = await supabaseClient
            .from("students")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
        if (error) throw error;
        studentProfile = data;
    } catch (err) {
        console.error("Error loading student profile:", err);
    }

    if (studentProfile) {
        document.getElementById("sessionBar").style.display = "flex";
        document.getElementById("sessionInfo").textContent =
            `Logged in as ${studentProfile.first_name} ${studentProfile.last_name} (${studentProfile.student_id})`;
    }

    document.getElementById("logoutBtn").addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "index.html";
    });

    if (getRemainingCooldown() > 0) startCooldown();

    const classroomName = document.getElementById("classroomName");
    const consentCheck = document.getElementById("consentCheck");
    const submitBtn = document.getElementById("submitBtn");
    const faultForm = document.getElementById("faultForm");

    classroomName.addEventListener("input", (event) => {
        event.target.value = event.target.value.toUpperCase();
    });

    consentCheck.addEventListener("change", (event) => {
        submitBtn.disabled = !event.target.checked;
    });

    // "Take Photo & Submit" — validates the text fields, then opens the camera flow
    submitBtn.addEventListener("click", () => {
        if (!faultForm.checkValidity()) {
            faultForm.reportValidity();
            return;
        }
        pendingReportCode = "UM-" + Math.random().toString(36).substring(2, 7).toUpperCase();
        referencePoint = null;
        openCameraOverlay();
    });

    // --- Camera flow wiring ---
    document.getElementById("camCancelBtn1").addEventListener("click", closeCameraOverlay);
    document.getElementById("camCancelBtn2").addEventListener("click", closeCameraOverlay);

    document.getElementById("camProceedBtn").addEventListener("click", () => {
        showCamStep("camStepReference");
    });

    document.querySelectorAll(".cam-ref-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            referencePoint = btn.dataset.ref;
            showCamStep("camStepLive");
            startCamera();
        });
    });

    document.getElementById("camCloseLiveBtn").addEventListener("click", closeCameraOverlay);

    document.getElementById("camFlashBtn").addEventListener("click", async () => {
        if (!mediaStream) return;
        const track = mediaStream.getVideoTracks()[0];
        flashOn = !flashOn;
        try {
            await track.applyConstraints({ advanced: [{ torch: flashOn }] });
            document.getElementById("camFlashBtn").classList.toggle("active", flashOn);
        } catch (err) {
            console.error("Flash not supported:", err);
        }
    });

    document.getElementById("camShutterBtn").addEventListener("click", capturePhoto);

    document.getElementById("camRetakeBtn").addEventListener("click", () => {
        showCamStep("camStepLive");
        startCamera();
    });

    document.getElementById("camUsePhotoBtn").addEventListener("click", () => {
        initAnnotateCanvas();
    });

    document.getElementById("camUndoBtn").addEventListener("click", () => {
        arrows.pop();
        document.getElementById("camArrowCount").textContent = arrows.length;
        redrawAnnotateCanvas();
    });

    setupAnnotateDrawing();

    document.getElementById("camSubmitBtn").addEventListener("click", submitFinalReport);

    document.getElementById("successOkBtn").addEventListener("click", () => {
        window.location.href = "student-dashboard.html";
    });
});

async function submitFinalReport() {
    const submitBtn = document.getElementById("camSubmitBtn");
    UMRFR.setButtonLoading(submitBtn, true, "Submitting...");

    try {
        const canvas = document.getElementById("camAnnotateCanvas");
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));

        const fileName = `${pendingReportCode}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabaseClient.storage
            .from("fault-images")
            .upload(fileName, blob);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
            .from("fault-images")
            .getPublicUrl(fileName);

        const newTicket = {
            report_code: pendingReportCode,
            reporter_type: "Student",
            reporter_name: studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : "Unknown",
            reporter_id_number: studentProfile ? studentProfile.student_id : "",
            student_user_id: currentSession.user.id,
            classroom_name: document.getElementById("classroomName").value,
            equipment_name: document.getElementById("equipmentName").value,
            location_in_room: document.getElementById("locationInRoom").value,
            issue_description: document.getElementById("problemDescription").value,
            image_url: publicUrlData.publicUrl,
            reference_point: referencePoint,
            status: "Reported"
        };

        const { error: insertError } = await supabaseClient
            .from("fault_tickets")
            .insert([newTicket]);
        if (insertError) throw insertError;

        localStorage.setItem(COOLDOWN_KEY, Date.now().toString());

        closeCameraOverlay();

        const firstName = studentProfile ? studentProfile.first_name : "there";
        document.getElementById("successTitle").textContent = `Thank you, ${firstName}!`;
        document.getElementById("successCode").textContent = `Report Code: ${pendingReportCode}`;
        document.getElementById("successModal").style.display = "flex";

        document.getElementById("faultForm").reset();
        document.getElementById("submitBtn").disabled = true;

    } catch (error) {
        console.error("Error submitting report:", error);
        alert("There was an error submitting your report. Please try again.");
    } finally {
        UMRFR.setButtonLoading(submitBtn, false);
    }
}
