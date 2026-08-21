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
    return day === 1; // Monday
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
            message: `🔒 Selection opens Monday ${dateStr} (all day)`,
            className: 'closed'
        };
    }
    
    const remaining = getTimeRemaining();
    return {
        status: 'open',
        message: `🔓 Selection OPEN - ${remaining}`,
        className: 'open'
    };
}

// Check if a booking is already booked
async function isBookingBooked(day) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=next`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return false;
        const data = await response.json();
        const booking = data.find(b => b.day === day);
        return booking?.is_booked || false;
    } catch (error) {
        console.error('Error checking booking status:', error);
        return false;
    }
}

async function getAvailability(weekType = 'next') {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=${weekType}`, {
            headers: {
                'Authorization': `Bearer ${token}`
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

async function getAllUsersAvailability() {
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

async function getSelectedPlayers() {
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
        const booking = data.find(b => b.day === day);
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

function renderDayCard(dayData, canEditBool, isBooked) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const currentUser = window.getCurrentUser();
    const isUserAvailable = dayData.available_users?.some(u => u.id === currentUser?.id);
    const isSelectedUser = isBooked && dayData.selected_user?.id === currentUser?.id;
    
    if (isUserAvailable) card.classList.add('selected');
    if (isBooked) card.classList.add('booked');
    
    const displayName = dayData.date ? `${dayData.day} - ${dayData.date}` : dayData.day;
    const dayStatus = isBooked ? '📌 Booked' : '✅ Available';
    
    let selectedUserHtml = '';
    if (isBooked && dayData.selected_user) {
        selectedUserHtml = `
            <div class="selected-user">
                ✅ Selected: ${dayData.selected_user.username}
            </div>
        `;
    }
    
    const buttonText = isUserAvailable ? '✅ In' : '📝 In for this day';
    const buttonClass = isUserAvailable ? 'in-btn in' : 'in-btn';
    const disabledAttr = !canEditBool ? 'disabled' : '';
    const disabledText = !canEditBool ? ' (Locked)' : '';
    
    card.innerHTML = `
        <div class="day-name">${displayName}</div>
        <div class="day-status">${dayStatus}</div>
        ${selectedUserHtml}
        <button class="${buttonClass} btn btn-sm" data-day="${dayData.day}" ${disabledAttr}>
            ${buttonText}${disabledText}
        </button>
    `;
    
    // Only add click handler if editable
    if (canEditBool) {
        const btn = card.querySelector('.in-btn');
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.dataset.day;
            const date = dayData.date;
            if (isUserAvailable) {
                // Already in, so remove
                handleToggleAvailability(day, date);
            } else {
                // Add user
                handleToggleAvailability(day, date);
            }
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
    myAvailability.forEach(day => {
        const isBooked = isBookedDays.includes(day.day);
        const statusIcon = isBooked ? '🔒' : '✅';
        html += `
            <div class="my-availability-item">
                <span class="day-name">${statusIcon} ${day.day} - ${day.date || 'Next Week'}</span>
                <button class="btn btn-danger btn-xs opt-out-btn" data-day="${day.day}" data-booking-id="${day.booking_id || ''}">
                    Opt Out
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners to opt out buttons
    container.querySelectorAll('.opt-out-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.dataset.day;
            const bookingId = this.dataset.bookingId;
            openOptOutModal(day, bookingId);
        });
    });
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

// Get booked days
function getBookedDays(bookings) {
    return bookings.filter(b => b.is_booked).map(b => b.day);
}

function renderSelectedPlayers(selected) {
    const container = document.getElementById('selectedPlayersGrid');
    if (!container) return;
    
    if (!selected || selected.length === 0) {
        container.innerHTML = '<p style="color: #888;">No players selected yet for this week.</p>';
        return;
    }
    
    let html = '';
    selected.forEach(item => {
        html += `
            <div class="selected-player-card">
                <div class="day-name">${item.day}</div>
                <div class="player-name">${item.selected_user ? item.selected_user.username : 'Not selected'}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

let currentWeekView = 'next';
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
        
        // Update week display
        const weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay) {
            const weekDates = getWeekDates();
            if (weekDates.length > 0) {
                const start = weekDates[0].dateString;
                const end = weekDates[6].dateString;
                const label = currentWeekView === 'next' ? 'Selecting for (Next Week)' : 'This Week';
                weekDisplay.textContent = `📅 ${label}: ${start} - ${end}`;
            }
        }
        
        // Update selection status
        const statusContainer = document.getElementById('selectionStatus');
        if (statusContainer) {
            const indicator = statusContainer.querySelector('.status-indicator');
            const text = statusContainer.querySelector('.status-text');
            if (indicator && text) {
                indicator.className = `status-indicator ${selectionStatus.className}`;
                text.className = `status-text ${selectionStatus.className}`;
                text.textContent = selectionStatus.message;
            }
        }
        
        // Show deadline warning
        const warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = canEditBool ? 'none' : 'block';
        }
        
        // Show admin controls
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
        }
        
        // Show admin button in side panel
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.style.display = isAdmin ? 'block' : 'none';
        }
        
        // Get bookings
        const bookings = await getAvailability(currentWeekView);
        const weekDates = getWeekDates();
        const bookedDays = getBookedDays(bookings);
        
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedBookings = [];
        
        dayOrder.forEach(day => {
            const dateObj = weekDates.find(d => d.day === day);
            const booking = bookings?.find(b => b.day === day) || { 
                day: day, 
                is_booked: false, 
                selected_user: null,
                available_users: [],
                time: '7:00 - 8:00 AM'
            };
            
            sortedBookings.push({
                ...booking,
                date: dateObj ? dateObj.dateString : null
            });
        });
        
        daysGrid.innerHTML = '';
        sortedBookings.forEach(day => {
            const isBooked = bookedDays.includes(day.day);
            const card = renderDayCard(day, canEditBool, isBooked);
            daysGrid.appendChild(card);
        });
        
        // Get my availability
        const myAvailability = await getMyAvailability();
        renderMyAvailability(myAvailability, bookedDays);
        
        // Render selected players
        const selected = await getSelectedPlayers();
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
    const result = await toggleAvailability(day, date);
    if (result) await renderDashboard();
}

// Admin Panel Functions
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
        const users = await getAllUsersAvailability();
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        
        let html = '';
        users.forEach(user => {
            const days = user.availability || [];
            const dayNames = days.map(d => d.day).join(', ') || 'No days selected';
            html += `
                <div class="admin-user-card">
                    <div class="username">👤 ${user.username}</div>
                    <div class="days">📅 Available: ${dayNames}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users.</p>';
    }
}

// Side Panel Functions
function openSidePanel() {
    const panel = document.getElementById('sidePanel');
    const main = document.getElementById('mainContent');
    if (panel) panel.classList.add('open');
    if (main) main.classList.add('shifted');
}

function closeSidePanel() {
    const panel = document.getElementById('sidePanel');
    const main = document.getElementById('mainContent');
    if (panel) panel.classList.remove('open');
    if (main) main.classList.remove('shifted');
}

// Opt Out Handlers
async function handleOptOut(day, bookingId, action) {
    const user = window.getCurrentUser();
    if (!user) return;
    
    if (action === 'cancel') {
        closeOptOutModal();
        return;
    }
    
    if (action === 'notBooked') {
        // Remove user from booking - no penalty
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
        // Open replacement modal
        await openReplacementModal(day);
        return;
    }
    
    if (action === 'penalty') {
        closeOptOutModal();
        // Open penalty modal
        openPenaltyModal(day, bookingId);
        return;
    }
}

async function openReplacementModal(day) {
    document.getElementById('replaceDay').textContent = day;
    document.getElementById('replacementModal').style.display = 'flex';
    
    // Load available users
    const container = document.getElementById('replacementList');
    container.innerHTML = 'Loading players...';
    
    try {
        const users = await getAvailableUsersForDay(day);
        const currentUser = window.getCurrentUser();
        
        // Filter out current user
        const availableUsers = users.filter(u => u.id !== currentUser?.id);
        
        if (availableUsers.length === 0) {
            container.innerHTML = '<p style="color: #888;">No other players available for this day.</p>';
            return;
        }
        
        let html = '';
        availableUsers.forEach(user => {
            html += `
                <div class="replacement-item">
                    <span class="username">👤 ${user.username}</span>
                    <button class="btn btn-success btn-sm select-replacement" data-user-id="${user.id}" data-username="${user.username}">
                        Select
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.select-replacement').forEach(btn => {
            btn.addEventListener('click', async function() {
                const userId = this.dataset.userId;
                const username = this.dataset.username;
                const confirmed = confirm(`Are you sure you want ${username} to replace you for ${day}?`);
                if (confirmed) {
                    const success = await addReplacement(currentUser.id, userId, day);
                    if (success) {
                        window.showToast(`✅ ${username} has been added as your replacement.`, 'success');
                        document.getElementById('replacementModal').style.display = 'none';
                        await renderDashboard();
                    } else {
                        window.showToast('❌ Failed to add replacement. Please try again.', 'error');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading replacement users:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users.</p>';
    }
}

function openPenaltyModal(day, bookingId) {
    document.getElementById('penaltyModal').style.display = 'flex';
    // Store the booking id for penalty payment
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
            // Remove user from booking
            await removeUserFromBooking(day, user.id);
            window.showToast('💰 Penalty paid. You have been removed from the booking.', 'success');
            document.getElementById('penaltyModal').style.display = 'none';
            await renderDashboard();
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        const user = window.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        console.log('📊 Dashboard page loaded');
        console.log('👤 User:', user);
        
        // Set username
        const userName = document.getElementById('userName');
        if (userName) {
            window.supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        userName.textContent = `👋 Welcome, ${data.username}`;
                    }
                });
        }
        
        renderDashboard();
        setInterval(renderDashboard, 30000);
        
        // Menu button
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', openSidePanel);
        }
        
        const closePanel = document.getElementById('closePanel');
        if (closePanel) {
            closePanel.addEventListener('click', closeSidePanel);
        }
        
        // Week buttons
        const thisWeekBtn = document.getElementById('thisWeekBtn');
        const nextWeekBtn = document.getElementById('nextWeekBtn');
        
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
        
        // Panel buttons
        const panelMyAvailability = document.getElementById('panelMyAvailability');
        if (panelMyAvailability) {
            panelMyAvailability.addEventListener('click', function() {
                closeSidePanel();
                const section = document.getElementById('myAvailability');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.addEventListener('click', openAdminPanel);
        }
        
        const panelRules = document.getElementById('panelRules');
        if (panelRules) {
            panelRules.addEventListener('click', function() {
                alert('📋 Rules page coming soon!');
            });
        }
        
        const panelLogout = document.getElementById('panelLogout');
        if (panelLogout) {
            panelLogout.addEventListener('click', function() {
                window.logoutUser();
            });
        }
        
        // Admin modal
        const closeAdminModal = document.getElementById('closeAdminModal');
        if (closeAdminModal) {
            closeAdminModal.addEventListener('click', function() {
                document.getElementById('adminModal').style.display = 'none';
            });
        }
        
        window.addEventListener('click', function(e) {
            const modal = document.getElementById('adminModal');
            if (e.target === modal) modal.style.display = 'none';
        });
        
        const verifyBtn = document.getElementById('verifyAdminBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', verifyAdmin);
        }
        
        const adminCodeInput = document.getElementById('adminCode
cat > frontend/js/booking.js << 'EOF'
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
    return day === 1; // Monday
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
            message: `🔒 Selection opens Monday ${dateStr} (all day)`,
            className: 'closed'
        };
    }
    
    const remaining = getTimeRemaining();
    return {
        status: 'open',
        message: `🔓 Selection OPEN - ${remaining}`,
        className: 'open'
    };
}

// Check if a booking is already booked
async function isBookingBooked(day) {
    const token = window.getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=next`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) return false;
        const data = await response.json();
        const booking = data.find(b => b.day === day);
        return booking?.is_booked || false;
    } catch (error) {
        console.error('Error checking booking status:', error);
        return false;
    }
}

async function getAvailability(weekType = 'next') {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(`${window.API_URL}/booking/availability?week=${weekType}`, {
            headers: {
                'Authorization': `Bearer ${token}`
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

async function getAllUsersAvailability() {
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

async function getSelectedPlayers() {
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
        const booking = data.find(b => b.day === day);
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

function renderDayCard(dayData, canEditBool, isBooked) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const currentUser = window.getCurrentUser();
    const isUserAvailable = dayData.available_users?.some(u => u.id === currentUser?.id);
    const isSelectedUser = isBooked && dayData.selected_user?.id === currentUser?.id;
    
    if (isUserAvailable) card.classList.add('selected');
    if (isBooked) card.classList.add('booked');
    
    const displayName = dayData.date ? `${dayData.day} - ${dayData.date}` : dayData.day;
    const dayStatus = isBooked ? '📌 Booked' : '✅ Available';
    
    let selectedUserHtml = '';
    if (isBooked && dayData.selected_user) {
        selectedUserHtml = `
            <div class="selected-user">
                ✅ Selected: ${dayData.selected_user.username}
            </div>
        `;
    }
    
    const buttonText = isUserAvailable ? '✅ In' : '📝 In for this day';
    const buttonClass = isUserAvailable ? 'in-btn in' : 'in-btn';
    const disabledAttr = !canEditBool ? 'disabled' : '';
    const disabledText = !canEditBool ? ' (Locked)' : '';
    
    card.innerHTML = `
        <div class="day-name">${displayName}</div>
        <div class="day-status">${dayStatus}</div>
        ${selectedUserHtml}
        <button class="${buttonClass} btn btn-sm" data-day="${dayData.day}" ${disabledAttr}>
            ${buttonText}${disabledText}
        </button>
    `;
    
    // Only add click handler if editable
    if (canEditBool) {
        const btn = card.querySelector('.in-btn');
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.dataset.day;
            const date = dayData.date;
            if (isUserAvailable) {
                // Already in, so remove
                handleToggleAvailability(day, date);
            } else {
                // Add user
                handleToggleAvailability(day, date);
            }
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
    myAvailability.forEach(day => {
        const isBooked = isBookedDays.includes(day.day);
        const statusIcon = isBooked ? '🔒' : '✅';
        html += `
            <div class="my-availability-item">
                <span class="day-name">${statusIcon} ${day.day} - ${day.date || 'Next Week'}</span>
                <button class="btn btn-danger btn-xs opt-out-btn" data-day="${day.day}" data-booking-id="${day.booking_id || ''}">
                    Opt Out
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners to opt out buttons
    container.querySelectorAll('.opt-out-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const day = this.dataset.day;
            const bookingId = this.dataset.bookingId;
            openOptOutModal(day, bookingId);
        });
    });
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

