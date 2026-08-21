// Booking functions - Two Week Table with Correct Dates

console.log('📚 booking.js loaded');

const ADMIN_CODE = 'admin123';
let optOutDay = null;
let selectedBookingId = null;
let currentUser = null;
let currentView = 'dashboard';

// ===== TEST RUN MODE =====
let testRunMode = false;
let testRunDay = 1;

// Sample users for simulation
const SAMPLE_USERS = [
    { id: 'user1', username: 'john_doe', full_name: 'John Doe' },
    { id: 'user2', username: 'jane_smith', full_name: 'Jane Smith' },
    { id: 'user3', username: 'bob_wilson', full_name: 'Bob Wilson' },
    { id: 'user4', username: 'alice_brown', full_name: 'Alice Brown' },
    { id: 'user5', username: 'charlie_davis', full_name: 'Charlie Davis' },
    { id: 'user6', username: 'emma_jones', full_name: 'Emma Jones' },
    { id: 'user7', username: 'mike_miller', full_name: 'Mike Miller' },
];

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
        document.getElementById('testRunStatus').textContent = '';
        document.getElementById('testRunStatus').style.color = '#666';
        document.getElementById('testRunBtn').textContent = '🧪 Test Run';
        document.getElementById('testRunBtn').className = 'btn btn-warning btn-sm';
        window.showToast('🔴 Test Run disabled', 'info');
        if (document.getElementById('testRunType')) {
            document.getElementById('testRunType').textContent = '';
        }
        localStorage.removeItem('simulateSunday');
    } else {
        testRunMode = true;
        localStorage.setItem('testRunMode', 'true');
        document.getElementById('testRunStatus').textContent = '🧪 TEST RUN ACTIVE - Simulating Monday (Selection Open)';
        document.getElementById('testRunStatus').style.color = '#f59e0b';
        document.getElementById('testRunBtn').textContent = '🔴 Disable Test Run';
        document.getElementById('testRunBtn').className = 'btn btn-danger btn-sm';
        window.showToast('🧪 Test Run activated - Simulating Monday!', 'success');
        localStorage.removeItem('simulateSunday');
    }
    renderDashboard();
}

function simulateSunday() {
    testRunMode = true;
    localStorage.setItem('testRunMode', 'true');
    localStorage.setItem('simulateSunday', 'true');
    
    document.getElementById('testRunStatus').textContent = '🧪 TEST RUN ACTIVE - Simulating Sunday (Final Selection)';
    document.getElementById('testRunStatus').style.color = '#f56565';
    document.getElementById('testRunBtn').textContent = '🔴 Disable Test Run';
    document.getElementById('testRunBtn').className = 'btn btn-danger btn-sm';
    if (document.getElementById('testRunType')) {
        document.getElementById('testRunType').textContent = 'Sunday Simulation - Final Court Bookers';
        document.getElementById('testRunType').style.color = '#f56565';
    }
    window.showToast('🧪 Sunday Simulation activated - Showing simulated court bookers!', 'success');
    renderDashboard();
}

function disableSimulation() {
    testRunMode = false;
    localStorage.removeItem('testRunMode');
    localStorage.removeItem('simulateSunday');
    document.getElementById('testRunStatus').textContent = '';
    document.getElementById('testRunStatus').style.color = '#666';
    document.getElementById('testRunBtn').textContent = '🧪 Test Run';
    document.getElementById('testRunBtn').className = 'btn btn-warning btn-sm';
    if (document.getElementById('testRunType')) {
        document.getElementById('testRunType').textContent = '';
    }
    renderDashboard();
}

document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('testRunMode') === 'true') {
        testRunMode = true;
        testRunDay = 1;
        const statusEl = document.getElementById('testRunStatus');
        const btn = document.getElementById('testRunBtn');
        const isSunday = localStorage.getItem('simulateSunday') === 'true';
        if (statusEl) {
            if (isSunday) {
                statusEl.textContent = '🧪 TEST RUN ACTIVE - Simulating Sunday (Final Selection)';
                statusEl.style.color = '#f56565';
            } else {
                statusEl.textContent = '🧪 TEST RUN ACTIVE - Simulating Monday (Selection Open)';
                statusEl.style.color = '#f59e0b';
            }
        }
        if (btn) {
            btn.textContent = '🔴 Disable Test Run';
            btn.className = 'btn btn-danger btn-sm';
        }
        if (isSunday && document.getElementById('testRunType')) {
            document.getElementById('testRunType').textContent = 'Sunday Simulation - Final Court Bookers';
            document.getElementById('testRunType').style.color = '#f56565';
        }
    }
});

