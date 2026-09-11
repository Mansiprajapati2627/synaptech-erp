import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ApiService, Employee } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';
import { getRolesForDepartment } from '../shared/roles';

@Component({
  imports: [FormsModule, ErpPage],
  selector: 'app-employees',
  styleUrl: './employees.css',
  templateUrl: './employees.html',
})
export class Employees implements OnInit {

  // ==================================================
  // STATE
  // ==================================================

  employees: Employee[] = [];

  loading = true;
  apiError = '';
  successMessage = '';
  searchTerm = '';

  // ==================================================
  // DROPDOWN OPTIONS
  // ==================================================

  departmentOptions: string[] = [
    'HR',
    'Developer',
    'Interns',
    'Sales',
    'Marketing',
    'Finance',
    'Operations'
  ];

  getRoleOptions(dept?: string | null, currentRole?: string | null): string[] {
    return getRolesForDepartment(dept, currentRole);
  }

  onDepartmentChange(newDept: string): void {
    const roles = getRolesForDepartment(newDept);
    if (roles.length > 0 && (!this.newRole || !roles.includes(this.newRole))) {
      this.newRole = roles[0];
    }
  }

  // ==================================================
  // ADD EMPLOYEE FORM
  // ==================================================

  showAddForm = false;
  showPassword = false;

  newName = '';
  newEmail = '';
  newPassword = '';
  newDepartment = '';
  newRole = '';
  newPhone = '';
  newJoinDate = '';
  newBirthDate = '';

  // ==================================================
  // SELECTED EMPLOYEE
  // ==================================================

  selectedEmployee?: Employee;

  constructor(
    public auth: AuthService,
    private api: ApiService
  ) {}

  // ==================================================
  // LIFECYCLE
  // ==================================================

  ngOnInit(): void {
    this.loadEmployees();

    this.api.departments$.subscribe(depts => {
      if (depts && depts.length > 0) {
        this.departmentOptions = depts.map(d => d.name);
      }
    });
  }

  // ==================================================
  // LOAD EMPLOYEES
  // ==================================================

  loadEmployees(): void {
    this.loading = true;
    this.apiError = '';

    this.api.loadEmployees().subscribe({
      next: (data) => {
        console.log('Employees received from API:', data);
        this.employees = (data || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load employees:', err);
        this.apiError = 'Could not load employees. Is the backend API running?';
        this.loading = false;
      }
    });
  }

  // ==================================================
  // SEARCH
  // ==================================================

  get filteredEmployees(): Employee[] {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) return this.employees;

    return this.employees.filter(employee =>
      `${employee.name} ${employee.email} ${employee.department ?? ''} ${employee.role}`
        .toLowerCase()
        .includes(search)
    );
  }

  // ==================================================
  // ADD EMPLOYEE MODAL
  // ==================================================

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showAddForm) {
      this.toggleAddForm();
    }
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
    this.apiError = '';
  }

  // ==================================================
  // CREATE EMPLOYEE
  // Backend creates BOTH the AspNetUsers login and the Employees row,
  // linked via Employee.UserId. After success we reload the list.
  // ==================================================

  addEmployee(): void {
    // Validation
    if (
      !this.newName.trim() ||
      !this.newEmail.trim() ||
      !this.newPassword.trim() ||
      !this.newRole.trim()
    ) {
      this.apiError = 'Name, email, password, and role are required.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.apiError = 'Password must be at least 8 characters.';
      return;
    }

    const payload = {
      name: this.newName.trim(),
      email: this.newEmail.trim(),
      password: this.newPassword,
      phone: this.newPhone.trim() || null,
      department: this.newDepartment.trim() || null,
      role: this.newRole.trim(),
      status: 'Present',
      joinDate: this.newJoinDate || null,
      birthDate: this.newBirthDate || null,
      photoUrl: null
    };

    console.log('Sending employee to API:', { ...payload, password: '••••••••' });

    this.loading = true;
    this.apiError = '';

    this.api.createEmployee(payload).subscribe({
      next: (employee) => {
        console.log('Employee created:', employee);

        // Reload list from server so the new row appears
        this.loadEmployees();

        this.resetForm();
        this.showAddForm = false;
        this.successMessage = 'Employee added successfully.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Could not create employee:', err);
        this.apiError = err?.error?.message || 'Could not create employee.';
        this.loading = false;
      }
    });
  }

  // ==================================================
  // OPEN / CLOSE EMPLOYEE
  // ==================================================

  openEmployee(employee: Employee): void {
    this.selectedEmployee = { ...employee };
  }

  closeEmployee(): void {
    this.selectedEmployee = undefined;
  }

  // ==================================================
  // UPDATE EMPLOYEE
  // ==================================================

  saveEmployeeDetails(): void {
    if (!this.selectedEmployee) return;

    const employee = this.selectedEmployee;

    const payload = {
      name: employee.name,
      email: employee.email,
      phone: employee.phone ?? null,
      department: employee.department ?? null,
      role: employee.role,
      status: employee.status,
      reportingManagerId: employee.reportingManagerId ?? null,
      photoUrl: employee.photoUrl ?? null,
      joinDate: employee.joinDate ?? null,
      birthDate: employee.birthDate ?? null
    };

    this.api.updateEmployee(employee.id, payload).subscribe({
      next: () => {
        console.log('Employee updated');
        this.loadEmployees();
        this.closeEmployee();
        this.successMessage = 'Employee updated.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Could not update employee:', err);
        this.apiError = 'Could not save changes.';
      }
    });
  }

  // ==================================================
  // DELETE EMPLOYEE
  // ==================================================

  deleteEmployee(): void {
    if (!this.selectedEmployee) return;

    const employee = this.selectedEmployee;

    if (!confirm(`Delete ${employee.name}? This also removes their login account.`)) {
      return;
    }

    this.api.deleteEmployee(employee.id).subscribe({
      next: () => {
        console.log('Employee deleted');
        this.loadEmployees();
        this.closeEmployee();
        this.successMessage = 'Employee deleted.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Could not delete employee:', err);
        this.apiError = 'Could not delete employee.';
      }
    });
  }

  // ==================================================
  // RESET FORM
  // ==================================================

  private resetForm(): void {
    this.newName = '';
    this.newEmail = '';
    this.newPassword = '';
    this.newDepartment = '';
    this.newRole = '';
    this.newPhone = '';
    this.newJoinDate = '';
    this.newBirthDate = '';
    this.apiError = '';
  }

  // ==================================================
  // LOGOUT
  // ==================================================

  logout(): void {
    this.auth.logout();
  }
}