// src/app/employees/employees.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
// 🔥 Import shared role options from department
import { ROLE_OPTIONS } from '../department/department';

interface EmployeeRecord {
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'Present' | 'On leave';
  initials: string;
  phone: string;
  joinDate: string;
  birthDate: string;
  reportingManager: string;
  photoUrl: string;
}

@Component({
  imports: [FormsModule],
  selector: 'app-employees',
  styleUrl: './employees.css',
  templateUrl: './employees.html',
})
export class Employees {
  private readonly storageKey = 'synaptech-employees';
  showAddForm = false;
  searchTerm = '';
  selectedDepartment = 'All departments';
  newName = '';
  newEmail = '';
  newDepartment = 'Developer';
  newRole = ''; // 🔥 Will be selected from dropdown
  newPhone = '';
  newJoinDate = '';
  newBirthDate = '';
  newReportingManager = '';
  newPhoto: string | null = null;
  selectedEmployee?: EmployeeRecord;
  selectedFile?: File;
  tempPhotoUrl: string | null = null;

  // 🔥 Shared role options from department module
  roleOptions = ROLE_OPTIONS;

  constructor(public auth: AuthService) {}

  logout(): void { this.auth.logout(); }

  employees: EmployeeRecord[] = [
    {
      name: 'Mansi Prajapati',
      email: 'mansi@synaptech.io',
      department: 'HR',
      role: 'People lead',
      status: 'Present',
      initials: 'MP',
      phone: '9876543210',
      joinDate: 'Jan 12, 2025',
      birthDate: 'May 14, 1998',
      reportingManager: '—',
      photoUrl: ''
    },
    {
      name: 'Rohan Mehta',
      email: 'rohan@synaptech.io',
      department: 'Developer',
      role: 'Tech lead',
      status: 'Present',
      initials: 'RM',
      phone: '9876543211',
      joinDate: 'Feb 03, 2025',
      birthDate: 'Aug 21, 1995',
      reportingManager: 'Mansi Prajapati',
      photoUrl: ''
    },
    {
      name: 'Neel Desai',
      email: 'neel@synaptech.io',
      department: 'Developer',
      role: 'Frontend developer',
      status: 'Present',
      initials: 'ND',
      phone: '9876543212',
      joinDate: 'Mar 18, 2025',
      birthDate: 'Jan 09, 1999',
      reportingManager: 'Rohan Mehta',
      photoUrl: ''
    },
    {
      name: 'Riya Shah',
      email: 'riya@synaptech.io',
      department: 'Interns',
      role: 'Product intern',
      status: 'Present',
      initials: 'RS',
      phone: '9876543213',
      joinDate: 'Jun 10, 2025',
      birthDate: 'Nov 02, 2003',
      reportingManager: 'Rohan Mehta',
      photoUrl: ''
    },
    {
      name: 'Aarav Shah',
      email: 'aarav@synaptech.io',
      department: 'HR',
      role: 'HR coordinator',
      status: 'Present',
      initials: 'AS',
      phone: '9876543214',
      joinDate: 'Apr 22, 2025',
      birthDate: 'Mar 27, 1997',
      reportingManager: 'Mansi Prajapati',
      photoUrl: ''
    }
  ];

