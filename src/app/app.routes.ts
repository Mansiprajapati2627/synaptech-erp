// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { Department } from './department/department';
import { Employees } from './employees/employees';
import { Attendance } from './attendance/attendance';
import { LeaveManagement } from './leave-management/leave-management';
import { Projects } from './projects/projects';
import { Settings } from './settings/settings';
import { roleGuard } from './role.guard';
import { Tasks } from './projects/tasks/tasks';
import { AccessPermissions } from './access-permissions/access-permissions';
import { Documents } from './documents/documents';
import { Payroll } from './payroll/payroll';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  // ❌ Signup route REMOVED – no signup page anymore

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [roleGuard(undefined, 'dashboard')]
  },
  {
    path: 'department',
    component: Department,
    canActivate: [roleGuard(undefined, 'department')]
  },
  {
    path: 'department/:name',
    component: Department,
    canActivate: [roleGuard(undefined, 'department')]
  },
  {
    path: 'employees',
    component: Employees,
    canActivate: [roleGuard(undefined, 'employees')]
  },
  {
    path: 'attendance',
    component: Attendance,
    canActivate: [roleGuard(undefined, 'attendance')]
  },
  {
    path: 'leave-management',
    component: LeaveManagement,
    canActivate: [roleGuard(undefined, 'leave-management')]
  },
  {
    path: 'projects',
    component: Projects,
    canActivate: [roleGuard(undefined, 'projects')]
  },
  {
    path: 'tasks',
    component: Tasks,
    canActivate: [roleGuard(undefined, 'tasks')]
  },
  {
    path: 'documents',
    component: Documents,
    canActivate: [roleGuard(undefined, 'documents')]
  },
  {
    path: 'payroll',
    component: Payroll,
    canActivate: [roleGuard(undefined, 'payroll')]
  },
  {
    path: 'settings',
    component: Settings,
    canActivate: [roleGuard(undefined, 'settings')]
  },
  {
    path: 'access-permissions',
    component: AccessPermissions,
    canActivate: [roleGuard(undefined, 'access')]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];