// Get booked days
function getBookedDays(bookings) {
    return bookings.filter(b => b.is_booked).map(b => b.day);
}

function renderSelectedPlayers(selected) {
    const container = document.getElementById('selectedPlayersGrid');
    if (!container) return;
    
    if (!selected || selected.length === 0) {
        container.innerHTML = '<p style="color: #888;">No players selected yet for this week.</p>';
        return;
    }
    
    let html = '';
    selected.forEach(item => {
        html += `
            <div class="selected-player-card">
                <div class="day-name">${item.day}</div>
                <div class="player-name">${item.selected_user ? item.selected_user.username : 'Not selected'}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

let currentWeekView = 'next';
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
        
        // Update week display
        const weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay) {
            const weekDates = getWeekDates();
            if (weekDates.length > 0) {
                const start = weekDates[0].dateString;
                const end = weekDates[6].dateString;
                const label = currentWeekView === 'next' ? 'Selecting for (Next Week)' : 'This Week';
                weekDisplay.textContent = `📅 ${label}: ${start} - ${end}`;
            }
        }
        
        // Update selection status
        const statusContainer = document.getElementById('selectionStatus');
        if (statusContainer) {
            const indicator = statusContainer.querySelector('.status-indicator');
            const text = statusContainer.querySelector('.status-text');
            if (indicator && text) {
                indicator.className = `status-indicator ${selectionStatus.className}`;
                text.className = `status-text ${selectionStatus.className}`;
                text.textContent = selectionStatus.message;
            }
        }
        
        // Show deadline warning
        const warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = canEditBool ? 'none' : 'block';
        }
        
        // Show admin controls
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
        }
        
        // Show admin button in side panel
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.style.display = isAdmin ? 'block' : 'none';
        }
        
        // Get bookings
        const bookings = await getAvailability(currentWeekView);
        const weekDates = getWeekDates();
        const bookedDays = getBookedDays(bookings);
        
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedBookings = [];
        
        dayOrder.forEach(day => {
            const dateObj = weekDates.find(d => d.day === day);
            const booking = bookings?.find(b => b.day === day) || { 
                day: day, 
                is_booked: false, 
                selected_user: null,
                available_users: [],
                time: '7:00 - 8:00 AM'
            };
            
            sortedBookings.push({
                ...booking,
                date: dateObj ? dateObj.dateString : null
            });
        });
        
        daysGrid.innerHTML = '';
        sortedBookings.forEach(day => {
            const isBooked = bookedDays.includes(day.day);
            const card = renderDayCard(day, canEditBool, isBooked);
            daysGrid.appendChild(card);
        });
        
        // Get my availability
        const myAvailability = await getMyAvailability();
        renderMyAvailability(myAvailability, bookedDays);
        
        // Render selected players
        const selected = await getSelectedPlayers();
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
    const result = await toggleAvailability(day, date);
    if (result) await renderDashboard();
}

// Admin Panel Functions
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
        const users = await getAllUsersAvailability();
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        
        let html = '';
        users.forEach(user => {
            const days = user.availability || [];
            const dayNames = days.map(d => d.day).join(', ') || 'No days selected';
            html += `
                <div class="admin-user-card">
                    <div class="username">👤 ${user.username}</div>
                    <div class="days">📅 Available: ${dayNames}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users.</p>';
    }
}

// Side Panel Functions
function openSidePanel() {
    const panel = document.getElementById('sidePanel');
    const main = document.getElementById('mainContent');
    if (panel) panel.classList.add('open');
    if (main) main.classList.add('shifted');
}

function closeSidePanel() {
    const panel = document.getElementById('sidePanel');
    const main = document.getElementById('mainContent');
    if (panel) panel.classList.remove('open');
    if (main) main.classList.remove('shifted');
}

// Opt Out Handlers
async function handleOptOut(day, bookingId, action) {
    const user = window.getCurrentUser();
    if (!user) return;
    
    if (action === 'cancel') {
        closeOptOutModal();
        return;
    }
    
    if (action === 'notBooked') {
        // Remove user from booking - no penalty
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
        // Open replacement modal
        await openReplacementModal(day);
        return;
    }
    
    if (action === 'penalty') {
        closeOptOutModal();
        // Open penalty modal
        openPenaltyModal(day, bookingId);
        return;
    }
}

async function openReplacementModal(day) {
    document.getElementById('replaceDay').textContent = day;
    document.getElementById('replacementModal').style.display = 'flex';
    
    // Load available users
    const container = document.getElementById('replacementList');
    container.innerHTML = 'Loading players...';
    
    try {
        const users = await getAvailableUsersForDay(day);
        const currentUser = window.getCurrentUser();
        
        // Filter out current user
        const availableUsers = users.filter(u => u.id !== currentUser?.id);
        
        if (availableUsers.length === 0) {
            container.innerHTML = '<p style="color: #888;">No other players available for this day.</p>';
            return;
        }
        
        let html = '';
        availableUsers.forEach(user => {
            html += `
                <div class="replacement-item">
                    <span class="username">👤 ${user.username}</span>
                    <button class="btn btn-success btn-sm select-replacement" data-user-id="${user.id}" data-username="${user.username}">
                        Select
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
        
        // Add event listeners
        container.querySelectorAll('.select-replacement').forEach(btn => {
            btn.addEventListener('click', async function() {
                const userId = this.dataset.userId;
                const username = this.dataset.username;
                const confirmed = confirm(`Are you sure you want ${username} to replace you for ${day}?`);
                if (confirmed) {
                    const success = await addReplacement(currentUser.id, userId, day);
                    if (success) {
                        window.showToast(`✅ ${username} has been added as your replacement.`, 'success');
                        document.getElementById('replacementModal').style.display = 'none';
                        await renderDashboard();
                    } else {
                        window.showToast('❌ Failed to add replacement. Please try again.', 'error');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading replacement users:', error);
        container.innerHTML = '<p style="color: red;">Failed to load users.</p>';
    }
}

function openPenaltyModal(day, bookingId) {
    document.getElementById('penaltyModal').style.display = 'flex';
    // Store the booking id for penalty payment
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
            // Remove user from booking
            await removeUserFromBooking(day, user.id);
            window.showToast('💰 Penalty paid. You have been removed from the booking.', 'success');
            document.getElementById('penaltyModal').style.display = 'none';
            await renderDashboard();
        } else {
            window.showToast('❌ Failed to process penalty. Please try again.', 'error');
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        const user = window.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        console.log('📊 Dashboard page loaded');
        console.log('👤 User:', user);
        
        // Set username
        const userName = document.getElementById('userName');
        if (userName) {
            window.supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        userName.textContent = `👋 Welcome, ${data.username}`;
                    }
                });
        }
        
        renderDashboard();
        setInterval(renderDashboard, 30000);
        
        // Menu button
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', openSidePanel);
        }
        
        const closePanel = document.getElementById('closePanel');
        if (closePanel) {
            closePanel.addEventListener('click', closeSidePanel);
        }
        
        // Week buttons
        const thisWeekBtn = document.getElementById('thisWeekBtn');
        const nextWeekBtn = document.getElementById('nextWeekBtn');
        
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
        
        // Panel buttons
        const panelMyAvailability = document.getElementById('panelMyAvailability');
        if (panelMyAvailability) {
            panelMyAvailability.addEventListener('click', function() {
                closeSidePanel();
                const section = document.getElementById('myAvailability');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        const panelAdmin = document.getElementById('panelAdmin');
        if (panelAdmin) {
            panelAdmin.addEventListener('click', openAdminPanel);
        }
        
        const panelRules = document.getElementById('panelRules');
        if (panelRules) {
            panelRules.addEventListener('click', function() {
                alert('📋 Rules page coming soon!');
            });
        }
        
        const panelLogout = document.getElementById('panelLogout');
        if (panelLogout) {
            panelLogout.addEventListener('click', function() {
                window.logoutUser();
            });
        }
        
        // Admin modal
        const closeAdminModal = document.getElementById('closeAdminModal');
        if (closeAdminModal) {
            closeAdminModal.addEventListener('click', function() {
                document.getElementById('adminModal').style.display = 'none';
            });
        }
        
        window.addEventListener('click', function(e) {
            const modal = document.getElementById('adminModal');
            if (e.target === modal) modal.style.display = 'none';
        });
        
        const verifyBtn = document.getElementById('verifyAdminBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', verifyAdmin);
        }
        
        const adminCodeInput = document.getElementById('adminCode');
        if (adminCodeInput) {
            adminCodeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyAdmin();
            });
        }
        
        // Opt Out Modal
        const closeOptOutModal = document.getElementById('closeOptOutModal');
        if (closeOptOutModal) {
            closeOptOutModal.addEventListener('click', closeOptOutModal);
        }
        
        document.getElementById('optOutCancel').addEventListener('click', () => handleOptOut(optOutDay, selectedBookingId, 'cancel'));
        document.getElementById('optOutNotBooked').addEventListener('click', () => handleOptOut(optOutDay, selectedBookingId, 'notBooked'));
        document.getElementById('optOutReplace').addEventListener('click', () => handleOptOut(optOutDay, selectedBookingId, 'replace'));
        document.getElementById('optOutPenalty').addEventListener('click', () => handleOptOut(optOutDay, selectedBookingId, 'penalty'));
        
        // Replacement Modal
        const closeReplacementModal = document.getElementById('closeReplacementModal');
        if (closeReplacementModal) {
            closeReplacementModal.addEventListener('click', function() {
                document.getElementById('replacementModal').style.display = 'none';
            });
        }
        
        document.getElementById('replacementCancel').addEventListener('click', function() {
            document.getElementById('replacementModal').style.display = 'none';
        });
        
        // Penalty Modal
        const closePenaltyModal = document.getElementById('closePenaltyModal');
        if (closePenaltyModal) {
            closePenaltyModal.addEventListener('click', function() {
                document.getElementById('penaltyModal').style.display = 'none';
            });
        }
        
        document.getElementById('penaltyCancel').addEventListener('click', function() {
            document.getElementById('penaltyModal').style.display = 'none';
        });
        
        document.getElementById('penaltyPay').addEventListener('click', function() {
            const bookingId = this.dataset.bookingId;
            const day = this.dataset.day;
            handlePenaltyPay(bookingId, day);
        });
        
        // Click outside modals to close
        window.addEventListener('click', function(e) {
            const optOutModal = document.getElementById('optOutModal');
            const replacementModal = document.getElementById('replacementModal');
            const penaltyModal = document.getElementById('penaltyModal');
            
            if (e.target === optOutModal) closeOptOutModal();
            if (e.target === replacementModal) document.getElementById('replacementModal').style.display = 'none';
            if (e.target === penaltyModal) document.getElementById('penaltyModal').style.display = 'none';
        });
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                window.logoutUser();
            });
        }
    }
});
