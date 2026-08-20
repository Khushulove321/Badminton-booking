cat > frontend/js/auth.js << 'EOF'
console.log('🔍 auth.js loading...');
console.log('📡 API_URL is:', window.API_URL);

async function loginUser(username, password) {
    console.log('🔐 Login attempt for:', username);
    
    if (!window.supabase) {
        alert('❌ Supabase not ready. Please refresh.');
        console.error('❌ window.supabase is undefined');
        return;
    }
    
    try {
        const email = username + '@badminton.local';
        console.log('📧 Using email:', email);
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            alert('❌ Login failed: ' + error.message);
            return;
        }
        
        console.log('✅ Login successful!', data);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('session', JSON.stringify(data.session));
        alert('✅ Login successful! Redirecting...');
        window.location.href = '/dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        alert('❌ Error: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded');
    console.log('🔍 Supabase status:', window.supabase ? '✅ Ready' : '❌ Not ready');
    console.log('🔍 API_URL status:', window.API_URL || '❌ Not set');
    
    const form = document.getElementById('loginForm');
    if (form) {
        console.log('✅ Login form found');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            loginUser(username, password);
        });
    } else {
        console.error('❌ Login form not found!');
    }
});
EOF