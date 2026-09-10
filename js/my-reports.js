const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSession = null;
let editingTicketId = null;

function badgeClassFor(status) {
    if (status === "Processing") return "badge-processing";
    if (status === "Completed") return "badge-completed";
    return "badge-reported";
}

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "student-login.html";
        return;
    }
    currentSession = session;

    UMRFR.startInactivityGuard(supabaseClient, 12 * 60 * 60 * 1000, "student-login.html", "student");

    loadMyReports();

    document.getElementById("editCancelBtn").addEventListener("click", closeEditModal);
    document.getElementById("editSaveBtn").addEventListener("click", saveEdit);
});

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    editingTicketId = null;
}

async function loadMyReports() {
    const grid = document.getElementById("myReportsGrid");
    try {
        const { data: tickets, error } = await supabaseClient
            .from("fault_tickets")
            .select("*")
            .eq("student_user_id", currentSession.user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!tickets || tickets.length === 0) {
            grid.innerHTML = `<p class="no-results">You haven't submitted any reports yet.</p>`;
            return;
        }

        grid.innerHTML = "";
        tickets.forEach(ticket => {
            const badgeClass = badgeClassFor(ticket.status);
            const submittedDate = new Date(ticket.created_at).toLocaleString();
            const editedNote = ticket.edited_at
                ? `<div class="ticket-edited-note">Edited: ${new Date(ticket.edited_at).toLocaleString()}</div>`
                : "";

            const card = document.createElement("div");
            card.className = "ticket-card";
            card.innerHTML = `
                <img src="${ticket.image_url}" alt="Fault Image" class="ticket-image" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
                <div class="ticket-content">
                    <div class="ticket-header-row">
                        <span class="report-code">${ticket.report_code}</span>
                        <span class="badge ${badgeClass}">${ticket.status}</span>
                    </div>
                    <div class="ticket-details">
                        <p><strong>Room:</strong> ${ticket.classroom_name}${ticket.location_in_room ? " — " + ticket.location_in_room : ""}</p>
                        <p><strong>Equipment:</strong> ${ticket.equipment_name}</p>
                    </div>
                    <div class="ticket-description">"${ticket.issue_description}"</div>
                    <div class="ticket-date">Submitted: ${submittedDate}</div>
                    ${editedNote}
                    <button type="button" class="ticket-edit-btn" data-id="${ticket.id}">Edit</button>
                </div>
            `;
            card.querySelector(".ticket-edit-btn").addEventListener("click", () => openEditModal(ticket));
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading your reports:", err);
        grid.innerHTML = `<p class="no-results" style="color:#B00020;">Failed to load your reports.</p>`;
    }
}

function openEditModal(ticket) {
    editingTicketId = ticket.id;
    document.getElementById("editClassroomName").value = ticket.classroom_name;
    document.getElementById("editEquipmentName").value = ticket.equipment_name;
    document.getElementById("editLocationInRoom").value = ticket.location_in_room || "";
    document.getElementById("editDescription").value = ticket.issue_description;
    document.getElementById("editError").textContent = "";
    document.getElementById("editModal").style.display = "flex";
}

async function saveEdit() {
    const saveBtn = document.getElementById("editSaveBtn");
    const classroomName = document.getElementById("editClassroomName").value.trim().toUpperCase();
    const equipmentName = document.getElementById("editEquipmentName").value.trim();
    const locationInRoom = document.getElementById("editLocationInRoom").value.trim();
    const description = document.getElementById("editDescription").value.trim();

    if (!classroomName || !equipmentName || !locationInRoom || !description) {
        document.getElementById("editError").textContent = "Please fill in every field.";
        return;
    }

    UMRFR.setButtonLoading(saveBtn, true, "Saving...");
    try {
        const { error } = await supabaseClient
            .from("fault_tickets")
            .update({
                classroom_name: classroomName,
                equipment_name: equipmentName,
                location_in_room: locationInRoom,
                issue_description: description,
                edited_at: new Date().toISOString()
            })
            .eq("id", editingTicketId)
            .eq("student_user_id", currentSession.user.id);

        if (error) throw error;

        closeEditModal();
        loadMyReports();
    } catch (err) {
        console.error("Error saving edit:", err);
        document.getElementById("editError").textContent = "Couldn't save your changes. Please try again.";
    } finally {
        UMRFR.setButtonLoading(saveBtn, false);
    }
}
