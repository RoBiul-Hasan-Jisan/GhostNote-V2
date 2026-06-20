import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// POST /api/auth/verify - Verify Firebase token and return user profile
router.post('/verify', verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUid });
    if (!user) {
      return res.status(200).json({ verified: true, hasProfile: false });
    }
    res.json({ verified: true, hasProfile: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error during verification' });
  }
});

export default router;
