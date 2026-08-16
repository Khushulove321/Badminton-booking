// Supabase configuration
const SUPABASE_URL = 'https://jrfjdnshhvrmgwqazlck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZmpkbnNoaHZybWd3cWF6bGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTU5MjIsImV4cCI6MjEwMjM3MTkyMn0.vzBBvVddg6VVM7XnT5Cqn-imYj1gPdKu9JWRdbweVJ8';

// Create Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API URL
const API_URL = '/api';

// Export for use in other files
window.SUPABASE = supabase;
window.API_URL = API_URL;