  ngOnInit(): void {
    const savedEmployees = localStorage.getItem(this.storageKey);
    if (savedEmployees) {
      this.employees = JSON.parse(savedEmployees) as EmployeeRecord[];
      this.employees = this.employees.map(employee => ({
        ...employee,
        phone: this.normalizePhone(employee.phone),
        birthDate: employee.birthDate ?? '',
        joinDate: this.normalizeJoinDate(employee.joinDate),
        reportingManager: employee.reportingManager ?? '—',
        photoUrl: employee.photoUrl ?? ''
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(this.employees));
    }
    this.loadEmployeesFromDepartments();
  }

  get departments(): string[] {
    const savedDepartments = JSON.parse(localStorage.getItem('synaptech-departments') ?? '[]') as Array<{ name: string }>;
    const names = [...savedDepartments.map(department => department.name), ...this.employees.map(employee => employee.department)];
    return ['All departments', ...new Set(names)];
  }

  get managerOptions(): string[] {
    const allNames = this.employees.map(e => e.name);
    return ['—', ...allNames];
  }

  get filteredEmployees(): EmployeeRecord[] {
    const search = this.searchTerm.trim().toLowerCase();
    return this.employees.filter(employee =>
      (this.selectedDepartment === 'All departments' || employee.department === this.selectedDepartment) &&
      (!search || `${employee.name} ${employee.email} ${employee.role}`.toLowerCase().includes(search))
    );
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.newPhoto = null;
      this.tempPhotoUrl = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.tempPhotoUrl = reader.result as string;
      this.newPhoto = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onEditFileSelected(event: Event): void {
    if (!this.selectedEmployee) return;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (this.selectedEmployee) {
        this.selectedEmployee.photoUrl = reader.result as string;
        this.saveEmployees();
        this.selectedEmployee = { ...this.selectedEmployee };
      }
    };
    reader.readAsDataURL(file);
  }

  addEmployee(): void {
    const name = this.newName.trim();
    const email = this.newEmail.trim();
    const role = this.newRole.trim();
    const phone = this.newPhone.trim();
    if (!name || !email || !role || !/^\d{10}$/.test(phone) || !this.newJoinDate || !this.newBirthDate) return;

    this.employees.push({
      name,
      email,
      department: this.newDepartment,
      role,
      status: 'Present',
      initials: name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      phone,
      joinDate: this.newJoinDate,
      birthDate: this.newBirthDate,
      reportingManager: this.newReportingManager || '—',
      photoUrl: this.newPhoto || ''
    });
    this.saveEmployees();
    this.newName = '';
    this.newEmail = '';
    this.newRole = '';
    this.newPhone = '';
    this.newJoinDate = '';
    this.newBirthDate = '';
    this.newReportingManager = '';
    this.newPhoto = null;
    this.tempPhotoUrl = null;
    this.showAddForm = false;
  }

  saveEmployees(): void {
    this.employees.forEach(employee => {
      employee.name = employee.name.trim();
      employee.initials = employee.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
      if (!employee.reportingManager) employee.reportingManager = '—';
    });
    localStorage.setItem(this.storageKey, JSON.stringify(this.employees));
    this.syncDepartmentsFromEmployees();
    this.syncAttendanceDirectory();
  }

  openEmployee(employee: EmployeeRecord): void {
    this.selectedEmployee = JSON.parse(JSON.stringify(employee));
  }
  closeEmployee(): void { this.selectedEmployee = undefined; }

  saveEmployeeDetails(): void {
    if (!this.selectedEmployee || !/^\d{10}$/.test(this.selectedEmployee.phone) || !this.selectedEmployee.joinDate || !this.selectedEmployee.birthDate) return;
    const index = this.employees.findIndex(e => e.email === this.selectedEmployee!.email);
    if (index !== -1) {
      this.employees[index] = { ...this.selectedEmployee };
      this.saveEmployees();
    }
    this.closeEmployee();
  }

  deleteEmployee(): void {
    if (!this.selectedEmployee) return;
    this.employees = this.employees.filter(employee => employee !== this.selectedEmployee);
    this.saveEmployees();
    this.closeEmployee();
  }

  private loadEmployeesFromDepartments(): void {
    const savedDepartments = localStorage.getItem('synaptech-departments');
    if (!savedDepartments) return;
    const departments = JSON.parse(savedDepartments) as Array<{ name: string; members?: Array<{ name: string; role: string }>; memberNames?: string[] }>;
    this.employees = departments.flatMap(department => {
      const members = Array.isArray(department.members) ? department.members : (department.memberNames ?? []).map(name => ({ name, role: 'Team member' }));
      return members.map(member => {
        const previous = this.employees.find(employee => employee.name === member.name);
        return {
          name: member.name,
          email: previous?.email ?? `${member.name.toLowerCase().replaceAll(' ', '.')}@synaptech.io`,
          department: department.name,
          role: member.role,
          status: previous?.status ?? 'Present',
          initials: member.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
          phone: previous?.phone ?? '',
          joinDate: this.normalizeJoinDate(previous?.joinDate),
          birthDate: previous?.birthDate ?? '',
          reportingManager: previous?.reportingManager ?? '—',
          photoUrl: previous?.photoUrl ?? ''
        };
      });
    });
    localStorage.setItem(this.storageKey, JSON.stringify(this.employees));
  }

  private syncDepartmentsFromEmployees(): void {
    const savedDepartments = localStorage.getItem('synaptech-departments');
    if (!savedDepartments) return;
    const departments = JSON.parse(savedDepartments) as Array<{ name: string; initials: string; description: string; lead: string; members: Array<{ name: string; role: string }>; color: string }>;
    departments.forEach(department => {
      department.members = this.employees
        .filter(employee => employee.department === department.name)
        .map(employee => ({ name: employee.name, role: employee.role }));
      department.lead = department.members.find(member => member.name === department.lead)?.name ?? department.members[0]?.name ?? '';
    });
    localStorage.setItem('synaptech-departments', JSON.stringify(departments));
  }

  private syncAttendanceDirectory(): void {
    const savedAttendance = JSON.parse(localStorage.getItem('synaptech-attendance') ?? '[]') as Array<{ name: string; status: 'Present' | 'Not marked'; time: string }>;
    const attendance = this.employees.map(employee => {
      const previous = savedAttendance.find(record => record.name === employee.name);
      return {
        name: employee.name,
        department: employee.department,
        status: previous?.status ?? (employee.status === 'On leave' ? 'Not marked' : 'Present'),
        time: previous?.time ?? '--',
        initials: employee.initials
      };
    });
    localStorage.setItem('synaptech-attendance', JSON.stringify(attendance));
  }

  private normalizePhone(phone: string | undefined): string {
    const digits = (phone ?? '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : '';
  }

  private normalizeJoinDate(joinDate: string | undefined): string {
    if (joinDate && joinDate !== 'New team member') return joinDate;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  }
}