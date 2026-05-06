// DOM Elements
const chatFab = document.getElementById('chat-fab');
const manualFab = document.getElementById('manual-fab');
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const closeChat = document.getElementById('close-chat');
const minimizeChat = document.getElementById('minimize-chat');

// Helper functions for custom modals
function showLoadingModal(message) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; text-align: center;">
            <div style="width: 40px; height: 40px; border: 3px solid rgba(56, 189, 248, 0.3); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
            <p style="color: var(--text-primary); margin: 0;">${message}</p>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function showSuccessModal(message) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px; text-align: center;">
            <i class="ph ph-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 1rem;"></i>
            <p style="color: var(--text-primary); margin: 0 0 1.5rem 0; font-size: 1.1rem;">${message}</p>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #10b981; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                OK
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 3000);
}

function showErrorModal(message) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px; text-align: center;">
            <i class="ph ph-x-circle" style="font-size: 48px; color: #ef4444; margin-bottom: 1rem;"></i>
            <p style="color: var(--text-primary); margin: 0 0 1.5rem 0; font-size: 1.1rem;">${message}</p>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #ef4444; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                OK
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}


// Toggle Chat
if (chatFab && chatWindow) {
    chatFab.addEventListener('click', () => {
        chatWindow.style.display = 'flex';
        chatFab.style.display = 'none';
        // Hiding manual FAB to avoid overlap as requested
        if (manualFab) manualFab.style.display = 'none';

        setTimeout(() => chatInput.focus(), 100);
    });
}

function closeChatWindow() {
    chatWindow.style.display = 'none';
    chatFab.style.display = 'flex';
    // Restore manual FAB
    if (manualFab) manualFab.style.display = 'flex';
}

if (closeChat) closeChat.addEventListener('click', closeChatWindow);
if (minimizeChat) minimizeChat.addEventListener('click', closeChatWindow);

// Add Close Button to Header dynamically if not in HTML (Cleanup old code)
// const chatHeader = document.querySelector('.chat-header');
// ... (Removing old dynamic injection block as it's now in HTML)

// Load Dashboard Data
async function loadData() {
    // 1. Load Events
    try {
        const evRes = await fetch('/api/events');
        const events = await evRes.json();
        const eventsList = document.getElementById('events-list');

        eventsList.innerHTML = events.length ? '' : '<p style="text-align:center; color: var(--text-secondary); padding: 2rem;">No scheduled events.</p>';

        events.forEach(evt => {
            const div = document.createElement('div');
            div.className = 'event-item';

            // Delete Button
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '<i class="ph ph-trash"></i>';
            delBtn.title = "Delete Event";
            delBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent card click
                deleteEvent(evt.id, evt.title);
            };

            div.innerHTML = `
                <div class="event-title">${evt.title}</div>
                <div class="event-meta">
                    <i class="ph ph-clock"></i> ${new Date(evt.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div class="event-meta">
                    <i class="ph ph-info"></i> ${evt.type}
                </div>
            `;

            // Only admins can delete events
            if (typeof USER_ROLE !== 'undefined' && USER_ROLE === 'admin') {
                div.appendChild(delBtn);
            }
            div.onclick = () => showEventDetails(evt.id);
            eventsList.appendChild(div);
        });
    } catch (e) {
        console.error("Error loading events", e);
    }

    // 2. Load Resources (Rooms/Instructors)
    try {
        const resRes = await fetch('/api/resources');
        if (resRes.status === 401) { window.location.href = '/login'; return; }
        const resources = await resRes.json();

        const roomsList = document.getElementById('rooms-list');
        const instList = document.getElementById('instructors-list');

        if (roomsList) roomsList.innerHTML = '';
        if (instList) instList.innerHTML = '';

        resources.forEach(r => {
            const item = document.createElement('div');
            item.style.marginBottom = '0.8rem';
            item.style.fontSize = '0.9rem';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.innerHTML = `<span style="color:var(--text-primary); font-weight:500;">${r.name}</span> <span style="color:var(--text-secondary); font-size:0.8rem;">${r.id}</span>`;

            if (r.type === 'Room' && roomsList) roomsList.appendChild(item);
            if (r.type === 'Instructor' && instList) instList.appendChild(item);
        });

    } catch (e) {
        console.error("Error loading resources", e);
    }
}

// Add Logout Button Logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.location.href = '/logout';
    });
}