function isSelectionWindowOpen() {
    const now = new Date();
    let day = now.getDay();
    
    if (testRunMode) {
        const isSunday = localStorage.getItem('simulateSunday') === 'true';
        if (isSunday) {
            return false;
        }
        return true;
    }
    
    return day === 1;
}

function getSelectionStatus() {
    const now = new Date();
    const day = now.getDay();
    const isSunday = localStorage.getItem('simulateSunday') === 'true';
    
    if (testRunMode && isSunday) {
        return {
            status: 'sunday',
            message: '🧪 TEST RUN: Simulating Sunday - FINAL COURT BOOKERS',
            className: 'sunday'
        };
    }
    
    if (testRunMode) {
        return {
            status: 'open',
            message: '🧪 TEST RUN: Simulating Monday - Selection OPEN',
            className: 'open'
        };
    }
    
    if (day !== 1) {
        const nextMonday = new Date(now);
        const daysUntilMonday = day === 0 ? 1 : 8 - day;
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        const dateStr = nextMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
            status: 'closed',
            message: '🔒 Selection opens Monday ' + dateStr + ' (all day)',
            className: 'closed'
        };
    }
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const diffMs = endOfDay - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
        status: 'open',
        message: '🔓 Selection OPEN - ' + diffHrs + 'h ' + diffMin + 'm remaining',
        className: 'open'
    };
}

