// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { Department } from './department/department';
import { Employees } from './employees/employees';
import { MyTeam } from './employees/my-team/my-team';
import { Recruitment } from './employees/recruitment/recruitment';
import { Onboarding } from './employees/onboarding/onboarding';

import { Attendance } from './attendance/attendance';
import { MyAttendance } from './attendance/my-attendance/my-attendance';
import { TeamAttendance } from './attendance/team-attendance/team-attendance';
import { AttendanceRegularization } from './attendance/attendance-regularization/attendance-regularization';
import { AttendanceReports } from './attendance/attendance-reports/attendance-reports';

import { LeaveManagement } from './leave-management/leave-management';
import { MyLeave } from './leave-management/my-leave/my-leave';
import { ApplyLeave } from './leave-management/apply-leave/apply-leave';
import { TeamLeave } from './leave-management/team-leave/team-leave';
import { LeaveRequests } from './leave-management/leave-requests/leave-requests';
import { LeaveBalances } from './leave-management/leave-balances/leave-balances';
import { LeaveReports } from './leave-management/leave-reports/leave-reports';

import { Payroll } from './payroll/payroll';
import { MyPayslips } from './payroll/my-payslips/my-payslips';
import { Salary } from './payroll/salary/salary';
import { PayrollReports } from './payroll/payroll-reports/payroll-reports';

import { Tasks } from './projects/tasks/tasks';
import { MyTasks } from './projects/tasks/my-tasks/my-tasks';
import { TeamTasks } from './projects/tasks/team-tasks/team-tasks';

import { Settings } from './settings/settings';
import { Designations } from './settings/designations/designations';
import { EmploymentTypes } from './settings/employment-types/employment-types';
import { Shifts } from './settings/shifts/shifts';

import { Roles } from './roles/roles';
import { AccessPermissions } from './access-permissions/access-permissions';
import { Documents } from './documents/documents';
import { roleGuard } from './role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [roleGuard(undefined, 'dashboard')] },

  // People Module
  { path: 'employees', component: Employees, canActivate: [roleGuard(undefined, 'employees')] },
  { path: 'my-team', component: MyTeam, canActivate: [roleGuard(undefined, 'employees')] },
  { path: 'recruitment', component: Recruitment, canActivate: [roleGuard(undefined, 'employees')] },
  { path: 'onboarding', component: Onboarding, canActivate: [roleGuard(undefined, 'employees')] },

  // Attendance Module
  { path: 'attendance', component: Attendance, canActivate: [roleGuard(undefined, 'attendance')] },
  { path: 'my-attendance', component: MyAttendance, canActivate: [roleGuard(undefined, 'attendance')] },
  { path: 'team-attendance', component: TeamAttendance, canActivate: [roleGuard(undefined, 'attendance')] },
  { path: 'attendance-regularization', component: AttendanceRegularization, canActivate: [roleGuard(undefined, 'attendance')] },
  { path: 'attendance-reports', component: AttendanceReports, canActivate: [roleGuard(undefined, 'attendance')] },

  // Leave Module
  { path: 'leave-management', component: LeaveManagement, canActivate: [roleGuard(undefined, 'leave-management')] },
  { path: 'my-leave', component: MyLeave, canActivate: [roleGuard(undefined, 'leave-management')] },
  { path: 'apply-leave', component: ApplyLeave, canActivate: [roleGuard(undefined, 'leave-management')] },
  { path: 'team-leave', component: TeamLeave, canActivate: [roleGuard(undefined, 'leave-management')] },
  { path: 'leave-requests', component: LeaveRequests, canActivate: [roleGuard(undefined, 'leave-management')] },
  { path: 'leave-balances', component: LeaveBalances, canActivate: [roleGuard(undefined, 'leave-management')] },
  { path: 'leave-reports', component: LeaveReports, canActivate: [roleGuard(undefined, 'leave-management')] },

  // Payroll Module
  { path: 'payroll', component: Payroll, canActivate: [roleGuard(undefined, 'payroll')] },
  { path: 'my-payslips', component: MyPayslips, canActivate: [roleGuard(undefined, 'payroll')] },
  { path: 'salary', component: Salary, canActivate: [roleGuard(undefined, 'payroll')] },
  { path: 'payroll-reports', component: PayrollReports, canActivate: [roleGuard(undefined, 'payroll')] },

  // Tasks Module
  { path: 'tasks', component: Tasks, canActivate: [roleGuard(undefined, 'tasks')] },
  { path: 'my-tasks', component: MyTasks, canActivate: [roleGuard(undefined, 'tasks')] },
  { path: 'team-tasks', component: TeamTasks, canActivate: [roleGuard(undefined, 'tasks')] },

  // Settings Module
  { path: 'settings', component: Settings, canActivate: [roleGuard(undefined, 'settings')] },
  { path: 'designations', component: Designations, canActivate: [roleGuard(undefined, 'settings')] },
  { path: 'employment-types', component: EmploymentTypes, canActivate: [roleGuard(undefined, 'settings')] },
  { path: 'shifts', component: Shifts, canActivate: [roleGuard(undefined, 'settings')] },

  // Ancillary
  { path: 'department', component: Department, canActivate: [roleGuard(undefined, 'department')] },
  { path: 'department/:name', component: Department, canActivate: [roleGuard(undefined, 'department')] },
  { path: 'projects', redirectTo: 'my-tasks', pathMatch: 'full' },
  { path: 'projects/:name', redirectTo: 'my-tasks', pathMatch: 'full' },
  // Access Control & Organization Routes
  { path: 'roles', component: Roles, canActivate: [roleGuard(undefined, 'access')] },
  { path: 'permissions', component: AccessPermissions, canActivate: [roleGuard(undefined, 'access')] },
  { path: 'organization/departments', redirectTo: 'department', pathMatch: 'full' },
  { path: 'organization/designations', redirectTo: 'designations', pathMatch: 'full' },
  { path: 'access-control/roles', redirectTo: 'roles', pathMatch: 'full' },
  { path: 'access-control/permissions', redirectTo: 'permissions', pathMatch: 'full' },

  { path: '**', redirectTo: 'login' }
];