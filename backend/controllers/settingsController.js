const dataStore = require('../services/dataStore');

const getSettings = async (req, res) => {
  try {
    const settings = await dataStore.getSettings();
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const updated = await dataStore.updateSettings(req.body);
    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SETTINGS_UPDATE',
      module: 'Settings',
      details: 'Updated company settings and shift parameters',
      ipAddress: req.ip,
    });
    return res.status(200).json({ success: true, settings: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
