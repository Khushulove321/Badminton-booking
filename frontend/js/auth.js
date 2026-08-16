async function registerUser(username, email, password, confirmPassword) {
    if (password !== confirmPassword) { showError('Passwords do not match'); return false; }
    try {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { username } }
        });
        if (error) throw error;
        showSuccess('Registration successful! Please login.');
        return true;
    } catch (error) {
        showError(error.message || 'Registration failed');
        return false;
    }
}
async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('session', JSON.stringify(data.session));
        showSuccess('Login successful!');
        return true;
    } catch (error) {
        showError(error.message || 'Login failed');
        return false;
    }
}
function logoutUser() {
    supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    window.location.href = '/';
}
function getCurrentUser() {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
}
function getToken() {
    const session = localStorage.getItem('session');
    if (session) {
        const parsed = JSON.parse(session);
        return parsed?.access_token || null;
    }
    return null;
}
function isAuthenticated() { return !!getCurrentUser(); }
function checkAuth(redirectToLogin = true) {
    if (!isAuthenticated() && redirectToLogin) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}
async function checkAdmin() {
    const user = getCurrentUser();
    if (!user) return false;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
        if (error) throw error;
        return data?.is_admin || false;
    } catch (error) {
        return false;
    }
}
function showError(message) {
    const el = document.getElementById('errorMessage');
    if (el) { el.textContent = message; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 5000); }
    showToast(message, 'error');
}
function showSuccess(message) { showToast(message, 'success'); }
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (await loginUser(email, password)) {
                window.location.href = '/dashboard.html';
            }
        });
    }
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (await registerUser(username, email, password, confirmPassword)) {
                window.location.href = '/login.html';
            }
        });
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    if (window.location.pathname.includes('dashboard.html')) {
        checkAuth();
        const user = getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('userName');
            if (nameEl) {
                supabase.from('profiles').select('username').eq('id', user.id).single()
                    .then(({ data }) => { if (data) nameEl.textContent = `👋 Welcome, ${data.username}`; });
            }
        }
    }
});
