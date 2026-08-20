const { EOF } = require("node:dns");

cat > frontend/js/booking.js << 'EOF'

async function getAvailability() {
    const token = getToken();
    if (!token) return [];

    try {
        const response = await fetch(`${window.API_URL}/booking/availability`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch availability');
        return await response.json();
    } catch (error) {
        console.error('Error fetching availability:', error);
        showToast('Failed to load availability', 'error');
        return [];
    }
}

async function toggleAvailability(day) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
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
        showToast(data.message, 'success');
        return data;
    } catch (error) {
        console.error('Error updating availability:', error);
        showToast('Failed to update availability', 'error');
        return null;
    }
}

async function selectRandomUser(day) {
    const token = getToken();
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
        showToast(`🎯 Random user selected for ${day}!`, 'success');
        return data;
    } catch (error) {
        console.error('Error selecting user:', error);
        showToast(error.message || 'Failed to select user', 'error');
        return null;
    }
}

async function resetDay(day) {
    const token = getToken();
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
        showToast(`🔄 Reset ${day} successfully`, 'success');
        return data;
    } catch (error) {
        console.error('Error resetting day:', error);
        showToast(error.message || 'Failed to reset day', 'error');
        return null;
    }
}

async function getMyAvailability() {
    const token = getToken();
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
        console.error('Error fetching availability:', error);
        return [];
    }
}

// Render UI
function renderDayCard(day, currentUser, isAdmin) {
    const card = document.createElement('div');
    card.className = 'day-card';
    
    const isUserAvailable = day.available_users?.some(u => u.id === currentUser?.id);
    const isBooked = day.is_booked && day.selected_user;
    const isSelectedUser = isBooked && day.selected_user?.id === currentUser?.id;
    
    if (isUserAvailable) {
        card.classList.add('selected');
    }
    
    if (isBooked) {
        card.classList.add('booked');
    }
    
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
    
    card.innerHTML = `
        <div class="day-name">${day.day}</div>
        <div class="day-status">${isBooked ? 'Booked' : 'Available'}</div>
        <div class="user-count">${userCount} / 20 players</div>
        ${selectedUserHtml}
        ${adminActionsHtml}
        <div style="margin-top: 10px; font-size: 0.8rem; color: #888;">
            ${day.time || '7:00 - 8:00 AM'}
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (e.target.closest('.admin-actions')) {
            return;
        }
        handleToggleAvailability(day.day);
    });
    
    return card;
}

async function renderDashboard() {
    const daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    
    daysGrid.innerHTML = '<div class="loading">Loading availability...</div>';
    
    try {
        const user = getCurrentUser();
        const isAdmin = await checkAdmin();
        
        if (isAdmin) {
            const adminControls = document.getElementById('adminControls');
            if (adminControls) {
                adminControls.style.display = 'block';
            }
        }
        
        const bookings = await getAvailability();
        
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedBookings = bookings.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
        
        daysGrid.innerHTML = '';
        sortedBookings.forEach(day => {
            const card = renderDayCard(day, user, isAdmin);
            daysGrid.appendChild(card);
        });
        
        await updateMyAvailability();
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        daysGrid.innerHTML = '<div class="error-message">Failed to load availability. Please refresh.</div>';
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

// Event handlers
async function handleToggleAvailability(day) {
    const result = await toggleAvailability(day);
    if (result) {
        await renderDashboard();
    }
}

async function handleRandomSelect(day) {
    const result = await selectRandomUser(day);
    if (result) {
        await renderDashboard();
    }
}

async function handleReset(day) {
    if (!confirm(`Are you sure you want to reset ${day}?`)) {
        return;
    }
    
    const result = await resetDay(day);
    if (result) {
        await renderDashboard();
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        const user = getCurrentUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        renderDashboard();
        setInterval(renderDashboard, 30000);
    }
});
EOF