// Delete Event Logic
async function deleteEvent(eventId, eventTitle) {
    // Create custom confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';

    confirmModal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px; text-align: center;">
            <i class="ph ph-trash" style="font-size: 48px; color: #ef4444; margin-bottom: 1rem;"></i>
            <h3 style="margin: 0 0 1rem 0;">Delete Event?</h3>
            <p style="color: var(--text-primary); margin-bottom: 0.5rem; font-weight: 600;">${eventTitle}</p>
            <p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 0.9rem;">This action cannot be undone.</p>
            <div style="display: flex; gap: 1rem;">
                <button id="cancel-delete" style="flex: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button id="confirm-delete" style="flex: 1; background: #ef4444; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Delete
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    // Handle confirmation
    confirmModal.querySelector('#confirm-delete').onclick = async () => {
        confirmModal.remove();

        // Show loading state
        const loadingModal = showLoadingModal('Deleting event...');

        try {
            const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
            const data = await res.json();
            loadingModal.remove();

            if (data.success) {
                if (data.status === 'pending') {
                    showSuccessModal("Deletion requested. Waiting for Admin approval.");
                } else {
                    showSuccessModal("Event deleted successfully!");
                    loadData();
                }
            } else {
                showErrorModal(data.message || "Failed to delete event.");
            }
        } catch (e) {
            console.error("Delete failed", e);
            loadingModal.remove();
            showErrorModal("Error deleting event.");
        }
    };

    confirmModal.querySelector('#cancel-delete').onclick = () => {
        confirmModal.remove();
    };
}

// Event Details Logic
const detailsModal = document.getElementById('details-modal');
if (document.getElementById('close-details')) {
    document.getElementById('close-details').onclick = () => detailsModal.style.display = 'none';
}

async function showEventDetails(eventId) {
    try {
        const res = await fetch(`/api/event/${eventId}`);
        if (!res.ok) throw new Error("Event not found");

        const data = await res.json();
        const evt = data.event;
        const resList = data.resources;

        document.getElementById('d-title').innerText = evt.title;
        document.getElementById('d-id').innerText = evt.id;
        document.getElementById('d-type').innerText = evt.type;
        document.getElementById('d-time').innerText = `${new Date(evt.start_time).toLocaleString()} - ${new Date(evt.end_time).toLocaleTimeString()}`;
        document.getElementById('d-desc').innerText = evt.description;

        const resContainer = document.getElementById('d-resources');
        resContainer.innerHTML = '';

        if (resList.length === 0) {
            resContainer.innerHTML = '<span style="color:var(--text-secondary);">No resources allocated directly.</span>';
        } else {
            resList.forEach(r => {
                const tag = document.createElement('span');
                tag.style.background = 'rgba(56, 189, 248, 0.15)';
                tag.style.color = '#38bdf8';
                tag.style.padding = '0.4rem 0.8rem';
                tag.style.borderRadius = '8px';
                tag.style.fontSize = '0.85rem';
                tag.style.border = '1px solid rgba(56, 189, 248, 0.2)';
                tag.style.display = 'flex';
                tag.style.alignItems = 'center';
                tag.style.gap = '0.5rem';

                let icon = '';
                if (r.type === 'Room') icon = '<i class="ph ph-house"></i>';
                else if (r.type === 'Instructor') icon = '<i class="ph ph-user"></i>';
                else icon = '<i class="ph ph-wrench"></i>';

                tag.innerHTML = `${icon} ${r.name}`;
                resContainer.appendChild(tag);
            });
        }

        detailsModal.style.display = 'flex';

    } catch (e) {
        console.error(e);
        alert("Could not load event details.");
    }
}

// Chat Logic
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    addMessage(text, 'user');
    chatInput.value = '';

    // Show typing...
    const loadingId = addTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();

        // Remove loading
        document.getElementById(loadingId).remove();

        // Formatted response helper
        let aiText = data.response;
        // Improved Markdown Parsing (Simple)
        aiText = aiText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:0.2rem 0.4rem; border-radius:4px;">$1</code>')
            .replace(/\n/g, '<br>');

        addMessage(aiText, 'ai', false, true); // html enabled

        // Reload dashboard if event booked confirmed
        if (aiText.includes("Confirmed") || aiText.includes("Successfully")) {
            loadData();
        }

    } catch (e) {
        console.error(e);
        document.getElementById(loadingId).innerText = "Error connecting to AI.";
    }
}

function addMessage(text, sender, isTemp = false, isHtml = false) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    if (isHtml) div.innerHTML = text;
    else div.innerText = text;

    const id = 'msg-' + Math.random().toString(36).substr(2, 9);
    div.id = id;

    // Avatar (Optional, can be added via CSS or here)
    // if (sender === 'ai') ...

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    const id = 'typing-' + Math.random().toString(36).substr(2, 9);
    div.id = id;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

