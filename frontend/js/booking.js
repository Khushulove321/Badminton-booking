// Booking functions

console.log('📚 booking.js loaded');

const ADMIN_CODE = 'admin123';
const SELECTION_WINDOW_DAY = 1; // 1 = Monday

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

async function selectRandomUser(day) {
    const token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/booking/select-random/${day}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to select user');
        }

        const data = await response.json();
        window.showToast(`🎯 Random user selected for ${day}!`, 'success');
        return data;
    } catch (error) {
        console.error('Error selecting user:', error);
        window.showToast(error.message || 'Failed to select user', 'error');
        return null;
    }
}

async function resetDay(day) {
    const token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/booking/reset/${day}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to reset day');
        }

        const data = await response.json();
        window.showToast(`🔄 Reset ${day} successfully`, 'success');
        return data;
    } catch (error) {
        console.error('Error resetting day:', error);
        window.showToast(error.message || 'Failed to reset day', 'error');
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

function renderDayCard(dayData, currentUser, isAdmin, canEditBool) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const isUserAvailable = dayData.available_users?.some(u => u.id === currentUser?.id);
    const isBooked = dayData.is_booked && dayData.selected_user;
    const isSelectedUser = isBooked && dayData.selected_user?.id === currentUser?.id;
    
    if (isUserAvailable) card.classList.add('selected');
    if (isBooked) card.classList.add('booked');
    
    let selectedUserHtml = '';
    if (isBooked && dayData.selected_user) {
        selectedUserHtml = `
            <div class="selected-user">
                ✅ ${isSelectedUser ? 'You' : dayData.selected_user.username}
            </div>
        `;
    }
    
    let adminActionsHtml = '';
    if (isAdmin) {
        adminActionsHtml = `
            <div class="admin-actions">
                <button class="btn btn-primary btn-sm" onclick="handleRandomSelect('${dayData.day}')">
                    🎲 Random
                </button>
                <button class="btn btn-danger btn-sm" onclick="handleReset('${dayData.day}')">
                    🔄 Reset
                </button>
            </div>
        `;
    }
    
    const disabledMessage = !canEditBool ? '<div style="color:#888;font-size:0.7rem;">🔒 Locked</div>' : '';
    const displayName = dayData.date ? `${dayData.day} - ${dayData.date}` : dayData.day;
    
    card.innerHTML = `
        <div class="day-name">${displayName}</div>
        <div class="day-status">${isBooked ? '📌 Booked' : '✅ Available'}</div>
        ${selectedUserHtml}
        ${adminActionsHtml}
        ${disabledMessage}
        <div style="margin-top: 10px; font-size: 0.8rem; color: #888;">
            ${dayData.time || '7:00 - 8:00 AM'}
        </div>
    `;
    
    if (canEditBool) {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.admin-actions')) return;
            handleToggleAvailability(dayData.day, dayData.date);
        });
    }
    
    return card;
}

let currentWeekView = 'next';

function getWeekDates() {
    if (currentWeekView === 'next') {
        return getNextWeekDates();
    } else {
        return getThisWeekDates();
    }
}

async function renderDashboard() {
    const daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    
    try {
        const user = window.getCurrentUser();
        const isAdmin = await window.checkAdmin();
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
            const card = renderDayCard(day, user, isAdmin, canEditBool);
            daysGrid.appendChild(card);
        });
        
        await updateMyAvailability();
        await renderSelectedPlayers();
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        daysGrid.innerHTML = '<div class="error-message">Failed to load availability. Please refresh.</div>';
    }
}

async function renderSelectedPlayers() {
    const container = document.getElementById('selectedPlayersGrid');
    if (!container) return;
    
    try {
        const selected = await getSelectedPlayers();
        
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
    } catch (error) {
        console.error('Error rendering selected players:', error);
        container.innerHTML = '<p style="color: #888;">Unable to load selected players.</p>';
    }
}

async function updateMyAvailability() {
    const myDaysList = document.getElementById('myDaysList');
    if (!myDaysList) return;
    
    try {
        const myAvailability = await getMyAvailability();
        
        if (myAvailability.length === 0) {
            myDaysList.innerHTML = '<p style="color: #888;">You haven\'t selected any days yet.</p>';
            return;
        }
        
        const dayNames = myAvailability.map(b => b.day).join(', ');
        myDaysList.innerHTML = `
            <p>📅 ${dayNames}</p>
            <p style="color: #888; font-size: 0.9rem; margin-top: 5px;">
                Selected for ${myAvailability.length} day${myAvailability.length > 1 ? 's' : ''}
            </p>
        `;
    } catch (error) {
        console.error('Error updating my availability:', error);
        myDaysList.innerHTML = '<p style="color: #888;">Unable to load your availability.</p>';
    }
}

async function handleToggleAvailability(day, date) {
    const result = await toggleAvailability(day, date);
    if (result) await renderDashboard();
}

async function handleRandomSelect(day) {
    const result = await selectRandomUser(day);
    if (result) await renderDashboard();
}

async function handleReset(day) {
    if (!confirm(`Are you sure you want to reset ${day}?`)) return;
    const result = await resetDay(day);
    if (result) await renderDashboard();
}

// Admin Panel Functions
async function openAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    modal.style.display = 'block';
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
            // Try to get username from profile
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
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', function() {
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
    }
});
