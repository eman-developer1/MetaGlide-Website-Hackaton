const dataStore = require('../services/dataStore');

const getNotifications = async (req, res) => {
  try {
    const list = await dataStore.findNotifications(req.user.id);
    const unreadCount = list.filter((n) => !n.read).length;
    return res.status(200).json({ success: true, count: list.length, unreadCount, notifications: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await dataStore.markNotificationsRead(req.user.id);
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
