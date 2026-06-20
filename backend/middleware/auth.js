import { admin } from '../config/firebase.js';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find user in MongoDB
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found. Please complete registration.' });
    }

    req.user = user;
    req.firebaseUid = decodedToken.uid;
    next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decodedToken.uid;
    req.firebaseEmail = decodedToken.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid Firebase token' });
  }
};
