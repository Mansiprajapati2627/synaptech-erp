import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { ApiService } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-my-payslips',
  standalone: true,
  imports: [CommonModule, ErpPage],
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

  ngOnInit(): void {
    const saved = localStorage.getItem('synaptech-payroll');
    if (saved) {
      const list = JSON.parse(saved) as any[];
      this.myPayslip = list.find(p => p.employeeName.toLowerCase() === this.currentUserName.toLowerCase());
    }
  }

  downloadPayslip(): void {
    const content = `PAYSLIP FOR ${this.currentUserName}\nMonth: ${this.selectedMonth}\nNet Salary: ₹${this.myPayslip?.netSalary || 60000}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip-${this.currentUserName}-${this.selectedMonth}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
