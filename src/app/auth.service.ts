// src/app/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';

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
  employeeId?: number;
  employeeName?: string;
  token?: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: number;
}

export interface PermissionConfig {
  roles: Record<UserRole, PageKey[]>;
  employees: Record<string, PageKey[]>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionKey = 'synaptech-session';
  private readonly tokenKey = 'synaptech-token';
  private readonly permissionsKey = 'synaptech-permissions';
  private readonly apiUrl = 'http://localhost:5245/api';

  private userSubject = new BehaviorSubject<SessionUser | undefined>(this.user);
  public user$ = this.userSubject.asObservable();

  private permissionsSubject = new BehaviorSubject<PermissionConfig | null>(null);
  public permissions$ = this.permissionsSubject.asObservable();

  readonly pageLabels: Record<PageKey, string> = {
    dashboard: 'Dashboard',
    employees: 'People',
    attendance: 'Attendance',
    'leave-management': 'Leave',
    projects: 'Projects',
    department: 'Departments',
    settings: 'Settings',
    access: 'Access Permissions',
    tasks: 'Tasks',
    documents: 'Documents',
    payroll: 'Payroll'
  };

  readonly defaultPermissions: Record<UserRole, PageKey[]> = {
    Admin: ['dashboard', 'employees', 'attendance', 'leave-management', 'payroll', 'tasks', 'projects', 'department', 'documents', 'access', 'settings'],
    HR: ['dashboard', 'employees', 'attendance', 'leave-management', 'payroll', 'department', 'documents', 'settings'],
    Manager: ['dashboard', 'employees', 'attendance', 'leave-management', 'payroll', 'tasks', 'projects', 'department', 'documents', 'settings'],
    Employee: ['dashboard', 'attendance', 'leave-management', 'tasks', 'documents', 'settings']
  };

  constructor(private http: HttpClient, private router: Router) {
    this.loadPermissions();
    if (this.getToken()) {
      this.fetchCurrentUser().subscribe();
    }
  }

  // ==================================================
  // LOGIN – calls backend /api/Auth/login
  // ==================================================
  login(email: string, password: string): Observable<SessionUser> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/Auth/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.token) {
            localStorage.setItem(this.tokenKey, res.token);
          }
          const sessionUser: SessionUser = {
            id: res.id,
            name: res.name,
            email: res.email,
            role: res.role,
            employeeId: res.employeeId,
            token: res.token
          };
          localStorage.setItem(this.sessionKey, JSON.stringify(sessionUser));
          this.userSubject.next(sessionUser);
          this.loadPermissions();
        })
      );
  }

  // ==================================================
  // CURRENT USER – GET /api/Auth/me
  // ==================================================
  fetchCurrentUser(): Observable<SessionUser | null> {
    return this.http.get<SessionUser>(`${this.apiUrl}/Auth/me`)
      .pipe(
        tap((user) => {
          const currentToken = this.getToken();
          const sessionUser: SessionUser = {
            ...user,
            token: currentToken ?? undefined
          };
          localStorage.setItem(this.sessionKey, JSON.stringify(sessionUser));
          this.userSubject.next(sessionUser);
          this.loadPermissions();
        }),
        catchError(() => {
          // Token invalid or network error: preserve existing session if present
          return of(null);
        })
      );
  }

  // ==================================================
  // TOKEN & SESSION GETTERS
  // ==================================================
  getToken(): string | null {
    const directToken = localStorage.getItem(this.tokenKey);
    if (directToken) return directToken;
    return this.user?.token || null;
  }

  get user(): SessionUser | undefined {
    const saved = localStorage.getItem(this.sessionKey);
    return saved ? JSON.parse(saved) as SessionUser : undefined;
  }

  get role(): UserRole | undefined {
    return this.user?.role;
  }

  isLoggedIn(): boolean {
    return !!this.user;
  }

  hasRole(roles: UserRole[]): boolean {
    return !!this.role && roles.includes(this.role);
  }

  // ==================================================
  // PERMISSIONS & ROLE AUTHORIZATION
  // ==================================================
  canAccess(page: PageKey): boolean {
    const role = this.role;
    if (!role) return true; // Default allow if role not determined
    const config = this.permissionsSubject.value;
    if (!config) return this.defaultPermissions[role]?.includes(page) ?? true;
    
    const user = this.user;
    if (user && config.employees && config.employees[user.email]) {
      return config.employees[user.email].includes(page);
    }
    return config.roles[role]?.includes(page) ?? true;
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
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(undefined);
    this.permissionsSubject.next(null);
    this.router.navigate(['/login']);
  }
}