// Booking functions - With Full Notification System

console.log('📚 booking.js loaded');

const ADMIN_CODE = 'admin123';
let optOutDay = null;
let selectedBookingId = null;
let currentUser = null;
let currentView = 'dashboard';
let testRunMode = false;
let testRunDay = 1;
let isAdmin = false;

// ===== SAMPLE USERS FOR SIMULATION =====
const SAMPLE_USERS = [
    { id: 'user1', username: 'john_doe', full_name: 'John Doe' },
    { id: 'user2', username: 'jane_smith', full_name: 'Jane Smith' },
    { id: 'user3', username: 'bob_wilson', full_name: 'Bob Wilson' },
    { id: 'user4', username: 'alice_brown', full_name: 'Alice Brown' },
    { id: 'user5', username: 'charlie_davis', full_name: 'Charlie Davis' },
    { id: 'user6', username: 'emma_jones', full_name: 'Emma Jones' },
    { id: 'user7', username: 'mike_miller', full_name: 'Mike Miller' },
];

// ===== ADMIN EXCLUSION FUNCTIONS =====
function isAdminUser(user) {
    if (!user) return false;
    if (user.email === 'admin@gmail.com') return true;
    if (user.username === 'admin') return true;
    return false;
}

// ===== VOTING SCHEDULE FUNCTIONS - TEST MODE (ALWAYS OPEN) =====
function isVotingWindowOpen() {
    // 🔓 TEST MODE: Always open for testing
    return true;
}

function getVotingStatus() {
    const now = new Date();
    const currentDay = now.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[currentDay];
    
    return {
        status: 'open',
        message: `🔓 TEST MODE: Voting OPEN (${dayName}) - Click to select days`,
        className: 'open'
    };
}

function canEdit() {
    // 🔓 TEST MODE: Always allow editing
    return true;
}

function getWeekType() {
    return 'next';
}

function getVotingDeadline() {
    const now = new Date();
    const wednesday = new Date(now);
    wednesday.setDate(now.getDate() + 3);
    wednesday.setHours(23, 59, 59, 999);
    return wednesday;
}

function getResultsDay() {
    const now = new Date();
    const thursday = new Date(now);
    thursday.setDate(now.getDate() + 4);
    thursday.setHours(0, 0, 0, 0);
    return thursday;
}

// ===== NOTIFICATION FUNCTIONS =====
async function createNotification(userId, title, message, type = 'info', relatedId = null) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/create-notification`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                title: title,
                message: message,
                type: type,
                related_id: relatedId
            })
        });
        
        if (!response.ok) throw new Error('Failed to create notification');
        console.log('✅ Notification created for user:', userId);
        return true;
    } catch (error) {
        console.error('Error creating notification:', error);
        return false;
    }
}

async function getUnreadCount() {
    const token = window.getToken();
    if (!token) return 0;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to get unread count');
        const data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    const token = window.getToken();
    if (!token) {
        container.innerHTML = '<p style="color: #888;">Please login to view notifications.</p>';
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/booking/my-notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const notifications = await response.json();
        
        if (!notifications || notifications.length === 0) {
            container.innerHTML = '<p style="color: #888;">🎉 No notifications.</p>';
            return;
        }
        
        let html = '<h3>🔔 Your Notifications</h3>';
        html += '<p style="color: #666;margin-bottom:20px;">You have ' + notifications.filter(n => !n.is_read).length + ' unread notification(s).</p>';
        
        for (let i = 0; i < notifications.length; i++) {
            const n = notifications[i];
            const isRead = n.is_read ? 'read' : 'unread';
            const typeColor = n.type === 'penalty' ? '#fc8181' : 
                              n.type === 'replacement' ? '#ed8936' : 
                              n.type === 'warning' ? '#f6e05e' : '#667eea';
            
            html += `
                <div class="notification-item ${isRead}" style="border-left: 4px solid ${typeColor}; ${isRead ? 'opacity: 0.7;' : ''}">
                    <div class="notification-icon">${n.type === 'penalty' ? '💰' : n.type === 'replacement' ? '🔄' : n.type === 'warning' ? '⚠️' : 'ℹ️'}</div>
                    <div class="notification-content">
                        <div class="notification-title">${n.title}</div>
                        <div class="notification-details">${n.message}</div>
                        <div class="notification-date">${new Date(n.created_at).toLocaleString()}</div>
                        ${!isRead ? `<button class="btn btn-sm btn-primary mark-read-btn" data-id="${n.id}">Mark as Read</button>` : ''}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        const markBtns = container.querySelectorAll('.mark-read-btn');
        for (let i = 0; i < markBtns.length; i++) {
            markBtns[i].addEventListener('click', async function() {
                const id = this.dataset.id;
                await markNotificationRead(id);
            });
        }
        
        const unreadCount = notifications.filter(n => !n.is_read).length;
        updateNotificationBadge(unreadCount);
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<p style="color: red;">Failed to load notifications.</p>';
    }
}

async function markNotificationRead(notificationId) {
    const token = window.getToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/notification-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_id: notificationId })
        });
        
        if (!response.ok) throw new Error('Failed to mark as read');
        
        await loadNotifications();
        await updateNotificationBadge();
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

async function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (count === undefined) {
        count = await getUnreadCount();
    }
    
    if (count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = count;
    } else {
        badge.style.display = 'none';
    }
}

// ===== PENDING REPLACEMENTS =====
async function getPendingReplacements() {
    const token = window.getToken();
    if (!token) return [];
    
    try {
        const response = await fetch(`${window.API_URL}/booking/pending-replacements`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch pending replacements');
        return await response.json();
    } catch (error) {
        console.error('Error fetching pending replacements:', error);
        return [];
    }
}

async function acceptReplacement(replacementId) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/accept-replacement`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ replacement_id: replacementId })
        });
        
        if (!response.ok) throw new Error('Failed to accept replacement');
        window.showToast('✅ Replacement accepted!', 'success');
        return true;
    } catch (error) {
        console.error('Error accepting replacement:', error);
        window.showToast('❌ Failed to accept replacement', 'error');
        return false;
    }
}

async function declineReplacement(replacementId) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/decline-replacement`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ replacement_id: replacementId })
        });
        
        if (!response.ok) throw new Error('Failed to decline replacement');
        window.showToast('✅ Replacement declined', 'success');
        return true;
    } catch (error) {
        console.error('Error declining replacement:', error);
        window.showToast('❌ Failed to decline replacement', 'error');
        return false;
    }
}

