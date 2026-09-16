import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { ApiService, AttendanceRecord, LeaveRequest, Employee } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';

export interface EmployeeSalary {
  id: string;
  employeeId?: number;
  employeeName: string;
  email: string;
  department: string;
  role: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  daysInMonth: number;
  presentDays: number;
  approvedLeaveDays: number;
  payableDays: number;
  earnedBaseSalary: number;
  earnedAllowances: number;
  netSalary: number;
  month: string;
  year: number;
  status: 'Pending' | 'Processed' | 'Paid';
}

interface PayrollRun {
  id: string;
  month: string;
  year: number;
  processedDate: string;
  processedBy: string;
  totalEmployees: number;
  totalAmount: number;
  status: 'Draft' | 'Processed' | 'Approved';
}

@Component({
  imports: [FormsModule, CommonModule, ErpPage],
  selector: 'app-payroll',
  templateUrl: './payroll.html',
  styleUrl: './payroll.css'
})
export class Payroll implements OnInit {
  private readonly payrollKey = 'synaptech-payroll';
  private readonly payrollRunsKey = 'synaptech-payroll-runs';

  activeTab: 'payslips' | 'overview' | 'salary' | 'reports' = 'overview';
  employees: EmployeeSalary[] = [];
  payrollRuns: PayrollRun[] = [];
  selectedMonth = new Date().toISOString().slice(0, 7);
  searchTerm = '';
  selectedDepartment = 'All Departments';
  departments: string[] = ['All Departments'];

  showPayrollForm = false;
  selectedEmployee: EmployeeSalary | null = null;
  editSalary = 0;
  editAllowances = 0;
  editDeductions = 0;
  successMessage = '';
  errorMessage = '';

  constructor(public auth: AuthService, private api: ApiService, private route: ActivatedRoute) {}

