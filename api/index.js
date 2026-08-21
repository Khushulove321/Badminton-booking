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
    console.error('Error fetching availability:', error);
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
    console.error('Error toggling availability:', error);
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

// Get user's availability - FIXED
app.get('/api/booking/my-availability', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📊 Getting availability for user:', userId);
    
    // Try to get from availability table directly
    const { data: availabilityData, error: availabilityError } = await supabaseAdmin
      .from('availability')
      .select(`
        booking_id,
        bookings (
          id,
          day,
          time,
          is_booked
        )
      `)
      .eq('user_id', userId);
      
    if (availabilityError) {
      console.error('❌ Availability error:', availabilityError);
      // Return empty array instead of error
      return res.json([]);
    }
    
    // Format the response
    const formatted = availabilityData
      .filter(item => item.bookings) // Filter out null bookings
      .map(item => ({
        day: item.bookings?.day || 'Unknown',
        time: item.bookings?.time || '7:00 - 8:00 AM',
        is_booked: item.bookings?.is_booked || false,
        booking_id: item.bookings?.id || null
      }));
    
    console.log('✅ My availability data:', formatted);
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching user availability:', error);
    // Return empty array instead of error
    res.json([]);
  }
});

// Get all users with their availability (admin only)
app.get('/api/booking/all-users', authenticate, isAdmin, async (req, res) => {
  try {
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

// Get user's penalties
app.get('/api/booking/my-penalties', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if penalties table exists, if not return empty array
    const { data: penalties, error } = await supabaseAdmin
      .from('penalties')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (error) {
      console.error('❌ Penalties error:', error);
      // Table might not exist yet, return empty
      return res.json([]);
    }
    
    res.json(penalties || []);
  } catch (error) {
    console.error('Error fetching penalties:', error);
    res.json([]);
  }
});

// Pay penalty
app.post('/api/booking/pay-penalty', authenticate, async (req, res) => {
  try {
    const { penalty_id } = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabaseAdmin
      .from('penalties')
      .update({ status: 'paid', paid_at: new Date() })
      .eq('id', penalty_id)
      .eq('user_id', userId)
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error paying penalty:', error);
    res.status(500).json({ error: 'Error paying penalty' });
  }
});

// Record penalty
app.post('/api/booking/penalty', authenticate, async (req, res) => {
  try {
    const { user_id, booking_id, amount } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('penalties')
      .insert({
        user_id: user_id,
        booking_id: booking_id,
        amount: amount || 10.00,
        status: 'pending'
      })
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error recording penalty:', error);
    res.status(500).json({ error: 'Error recording penalty' });
  }
});

// Get user history
app.get('/api/booking/my-history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's booking history
    const { data: history, error } = await supabaseAdmin
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('❌ History error:', error);
      // Table might not exist yet, return empty
      return res.json([]);
    }
    
    res.json(history || []);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.json([]);
  }
});

// Admin open bookings
app.post('/api/booking/admin-open', authenticate, isAdmin, async (req, res) => {
  try {
    const { open } = req.body;
    
    // Store in database or just return success
    // In a real app, you'd store this setting
    res.json({ success: true, open });
  } catch (error) {
    console.error('Error setting admin open:', error);
    res.status(500).json({ error: 'Error setting admin open' });
  }
});

// Replacement endpoint
app.post('/api/booking/replace', authenticate, async (req, res) => {
  try {
    const { original_user_id, replacement_user_id, day } = req.body;
    
    // Get booking ID for the day
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('day', day)
      .single();
      
    if (bookingError) throw bookingError;
    
    // Remove original user
    const { error: deleteError } = await supabaseAdmin
      .from('availability')
      .delete()
      .eq('user_id', original_user_id)
      .eq('booking_id', booking.id);
      
    if (deleteError) throw deleteError;
    
    // Add replacement user
    const { error: insertError } = await supabaseAdmin
      .from('availability')
      .insert({
        user_id: replacement_user_id,
        booking_id: booking.id
      });
      
    if (insertError) throw insertError;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error replacing user:', error);
    res.status(500).json({ error: 'Error replacing user' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

module.exports = app;

// Get user's history with all events
app.get('/api/booking/my-history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get history from the history table
    const { data: history, error } = await supabaseAdmin
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false })
      .limit(100);
      
    if (error) {
      console.error('❌ History error:', error);
      // If table doesn't exist, return empty array
      return res.json([]);
    }
    
    // Format the response with nice date strings
    const formatted = history.map(item => ({
      id: item.id,
      event_date: item.event_date,
      action_type: item.action_type,
      day: item.day,
      description: item.description,
      amount: item.amount || 0,
      related_user: item.related_user,
      created_at: item.created_at
    }));
    
    res.json(formatted || []);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.json([]);
  }
});

// Record history event (called by other actions)
app.post('/api/booking/record-history', authenticate, async (req, res) => {
  try {
    const { event_date, action_type, day, description, amount, related_user } = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabaseAdmin
      .from('history')
      .insert({
        user_id: userId,
        event_date: event_date,
        action_type: action_type,
        day: day,
        description: description,
        amount: amount || 0,
        related_user: related_user || null
      })
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error recording history:', error);
    res.status(500).json({ error: 'Error recording history' });
  }
});

// Get monthly history for calendar
app.get('/api/booking/monthly-history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;
    
    // Get history for specific month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    const { data: history, error } = await supabaseAdmin
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true });
      
    if (error) throw error;
    
    res.json(history || []);
  } catch (error) {
    console.error('Error fetching monthly history:', error);
    res.json([]);
  }
});