async function requestReplacement(originalUserId, replacementUserId, day) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/request-replacement`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original_user_id: originalUserId,
                replacement_user_id: replacementUserId,
                day: day
            })
        });
        
        if (!response.ok) throw new Error('Failed to request replacement');
        window.showToast('✅ Replacement request sent!', 'success');
        return true;
    } catch (error) {
        console.error('Error requesting replacement:', error);
        window.showToast('❌ Failed to request replacement', 'error');
        return false;
    }
}

// ===== HISTORY RECORDING FUNCTION =====
async function recordHistory(event_date, action_type, day, description, amount = 0, related_user = null) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/record-history`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_date: event_date,
                action_type: action_type,
                day: day,
                description: description,
                amount: amount,
                related_user: related_user
            })
        });
        
        if (!response.ok) throw new Error('Failed to record history');
        console.log('✅ History recorded:', action_type, day);
        return true;
    } catch (error) {
        console.error('Error recording history:', error);
        return false;
    }
}

// ===== TEST RUN MODE =====
function getSimulatedThisWeekBookers() {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shuffled = [...SAMPLE_USERS].sort(() => Math.random() - 0.5);
    return dayOrder.map((day, index) => ({
        day: day,
        selected_user: shuffled[index % shuffled.length]
    }));
}

function getSimulatedNextWeekBookers() {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shuffled = [...SAMPLE_USERS].sort(() => Math.random() - 0.5);
    return dayOrder.map((day, index) => ({
        day: day,
        selected_user: shuffled[(index + 3) % shuffled.length]
    }));
}

function toggleTestRun() {
    const wasActive = testRunMode;
    if (wasActive) {
        testRunMode = false;
        localStorage.removeItem('testRunMode');
        const statusEl = document.getElementById('testRunStatus');
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.style.color = '#666';
        }
        const btn = document.getElementById('testRunBtn');
        if (btn) {
            btn.textContent = '🧪 Test Run';
            btn.className = 'btn btn-warning btn-sm';
        }
        window.showToast('🔴 Test Run disabled', 'info');
        localStorage.removeItem('simulateSunday');
    } else {
        testRunMode = true;
        localStorage.setItem('testRunMode', 'true');
        const statusEl = document.getElementById('testRunStatus');
        if (statusEl) {
            statusEl.textContent = '🧪 TEST RUN ACTIVE - Simulating Monday (Selection Open)';
            statusEl.style.color = '#f59e0b';
        }
        const btn = document.getElementById('testRunBtn');
        if (btn) {
            btn.textContent = '🔴 Disable Test Run';
            btn.className = 'btn btn-danger btn-sm';
        }
        window.showToast('🧪 Test Run activated - Simulating Monday!', 'success');
        localStorage.removeItem('simulateSunday');
    }
    renderDashboard();
}

function simulateSunday() {
    testRunMode = true;
    localStorage.setItem('testRunMode', 'true');
    localStorage.setItem('simulateSunday', 'true');
    
    const statusEl = document.getElementById('testRunStatus');
    if (statusEl) {
        statusEl.textContent = '🧪 TEST RUN ACTIVE - Simulating Sunday (Final Selection)';
        statusEl.style.color = '#f56565';
    }
    const btn = document.getElementById('testRunBtn');
    if (btn) {
        btn.textContent = '🔴 Disable Test Run';
        btn.className = 'btn btn-danger btn-sm';
    }
    window.showToast('🧪 Sunday Simulation activated - Showing simulated court bookers!', 'success');
    renderDashboard();
}

function disableSimulation() {
    testRunMode = false;
    localStorage.removeItem('testRunMode');
    localStorage.removeItem('simulateSunday');
    const statusEl = document.getElementById('testRunStatus');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.color = '#666';
    }
    const btn = document.getElementById('testRunBtn');
    if (btn) {
        btn.textContent = '🧪 Test Run';
        btn.className = 'btn btn-warning btn-sm';
    }
    renderDashboard();
}

// ===== RULES DATA =====
const RULES_DATA = [
    {
        category: '📋 Booking Rules',
        rules: [
            'Voting opens every Sunday (12:00 AM)',
            'Voting closes every Wednesday (11:59 PM)',
            'You must select your availability for the NEXT week',
            'You can select multiple days if you are available',
            'Once selected, you are committed to playing on that day',
            'If you cannot make it, you must find a replacement or pay a penalty'
        ]
    },
    {
        category: '⚠️ Cancellation Policy',
        rules: [
            'If you cancel BEFORE the court is booked: ❌ No penalty',
            'If you cancel AFTER the court is booked: 💰 $10 penalty',
            'You must notify the admin at least 24 hours in advance',
            'Last-minute cancellations will result in an automatic penalty'
        ]
    },
    {
        category: '🔄 Replacement Rules',
        rules: [
            'You can find a replacement from any registered user',
            'The replacement must approve the request',
            'The replacement takes full responsibility for the booking',
            'If no replacement is found, you must pay the penalty'
        ]
    },
    {
        category: '💰 Penalty Rules',
        rules: [
            'Penalty amount: $10.00 per cancellation after booking',
            'Penalties must be paid within 7 days',
            'Unpaid penalties will result in suspension',
            '3 unpaid penalties = 1 week suspension',
            'Payments go towards the court rental fund'
        ]
    },
    {
        category: '📅 Voting Schedule',
        rules: [
            'Voting opens: Sunday 12:00 AM',
            'Voting closes: Wednesday 11:59 PM',
            'You have 4 days to make your selections',
            'Results announced: Thursday morning',
            'Selected players are chosen on Thursday for the following week'
        ]
    }
];