  get isAdmin(): boolean { return this.auth.hasRole(['Admin']); }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'] as any;
      } else {
        this.activeTab = this.auth.role === 'Employee' ? 'payslips' : 'overview';
      }
    });

    this.loadPayrollRuns();
    this.generatePayrollForMonth();
  }

  generatePayrollForMonth(): void {
    const targetMonth = this.selectedMonth || new Date().toISOString().slice(0, 7);
    const [yrStr, moStr] = targetMonth.split('-');
    const year = parseInt(yrStr, 10) || new Date().getFullYear();
    const month = parseInt(moStr, 10) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    forkJoin({
      empList: this.api.loadEmployees().pipe(catchError(() => of([]))),
      attendance: this.api.getMonthlyAttendance(targetMonth).pipe(catchError(() => of([]))),
      leaves: this.api.getLeaveRequests().pipe(catchError(() => of([])))
    }).subscribe(({ empList, attendance, leaves }) => {
      const rawEmployees = (empList && empList.length > 0)
        ? empList
        : (this.api.currentEmployees || []);

      const validEmps = rawEmployees.filter((e: any) => e.role && e.role.toLowerCase() !== 'admin');
      const deptSet = new Set<string>(validEmps.map((e: any) => e.department || 'Unassigned'));
      this.departments = ['All Departments', ...Array.from(deptSet)];

      const savedPayroll = JSON.parse(localStorage.getItem(this.payrollKey) ?? '[]') as EmployeeSalary[];

      this.employees = validEmps.map(emp => {
        const baseSalary = this.getDefaultSalary(emp.role);
        const allowances = Math.round(baseSalary * 0.2);
        const deductions = Math.round(baseSalary * 0.1);

        // Find attendance records for this employee
        const empAttendance = (attendance || []).filter(a =>
          a.employeeId === emp.id || (a.employeeEmail && a.employeeEmail.toLowerCase() === emp.email.toLowerCase())
        );

        let presentDays = 0;
        let attendanceOnLeave = 0;

        for (const att of empAttendance) {
          const st = (att.status || '').toLowerCase();
          if (st === 'present' || st === 'punched in' || st === 'late') {
            presentDays += 1;
          } else if (st === 'half day') {
            presentDays += 0.5;
          } else if (st === 'on leave') {
            attendanceOnLeave += 1;
          }
        }

        // Check approved leave requests for dates in this month
        const empLeaves = (leaves || []).filter(l =>
          (l.employeeId === emp.id || (l.employeeName && l.employeeName.toLowerCase() === emp.name.toLowerCase())) &&
          l.status === 'Approved'
        );

        let leaveDays = attendanceOnLeave;
        if (empAttendance.length === 0 && empLeaves.length > 0) {
          leaveDays = empLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);
        }

        // If no attendance has been recorded at all for this month, default presentDays to calendar days
        if (empAttendance.length === 0 && empLeaves.length === 0) {
          presentDays = daysInMonth;
        }

        const payableDays = Math.min(daysInMonth, presentDays + leaveDays);
        const earnedBaseSalary = Math.round((baseSalary / daysInMonth) * payableDays);
        const earnedAllowances = Math.round((allowances / daysInMonth) * payableDays);
        const netSalary = Math.max(0, earnedBaseSalary + earnedAllowances - deductions);

        const existing = savedPayroll.find(p => p.email === emp.email && p.month === moStr && p.year === year);
        const status = existing?.status || 'Pending';

        return {
          id: emp.id?.toString() || Date.now().toString(36),
          employeeId: emp.id,
          employeeName: emp.name,
          email: emp.email,
          department: emp.department || 'Unassigned',
          role: emp.role,
          baseSalary,
          allowances,
          deductions,
          daysInMonth,
          presentDays,
          approvedLeaveDays: leaveDays,
          payableDays,
          earnedBaseSalary,
          earnedAllowances,
          netSalary,
          month: moStr,
          year,
          status
        };
      });

      this.savePayroll();
    });
  }

  private getDefaultSalary(role: string): number {
    const salaryMap: Record<string, number> = {
      'Admin': 120000,
      'HR': 80000,
      'Manager': 100000,
      'Tech lead': 120000,
      'Frontend developer': 80000,
      'Product intern': 40000,
      'HR coordinator': 50000,
      'People lead': 90000,
      'Employee': 60000,
      'Intern': 30000
    };
    return salaryMap[role] || 60000;
  }

  loadPayrollRuns(): void {
    const saved = localStorage.getItem(this.payrollRunsKey);
    if (saved) {
      this.payrollRuns = JSON.parse(saved);
    } else {
      this.payrollRuns = [
        {
          id: 'run1',
          month: '08',
          year: 2026,
          processedDate: '2026-08-31',
          processedBy: 'Admin',
          totalEmployees: 5,
          totalAmount: 350000,
          status: 'Approved'
        }
      ];
      this.savePayrollRuns();
    }
  }

  savePayroll(): void {
    localStorage.setItem(this.payrollKey, JSON.stringify(this.employees));
  }

  savePayrollRuns(): void {
    localStorage.setItem(this.payrollRunsKey, JSON.stringify(this.payrollRuns));
  }

  get filteredEmployees(): EmployeeSalary[] {
    const search = this.searchTerm.toLowerCase();
    return this.employees.filter(emp =>
      (this.selectedDepartment === 'All Departments' || emp.department === this.selectedDepartment) &&
      (emp.employeeName.toLowerCase().includes(search) || emp.email.toLowerCase().includes(search))
    );
  }

  get totalSalaries(): number {
    return this.filteredEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
  }

  getMonthName(): string {
    const date = new Date(parseInt(this.selectedMonth.slice(0, 4)), parseInt(this.selectedMonth.slice(5, 7)) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  getMonthNameForRun(year: number, month: string): string {
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  openEditSalary(employee: EmployeeSalary): void {
    if (!this.isAdmin) return;
    this.selectedEmployee = employee;
    this.editSalary = employee.baseSalary;
    this.editAllowances = employee.allowances;
    this.editDeductions = employee.deductions;
    this.showPayrollForm = true;
  }

  saveSalary(): void {
    if (!this.selectedEmployee) return;
    if (this.editSalary < 0 || this.editAllowances < 0 || this.editDeductions < 0) {
      this.errorMessage = 'All values must be positive.';
      return;
    }
    this.selectedEmployee.baseSalary = this.editSalary;
    this.selectedEmployee.allowances = this.editAllowances;
    this.selectedEmployee.deductions = this.editDeductions;

    const days = this.selectedEmployee.daysInMonth || 30;
    const payDays = this.selectedEmployee.payableDays ?? days;

    this.selectedEmployee.earnedBaseSalary = Math.round((this.editSalary / days) * payDays);
    this.selectedEmployee.earnedAllowances = Math.round((this.editAllowances / days) * payDays);
    this.selectedEmployee.netSalary = Math.max(0, this.selectedEmployee.earnedBaseSalary + this.selectedEmployee.earnedAllowances - this.editDeductions);

    this.errorMessage = '';
    this.successMessage = '✅ Salary updated successfully!';
    this.savePayroll();
    this.showPayrollForm = false;
    this.selectedEmployee = null;
    setTimeout(() => this.successMessage = '', 3000);
  }

  processPayroll(): void {
    if (!this.isAdmin) return;
    const processedCount = this.employees.filter(e => e.status === 'Pending').length;
    if (processedCount === 0) {
      this.errorMessage = 'No pending payroll to process.';
      return;
    }
    const totalAmount = this.employees.reduce((sum, e) => sum + e.netSalary, 0);

    const run: PayrollRun = {
      id: 'run' + Date.now().toString(36),
      month: this.selectedMonth.slice(5, 7),
      year: parseInt(this.selectedMonth.slice(0, 4)),
      processedDate: new Date().toISOString().slice(0, 10),
      processedBy: this.auth.user?.name || 'Admin',
      totalEmployees: this.employees.length,
      totalAmount,
      status: 'Processed'
    };

    this.payrollRuns.unshift(run);
    this.savePayrollRuns();

    this.employees.forEach(e => e.status = 'Processed');
    this.savePayroll();
    this.successMessage = '✅ Payroll processed successfully!';
    setTimeout(() => this.successMessage = '', 3000);
  }

  markAsPaid(employee: EmployeeSalary): void {
    if (!this.isAdmin) return;
    employee.status = 'Paid';
    this.savePayroll();
  }

  get stats() {
    const total = this.employees.length;
    const processed = this.employees.filter(e => e.status !== 'Pending').length;
    const paid = this.employees.filter(e => e.status === 'Paid').length;
    const pending = this.employees.filter(e => e.status === 'Pending').length;
    return { total, processed, paid, pending };
  }

  exportPayroll(): void {
    const headers = ['Employee', 'Email', 'Department', 'Present Days', 'Leave Days', 'Payable Days', 'Base Salary', 'Earned Base', 'Earned Allowances', 'Deductions', 'Net Salary', 'Status'];
    const rows = this.employees.map(e => [
      e.employeeName,
      e.email,
      e.department,
      e.presentDays,
      e.approvedLeaveDays,
      e.payableDays,
      e.baseSalary,
      e.earnedBaseSalary,
      e.earnedAllowances,
      e.deductions,
      e.netSalary,
      e.status
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-${this.selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}