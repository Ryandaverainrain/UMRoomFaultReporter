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

document.addEventListener("DOMContentLoaded", () => {

    checkAdminSession();
    loadAdminTickets();

    const handleLogout = async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    };

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    const logoutBtnMenu = document.getElementById("logoutBtnMenu");
    if (logoutBtnMenu) logoutBtnMenu.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });
});

async function checkAdminSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
    }
}

function buildAdminCard(ticket) {
    const card = document.createElement("div");
    card.className = "admin-ticket-card";

    const statusButtons = STATUSES.map(s => {
        const activeClass = ticket.status === s ? `active-${s.toLowerCase()}` : "";
        return `<button class="status-btn ${activeClass}" onclick="updateTicketStatus('${ticket.id}', '${s}')">${s}</button>`;
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
            <button class="delete-btn" onclick="deleteTicket('${ticket.id}', '${ticket.report_code}')">Delete</button>
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
                sectionTickets.forEach(ticket => sectionEl.appendChild(buildAdminCard(ticket)));
            }

            container.appendChild(sectionEl);
        });

    } catch (error) {
        console.error("Error loading tickets:", error);
        container.innerHTML = "<p class='admin-empty-note' style='color:#B00020;'>Error loading reports. Please check your connection.</p>";
    }
}

window.updateTicketStatus = async function(ticketId, newStatus) {
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
    }
}

window.deleteTicket = async function(ticketId, reportCode) {
    const confirmed = confirm(`Permanently delete report ${reportCode}? This cannot be undone.`);
    if (!confirmed) return;

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
    }
}
