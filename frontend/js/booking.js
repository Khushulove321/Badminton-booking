async function getAvailability() {
    const token = getToken();
    if (!token) return [];
    try {
        const res = await fetch(`${API_URL}/booking/availability`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (error) {
        showToast('Failed to load availability', 'error');
        return [];
    }
}
async function toggleAvailability(day) {
    const token = getToken();
    if (!token) { window.location.href = '/login.html'; return; }
    try {
        const res = await fetch(`${API_URL}/booking/select/${day}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        showToast(data.message, 'success');
        return data;
    } catch (error) {
        showToast('Failed to update availability', 'error');
        return null;
    }
}
async function selectRandomUser(day) {
    const token = getToken();
    if (!token) { window.location.href = '/login.html'; return; }
    try {
        const res = await fetch(`${API_URL}/booking/select-random/${day}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
        const data = await res.json();
        showToast(`🎯 Random user selected for ${day}!`, 'success');
        return data;
    } catch (error) {
        showToast(error.message || 'Failed to select user', 'error');
        return null;
    }
}
async function resetDay(day) {
    const token = getToken();
    if (!token) { window.location.href = '/login.html'; return; }
    try {
        const res = await fetch(`${API_URL}/booking/reset/${day}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
        const data = await res.json();
        showToast(`🔄 Reset ${day} successfully`, 'success');
        return data;
    } catch (error) {
        showToast(error.message || 'Failed to reset day', 'error');
        return null;
    }
}
async function getMyAvailability() {
    const token = getToken();
    if (!token) return [];
    try {
        const res = await fetch(`${API_URL}/booking/my-availability`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    } catch (error) {
        return [];
    }
}
function renderDayCard(day, currentUser, isAdmin) {
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
        selectedUserHtml = `<div class="selected-user">✅ ${isSelectedUser ? 'You' : day.selected_user.username}</div>`;
    }
    let adminActionsHtml = '';
    if (isAdmin) {
        adminActionsHtml = `<div class="admin-actions">
            <button class="btn btn-primary btn-sm" onclick="handleRandomSelect('${day.day}')">🎲 Random</button>
            <button class="btn btn-danger btn-sm" onclick="handleReset('${day.day}')">🔄 Reset</button>
        </div>`;
    }
    card.innerHTML = `
        <div class="day-name">${day.day}</div>
        <div class="day-status">${isBooked ? 'Booked' : 'Available'}</div>
        <div class="user-count">${userCount} / 20 players</div>
        ${selectedUserHtml}
        ${adminActionsHtml}
        <div style="margin-top:10px;font-size:.8rem;color:#888;">${day.time || '10:00 AM'}</div>
    `;
    card.addEventListener('click', (e) => {
        if (e.target.closest('.admin-actions')) return;
        handleToggleAvailability(day.day);
    });
    return card;
}
async function renderDashboard() {
    const grid = document.getElementById('daysGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">Loading availability...</div>';
    try {
        const user = getCurrentUser();
        const isAdmin = await checkAdmin();
        if (isAdmin) {
            const ctrl = document.getElementById('adminControls');
            if (ctrl) ctrl.style.display = 'block';
        }
        const bookings = await getAvailability();
        const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sorted = bookings.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
        grid.innerHTML = '';
        sorted.forEach(day => grid.appendChild(renderDayCard(day, user, isAdmin)));
        await updateMyAvailability();
    } catch (error) {
        grid.innerHTML = '<div class="error-message">Failed to load. Please refresh.</div>';
    }
}
async function updateMyAvailability() {
    const el = document.getElementById('myDaysList');
    if (!el) return;
    try {
        const data = await getMyAvailability();
        if (data.length === 0) {
            el.innerHTML = '<p style="color:#888;">You haven\'t selected any days yet.</p>';
            return;
        }
        const names = data.map(b => b.day).join(', ');
        el.innerHTML = `<p>📅 ${names}</p><p style="color:#888;font-size:.9rem;margin-top:5px;">Selected for ${data.length} day${data.length > 1 ? 's' : ''}</p>`;
    } catch (error) {
        el.innerHTML = '<p style="color:#888;">Unable to load your availability.</p>';
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
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        if (!getCurrentUser()) { window.location.href = '/login.html'; return; }
        renderDashboard();
        setInterval(renderDashboard, 30000);
    }
});
