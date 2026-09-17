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

async function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    return null;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

app.get('/api/booking/all-users', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, email')
      .order('username');
    if (error) throw error;
    res.json(profiles || []);
  } catch (err) {
    console.error('all-users error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/availability', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const weekType = req.query.week || 'next';
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('week_type', weekType);
    if (bookingsError) throw bookingsError;
    const { data: selections, error: selError } = await supabaseAdmin
      .from('selections')
      .select('day, user_id, profiles:user_id (id, username, full_name, email)')
      .eq('week_type', weekType);
    if (selError) throw selError;
    const result = dayNames.map(day => {
      const booking = (bookings || []).find(b => b.day === day) || {};
      const dayUsers = (selections || [])
        .filter(s => s.day === day && s.profiles)
        .map(s => s.profiles);
      return {
        day: day,
        is_booked: booking.is_booked || false,
        selected_user: booking.selected_user_id
          ? (dayUsers.find(u => u.id === booking.selected_user_id) || null)
          : null,
        available_users: dayUsers,
        time: booking.time || '7:00 - 8:00 AM'
      };
    });
    res.json(result);
  } catch (err) {
    console.error('availability error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/select/:day', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const day = req.params.day;
    const { user_id, action } = req.body;
    if (user_id && action === 'remove') {
      await supabaseAdmin
        .from('selections')
        .delete()
        .eq('day', day)
        .eq('user_id', user_id)
        .eq('week_type', 'next');
      return res.json({ message: 'User removed', action: 'removed' });
    }
    const { data: existing } = await supabaseAdmin
      .from('selections')
      .select('id')
      .eq('day', day)
      .eq('user_id', user.id)
      .eq('week_type', 'next')
      .maybeSingle();
    if (existing) {
      await supabaseAdmin.from('selections').delete().eq('id', existing.id);
      return res.json({ message: 'Removed from ' + day, action: 'removed' });
    } else {
      const { error } = await supabaseAdmin
        .from('selections')
        .insert({ day: day, user_id: user.id, week_type: 'next' });
      if (error) throw error;
      return res.json({ message: 'Added to ' + day, action: 'added' });
    }
  } catch (err) {
    console.error('select error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/my-availability', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabaseAdmin
      .from('selections')
      .select('day')
      .eq('user_id', user.id)
      .eq('week_type', 'next');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('my-availability error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/this-week-bookers', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('week_type', 'this');
    if (error) throw error;
    const { data: selections } = await supabaseAdmin
      .from('selections')
      .select('day, profiles:user_id (id, username, full_name, email)')
      .eq('week_type', 'this');
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const result = dayNames.map(day => {
      const booking = (bookings || []).find(b => b.day === day) || {};
      const dayUsers = (selections || []).filter(s => s.day === day && s.profiles).map(s => s.profiles);
      return {
        day: day,
        selected_user: booking.selected_user_id
          ? (dayUsers.find(u => u.id === booking.selected_user_id) || null)
          : null,
        available_users: dayUsers,
        available_count: dayUsers.length
      };
    });
    res.json(result);
  } catch (err) {
    console.error('this-week-bookers error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/selected-players', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('week_type', 'next');
    if (error) throw error;
    const { data: selections } = await supabaseAdmin
      .from('selections')
      .select('day, profiles:user_id (id, username, full_name, email)')
      .eq('week_type', 'next');
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const result = dayNames.map(day => {
      const booking = (bookings || []).find(b => b.day === day) || {};
      const dayUsers = (selections || []).filter(s => s.day === day && s.profiles).map(s => s.profiles);
      return {
        day: day,
        selected_user: booking.selected_user_id
          ? (dayUsers.find(u => u.id === booking.selected_user_id) || null)
          : null,
        available_users: dayUsers,
        available_count: dayUsers.length
      };
    });
    res.json(result);
  } catch (err) {
    console.error('selected-players error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/select-random/:day', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const day = req.params.day;
    const { force_user_id } = req.body;
    let selectedUserId = force_user_id;
    if (!selectedUserId) {
      const { data: selections } = await supabaseAdmin
        .from('selections')
        .select('user_id')
        .eq('day', day)
        .eq('week_type', 'next');
      if (!selections || selections.length === 0) {
        return res.status(400).json({ error: 'No users available for ' + day });
      }
      const random = selections[Math.floor(Math.random() * selections.length)];
      selectedUserId = random.user_id;
    }
    const { data: existing } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('day', day)
      .eq('week_type', 'next')
      .maybeSingle();
    if (existing) {
      await supabaseAdmin
        .from('bookings')
        .update({ selected_user_id: selectedUserId, is_booked: true })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('bookings')
        .insert({
          day: day,
          week_type: 'next',
          selected_user_id: selectedUserId,
          is_booked: true,
          time: '7:00 - 8:00 AM'
        });
    }
    res.json({ success: true, day: day, selected_user_id: selectedUserId });
  } catch (err) {
    console.error('select-random error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/reset/:day', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const day = req.params.day;
    await supabaseAdmin
      .from('bookings')
      .update({ selected_user_id: null, is_booked: false })
      .eq('day', day)
      .eq('week_type', 'next');
    res.json({ success: true });
  } catch (err) {
    console.error('reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/my-notifications', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/unread-count', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/create-notification', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { user_id, title, message, type, related_id } = req.body;
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        type: type || 'info',
        related_id: related_id || null
      });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/notification-read', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { notification_id } = req.body;
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification_id)
      .eq('user_id', user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/my-penalties', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabaseAdmin
      .from('penalties')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_paid', false);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/penalty', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { user_id, booking_id, amount } = req.body;
    const { error } = await supabaseAdmin
      .from('penalties')
      .insert({
        user_id,
        booking_id: booking_id || null,
        amount: amount || 10,
        is_paid: false
      });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/pending-replacements', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabaseAdmin
      .from('replacements')
      .select('*, original_user:original_user_id (id, username, full_name)')
      .eq('replacement_user_id', user.id)
      .eq('status', 'pending');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/request-replacement', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { original_user_id, replacement_user_id, day } = req.body;
    const { error } = await supabaseAdmin
      .from('replacements')
      .insert({
        original_user_id,
        replacement_user_id,
        day,
        status: 'pending'
      });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/accept-replacement', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { replacement_id } = req.body;
    await supabaseAdmin
      .from('replacements')
      .update({ status: 'accepted' })
      .eq('id', replacement_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/decline-replacement', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { replacement_id } = req.body;
    await supabaseAdmin
      .from('replacements')
      .update({ status: 'declined' })
      .eq('id', replacement_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/record-history', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { event_date, action_type, day, description, amount, related_user } = req.body;
    await supabaseAdmin
      .from('history')
      .insert({
        user_id: user.id,
        event_date,
        action_type,
        day,
        description,
        amount: amount || 0,
        related_user: related_user || null
      });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/booking/announce-results', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('day, selected_user_id')
      .eq('week_type', 'next')
      .eq('is_booked', true);
    let notified = 0;
    for (const b of (bookings || [])) {
      if (b.selected_user_id) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: b.selected_user_id,
            title: '🎯 You are the booker for ' + b.day + '!',
            message: 'You have been selected as the court booker for ' + b.day + '. Please book the court.',
            type: 'info'
          });
        notified++;
      }
    }
    res.json({ success: true, notified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking/all-votes', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username');
    const { data: selections } = await supabaseAdmin
      .from('selections')
      .select('user_id, day')
      .eq('week_type', 'next');
    const result = (profiles || []).map(p => ({
      username: p.username,
      availability: (selections || []).filter(s => s.user_id === p.id).map(s => ({ day: s.day }))
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;