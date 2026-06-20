import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import Message, { MESSAGE_TYPES } from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// Rate limit: 10 messages per IP per 15 minutes (anti-spam)
const sendMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many messages sent. Please wait before sending more.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/messages/send - Send anonymous message (no auth required)
router.post(
  '/send',
  sendMessageLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('type').isIn(MESSAGE_TYPES).withMessage(`Type must be one of: ${MESSAGE_TYPES.join(', ')}`),
    body('message')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, type, message } = req.body;

      // Find recipient
      const recipient = await User.findOne({ username: username.toLowerCase() });
      if (!recipient) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!recipient.isAcceptingMessages) {
        return res.status(403).json({ error: 'This user is not accepting messages' });
      }

      // Store message — NO sender info stored whatsoever
      const newMessage = new Message({
        receiverId: recipient.firebaseUid,
        type,
        message: message.trim(),
      });

      await newMessage.save();
      res.status(201).json({ success: true, message: 'Message sent anonymously!' });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// GET /api/messages - Get current user's messages (auth required)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { receiverId: req.firebaseUid };

    if (type && MESSAGE_TYPES.includes(type)) filter.type = type;
    if (unreadOnly === 'true') filter.isRead = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Message.countDocuments(filter),
    ]);

    // Stats per category
    const stats = await Message.aggregate([
      { $match: { receiverId: req.firebaseUid } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const statsMap = { total: 0 };
    MESSAGE_TYPES.forEach(t => (statsMap[t] = 0));
    stats.forEach(s => {
      statsMap[s._id] = s.count;
      statsMap.total += s.count;
    });

    res.json({
      messages,
      stats: statsMap,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// PATCH /api/messages/:id/read - Mark as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, receiverId: req.firebaseUid },
      { isRead: true },
      { new: true }
    );
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// DELETE /api/messages/:id - Delete message (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const message = await Message.findOneAndDelete({
      _id: req.params.id,
      receiverId: req.firebaseUid,
    });
    if (!message) return res.status(404).json({ error: 'Message not found or unauthorized' });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
