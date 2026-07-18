export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Employee' | 'Manager' | 'SuperAdmin' | 'SystemAdmin';
  department: string;
  profilePic?: string;
  managerId?: string;
  forcePasswordReset?: boolean;
  companyId?: string;
  isActive?: boolean;
  isLocked?: boolean;
  failedLoginAttempts?: number;
  lastLogin?: Date | string;
}
