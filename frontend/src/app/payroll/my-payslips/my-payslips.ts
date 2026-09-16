import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { ApiService } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-my-payslips',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './my-payslips.html',
  styleUrl: './my-payslips.css'
})
export class MyPayslips implements OnInit {
  selectedMonth = new Date().toISOString().slice(0, 7);
  myPayslip: any = null;

  constructor(public auth: AuthService, private api: ApiService) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || '';
  }

  get currentEmployeeId(): number {
    return (this.auth.user as any)?.employeeId || 0;
  }

  ngOnInit(): void {
    this.loadPayslip();
  }

  loadPayslip(): void {
    const saved = localStorage.getItem('synaptech-payroll');
    if (saved) {
      const list = JSON.parse(saved) as any[];
      const name = this.currentUserName.toLowerCase();
      const empId = this.currentEmployeeId;
      this.myPayslip = list.find(p => (empId && p.employeeId === empId) || (p.employeeName && p.employeeName.toLowerCase() === name));
    }
  }

  downloadPayslip(): void {
    const p = this.myPayslip;
    const name = this.currentUserName;
    const content = `================================================
SYNAPTECH ERP — OFFICIAL SALARY PAYSLIP
================================================
Employee Name : ${name}
Pay Period    : ${this.selectedMonth}
Days in Month : ${p?.daysInMonth || 30}
Present Days  : ${p?.presentDays ?? 30}
Leave Days    : ${p?.approvedLeaveDays ?? 0}
Payable Days  : ${p?.payableDays ?? 30}
------------------------------------------------
Base Structure: ₹${p?.baseSalary || 60000}
Earned Base   : ₹${p?.earnedBaseSalary || p?.baseSalary || 60000}
Allowances    : ₹${p?.earnedAllowances || p?.allowances || 12000}
Deductions    : ₹${p?.deductions || 6000}
------------------------------------------------
NET PAYABLE SALARY: ₹${p?.netSalary || 66000}
Status        : ${p?.status || 'Processed'}
================================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip-${name.replace(/\s+/g, '_')}-${this.selectedMonth}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
