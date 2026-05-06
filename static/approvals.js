
const approvalsBell = document.getElementById('approvals-bell');
const approvalsModal = document.getElementById('approvals-modal');
const closeApprovals = document.getElementById('close-approvals');
const approvalsList = document.getElementById('approvals-list');
const pendingCountBadge = document.getElementById('pending-count');

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
            <p style="color: var(--text-primary); margin: 0 0 1.5rem 0; font-size: 1.1rem;">❌ ${message}</p>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #ef4444; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                OK
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}


async function updatePendingCount() {
    if (!approvalsBell) return;

    try {
        const res = await fetch('/api/pending-events');
        if (res.ok) {
            const pendingEvents = await res.json();
            const count = pendingEvents.length;

            if (count > 0) {
                pendingCountBadge.textContent = count;
                pendingCountBadge.style.display = 'flex';
            } else {
                pendingCountBadge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Error fetching pending count:', e);
    }
}

// Show approvals modal (Combined Events and Deletions)
async function showApprovalsModal() {
    try {
        const [pendingRes, delRes] = await Promise.all([
            fetch('/api/pending-events'),
            fetch('/api/deletion-requests')
        ]);

        let pendingEvents = [];
        let deletionRequests = [];

        if (pendingRes.ok) pendingEvents = await pendingRes.json();
        if (delRes.ok) deletionRequests = await delRes.json();

        if (pendingEvents.length === 0 && deletionRequests.length === 0) {
            approvalsList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No pending approvals 🎉</p>';
        } else {
            approvalsList.innerHTML = '';

            // 1. Pending Events
            pendingEvents.forEach(event => {
                const card = createApprovalCard(event, 'creation');
                approvalsList.appendChild(card);
            });

            // 2. Deletion Requests
            deletionRequests.forEach(req => {
                const card = createApprovalCard(req, 'deletion');
                approvalsList.appendChild(card);
            });

            // Add Listeners
            bindApprovalListeners();
        }

        approvalsModal.style.display = 'flex';
    } catch (e) {
        console.error('Error loading approvals:', e);
        approvalsList.innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading approvals</p>';
        approvalsModal.style.display = 'flex';
    }
}

function createApprovalCard(item, type) {
    const card = document.createElement('div');
    card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;';

    let title, meta, badge, approveFn, rejectFn, rejectText;

    if (type === 'creation') {
        title = item.title;
        meta = `<strong>Type:</strong> ${item.type} | <strong>Attendees:</strong> ${item.capacity || 'N/A'}`;
        badge = '<span style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: bold;">NEW EVENT</span>';
        approveFn = 'approveEvent';
        rejectFn = 'rejectEvent';
        rejectText = 'Reject';
    } else {
        title = `Deletion: ${item.event_title}`;
        meta = `<strong>Event Type:</strong> ${item.event_type} | <strong>Requested By:</strong> ${item.requested_by_name}`;
        badge = '<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: bold;">DELETION</span>';
        approveFn = 'approveDeletion';
        rejectFn = 'rejectDeletion';
        rejectText = 'Reject Deletion';
    }

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
            <div>
                <h3 style="margin:0 0 0.5rem 0; color:var(--text-primary);">${title}</h3>
                <p style="margin:0; color:var(--text-secondary); font-size:0.9rem;">${meta}</p>
            </div>
            ${badge}
        </div>
        
        <div style="display:flex; gap:0.75rem;">
            <button class="approve-btn" data-id="${item.id}" data-type="${type}" style="flex:1; background: #10b981; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="ph ph-check-circle"></i> Approve
            </button>
            <button class="reject-btn" data-id="${item.id}" data-type="${type}" style="flex:1; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="ph ph-x-circle"></i> ${rejectText}
            </button>
        </div>
    `;
    return card;
}

function bindApprovalListeners() {
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.type === 'creation') approveEvent(btn.dataset.id);
            else approveDeletion(btn.dataset.id);
        }
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.type === 'creation') rejectEvent(btn.dataset.id);
            else rejectDeletion(btn.dataset.id);
        }
    });
}

// Approve event
async function approveEvent(eventId) {
    // Create custom confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';

    confirmModal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px; text-align: center;">
            <i class="ph ph-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 1rem;"></i>
            <h3 style="margin: 0 0 1rem 0;">Approve Event?</h3>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">This will create the event and allocate the requested resources.</p>
            <div style="display: flex; gap: 1rem;">
                <button id="cancel-approve" style="flex: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button id="confirm-approve" style="flex: 1; background: #10b981; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Approve
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    // Handle confirmation
    confirmModal.querySelector('#confirm-approve').onclick = async () => {
        confirmModal.remove();

        // Show loading state
        const loadingModal = showLoadingModal('Approving event...');

        try {
            const res = await fetch(`/api/approve-event/${eventId}`, {
                method: 'POST'
            });

            const data = await res.json();
            loadingModal.remove();

            if (res.ok && data.success) {
                showSuccessModal('✅ Event approved successfully!');
                showApprovalsModal(); // Refresh list
                updatePendingCount(); // Update badge
                loadData(); // Refresh dashboard
            } else {
                showErrorModal(data.message || data.error || 'Failed to approve');
            }
        } catch (e) {
            console.error('Error approving event:', e);
            loadingModal.remove();
            showErrorModal('Error approving event');
        }
    };

    confirmModal.querySelector('#cancel-approve').onclick = () => {
        confirmModal.remove();
    };
}

// Reject event
async function rejectEvent(eventId) {
    // Create custom input modal
    const inputModal = document.createElement('div');
    inputModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';

    inputModal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px;">
            <h3 style="margin: 0 0 1rem 0;">Reject Event</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Please provide a reason for rejection (optional):</p>
            <textarea id="reject-reason" class="chat-input" style="width: 100%; min-height: 80px; margin-bottom: 1.5rem; resize: vertical;" placeholder="Enter reason..."></textarea>
            <div style="display: flex; gap: 1rem;">
                <button id="cancel-reject" style="flex: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button id="confirm-reject" style="flex: 1; background: #ef4444; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Reject
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(inputModal);

    inputModal.querySelector('#confirm-reject').onclick = async () => {
        const reason = inputModal.querySelector('#reject-reason').value || 'No reason provided';
        inputModal.remove();

        const loadingModal = showLoadingModal('Rejecting event...');

        try {
            const res = await fetch(`/api/reject-event/${eventId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            const data = await res.json();
            loadingModal.remove();

            if (res.ok && data.success) {
                showSuccessModal('Event request rejected');
                showApprovalsModal();
                updatePendingCount();
            } else {
                showErrorModal(data.message || data.error || 'Failed to reject');
            }
        } catch (e) {
            console.error('Error rejecting event:', e);
            loadingModal.remove();
            showErrorModal('Error rejecting event');
        }
    };

    inputModal.querySelector('#cancel-reject').onclick = () => {
        inputModal.remove();
    };
}

async function approveDeletion(reqId) {
    const confirmModal = document.createElement('div');
    confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';

    confirmModal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px; text-align: center;">
            <i class="ph ph-trash" style="font-size: 48px; color: #ef4444; margin-bottom: 1rem;"></i>
            <h3 style="margin: 0 0 1rem 0;">Confirm Deletion</h3>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">This will permanently delete the event and free up allocated resources.</p>
            <div style="display: flex; gap: 1rem;">
                <button id="cancel-deletion" style="flex: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button id="confirm-deletion" style="flex: 1; background: #ef4444; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Delete
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    confirmModal.querySelector('#confirm-deletion').onclick = async () => {
        confirmModal.remove();
        const loadingModal = showLoadingModal('Approving deletion...');

        try {
            const res = await fetch(`/api/approve-deletion/${reqId}`, { method: 'POST' });
            const data = await res.json();
            loadingModal.remove();

            if (data.success) {
                showSuccessModal('Deletion approved');
                showApprovalsModal();
                updatePendingCount();
                loadData();
            } else {
                showErrorModal(data.error || data.message || 'Failed to approve deletion');
            }
        } catch (e) {
            loadingModal.remove();
            showErrorModal('Error approving deletion');
        }
    };

    confirmModal.querySelector('#cancel-deletion').onclick = () => {
        confirmModal.remove();
    };
}

async function rejectDeletion(reqId) {
    const confirmModal = document.createElement('div');
    confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display: flex; align-items: center; justify-content: center;';

    confirmModal.innerHTML = `
        <div class="glass-panel" style="padding: 2rem; max-width: 400px; text-align: center;">
            <i class="ph ph-x-circle" style="font-size: 48px; color: #ef4444; margin-bottom: 1rem;"></i>
            <h3 style="margin: 0 0 1rem 0;">Reject Deletion Request?</h3>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">The event will remain active and resources will stay allocated.</p>
            <div style="display: flex; gap: 1rem;">
                <button id="cancel-reject-del" style="flex: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button id="confirm-reject-del" style="flex: 1; background: #ef4444; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Reject
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    confirmModal.querySelector('#confirm-reject-del').onclick = async () => {
        confirmModal.remove();
        const loadingModal = showLoadingModal('Rejecting deletion...');

        try {
            const res = await fetch(`/api/reject-deletion/${reqId}`, { method: 'POST' });
            const data = await res.json();
            loadingModal.remove();

            if (data.success) {
                showSuccessModal('Deletion request rejected');
                showApprovalsModal();
                updatePendingCount();
            } else {
                showErrorModal(data.error || data.message || 'Failed to reject');
            }
        } catch (e) {
            loadingModal.remove();
            showErrorModal('Error rejecting deletion');
        }
    };

    confirmModal.querySelector('#cancel-reject-del').onclick = () => {
        confirmModal.remove();
    };
}

// Event listeners
if (approvalsBell) {
    approvalsBell.addEventListener('click', showApprovalsModal);
    // Update count on page load and every 30 seconds
    updatePendingCount();
    setInterval(updatePendingCount, 30000);
}

if (closeApprovals) {
    closeApprovals.addEventListener('click', () => {
        approvalsModal.style.display = 'none';
    });
}
