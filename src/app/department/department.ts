// src/app/department/department.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ErpPage } from '../shared/erp-page/erp-page';

interface DepartmentMember {
  name: string;
  role: string;
}

interface DepartmentRecord {
  name: string;
  initials: string;
  description: string;
  lead: string;
  members: DepartmentMember[];
  color: string;
}

export const ROLE_OPTIONS = [
  'Team lead',
  'Developer',
  'Designer',
  'HR',
  'Intern',
  'Coordinator',
  'Analyst',
  'Manager',
  'Executive'
];

interface EmployeeForSync {
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
  imports: [FormsModule , ErpPage],
  selector: 'app-department',
  styleUrl: './department.css',
  templateUrl: './department.html',
})
export class Department implements OnInit {
  private readonly storageKey = 'synaptech-departments';
  showAddForm = false;
  newDepartmentName = '';
  newDepartmentLead = '';
  selectedDepartment?: DepartmentRecord;
  availableEmployees: string[] = [];
  newMemberName = '';
  roleOptions = ROLE_OPTIONS;
  formError = '';
  savedMessage = ''; // 🔥 Save feedback message

  departments: DepartmentRecord[] = [
    {
      name: 'HR',
      initials: 'HR',
      description: 'Supports the team and keeps people connected.',
      lead: 'Mansi Prajapati',
      members: [
        { name: 'Mansi Prajapati', role: 'People lead' },
        { name: 'Aarav Shah', role: 'HR coordinator' }
      ],
      color: 'coral'
    },
    {
      name: 'Developer',
      initials: 'DV',
      description: 'Builds and maintains the product.',
      lead: 'Rohan Mehta',
      members: [
        { name: 'Rohan Mehta', role: 'Tech lead' },
        { name: 'Neel Desai', role: 'Frontend developer' }
      ],
      color: 'teal'
    },
    {
      name: 'Interns',
      initials: 'IN',
      description: 'Learns, contributes, and grows with the team.',
      lead: 'Riya Shah',
      members: [{ name: 'Riya Shah', role: 'Product intern' }],
      color: 'blue'
    }
  ];

  constructor(private route: ActivatedRoute, private router: Router, public auth: AuthService) {}

  logout(): void { this.auth.logout(); }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadAvailableEmployees();
    this.route.paramMap.subscribe(params => {
      const departmentName = params.get('name');
      if (departmentName) {
        this.selectedDepartment = this.departments.find(d => d.name === departmentName);
        if (this.selectedDepartment) {
          this.loadAvailableEmployees(this.selectedDepartment);
        }
      }
    });
  }

  loadDepartments(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.departments = this.migrateDepartments(JSON.parse(saved));
      localStorage.setItem(this.storageKey, JSON.stringify(this.departments));
    }
  }

 // 🔥 Load available employees for detail view (unassigned only)
