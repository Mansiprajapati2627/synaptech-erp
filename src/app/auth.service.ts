// src/app/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'Admin' | 'HR' | 'Manager' | 'Employee';
export type PageKey = 'dashboard' | 'employees' | 'attendance' | 'leave-management' | 'projects' | 'department' | 'settings' | 'access' | 'tasks' | 'documents' | 'payroll';

export interface SessionUser {
  name: string;
  email: string;
  role: UserRole;
  employeeName?: string;
}

export interface PermissionConfig {
  roles: Record<UserRole, PageKey[]>;
  employees: Record<string, PageKey[]>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionKey = 'synaptech-session';
  private readonly permissionsKey = 'synaptech-permissions';

  private permissionsSubject = new BehaviorSubject<PermissionConfig | null>(null);
  public permissions$ = this.permissionsSubject.asObservable();

  readonly pageLabels: Record<PageKey, string> = {
    dashboard: 'Dashboard',
    employees: 'Employees',
    attendance: 'Attendance',
    'leave-management': 'Leave requests',
    projects: 'Projects',
    department: 'Departments',
    settings: 'Settings',
    access: 'Access & permissions',
    tasks: 'Tasks',
    documents: 'Documents',
    payroll: 'Payroll'
  };

  // 🔥 DEFAULT PERMISSIONS – always up to date
  readonly defaultPermissions: Record<UserRole, PageKey[]> = {
    Admin: ['dashboard', 'employees', 'attendance', 'leave-management', 'projects', 'department', 'settings', 'access', 'tasks', 'documents', 'payroll'],
    HR: ['dashboard', 'employees', 'attendance', 'leave-management', 'department', 'documents'],
    Manager: ['dashboard', 'employees', 'attendance', 'leave-management', 'projects', 'department', 'tasks', 'documents'],
    Employee: ['dashboard', 'attendance', 'leave-management', 'settings', 'tasks']
  };

  private readonly accounts = [
    { email: 'admin@synaptech.io', password: 'Admin@123', name: 'Admin', role: 'Admin' as UserRole },
    { email: 'hr@synaptech.io', password: 'Hr@123', name: 'Aarav Shah', role: 'HR' as UserRole, employeeName: 'Aarav Shah' },
    { email: 'rohan.manager@synaptech.io', password: 'Rohan@123', name: 'Rohan Mehta', role: 'Manager' as UserRole, employeeName: 'Rohan Mehta' },
    { email: 'riya.manager@synaptech.io', password: 'Riya@123', name: 'Riya Shah', role: 'Manager' as UserRole, employeeName: 'Riya Shah' },
    { email: 'neel.employee@synaptech.io', password: 'Neel@123', name: 'Neel Desai', role: 'Employee' as UserRole, employeeName: 'Neel Desai' },
    { email: 'mansi.employee@synaptech.io', password: 'Mansi@123', name: 'Mansi Prajapati', role: 'Employee' as UserRole, employeeName: 'Mansi Prajapati' },
    { email: 'aarav.employee@synaptech.io', password: 'Aarav@123', name: 'Aarav Shah', role: 'Employee' as UserRole, employeeName: 'Aarav Shah' }
  ];

  constructor(private router: Router) {
    this.loadPermissions();
  }

  private loadPermissions(): void {
    const config = this.getPermissionConfig();
    // 🔥 Merge with defaults to ensure new pages are included
    const merged = this.mergeWithDefaults(config);
    this.permissionsSubject.next(merged);
    // Save merged config back to localStorage
    this.savePermissionConfig(merged);
  }

  // 🔥 Merge saved config with default permissions
  private mergeWithDefaults(saved: PermissionConfig): PermissionConfig {
    const mergedRoles = {} as Record<UserRole, PageKey[]>;
    for (const role of Object.keys(this.defaultPermissions) as UserRole[]) {
      const defaultPages = this.defaultPermissions[role];
      const savedPages = saved.roles[role] || [];
      // Combine and remove duplicates
      mergedRoles[role] = Array.from(new Set([...defaultPages, ...savedPages]));
    }
    return {
      roles: mergedRoles,
      employees: saved.employees || {}
    };
  }

  login(email: string, password: string): boolean {
    const account = this.accounts.find(item => item.email === email && item.password === password);
    if (!account) return false;
    const { password: unusedPassword, ...user } = account;
    void unusedPassword;
    localStorage.setItem(this.sessionKey, JSON.stringify(user));
    this.loadPermissions();
    return true;
  }

  get user(): SessionUser | undefined {
    const saved = localStorage.getItem(this.sessionKey);
    return saved ? JSON.parse(saved) as SessionUser : undefined;
  }

  get role(): UserRole | undefined { return this.user?.role; }
  isLoggedIn(): boolean { return !!this.user; }
  hasRole(roles: UserRole[]): boolean { return !!this.role && roles.includes(this.role); }

  canAccess(page: PageKey): boolean {
    const config = this.permissionsSubject.value;
    if (!config) return false;
    const role = this.role;
    if (!role) return false;
    const user = this.user;
    if (user && config.employees[user.email]) {
      return config.employees[user.email].includes(page);
    }
    return config.roles[role].includes(page);
  }

  getPermissions(): Record<UserRole, PageKey[]> {
    const config = this.permissionsSubject.value;
    if (!config) return this.defaultPermissions;
    return config.roles;
  }

  getPermissionConfig(): PermissionConfig {
    const saved = localStorage.getItem(this.permissionsKey);
    if (!saved) return { roles: structuredClone(this.defaultPermissions), employees: {} };
    const parsed = JSON.parse(saved) as PermissionConfig | Record<UserRole, PageKey[]>;
    if ('roles' in parsed && 'employees' in parsed) return parsed as PermissionConfig;
    return { roles: parsed as Record<UserRole, PageKey[]>, employees: {} };
  }

  canAccessForUser(user: SessionUser | undefined, page: PageKey): boolean {
    if (!user) return false;
    const config = this.permissionsSubject.value;
    if (!config) return false;
    return (config.employees[user.email] ?? config.roles[user.role]).includes(page);
  }

  savePermissions(permissions: Record<UserRole, PageKey[]>): void {
    const config = this.getPermissionConfig();
    config.roles = permissions;
    this.savePermissionConfig(config);
  }

  savePermissionConfig(config: PermissionConfig): void {
    localStorage.setItem(this.permissionsKey, JSON.stringify(config));
    // 🔥 Merge with defaults before emitting
    const merged = this.mergeWithDefaults(config);
    this.permissionsSubject.next(merged);
  }

  logout(): void {
    localStorage.removeItem(this.sessionKey);
    this.permissionsSubject.next(null);
    this.router.navigate(['/login']);
  }
}