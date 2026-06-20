import express from 'express';
import { body, validationResult } from 'express-validator';
import { verifyFirebaseToken, verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// POST /api/users/create - Create user profile after Firebase signup
router.post(
  '/create',
  verifyFirebaseToken,
  [
    body('username')
      .trim()
      .toLowerCase()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 chars, letters/numbers/underscore only'),
    body('displayName').optional().trim().isLength({ max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ firebaseUid: req.firebaseUid });
      if (existingUser) {
        return res.status(200).json({ user: existingUser, message: 'Profile already exists' });
      }

      const { username, displayName, photoURL } = req.body;
      const usernameLC = username.toLowerCase();

      // Check username availability
      const usernameTaken = await User.findOne({ username: usernameLC });
      if (usernameTaken) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      const user = new User({
        firebaseUid: req.firebaseUid,
        email: req.firebaseEmail,
        username: usernameLC,
        displayName: displayName || username,
        profileLink: `/u/${usernameLC}`,
        photoURL: photoURL || null,
      });

      await user.save();
      res.status(201).json({ user, message: 'Profile created successfully' });
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({ error: `${field} already in use` });
      }
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create profile' });
    }
  }
);

// GET /api/users/me - Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/users/check-username/:username - Check if username is available
router.get('/check-username/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ available: false, error: 'Invalid username format' });
  }
  const exists = await User.findOne({ username });
  res.json({ available: !exists });
});

// GET /api/users/profile/:username - Get public user profile (for message page)
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Return only public info
    res.json({
      username: user.username,
      displayName: user.displayName,
      profileLink: user.profileLink,
      isAcceptingMessages: user.isAcceptingMessages,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/settings - Update accepting messages toggle
router.patch('/settings', verifyToken, async (req, res) => {
  try {
    const { isAcceptingMessages } = req.body;
    req.user.isAcceptingMessages = isAcceptingMessages;
    await req.user.save();
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
