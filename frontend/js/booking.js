// Booking functions

console.log('📚 booking.js loaded');

const ADMIN_CODE = 'admin123';

function canEdit() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    
    if (day === 0 && (hour >= 23 && minutes >= 59)) return false;
    if (day === 0 && hour >= 23) return false;
    if (day === 0) return true;
    return true;
}

function isPastDeadline() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    
    if (day === 0 && hour >= 23 && minutes >= 59) return true;
    if (day === 0 && hour >= 23) return true;
    if (day === 0) return false;
    return false;
}

async function getAvailability() {
    const token = window.getToken();
    if (!token) return [];

    try {
        const response = await fetch(`${window.API_URL}/booking/availability`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch availability');
        const data = await response.json();
        console.log('📊 Availability data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching availability:', error);
        window.showToast('Failed to load availability', 'error');
        return [];
    }
}

async function toggleAvailability(day) {
    const token = window.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    if (!canEdit()) {
        alert('❌ Selection deadline has passed (Sunday 11:59 PM). You can only view your selections.');
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/booking/select/${day}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
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

function renderDayCard(day, currentUser, isAdmin, canEditBool) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const isUserAvailable = day.available_users?.some(u => u.id === currentUser?.id);
    const isBooked = day.is_booked && day.selected_user;
    const isSelectedUser = isBooked && day.selected_user?.id === currentUser?.id;
    
    if (isUserAvailable) card.classList.add('selected');
    if (isBooked) card.classList.add('booked');
    
    const userCount = day.total_users || 0;
    
    let selectedUserHtml = '';
    if (isBooked && day.selected_user) {
        selectedUserHtml = `
            <div class="selected-user">
                ✅ ${isSelectedUser ? 'You' : day.selected_user.username}
            </div>
        `;
    }
    
    let adminActionsHtml = '';
    if (isAdmin) {
        adminActionsHtml = `
            <div class="admin-actions">
                <button class="btn btn-primary btn-sm" onclick="handleRandomSelect('${day.day}')">
                    🎲 Random
                </button>
                <button class="btn btn-danger btn-sm" onclick="handleReset('${day.day}')">
                    🔄 Reset
                </button>
            </div>
        `;
    }
    
    const disabledMessage = !canEditBool ? '<div style="color:#888;font-size:0.7rem;">🔒 Locked</div>' : '';
    
    card.innerHTML = `
        <div class="day-name">${day.day}</div>
        <div class="day-status">${isBooked ? 'Booked' : 'Available'}</div>
        <div class="user-count">${userCount} / 20 players</div>
        ${selectedUserHtml}
        ${adminActionsHtml}
        ${disabledMessage}
        <div style="margin-top: 10px; font-size: 0.8rem; color: #888;">
            ${day.time || '7:00 - 8:00 AM'}
        </div>
    `;
    
    if (canEditBool) {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.admin-actions')) return;
            handleToggleAvailability(day.day);
        });
    }
    
    return card;
}

async function renderDashboard() {
    const daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    
    try {
        const user = window.getCurrentUser();
        const isAdmin = await window.checkAdmin();
        const canEditBool = canEdit();
        const pastDeadline = isPastDeadline();
        
        const warningBanner = document.getElementById('deadlineWarning');
        if (warningBanner) {
            warningBanner.style.display = pastDeadline ? 'block' : 'none';
        }
        
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'block' : 'none';
        }
        
        const bookings = await getAvailability();
        console.log('📊 Bookings to render:', bookings);
        
        if (!bookings || bookings.length === 0) {
            daysGrid.innerHTML = '<p style="color: #888;">No bookings available. Please contact admin.</p>';
            return;
        }
        
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedBookings = bookings.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
        
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

async function handleToggleAvailability(day) {
    const result = await toggleAvailability(day);
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        console.log('📊 Dashboard page loaded');
        const user = window.getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        console.log('👤 User:', user);
        renderDashboard();
        setInterval(renderDashboard, 30000);
        
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.addEventListener('click', openAdminPanel);
        
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('adminModal').style.display = 'none';
            });
        }
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('adminModal');
            if (e.target === modal) modal.style.display = 'none';
        });
        
        const verifyBtn = document.getElementById('verifyAdminBtn');
        if (verifyBtn) verifyBtn.addEventListener('click', verifyAdmin);
        
        const adminCodeInput = document.getElementById('adminCode');
        if (adminCodeInput) {
            adminCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') verifyAdmin();
            });
        }
    }
});
