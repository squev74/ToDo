export type UserRole = 'admin' | 'user';

export type UserStatus = 'pending' | 'approved' | 'disabled';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}
