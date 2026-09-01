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

// Create notifications table
// Run this in Supabase SQL Editor first:
/*
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('penalty', 'replacement', 'info', 'warning')),
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

// Get user's notifications
app.get('/api/booking/my-notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    
    res.json(notifications || []);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.json([]);
  }
});

// Mark notification as read
app.post('/api/booking/notification-read', authenticate, async (req, res) => {
  try {
    const { notification_id } = req.body;
    const userId = req.user.id;
    
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification_id)
      .eq('user_id', userId)
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Error marking notification read' });
  }
});

// Create notification function
app.post('/api/booking/create-notification', authenticate, async (req, res) => {
  try {
    const { user_id, title, message, type, related_id } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user_id,
        title: title,
        message: message,
        type: type || 'info',
        related_id: related_id || null
      })
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Error creating notification' });
  }
});

// Get unread notification count
app.get('/api/booking/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
      
    if (error) throw error;
    
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.json({ count: 0 });
  }
});

// Get pending replacement requests for a user
app.get('/api/booking/pending-replacements', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: replacements, error } = await supabaseAdmin
      .from('replacements')
      .select(`
        *,
        original_user:original_user_id (
          id,
          username,
          full_name
        ),
        replacement_user:replacement_user_id (
          id,
          username,
          full_name
        )
      `)
      .eq('replacement_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    res.json(replacements || []);
  } catch (error) {
    console.error('Error fetching pending replacements:', error);
    res.json([]);
  }
});

// Accept replacement request
app.post('/api/booking/accept-replacement', authenticate, async (req, res) => {
  try {
    const { replacement_id } = req.body;
    const userId = req.user.id;
    
    // Get the replacement request
    const { data: replacement, error: getError } = await supabaseAdmin
      .from('replacements')
      .select('*')
      .eq('id', replacement_id)
      .eq('replacement_user_id', userId)
      .eq('status', 'pending')
      .single();
      
    if (getError) throw getError;
    
    if (!replacement) {
      return res.status(404).json({ error: 'Replacement request not found' });
    }
    
    // Update replacement status
    const { error: updateError } = await supabaseAdmin
      .from('replacements')
      .update({ status: 'accepted', updated_at: new Date() })
      .eq('id', replacement_id);
      
    if (updateError) throw updateError;
    
    // Get booking ID for the day
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('day', replacement.day)
      .single();
      
    if (bookingError) throw bookingError;
    
    // Remove original user from availability
    const { error: deleteError } = await supabaseAdmin
      .from('availability')
      .delete()
      .eq('user_id', replacement.original_user_id)
      .eq('booking_id', booking.id);
      
    if (deleteError) throw deleteError;
    
    // Add replacement user to availability
    const { error: insertError } = await supabaseAdmin
      .from('availability')
      .insert({
        user_id: replacement.replacement_user_id,
        booking_id: booking.id
      });
      
    if (insertError) throw insertError;
    
    // Record history for both users
    const today = new Date().toISOString().split('T')[0];
    
    // History for original user (User A)
    await supabaseAdmin
      .from('history')
      .insert({
        user_id: replacement.original_user_id,
        event_date: today,
        action_type: 'replacement',
        day: replacement.day,
        description: 'Replaced by ' + (replacement.replacement_user?.username || 'another user'),
        related_user: replacement.replacement_user?.username || 'another user'
      });
      
    // History for replacement user (User B)
    await supabaseAdmin
      .from('history')
      .insert({
        user_id: replacement.replacement_user_id,
        event_date: today,
        action_type: 'replacement',
        day: replacement.day,
        description: 'Accepted replacement for ' + replacement.day,
        related_user: replacement.original_user?.username || 'another user'
      });
    
    // Create notifications
    // Notification for original user (User A)
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: replacement.original_user_id,
        title: '✅ Replacement Accepted',
        message: (replacement.replacement_user?.full_name || replacement.replacement_user?.username) + ' has accepted your replacement request for ' + replacement.day + '.',
        type: 'replacement',
        related_id: replacement_id
      });
      
    // Notification for replacement user (User B)
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: replacement.replacement_user_id,
        title: '✅ You Are Now the Replacement',
        message: 'You have successfully replaced ' + (replacement.original_user?.full_name || replacement.original_user?.username) + ' for ' + replacement.day + '.',
        type: 'replacement',
        related_id: replacement_id
      });
    
    res.json({ success: true, message: 'Replacement accepted' });
  } catch (error) {
    console.error('Error accepting replacement:', error);
    res.status(500).json({ error: 'Error accepting replacement' });
  }
});

// Decline replacement request
app.post('/api/booking/decline-replacement', authenticate, async (req, res) => {
  try {
    const { replacement_id } = req.body;
    const userId = req.user.id;
    
    // Get the replacement request
    const { data: replacement, error: getError } = await supabaseAdmin
      .from('replacements')
      .select('*')
      .eq('id', replacement_id)
      .eq('replacement_user_id', userId)
      .eq('status', 'pending')
      .single();
      
    if (getError) throw getError;
    
    if (!replacement) {
      return res.status(404).json({ error: 'Replacement request not found' });
    }
    
    // Update replacement status
    const { error: updateError } = await supabaseAdmin
      .from('replacements')
      .update({ status: 'declined', updated_at: new Date() })
      .eq('id', replacement_id);
      
    if (updateError) throw updateError;
    
    // Create notification for original user (User A)
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: replacement.original_user_id,
        title: '❌ Replacement Declined',
        message: (replacement.replacement_user?.full_name || replacement.replacement_user?.username) + ' has declined your replacement request for ' + replacement.day + '.',
        type: 'replacement',
        related_id: replacement_id
      });
      
    // Create notification for replacement user (User B)
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: replacement.replacement_user_id,
        title: '📋 Replacement Declined',
        message: 'You have declined the replacement request for ' + replacement.day + '.',
        type: 'replacement',
        related_id: replacement_id
      });
    
    res.json({ success: true, message: 'Replacement declined' });
  } catch (error) {
    console.error('Error declining replacement:', error);
    res.status(500).json({ error: 'Error declining replacement' });
  }
});

// Create replacement request
app.post('/api/booking/request-replacement', authenticate, async (req, res) => {
  try {
    const { original_user_id, replacement_user_id, day } = req.body;
    
    // Get booking ID for the day
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('day', day)
      .single();
      
    if (bookingError) throw bookingError;
    
    // Create replacement request
    const { data: replacement, error: insertError } = await supabaseAdmin
      .from('replacements')
      .insert({
        original_user_id: original_user_id,
        replacement_user_id: replacement_user_id,
        booking_id: booking.id,
        day: day,
        status: 'pending'
      })
      .select(`
        *,
        original_user:original_user_id (
          id,
          username,
          full_name
        ),
        replacement_user:replacement_user_id (
          id,
          username,
          full_name
        )
      `)
      .single();
      
    if (insertError) throw insertError;
    
    // Create notification for replacement user (User B)
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: replacement_user_id,
        title: '🔄 Replacement Request',
        message: (replacement.original_user?.full_name || replacement.original_user?.username) + ' has requested you to replace them for ' + day + '. Please accept or decline.',
        type: 'replacement',
        related_id: replacement.id
      });
    
    // Create notification for original user (User A)
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: original_user_id,
        title: '⏳ Replacement Request Sent',
        message: 'Your replacement request for ' + day + ' has been sent to ' + (replacement.replacement_user?.full_name || replacement.replacement_user?.username) + '. Waiting for response.',
        type: 'replacement',
        related_id: replacement.id
      });
    
    res.json({ success: true, data: replacement });
  } catch (error) {
    console.error('Error creating replacement request:', error);
    res.status(500).json({ error: 'Error creating replacement request' });
  }
});

// ===== ADMIN WIPE FUNCTIONS =====

// Wipe all data (admin only)
app.post('/api/admin/wipe-all', authenticate, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Get all users except the admin
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .neq('id', adminId);
      
    if (usersError) throw usersError;
    
    // Delete all data for each user
    for (let user of users) {
      // Delete from availability
      await supabaseAdmin
        .from('availability')
        .delete()
        .eq('user_id', user.id);
      
      // Delete from history
      await supabaseAdmin
        .from('history')
        .delete()
        .eq('user_id', user.id);
      
      // Delete from notifications
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      // Delete from penalties
      await supabaseAdmin
        .from('penalties')
        .delete()
        .eq('user_id', user.id);
      
      // Delete from replacements
      await supabaseAdmin
        .from('replacements')
        .delete()
        .or(`original_user_id.eq.${user.id},replacement_user_id.eq.${user.id}`);
      
      // Delete the user profile
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      // Delete the user from auth
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
    
    // Reset bookings
    await supabaseAdmin
      .from('bookings')
      .update({
        selected_user_id: null,
        is_booked: false
      })
      .neq('id', '');
    
    // Reset availability
    await supabaseAdmin
      .from('availability')
      .delete()
      .neq('id', '');
    
    res.json({ 
      success: true, 
      message: 'All data wiped successfully. Admin account kept.',
      users_deleted: users.length 
    });
  } catch (error) {
    console.error('Error wiping all data:', error);
    res.status(500).json({ error: 'Error wiping data' });
  }
});

// Wipe a specific player (admin only)
app.post('/api/admin/wipe-player', authenticate, isAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    const adminId = req.user.id;
    
    if (user_id === adminId) {
      return res.status(400).json({ error: 'Cannot wipe self. Use "Wipe Self" instead.' });
    }
    
    // Check if user exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', user_id)
      .single();
      
    if (profileError) throw profileError;
    
    // Delete all data for this user
    await supabaseAdmin
      .from('availability')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('history')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('penalties')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('replacements')
      .delete()
      .or(`original_user_id.eq.${user_id},replacement_user_id.eq.${user_id}`);
    
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id);
    
    await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    // Reset any bookings this user was selected for
    await supabaseAdmin
      .from('bookings')
      .update({
        selected_user_id: null,
        is_booked: false
      })
      .eq('selected_user_id', user_id);
    
    res.json({ 
      success: true, 
      message: `Player ${profile.username} wiped successfully.`,
      user_deleted: profile.username
    });
  } catch (error) {
    console.error('Error wiping player:', error);
    res.status(500).json({ error: 'Error wiping player' });
  }
});

// Wipe self (admin removing themselves)
app.post('/api/admin/wipe-self', authenticate, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Delete all admin's data
    await supabaseAdmin
      .from('availability')
      .delete()
      .eq('user_id', adminId);
    
    await supabaseAdmin
      .from('history')
      .delete()
      .eq('user_id', adminId);
    
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', adminId);
    
    await supabaseAdmin
      .from('penalties')
      .delete()
      .eq('user_id', adminId);
    
    await supabaseAdmin
      .from('replacements')
      .delete()
      .or(`original_user_id.eq.${adminId},replacement_user_id.eq.${adminId}`);
    
    // Remove admin status and reset profile
    await supabaseAdmin
      .from('profiles')
      .update({
        username: 'deleted_admin',
        full_name: 'Deleted Admin',
        is_admin: false
      })
      .eq('id', adminId);
    
    // Delete the admin user from auth
    await supabaseAdmin.auth.admin.deleteUser(adminId);
    
    res.json({ 
      success: true, 
      message: 'Admin account wiped successfully. You have been logged out.'
    });
  } catch (error) {
    console.error('Error wiping self:', error);
    res.status(500).json({ error: 'Error wiping self' });
  }
});

// Get all users for admin wipe selection
app.get('/api/admin/all-users', authenticate, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, is_admin')
      .neq('id', adminId);
      
    if (error) throw error;
    
    res.json(users || []);
  } catch (error) {
    console.error('Error fetching users for wipe:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// ===== ADMIN ERASE FUNCTIONS =====

// Erase a specific player's data but keep account (admin only)
app.post('/api/admin/erase-player-data', authenticate, isAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    const adminId = req.user.id;
    
    if (user_id === adminId) {
      return res.status(400).json({ error: 'Cannot erase your own data. Use the other options.' });
    }
    
    // Check if user exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', user_id)
      .single();
      
    if (profileError) throw profileError;
    
    // Delete ALL data for this user but KEEP the account
    await supabaseAdmin
      .from('availability')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('history')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('penalties')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('replacements')
      .delete()
      .or(`original_user_id.eq.${user_id},replacement_user_id.eq.${user_id}`);
    
    // Reset any bookings this user was selected for
    await supabaseAdmin
      .from('bookings')
      .update({
        selected_user_id: null,
        is_booked: false
      })
      .eq('selected_user_id', user_id);
    
    res.json({ 
      success: true, 
      message: `All data for ${profile.username} has been erased. Account retained.`,
      user: profile.username
    });
  } catch (error) {
    console.error('Error erasing player data:', error);
    res.status(500).json({ error: 'Error erasing player data' });
  }
});

// Erase a specific player (account + data)
app.post('/api/admin/erase-player', authenticate, isAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    const adminId = req.user.id;
    
    if (user_id === adminId) {
      return res.status(400).json({ error: 'Cannot erase yourself. Use the other options.' });
    }
    
    // Check if user exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', user_id)
      .single();
      
    if (profileError) throw profileError;
    
    // Delete ALL data for this user
    await supabaseAdmin
      .from('availability')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('history')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('penalties')
      .delete()
      .eq('user_id', user_id);
    
    await supabaseAdmin
      .from('replacements')
      .delete()
      .or(`original_user_id.eq.${user_id},replacement_user_id.eq.${user_id}`);
    
    // Delete the user profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id);
    
    // Delete the user from auth
    await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    // Reset any bookings this user was selected for
    await supabaseAdmin
      .from('bookings')
      .update({
        selected_user_id: null,
        is_booked: false
      })
      .eq('selected_user_id', user_id);
    
    res.json({ 
      success: true, 
      message: `Player ${profile.username} has been completely erased.`,
      user_deleted: profile.username
    });
  } catch (error) {
    console.error('Error erasing player:', error);
    res.status(500).json({ error: 'Error erasing player' });
  }
});

// Wipe all players' DATA but keep accounts (admin only)
app.post('/api/admin/wipe-all-data', authenticate, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Get all users except the admin
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .neq('id', adminId);
      
    if (usersError) throw usersError;
    
    // Delete all data for each user but KEEP accounts
    for (let user of users) {
      await supabaseAdmin
        .from('availability')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('history')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('penalties')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('replacements')
        .delete()
        .or(`original_user_id.eq.${user.id},replacement_user_id.eq.${user.id}`);
    }
    
    // Reset bookings
    await supabaseAdmin
      .from('bookings')
      .update({
        selected_user_id: null,
        is_booked: false
      })
      .neq('id', '');
    
    // Reset availability
    await supabaseAdmin
      .from('availability')
      .delete()
      .neq('id', '');
    
    res.json({ 
      success: true, 
      message: 'All player data wiped successfully. Accounts retained.',
      users_affected: users.length 
    });
  } catch (error) {
    console.error('Error wiping all data:', error);
    res.status(500).json({ error: 'Error wiping data' });
  }
});

// Remove ALL players (accounts + data) except admin (admin only)
app.post('/api/admin/remove-all-players', authenticate, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Get all users except the admin
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .neq('id', adminId);
      
    if (usersError) throw usersError;
    
    // Delete all data and accounts for each user
    for (let user of users) {
      await supabaseAdmin
        .from('availability')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('history')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('penalties')
        .delete()
        .eq('user_id', user.id);
      
      await supabaseAdmin
        .from('replacements')
        .delete()
        .or(`original_user_id.eq.${user.id},replacement_user_id.eq.${user.id}`);
      
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
    
    // Reset bookings
    await supabaseAdmin
      .from('bookings')
      .update({
        selected_user_id: null,
        is_booked: false
      })
      .neq('id', '');
    
    // Reset availability
    await supabaseAdmin
      .from('availability')
      .delete()
      .neq('id', '');
    
    res.json({ 
      success: true, 
      message: `All players removed successfully. Admin account kept.`,
      users_removed: users.length 
    });
  } catch (error) {
    console.error('Error removing all players:', error);
    res.status(500).json({ error: 'Error removing players' });
  }
});

// Get all users for admin erase selection
app.get('/api/admin/all-users', authenticate, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, is_admin')
      .neq('id', adminId);
      
    if (error) throw error;
    
    res.json(users || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Get notification details
app.post('/api/booking/notification-details', authenticate, async (req, res) => {
  try {
    const { notification_id } = req.body;
    const userId = req.user.id;
    
    // Get the notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .eq('user_id', userId)
      .single();
      
    if (notifError) throw notifError;
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const result = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      date: notification.created_at,
      time: notification.created_at,
      related_id: notification.related_id
    };
    
    // Get additional details based on type
    if (notification.type === 'penalty') {
      // Get penalty details
      const { data: penalty, error: penaltyError } = await supabaseAdmin
        .from('penalties')
        .select('*')
        .eq('id', notification.related_id)
        .single();
        
      if (!penaltyError && penalty) {
        result.amount = penalty.amount || 10.00;
        result.penalty_status = penalty.status || 'pending';
        result.paid_at = penalty.paid_at || null;
        result.reason = penalty.reason || 'Cancelled after court was booked';
        result.day = penalty.day || notification.message.match(/for (\w+)/)?.[1] || 'Unknown';
      }
    } else if (notification.type === 'replacement') {
      // Get replacement details
      const { data: replacement, error: replacementError } = await supabaseAdmin
        .from('replacements')
        .select(`
          *,
          original_user:original_user_id (username, full_name),
          replacement_user:replacement_user_id (username, full_name)
        `)
        .eq('id', notification.related_id)
        .single();
        
      if (!replacementError && replacement) {
        result.original_user = replacement.original_user?.full_name || replacement.original_user?.username || 'N/A';
        result.replacement_user = replacement.replacement_user?.full_name || replacement.replacement_user?.username || 'N/A';
        result.replacement_status = replacement.status || 'pending';
        result.approved_at = replacement.updated_at || null;
        result.day = replacement.day || 'Unknown';
      }
    } else if (notification.type === 'info') {
      // Try to get day from message
      const dayMatch = notification.message.match(/for (\w+)/);
      if (dayMatch) {
        result.day = dayMatch[1];
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notification details:', error);
    res.status(500).json({ error: 'Error fetching notification details' });
  }
});

// Get notification details
app.post('/api/booking/notification-details', authenticate, async (req, res) => {
  try {
    const { notification_id } = req.body;
    const userId = req.user.id;
    
    // Get the notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .eq('user_id', userId)
      .single();
      
    if (notifError) throw notifError;
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const result = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      date: notification.created_at,
      time: notification.created_at,
      related_id: notification.related_id
    };
    
    // Get additional details based on type
    if (notification.type === 'penalty') {
      // Get penalty details
      const { data: penalty, error: penaltyError } = await supabaseAdmin
        .from('penalties')
        .select('*')
        .eq('id', notification.related_id)
        .single();
        
      if (!penaltyError && penalty) {
        result.amount = penalty.amount || 10.00;
        result.penalty_status = penalty.status || 'pending';
        result.paid_at = penalty.paid_at || null;
        result.reason = penalty.reason || 'Cancelled after court was booked';
        result.day = penalty.day || notification.message.match(/for (\w+)/)?.[1] || 'Unknown';
      }
    } else if (notification.type === 'replacement') {
      // Get replacement details
      const { data: replacement, error: replacementError } = await supabaseAdmin
        .from('replacements')
        .select(`
          *,
          original_user:original_user_id (username, full_name),
          replacement_user:replacement_user_id (username, full_name)
        `)
        .eq('id', notification.related_id)
        .single();
        
      if (!replacementError && replacement) {
        result.original_user = replacement.original_user?.full_name || replacement.original_user?.username || 'N/A';
        result.replacement_user = replacement.replacement_user?.full_name || replacement.replacement_user?.username || 'N/A';
        result.replacement_status = replacement.status || 'pending';
        result.approved_at = replacement.updated_at || null;
        result.day = replacement.day || 'Unknown';
      }
    } else if (notification.type === 'info') {
      // Try to get day from message
      const dayMatch = notification.message.match(/for (\w+)/);
      if (dayMatch) {
        result.day = dayMatch[1];
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching notification details:', error);
    res.status(500).json({ error: 'Error fetching notification details' });
  }
});

// ===== BOOKING SCHEDULE FUNCTIONS =====

// Get the weekly booking schedule (This Week & Next Week)
app.get('/api/booking/schedule', authenticate, async (req, res) => {
  try {
    const thisWeekDates = getThisWeekDates();
    const nextWeekDates = getNextWeekDates();
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Get all bookings with selected users
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        day,
        is_booked,
        selected_user_id,
        profiles:selected_user_id (
          id,
          username,
          full_name
        ),
        availability (
          user_id,
          profiles:user_id (
            id,
            username,
            full_name
          )
        )
      `);
      
    if (error) throw error;
    
    // Get all replacement history
    const { data: replacements, error: replaceError } = await supabaseAdmin
      .from('replacements')
      .select('*')
      .eq('status', 'accepted');
      
    if (replaceError) throw replaceError;
    
    // Format the schedule
    const schedule = [];
    
    for (let day of dayOrder) {
      const booking = bookings.find(b => b.day === day);
      const thisWeekDate = thisWeekDates.find(d => d.day === day);
      const nextWeekDate = nextWeekDates.find(d => d.day === day);
      
      // Get available users for this day
      const availableUsers = booking?.availability?.map(a => ({
        id: a.profiles.id,
        username: a.profiles.username,
        full_name: a.profiles.full_name
      })) || [];
      
      // Get replacements for this day
      const dayReplacements = replacements.filter(r => r.day === day);
      
      schedule.push({
        day: day,
        thisWeek: {
          date: thisWeekDate?.date || null,
          dateString: thisWeekDate?.dateString || null,
          selected_user: booking?.profiles || null,
          is_booked: booking?.is_booked || false,
          available_count: availableUsers.length,
          available_users: availableUsers,
          replacements: dayReplacements
        },
        nextWeek: {
          date: nextWeekDate?.date || null,
          dateString: nextWeekDate?.dateString || null,
          selected_user: null, // Will be set by random selection on Sunday
          is_booked: false,
          available_count: 0,
          available_users: []
        }
      });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Error fetching schedule' });
  }
});

// Get available users for a specific day
app.get('/api/booking/day-availability/:day', authenticate, async (req, res) => {
  try {
    const { day } = req.params;
    
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        day,
        availability (
          user_id,
          profiles:user_id (
            id,
            username,
            full_name
          )
        )
      `)
      .eq('day', day)
      .single();
      
    if (error) throw error;
    
    const availableUsers = booking?.availability?.map(a => ({
      id: a.profiles.id,
      username: a.profiles.username,
      full_name: a.profiles.full_name
    })) || [];
    
    res.json({ day, available_users: availableUsers });
  } catch (error) {
    console.error('Error fetching day availability:', error);
    res.status(500).json({ error: 'Error fetching day availability' });
  }
});

// Run Sunday selection (automatically picks bookers for next week)
app.post('/api/booking/run-sunday-selection', authenticate, isAdmin, async (req, res) => {
  try {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const results = [];
    
    for (let day of dayOrder) {
      // Get all users who marked "In" for this day
      const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .select(`
          id,
          day,
          availability (
            user_id
          )
        `)
        .eq('day', day)
        .single();
        
      if (error) throw error;
      
      const availableUsers = booking?.availability?.map(a => a.user_id) || [];
      
      if (availableUsers.length === 0) {
        results.push({ day, selected: null, message: 'No users available' });
        continue;
      }
      
      // Randomly select one user
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const selectedUserId = availableUsers[randomIndex];
      
      // Update booking with selected user
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ 
          selected_user_id: selectedUserId,
          is_booked: true,
          updated_at: new Date()
        })
        .eq('day', day);
        
      if (updateError) throw updateError;
      
      // Get user details
      const { data: user, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('username, full_name')
        .eq('id', selectedUserId)
        .single();
        
      if (userError) throw userError;
      
      // Create notification for selected user
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: selectedUserId,
          title: '🎯 You\'ve Been Selected to Book!',
          message: `You have been randomly selected to book the court for ${day}. Please confirm if you can do it.`,
          type: 'info',
          related_id: booking.id
        });
      
      results.push({ 
        day, 
        selected: user, 
        message: 'User selected successfully' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Sunday selection completed',
      results: results
    });
  } catch (error) {
    console.error('Error running Sunday selection:', error);
    res.status(500).json({ error: 'Error running Sunday selection' });
  }
});

// Helper functions for dates
function getThisWeekDates() {
  const today = new Date();
  const currentDay = today.getDay();
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMonday);
  const weekDates = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(thisMonday);
    date.setDate(thisMonday.getDate() + i);
    weekDates.push({
      day: dayNames[i],
      date: date,
      dateString: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
  }
  return weekDates;
}

function getNextWeekDates() {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilNextMonday;
  if (currentDay === 0) {
    daysUntilNextMonday = 1;
  } else if (currentDay === 1) {
    daysUntilNextMonday = 7;
  } else {
    daysUntilNextMonday = 8 - currentDay;
  }
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  const weekDates = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(nextMonday);
    date.setDate(nextMonday.getDate() + i);
    weekDates.push({
      day: dayNames[i],
      date: date,
      dateString: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
  }
  return weekDates;
}