// ============ RULES DATA ============
const RULES_DATA = [
    {
        category: '📋 Booking Rules',
        rules: [
            'Selection opens every Monday (12:00 AM - 11:59 PM)',
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
            'The replacement must be approved by the admin',
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
        category: '📅 Selection Window',
        rules: [
            'Selection opens: Monday 12:00 AM',
            'Selection closes: Monday 11:59 PM',
            'You have 24 hours to make your selections',
            'After closing, you can only view your selections',
            'Selected players are chosen on Sunday night for the following week'
        ]
    }
];

// ============ MENU FUNCTIONS ============
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

// ============ VIEW SWITCHING ============
function switchView(view) {
    currentView = view;
    document.getElementById('dashboardView').style.display = view === 'dashboard' ? 'block' : 'none';
    document.getElementById('rulesView').style.display = view === 'rules' ? 'block' : 'none';
    document.getElementById('notificationsView').style.display = view === 'notifications' ? 'block' : 'none';
    document.getElementById('historyView').style.display = view === 'history' ? 'block' : 'none';
    
    if (view === 'rules') renderRulesPage();
    if (view === 'notifications') renderNotificationsPage();
    if (view === 'history') renderHistoryPage();
    closeSidePanel();
}

// ============ RULES PAGE ============
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

// ============ HISTORY PAGE ============
async function renderHistoryPage() {
    const container = document.getElementById('historyList');
    if (!container) return;
    container.innerHTML = 'Loading history...';
    
    try {
        const token = window.getToken();
        if (!token) {
            container.innerHTML = '<p style="color: #888;">Please login to view history.</p>';
            return;
        }
        
        const response = await fetch(window.API_URL + '/booking/my-history', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            container.innerHTML = '<p style="color: #888;">No history found.</p>';
            return;
        }
        
        const history = await response.json();
        
        if (!history || history.length === 0) {
            container.innerHTML = '<p style="color: #888;">📜 No history yet. Start playing!</p>';
            return;
        }
        
        let html = '<h3>📜 Your Booking History</h3>';
        html += '<p style="color: #666;margin-bottom:20px;">Showing your last 50 records.</p>';
        
        const grouped = {};
        for (let i = 0; i < history.length; i++) {
            const item = history[i];
            const date = new Date(item.created_at);
            const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        }
        
        const keys = Object.keys(grouped);
        for (let k = 0; k < keys.length; k++) {
            const monthKey = keys[k];
            html += '<div style="margin-top:20px;">';
            html += '<h4 style="color:#2d3748;border-bottom:2px solid #667eea;padding-bottom:5px;">' + monthKey + '</h4>';
            for (let i = 0; i < grouped[monthKey].length; i++) {
                const item = grouped[monthKey][i];
                const statusIcon = item.status === 'played' ? '🟢' : 
                                  item.status === 'cancelled' ? '🟡' : 
                                  item.status === 'cancelled_with_penalty' ? '🔴' : '💰';
                const statusText = item.status === 'played' ? 'Played' : 
                                  item.status === 'cancelled' ? 'Cancelled (No penalty)' : 
                                  item.status === 'cancelled_with_penalty' ? 'Cancelled (Penalty paid)' : 'Penalty';
                html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;">';
                html += '<span>' + statusIcon + ' ' + item.day + ' - ' + new Date(item.created_at).toLocaleDateString() + '</span>';
                html += '<span style="color:' + (item.status === 'played' ? '#48bb78' : item.status === 'cancelled' ? '#f59e0b' : '#f56565') + ';">' + statusText + '</span>';
                html += '</div>';
            }
            html += '</div>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading history:', error);
        container.innerHTML = '<p style="color: red;">Failed to load history.</p>';
    }
}

// ============ NOTIFICATIONS PAGE ============
async function renderNotificationsPage() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    container.innerHTML = 'Loading notifications...';
    try {
        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p style="color: #888;">Please login to view notifications.</p>';
            return;
        }
        const token = window.getToken();
        const response = await fetch(window.API_URL + '/booking/my-penalties', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) {
            container.innerHTML = '<p style="color: #888;">No notifications.</p>';
            return;
        }
        const penalties = await response.json();
        if (!penalties || penalties.length === 0) {
            container.innerHTML = '<p style="color: #888;">🎉 No notifications! You have no pending penalties.</p>';
            const badge = document.getElementById('notificationBadge');
            if (badge) badge.style.display = 'none';
            return;
        }
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = penalties.length;
        }
        let html = '<h3>💰 Pending Penalties</h3>';
        html += '<p style="color: #666;margin-bottom:20px;">You have ' + penalties.length + ' penalty(ies) that need to be paid.</p>';
        for (let i = 0; i < penalties.length; i++) {
            const p = penalties[i];
            html += '<div class="notification-item">';
            html += '<div class="notification-icon">💰</div>';
            html += '<div class="notification-content">';
            html += '<div class="notification-title">Penalty for ' + (p.day || 'Unknown day') + '</div>';
            html += '<div class="notification-details">Amount: $' + (p.amount || '10.00') + ' | Status: ' + (p.status || 'pending') + '</div>';
            html += '<div class="notification-date">' + new Date(p.created_at).toLocaleDateString() + '</div>';
            html += '<button class="btn btn-danger btn-sm pay-penalty-btn" data-id="' + p.id + '">Pay Now</button>';
            html += '</div>';
            html += '</div>';
        }
        container.innerHTML = html;
        const payBtns = container.querySelectorAll('.pay-penalty-btn');
        for (let i = 0; i < payBtns.length; i++) {
            payBtns[i].addEventListener('click', function() {
                const id = this.dataset.id;
                if (confirm('Are you sure you want to pay this penalty?')) {
                    payPenalty(id);
                }
            });
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<p style="color: red;">Failed to load notifications.</p>';
    }
}

async function payPenalty(penaltyId) {
    const token = window.getToken();
    if (!token) return;
    try {
        const response = await fetch(window.API_URL + '/booking/pay-penalty', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ penalty_id: penaltyId })
        });
        if (!response.ok) throw new Error('Failed to pay penalty');
        window.showToast('✅ Penalty paid successfully!', 'success');
        await renderNotificationsPage();
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const current = parseInt(badge.textContent) || 0;
            if (current <= 1) {
                badge.style.display = 'none';
            } else {
                badge.textContent = current - 1;
            }
        }
    } catch (error) {
        console.error('Error paying penalty:', error);
        window.showToast('❌ Failed to pay penalty.', 'error');
    }
}

// ============ DASHBOARD FUNCTIONS ============
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

function canEdit() {
    return isSelectionWindowOpen();
}