loadAvailableEmployees(department?: DepartmentRecord): void {
  const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
  const allNames = employees.map(e => e.name);
  
  // Get ALL employees who are in ANY department
  const allAssignedNames = new Set<string>();
  this.departments.forEach(dept => {
    dept.members.forEach(m => allAssignedNames.add(m.name));
  });
  
  // Return only employees NOT in ANY department
  this.availableEmployees = allNames.filter(name => !allAssignedNames.has(name));
}
  get totalMembers(): number {
    return this.departments.reduce((total, dept) => total + dept.members.length, 0);
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.formError = '';
  }

  // 🔥 Add department – only accepts existing employees as lead
  addDepartment(): void {
    const name = this.newDepartmentName.trim();
    const lead = this.newDepartmentLead.trim();
    if (!name || !lead) {
      this.formError = 'Please enter both department name and lead.';
      return;
    }

    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
    const existingLead = employees.find(e => e.name === lead);
    if (!existingLead) {
      this.formError = `"${lead}" is not in the employee directory. Please add them first.`;
      return;
    }

    this.formError = '';
    const members: DepartmentMember[] = [];
    members.push({ name: existingLead.name, role: existingLead.role || 'Team lead' });

    this.departments.push({
      name,
      initials: name.slice(0, 2).toUpperCase(),
      description: 'A new team working together at Synaptech.',
      lead,
      members,
      color: 'teal'
    });

    this.saveDepartments();
    this.newDepartmentName = '';
    this.newDepartmentLead = '';
    this.showAddForm = false;
  }

  // 🔥 Move member from any department to target
  addMemberToDepartment(department: DepartmentRecord, employeeName: string): void {
    if (!employeeName) return;
    if (department.members.find(m => m.name === employeeName)) return;

    // Find current department
    let currentDepartment: DepartmentRecord | undefined;
    for (const dept of this.departments) {
      if (dept.members.find(m => m.name === employeeName)) {
        currentDepartment = dept;
        break;
      }
    }

    // Remove from current department
    if (currentDepartment) {
      currentDepartment.members = currentDepartment.members.filter(m => m.name !== employeeName);
    }

    // Get employee details
    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
    const employee = employees.find(e => e.name === employeeName);
    if (!employee) return;

    department.members.push({
      name: employee.name,
      role: employee.role || 'Team member'
    });

    this.saveDepartments();
    this.newMemberName = '';
    this.loadAvailableEmployees(department);
  }

  // 🔥 Add existing employee (detail view) – moves them
  addExistingEmployee(): void {
    if (!this.selectedDepartment || !this.newMemberName) return;
    const employeeName = this.newMemberName;
    if (this.selectedDepartment.members.find(m => m.name === employeeName)) {
      this.newMemberName = '';
      return;
    }

    let currentDepartment: DepartmentRecord | undefined;
    for (const dept of this.departments) {
      if (dept.members.find(m => m.name === employeeName)) {
        currentDepartment = dept;
        break;
      }
    }

    if (currentDepartment) {
      currentDepartment.members = currentDepartment.members.filter(m => m.name !== employeeName);
    }

    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
    const employee = employees.find(e => e.name === employeeName);
    if (!employee) return;

    this.selectedDepartment.members.push({
      name: employee.name,
      role: employee.role || 'Team member'
    });

    this.saveDepartments();
    this.newMemberName = '';
    this.loadAvailableEmployees(this.selectedDepartment);
  }

  // 🔥 Save with feedback
  saveDepartments(): void {
    this.departments.forEach(department => {
      department.members = department.members
        .map(member => ({ name: member.name.trim(), role: member.role }))
        .filter(Boolean);
      department.lead = department.members.find(m => m.name === department.lead)?.name ?? department.members[0]?.name ?? '';
    });
    localStorage.setItem(this.storageKey, JSON.stringify(this.departments));
    this.syncEmployeeDirectory();
    if (this.selectedDepartment) {
      this.loadAvailableEmployees(this.selectedDepartment);
    }

    // 🔥 Show save feedback
    this.savedMessage = '✅ Changes saved successfully!';
    window.setTimeout(() => {
      this.savedMessage = '';
    }, 3000);
  }

  openDepartment(department: DepartmentRecord): void {
    this.router.navigate(['/department', department.name]);
  }

  backToDepartments(): void {
    this.router.navigate(['/department']);
  }

  removeMember(memberIndex: number): void {
    if (!this.selectedDepartment) return;
    this.selectedDepartment.members.splice(memberIndex, 1);
    this.saveDepartments();
    this.loadAvailableEmployees(this.selectedDepartment);
  }

  moveMember(memberIndex: number, targetDepartmentName: string): void {
    if (!this.selectedDepartment || !targetDepartmentName) return;
    const targetDepartment = this.departments.find(d => d.name === targetDepartmentName);
    const [member] = this.selectedDepartment.members.splice(memberIndex, 1);
    if (targetDepartment && member) {
      targetDepartment.members.push(member);
      this.saveDepartments();
      this.loadAvailableEmployees(this.selectedDepartment);
    }
  }

  changeLead(leadName: string): void {
    if (!this.selectedDepartment) return;
    this.selectedDepartment.lead = leadName;
    this.saveDepartments();
  }

  updateMemberRole(member: DepartmentMember, newRole: string): void {
    member.role = newRole;
    this.saveDepartments();
    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
    const empIndex = employees.findIndex(e => e.name === member.name);
    if (empIndex !== -1) {
      employees[empIndex].role = newRole;
      localStorage.setItem('synaptech-employees', JSON.stringify(employees));
    }
  }

  getAvailableEmployees(department: DepartmentRecord): string[] {
  const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
  const allNames = employees.map(e => e.name);
  
  // Get ALL employees who are in ANY department
  const allAssignedNames = new Set<string>();
  this.departments.forEach(dept => {
    dept.members.forEach(m => allAssignedNames.add(m.name));
  });
  
  // Return only employees NOT in ANY department
  return allNames.filter(name => !allAssignedNames.has(name));
}

  private migrateDepartments(records: Array<DepartmentRecord & { memberNames?: string[] }>): DepartmentRecord[] {
    return records.map(record => ({
      ...record,
      members: Array.isArray(record.members) ? record.members : (record.memberNames ?? []).map(name => ({ name, role: 'Team member' }))
    }));
  }

  private syncEmployeeDirectory(): void {
    const savedEmployees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as EmployeeForSync[];
    const employeeMap = new Map<string, EmployeeForSync>();
    savedEmployees.forEach(emp => employeeMap.set(emp.name, emp));

    const now = new Date();
    const defaultJoinDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(now);

    const updatedEmployees: EmployeeForSync[] = this.departments.flatMap(department =>
      department.members.map(member => {
        const existing = employeeMap.get(member.name);
        return {
          name: member.name,
          email: existing?.email ?? `${member.name.toLowerCase().replaceAll(' ', '.')}@synaptech.io`,
          department: department.name,
          role: member.role,
          status: existing?.status ?? 'Present',
          initials: member.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
          phone: existing?.phone ?? '',
          joinDate: existing?.joinDate ?? defaultJoinDate,
          birthDate: existing?.birthDate ?? '',
          reportingManager: existing?.reportingManager ?? '—',
          photoUrl: existing?.photoUrl ?? ''
        };
      })
    );

    const updatedNames = new Set(updatedEmployees.map(e => e.name));
    const orphanEmployees = savedEmployees.filter(emp => !updatedNames.has(emp.name));
    const allEmployees = [...updatedEmployees, ...orphanEmployees];
    localStorage.setItem('synaptech-employees', JSON.stringify(allEmployees));
  }
}