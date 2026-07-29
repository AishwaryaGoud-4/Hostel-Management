const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { recipientId: req.user.userId };
    if (unreadOnly === 'true') filter.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).populate('senderId', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: req.user.userId, isRead: false }),
    ]);
    res.status(200).json({
      success: true, message: 'Notifications', data: { notifications, unreadCount },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user.userId, isRead: false }, { isRead: true, readAt: new Date() });
    res.status(200).json({ success: true, message: 'All marked read' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
