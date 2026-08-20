const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
const supabaseAdmin = createClient(
process.env.SUPABASE_URL || 'https://jrfjdnshhvrmgwqazlck.supabase.co',
 process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});
module.exports = app;
// Get all users with their availability (admin only)
app.get('/api/booking/all-users', authenticate, isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        availability (
          booking_id,
          bookings (
            day,
            time
          )
        )
      `);
      
    if (error) throw error;
    
    // Format the response
    const formatted = data.map(user => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      availability: user.availability?.map(a => ({
        day: a.bookings.day,
        time: a.bookings.time
      })) || []
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Get selected players for each day
app.get('/api/booking/selected-players', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        day,
        selected_user_id,
        profiles:selected_user_id (
          username
        )
      `)
      .not('selected_user_id', 'is', null);
      
    if (error) throw error;
    
    const formatted = data.map(item => ({
      day: item.day,
      selected_user: item.profiles ? {
        username: item.profiles.username
      } : null
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching selected players:', error);
    res.status(500).json({ error: 'Error fetching selected players' });
  }
});
