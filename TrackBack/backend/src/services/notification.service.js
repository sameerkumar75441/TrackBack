import Notification from '../models/Notification.js';

const error = (message, statusCode) => Object.assign(new Error(message), { statusCode });

export const createNotification = async ({ recipient, type, title, message, item, claim, dedupeKey }) => {
  try { return await Notification.create({ recipient, type, title, message, item, claim, dedupeKey }); }
  catch (cause) { if (cause.code === 11000 && dedupeKey) return null; throw cause; }
};
export const listNotifications = async (user) => {
  const notifications = await Notification.find({ recipient: user.id }).sort({ createdAt: -1 }).limit(50).lean();
  return { notifications, unreadCount: notifications.filter((notification) => !notification.read).length };
};
export const markRead = async (id, user) => {
  const notification = await Notification.findOneAndUpdate({ _id: id, recipient: user.id }, { $set: { read: true } }, { new: true });
  if (!notification) throw error('Notification not found.', 404);
  return notification;
};
export const markAllRead = async (user) => { await Notification.updateMany({ recipient: user.id, read: false }, { $set: { read: true } }); };
