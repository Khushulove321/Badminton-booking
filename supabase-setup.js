cat > frontend/js/supabase-setup.js << 'EOF'
// Supabase setup
console.log('🔄 Loading Supabase setup...');

const SUPABASE_URL = 'https://jrfjdnshhvrmgwqazlck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZmpkbnNoaHZybWd3cWF6bGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTU5MjIsImV4cCI6MjEwMjM3MTkyMn0.vzBBvVddg6VVM7XnT5Cqn-imYj1gPdKu9JWRdbweVJ8';

// Create Supabase client and set globals
try {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.API_URL = '/api';
    console.log('✅ Supabase initialized!');
    console.log('📍 API_URL set to:', window.API_URL);
} catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
}

// Also set for direct access
const API_URL = '/api';
EOF