if (sendBtn) sendBtn.addEventListener('click', sendMessage);
if (chatInput) chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Init
loadData();

// --- System Status Toggle ---
const statusTitle = document.getElementById('system-status');
if (statusTitle) {
    statusTitle.parentElement.style.cursor = 'pointer';
    statusTitle.parentElement.onclick = () => {
        if (statusTitle.innerText.includes('Active')) {
            statusTitle.innerText = 'System Inactive';
            statusTitle.parentElement.innerHTML = '<span id="system-status">System Inactive</span> 🔴';
            // Re-bind click since we replaced innerHTML
            // Actually better to just change text and emoji span if possible, but innerHTML is quick here.
            // Let's rely on event bubbling or re-bind?
            // Simpler: Just refresh page or basic toggle text. 
            // The user wants it "catchy".
        } else {
            statusTitle.innerText = 'System Active';
            statusTitle.parentElement.innerHTML = '<span id="system-status">System Active</span> 🟢';
        }
    };
    // Better implementation to avoid losing reference
    statusTitle.parentElement.onclick = function () {
        const textSpan = this.querySelector('span');
        if (this.innerText.includes('Active')) {
            this.innerHTML = '<span id="system-status">System Paused</span> 🟠';
        } else {
            this.innerHTML = '<span id="system-status">System Active</span> 🟢';
        }
    };
}

// --- Manual Booking Logic ---
const manualBookingBtn = document.getElementById('manual-booking-btn');
const manualModal = document.getElementById('manual-modal');
const closeManual = document.getElementById('close-manual');
const checkAvailBtn = document.getElementById('check-avail-btn');
const backStep1 = document.getElementById('back-step-1');
const confirmBookBtn = document.getElementById('confirm-book-btn');

if (manualBookingBtn) {
    manualBookingBtn.addEventListener('click', () => {
        manualModal.style.display = 'flex';
        // Reset to step 1
        if (document.getElementById('booking-step-1')) document.getElementById('booking-step-1').style.display = 'block';
        if (document.getElementById('booking-step-2')) document.getElementById('booking-step-2').style.display = 'none';
    });
}

if (closeManual) closeManual.addEventListener('click', () => manualModal.style.display = 'none');

if (backStep1) backStep1.addEventListener('click', () => {
    document.getElementById('booking-step-2').style.display = 'none';
    document.getElementById('booking-step-1').style.display = 'block';
});

if (checkAvailBtn) checkAvailBtn.addEventListener('click', async () => {
    const start = document.getElementById('m-start').value;
    const end = document.getElementById('m-end').value;
    const capacity = document.getElementById('m-capacity').value;

    if (!start || !end) {
        alert("Please select dates.");
        return;
    }

    checkAvailBtn.innerText = "Checking...";

    try {
        const res = await fetch('/api/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end, capacity })
        });
        const data = await res.json();

        // Populate Selects
        const roomSel = document.getElementById('m-room-select');
        const instSel = document.getElementById('m-instructor-select');
        const equipList = document.getElementById('m-equip-list');

        roomSel.innerHTML = '';
        instSel.innerHTML = '';
        equipList.innerHTML = '';

        data.rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.innerText = `${r.name} (Cap: ${r.capacity})`;
            roomSel.appendChild(opt);
        });

        data.instructors.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.innerText = `${r.name} - ${r.specialization || ''}`;
            instSel.appendChild(opt);
        });

        data.equipment.forEach(r => {
            const div = document.createElement('div');
            div.style.marginBottom = '0.5rem';
            div.innerHTML = `<label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;"><input type="checkbox" value="${r.id}" name="equip" style="accent-color:var(--accent-color);"> ${r.name}</label>`;
            equipList.appendChild(div);
        });

        // Show Step 2

        if (data.rooms.length === 0 && data.instructors.length === 0) {
            alert("No available rooms or instructors for this time slot. Please choose a different time.");
            // Don't show step 2, let user adjust time
            checkAvailBtn.innerText = "Check Availability";
            return;
        }

        document.getElementById('booking-step-1').style.display = 'none';
        document.getElementById('booking-step-2').style.display = 'block';

    } catch (e) {
        console.error(e);
        alert("Error checking availability.");
    } finally {
        checkAvailBtn.innerText = "Check Availability";
    }
});


