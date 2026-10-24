const dataStore = require('../services/dataStore');

const getAnnouncements = async (req, res) => {
  try {
    const list = await dataStore.findAnnouncements(req.user.role);
    return res.status(200).json({ success: true, count: list.length, announcements: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetRole, priority, pinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const ann = await dataStore.createAnnouncement({
      title: title.trim(),
      content: content.trim(),
      targetRole: targetRole || 'All',
      priority: priority || 'Normal',
      pinned: !!pinned,
      authorName: req.user.name,
      authorEmail: req.user.email,
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ANNOUNCEMENT_CREATE',
      module: 'Comms',
      details: `Created announcement: ${title}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, announcement: ann });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await dataStore.deleteAnnouncement(id);
    return res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};
