// INITIALIZE SUPABASE (v2 syntax)
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUSES = ["Reported", "Processing", "Completed"];
const SECTIONS = [
    { status: "Reported", label: "Active (Not Yet Processed)", cls: "reported" },
    { status: "Processing", label: "Processing", cls: "processing" },
    { status: "Completed", label: "Completed", cls: "completed" }
];

document.addEventListener("DOMContentLoaded", async () => {

    const isAdmin = await checkAdminSession();
    if (!isAdmin) return; // checkAdminSession already redirected

    document.getElementById("adminCheckingMessage").style.display = "none";
    document.getElementById("adminContent").style.display = "block";

    // Auto-logout after 10 minutes of no activity — much shorter than the
    // student side, since this account can edit/delete real data
    UMRFR.startInactivityGuard(supabaseClient, 10 * 60 * 1000, "login.html", "admin");

    loadAdminTickets();
    loadRoster();
    initCooldownSettings();

    const handleLogout = async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    };

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    const logoutBtnMenu = document.getElementById("logoutBtnMenu");
    if (logoutBtnMenu) logoutBtnMenu.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });
});

// Returns true if this is a real admin; otherwise redirects away and returns false.
async function checkAdminSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
        return false;
    }

    // Being logged in isn't enough — must actually be listed in the admins table
    const { data, error } = await supabaseClient
        .from("admins")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (error || !data) {
        alert("This account isn't authorized for admin access.");
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// ---------------- REPORT COOLDOWN SETTING ----------------
async function initCooldownSettings() {
    const row = document.getElementById("cooldownSelectRow");
    const buttons = row.querySelectorAll(".cooldown-option-btn");

    try {
        const { data } = await supabaseClient
            .from("app_settings")
            .select("value")
            .eq("key", "report_cooldown_minutes")
            .maybeSingle();

        const current = data ? data.value : "10";
        buttons.forEach(btn => btn.classList.toggle("active", btn.dataset.minutes === current));
    } catch (err) {
        console.error("Error loading cooldown setting:", err);
    }

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            UMRFR.setButtonLoading(btn, true, "Saving...");
            try {
                const { error } = await supabaseClient
                    .from("app_settings")
                    .update({ value: btn.dataset.minutes, updated_at: new Date().toISOString() })
                    .eq("key", "report_cooldown_minutes");
                if (error) throw error;
                buttons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            } catch (err) {
                console.error("Error saving cooldown setting:", err);
                alert("Couldn't save that setting. Please try again.");
            } finally {
                UMRFR.setButtonLoading(btn, false);
            }
        });
    });
}

