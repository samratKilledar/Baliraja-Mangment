export type Role = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
}
