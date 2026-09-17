import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, PageKey, UserRole, PERMISSION_MODULES, PermissionModule } from '../auth.service';
import { ApiService, Employee } from '../services/api.service';

@Component({
  selector: 'app-access-permissions',
  imports: [CommonModule, FormsModule],
  templateUrl: './access-permissions.html',
  styleUrl: './access-permissions.css'
})
export class AccessPermissions implements OnInit {
  readonly roles: UserRole[] = ['Admin', 'HR', 'Manager', 'Staff'];
  readonly modules: PermissionModule[] = PERMISSION_MODULES;

  permissions: Record<UserRole, PageKey[]>;
  employeePermissions: Record<string, PageKey[]>;
  employees: Array<{ name: string; email: string; role: UserRole }> = [];
  selectedEmployee?: { name: string; email: string; role: UserRole };
  searchTerm = '';
  savedMessage = '';

  get filteredEmployees(): Array<{ name: string; email: string; role: UserRole }> {
    if (!this.searchTerm || !this.searchTerm.trim()) return this.employees;
    const q = this.searchTerm.trim().toLowerCase();
    return this.employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q)
    );
  }

  constructor(public auth: AuthService, private api: ApiService) {
    const config = this.auth.getPermissionConfig();
    this.permissions = config.roles;
    this.employeePermissions = config.employees;
  }

  ngOnInit(): void {
    this.api.employees$.subscribe(emps => {
      if (emps && emps.length > 0) {
        this.populateEmployees(emps);
      }
    });

    this.api.loadEmployees().subscribe({
      next: (emps) => this.populateEmployees(emps),
      error: () => this.loadFromStorage()
    });
  }

  private populateEmployees(raw: Employee[]): void {
    const nonAdmin = (raw || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
    this.employees = nonAdmin.map(employee => ({
      name: employee.name,
      email: employee.email,
      role: this.mapRole(employee.role || 'Staff')
    }));
  }

  private loadFromStorage(): void {
    const savedEmployees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as Array<{ 
      name: string; 
      email: string; 
      role?: string;
    }>;
    
    this.employees = savedEmployees
      .filter(e => e.role?.toLowerCase() !== 'admin')
      .map(employee => ({
        name: employee.name,
        email: employee.email,
        role: this.mapRole(employee.role || 'Staff')
      }));
  }

  private mapRole(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'Admin': 'Admin',
      'HR': 'HR',
      'Manager': 'Manager',
      'Staff': 'Staff',
      'Employee': 'Staff'
    };
    return roleMap[role] || 'Staff';
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

  hasModuleAccess(role: UserRole, mod: PermissionModule): boolean {
    return mod.pages.every(p => this.hasAccess(role, p.key));
  }

  toggleModuleAccess(role: UserRole, mod: PermissionModule): void {
    if (role === 'Admin') return;
    const allModuleKeys = mod.pages.map(p => p.key);
    const currentlyHasAll = this.hasModuleAccess(role, mod);

    let rolePages = this.permissions[role] || [];
    if (currentlyHasAll) {
      // Remove all pages in module
      this.permissions[role] = rolePages.filter(k => !allModuleKeys.includes(k));
    } else {
      // Add all pages in module
      this.permissions[role] = Array.from(new Set([...rolePages, ...allModuleKeys]));
    }
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

  employeeHasModuleAccess(mod: PermissionModule): boolean {
    return mod.pages.every(p => this.employeeHasAccess(p.key));
  }

  toggleEmployeeModuleAccess(mod: PermissionModule): void {
    if (!this.selectedEmployee) return;
    const allModuleKeys = mod.pages.map(p => p.key);
    const currentlyHasAll = this.employeeHasModuleAccess(mod);

    const current = this.employeePermissions[this.selectedEmployee.email] || this.permissions[this.selectedEmployee.role] || [];
    if (currentlyHasAll) {
      this.employeePermissions[this.selectedEmployee.email] = current.filter(k => !allModuleKeys.includes(k));
    } else {
      this.employeePermissions[this.selectedEmployee.email] = Array.from(new Set([...current, ...allModuleKeys]));
    }
  }

  save(): void {
    const config = { roles: this.permissions, employees: this.employeePermissions };
    this.auth.savePermissionConfig(config);
    this.savedMessage = '✅ Permissions saved! Refreshing...';
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  logout(): void { this.auth.logout(); }
}