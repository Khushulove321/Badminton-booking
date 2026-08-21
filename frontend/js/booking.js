// Booking functions

console.log('📚 booking.js loaded');

const ADMIN_CODE = 'admin123';

// Global state for opt out
let optOutDay = null;
let selectedBookingId = null;
let currentUser = null;

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
            dateString: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })
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
            dateString: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })
        });
    }
    return weekDates;
}

function isSelectionWindowOpen() {
    const now = new Date();
    const day = now.getDay();
    return day === 1;
}

function getTimeRemaining() {
    const now = new Date();
    const day = now.getDay();
    
    if (day !== 1) return 'Window closed';
    
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

async function getAvailability(weekType = 'next') {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(window.API_URL + '/booking/availability?week=' + weekType, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch availability');
        const data = await response.json();
        return data;
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

async function getAllUsersAvailability() {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(window.API_URL + '/booking/all-users', {
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

async function getSelectedPlayers() {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(window.API_URL + '/booking/selected-players', {
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

async function getAvailableUsersForDay(day) {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(window.API_URL + '/booking/availability?week=next', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
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
        
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        daysGrid.innerHTML = '<div class="error-message">Failed to load availability. Please refresh.</div>';
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
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
    }
}

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
        
        var menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', openSidePanel);
        }
        
        var closePanel = document.getElementById('closePanel');
        if (closePanel) {
            closePanel.addEventListener('click', closeSidePanel);
        }
        
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
        
        var panelMyAvailability = document.getElementById('panelMyAvailability');
        if (panelMyAvailability) {
            panelMyAvailability.addEventListener('click', function() {
                closeSidePanel();
                var section = document.getElementById('myAvailability');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        var panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.addEventListener('click', openAdminPanel);
        }
        
        var panelRules = document.getElementById('panelRules');
        if (panelRules) {
            panelRules.addEventListener('click', function() {
                alert('📋 Rules page coming soon!');
            });
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
                document.getElementById('adminModal').style.display = 'none';
            });
        }
        
        window.addEventListener('click', function(e) {
            var modal = document.getElementById('adminModal');
            if (e.target === modal) modal.style.display = 'none';
        });
        
        var verifyBtn = document.getElementById('verifyAdminBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', verifyAdmin);
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
        
        var closeReplacementModal = document.getElementById('closeReplacementModal');
        if (closeReplacementModal) {
            closeReplacementModal.addEventListener('click', function() {
                document.getElementById('replacementModal').style.display = 'none';
            });
        }
        
        document.getElementById('replacementCancel').addEventListener('click', function() {
            document.getElementById('replacementModal').style.display = 'none';
        });
        
        var closePenaltyModal = document.getElementById('closePenaltyModal');
        if (closePenaltyModal) {
            closePenaltyModal.addEventListener('click', function() {
                document.getElementById('penaltyModal').style.display = 'none';
            });
        }
        
        document.getElementById('penaltyCancel').addEventListener('click', function() {
            document.getElementById('penaltyModal').style.display = 'none';
        });
        
        document.getElementById('penaltyPay').addEventListener('click', function() {
            var bookingId = this.dataset.bookingId;
            var day = this.dataset.day;
            handlePenaltyPay(bookingId, day);
        });
        
        window.addEventListener('click', function(e) {
            var optOutModal = document.getElementById('optOutModal');
            var replacementModal = document.getElementById('replacementModal');
            var penaltyModal = document.getElementById('penaltyModal');
            
            if (e.target === optOutModal) closeOptOutModal();
            if (e.target === replacementModal) document.getElementById('replacementModal').style.display = 'none';
            if (e.target === penaltyModal) document.getElementById('penaltyModal').style.display = 'none';
        });
        
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                window.logoutUser();
            });
        }
    }
});
