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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Auth Middleware
async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) throw error;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function isAdmin(req, res, next) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking admin status' });
  }
}

// Get current user profile
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json({ ...req.user, profile });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Get all bookings with availability
app.get('/api/booking/availability', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_availability');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching availability' });
  }
});

// Toggle user availability
app.post('/api/booking/select/:day', authenticate, async (req, res) => {
  try {
    const { day } = req.params;
    const userId = req.user.id;
    
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('day', day)
      .single();
    if (bookingError) throw bookingError;
    
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('availability')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_id', booking.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from('availability')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      res.json({ success: true, action: 'removed', message: `Removed from ${day}` });
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('availability')
        .insert({ user_id: userId, booking_id: booking.id });
      if (insertError) throw insertError;
      res.json({ success: true, action: 'added', message: `Added to ${day}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error toggling availability' });
  }
});

// Random select (admin only)
app.post('/api/booking/select-random/:day', authenticate, isAdmin, async (req, res) => {
  try {
    const { day } = req.params;
    const { data, error } = await supabaseAdmin.rpc('random_select', { day_name: day });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error selecting user' });
  }
});

// Reset booking (admin only)
app.post('/api/booking/reset/:day', authenticate, isAdmin, async (req, res) => {
  try {
    const { day } = req.params;
    const adminId = req.user.id;
    const { data, error } = await supabaseAdmin.rpc('reset_booking', {
      day_name: day,
      admin_id: adminId
    });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error resetting booking' });
  }
});

// Get user's availability
app.get('/api/booking/my-availability', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin.rpc('get_user_availability', {
      user_id: userId
    });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching availability' });
  }
});

// Get all users with their availability (admin only)
app.get('/api/booking/all-users', authenticate, isAdmin, async (req, res) => {
  try {
    // Get all profiles with their availability
    const { data: users, error: usersError } = await supabaseAdmin
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
      
    if (usersError) throw usersError;
    
    // Format the response
    const formatted = users.map(user => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name || user.username,
      availability: user.availability?.map(a => ({
        day: a.bookings?.day || 'Unknown',
        time: a.bookings?.time || '7:00 AM'
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

module.exports = app;