// ---------------- STUDENT ROSTER ----------------
async function loadRoster() {
    const grid = document.getElementById("rosterGrid");
    try {
        const { data: students, error } = await supabaseClient
            .from("students")
            .select("student_id, last_name, first_name, year_program, user_id")
            .order("last_name", { ascending: true });

        if (error) throw error;

        if (!students || students.length === 0) {
            grid.innerHTML = "<p class='admin-empty-note'>No students in the database yet.</p>";
            return;
        }

        grid.innerHTML = "";
        students.forEach(s => {
            const activated = !!s.user_id;
            const card = document.createElement("div");
            card.className = `roster-card ${activated ? "activated" : "pending"}`;
            card.innerHTML = `
                <div class="roster-card-name">${s.first_name} ${s.last_name}</div>
                <div class="roster-card-detail">ID: ${s.student_id}</div>
                <div class="roster-card-detail">${s.year_program}</div>
                <span class="roster-status-badge ${activated ? "activated" : "pending"}">${activated ? "Activated" : "Not Activated"}</span>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading roster:", err);
        grid.innerHTML = "<p class='admin-empty-note' style='color:#B00020;'>Failed to load student roster.</p>";
    }
}

// ---------------- TICKETS ----------------
function buildAdminCard(ticket) {
    const card = document.createElement("div");
    card.className = "admin-ticket-card";

    const statusButtons = STATUSES.map(s => {
        const activeClass = ticket.status === s ? `active-${s.toLowerCase()}` : "";
        return `<button class="status-btn ${activeClass}" onclick="updateTicketStatus('${ticket.id}', '${s}', this)">${s}</button>`;
    }).join("");

    const imageLink = ticket.image_url
        ? `<a href="${ticket.image_url}" target="_blank" class="admin-image-link">View Photo Proof →</a>`
        : "";

    card.innerHTML = `
        <div class="admin-ticket-top">
            <div>
                <div class="admin-ticket-title">${ticket.classroom_name} — ${ticket.equipment_name}</div>
                <div class="admin-ticket-code">${ticket.report_code}</div>
            </div>
        </div>
        <p class="admin-ticket-details"><strong>Reported by:</strong> ${ticket.reporter_name} (${ticket.reporter_type})</p>
        <p class="admin-ticket-details"><strong>Spot in room:</strong> ${ticket.location_in_room || "—"}</p>
        <div class="admin-ticket-desc">"${ticket.issue_description}"</div>
        ${imageLink}
        <div class="status-toggle-row">
            ${statusButtons}
        </div>
        <div class="card-actions-row">
            <button class="delete-btn" onclick="deleteTicket('${ticket.id}', '${ticket.report_code}', this)">Delete Report</button>
        </div>
    `;
    return card;
}

async function loadAdminTickets() {
    const container = document.getElementById("adminSections");
    if (!container) return;

    try {
        const { data: tickets, error } = await supabaseClient
            .from('fault_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = "";

        if (!tickets || tickets.length === 0) {
            container.innerHTML = "<p class='admin-empty-note'>No active reports found.</p>";
            return;
        }

        SECTIONS.forEach(section => {
            const sectionTickets = tickets.filter(t => t.status === section.status);

            const sectionEl = document.createElement("div");
            sectionEl.className = "admin-status-section";

            const title = document.createElement("div");
            title.className = `admin-status-section-title section-${section.cls}`;
            title.innerHTML = `${section.label} <span class="admin-status-section-count">${sectionTickets.length}</span>`;
            sectionEl.appendChild(title);

            if (sectionTickets.length === 0) {
                const empty = document.createElement("p");
                empty.className = "admin-empty-note";
                empty.textContent = `Nothing in "${section.label}" right now.`;
                sectionEl.appendChild(empty);
            } else {
                const grid = document.createElement("div");
                grid.className = "admin-tickets-grid";
                sectionTickets.forEach(ticket => grid.appendChild(buildAdminCard(ticket)));
                sectionEl.appendChild(grid);
            }

            container.appendChild(sectionEl);
        });

    } catch (error) {
        console.error("Error loading tickets:", error);
        container.innerHTML = "<p class='admin-empty-note' style='color:#B00020;'>Error loading reports. Please check your connection.</p>";
    }
}

window.updateTicketStatus = async function(ticketId, newStatus, btn) {
    if (btn) UMRFR.setButtonLoading(btn, true, "...");
    try {
        const { error } = await supabaseClient
            .from('fault_tickets')
            .update({ status: newStatus })
            .eq('id', ticketId);

        if (error) throw error;
        loadAdminTickets();
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status.");
        if (btn) UMRFR.setButtonLoading(btn, false);
    }
}

window.deleteTicket = async function(ticketId, reportCode, btn) {
    const confirmed = confirm(`Permanently delete report ${reportCode}? This cannot be undone.`);
    if (!confirmed) return;

    if (btn) UMRFR.setButtonLoading(btn, true, "Deleting...");
    try {
        const { error } = await supabaseClient
            .from('fault_tickets')
            .delete()
            .eq('id', ticketId);

        if (error) throw error;
        loadAdminTickets();
    } catch (error) {
        console.error("Error deleting ticket:", error);
        alert("Failed to delete report.");
        if (btn) UMRFR.setButtonLoading(btn, false);
    }
}
