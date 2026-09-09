// src/app/access-permissions/access-permissions.ts
import { Component } from '@angular/core';
import { AuthService, PageKey, UserRole } from '../auth.service';

@Component({
  selector: 'app-access-permissions',
  imports: [],
  templateUrl: './access-permissions.html',
  styleUrl: './access-permissions.css'
})

export class AccessPermissions {
  readonly roles: UserRole[] = ['Admin', 'HR', 'Manager', 'Employee'];

  // 🔥 FIXED: Added 'documents' and 'payroll' to the list
  readonly pages: PageKey[] = [
    'dashboard',
    'employees',
    'attendance',
    'leave-management',
    'projects',
    'department',
    'settings',
    'documents',    // ✅ NEW
    'payroll'       // ✅ NEW
  ];

  permissions: Record<UserRole, PageKey[]>;
  employeePermissions: Record<string, PageKey[]>;
  employees: Array<{ name: string; email: string; role: UserRole }> = [];
  selectedEmployee?: { name: string; email: string; role: UserRole };
  savedMessage = '';

  constructor(public auth: AuthService) {
    const config = this.auth.getPermissionConfig();
    this.permissions = config.roles;
    this.employeePermissions = config.employees;
    
    const savedEmployees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as Array<{ 
      name: string; 
      email: string; 
      role?: string;
    }>;
    
    this.employees = savedEmployees.map(employee => ({
      name: employee.name,
      email: employee.email,
      role: this.mapRole(employee.role || 'Employee')
    }));
  }

  private mapRole(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'Admin': 'Admin',
      'HR': 'HR',
      'Manager': 'Manager',
      'Employee': 'Employee',
      'People lead': 'HR',
      'Tech lead': 'Manager',
      'Frontend developer': 'Employee',
      'Product intern': 'Employee',
      'HR coordinator': 'HR'
    };
    return roleMap[role] || 'Employee';
  }

  hasAccess(role: UserRole, page: PageKey): boolean { 
    return this.permissions[role]?.includes(page) || false; 
  }

  toggleAccess(role: UserRole, page: PageKey): void {
    if (role === 'Admin' && page === 'access') return;
    const rolePages = this.permissions[role] || [];
    this.permissions[role] = this.hasAccess(role, page) 
      ? rolePages.filter(item => item !== page) 
      : [...rolePages, page];
  }

  selectEmployee(employee: { name: string; email: string; role: UserRole }): void { 
    this.selectedEmployee = employee; 
  }

  closeTicket(): void {
    this.selectedEmployee = undefined;
  }

  saveAndClose(): void {
    this.save();
    this.closeTicket();
  }

  employeeHasAccess(page: PageKey): boolean {
    if (!this.selectedEmployee) return false;
    const perms = this.employeePermissions[this.selectedEmployee.email] || this.permissions[this.selectedEmployee.role] || [];
    return perms.includes(page);
  }

  toggleEmployeeAccess(page: PageKey): void {
    if (!this.selectedEmployee) return;
    const current = this.employeePermissions[this.selectedEmployee.email] || this.permissions[this.selectedEmployee.role] || [];
    this.employeePermissions[this.selectedEmployee.email] = this.employeeHasAccess(page) 
      ? current.filter(item => item !== page) 
      : [...current, page];
  }

  save(): void {
    const config = { roles: this.permissions, employees: this.employeePermissions };
    this.auth.savePermissionConfig(config);
    this.savedMessage = '✅ Permissions saved! Refreshing...';
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  logout(): void { this.auth.logout(); }
}