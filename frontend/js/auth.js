console.log('🔍 auth.js loaded');

// Login function
async function loginUser(username, password) {
    console.log('🔐 Login attempt for:', username);
    
    if (!window.supabase) {
        console.error('❌ window.supabase is undefined!');
        alert('❌ Supabase not loaded. Please refresh the page.');
        return;
    }
    
    console.log('✅ Supabase is ready, attempting login...');
    
    try {
        const email = username + '@gmail.com';
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

// Register function
async function registerUser(username, fullname, password, confirmPassword) {
    console.log('📝 Register attempt for:', username);
    
    if (password !== confirmPassword) {
        alert('❌ Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('❌ Password must be at least 6 characters');
        return;
    }
    
    if (!window.supabase) {
        console.error('❌ window.supabase is undefined!');
        alert('❌ Supabase not loaded. Please refresh the page.');
        return;
    }
    
    try {
        const email = username + '@gmail.com';
        console.log('📧 Using email:', email);
        console.log('📝 Full name:', fullname);
        console.log('📝 Password length:', password.length);
        
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    username: username,
                    full_name: fullname
                }
            }
        });
        
        if (error) {
            console.error('❌ Registration error:', error);
            alert('❌ Registration failed: ' + error.message);
            return;
        }
        
        console.log('✅ Registration API response:', data);
        
        if (data.user) {
            console.log('✅ User created:', data.user.email);
            alert('✅ Registration successful! Please login.');
            window.location.href = '/login.html';
        } else {
            console.error('❌ No user data returned');
            alert('❌ Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('❌ Registration error:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Setup based on which page we're on
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded');
    console.log('🔍 window.supabase exists?', typeof window.supabase !== 'undefined');
    
    // Check if we're on login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('✅ Login form found');
        
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (!usernameField || !passwordField) {
            alert('❌ Form fields missing. Please refresh the page.');
            return;
        }
        
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Login form submitted');
            
            const username = usernameField.value.trim();
            const password = passwordField.value.trim();
            
            if (!username || !password) {
                alert('❌ Please enter both username and password');
                return;
            }
            
            loginUser(username, password);
        });
        return;
    }
    
    // Check if we're on register page
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('✅ Register form found');
        
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Register form submitted');
            
            const username = document.getElementById('username').value.trim();
            const fullname = document.getElementById('fullname').value.trim();
            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();
            
            console.log('📝 Username:', username);
            console.log('📝 Full name:', fullname);
            console.log('📝 Password length:', password.length);
            
            if (!username || !fullname || !password || !confirmPassword) {
                alert('❌ Please fill in all fields');
                return;
            }
            
            registerUser(username, fullname, password, confirmPassword);
        });
        return;
    }
    
    console.log('ℹ️ Neither login nor register form found');
});
