import jwt from 'jsonwebtoken';
import supabase from '../../infrastructure/database/supabase';
import { Request, Response, NextFunction } from 'express';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token, access denied.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123') as any;
    
    // Query Supabase users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, department, profile_pic, created_at, company_id')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ message: 'User not found, authorization denied.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      profilePic: user.profile_pic,
      createdAt: user.created_at,
      companyId: user.company_id
    } as any;
    
    next();
  } catch (err: any) {
    console.error('Authentication Error:', err.message);
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
};

export const authorize = (roles: string[] | string = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission for this resource.' });
    }
    next();
  };
};