if (confirmBookBtn) confirmBookBtn.addEventListener('click', async () => {
    const title = document.getElementById('m-title').value || "Manual Event";
    const type = document.getElementById('m-type').value;
    const capacity = document.getElementById('m-capacity').value;
    const purpose = document.getElementById('m-purpose').value;
    const start = document.getElementById('m-start').value;
    const end = document.getElementById('m-end').value;

    const roomId = document.getElementById('m-room-select').value;
    const instId = document.getElementById('m-instructor-select').value;

    // Get checked equipment
    const equipIds = Array.from(document.querySelectorAll('input[name="equip"]:checked')).map(cb => cb.value);

    const resources = [];
    if (roomId) resources.push(roomId);
    if (instId) resources.push(instId);
    resources.push(...equipIds);

    if (resources.length === 0) {
        if (!confirm("No resources selected. Proceed?")) return;
    }

    confirmBookBtn.innerText = "Booking...";

    try {
        const payload = {
            event: { title, type, capacity, purpose, start, end },
            resources: resources
        };

        const res = await fetch('/api/book-manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
            alert("Event Booked Successfully!");
            manualModal.style.display = 'none';
            // Reset form
            document.getElementById('booking-step-2').style.display = 'none';
            document.getElementById('booking-step-1').style.display = 'block';

            // Clear inputs
            document.getElementById('m-title').value = '';
            document.getElementById('m-purpose').value = '';

            loadData(); // Refresh dashboard
        } else {
            alert("Booking Failed: " + result.message);
        }

    } catch (e) {
        console.error(e);
        alert("System Error.");
    } finally {
        confirmBookBtn.innerText = "Confirm Booking";
    }
});

// --- Reports Logic ---
const reportsBtn = document.getElementById('reports-btn');
const reportsModal = document.getElementById('reports-modal');
const closeReports = document.getElementById('close-reports');
const exportPdfBtn = document.getElementById('export-pdf-btn');

if (reportsBtn) {
    reportsBtn.addEventListener('click', async () => {
        reportsModal.style.display = 'flex';
        await loadReports();
    });
}

if (closeReports) {
    closeReports.addEventListener('click', () => {
        reportsModal.style.display = 'none';
    });
}

async function loadReports() {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem;">Loading...</td></tr>';

    try {
        const res = await fetch('/api/events');
        const events = await res.json();

        tbody.innerHTML = '';

        events.forEach(evt => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--glass-border)';

            tr.innerHTML = `
                <td style="padding:0.8rem;">${evt.id}</td>
                <td style="padding:0.8rem;">${evt.title}</td>
                <td style="padding:0.8rem;">${evt.type}</td>
                <td style="padding:0.8rem;">${new Date(evt.start_time).toLocaleDateString()}</td>
                <td style="padding:0.8rem;">${evt.created_by || 'Unknown'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem;">Error loading reports</td></tr>';
    }
}

if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text("Event List Report", 14, 20);

        const tbody = document.getElementById('reports-table-body');
        const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText);
        });

        doc.autoTable({
            head: [['ID', 'Title', 'Type', 'Date', 'Created By']],
            body: rows,
            startY: 30,
        });

        doc.save('event-report.pdf');
    });
}


// --- Trash History Logic ---
const trashBtn = document.getElementById('trash-btn');
const trashModal = document.getElementById('trash-modal');
const closeTrash = document.getElementById('close-trash');
const trashList = document.getElementById('trash-list');

if (trashBtn) {
    trashBtn.addEventListener('click', async () => {
        trashModal.style.display = 'flex';
        await loadTrash();
    });
}

if (closeTrash) {
    closeTrash.addEventListener('click', () => {
        trashModal.style.display = 'none';
    });
}

async function loadTrash() {
    if (!trashList) return;
    trashList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Loading deleted events...</p>';

    try {
        const res = await fetch('/api/archived-events');
        const events = await res.json();

        if (events.length === 0) {
            trashList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No deleted events found.</p>';
            return;
        }

        trashList.innerHTML = '';

        events.forEach(evt => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem;';

            card.innerHTML = `
                 <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <h3 style="margin:0; font-size:1rem; color: #9ca3af; text-decoration: line-through;">${evt.title}</h3>
                    <span style="font-size:0.8rem; color:#ef4444;">Deleted: ${new Date(evt.deleted_at).toLocaleDateString()}</span>
                 </div>
                 <div style="font-size:0.85rem; color:var(--text-secondary);">
                    ID: ${evt.original_id} | Type: ${evt.type}
                 </div>
            `;
            trashList.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        trashList.innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading trash.</p>';
    }
}
