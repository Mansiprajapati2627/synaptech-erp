// src/app/employees/employees.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { ApiService, Employee, Designation, EmploymentType, EmploymentStatus, WorkLocation, Shift, EmployeeDocument } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';
import { getRolesForDepartment } from '../shared/roles';

@Component({
  imports: [FormsModule, CommonModule, ErpPage],
  selector: 'app-employees',
  styleUrl: './employees.css',
  templateUrl: './employees.html',
})
export class Employees implements OnInit {

  // ==================================================
  // STATE
  // ==================================================

  employees: Employee[] = [];
  activeView: 'employees' | 'team' | 'recruitment' | 'onboarding' = 'employees';

  loading = true;
  apiError = '';
  successMessage = '';
  searchTerm = '';

  // Master Lookup Options
  departmentOptions: string[] = [
    'HR',
    'Developer',
    'Interns',
    'Sales',
    'Marketing',
    'Finance',
    'Operations'
  ];

  designations: Designation[] = [];
  employmentTypes: EmploymentType[] = [];
  employmentStatuses: EmploymentStatus[] = [];
  workLocations: WorkLocation[] = [];
  shifts: Shift[] = [];

  // Recruitment mock data
  jobPostings = [
    { title: 'Senior Full Stack Developer', dept: 'Developer', applicants: 18, status: 'Active', location: 'Mumbai HQ' },
    { title: 'HR Specialist', dept: 'HR', applicants: 12, status: 'Active', location: 'Remote' },
    { title: 'Sales Executive', dept: 'Sales', applicants: 24, status: 'Closing Soon', location: 'Mumbai HQ' }
  ];