// ===== MENU FUNCTIONS =====
function openSidePanel() {
    console.log('Opening side panel');
    const panel = document.getElementById('sidePanel');
    const main = document.getElementById('mainContent');
    const overlay = document.getElementById('panelOverlay');
    if (panel) panel.classList.add('open');
    if (main) main.classList.add('shifted');
    if (overlay) overlay.classList.add('active');
}

function closeSidePanel() {
    console.log('Closing side panel');
    const panel = document.getElementById('sidePanel');
    const main = document.getElementById('mainContent');
    const overlay = document.getElementById('panelOverlay');
    if (panel) panel.classList.remove('open');
    if (main) main.classList.remove('shifted');
    if (overlay) overlay.classList.remove('active');
}

// ===== VIEW SWITCHING =====
function switchView(view) {
    currentView = view;
    const dashboardView = document.getElementById('dashboardView');
    const rulesView = document.getElementById('rulesView');
    const notificationsView = document.getElementById('notificationsView');
    const historyView = document.getElementById('historyView');
    
    if (dashboardView) dashboardView.style.display = view === 'dashboard' ? 'block' : 'none';
    if (rulesView) rulesView.style.display = view === 'rules' ? 'block' : 'none';
    if (notificationsView) notificationsView.style.display = view === 'notifications' ? 'block' : 'none';
    if (historyView) historyView.style.display = 'none';
    
    if (view === 'rules') renderRulesPage();
    if (view === 'notifications') {
        loadNotifications();
        loadPendingReplacements();
    }
    closeSidePanel();
}

// ===== RULES PAGE =====
function renderRulesPage() {
    const container = document.querySelector('#rulesView .rules-content');
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < RULES_DATA.length; i++) {
        const section = RULES_DATA[i];
        html += '<div class="rules-section">';
        html += '<h3>' + section.category + '</h3>';
        html += '<ul>';
        for (let j = 0; j < section.rules.length; j++) {
            html += '<li>' + section.rules[j] + '</li>';
        }
        html += '</ul>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ===== PENDING REPLACEMENTS IN NOTIFICATIONS =====
async function loadPendingReplacements() {
    const container = document.getElementById('pendingReplacements');
    if (!container) return;
    
    const token = window.getToken();
    if (!token) {
        container.innerHTML = '';
        return;
    }
    
    try {
        const replacements = await getPendingReplacements();
        
        if (!replacements || replacements.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<div class="pending-replacements-section"><h3>🔄 Pending Replacement Requests</h3>';
        
        for (let i = 0; i < replacements.length; i++) {
            const r = replacements[i];
            const originalName = r.original_user?.full_name || r.original_user?.username || 'Someone';
            const day = r.day;
            
            html += `
                <div class="replacement-request-card">
                    <div class="request-info">
                        <strong>${originalName}</strong> wants you to replace them for <strong>${day}</strong>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-success btn-sm accept-replacement" data-id="${r.id}">✅ Accept</button>
                        <button class="btn btn-danger btn-sm decline-replacement" data-id="${r.id}">❌ Decline</button>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        const acceptBtns = container.querySelectorAll('.accept-replacement');
        for (let i = 0; i < acceptBtns.length; i++) {
            acceptBtns[i].addEventListener('click', async function() {
                const id = this.dataset.id;
                if (confirm('Are you sure you want to accept this replacement request?')) {
                    const success = await acceptReplacement(id);
                    if (success) {
                        await loadPendingReplacements();
                        await loadNotifications();
                        await renderDashboard();
                    }
                }
            });
        }
        
        const declineBtns = container.querySelectorAll('.decline-replacement');
        for (let i = 0; i < declineBtns.length; i++) {
            declineBtns[i].addEventListener('click', async function() {
                const id = this.dataset.id;
                if (confirm('Are you sure you want to decline this replacement request?')) {
                    const success = await declineReplacement(id);
                    if (success) {
                        await loadPendingReplacements();
                        await loadNotifications();
                        await renderDashboard();
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading pending replacements:', error);
    }
}

// ===== DASHBOARD FUNCTIONS =====
function getNextWeekDates() {
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilNextMonday;
    if (currentDay === 0) {
        daysUntilNextMonday = 1;
    } else if (currentDay === 1) {
        daysUntilNextMonday = 7;
    } else {
        daysUntilNextMonday = 8 - currentDay;
    }
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    const weekDates = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(nextMonday);
        date.setDate(nextMonday.getDate() + i);
        weekDates.push({
            day: dayNames[i],
            date: date,
            dateString: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
    }
    return weekDates;
}

function getThisWeekDates() {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToMonday);
    const weekDates = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(thisMonday);
        date.setDate(thisMonday.getDate() + i);
        weekDates.push({
            day: dayNames[i],
            date: date,
            dateString: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
    }
    return weekDates;
}

async function getAvailability(weekType) {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=${weekType}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch availability');
        return await response.json();
    } catch (error) {
        console.error('Error fetching availability:', error);
        return [];
    }
}

async function toggleAvailability(day, date) {
    const token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    if (!canEdit()) {
        alert('❌ Voting window is CLOSED. It opens Sunday - Wednesday.');
        return;
    }
    try {
        const response = await fetch(`${window.API_URL}/booking/select/${day}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: date })
        });

        if (!response.ok) throw new Error('Failed to update availability');
        
        const data = await response.json();
        window.showToast(data.message, 'success');
        
        if (data.action === 'added') {
            const today = new Date();
            await recordHistory(
                today.toISOString().split('T')[0],
                'played',
                day,
                'Selected availability for ' + day,
                0
            );
        }
        
        return data;
    } catch (error) {
        console.error('Error updating availability:', error);
        window.showToast('Failed to update availability', 'error');
        return null;
    }
}

async function getMyAvailability() {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(`${window.API_URL}/booking/my-availability`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch your availability');
        return await response.json();
    } catch (error) {
        console.error('Error fetching my availability:', error);
        return [];
    }
}

async function getAllUsers() {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(`${window.API_URL}/booking/all-users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

async function getThisWeekBookers() {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(`${window.API_URL}/booking/this-week-bookers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch this week bookers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching this week bookers:', error);
        return [];
    }
}

