// INITIALIZE SUPABASE (v2 syntax)
const SUPABASE_URL = 'https://jxrcwlrhslvnensjuguc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VgqXILKX-W4SLAsojQWNGw_ngHksJCU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SECTIONS = [
    { status: "Reported", label: "Active (Not Yet Processed)", cls: "reported" },
    { status: "Processing", label: "Processing", cls: "processing" },
    { status: "Completed", label: "Completed", cls: "completed" }
];

document.addEventListener("DOMContentLoaded", async () => {
    // Active Reports now requires login — no more public access
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "student-login.html";
        return;
    }
    UMRFR.startInactivityGuard(supabaseClient, 12 * 60 * 60 * 1000, "student-login.html", "student");

    loadTickets();

    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll(".ticket-card");
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(query) ? "flex" : "none";
        });
    });
});

function badgeClassFor(status) {
    if (status === "Processing") return "badge-processing";
    if (status === "Completed") return "badge-completed";
    return "badge-reported";
}

function buildCard(ticket) {
    const badgeClass = badgeClassFor(ticket.status);
    const formattedDate = new Date(ticket.created_at).toLocaleString();

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
                <p><strong>Reporter:</strong> ${ticket.reporter_name} (${ticket.reporter_type})</p>
            </div>
            <div class="ticket-description">
                "${ticket.issue_description}"
            </div>
            <div class="ticket-date">
                Submitted on: ${formattedDate}
            </div>
        </div>
    `;
    return card;
}

async function loadTickets() {
    const container = document.getElementById("reportsSections");

    try {
        const { data: tickets, error } = await supabaseClient
            .from('fault_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `<p class="no-results">No fault reports have been submitted yet.</p>`;
            return;
        }

        container.innerHTML = "";

        SECTIONS.forEach(section => {
            const sectionTickets = tickets.filter(t => t.status === section.status);

            const sectionEl = document.createElement("div");
            sectionEl.className = "status-section";

            const title = document.createElement("div");
            title.className = `status-section-title section-${section.cls}`;
            title.innerHTML = `${section.label} <span class="status-section-count">${sectionTickets.length}</span>`;
            sectionEl.appendChild(title);

            if (sectionTickets.length === 0) {
                const empty = document.createElement("p");
                empty.className = "no-results";
                empty.textContent = `No reports in "${section.label}" right now.`;
                sectionEl.appendChild(empty);
            } else {
                const grid = document.createElement("div");
                grid.className = "tickets-grid";
                sectionTickets.forEach(ticket => grid.appendChild(buildCard(ticket)));
                sectionEl.appendChild(grid);
            }

            container.appendChild(sectionEl);
        });

    } catch (err) {
        console.error("Error loading tickets:", err);
        container.innerHTML = `<p class="no-results" style="color: #B00020;">Failed to load reports from database.</p>`;
    }
}