  // Onboarding mock data
  onboardingCandidates = [
    { name: 'Karan Sharma', role: 'Software Developer', joinDate: '2026-09-20', status: 'Document Collection', progress: 65 },
    { name: 'Neha Gupta', role: 'UI/UX Designer', joinDate: '2026-09-25', status: 'IT Hardware Allocation', progress: 40 },
    { name: 'Rahul Verma', role: 'Sales Specialist', joinDate: '2026-10-01', status: 'Orientation Scheduled', progress: 20 }
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

  sanitizePhone(val?: string | null): string {
    if (!val) return '';
    const digits = String(val).replace(/\D/g, '');
    return digits.slice(0, 10);
  }

  get todayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get minJoinDateStr(): string {
    return '2025-01-01';
  }

  get maxBirthDateStr(): string {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return eighteenYearsAgo.toISOString().slice(0, 10);
  }

  get minBirthDateStr(): string {
    return '1955-01-01';
  }

  validateEmployeeDates(joinDate?: string | null, birthDate?: string | null): string | null {
    const todayStr = this.todayDateStr;
    const minJoin = '2025-01-01';

    if (joinDate) {
      if (joinDate < minJoin) {
        return 'Joining date cannot be before Jan 1, 2025.';
      }
      if (joinDate > todayStr) {
        return 'Joining date cannot be in the future (after today).';
      }
    }

    if (birthDate) {
      if (birthDate < this.minBirthDateStr) {
        return 'Birthdate must be realistic (after 1955).';
      }
      if (birthDate > this.maxBirthDateStr) {
        return 'Birthdate is invalid. Employee must be at least 18 years old.';
      }
    }

    return null;
  }

  // ADD EMPLOYEE FORM
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

  newEmployeeCode = '';
  newDesignationId?: number;
  newEmploymentTypeId?: number;
  newEmploymentStatusId?: number;
  newWorkLocationId?: number;
  newShiftId?: number;
  newPersonalEmail = '';
  newAlternatePhone = '';
  newGender = '';

  // SELECTED EMPLOYEE & DOCUMENTS MODAL
  selectedEmployee?: Employee;
  activeTab: 'details' | 'documents' = 'details';

  selectedEmployeeDocuments: EmployeeDocument[] = [];
  loadingDocuments = false;

  showAddDocForm = false;
  newDocName = '';
  newDocType = 'Government ID';
  newDocNumber = '';
  newDocFileUrl = '';
  newDocStatus = 'Verified';
  docError = '';

  documentTypes = [
    'Government ID',
    'Aadhaar Card',
    'PAN Card',
    'Passport',
    'Resume / CV',
    'Offer Letter',
    'Employment Contract',
    'Educational Certificate',
    'Experience Certificate',
    'Other'
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Listen to query parameter 'tab'
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'recruitment' || tab === 'onboarding' || tab === 'team' || tab === 'employees') {
        this.activeView = tab;
      }
    });

    this.api.employees$.subscribe(list => {
      if (list) {
        this.employees = list.map(e => ({
          ...e,
          name: this.api.sanitizeName(e.name)
        })).filter(e => e.role && e.role.toLowerCase() !== 'admin');
        if (this.employees.length > 0) {
          this.loading = false;
        }
      }
    });

    this.loadEmployees();
    this.loadMasterData();

    this.api.departments$.subscribe(depts => {
      if (depts && depts.length > 0) {
        this.departmentOptions = depts.map(d => d.name);
      }
    });
  }

  loadMasterData(): void {
    this.api.getDesignations().subscribe({
      next: (data) => this.designations = data || [],
      error: (err) => console.warn('Could not load designations:', err)
    });

    this.api.getEmploymentTypes().subscribe({
      next: (data) => this.employmentTypes = data || [],
      error: (err) => console.warn('Could not load employment types:', err)
    });

    this.api.getEmploymentStatuses().subscribe({
      next: (data) => this.employmentStatuses = data || [],
      error: (err) => console.warn('Could not load employment statuses:', err)
    });

    this.api.getWorkLocations().subscribe({
      next: (data) => this.workLocations = data || [],
      error: (err) => console.warn('Could not load work locations:', err)
    });

    this.api.getShifts().subscribe({
      next: (data) => this.shifts = data || [],
      error: (err) => console.warn('Could not load shifts:', err)
    });
  }

  loadEmployees(): void {
    this.loading = this.employees.length === 0;
    this.apiError = '';

    this.api.loadEmployees().subscribe({
      next: (data) => {
        const raw = Array.isArray(data) ? data : ((data as any)?.value || []);
        const filtered = raw
          .filter((e: any) => e.role && e.role.toLowerCase() !== 'admin')
          .map((e: any) => ({
            ...e,
            name: this.api.sanitizeName(e.name)
          }));
        if (filtered.length > 0 || this.employees.length === 0) {
          this.employees = filtered;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load employees:', err);
        this.loading = false;
      }
    });
  }

  get filteredEmployees(): Employee[] {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) return this.employees;

    return this.employees.filter(employee =>
      `${employee.name} ${employee.email} ${employee.department ?? ''} ${employee.role} ${employee.employeeCode ?? ''}`
        .toLowerCase()
        .includes(search)
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showAddForm) {
      this.toggleAddForm();
    }
    if (this.selectedEmployee) {
      this.closeEmployee();
    }
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
    this.apiError = '';
  }

  addEmployee(): void {
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

    const dateErr = this.validateEmployeeDates(this.newJoinDate, this.newBirthDate);
    if (dateErr) {
      this.apiError = dateErr;
      return;
    }

    const payload = {
      employeeCode: this.newEmployeeCode.trim() || null,
      name: this.api.sanitizeName(this.newName.trim()),
      email: this.newEmail.trim(),
      personalEmail: this.newPersonalEmail.trim() || null,
      password: this.newPassword,
      phone: this.newPhone.trim() || null,
      alternatePhone: this.newAlternatePhone.trim() || null,
      department: this.newDepartment.trim() || null,
      role: this.newRole.trim(),
      designationId: this.newDesignationId ? Number(this.newDesignationId) : null,
      status: 'Present',
      employmentTypeId: this.newEmploymentTypeId ? Number(this.newEmploymentTypeId) : null,
      employmentStatusId: this.newEmploymentStatusId ? Number(this.newEmploymentStatusId) : null,
      workLocationId: this.newWorkLocationId ? Number(this.newWorkLocationId) : null,
      shiftId: this.newShiftId ? Number(this.newShiftId) : null,
      joinDate: this.newJoinDate || null,
      birthDate: this.newBirthDate || null,
      dateOfBirth: this.newBirthDate || null,
      gender: this.newGender || null,
      photoUrl: null
    };

    this.loading = true;
    this.apiError = '';

    this.api.createEmployee(payload).subscribe({
      next: (employee) => {
        this.loadEmployees();
        this.resetForm();
        this.showAddForm = false;
        this.successMessage = 'Employee added successfully.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.apiError = err?.error?.message || 'Could not create employee.';
        this.loading = false;
      }
    });
  }

  openEmployee(employee: Employee): void {
    this.activeTab = 'details';
    this.showAddDocForm = false;
    this.docError = '';
    this.loading = true;

    this.api.getEmployee(employee.id).subscribe({
      next: (fullEmp) => {
        this.selectedEmployee = {
          ...fullEmp,
          name: this.api.sanitizeName(fullEmp.name),
          employment: fullEmp.employment || {}
        };
        this.loading = false;
        this.loadEmployeeDocuments(fullEmp.id);
      },
      error: () => {
        this.selectedEmployee = {
          ...employee,
          name: this.api.sanitizeName(employee.name),
          employment: employee.employment || {}
        };
        this.loading = false;
        this.loadEmployeeDocuments(employee.id);
      }
    });
  }

  closeEmployee(): void {
    this.selectedEmployee = undefined;
    this.selectedEmployeeDocuments = [];
    this.showAddDocForm = false;
  }

  loadEmployeeDocuments(employeeId: number): void {
    this.loadingDocuments = true;
    this.api.getEmployeeDocuments(employeeId).subscribe({
      next: (docs) => {
        this.selectedEmployeeDocuments = docs || [];
        this.loadingDocuments = false;
      },
      error: () => {
        this.selectedEmployeeDocuments = [];
        this.loadingDocuments = false;
      }
    });
  }

  toggleAddDocForm(): void {
    this.showAddDocForm = !this.showAddDocForm;
    if (this.showAddDocForm) {
      this.newDocName = '';
      this.newDocType = 'Government ID';
      this.newDocNumber = '';
      this.newDocFileUrl = '';
      this.newDocStatus = 'Verified';
      this.docError = '';
    }
  }

  addDocument(): void {
    if (!this.selectedEmployee) return;
    if (!this.newDocName.trim() || !this.newDocFileUrl.trim()) {
      this.docError = 'Document name and File URL are required.';
      return;
    }

    const payload = {
      documentName: this.newDocName.trim(),
      documentType: this.newDocType,
      documentNumber: this.newDocNumber.trim() || null,
      fileUrl: this.newDocFileUrl.trim(),
      fileName: this.newDocFileUrl.split('/').pop() || this.newDocName.trim(),
      status: this.newDocStatus || 'Active'
    };

    this.loadingDocuments = true;
    this.docError = '';

    this.api.createEmployeeDocument(this.selectedEmployee.id, payload).subscribe({
      next: (doc) => {
        this.selectedEmployeeDocuments.unshift(doc);
        this.showAddDocForm = false;
        this.loadingDocuments = false;
      },
      error: (err) => {
        this.docError = err?.error?.message || 'Could not upload document.';
        this.loadingDocuments = false;
      }
    });
  }

  deleteDocument(docId: number): void {
    if (!confirm('Are you sure you want to delete this document?')) return;

    this.api.deleteEmployeeDocument(docId).subscribe({
      next: () => {
        this.selectedEmployeeDocuments = this.selectedEmployeeDocuments.filter(d => d.id !== docId);
      },
      error: () => {
        alert('Could not delete document.');
      }
    });
  }

  saveEmployeeDetails(): void {
    if (!this.selectedEmployee) return;

    const employee = this.selectedEmployee;

    const dateErr = this.validateEmployeeDates(employee.joinDate, employee.birthDate);
    if (dateErr) {
      this.apiError = dateErr;
      return;
    }

    const empObj = employee.employment || {};

    const payload = {
      employeeCode: employee.employeeCode ?? null,
      name: employee.name,
      email: employee.email,
      personalEmail: employee.personalEmail ?? null,
      phone: employee.phone ?? null,
      alternatePhone: employee.alternatePhone ?? null,
      department: employee.department ?? null,
      role: employee.role,
      designationId: empObj.designationId ? Number(empObj.designationId) : null,
      status: employee.status,
      employmentTypeId: empObj.employmentTypeId ? Number(empObj.employmentTypeId) : null,
      employmentStatusId: empObj.employmentStatusId ? Number(empObj.employmentStatusId) : null,
      workLocationId: empObj.workLocationId ? Number(empObj.workLocationId) : null,
      shiftId: empObj.shiftId ? Number(empObj.shiftId) : null,
      reportingManagerId: employee.reportingManagerId ?? null,
      photoUrl: employee.photoUrl ?? null,
      joinDate: employee.joinDate ?? null,
      birthDate: employee.birthDate ?? null,
      dateOfBirth: employee.birthDate ?? null,
      gender: employee.gender ?? null
    };

    this.api.updateEmployee(employee.id, payload).subscribe({
      next: () => {
        this.loadEmployees();
        this.closeEmployee();
        this.successMessage = 'Employee updated.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.apiError = 'Could not save changes.';
      }
    });
  }

  deleteEmployee(): void {
    if (!this.selectedEmployee) return;

    const employee = this.selectedEmployee;

    if (!confirm(`Delete ${employee.name}? This also removes their login account.`)) {
      return;
    }

    this.api.deleteEmployee(employee.id).subscribe({
      next: () => {
        this.loadEmployees();
        this.closeEmployee();
        this.successMessage = 'Employee deleted.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.apiError = 'Could not delete employee.';
      }
    });
  }

  private resetForm(): void {
    this.newName = '';
    this.newEmail = '';
    this.newPassword = '';
    this.newDepartment = '';
    this.newRole = '';
    this.newPhone = '';
    this.newJoinDate = '';
    this.newBirthDate = '';
    this.newEmployeeCode = '';
    this.newDesignationId = undefined;
    this.newEmploymentTypeId = undefined;
    this.newEmploymentStatusId = undefined;
    this.newWorkLocationId = undefined;
    this.newShiftId = undefined;
    this.newPersonalEmail = '';
    this.newAlternatePhone = '';
    this.newGender = '';
    this.apiError = '';
  }

  logout(): void {
    this.auth.logout();
  }
}