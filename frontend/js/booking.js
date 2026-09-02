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
    return true;
}

function getVotingStatus() {
    var now = new Date();
    var currentDay = now.getDay();
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var dayName = dayNames[currentDay];
    
    return {
        status: 'open',
        message: '🔓 TEST MODE: Voting OPEN (' + dayName + ') - Click to select days',
        className: 'open'
    };
}

function canEdit() {
    return true;
}

function getWeekType() {
    return 'next';
}

// ===== NOTIFICATION FUNCTIONS =====
async function createNotification(userId, title, message, type, relatedId) {
    if (type === undefined) type = 'info';
    if (relatedId === undefined) relatedId = null;
    var token = window.getToken();
    if (!token) return false;
    
    try {
        var response = await fetch(window.API_URL + '/booking/create-notification', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
    var token = window.getToken();
    if (!token) return 0;
    try {
        var response = await fetch(window.API_URL + '/booking/unread-count', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to get unread count');
        var data = await response.json();
        return data.count || 0;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

async function loadNotifications() {
    var container = document.getElementById('notificationsList');
    if (!container) return;
    var token = window.getToken();
    if (!token) {
        container.innerHTML = '<p style="color: #888;">Please login to view notifications.</p>';
        return;
    }
    try {
        var response = await fetch(window.API_URL + '/booking/my-notifications', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        var notifications = await response.json();
        if (!notifications || notifications.length === 0) {
            container.innerHTML = '<p style="color: #888;">🎉 No notifications.</p>';
            return;
        }
        var html = '<h3>🔔 Your Notifications</h3>';
        var unreadCount = 0;
        for (var i = 0; i < notifications.length; i++) {
            if (!notifications[i].is_read) unreadCount++;
        }
        html += '<p style="color: #666;margin-bottom:20px;">You have ' + unreadCount + ' unread notification(s).</p>';
        for (var i = 0; i < notifications.length; i++) {
            var n = notifications[i];
            var isRead = n.is_read ? 'read' : 'unread';
            var typeColor = n.type === 'penalty' ? '#fc8181' : 
                              n.type === 'replacement' ? '#ed8936' : 
                              n.type === 'warning' ? '#f6e05e' : '#667eea';
            html += '<div class="notification-item ' + isRead + '" style="border-left: 4px solid ' + typeColor + '; ' + (isRead ? 'opacity: 0.7;' : '') + '">';
            html += '<div class="notification-icon">' + (n.type === 'penalty' ? '💰' : n.type === 'replacement' ? '🔄' : n.type === 'warning' ? '⚠️' : 'ℹ️') + '</div>';
            html += '<div class="notification-content">';
            html += '<div class="notification-title">' + n.title + '</div>';
            html += '<div class="notification-details">' + n.message + '</div>';
            html += '<div class="notification-date">' + new Date(n.created_at).toLocaleString() + '</div>';
            if (!isRead) {
                html += '<button class="btn btn-sm btn-primary mark-read-btn" data-id="' + n.id + '">Mark as Read</button>';
            }
            html += '</div></div>';
        }
        container.innerHTML = html;
        var markBtns = container.querySelectorAll('.mark-read-btn');
        for (var i = 0; i < markBtns.length; i++) {
            markBtns[i].addEventListener('click', function() {
                var id = this.dataset.id;
                markNotificationRead(id);
            });
        }
        updateNotificationBadge(unreadCount);
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<p style="color: red;">Failed to load notifications.</p>';
    }
}

async function markNotificationRead(notificationId) {
    var token = window.getToken();
    if (!token) return;
    try {
        var response = await fetch(window.API_URL + '/booking/notification-read', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
    var badge = document.getElementById('notificationBadge');
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
    var token = window.getToken();
    if (!token) return [];
    try {
        var response = await fetch(window.API_URL + '/booking/pending-replacements', {
            headers: {
                'Authorization': 'Bearer ' + token
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
    var token = window.getToken();
    if (!token) return false;
    try {
        var response = await fetch(window.API_URL + '/booking/accept-replacement', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
    var token = window.getToken();
    if (!token) return false;
    try {
        var response = await fetch(window.API_URL + '/booking/decline-replacement', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
    var token = window.getToken();
    if (!token) return false;
    try {
        var response = await fetch(window.API_URL + '/booking/request-replacement', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
async function recordHistory(event_date, action_type, day, description, amount, related_user) {
    if (amount === undefined) amount = 0;
    if (related_user === undefined) related_user = null;
    var token = window.getToken();
    if (!token) return false;
    try {
        var response = await fetch(window.API_URL + '/booking/record-history', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
    var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var shuffled = SAMPLE_USERS.slice().sort(function() { return Math.random() - 0.5; });
    var result = [];
    for (var i = 0; i < dayOrder.length; i++) {
        result.push({
            day: dayOrder[i],
            selected_user: shuffled[i % shuffled.length],
            available_count: Math.floor(Math.random() * 15) + 5
        });
    }
    return result;
}

function getSimulatedNextWeekBookers() {
    var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var shuffled = SAMPLE_USERS.slice().sort(function() { return Math.random() - 0.5; });
    var result = [];
    for (var i = 0; i < dayOrder.length; i++) {
        result.push({
            day: dayOrder[i],
            selected_user: shuffled[(i + 3) % shuffled.length],
            available_count: Math.floor(Math.random() * 15) + 5
        });
    }
    return result;
}

function toggleTestRun() {
    var wasActive = testRunMode;
    if (wasActive) {
        testRunMode = false;
        localStorage.removeItem('testRunMode');
        var statusEl = document.getElementById('testRunStatus');
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.style.color = '#666';
        }
        var btn = document.getElementById('testRunBtn');
        if (btn) {
            btn.textContent = '🧪 Test Run';
            btn.className = 'btn btn-warning btn-sm';
        }
        window.showToast('🔴 Test Run disabled', 'info');
        localStorage.removeItem('simulateSunday');
    } else {
        testRunMode = true;
        localStorage.setItem('testRunMode', 'true');
        var statusEl = document.getElementById('testRunStatus');
        if (statusEl) {
            statusEl.textContent = '🧪 TEST RUN ACTIVE - Simulating Monday (Selection Open)';
            statusEl.style.color = '#f59e0b';
        }
        var btn = document.getElementById('testRunBtn');
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
    var statusEl = document.getElementById('testRunStatus');
    if (statusEl) {
        statusEl.textContent = '🧪 TEST RUN ACTIVE - Simulating Sunday (Final Selection)';
        statusEl.style.color = '#f56565';
    }
    var btn = document.getElementById('testRunBtn');
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
    var statusEl = document.getElementById('testRunStatus');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.color = '#666';
    }
    var btn = document.getElementById('testRunBtn');
    if (btn) {
        btn.textContent = '🧪 Test Run';
        btn.className = 'btn btn-warning btn-sm';
    }
    renderDashboard();
}

// ===== RULES DATA =====
var RULES_DATA = [
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
    var panel = document.getElementById('sidePanel');
    var main = document.getElementById('mainContent');
    var overlay = document.getElementById('panelOverlay');
    if (panel) panel.classList.add('open');
    if (main) main.classList.add('shifted');
    if (overlay) overlay.classList.add('active');
}

function closeSidePanel() {
    console.log('Closing side panel');
    var panel = document.getElementById('sidePanel');
    var main = document.getElementById('mainContent');
    var overlay = document.getElementById('panelOverlay');
    if (panel) panel.classList.remove('open');
    if (main) main.classList.remove('shifted');
    if (overlay) overlay.classList.remove('active');
}

// ===== VIEW SWITCHING =====
function switchView(view) {
    currentView = view;
    var dashboardView = document.getElementById('dashboardView');
    var rulesView = document.getElementById('rulesView');
    var notificationsView = document.getElementById('notificationsView');
    var historyView = document.getElementById('historyView');
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

function renderRulesPage() {
    var container = document.querySelector('#rulesView .rules-content');
    if (!container) return;
    var html = '';
    for (var i = 0; i < RULES_DATA.length; i++) {
        var section = RULES_DATA[i];
        html += '<div class="rules-section">';
        html += '<h3>' + section.category + '</h3>';
        html += '<ul>';
        for (var j = 0; j < section.rules.length; j++) {
            html += '<li>' + section.rules[j] + '</li>';
        }
        html += '</ul>';
        html += '</div>';
    }
    container.innerHTML = html;
}

async function loadPendingReplacements() {
    var container = document.getElementById('pendingReplacements');
    if (!container) return;
    var token = window.getToken();
    if (!token) {
        container.innerHTML = '';
        return;
    }
    try {
        var replacements = await getPendingReplacements();
        if (!replacements || replacements.length === 0) {
            container.innerHTML = '';
            return;
        }
        var html = '<div class="pending-replacements-section"><h3>🔄 Pending Replacement Requests</h3>';
        for (var i = 0; i < replacements.length; i++) {
            var r = replacements[i];
            var originalName = r.original_user?.full_name || r.original_user?.username || 'Someone';
            var day = r.day;
            html += '<div class="replacement-request-card">';
            html += '<div class="request-info">';
            html += '<strong>' + originalName + '</strong> wants you to replace them for <strong>' + day + '</strong>';
            html += '</div>';
            html += '<div class="request-actions">';
            html += '<button class="btn btn-success btn-sm accept-replacement" data-id="' + r.id + '">✅ Accept</button>';
            html += '<button class="btn btn-danger btn-sm decline-replacement" data-id="' + r.id + '">❌ Decline</button>';
            html += '</div></div>';
        }
        html += '</div>';
        container.innerHTML = html;
        var acceptBtns = container.querySelectorAll('.accept-replacement');
        for (var i = 0; i < acceptBtns.length; i++) {
            acceptBtns[i].addEventListener('click', function() {
                var id = this.dataset.id;
                if (confirm('Are you sure you want to accept this replacement request?')) {
                    acceptReplacement(id).then(function(success) {
                        if (success) {
                            loadPendingReplacements();
                            loadNotifications();
                            renderDashboard();
                        }
                    });
                }
            });
        }
        var declineBtns = container.querySelectorAll('.decline-replacement');
        for (var i = 0; i < declineBtns.length; i++) {
            declineBtns[i].addEventListener('click', function() {
                var id = this.dataset.id;
                if (confirm('Are you sure you want to decline this replacement request?')) {
                    declineReplacement(id).then(function(success) {
                        if (success) {
                            loadPendingReplacements();
                            loadNotifications();
                            renderDashboard();
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error loading pending replacements:', error);
    }
}

// ===== DASHBOARD FUNCTIONS =====
function getNextWeekDates() {
    var today = new Date();
    var currentDay = today.getDay();
    var daysUntilNextMonday;
    if (currentDay === 0) {
        daysUntilNextMonday = 1;
    } else if (currentDay === 1) {
        daysUntilNextMonday = 7;
    } else {
        daysUntilNextMonday = 8 - currentDay;
    }
    var nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    var weekDates = [];
    var dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (var i = 0; i < 7; i++) {
        var date = new Date(nextMonday);
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
    var today = new Date();
    var currentDay = today.getDay();
    var daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    var thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToMonday);
    var weekDates = [];
    var dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (var i = 0; i < 7; i++) {
        var date = new Date(thisMonday);
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
    var token = window.getToken();
    if (!token) return [];
    try {
        var response = await fetch(window.API_URL + '/booking/availability?week=' + weekType, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to fetch availability');
        var data = await response.json();
        console.log('📊 Availability data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching availability:', error);
        return [];
    }
}

async function toggleAvailability(day, date) {
    var token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    if (!canEdit()) {
        alert('❌ Voting window is CLOSED. It opens Sunday - Wednesday.');
        return;
    }
    try {
        var response = await fetch(window.API_URL + '/booking/select/' + day, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: date })
        });
        if (!response.ok) throw new Error('Failed to update availability');
        var data = await response.json();
        console.log('✅ Toggle response:', data);
        window.showToast(data.message, 'success');
        if (data.action === 'added') {
            var today = new Date();
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
    var token = window.getToken();
    if (!token) return [];
    try {
        var response = await fetch(window.API_URL + '/booking/my-availability', {
            headers: {
                'Authorization': 'Bearer ' + token
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
    var token = window.getToken();
    if (!token) return [];
    try {
        var response = await fetch(window.API_URL + '/booking/all-users', {
            headers: {
                'Authorization': 'Bearer ' + token
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
    var token = window.getToken();
    if (!token) return [];
    try {
        var response = await fetch(window.API_URL + '/booking/this-week-bookers', {
            headers: {
                'Authorization': 'Bearer ' + token
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
    var token = window.getToken();
    if (!token) return [];
    try {
        var response = await fetch(window.API_URL + '/booking/selected-players', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to fetch selected players');
        return await response.json();
    } catch (error) {
        console.error('Error fetching selected players:', error);
        return [];
    }
}

async function removeUserFromBooking(day, userId) {
    var token = window.getToken();
    if (!token) return false;
    try {
        var response = await fetch(window.API_URL + '/booking/select/' + day, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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

async function recordPenalty(userId, bookingId) {
    var token = window.getToken();
    if (!token) return false;
    try {
        var response = await fetch(window.API_URL + '/booking/penalty', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
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
    var booked = [];
    for (var i = 0; i < bookings.length; i++) {
        if (bookings[i].is_booked) {
            booked.push(bookings[i].day);
        }
    }
    return booked;
}

// ===== VIEW PLAYERS DROPDOWN =====
function renderPlayerDropdown(availableUsers, day) {
    if (!availableUsers || availableUsers.length === 0) {
        return '<div style="color:#888;font-size:0.85rem;">No players available</div>';
    }
    var html = '<details class="player-dropdown">';
    html += '<summary style="cursor:pointer;color:#667eea;font-weight:500;font-size:0.85rem;">';
    html += '👥 View ' + availableUsers.length + ' player' + (availableUsers.length > 1 ? 's' : '');
    html += '</summary>';
    html += '<div style="margin-top:8px;padding:8px;background:#f7fafc;border-radius:5px;max-height:150px;overflow-y:auto;">';
    for (var i = 0; i < availableUsers.length; i++) {
        var user = availableUsers[i];
        var displayName = user.full_name || user.username || 'Unknown';
        html += '<div style="padding:4px 8px;border-bottom:1px solid #e2e8f0;font-size:0.85rem;">';
        html += '🏸 ' + displayName;
        html += '</div>';
    }
    html += '</div></details>';
    return html;
}

// ===== RENDER DAY CARD WITH DROPDOWN =====
function renderDayCard(dayData, canEditBool, isBooked, currentUser) {
    var card = document.createElement('div');
    card.className = 'day-card';
    
    var isUserAvailable = false;
    if (dayData.available_users) {
        for (var i = 0; i < dayData.available_users.length; i++) {
            if (dayData.available_users[i].id === currentUser?.id) {
                isUserAvailable = true;
                break;
            }
        }
    }
    
    if (isUserAvailable) card.classList.add('selected');
    if (isBooked) card.classList.add('booked');
    
    var displayName = dayData.date ? dayData.day + ' - ' + dayData.date : dayData.day;
    var availableCount = dayData.available_users ? dayData.available_users.length : 0;
    
    var selectedUserHtml = '';
    if (isBooked && dayData.selected_user) {
        selectedUserHtml = '<div class="selected-user">🎯 Booker: <strong>' + dayData.selected_user.username + '</strong></div>';
    }
    
    var buttonText = isUserAvailable ? '✅ In' : '📝 In for this day';
    var buttonClass = isUserAvailable ? 'in-btn in' : 'in-btn';
    var disabledAttr = !canEditBool ? 'disabled' : '';
    
    var dropdownHtml = renderPlayerDropdown(dayData.available_users, dayData.day);
    
    card.innerHTML = '<div class="day-name">' + displayName + '</div>' +
        '<div class="day-status">' + (isBooked ? '📌 Booked' : '✅ Available') + '</div>' +
        '<div class="user-count">👥 ' + availableCount + ' player' + (availableCount > 1 ? 's' : '') + ' in</div>' +
        selectedUserHtml +
        '<div style="margin-top:8px;">' + dropdownHtml + '</div>' +
        '<button class="' + buttonClass + ' btn btn-sm" data-day="' + dayData.day + '" data-date="' + (dayData.date || '') + '" ' + disabledAttr + '>' +
        buttonText +
        '</button>';
    
    if (canEditBool) {
        var btn = card.querySelector('.in-btn');
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var day = this.dataset.day;
            var date = this.dataset.date;
            handleToggleAvailability(day, date);
        });
    }
    
    return card;
}

function renderMyAvailability(myAvailability, isBookedDays) {
    var container = document.getElementById('myDaysList');
    if (!container) return;
    if (!myAvailability || myAvailability.length === 0) {
        container.innerHTML = '<p style="color: #888;">You haven\'t selected any days yet.</p>';
        return;
    }
    var html = '<div class="my-availability-list">';
    for (var i = 0; i < myAvailability.length; i++) {
        var day = myAvailability[i];
        var isBooked = isBookedDays && isBookedDays.indexOf(day.day) !== -1;
        var statusIcon = isBooked ? '🔒' : '✅';
        var bookingId = day.booking_id || '';
        html += '<div class="my-availability-item">' +
            '<span class="day-name">' + statusIcon + ' ' + day.day + '</span>' +
            '<button class="btn btn-danger btn-xs opt-out-btn" data-day="' + day.day + '" data-booking-id="' + bookingId + '">Opt Out</button>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    var btns = container.querySelectorAll('.opt-out-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function(e) {
            e.stopPropagation();
            var day = this.dataset.day;
            var bookingId = this.dataset.bookingId;
            openOptOutModal(day, bookingId);
        });
    }
}

// ===== TWO WEEK TABLE =====
async function renderTwoWeekTable(isAdminUser) {
    var tbody = document.getElementById('selectedPlayersBody');
    if (!tbody) return;
    
    var isSunday = localStorage.getItem('simulateSunday') === 'true';
    var isTestRun = localStorage.getItem('testRunMode') === 'true';
    var thisWeekDates = getThisWeekDates();
    var nextWeekDates = getNextWeekDates();
    var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    var sundayIndicator = document.getElementById('sundayIndicator');
    if (sundayIndicator) {
        sundayIndicator.style.display = (isSunday && isTestRun && isAdminUser) ? 'inline' : 'none';
    }
    
    var thisWeekBookers = [];
    var nextWeekSelected = [];
    
    try {
        thisWeekBookers = await getThisWeekBookers();
    } catch (e) { console.error('Error fetching this week bookers:', e); }
    try {
        nextWeekSelected = await getNextWeekSelected();
    } catch (e) { console.error('Error fetching next week selected:', e); }
    
    if (isSunday && isTestRun && isAdminUser) {
        var simulatedThisWeek = getSimulatedThisWeekBookers();
        var simulatedNextWeek = getSimulatedNextWeekBookers();
        thisWeekBookers = simulatedThisWeek;
        nextWeekSelected = simulatedNextWeek;
    }
    
    var html = '';
    var hasData = false;
    var allBookings = [];
    try {
        allBookings = await getAvailability('next');
        console.log('📊 All bookings for table:', allBookings);
    } catch (e) { console.error('Error fetching bookings:', e); }
    
    for (var i = 0; i < dayOrder.length; i++) {
        var day = dayOrder[i];
        
        // Get this week data
        var thisWeekDateObj = null;
        for (var j = 0; j < thisWeekDates.length; j++) {
            if (thisWeekDates[j].day === day) {
                thisWeekDateObj = thisWeekDates[j];
                break;
            }
        }
        var thisWeekDateStr = thisWeekDateObj ? thisWeekDateObj.dateString : 'TBD';
        
        var thisWeekBooker = null;
        for (var j = 0; j < thisWeekBookers.length; j++) {
            if (thisWeekBookers[j].day === day) {
                thisWeekBooker = thisWeekBookers[j];
                break;
            }
        }
        var thisWeekDisplay = '❌ No booker';
        var thisWeekCount = 0;
        var thisWeekUsers = [];
        if (thisWeekBooker && thisWeekBooker.selected_user) {
            hasData = true;
            var user = thisWeekBooker.selected_user;
            thisWeekDisplay = '👤 <strong>' + user.username + '</strong><br><span style="font-size:0.85rem;color:#666;">' + (user.full_name || user.username) + '</span>';
            thisWeekCount = thisWeekBooker.available_count || 0;
            thisWeekUsers = thisWeekBooker.available_users || [];
        }
        
        // Get next week data
        var nextWeekDateObj = null;
        for (var j = 0; j < nextWeekDates.length; j++) {
            if (nextWeekDates[j].day === day) {
                nextWeekDateObj = nextWeekDates[j];
                break;
            }
        }
        var nextWeekDateStr = nextWeekDateObj ? nextWeekDateObj.dateString : 'TBD';
        
        var nextWeekBooker = null;
        for (var j = 0; j < nextWeekSelected.length; j++) {
            if (nextWeekSelected[j].day === day) {
                nextWeekBooker = nextWeekSelected[j];
                break;
            }
        }
        var nextWeekDisplay = '❌ No booker';
        var nextWeekCount = 0;
        var nextWeekUsers = [];
        if (nextWeekBooker && nextWeekBooker.selected_user) {
            hasData = true;
            var user = nextWeekBooker.selected_user;
            nextWeekDisplay = '👤 <strong>' + user.username + '</strong><br><span style="font-size:0.85rem;color:#666;">' + (user.full_name || user.username) + '</span>';
            nextWeekCount = nextWeekBooker.available_count || 0;
            nextWeekUsers = nextWeekBooker.available_users || [];
        }
        
        // Get available users from booking data
        var booking = null;
        for (var j = 0; j < allBookings.length; j++) {
            if (allBookings[j].day === day) {
                booking = allBookings[j];
                break;
            }
        }
        
        // Use booking data for counts if available
        if (booking) {
            if (booking.available_users) {
                var count = booking.available_users.length;
                if (nextWeekCount === 0 || count > 0) {
                    nextWeekCount = count;
                    nextWeekUsers = booking.available_users;
                }
                console.log('📊 ' + day + ' available users:', count);
            }
        }
        
        // Create dropdown HTML
        var dropdownHtml = renderPlayerDropdown(nextWeekUsers.length > 0 ? nextWeekUsers : thisWeekUsers, day);
        
        html += '<tr>';
        html += '<td><strong>' + day + '</strong><br><span style="font-size:0.8rem;color:#888;">' + thisWeekDateStr + '</span></td>';
        html += '<td>';
        html += thisWeekDisplay;
        html += '<div style="margin-top:5px;font-size:0.85rem;color:#48bb78;">📊 ' + thisWeekCount + ' players in</div>';
        html += renderPlayerDropdown(thisWeekUsers, day);
        html += '</td>';
        html += '<td>';
        html += nextWeekDisplay;
        html += '<div style="margin-top:5px;font-size:0.85rem;color:#667eea;">📊 ' + nextWeekCount + ' players in</div>';
        html += renderPlayerDropdown(nextWeekUsers, day);
        html += '</td>';
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
    var optOutDayEl = document.getElementById('optOutDay');
    if (optOutDayEl) optOutDayEl.textContent = day;
    var modal = document.getElementById('optOutModal');
    if (modal) modal.style.display = 'flex';
}

function closeOptOutModal() {
    var modal = document.getElementById('optOutModal');
    if (modal) modal.style.display = 'none';
    optOutDay = null;
    selectedBookingId = null;
}

// ===== MAIN RENDER DASHBOARD =====
async function renderDashboard() {
    var daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    
    try {
        var user = window.getCurrentUser();
        currentUser = user;
        isAdmin = await window.checkAdmin();
        
        var votingStatus = getVotingStatus();
        var canEditBool = canEdit();
        var weekType = getWeekType();
        
        var statusText = document.getElementById('votingStatusText');
        if (statusText) {
            statusText.className = 'timer-text ' + votingStatus.className;
            statusText.textContent = votingStatus.message;
        }
        
        var votingForWeek = document.getElementById('votingForWeek');
        if (votingForWeek) {
            var weekDates = getNextWeekDates();
            if (weekDates.length > 0) {
                var start = weekDates[0].dateString;
                var end = weekDates[6].dateString;
                votingForWeek.textContent = start + ' - ' + end;
            }
        }
        
        var weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay) {
            var weekDates = getNextWeekDates();
            if (weekDates.length > 0) {
                var start = weekDates[0].dateString;
                var end = weekDates[6].dateString;
                weekDisplay.textContent = '📅 Voting for: ' + start + ' - ' + end;
            }
        }
        
        var warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = 'none';
        }
        
        var adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
        }
        var panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.style.display = isAdmin ? 'block' : 'none';
        }
        
        var bookings = await getAvailability(weekType);
        var weekDates = getNextWeekDates();
        var bookedDays = getBookedDays(bookings);
        
        console.log('📊 Bookings data:', bookings);
        console.log('📊 Booked days:', bookedDays);
        
        var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        var sortedBookings = [];
        
        for (var i = 0; i < dayOrder.length; i++) {
            var day = dayOrder[i];
            var dateObj = null;
            for (var j = 0; j < weekDates.length; j++) {
                if (weekDates[j].day === day) {
                    dateObj = weekDates[j];
                    break;
                }
            }
            var booking = null;
            for (var j = 0; j < bookings.length; j++) {
                if (bookings[j].day === day) {
                    booking = bookings[j];
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
        for (var i = 0; i < sortedBookings.length; i++) {
            var day = sortedBookings[i];
            var isBooked = bookedDays.indexOf(day.day) !== -1;
            var card = renderDayCard(day, canEditBool, isBooked, user);
            daysGrid.appendChild(card);
        }
        
        var myAvailability = await getMyAvailability();
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
        var token = window.getToken();
        if (!token) return;
        var response = await fetch(window.API_URL + '/booking/my-penalties', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) return;
        var penalties = await response.json();
        var badge = document.getElementById('notificationBadge');
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
    var result = await toggleAvailability(day, date);
    if (result) {
        await renderDashboard();
    }
}

// ===== SELECT RANDOM WITH ADMIN EXCLUSION =====
async function selectRandomUser(day) {
    var token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        var response = await fetch(window.API_URL + '/booking/availability?week=next', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to fetch availability');
        var data = await response.json();
        var booking = null;
        for (var i = 0; i < data.length; i++) {
            if (data[i].day === day) {
                booking = data[i];
                break;
            }
        }
        var availableUsers = [];
        if (booking && booking.available_users) {
            for (var i = 0; i < booking.available_users.length; i++) {
                if (booking.available_users[i].email !== 'admin@gmail.com' && booking.available_users[i].username !== 'admin') {
                    availableUsers.push(booking.available_users[i]);
                }
            }
        }
        if (availableUsers.length === 0) {
            window.showToast('❌ No non-admin users available for ' + day, 'error');
            return null;
        }
        var randomIndex = Math.floor(Math.random() * availableUsers.length);
        var selectedUserId = availableUsers[randomIndex].id;
        var response2 = await fetch(window.API_URL + '/booking/select-random/' + day, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ force_user_id: selectedUserId })
        });
        if (!response2.ok) {
            var errorData = await response2.json();
            throw new Error(errorData.error || 'Failed to select user');
        }
        var data2 = await response2.json();
        window.showToast('🎯 Random user selected for ' + day + '!', 'success');
        return data2;
    } catch (error) {
        console.error('Error selecting user:', error);
        window.showToast(error.message || 'Failed to select user', 'error');
        return null;
    }
}

// ===== REPLACEMENT WITH NOTIFICATIONS =====
async function openReplacementModal(day) {
    var replaceDayEl = document.getElementById('replaceDay');
    if (replaceDayEl) replaceDayEl.textContent = day;
    var modal = document.getElementById('replacementModal');
    if (modal) modal.style.display = 'flex';
    var container = document.getElementById('replacementList');
    if (container) container.innerHTML = 'Loading users...';
    try {
        var allUsers = await getAllUsers();
        var currentUser = window.getCurrentUser();
        var availableUsers = [];
        for (var i = 0; i < allUsers.length; i++) {
            var user = allUsers[i];
            if (user.id !== currentUser?.id && user.email !== 'admin@gmail.com' && user.username !== 'admin') {
                availableUsers.push(user);
            }
        }
        if (!container) return;
        if (availableUsers.length === 0) {
            container.innerHTML = '<p style="color: #888;">No other non-admin users found.</p>';
            return;
        }
        var html = '<p style="color:#666;margin-bottom:15px;">Select a replacement from all registered users (admin excluded):</p>';
        html += '<select id="replacementSelect" class="replacement-select" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;margin-bottom:15px;font-size:16px;">';
        html += '<option value="">-- Select a user --</option>';
        for (var i = 0; i < availableUsers.length; i++) {
            var user = availableUsers[i];
            var displayName = user.full_name || user.username;
            html += '<option value="' + user.id + '">' + displayName + ' (@' + user.username + ')</option>';
        }
        html += '</select>';
        html += '<button id="confirmReplacementBtn" class="btn btn-success" style="width:100%;">Confirm Replacement</button>';
        html += '<div id="replacementError" style="color:red;display:none;margin-top:10px;">Please select a user.</div>';
        container.innerHTML = html;
        var confirmBtn = document.getElementById('confirmReplacementBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                var select = document.getElementById('replacementSelect');
                var selectedUserId = select?.value;
                var selectedUsername = select?.options[select.selectedIndex]?.text || '';
                if (!selectedUserId) {
                    var errorEl = document.getElementById('replacementError');
                    if (errorEl) errorEl.style.display = 'block';
                    return;
                }
                var errorEl = document.getElementById('replacementError');
                if (errorEl) errorEl.style.display = 'none';
                var confirmed = confirm('Are you sure you want ' + selectedUsername + ' to replace you for ' + day + '?');
                if (confirmed) {
                    requestReplacement(currentUser.id, selectedUserId, day).then(function(success) {
                        if (success) {
                            var today = new Date();
                            var dateStr = today.toISOString().split('T')[0];
                            recordHistory(
                                dateStr,
                                'replacement',
                                day,
                                'Requested replacement with ' + selectedUsername + ' for ' + day,
                                0,
                                selectedUsername
                            );
                            window.showToast('✅ Replacement request sent to ' + selectedUsername + '!', 'success');
                            var modalEl = document.getElementById('replacementModal');
                            if (modalEl) modalEl.style.display = 'none';
                            renderDashboard();
                            updateNotificationBadge();
                        } else {
                            window.showToast('❌ Failed to request replacement. Please try again.', 'error');
                        }
                    });
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
    var user = window.getCurrentUser();
    if (!user) return;
    var today = new Date();
    var dateStr = today.toISOString().split('T')[0];
    if (action === 'cancel') {
        closeOptOutModal();
        return;
    }
    if (action === 'notBooked') {
        var success = await removeUserFromBooking(day, user.id);
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
        var penaltySuccess = await recordPenalty(user.id, bookingId);
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
    var user = window.getCurrentUser();
    if (!user) return;
    var confirmed = confirm('⚠️ Are you sure you want to pay the $10.00 penalty? This cannot be undone.');
    if (confirmed) {
        var success = await recordPenalty(user.id, bookingId);
        if (success) {
            var today = new Date();
            var dateStr = today.toISOString().split('T')[0];
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
            var modal = document.getElementById('penaltyModal');
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
    var modal = document.getElementById('penaltyModal');
    if (modal) modal.style.display = 'flex';
    var payBtn = document.getElementById('penaltyPay');
    if (payBtn) {
        payBtn.dataset.bookingId = bookingId;
        payBtn.dataset.day = day;
    }
}

// ===== ADMIN PANEL =====
async function openAdminPanel() {
    var modal = document.getElementById('adminModal');
    if (!modal) return;
    modal.style.display = 'flex';
    var adminContent = document.getElementById('adminContent');
    var adminError = document.getElementById('adminError');
    var adminCode = document.getElementById('adminCode');
    if (adminContent) adminContent.style.display = 'none';
    if (adminError) adminError.style.display = 'none';
    if (adminCode) adminCode.value = '';
}

async function verifyAdmin() {
    var code = document.getElementById('adminCode').value;
    if (code === ADMIN_CODE) {
        var errorEl = document.getElementById('adminError');
        if (errorEl) errorEl.style.display = 'none';
        var contentEl = document.getElementById('adminContent');
        if (contentEl) contentEl.style.display = 'block';
        await loadAllUsersAvailability();
    } else {
        var errorEl = document.getElementById('adminError');
        if (errorEl) errorEl.style.display = 'block';
    }
}

async function loadAllUsersAvailability() {
    var container = document.getElementById('allUsersAvailability');
    if (!container) return;
    container.innerHTML = 'Loading...';
    try {
        var users = await getAllUsers();
        if (!users || users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        var html = '';
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            var days = user.availability || [];
            var dayNames = '';
            for (var j = 0; j < days.length; j++) {
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
    var token = window.getToken();
    if (!token) return;
    var confirmed = confirm('📢 Announce results for next week? This will send notifications to all selected players.');
    if (!confirmed) return;
    try {
        var response = await fetch(window.API_URL + '/booking/announce-results', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to announce results');
        var data = await response.json();
        window.showToast('📢 Results announced! ' + data.notified + ' players notified.', 'success');
        await renderDashboard();
    } catch (error) {
        console.error('Error announcing results:', error);
        window.showToast('❌ Failed to announce results.', 'error');
    }
}

// ===== ADMIN: VIEW ALL VOTES =====
async function viewAllVotes() {
    var token = window.getToken();
    if (!token) return;
    try {
        var response = await fetch(window.API_URL + '/booking/all-votes', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) throw new Error('Failed to fetch votes');
        var data = await response.json();
        var container = document.getElementById('allUsersAvailability');
        if (!container) return;
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color: #888;">No votes recorded yet.</p>';
            return;
        }
        var html = '<h3>📊 All User Votes</h3>';
        html += '<div class="votes-grid">';
        for (var i = 0; i < data.length; i++) {
            var user = data[i];
            var votes = user.availability || [];
            var voteCount = votes.length;
            html += '<div class="vote-card">';
            html += '<div class="vote-user">👤 ' + user.username + '</div>';
            html += '<div class="vote-count">📅 ' + voteCount + ' day' + (voteCount > 1 ? 's' : '') + '</div>';
            html += '<div class="vote-days">' + (votes.map(function(v) { return v.day; }).join(', ') || 'No votes') + '</div>';
            html += '</div>';
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
        var user = window.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        console.log('📊 Dashboard page loaded');
        console.log('👤 User:', user);
        if (localStorage.getItem('testRunMode') === 'true') {
            testRunMode = true;
        }
        var userName = document.getElementById('userName');
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
        
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function(e) {
                e.preventDefault();
                openSidePanel();
            });
        }
        var closePanel = document.getElementById('closePanel');
        if (closePanel) {
            closePanel.addEventListener('click', function(e) {
                e.preventDefault();
                closeSidePanel();
            });
        }
        var overlay = document.getElementById('panelOverlay');
        if (overlay) {
            overlay.addEventListener('click', function() {
                closeSidePanel();
            });
        }
        
        var panelMyAvailability = document.getElementById('panelMyAvailability');
        if (panelMyAvailability) {
            panelMyAvailability.addEventListener('click', function() {
                switchView('dashboard');
                var section = document.getElementById('myAvailability');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            });
        }
        var panelRules = document.getElementById('panelRules');
        if (panelRules) {
            panelRules.addEventListener('click', function() {
                switchView('rules');
            });
        }
        var panelNotifications = document.getElementById('panelNotifications');
        if (panelNotifications) {
            panelNotifications.addEventListener('click', function() {
                switchView('notifications');
            });
        }
        var panelHistory = document.getElementById('panelHistory');
        if (panelHistory) {
            panelHistory.addEventListener('click', function() {
                switchView('notifications');
            });
        }
        var panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.addEventListener('click', openAdminPanel);
        }
        var panelLogout = document.getElementById('panelLogout');
        if (panelLogout) {
            panelLogout.addEventListener('click', function() {
                window.logoutUser();
            });
        }
        
        var closeAdminModal = document.getElementById('closeAdminModal');
        if (closeAdminModal) {
            closeAdminModal.addEventListener('click', function() {
                var modal = document.getElementById('adminModal');
                if (modal) modal.style.display = 'none';
            });
        }
        window.addEventListener('click', function(e) {
            var modal = document.getElementById('adminModal');
            if (e.target === modal) {
                if (modal) modal.style.display = 'none';
            }
        });
        var verifyAdminBtn = document.getElementById('verifyAdminBtn');
        if (verifyAdminBtn) {
            verifyAdminBtn.addEventListener('click', verifyAdmin);
        }
        var adminCodeInput = document.getElementById('adminCode');
        if (adminCodeInput) {
            adminCodeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyAdmin();
            });
        }
        
        var closeOptOutModalBtn = document.getElementById('closeOptOutModal');
        if (closeOptOutModalBtn) {
            closeOptOutModalBtn.addEventListener('click', closeOptOutModal);
        }
        var optOutCancel = document.getElementById('optOutCancel');
        if (optOutCancel) {
            optOutCancel.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'cancel');
            });
        }
        var optOutNotBooked = document.getElementById('optOutNotBooked');
        if (optOutNotBooked) {
            optOutNotBooked.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'notBooked');
            });
        }
        var optOutReplace = document.getElementById('optOutReplace');
        if (optOutReplace) {
            optOutReplace.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'replace');
            });
        }
        var optOutPenalty = document.getElementById('optOutPenalty');
        if (optOutPenalty) {
            optOutPenalty.addEventListener('click', function() {
                handleOptOut(optOutDay, selectedBookingId, 'penalty');
            });
        }
        
        var closeReplacementModal = document.getElementById('closeReplacementModal');
        if (closeReplacementModal) {
            closeReplacementModal.addEventListener('click', function() {
                var modal = document.getElementById('replacementModal');
                if (modal) modal.style.display = 'none';
            });
        }
        var replacementCancel = document.getElementById('replacementCancel');
        if (replacementCancel) {
            replacementCancel.addEventListener('click', function() {
                var modal = document.getElementById('replacementModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        var closePenaltyModal = document.getElementById('closePenaltyModal');
        if (closePenaltyModal) {
            closePenaltyModal.addEventListener('click', function() {
                var modal = document.getElementById('penaltyModal');
                if (modal) modal.style.display = 'none';
            });
        }
        var penaltyCancel = document.getElementById('penaltyCancel');
        if (penaltyCancel) {
            penaltyCancel.addEventListener('click', function() {
                var modal = document.getElementById('penaltyModal');
                if (modal) modal.style.display = 'none';
            });
        }
        var penaltyPay = document.getElementById('penaltyPay');
        if (penaltyPay) {
            penaltyPay.addEventListener('click', function() {
                var bookingId = this.dataset.bookingId;
                var day = this.dataset.day;
                handlePenaltyPay(bookingId, day);
            });
        }
        
        window.addEventListener('click', function(e) {
            var optOutModal = document.getElementById('optOutModal');
            var replacementModal = document.getElementById('replacementModal');
            var penaltyModal = document.getElementById('penaltyModal');
            if (e.target === optOutModal) closeOptOutModal();
            if (e.target === replacementModal) {
                if (replacementModal) replacementModal.style.display = 'none';
            }
            if (e.target === penaltyModal) {
                if (penaltyModal) penaltyModal.style.display = 'none';
            }
        });
        
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                window.logoutUser();
            });
        }
        
        var testRunBtn = document.getElementById('testRunBtn');
        if (testRunBtn) {
            testRunBtn.addEventListener('click', function() {
                toggleTestRun();
            });
        }
        var sundayBtn = document.getElementById('sundaySimBtn');
        if (sundayBtn) {
            sundayBtn.addEventListener('click', function() {
                simulateSunday();
            });
        }
        
        var viewVotesBtn = document.getElementById('viewVotesBtn');
        if (viewVotesBtn) {
            viewVotesBtn.addEventListener('click', viewAllVotes);
        }
        var announceResultsBtn = document.getElementById('announceResultsBtn');
        if (announceResultsBtn) {
            announceResultsBtn.addEventListener('click', announceResults);
        }
        var randomSelectAllBtn = document.getElementById('randomSelectAllBtn');
        if (randomSelectAllBtn) {
            randomSelectAllBtn.addEventListener('click', function() {
                var confirmed = confirm('🎲 Randomly select players for ALL days?');
                if (!confirmed) return;
                var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                for (var i = 0; i < dayOrder.length; i++) {
                    selectRandomUser(dayOrder[i]);
                }
                setTimeout(function() {
                    renderDashboard();
                }, 2000);
                window.showToast('🎯 Random selection complete for all days!', 'success');
            });
        }
        var resetAllBtn = document.getElementById('resetAllBtn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', function() {
                var confirmed = confirm('🔄 Reset ALL days? This will clear all selections.');
                if (!confirmed) return;
                var dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                for (var i = 0; i < dayOrder.length; i++) {
                    fetch(window.API_URL + '/booking/reset/' + dayOrder[i], {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + window.getToken(),
                            'Content-Type': 'application/json'
                        }
                    });
                }
                setTimeout(function() {
                    renderDashboard();
                }, 1000);
                window.showToast('🔄 All days reset successfully!', 'success');
            });
        }
    }
});
