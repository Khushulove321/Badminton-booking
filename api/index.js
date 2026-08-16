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