async function getAvailability(weekType) {
    const token = window.getToken();
    if (!token) return [];
    try {
        const response = await fetch(window.API_URL + '/booking/availability?week=' + weekType, {
            headers: { 'Authorization': 'Bearer ' + token }
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
        alert('❌ Selection window is CLOSED. It opens every Monday (all day).');
        return;
    }
    try {
        const response = await fetch(window.API_URL + '/booking/select/' + day, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: date })
        });
        if (!response.ok) throw new Error('Failed to update availability');
        const data = await response.json();
        window.showToast(data.message, 'success');
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
        const response = await fetch(window.API_URL + '/booking/my-availability', {
            headers: { 'Authorization': 'Bearer ' + token }
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
        const response = await fetch(window.API_URL + '/booking/all-users', {
            headers: { 'Authorization': 'Bearer ' + token }
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
        const response = await fetch(window.API_URL + '/booking/this-week-bookers', {
            headers: { 'Authorization': 'Bearer ' + token }
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
        const response = await fetch(window.API_URL + '/booking/selected-players', {
            headers: { 'Authorization': 'Bearer ' + token }
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
        const response = await fetch(window.API_URL + '/booking/availability?week=next', {
            headers: { 'Authorization': 'Bearer ' + token }
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
        const response = await fetch(window.API_URL + '/booking/select/' + day, {
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

async function addReplacement(originalUserId, replacementUserId, day) {
    const token = window.getToken();
    if (!token) return false;
    try {
        const response = await fetch(window.API_URL + '/booking/replace', {
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
        const response = await fetch(window.API_URL + '/booking/penalty', {
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

// ============ RENDER FUNCTIONS ============
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

// ============ TWO WEEK TABLE WITH CORRECT DATES ============
async function renderTwoWeekTable() {
    const tbody = document.getElementById('selectedPlayersBody');
    if (!tbody) return;
    
    const isSunday = localStorage.getItem('simulateSunday') === 'true';
    const isTestRun = localStorage.getItem('testRunMode') === 'true';
    
    // Get correct dates for both weeks
    const thisWeekDates = getThisWeekDates();
    const nextWeekDates = getNextWeekDates();
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Show Sunday indicator if active
    if (isSunday && isTestRun) {
        document.getElementById('sundayIndicator').style.display = 'inline';
    } else {
        document.getElementById('sundayIndicator').style.display = 'none';
    }
    
    // Get real data (or empty)
    let thisWeekBookers = [];
    let nextWeekSelected = [];
    
    try {
        thisWeekBookers = await getThisWeekBookers();
    } catch (e) { console.error('Error fetching this week bookers:', e); }
    
    try {
        nextWeekSelected = await getNextWeekSelected();
    } catch (e) { console.error('Error fetching next week selected:', e); }
    
    // If in Sunday simulation mode and no real data, generate simulated data
    if (isSunday && isTestRun) {
        const simulatedThisWeek = getSimulatedThisWeekBookers();
        const simulatedNextWeek = getSimulatedNextWeekBookers();
        thisWeekBookers = simulatedThisWeek;
        nextWeekSelected = simulatedNextWeek;
    }
    
    // Build the table
    let html = '';
    let hasData = false;
    
    for (let i = 0; i < dayOrder.length; i++) {
        const day = dayOrder[i];
        
        // THIS WEEK - using getThisWeekDates()
        const thisWeekDateObj = thisWeekDates.find(function(d) { return d.day === day; });
        const thisWeekDateStr = thisWeekDateObj ? thisWeekDateObj.dateString : 'TBD';
        const thisWeekBooker = thisWeekBookers.find(function(b) { return b.day === day; });
        let thisWeekDisplay = '❌ No booker';
        if (thisWeekBooker && thisWeekBooker.selected_user) {
            hasData = true;
            const user = thisWeekBooker.selected_user;
            thisWeekDisplay = '👤 <strong>' + user.username + '</strong><br><span style="font-size:0.85rem;color:#666;">' + (user.full_name || user.username) + '</span>';
        }
        
        // NEXT WEEK - using getNextWeekDates()
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
        // Day column - show the day name and the date for THIS week (as the primary date)
        html += '<td><strong>' + day + '</strong><br><span style="font-size:0.8rem;color:#888;">' + thisWeekDateStr + '</span></td>';
        // This Week column - shows the date for this week too
        html += '<td>' + thisWeekDisplay + '<br><span style="font-size:0.7rem;color:#888;">' + thisWeekDateStr + '</span></td>';
        // Next Week column - shows the date for next week
        html += '<td>' + nextWeekDisplay + '<br><span style="font-size:0.7rem;color:#888;">' + nextWeekDateStr + '</span></td>';
        html += '</tr>';
    }
    
    if (!hasData) {
        if (isSunday && isTestRun) {
            html = '<tr><td colspan="3" style="text-align:center;color:#888;padding:30px;">📅 No simulated data available. Please make selections first or check back later.</td></tr>';
        } else {
            html = '<tr><td colspan="3" style="text-align:center;color:#888;padding:30px;">No bookings found. Click "Simulate Sunday" to see a preview.</td></tr>';
        }
    }
    
    tbody.innerHTML = html;
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

function openOptOutModal(day, bookingId) {
    optOutDay = day;
    selectedBookingId = bookingId;
    document.getElementById('optOutDay').textContent = day;
    document.getElementById('optOutModal').style.display = 'flex';
}

function closeOptOutModal() {
    document.getElementById('optOutModal').style.display = 'none';
    optOutDay = null;
    selectedBookingId = null;
}

let isAdmin = false;

async function renderDashboard() {
    const daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    try {
        const user = window.getCurrentUser();
        currentUser = user;
        isAdmin = await window.checkAdmin();
        const canEditBool = canEdit();
        const selectionStatus = getSelectionStatus();
        const weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay) {
            const weekDates = getNextWeekDates();
            if (weekDates.length > 0) {
                const start = weekDates[0].dateString;
                const end = weekDates[6].dateString;
                weekDisplay.textContent = '📅 Selecting for (Next Week): ' + start + ' - ' + end;
            }
        }
        const statusContainer = document.getElementById('selectionStatus');
        if (statusContainer) {
            const indicator = statusContainer.querySelector('.status-indicator');
            const text = statusContainer.querySelector('.status-text');
            if (indicator && text) {
                indicator.className = 'status-indicator ' + selectionStatus.className;
                text.className = 'status-text ' + selectionStatus.className;
                text.textContent = selectionStatus.message;
            }
        }
        const warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = canEditBool ? 'none' : 'block';
        }
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
        }
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.style.display = isAdmin ? 'block' : 'none';
        }
        const bookings = await getAvailability('next');
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
        await renderTwoWeekTable();
        await checkNotifications();
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        daysGrid.innerHTML = '<div class="error-message">Failed to load availability. Please refresh.</div>';
    }
}

async function checkNotifications() {
    try {
        const token = window.getToken();
        if (!token) return;
        const response = await fetch(window.API_URL + '/booking/my-penalties', {
            headers: { 'Authorization': 'Bearer ' + token }
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

// ============ ADMIN PANEL ============
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
        document.getElementById('adminError').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        await loadAllUsersAvailability();
    } else {
        document.getElementById('adminError').style.display = 'block';
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

// ============ REPLACEMENT WITH ALL USERS ============
async function openReplacementModal(day) {
    document.getElementById('replaceDay').textContent = day;
    document.getElementById('replacementModal').style.display = 'flex';
    const container = document.getElementById('replacementList');
    container.innerHTML = 'Loading users...';
    
    try {
        const allUsers = await getAllUsers();
        const currentUser = window.getCurrentUser();
        const availableUsers = allUsers.filter(function(user) {
            return user.id !== currentUser?.id;
        });
        
        if (availableUsers.length === 0) {
            container.innerHTML = '<p style="color: #888;">No other users found in the system.</p>';
            return;
        }
        
        let html = '<p style="color:#666;margin-bottom:15px;">Select a replacement from all registered users:</p>';
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
                    document.getElementById('replacementError').style.display = 'block';
                    return;
                }
                
                document.getElementById('replacementError').style.display = 'none';
                
                const confirmed = confirm('Are you sure you want ' + selectedUsername + ' to replace you for ' + day + '?');
                if (confirmed) {
                    const success = await addReplacement(currentUser.id, selectedUserId, day);
                    if (success) {
                        window.showToast('✅ ' + selectedUsername + ' has been added as your replacement.', 'success');
                        document.getElementById('replacementModal').style.display = 'none';
                        await renderDashboard();
                    } else {
                        window.showToast('❌ Failed to add replacement. Please try again.', 'error');
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading users for replacement:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users. Please try again.</p>';
    }
}

// ============ OPT OUT HANDLERS ============
async function handleOptOut(day, bookingId, action) {
    const user = window.getCurrentUser();
    if (!user) return;
    if (action === 'cancel') {
        closeOptOutModal();
        return;
    }
    if (action === 'notBooked') {
        const success = await removeUserFromBooking(day, user.id);
        if (success) {
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
        closeOptOutModal();
        openPenaltyModal(day, bookingId);
        return;
    }
}

function openPenaltyModal(day, bookingId) {
    document.getElementById('penaltyModal').style.display = 'flex';
    document.getElementById('penaltyPay').dataset.bookingId = bookingId;
    document.getElementById('penaltyPay').dataset.day = day;
}

async function handlePenaltyPay(bookingId, day) {
    const user = window.getCurrentUser();
    if (!user) return;
    const confirmed = confirm('⚠️ Are you sure you want to pay the $10.00 penalty? This cannot be undone.');
    if (confirmed) {
        const success = await recordPenalty(user.id, bookingId);
        if (success) {
            await removeUserFromBooking(day, user.id);
            window.showToast('💰 Penalty paid. You have been removed from the booking.', 'success');
            document.getElementById('penaltyModal').style.display = 'none';
            await renderDashboard();
            await renderNotificationsPage();
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
    }
}

// ============ INITIALIZATION ============
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
        document.getElementById('panelMyAvailability').addEventListener('click', function() {
            switchView('dashboard');
            const section = document.getElementById('myAvailability');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        });
        document.getElementById('panelRules').addEventListener('click', function() {
            switchView('rules');
        });
        document.getElementById('panelNotifications').addEventListener('click', function() {
            switchView('notifications');
        });
        document.getElementById('panelHistory').addEventListener('click', function() {
            switchView('history');
        });
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.addEventListener('click', openAdminPanel);
        }
        document.getElementById('panelLogout').addEventListener('click', function() {
            window.logoutUser();
        });
        
        // ADMIN MODAL
        document.getElementById('closeAdminModal').addEventListener('click', function() {
            document.getElementById('adminModal').style.display = 'none';
        });
        window.addEventListener('click', function(e) {
            const modal = document.getElementById('adminModal');
            if (e.target === modal) modal.style.display = 'none';
        });
        document.getElementById('verifyAdminBtn').addEventListener('click', verifyAdmin);
        document.getElementById('adminCode').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') verifyAdmin();
        });
        
        // OPT OUT MODAL
        document.getElementById('closeOptOutModal').addEventListener('click', closeOptOutModal);
        document.getElementById('optOutCancel').addEventListener('click', function() {
            handleOptOut(optOutDay, selectedBookingId, 'cancel');
        });
        document.getElementById('optOutNotBooked').addEventListener('click', function() {
            handleOptOut(optOutDay, selectedBookingId, 'notBooked');
        });
        document.getElementById('optOutReplace').addEventListener('click', function() {
            handleOptOut(optOutDay, selectedBookingId, 'replace');
        });
        document.getElementById('optOutPenalty').addEventListener('click', function() {
            handleOptOut(optOutDay, selectedBookingId, 'penalty');
        });
        
        // REPLACEMENT MODAL
        document.getElementById('closeReplacementModal').addEventListener('click', function() {
            document.getElementById('replacementModal').style.display = 'none';
        });
        document.getElementById('replacementCancel').addEventListener('click', function() {
            document.getElementById('replacementModal').style.display = 'none';
        });
        
        // PENALTY MODAL
        document.getElementById('closePenaltyModal').addEventListener('click', function() {
            document.getElementById('penaltyModal').style.display = 'none';
        });
        document.getElementById('penaltyCancel').addEventListener('click', function() {
            document.getElementById('penaltyModal').style.display = 'none';
        });
        document.getElementById('penaltyPay').addEventListener('click', function() {
            const bookingId = this.dataset.bookingId;
            const day = this.dataset.day;
            handlePenaltyPay(bookingId, day);
        });
        
        // CLICK OUTSIDE MODALS
        window.addEventListener('click', function(e) {
            const optOutModal = document.getElementById('optOutModal');
            const replacementModal = document.getElementById('replacementModal');
            const penaltyModal = document.getElementById('penaltyModal');
            if (e.target === optOutModal) closeOptOutModal();
            if (e.target === replacementModal) document.getElementById('replacementModal').style.display = 'none';
            if (e.target === penaltyModal) document.getElementById('penaltyModal').style.display = 'none';
        });
        
        document.getElementById('logoutBtn').addEventListener('click', function() {
            window.logoutUser();
        });
        
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
    }
});
