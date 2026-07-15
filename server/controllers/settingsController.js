const { query } = require('../db');

// Get all settings as a key-value object
const getSettings = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settingsObj = {};
    result.rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });
    res.json(settingsObj);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

// Update settings
const updateSettings = async (req, res) => {
  const settings = req.body; // e.g. { shop_name: '...', dealer_under: '...' }
  
  try {
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (key) 
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    
    // Log in audit logs
    if (req.user) {
      await query(
        'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [req.user.id, 'Update Settings', `Updated settings: ${Object.keys(settings).join(', ')}`]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ message: 'Error updating settings' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
