const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

exports.authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // read from ANY token shape, but expose ONLY `userId`
    const uid = payload.userId || payload.id || payload._id || payload.sub;
    if (!uid) return res.status(401).json({ msg: 'Invalid token payload: userId missing' });
    if (!mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(401).json({ msg: 'Invalid userId in token' });
    }

    // Only this shape going forward
    req.user = {
      userId: uid,
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// Role guard stays same but uses req.user.userId if needed
exports.checkRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Access denied' });
  }
  next();
};
