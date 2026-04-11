export type Role = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'worker';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  designation?: string;
  mustChangePassword?: boolean;
}