async function getNextWeekSelected() {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(`${window.API_URL}/booking/selected-players`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch selected players');
        return await response.json();
    } catch (error) {
        console.error('Error fetching selected players:', error);
        return [];
    }
}

async function getAvailableUsersForDay(day) {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=next`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return [];
        const data = await response.json();
        const booking = data.find(function(b) { return b.day === day; });
        return booking && booking.available_users ? booking.available_users : [];
    } catch (error) {
        console.error('Error fetching available users:', error);
        return [];
    }
}

async function removeUserFromBooking(day, userId) {
    const token = window.getToken();
    if (!token) return false;
    try {
        const response = await fetch(`${window.API_URL}/booking/select/${day}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, action: 'remove' })
        });
        if (!response.ok) return false;
        return true;
    } catch (error) {
        console.error('Error removing user:', error);
        return false;
    }
}

async function addReplacement(originalUserId, replacementUserId, day) {
    const token = window.getToken();
    if (!token) return false;
    try {
        const response = await fetch(`${window.API_URL}/booking/replace`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                original_user_id: originalUserId,
                replacement_user_id: replacementUserId,
                day: day
            })
        });
        if (!response.ok) return false;
        return true;
    } catch (error) {
        console.error('Error adding replacement:', error);
        return false;
    }
}

async function recordPenalty(userId, bookingId) {
    const token = window.getToken();
    if (!token) return false;
    try {
        const response = await fetch(`${window.API_URL}/booking/penalty`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                user_id: userId,
                booking_id: bookingId,
                amount: 10.00
            })
        });
        if (!response.ok) return false;
        return true;
    } catch (error) {
        console.error('Error recording penalty:', error);
        return false;
    }
}

function getBookedDays(bookings) {
    const booked = [];
    for (let i = 0; i < bookings.length; i++) {
        if (bookings[i].is_booked) {
            booked.push(bookings[i].day);
        }
    }
    return booked;
}

function renderDayCard(dayData, canEditBool, isBooked, currentUser) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    let isUserAvailable = false;
    if (dayData.available_users) {
        for (let i = 0; i < dayData.available_users.length; i++) {
            if (dayData.available_users[i].id === currentUser?.id) {
                isUserAvailable = true;
                break;
            }
        }
    }
    
    if (isUserAvailable) card.classList.add('selected');
    if (isBooked) card.classList.add('booked');
    
    const displayName = dayData.date ? dayData.day + ' - ' + dayData.date : dayData.day;
    const dayStatus = isBooked ? '📌 Booked' : '✅ Available';
    
    let selectedUserHtml = '';
    if (isBooked && dayData.selected_user) {
        selectedUserHtml = '<div class="selected-user">✅ Selected: ' + dayData.selected_user.username + '</div>';
    }
    
    const buttonText = isUserAvailable ? '✅ In' : '📝 In for this day';
    const buttonClass = isUserAvailable ? 'in-btn in' : 'in-btn';
    const disabledAttr = !canEditBool ? 'disabled' : '';
    
    card.innerHTML = '<div class="day-name">' + displayName + '</div>' +
        '<div class="day-status">' + dayStatus + '</div>' +
        selectedUserHtml +
        '<button class="' + buttonClass + ' btn btn-sm" data-day="' + dayData.day + '" data-date="' + (dayData.date || '') + '" ' + disabledAttr + '>' +
        buttonText +
        '</button>';
    
    if (canEditBool) {
        const btn = card.querySelector('.in-btn');
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.dataset.day;
            const date = this.dataset.date;
            handleToggleAvailability(day, date);
        });
    }
    
    return card;
}

function renderMyAvailability(myAvailability, isBookedDays) {
    const container = document.getElementById('myDaysList');
    if (!container) return;
    
    if (!myAvailability || myAvailability.length === 0) {
        container.innerHTML = '<p style="color: #888;">You haven\'t selected any days yet.</p>';
        return;
    }
    
    let html = '<div class="my-availability-list">';
    for (let i = 0; i < myAvailability.length; i++) {
        const day = myAvailability[i];
        const isBooked = isBookedDays && isBookedDays.indexOf(day.day) !== -1;
        const statusIcon = isBooked ? '🔒' : '✅';
        const bookingId = day.booking_id || '';
        html += '<div class="my-availability-item">' +
            '<span class="day-name">' + statusIcon + ' ' + day.day + '</span>' +
            '<button class="btn btn-danger btn-xs opt-out-btn" data-day="' + day.day + '" data-booking-id="' + bookingId + '">Opt Out</button>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    
    const btns = container.querySelectorAll('.opt-out-btn');
    for (let i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.dataset.day;
            const bookingId = this.dataset.bookingId;
            openOptOutModal(day, bookingId);
        });
    }
}

