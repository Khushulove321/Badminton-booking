console.log('🔍 auth.js loaded');

// Make sure supabase is available
if (typeof window.supabase === 'undefined') {
    console.error('❌ window.supabase is undefined. Please check supabase-setup.js');
}

async function loginUser(username, password) {
    console.log('🔐 Login attempt for:', username);
    
    if (!window.supabase) {
        console.error('❌ window.supabase is undefined!');
        alert('❌ Supabase not loaded. Please refresh the page.');
        return;
    }
    
    console.log('✅ Supabase is ready, attempting login...');
    
    try {
        const email = username + '@badminton.local';
        console.log('📧 Using email:', email);
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('❌ Login error:', error);
            alert('❌ Login failed: ' + error.message);
            return;
        }
        
        console.log('✅ Login successful!', data);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('session', JSON.stringify(data.session));
        alert('✅ Login successful! Redirecting...');
        window.location.href = '/dashboard.html';
    } catch (error) {
        console.error('❌ Login error:', error);
        alert('❌ Error: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded');
    console.log('🔍 window.supabase exists?', typeof window.supabase !== 'undefined');
    
    const form = document.getElementById('loginForm');
    if (!form) {
        console.error('❌ Login form not found!');
        return;
    }
    
    console.log('✅ Login form found');
    
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    
    console.log('🔍 Username field:', usernameField ? '✅ Found' : '❌ Not found');
    console.log('🔍 Password field:', passwordField ? '✅ Found' : '❌ Not found');
    
    if (!usernameField || !passwordField) {
        alert('❌ Form fields missing. Please refresh the page.');
        return;
    }
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('📝 Form submitted');
        
        const username = usernameField.value.trim();
        const password = passwordField.value.trim();
        
        console.log('📝 Username entered:', username);
        console.log('📝 Password length:', password ? password.length : 0);
        
        if (!username || !password) {
            alert('❌ Please enter both username and password');
            return;
        }
        
        loginUser(username, password);
    });
});
