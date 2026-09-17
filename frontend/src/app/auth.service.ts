// src/app/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, map, of, take, tap } from 'rxjs';

export type UserRole = 'Admin' | 'HR' | 'Manager' | 'Staff';

export type PageKey =
  | 'dashboard'
  | 'employees'
  | 'recruitment'
  | 'onboarding'
  | 'my-team'
  | 'department'
  | 'designations'
  | 'projects'
  | 'documents'
  | 'my-attendance'
  | 'attendance'
  | 'team-attendance'
  | 'attendance-regularization'
  | 'attendance-reports'
  | 'my-leave'
  | 'apply-leave'
  | 'leave-management'
  | 'team-leave'
  | 'leave-requests'
  | 'leave-balances'
  | 'leave-reports'
  | 'my-payslips'
  | 'payroll'
  | 'salary'
  | 'payroll-reports'
  | 'my-tasks'
  | 'team-tasks'
  | 'tasks'
  | 'roles'
  | 'access'
  | 'settings'
  | 'employment-types'
  | 'shifts';

export interface PermissionPage {
  key: PageKey;
  label: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  icon: string;
  pages: PermissionPage[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: '📊',
    pages: [
      { key: 'dashboard', label: 'Main Dashboard' }
    ]
  },
  {
    id: 'people',
    name: 'People',
    icon: '👥',
    pages: [
      { key: 'employees', label: 'Employees Directory' },
      { key: 'recruitment', label: 'Recruitment' },
      { key: 'onboarding', label: 'Onboarding' },
      { key: 'my-team', label: 'My Team' }
    ]
  },
  {
    id: 'organization',
    name: 'Organization',
    icon: '🏢',
    pages: [
      { key: 'department', label: 'Departments' },
      { key: 'designations', label: 'Designations' },
      { key: 'projects', label: 'Projects' },
      { key: 'documents', label: 'Documents' }
    ]
  },
  {
    id: 'attendance',
    name: 'Attendance',
    icon: '🕐',
    pages: [
      { key: 'my-attendance', label: 'My Attendance' },
      { key: 'attendance', label: 'All Attendance Directory' },
      { key: 'team-attendance', label: 'Team Attendance' },
      { key: 'attendance-regularization', label: 'Attendance Regularization' },
      { key: 'attendance-reports', label: 'Attendance Reports' }
    ]
  },
  {
    id: 'leave',
    name: 'Leave',
    icon: '🏖️',
    pages: [
      { key: 'my-leave', label: 'My Leave History' },
      { key: 'apply-leave', label: 'Apply Leave' },
      { key: 'leave-requests', label: 'Leave Requests & Approvals' },
      { key: 'team-leave', label: 'Team Leave' },
      { key: 'leave-balances', label: 'Leave Balances' },
      { key: 'leave-reports', label: 'Leave Reports' }
    ]
  },
  {
    id: 'payroll',
    name: 'Payroll',
    icon: '💰',
    pages: [
      { key: 'my-payslips', label: 'My Payslips' },
      { key: 'payroll', label: 'Payroll Processing' },
      { key: 'salary', label: 'Salary Structure' },
      { key: 'payroll-reports', label: 'Payroll Reports' }
    ]
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: '📋',
    pages: [
      { key: 'my-tasks', label: 'My Tasks' },
      { key: 'team-tasks', label: 'Team Tasks' }
    ]
  },
  {
    id: 'accessControl',
    name: 'Access Control',
    icon: '🔒',
    pages: [
      { key: 'roles', label: 'Roles' },
      { key: 'access', label: 'Access Permissions' }
    ]
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    pages: [
      { key: 'settings', label: 'Company Settings' },
      { key: 'employment-types', label: 'Employment Types' },
      { key: 'shifts', label: 'Work Shifts' }
    ]
  }
];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: number;
  employeeName?: string;
  token?: string;
  refreshToken?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn?: number;
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
  private readonly refreshTokenKey = 'synaptech-refresh-token';
  private readonly permissionsKey = 'synaptech-permissions';
  private readonly apiUrl = 'http://localhost:5245/api';

  private userSubject = new BehaviorSubject<SessionUser | undefined>(this.user);
  public user$ = this.userSubject.asObservable();

  private permissionsSubject = new BehaviorSubject<PermissionConfig | null>(null);
  public permissions$ = this.permissionsSubject.asObservable();

  readonly pageLabels: Record<PageKey, string> = {
    dashboard: 'Main Dashboard',
    employees: 'Employees Directory',
    recruitment: 'Recruitment',
    onboarding: 'Onboarding',
    'my-team': 'My Team',
    department: 'Departments',
    designations: 'Designations',
    projects: 'Projects',
    documents: 'Documents',
    'my-attendance': 'My Attendance',
    attendance: 'All Attendance Directory',
    'team-attendance': 'Team Attendance',
    'attendance-regularization': 'Attendance Regularization',
    'attendance-reports': 'Attendance Reports',
    'my-leave': 'My Leave History',
    'apply-leave': 'Apply Leave',
    'leave-management': 'Leave Overview',
    'team-leave': 'Team Leave',
    'leave-requests': 'Leave Requests & Approvals',
    'leave-balances': 'Leave Balances',
    'leave-reports': 'Leave Reports',
    'my-payslips': 'My Payslips',
    payroll: 'Payroll Processing',
    salary: 'Salary Structure',
    'payroll-reports': 'Payroll Reports',
    'my-tasks': 'My Tasks',
    'team-tasks': 'Team Tasks',
    tasks: 'Tasks Overview',
    roles: 'Roles',
    access: 'Access Permissions',
    settings: 'Company Settings',
    'employment-types': 'Employment Types',
    shifts: 'Work Shifts'
  };

  readonly defaultPermissions: Record<UserRole, PageKey[]> = {
    Admin: [
      'dashboard', 'employees', 'recruitment', 'onboarding', 'my-team',
      'department', 'designations', 'projects', 'documents',
      'my-attendance', 'attendance', 'team-attendance', 'attendance-regularization', 'attendance-reports',
      'my-leave', 'apply-leave', 'leave-management', 'team-leave', 'leave-requests', 'leave-balances', 'leave-reports',
      'my-payslips', 'payroll', 'salary', 'payroll-reports',
      'my-tasks', 'team-tasks', 'tasks',
      'roles', 'access',
      'settings', 'employment-types', 'shifts'
    ],
    HR: [
      'dashboard', 'employees', 'recruitment', 'onboarding',
      'department', 'designations', 'documents',
      'my-attendance', 'attendance', 'attendance-regularization', 'attendance-reports',
      'my-leave', 'apply-leave', 'leave-management', 'leave-requests', 'leave-balances', 'leave-reports',
      'my-payslips', 'payroll', 'salary', 'payroll-reports',
      'my-tasks', 'team-tasks', 'tasks',
      'access',
      'settings', 'employment-types', 'shifts'
    ],
    Manager: [
      'dashboard', 'my-team', 'employees',
      'department', 'designations', 'projects', 'documents',
      'my-attendance', 'team-attendance',
      'my-leave', 'apply-leave', 'leave-management', 'team-leave', 'leave-balances',
      'my-payslips',
      'my-tasks', 'team-tasks', 'tasks',
      'access',
      'settings'
    ],
    Staff: [
      'dashboard',
      'department', 'documents',
      'my-attendance',
      'my-leave', 'apply-leave', 'leave-management',
      'my-payslips',
      'my-tasks', 'tasks',
      'access',
      'settings'
    ]
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
    const cleanEmail = email.trim().toLowerCase();

    return this.http.post<LoginResponse>(`${this.apiUrl}/Auth/login`, { email: cleanEmail, password })
      .pipe(
        tap((res) => {
          if (res.token) {
            localStorage.setItem(this.tokenKey, res.token);
          }
          if (res.refreshToken) {
            localStorage.setItem(this.refreshTokenKey, res.refreshToken);
          }
          const sessionUser: SessionUser = {
            id: res.id,
            name: res.name,
            email: res.email,
            role: res.role,
            employeeId: res.employeeId,
            token: res.token,
            refreshToken: res.refreshToken
          };
          localStorage.setItem(this.sessionKey, JSON.stringify(sessionUser));
          this.userSubject.next(sessionUser);
          this.loadPermissions();
        }),
        catchError((err) => {
          throw err;
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

  getRefreshToken(): string | null {
    const directToken = localStorage.getItem(this.refreshTokenKey);
    if (directToken) return directToken;
    return this.user?.refreshToken || null;
  }

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  refreshToken(): Observable<{ token: string; refreshToken: string } | null> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        map(token => ({ token, refreshToken: this.getRefreshToken() || '' }))
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const accessToken = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!refreshToken || !accessToken) {
      this.isRefreshing = false;
      return of(null);
    }

    return this.http.post<{ token: string; refreshToken: string }>(
      `${this.apiUrl}/Auth/refresh-token`,
      { accessToken, refreshToken }
    ).pipe(
      tap((res) => {
        this.isRefreshing = false;
        if (res.token) {
          localStorage.setItem(this.tokenKey, res.token);
        }
        if (res.refreshToken) {
          localStorage.setItem(this.refreshTokenKey, res.refreshToken);
        }
        const currentUser = this.user;
        if (currentUser) {
          currentUser.token = res.token;
          currentUser.refreshToken = res.refreshToken;
          localStorage.setItem(this.sessionKey, JSON.stringify(currentUser));
          this.userSubject.next(currentUser);
        }
        this.refreshTokenSubject.next(res.token);
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        if (err?.status === 401) {
          this.logout();
        }
        return of(null);
      })
    );
  }

  get user(): SessionUser | undefined {
    const saved = localStorage.getItem(this.sessionKey);
    return saved ? JSON.parse(saved) as SessionUser : undefined;
  }

  get role(): UserRole | undefined {
    const rawRole = this.user?.role;
    if (!rawRole) return undefined;
    const r = rawRole.toString().trim();
    if (r.toLowerCase().includes('admin')) return 'Admin';
    if (r.toLowerCase().includes('hr')) return 'HR';
    if (r.toLowerCase().includes('manager') || r.toLowerCase().includes('lead') || r.toLowerCase().includes('director')) return 'Manager';
    return 'Staff';
  }

  isLoggedIn(): boolean {
    return !!this.user;
  }

  hasRole(roles: UserRole[]): boolean {
    const current = this.role;
    if (!current) return false;
    return roles.some(r => r.toLowerCase() === current.toLowerCase());
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
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/Auth/revoke-token`, { refreshToken }).subscribe({
        error: () => {}
      });
    }
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.userSubject.next(undefined);
    this.permissionsSubject.next(null);
    this.router.navigate(['/login']);
  }
}