// ===== TWO WEEK TABLE =====
async function renderTwoWeekTable(isAdminUser) {
    const tbody = document.getElementById('selectedPlayersBody');
    if (!tbody) return;
    
    const isSunday = localStorage.getItem('simulateSunday') === 'true';
    const isTestRun = localStorage.getItem('testRunMode') === 'true';
    
    const thisWeekDates = getThisWeekDates();
    const nextWeekDates = getNextWeekDates();
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const sundayIndicator = document.getElementById('sundayIndicator');
    if (sundayIndicator) {
        sundayIndicator.style.display = (isSunday && isTestRun && isAdminUser) ? 'inline' : 'none';
    }
    
    let thisWeekBookers = [];
    let nextWeekSelected = [];
    
    try {
        thisWeekBookers = await getThisWeekBookers();
    } catch (e) { console.error('Error fetching this week bookers:', e); }
    
    try {
        nextWeekSelected = await getNextWeekSelected();
    } catch (e) { console.error('Error fetching next week selected:', e); }
    
    if (isSunday && isTestRun && isAdminUser) {
        const simulatedThisWeek = getSimulatedThisWeekBookers();
        const simulatedNextWeek = getSimulatedNextWeekBookers();
        thisWeekBookers = simulatedThisWeek;
        nextWeekSelected = simulatedNextWeek;
    }
    
    let html = '';
    let hasData = false;
    
    for (let i = 0; i < dayOrder.length; i++) {
        const day = dayOrder[i];
        
        const thisWeekDateObj = thisWeekDates.find(function(d) { return d.day === day; });
        const thisWeekDateStr = thisWeekDateObj ? thisWeekDateObj.dateString : 'TBD';
        const thisWeekBooker = thisWeekBookers.find(function(b) { return b.day === day; });
        let thisWeekDisplay = '❌ No booker';
        if (thisWeekBooker && thisWeekBooker.selected_user) {
            hasData = true;
            const user = thisWeekBooker.selected_user;
            thisWeekDisplay = '👤 <strong>' + user.username + '</strong><br><span style="font-size:0.85rem;color:#666;">' + (user.full_name || user.username) + '</span>';
        }
        
        const nextWeekDateObj = nextWeekDates.find(function(d) { return d.day === day; });
        const nextWeekDateStr = nextWeekDateObj ? nextWeekDateObj.dateString : 'TBD';
        const nextWeekBooker = nextWeekSelected.find(function(b) { return b.day === day; });
        let nextWeekDisplay = '❌ No booker';
        if (nextWeekBooker && nextWeekBooker.selected_user) {
            hasData = true;
            const user = nextWeekBooker.selected_user;
            nextWeekDisplay = '👤 <strong>' + user.username + '</strong><br><span style="font-size:0.85rem;color:#666;">' + (user.full_name || user.username) + '</span>';
        }
        
        html += '<tr>';
        html += '<td><strong>' + day + '</strong><br><span style="font-size:0.8rem;color:#888;">' + thisWeekDateStr + '</span></td>';
        html += '<td>' + thisWeekDisplay + '<br><span style="font-size:0.7rem;color:#888;">' + thisWeekDateStr + '</span></td>';
        html += '<td>' + nextWeekDisplay + '<br><span style="font-size:0.7rem;color:#888;">' + nextWeekDateStr + '</span></td>';
        html += '</tr>';
    }
    
    if (!hasData) {
        if (isAdminUser) {
            if (isSunday && isTestRun) {
                html = '<tr><td colspan="3" style="text-align:center;color:#888;padding:30px;">📅 No simulated data available. Please make selections first.</td></tr>';
            } else {
                html = '<tr><td colspan="3" style="text-align:center;color:#888;padding:30px;">📅 No bookings yet. Click "Simulate Sunday" to see a preview.</td></tr>';
            }
        } else {
            html = '<tr><td colspan="3" style="text-align:center;color:#888;padding:30px;">📅 The court bookers are updated every Sunday and remain visible for the entire week.</td></tr>';
        }
    }
    
    tbody.innerHTML = html;
}

function openOptOutModal(day, bookingId) {
    optOutDay = day;
    selectedBookingId = bookingId;
    const optOutDayEl = document.getElementById('optOutDay');
    if (optOutDayEl) optOutDayEl.textContent = day;
    const modal = document.getElementById('optOutModal');
    if (modal) modal.style.display = 'flex';
}

function closeOptOutModal() {
    const modal = document.getElementById('optOutModal');
    if (modal) modal.style.display = 'none';
    optOutDay = null;
    selectedBookingId = null;
}

// ===== MAIN RENDER DASHBOARD =====
async function renderDashboard() {
    const daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    
    try {
        const user = window.getCurrentUser();
        currentUser = user;
        isAdmin = await window.checkAdmin();
        
        const votingStatus = getVotingStatus();
        const canEditBool = canEdit();
        const weekType = getWeekType();
        
        const statusText = document.getElementById('votingStatusText');
        if (statusText) {
            statusText.className = 'timer-text ' + votingStatus.className;
            statusText.textContent = votingStatus.message;
        }
        
        const votingForWeek = document.getElementById('votingForWeek');
        if (votingForWeek) {
            const weekDates = getNextWeekDates();
            if (weekDates.length > 0) {
                const start = weekDates[0].dateString;
                const end = weekDates[6].dateString;
                votingForWeek.textContent = `${start} - ${end}`;
            }
        }
        
        const weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay) {
            const weekDates = getNextWeekDates();
            if (weekDates.length > 0) {
                const start = weekDates[0].dateString;
                const end = weekDates[6].dateString;
                weekDisplay.textContent = `📅 Voting for: ${start} - ${end}`;
            }
        }
        
        const warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = 'none';
        }
        
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
        }
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.style.display = isAdmin ? 'block' : 'none';
        }
        
        const bookings = await getAvailability(weekType);
        const weekDates = getNextWeekDates();
        const bookedDays = getBookedDays(bookings);
        
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedBookings = [];
        
        for (let i = 0; i < dayOrder.length; i++) {
            const day = dayOrder[i];
            let dateObj = null;
            for (let j = 0; j < weekDates.length; j++) {
                if (weekDates[j].day === day) {
                    dateObj = weekDates[j];
                    break;
                }
            }
            let booking = null;
            for (let k = 0; k < bookings.length; k++) {
                if (bookings[k].day === day) {
                    booking = bookings[k];
                    break;
                }
            }
            if (!booking) {
                booking = { 
                    day: day, 
                    is_booked: false, 
                    selected_user: null,
                    available_users: [],
                    time: '7:00 - 8:00 AM'
                };
            }
            sortedBookings.push({
                day: booking.day,
                is_booked: booking.is_booked,
                selected_user: booking.selected_user,
                available_users: booking.available_users || [],
                time: booking.time,
                date: dateObj ? dateObj.dateString : null
            });
        }
        
        daysGrid.innerHTML = '';
        for (let i = 0; i < sortedBookings.length; i++) {
            const day = sortedBookings[i];
            const isBooked = bookedDays.indexOf(day.day) !== -1;
            const card = renderDayCard(day, canEditBool, isBooked, user);
            daysGrid.appendChild(card);
        }
        
        const myAvailability = await getMyAvailability();
        renderMyAvailability(myAvailability, bookedDays);
        
        await renderTwoWeekTable(isAdmin);
        
        await checkNotifications();
        await updateNotificationBadge();
        
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        daysGrid.innerHTML = '<div class="error-message">Failed to load availability. Please refresh.</div>';
    }
}

