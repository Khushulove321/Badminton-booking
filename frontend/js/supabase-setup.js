// Supabase setup - NEW FILE NAME to avoid cache
(function() {
    const URL = 'https://jrfjdnshhvrmgwqazlck.supabase.co';
    const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZmpkbnNoaHZybWd3cWF6bGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTU5MjIsImV4cCI6MjEwMjM3MTkyMn0.vzBBvVddg6VVM7XnT5Cqn-imYj1gPdKu9JWRdbweVJ8';

    // Wait for supabase from CDN
    function initSupabase() {
        if (typeof supabase !== 'undefined') {
            window.supabase = supabase.createClient(URL, KEY);
            window.API_URL = '/api';
            console.log('✅ Supabase initialized!');
            return true;
        }
        return false;
    }

    // Try immediately
    if (!initSupabase()) {
        // If not ready, wait for it
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (initSupabase() || attempts > 10) {
                clearInterval(interval);
                if (attempts > 10) {
                    console.error('❌ Failed to load Supabase after 10 attempts');
                }
            }
        }, 500);
    }
})();
