// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token, access denied.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    
    // Query Supabase users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, profile_pic, created_at')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ message: 'User not found, authorization denied.' });
    }

    // Map db field profile_pic to camelCase profilePic for app compatibility
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      profilePic: user.profile_pic,
      createdAt: user.created_at
    };
    
    next();
  } catch (err) {
    console.error('Authentication Error:', err.message);
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission for this resource.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
