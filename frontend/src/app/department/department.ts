import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ApiService, Department as ApiDepartment, Designation as ApiDesignation } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';
import { ALL_ROLES, getRolesForDepartment } from '../shared/roles';

export interface DepartmentMember {
  id?: number;
  name: string;
  role: string;
  designation?: string;
  email?: string;
}

export interface DepartmentDesignationLink {
  id?: number;
  name: string;
  code?: string;
}

export interface DepartmentRecord {
  id?: number;
  name: string;
  initials: string;
  description: string;
  lead: string;
  members: DepartmentMember[];
  designations?: DepartmentDesignationLink[];
  color: string;
}

export interface DepartmentDesignationPair {
  departmentId: number;
  departmentName?: string;
  designationId: number;
  designationName?: string;
}

export const ROLE_OPTIONS = ALL_ROLES;

interface EmployeeForSync {
  id?: number;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  status?: string;
  initials?: string;
  phone?: string;
  joinDate?: string;
  birthDate?: string;
  reportingManager?: string;
  photoUrl?: string;
}

@Component({
  imports: [FormsModule, ErpPage],
  selector: 'app-department',
  styleUrl: './department.css',
  templateUrl: './department.html',
})
export class Department implements OnInit {
  private readonly storageKey = 'synaptech-departments';
  activeTab: 'departments' | 'department-designations' | 'designations' = 'departments';

  showAddForm = false;
  newDepartmentName = '';
  newDepartmentLead = '';
  selectedDepartment?: DepartmentRecord;
  availableEmployees: string[] = [];
  newMemberName = '';
  roleOptions = ROLE_OPTIONS;
  formError = '';
  savedMessage = '';

  departments: DepartmentRecord[] = [];
  allDesignations: ApiDesignation[] = [];
  departmentDesignationPairs: DepartmentDesignationPair[] = [];

