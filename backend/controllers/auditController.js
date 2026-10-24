const dataStore = require('../services/dataStore');

const getAuditLogs = async (req, res) => {
  try {
    const logs = await dataStore.findAuditLogs(150);
    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuditLogs,
};