async function checkNotifications() {
    try {
        const token = window.getToken();
        if (!token) return;
        const response = await fetch(`${window.API_URL}/booking/my-penalties`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return;
        const penalties = await response.json();
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (penalties && penalties.length > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = penalties.length;
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

async function handleToggleAvailability(day, date) {
    const result = await toggleAvailability(day, date);
    if (result) {
        await renderDashboard();
    }
}

// ===== SELECT RANDOM WITH ADMIN EXCLUSION =====
async function selectRandomUser(day) {
    const token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=next`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch availability');
        const data = await response.json();
        const booking = data.find(b => b.day === day);
        
        const availableUsers = booking?.available_users?.filter(u => u.email !== 'admin@gmail.com' && u.username !== 'admin') || [];
        
        if (availableUsers.length === 0) {
            window.showToast('❌ No non-admin users available for ' + day, 'error');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        const selectedUserId = availableUsers[randomIndex].id;
        
        const response2 = await fetch(`${window.API_URL}/booking/select-random/${day}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ force_user_id: selectedUserId })
        });

        if (!response2.ok) {
            const errorData = await response2.json();
            throw new Error(errorData.error || 'Failed to select user');
        }

        const data2 = await response2.json();
        window.showToast(`🎯 Random user selected for ${day}!`, 'success');
        return data2;
    } catch (error) {
        console.error('Error selecting user:', error);
        window.showToast(error.message || 'Failed to select user', 'error');
        return null;
    }
}