  // Form fields for linking department to designation
  newLinkDeptId?: number;
  newLinkDesigId?: number;
  linkError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    private api: ApiService
  ) {}

  logout(): void {
    this.auth.logout();
  }

  ngOnInit(): void {
    // 1. Listen to reactive departments stream
    this.api.departments$.subscribe((apiDepts) => {
      if (apiDepts && apiDepts.length > 0) {
        this.departments = apiDepts.map(d => this.mapApiDepartmentToRecord(d));
        if (this.selectedDepartment) {
          const updated = this.departments.find(d => d.name.toLowerCase() === this.selectedDepartment!.name.toLowerCase());
          if (updated) {
            this.selectedDepartment = updated;
          }
        }
        this.loadAvailableEmployees(this.selectedDepartment);
      }
    });

    // 2. Fetch fresh departments from backend API
    this.api.loadDepartments().subscribe({
      next: (depts) => {
        if (depts && depts.length > 0) {
          this.departments = depts.map(d => this.mapApiDepartmentToRecord(d));
          if (this.selectedDepartment) {
            const updated = this.departments.find(d => d.name.toLowerCase() === this.selectedDepartment!.name.toLowerCase());
            if (updated) {
              this.selectedDepartment = updated;
            }
          }
          this.loadAvailableEmployees(this.selectedDepartment);
        }
      },
      error: () => {
        this.loadDepartmentsFromCache();
      }
    });

    // 3. Load Designations & DepartmentDesignations pairs
    this.loadDesignationsData();

    // 4. Listen to employees stream for available unassigned employees
    this.api.employees$.subscribe(() => {
      this.loadAvailableEmployees(this.selectedDepartment);
    });

    // 5. Handle route param for deep linking /department/:name
    this.route.paramMap.subscribe(params => {
      const departmentName = params.get('name');
      if (departmentName) {
        this.selectedDepartment = this.departments.find(
          d => d.name.toLowerCase() === departmentName.toLowerCase()
        );
        if (this.selectedDepartment) {
          this.loadAvailableEmployees(this.selectedDepartment);
        }
      } else {
        this.selectedDepartment = undefined;
      }
    });
  }

  loadDesignationsData(): void {
    this.api.getDesignations().subscribe({
      next: (data) => this.allDesignations = data || [],
      error: (err) => console.warn('Could not load designations:', err)
    });

    this.api.getDepartmentDesignations().subscribe({
      next: (pairs) => this.departmentDesignationPairs = pairs || [],
      error: (err) => console.warn('Could not load department designations:', err)
    });
  }

  getRoleOptionsForDepartment(deptName?: string | null, currentRole?: string | null): string[] {
    return getRolesForDepartment(deptName, currentRole);
  }

  private mapApiDepartmentToRecord(d: ApiDepartment): DepartmentRecord {
    return {
      id: d.id,
      name: d.name,
      initials: d.initials || (d.name.length >= 2 ? d.name.slice(0, 2).toUpperCase() : d.name.toUpperCase()),
      description: d.description || '',
      lead: d.lead || '',
      color: d.color || 'teal',
      members: (d.members || []).map(m => ({
        id: m.id,
        name: m.name,
        role: m.role || 'Team member',
        designation: m.designation || '',
        email: m.email
      })),
      designations: (d.designations || []).map(des => ({
        id: des.id,
        name: des.name,
        code: des.code
      }))
    };
  }

  private loadDepartmentsFromCache(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.departments = JSON.parse(saved);
      } catch {}
    }
  }

  // Load available employees for detail view (unassigned only)
  loadAvailableEmployees(department?: DepartmentRecord): void {
    const employees = this.api.currentEmployees.length > 0
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[]);

    const allNames = employees.map(e => e.name);

    // Get all employees who are assigned to ANY department
    const allAssignedNames = new Set<string>();
    this.departments.forEach(dept => {
      dept.members.forEach(m => allAssignedNames.add(m.name.toLowerCase()));
    });

    // Available employees are those not currently assigned
    this.availableEmployees = allNames.filter(name => !allAssignedNames.has(name.toLowerCase()));
  }

  get totalMembers(): number {
    return this.departments.reduce((total, dept) => total + dept.members.length, 0);
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.formError = '';
  }

  // Add department – persisted to database via API
  addDepartment(): void {
    const name = this.newDepartmentName.trim();
    const lead = this.newDepartmentLead.trim();
    if (!name || !lead) {
      this.formError = 'Please enter both department name and lead.';
      return;
    }

    const employees = this.api.currentEmployees.length > 0
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[]);

    const existingLead = employees.find(e => e.name.toLowerCase() === lead.toLowerCase());
    if (!existingLead) {
      this.formError = `"${lead}" is not in the employee directory. Please add them first.`;
      return;
    }

    this.formError = '';

    const payload = {
      name,
      description: 'A new team working together at Synaptech.',
      lead: existingLead.name,
      color: 'teal'
    };

    this.api.createDepartment(payload).subscribe({
      next: () => {
        this.newDepartmentName = '';
        this.newDepartmentLead = '';
        this.showAddForm = false;
        this.savedMessage = '✅ Department created successfully!';
        setTimeout(() => this.savedMessage = '', 3000);
      },
      error: (err) => {
        this.formError = err?.error?.message || 'Could not create department.';
      }
    });
  }

  // Move member from any department to target department
  addMemberToDepartment(department: DepartmentRecord, employeeName: string): void {
    if (!employeeName) return;

    const employees = this.api.currentEmployees.length > 0
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[]);

    const employee = employees.find(e => e.name.toLowerCase() === employeeName.toLowerCase());
    if (!employee || !employee.id || !department.id) return;

    this.api.addMemberToDepartment(department.id, employee.id).subscribe({
      next: () => {
        this.newMemberName = '';
        this.savedMessage = `✅ Added ${employee.name} to ${department.name}!`;
        setTimeout(() => this.savedMessage = '', 3000);
      },
      error: (err) => console.error('Could not add member:', err)
    });
  }

  // Add existing unassigned employee in detail view
  addExistingEmployee(): void {
    if (!this.selectedDepartment || !this.newMemberName) return;
    this.addMemberToDepartment(this.selectedDepartment, this.newMemberName);
  }

  // Save changes (e.g. lead, description, color)
  saveDepartments(): void {
    if (this.selectedDepartment?.id) {
      this.api.updateDepartment(this.selectedDepartment.id, {
        name: this.selectedDepartment.name,
        description: this.selectedDepartment.description,
        lead: this.selectedDepartment.lead,
        color: this.selectedDepartment.color
      }).subscribe({
        next: () => {
          this.savedMessage = '✅ Changes saved successfully!';
          setTimeout(() => this.savedMessage = '', 3000);
        },
        error: () => {
          this.savedMessage = '⚠️ Could not save changes.';
          setTimeout(() => this.savedMessage = '', 3000);
        }
      });
    } else {
      this.savedMessage = '✅ Changes saved successfully!';
      setTimeout(() => this.savedMessage = '', 3000);
    }
  }

  openDepartment(department: DepartmentRecord): void {
    this.router.navigate(['/department', department.name]);
  }

  backToDepartments(): void {
    this.router.navigate(['/department']);
  }

  removeMember(memberIndex: number): void {
    if (!this.selectedDepartment?.id) return;
    const member = this.selectedDepartment.members[memberIndex];
    if (!member) return;

    const employees = this.api.currentEmployees.length > 0
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[]);

    const emp = employees.find(e => e.name.toLowerCase() === member.name.toLowerCase());
    const empId = member.id || emp?.id;

    if (empId) {
      this.api.removeMemberFromDepartment(this.selectedDepartment.id, empId).subscribe({
        next: () => {
          this.savedMessage = `Removed ${member.name}.`;
          setTimeout(() => this.savedMessage = '', 3000);
        },
        error: (err) => console.error('Could not remove member:', err)
      });
    }
  }

  moveMember(memberIndex: number, targetDepartmentName: string): void {
    if (!this.selectedDepartment || !targetDepartmentName) return;
    const targetDepartment = this.departments.find(
      d => d.name.toLowerCase() === targetDepartmentName.toLowerCase()
    );
    const member = this.selectedDepartment.members[memberIndex];
    if (!targetDepartment?.id || !member) return;

    const employees = this.api.currentEmployees.length > 0
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[]);

    const emp = employees.find(e => e.name.toLowerCase() === member.name.toLowerCase());
    const empId = member.id || emp?.id;

    if (empId) {
      this.api.addMemberToDepartment(targetDepartment.id, empId).subscribe({
        next: () => {
          this.savedMessage = `Moved ${member.name} to ${targetDepartment.name}.`;
          setTimeout(() => this.savedMessage = '', 3000);
        },
        error: (err) => console.error('Could not move member:', err)
      });
    }
  }

  changeLead(leadName: string): void {
    if (!this.selectedDepartment) return;
    this.selectedDepartment.lead = leadName;
    if (this.selectedDepartment.id) {
      this.api.updateDepartment(this.selectedDepartment.id, {
        name: this.selectedDepartment.name,
        description: this.selectedDepartment.description,
        lead: leadName,
        color: this.selectedDepartment.color
      }).subscribe({
        next: () => {
          this.savedMessage = `Lead updated to ${leadName}.`;
          setTimeout(() => this.savedMessage = '', 3000);
        }
      });
    }
  }

  updateMemberRole(member: DepartmentMember, newRole: string): void {
    member.role = newRole;
    const employees = this.api.currentEmployees;
    const emp = employees.find(e => e.name.toLowerCase() === member.name.toLowerCase());
    if (emp) {
      this.api.updateEmployee(emp.id, {
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        role: newRole,
        status: emp.status,
        reportingManagerId: emp.reportingManagerId,
        photoUrl: emp.photoUrl,
        joinDate: emp.joinDate,
        birthDate: emp.birthDate
      }).subscribe({
        next: () => {
          this.savedMessage = `Updated ${member.name}'s role to ${newRole}.`;
          setTimeout(() => this.savedMessage = '', 3000);
        }
      });
    }
  }

  getAvailableEmployees(department: DepartmentRecord): string[] {
    const employees = this.api.currentEmployees.length > 0
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[]);

    const allNames = employees.map(e => e.name);

    const allAssignedNames = new Set<string>();
    this.departments.forEach(dept => {
      dept.members.forEach(m => allAssignedNames.add(m.name.toLowerCase()));
    });

    return allNames.filter(name => !allAssignedNames.has(name.toLowerCase()));
  }

  // ==================================================
  // DepartmentDesignation Link Actions
  // ==================================================
  addDepartmentDesignationLink(): void {
    if (!this.newLinkDeptId || !this.newLinkDesigId) {
      this.linkError = 'Please select both a Department and a Designation.';
      return;
    }

    this.linkError = '';
    this.api.addDesignationToDepartment(this.newLinkDeptId, this.newLinkDesigId).subscribe({
      next: () => {
        this.savedMessage = '✅ Successfully connected Department to Designation!';
        this.loadDesignationsData();
        this.newLinkDeptId = undefined;
        this.newLinkDesigId = undefined;
        setTimeout(() => this.savedMessage = '', 3000);
      },
      error: (err) => {
        this.linkError = err?.error?.message || 'Could not link department to designation.';
      }
    });
  }

  removeDepartmentDesignationLink(deptId: number, desigId: number): void {
    this.api.removeDesignationFromDepartment(deptId, desigId).subscribe({
      next: () => {
        this.savedMessage = '✅ Removed mapping.';
        this.loadDesignationsData();
        setTimeout(() => this.savedMessage = '', 3000);
      },
      error: (err) => console.error('Could not remove mapping:', err)
    });
  }

  newDetailDesigId?: number;

  getUnlinkedDesignationsForSelectedDept(): ApiDesignation[] {
    if (!this.selectedDepartment) return this.allDesignations;
    const existingIds = new Set((this.selectedDepartment.designations || []).map(d => d.id));
    return this.allDesignations.filter(d => !existingIds.has(d.id));
  }

  addDesignationToCurrentDepartment(): void {
    if (!this.selectedDepartment || !this.selectedDepartment.id || !this.newDetailDesigId) return;

    const desigId = Number(this.newDetailDesigId);
    this.api.addDesignationToDepartment(this.selectedDepartment.id, desigId).subscribe({
      next: () => {
        this.savedMessage = '✅ Designation linked to department successfully!';
        this.newDetailDesigId = undefined;
        this.api.loadDepartments().subscribe({
          next: () => this.loadDesignationsData()
        });
        setTimeout(() => this.savedMessage = '', 3000);
      },
      error: (err) => {
        this.savedMessage = err?.error?.message || 'Could not link designation.';
        setTimeout(() => this.savedMessage = '', 3000);
      }
    });
  }

  removeDesignationFromCurrentDepartment(designationId?: number): void {
    if (!this.selectedDepartment || !this.selectedDepartment.id || !designationId) return;

    this.api.removeDesignationFromDepartment(this.selectedDepartment.id, designationId).subscribe({
      next: () => {
        this.savedMessage = '✅ Designation unlinked from department.';
        this.api.loadDepartments().subscribe({
          next: () => this.loadDesignationsData()
        });
        setTimeout(() => this.savedMessage = '', 3000);
      },
      error: (err) => {
        this.savedMessage = 'Could not unlink designation.';
        setTimeout(() => this.savedMessage = '', 3000);
      }
    });
  }

  getMemberDesignation(member: DepartmentMember): string {
    return member.designation || '';
  }

  updateMemberDesignation(member: DepartmentMember, newDesignation: string): void {
    member.designation = newDesignation;
    if (member.id) {
      this.api.updateEmployee(member.id, { designation: newDesignation }).subscribe({
        next: () => {
          this.savedMessage = `Updated ${member.name}'s designation to ${newDesignation}.`;
          setTimeout(() => this.savedMessage = '', 2500);
        },
        error: (err) => console.warn('Could not update member designation:', err)
      });
    }
  }

  getDesignationOptionsForDepartment(dept?: DepartmentRecord): ApiDesignation[] {
    if (!dept || !dept.designations || dept.designations.length === 0) {
      return this.allDesignations;
    }
    const names = new Set(dept.designations.map(d => d.name.toLowerCase()));
    const filtered = this.allDesignations.filter(d => names.has(d.name.toLowerCase()));
    return filtered.length > 0 ? filtered : this.allDesignations;
  }
}