// Booking functions

console.log('📚 booking.js loaded');

const ADMIN_CODE = 'admin123';
let optOutDay = null;
let selectedBookingId = null;
let currentUser = null;
let currentView = 'dashboard';

// RULES DATA
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
            'You can find a replacement from the available players list',
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
            'Admin will randomly select players after the window closes'
        ]
    }
];

// Get next week's dates
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

function isSelectionWindowOpen() {
    const now = new Date();
    const day = now.getDay();
    // Check if admin has opened bookings
    const adminOpen = localStorage.getItem('adminOpenBookings') === 'true';
    return day === 1 || adminOpen;
}

function getTimeRemaining() {
    const now = new Date();
    const day = now.getDay();
    
    if (day !== 1) {
        const adminOpen = localStorage.getItem('adminOpenBookings') === 'true';
        if (adminOpen) return 'Admin has opened bookings';
        return 'Window closed';
    }
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const diffMs = endOfDay - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMin}m remaining`;
}

function canEdit() {
    return isSelectionWindowOpen();
}

function getSelectionStatus() {
    const now = new Date();
    const day = now.getDay();
    const adminOpen = localStorage.getItem('adminOpenBookings') === 'true';
    
    if (adminOpen) {
        return {
            status: 'open',
            message: '🔓 Admin has opened bookings',
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
    
    const remaining = getTimeRemaining();
    return {
        status: 'open',
        message: '🔓 Selection OPEN - ' + remaining,
        className: 'open'
    };
}

// RULES PAGE
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

// NOTIFICATIONS PAGE
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
        
        // Get pending penalties for this user
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
            // Update badge
            document.getElementById('notificationBadge').style.display = 'none';
            return;
        }
        
        // Update badge
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
        
        // Add event listeners for pay buttons
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
        // Update badge
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

// DASHBOARD FUNCTIONS
async function getAvailability(weekType = 'next') {
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

async function getAllUsersAvailability() {
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

async function getSelectedPlayers() {
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
        return booking?.available_users || [];
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

// ADMIN: Open all bookings
async function openAllBookings() {
    if (!confirm('⚠️ Are you sure you want to open all bookings? This will allow all users to select their availability for next week.')) return;
    
    // Store in localStorage so all users can see it
    localStorage.setItem('adminOpenBookings', 'true');
    
    // Also send to server to persist
    const token = window.getToken();
    if (token) {
        try {
            await fetch(window.API_URL + '/booking/admin-open', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ open: true })
            });
        } catch (error) {
            console.error('Error notifying server:', error);
        }
    }
    
    document.getElementById('openAllStatus').textContent = '✅ Bookings are now OPEN for everyone!';
    document.getElementById('openAllStatus').style.color = '#48bb78';
    window.showToast('✅ Bookings opened for all users!', 'success');
    await renderDashboard();
}

// ADMIN: Close all bookings
async function closeAllBookings() {
    localStorage.setItem('adminOpenBookings', 'false');
    
    const token = window.getToken();
    if (token) {
        try {
            await fetch(window.API_URL + '/booking/admin-open', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ open: false })
            });
        } catch (error) {
            console.error('Error notifying server:', error);
        }
    }
    
    document.getElementById('openAllStatus').textContent = '🔒 Bookings closed';
    document.getElementById('openAllStatus').style.color = '#f56565';
    window.showToast('🔒 Bookings closed', 'info');
    await renderDashboard();
}

// RENDER FUNCTIONS
function renderDayCard(dayData, canEditBool, isBooked) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const currentUser = window.getCurrentUser();
    const isUserAvailable = dayData.available_users && dayData.available_users.some(function(u) { return u.id === currentUser?.id; });
    const isSelectedUser = isBooked && dayData.selected_user && dayData.selected_user.id === currentUser?.id;
    
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
    const disabledText = !canEditBool ? ' (Locked)' : '';
    
    card.innerHTML = '<div class="day-name">' + displayName + '</div>' +
        '<div class="day-status">' + dayStatus + '</div>' +
        selectedUserHtml +
        '<button class="' + buttonClass + ' btn btn-sm" data-day="' + dayData.day + '" ' + disabledAttr + '>' +
        buttonText + disabledText +
        '</button>';
    
    if (canEditBool) {
        var btn = card.querySelector('.in-btn');
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var day = this.dataset.day;
            var date = dayData.date;
            if (isUserAvailable) {
                handleToggleAvailability(day, date);
            } else {
                handleToggleAvailability(day, date);
            }
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
        html += '<div class="my-availability-item">' +
            '<span class="day-name">' + statusIcon + ' ' + day.day + ' - ' + (day.date || 'Next Week') + '</span>' +
            '<button class="btn btn-danger btn-xs opt-out-btn" data-day="' + day.day + '" data-booking-id="' + (day.booking_id || '') + '">Opt Out</button>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    
    var btns = container.querySelectorAll('.opt-out-btn');
    for (var j = 0; j < btns.length; j++) {
        btns[j].addEventListener('click', function(e) {
            e.stopPropagation();
            var day = this.dataset.day;
            var bookingId = this.dataset.bookingId;
            openOptOutModal(day, bookingId);
        });
    }
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

function getBookedDays(bookings) {
    var booked = [];
    for (var i = 0; i < bookings.length; i++) {
        if (bookings[i].is_booked) {
            booked.push(bookings[i].day);
        }
    }
    return booked;
}

function renderSelectedPlayers(selected) {
    var container = document.getElementById('selectedPlayersGrid');
    if (!container) return;
    
    if (!selected || selected.length === 0) {
        container.innerHTML = '<p style="color: #888;">No players selected yet for this week.</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < selected.length; i++) {
        var item = selected[i];
        html += '<div class="selected-player-card">' +
            '<div class="day-name">' + item.day + '</div>' +
            '<div class="player-name">' + (item.selected_user ? item.selected_user.username : 'Not selected') + '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

var currentWeekView = 'next';
var isAdmin = false;

async function renderDashboard() {
    var daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    
    try {
        var user = window.getCurrentUser();
        currentUser = user;
        isAdmin = await window.checkAdmin();
        var canEditBool = canEdit();
        var selectionStatus = getSelectionStatus();
        
        var weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay) {
            var weekDates = getWeekDates();
            if (weekDates.length > 0) {
                var start = weekDates[0].dateString;
                var end = weekDates[6].dateString;
                var label = currentWeekView === 'next' ? 'Selecting for (Next Week)' : 'This Week';
                weekDisplay.textContent = '📅 ' + label + ': ' + start + ' - ' + end;
            }
        }
        
        var statusContainer = document.getElementById('selectionStatus');
        if (statusContainer) {
            var indicator = statusContainer.querySelector('.status-indicator');
            var text = statusContainer.querySelector('.status-text');
            if (indicator && text) {
                indicator.className = 'status-indicator ' + selectionStatus.className;
                text.className = 'status-text ' + selectionStatus.className;
                text.textContent = selectionStatus.message;
            }
        }
        
        var warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = canEditBool ? 'none' : 'block';
        }
        
        var adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
            if (isAdmin) {
                var openBtn = document.getElementById('openAllBookingsBtn');
                if (openBtn) {
                    openBtn.onclick = function() {
                        if (localStorage.getItem('adminOpenBookings') === 'true') {
                            closeAllBookings();
                        } else {
                            openAllBookings();
                        }
                    };
                    // Update button text
                    if (localStorage.getItem('adminOpenBookings') === 'true') {
                        openBtn.textContent = '🔒 Close All Bookings';
                        document.getElementById('openAllStatus').textContent = '✅ Bookings are OPEN for everyone!';
                        document.getElementById('openAllStatus').style.color = '#48bb78';
                    } else {
                        openBtn.textContent = '🔓 Open All Bookings';
                        document.getElementById('openAllStatus').textContent = '';
                    }
                }
            }
        }
        
        var panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.style.display = isAdmin ? 'block' : 'none';
        }
        
        var bookings = await getAvailability(currentWeekView);
        var weekDates = getWeekDates();
        var bookedDays = getBookedDays(bookings);
        
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
            for (var k = 0; k < bookings.length; k++) {
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
                available_users: booking.available_users,
                time: booking.time,
                date: dateObj ? dateObj.dateString : null
            });
        }
        
        daysGrid.innerHTML = '';
        for (var m = 0; m < sortedBookings.length; m++) {
            var day = sortedBookings[m];
            var isBooked = bookedDays.indexOf(day.day) !== -1;
            var card = renderDayCard(day, canEditBool, isBooked);
            daysGrid.appendChild(card);
        }
        
        var myAvailability = await getMyAvailability();
        renderMyAvailability(myAvailability, bookedDays);
        
        var selected = await getSelectedPlayers();
        renderSelectedPlayers(selected);
        
        // Check notifications
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

function getWeekDates() {
    if (currentWeekView === 'next') {
        return getNextWeekDates();
    } else {
        return getThisWeekDates();
    }
}

async function handleToggleAvailability(day, date) {
    var result = await toggleAvailability(day, date);
    if (result) await renderDashboard();
}

// ADMIN PANEL
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
        document.getElementById('adminError').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        await loadAllUsersAvailability();
    } else {
        document.getElementById('adminError').style.display = 'block';
    }
}

async function loadAllUsersAvailability() {
    var container = document.getElementById('allUsersAvailability');
    if (!container) return;
    container.innerHTML = 'Loading...';
    
    try {
        var users = await getAllUsersAvailability();
        
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

// SIDE PANEL
function openSidePanel() {
    var panel = document.getElementById('sidePanel');
    var main = document.getElementById('mainContent');
    if (panel) panel.classList.add('open');
    if (main) main.classList.add('shifted');
}

function closeSidePanel() {
    var panel = document.getElementById('sidePanel');
    var main = document.getElementById('mainContent');
    if (panel) panel.classList.remove('open');
    if (main) main.classList.remove('shifted');
}

// Switch Views
function switchView(view) {
    currentView = view;
    document.getElementById('dashboardView').style.display = view === 'dashboard' ? 'block' : 'none';
    document.getElementById('rulesView').style.display = view === 'rules' ? 'block' : 'none';
    document.getElementById('notificationsView').style.display = view === 'notifications' ? 'block' : 'none';
    
    if (view === 'rules') renderRulesPage();
    if (view === 'notifications') renderNotificationsPage();
    closeSidePanel();
}

// OPT OUT HANDLERS
async function handleOptOut(day, bookingId, action) {
    var user = window.getCurrentUser();
    if (!user) return;
    
    if (action === 'cancel') {
        closeOptOutModal();
        return;
    }
    
    if (action === 'notBooked') {
        var success = await removeUserFromBooking(day, user.id);
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

async function openReplacementModal(day) {
    document.getElementById('replaceDay').textContent = day;
    document.getElementById('replacementModal').style.display = 'flex';
    
    var container = document.getElementById('replacementList');
    container.innerHTML = 'Loading players...';
    
    try {
        var users = await getAvailableUsersForDay(day);
        var currentUser = window.getCurrentUser();
        
        var availableUsers = [];
        for (var i = 0; i < users.length; i++) {
            if (users[i].id !== currentUser?.id) {
                availableUsers.push(users[i]);
            }
        }
        
        if (availableUsers.length === 0) {
            container.innerHTML = '<p style="color: #888;">No other players available for this day.</p>';
            return;
        }
        
        var html = '';
        for (var j = 0; j < availableUsers.length; j++) {
            var user = availableUsers[j];
            html += '<div class="replacement-item">' +
                '<span class="username">👤 ' + user.username + '</span>' +
                '<button class="btn btn-success btn-sm select-replacement" data-user-id="' + user.id + '" data-username="' + user.username + '">Select</button>' +
                '</div>';
        }
        container.innerHTML = html;
        
        var btns = container.querySelectorAll('.select-replacement');
        for (var k = 0; k < btns.length; k++) {
            btns[k].addEventListener('click', async function() {
                var userId = this.dataset.userId;
                var username = this.dataset.username;
                var confirmed = confirm('Are you sure you want ' + username + ' to replace you for ' + day + '?');
                if (confirmed) {
                    var success = await addReplacement(currentUser.id, userId, day);
                    if (success) {
                        window.showToast('✅ ' + username + ' has been added as your replacement.', 'success');
                        document.getElementById('replacementModal').style.display = 'none';
                        await renderDashboard();
                    } else {
                        window.showToast('❌ Failed to add replacement. Please try again.', 'error');
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading replacement users:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users.</p>';
    }
}

function openPenaltyModal(day, bookingId) {
    document.getElementById('penaltyModal').style.display = 'flex';
    document.getElementById('penaltyPay').dataset.bookingId = bookingId;
    document.getElementById('penaltyPay').dataset.day = day;
}

async function handlePenaltyPay(bookingId, day) {
    var user = window.getCurrentUser();
    if (!user) return;
    
    var confirmed = confirm('⚠️ Are you sure you want to pay the $10.00 penalty? This cannot be undone.');
    if (confirmed) {
        var success = await recordPenalty(user.id, bookingId);
        if (success) {
            await removeUserFromBooking(day, user.id);
            window.showToast('💰 Penalty paid. You have been removed from the booking.', 'success');
            document.getElementById('penaltyModal').style.display = 'none';
            await renderDashboard();
            // Refresh notifications
            await renderNotificationsPage();
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        var user = window.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        console.log('📊 Dashboard page loaded');
        console.log('👤 User:', user);
        
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
        
        // MENU
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', openSidePanel);
        }
        
        var closePanel = document.getElementById('closePanel');
        if (closePanel) {
            closePanel.addEventListener('click', closeSidePanel);
        }
        
        // WEEK BUTTONS
        var thisWeekBtn = document.getElementById('thisWeekBtn');
        var nextWeekBtn = document.getElementById('nextWeekBtn');
        
        if (thisWeekBtn) {
            thisWeekBtn.addEventListener('click', function() {
                currentWeekView = 'this';
                this.className = 'btn btn-primary btn-sm';
                if (nextWeekBtn) nextWeekBtn.className = 'btn btn-secondary btn-sm';
                renderDashboard();
            });
        }
        
        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', function() {
                currentWeekView = 'next';
                this.className = 'btn btn-primary btn-sm';
                if (thisWeekBtn) thisWeekBtn.className = 'btn btn-secondary btn-sm';
                renderDashboard();
            });
        }
        
        // PANEL BUTTONS
        document.getElementById('panelMyAvailability').addEventListener('click', function() {
            switchView('dashboard');
            var section = document.getElementById('myAvailability');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        });
        
        document.getElementById('panelRules').addEventListener('click', function() {
            switchView('rules');
        });
        
        document.getElementById('panelNotifications').addEventListener('click', function() {
            switchView('notifications');
        });
        
        document.getElementById('panelAdmin').addEventListener('click', openAdminPanel);
        
        document.getElementById('panelLogout').addEventListener('click', function() {
            window.logoutUser();
        });
        
        // ADMIN MODAL
        document.getElementById('closeAdminModal').addEventListener('click', function() {
            document.getElementById('adminModal').style.display = 'none';
        });
        
        window.addEventListener('click', function(e) {
            var modal = document.getElementById('adminModal');
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
            var bookingId = this.dataset.bookingId;
            var day = this.dataset.day;
            handlePenaltyPay(bookingId, day);
        });
        
        // CLICK OUTSIDE MODALS
        window.addEventListener('click', function(e) {
            var optOutModal = document.getElementById('optOutModal');
            var replacementModal = document.getElementById('replacementModal');
            var penaltyModal = document.getElementById('penaltyModal');
            
            if (e.target === optOutModal) closeOptOutModal();
            if (e.target === replacementModal) document.getElementById('replacementModal').style.display = 'none';
            if (e.target === penaltyModal) document.getElementById('penaltyModal').style.display = 'none';
        });
        
        // LOGOUT
        document.getElementById('logoutBtn').addEventListener('click', function() {
            window.logoutUser();
        });
    }
});