// ===== REPLACEMENT WITH NOTIFICATIONS =====
async function openReplacementModal(day) {
    const replaceDayEl = document.getElementById('replaceDay');
    if (replaceDayEl) replaceDayEl.textContent = day;
    
    const modal = document.getElementById('replacementModal');
    if (modal) modal.style.display = 'flex';
    
    const container = document.getElementById('replacementList');
    if (container) container.innerHTML = 'Loading users...';
    
    try {
        const allUsers = await getAllUsers();
        const currentUser = window.getCurrentUser();
        
        const availableUsers = allUsers.filter(function(user) {
            return user.id !== currentUser?.id && 
                   user.email !== 'admin@gmail.com' && 
                   user.username !== 'admin';
        });
        
        if (!container) return;
        
        if (availableUsers.length === 0) {
            container.innerHTML = '<p style="color: #888;">No other non-admin users found.</p>';
            return;
        }
        
        let html = '<p style="color:#666;margin-bottom:15px;">Select a replacement from all registered users (admin excluded):</p>';
        html += '<select id="replacementSelect" class="replacement-select" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;margin-bottom:15px;font-size:16px;">';
        html += '<option value="">-- Select a user --</option>';
        
        for (let i = 0; i < availableUsers.length; i++) {
            const user = availableUsers[i];
            const displayName = user.full_name || user.username;
            html += '<option value="' + user.id + '">' + displayName + ' (@' + user.username + ')</option>';
        }
        
        html += '</select>';
        html += '<button id="confirmReplacementBtn" class="btn btn-success" style="width:100%;">Confirm Replacement</button>';
        html += '<div id="replacementError" style="color:red;display:none;margin-top:10px;">Please select a user.</div>';
        
        container.innerHTML = html;
        
        const confirmBtn = document.getElementById('confirmReplacementBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async function() {
                const select = document.getElementById('replacementSelect');
                const selectedUserId = select?.value;
                const selectedUsername = select?.options[select.selectedIndex]?.text || '';
                
                if (!selectedUserId) {
                    const errorEl = document.getElementById('replacementError');
                    if (errorEl) errorEl.style.display = 'block';
                    return;
                }
                
                const errorEl = document.getElementById('replacementError');
                if (errorEl) errorEl.style.display = 'none';
                
                const confirmed = confirm('Are you sure you want ' + selectedUsername + ' to replace you for ' + day + '?');
                if (confirmed) {
                    const success = await requestReplacement(currentUser.id, selectedUserId, day);
                    if (success) {
                        const today = new Date();
                        const dateStr = today.toISOString().split('T')[0];
                        
                        await recordHistory(
                            dateStr,
                            'replacement',
                            day,
                            'Requested replacement with ' + selectedUsername + ' for ' + day,
                            0,
                            selectedUsername
                        );
                        
                        window.showToast('✅ Replacement request sent to ' + selectedUsername + '!', 'success');
                        const modalEl = document.getElementById('replacementModal');
                        if (modalEl) modalEl.style.display = 'none';
                        await renderDashboard();
                        await updateNotificationBadge();
                    } else {
                        window.showToast('❌ Failed to request replacement. Please try again.', 'error');
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading users for replacement:', error);
        if (container) container.innerHTML = '<p style="color: red;">Failed to load users. Please try again.</p>';
    }
}

// ===== OPT OUT WITH NOTIFICATIONS =====
async function handleOptOut(day, bookingId, action) {
    const user = window.getCurrentUser();
    if (!user) return;
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    if (action === 'cancel') {
        closeOptOutModal();
        return;
    }
    
    if (action === 'notBooked') {
        const success = await removeUserFromBooking(day, user.id);
        if (success) {
            await recordHistory(
                dateStr,
                'played',
                day,
                'Cancelled before court was booked (No penalty)',
                0
            );
            window.showToast('✅ You have been removed. No penalty applied.', 'success');
            closeOptOutModal();
            await renderDashboard();
        } else {
            window.showToast('❌ Failed to remove you. Please try again.', 'error');
        }
        return;
    }
    
    if (action === 'replace') {
        closeOptOutModal();
        await openReplacementModal(day);
        return;
    }
    
    if (action === 'penalty') {
        const penaltySuccess = await recordPenalty(user.id, bookingId);
        if (penaltySuccess) {
            await recordHistory(
                dateStr,
                'penalty_received',
                day,
                'Penalty received for cancelling after court was booked',
                10.00
            );
            
            await createNotification(
                user.id,
                '💰 Penalty Recorded',
                'You have received a $10.00 penalty for cancelling ' + day + ' after the court was booked. Please pay within 7 days.',
                'penalty',
                bookingId
            );
            
            await removeUserFromBooking(day, user.id);
            window.showToast('💰 Penalty recorded. You have been removed from the booking.', 'success');
            closeOptOutModal();
            openPenaltyModal(day, bookingId);
            await renderDashboard();
            await updateNotificationBadge();
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
        return;
    }
}

// ===== PENALTY PAY WITH NOTIFICATIONS =====
async function handlePenaltyPay(bookingId, day) {
    const user = window.getCurrentUser();
    if (!user) return;
    const confirmed = confirm('⚠️ Are you sure you want to pay the $10.00 penalty? This cannot be undone.');
    if (confirmed) {
        const success = await recordPenalty(user.id, bookingId);
        if (success) {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            
            await recordHistory(
                dateStr,
                'penalty_paid',
                day,
                'Paid $10.00 penalty',
                10.00
            );
            
            await createNotification(
                user.id,
                '✅ Penalty Paid',
                'You have paid the $10.00 penalty for ' + day + '. Thank you!',
                'info',
                bookingId
            );
            
            await removeUserFromBooking(day, user.id);
            window.showToast('💰 Penalty paid. You have been removed from the booking.', 'success');
            const modal = document.getElementById('penaltyModal');
            if (modal) modal.style.display = 'none';
            await renderDashboard();
            await loadNotifications();
            await updateNotificationBadge();
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
    }
}

function openPenaltyModal(day, bookingId) {
    const modal = document.getElementById('penaltyModal');
    if (modal) modal.style.display = 'flex';
    const payBtn = document.getElementById('penaltyPay');
    if (payBtn) {
        payBtn.dataset.bookingId = bookingId;
        payBtn.dataset.day = day;
    }
}

// ===== ADMIN PANEL =====
async function openAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const adminContent = document.getElementById('adminContent');
    const adminError = document.getElementById('adminError');
    const adminCode = document.getElementById('adminCode');
    if (adminContent) adminContent.style.display = 'none';
    if (adminError) adminError.style.display = 'none';
    if (adminCode) adminCode.value = '';
}

async function verifyAdmin() {
    const code = document.getElementById('adminCode').value;
    if (code === ADMIN_CODE) {
        const errorEl = document.getElementById('adminError');
        if (errorEl) errorEl.style.display = 'none';
        const contentEl = document.getElementById('adminContent');
        if (contentEl) contentEl.style.display = 'block';
        await loadAllUsersAvailability();
    } else {
        const errorEl = document.getElementById('adminError');
        if (errorEl) errorEl.style.display = 'block';
    }
}

async function loadAllUsersAvailability() {
    const container = document.getElementById('allUsersAvailability');
    if (!container) return;
    container.innerHTML = 'Loading...';
    try {
        const users = await getAllUsers();
        if (!users || users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        let html = '';
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const days = user.availability || [];
            let dayNames = '';
            for (let j = 0; j < days.length; j++) {
                dayNames += days[j].day + (j < days.length - 1 ? ', ' : '');
            }
            if (!dayNames) dayNames = 'No days selected';
            html += '<div class="admin-user-card">' +
                '<div class="username">👤 ' + user.username + '</div>' +
                '<div class="days">📅 Available: ' + dayNames + '</div>' +
                '</div>';
        }
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users.</p>';
    }
}

// ===== ADMIN: ANNOUNCE RESULTS =====
async function announceResults() {
    const token = window.getToken();
    if (!token) return;
    
    const confirmed = confirm('📢 Announce results for next week? This will send notifications to all selected players.');
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/announce-results`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to announce results');
        
        const data = await response.json();
        window.showToast(`📢 Results announced! ${data.notified} players notified.`, 'success');
        await renderDashboard();
        
    } catch (error) {
        console.error('Error announcing results:', error);
        window.showToast('❌ Failed to announce results.', 'error');
    }
}

// ===== ADMIN: VIEW ALL VOTES =====
async function viewAllVotes() {
    const token = window.getToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/all-votes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch votes');
        
        const data = await response.json();
        const container = document.getElementById('allUsersAvailability');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color: #888;">No votes recorded yet.</p>';
            return;
        }
        
        let html = '<h3>📊 All User Votes</h3>';
        html += '<div class="votes-grid">';
        
        for (let i = 0; i < data.length; i++) {
            const user = data[i];
            const votes = user.availability || [];
            const voteCount = votes.length;
            
            html += `<div class="vote-card">
                <div class="vote-user">👤 ${user.username}</div>
                <div class="vote-count">📅 ${voteCount} day${voteCount > 1 ? 's' : ''}</div>
                <div class="vote-days">${votes.map(v => v.day).join(', ') || 'No votes'}</div>
            </div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error viewing votes:', error);
        window.showToast('❌ Failed to load votes.', 'error');
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        const user = window.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        console.log('📊 Dashboard page loaded');
        console.log('👤 User:', user);
        
        if (localStorage.getItem('testRunMode') === 'true') {
            testRunMode = true;
        }
        
        const userName = document.getElementById('userName');
        if (userName) {
            window.supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single()
                .then(function(result) {
                    if (result.data) {
                        userName.textContent = '👋 Welcome, ' + result.data.username;
                    }
                });
        }
        
        renderDashboard();
        setInterval(renderDashboard, 30000);
        updateNotificationBadge();
        
        // MENU
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            console.log('✅ Menu toggle found');
            menuToggle.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('☰ Menu clicked');
                openSidePanel();
            });
        } else {
            console.log('❌ Menu toggle NOT found');
        }
        
        const closePanel = document.getElementById('closePanel');
        if (closePanel) {
            closePanel.addEventListener('click', function(e) {
                e.preventDefault();
                closeSidePanel();
            });
        }
        
        const overlay = document.getElementById('panelOverlay');
        if (overlay) {
            overlay.addEventListener('click', function() {
                closeSidePanel();
            });
        }
        
        // PANEL BUTTONS
        const panelMyAvailability = document.getElementById('panelMyAvailability');
        if (panelMyAvailability) {
            panelMyAvailability.addEventListener('click', function() {
                switchView('dashboard');
                const section = document.getElementById('myAvailability');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        const panelRules = document.getElementById('panelRules');
        if (panelRules) {
            panelRules.addEventListener('click', function() {
                switchView('rules');
            });
        }
        
        const panelNotifications = document.getElementById('panelNotifications');
        if (panelNotifications) {
            panelNotifications.addEventListener('click', function() {
                switchView('notifications');
            });
        }
        
        const panelHistory = document.getElementById('panelHistory');
        if (panelHistory) {
            panelHistory.addEventListener('click', function() {
                switchView('notifications');
            });
        }
        
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.addEventListener('click', openAdminPanel);
        }
        
        const panelLogout = document.getElementById('panelLogout');
        if (panelLogout) {
            panelLogout.addEventListener('click', function() {
                window.logoutUser();
            });
        }
        
        // ADMIN MODAL
        const closeAdminModal = document.getElementById('closeAdminModal');
        if (closeAdminModal) {
            closeAdminModal.addEventListener('click', function() {
                const modal = document.getElementById('adminModal');
                if (modal) modal.style.display = 'none';
            });
        }
        window.addEventListener('click', function(e) {
            const modal = document.getElementById('adminModal');
            if (e.target === modal) {
                if (modal) modal.style.display = 'none';
            }
        });
        
        const verifyAdminBtn = document.getElementById('verifyAdminBtn');
        if (verifyAdminBtn) {
            verifyAdminBtn.addEventListener('click', verifyAdmin);
        }
        
        const adminCodeInput = document.getElementById('adminCode');
        if (adminCodeInput) {
            adminCodeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyAdmin();
            });
        }
        
        // OPT OUT MODAL
        const closeOptOutModalBtn = document.getElementById('closeOptOutModal');
        if (closeOptOutModalBtn) {
            closeOptOutModalBtn.addEventListener('click', closeOptOutModal);
        }
        
        const optOutCancel = document.getElementById('optOutCancel');
        if (optOutCancel) {
            optOutCancel.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'cancel');
            });
        }
        
        const optOutNotBooked = document.getElementById('optOutNotBooked');
        if (optOutNotBooked) {
            optOutNotBooked.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'notBooked');
            });
        }
        
        const optOutReplace = document.getElementById('optOutReplace');
        if (optOutReplace) {
            optOutReplace.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'replace');
            });
        }
        
        const optOutPenalty = document.getElementById('optOutPenalty');
        if (optOutPenalty) {
            optOutPenalty.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'penalty');
            });
        }
        
        // REPLACEMENT MODAL
        const closeReplacementModal = document.getElementById('closeReplacementModal');
        if (closeReplacementModal) {
            closeReplacementModal.addEventListener('click', function() {
                const modal = document.getElementById('replacementModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const replacementCancel = document.getElementById('replacementCancel');
        if (replacementCancel) {
            replacementCancel.addEventListener('click', function() {
                const modal = document.getElementById('replacementModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        // PENALTY MODAL
        const closePenaltyModal = document.getElementById('closePenaltyModal');
        if (closePenaltyModal) {
            closePenaltyModal.addEventListener('click', function() {
                const modal = document.getElementById('penaltyModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const penaltyCancel = document.getElementById('penaltyCancel');
        if (penaltyCancel) {
            penaltyCancel.addEventListener('click', function() {
                const modal = document.getElementById('penaltyModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        const penaltyPay = document.getElementById('penaltyPay');
        if (penaltyPay) {
            penaltyPay.addEventListener('click', function() {
                const bookingId = this.dataset.bookingId;
                const day = this.dataset.day;
                handlePenaltyPay(bookingId, day);
            });
        }
        
        // CLICK OUTSIDE MODALS
        window.addEventListener('click', function(e) {
            const optOutModal = document.getElementById('optOutModal');
            const replacementModal = document.getElementById('replacementModal');
            const penaltyModal = document.getElementById('penaltyModal');
            if (e.target === optOutModal) closeOptOutModal();
            if (e.target === replacementModal) {
                if (replacementModal) replacementModal.style.display = 'none';
            }
            if (e.target === penaltyModal) {
                if (penaltyModal) penaltyModal.style.display = 'none';
            }
        });
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                window.logoutUser();
            });
        }
        
        // TEST RUN BUTTONS
        const testRunBtn = document.getElementById('testRunBtn');
        if (testRunBtn) {
            testRunBtn.addEventListener('click', function() {
                toggleTestRun();
            });
        }
        
        const sundayBtn = document.getElementById('sundaySimBtn');
        if (sundayBtn) {
            sundayBtn.addEventListener('click', function() {
                simulateSunday();
            });
        }
        
        // Admin panel buttons
        const viewVotesBtn = document.getElementById('viewVotesBtn');
        if (viewVotesBtn) {
            viewVotesBtn.addEventListener('click', viewAllVotes);
        }
        
        const announceResultsBtn = document.getElementById('announceResultsBtn');
        if (announceResultsBtn) {
            announceResultsBtn.addEventListener('click', announceResults);
        }
        
        const randomSelectAllBtn = document.getElementById('randomSelectAllBtn');
        if (randomSelectAllBtn) {
            randomSelectAllBtn.addEventListener('click', async function() {
                const confirmed = confirm('🎲 Randomly select players for ALL days?');
                if (!confirmed) return;
                
                const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                for (let i = 0; i < dayOrder.length; i++) {
                    await selectRandomUser(dayOrder[i]);
                }
                await renderDashboard();
                window.showToast('🎯 Random selection complete for all days!', 'success');
            });
        }
        
        const resetAllBtn = document.getElementById('resetAllBtn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', async function() {
                const confirmed = confirm('🔄 Reset ALL days? This will clear all selections.');
                if (!confirmed) return;
                
                const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                for (let i = 0; i < dayOrder.length; i++) {
                    const response = await fetch(`${window.API_URL}/booking/reset/${dayOrder[i]}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${window.getToken()}`,
                            'Content-Type': 'application/json'
                        }
                    });
                }
                await renderDashboard();
                window.showToast('🔄 All days reset successfully!', 'success');
            });
        }
    }
});
