// src/app/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export type UserRole = 'Admin' | 'HR' | 'Manager' | 'Employee';
export type PageKey =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'leave-management'
  | 'projects'
  | 'department'
  | 'settings'
  | 'access'
  | 'tasks'
  | 'documents'
  | 'payroll';

export interface SessionUser {
  id: string;
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
  private readonly apiUrl = 'http://localhost:5245/api';

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

  readonly defaultPermissions: Record<UserRole, PageKey[]> = {
    Admin: ['dashboard', 'employees', 'attendance', 'leave-management', 'projects', 'department', 'settings', 'access', 'tasks', 'documents', 'payroll'],
    HR: ['dashboard', 'employees', 'attendance', 'leave-management', 'department', 'documents'],
    Manager: ['dashboard', 'employees', 'attendance', 'leave-management', 'projects', 'department', 'tasks', 'documents'],
    Employee: ['dashboard', 'attendance', 'leave-management', 'settings', 'tasks']
  };

  constructor(private http: HttpClient, private router: Router) {
    this.loadPermissions();
  }

  // ==================================================
  // LOGIN – calls the backend
  // ==================================================
  login(email: string, password: string): Observable<SessionUser> {
    return this.http.post<SessionUser>(`${this.apiUrl}/Auth/login`, { email, password })
      .pipe(
        tap((user) => {
          localStorage.setItem(this.sessionKey, JSON.stringify(user));
          this.loadPermissions();
        })
      );
  }

  // ==================================================
  // SESSION
  // ==================================================
  get user(): SessionUser | undefined {
    const saved = localStorage.getItem(this.sessionKey);
    return saved ? JSON.parse(saved) as SessionUser : undefined;
  }

  get role(): UserRole | undefined { return this.user?.role; }
  isLoggedIn(): boolean { return !!this.user; }
  hasRole(roles: UserRole[]): boolean { return !!this.role && roles.includes(this.role); }

  // ==================================================
  // PERMISSIONS
  // ==================================================
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
    return this.permissionsSubject.value?.roles ?? this.defaultPermissions;
  }

  getPermissionConfig(): PermissionConfig {
    const saved = localStorage.getItem(this.permissionsKey);
    if (!saved) return { roles: structuredClone(this.defaultPermissions), employees: {} };
    const parsed = JSON.parse(saved) as PermissionConfig | Record<UserRole, PageKey[]>;
    if ('roles' in parsed && 'employees' in parsed) return parsed as PermissionConfig;
    return { roles: parsed as Record<UserRole, PageKey[]>, employees: {} };
  }

  savePermissionConfig(config: PermissionConfig): void {
    localStorage.setItem(this.permissionsKey, JSON.stringify(config));
    const merged = this.mergeWithDefaults(config);
    this.permissionsSubject.next(merged);
  }

  private loadPermissions(): void {
    const config = this.getPermissionConfig();
    this.permissionsSubject.next(this.mergeWithDefaults(config));
  }

  private mergeWithDefaults(saved: PermissionConfig): PermissionConfig {
    const mergedRoles = {} as Record<UserRole, PageKey[]>;
    for (const role of Object.keys(this.defaultPermissions) as UserRole[]) {
      mergedRoles[role] = Array.from(new Set([
        ...this.defaultPermissions[role],
        ...(saved.roles[role] || [])
      ]));
    }
    return { roles: mergedRoles, employees: saved.employees || {} };
  }

  // ==================================================
  // LOGOUT
  // ==================================================
  logout(): void {
    localStorage.removeItem(this.sessionKey);
    this.permissionsSubject.next(null);
    this.router.navigate(['/login']);
  }
}