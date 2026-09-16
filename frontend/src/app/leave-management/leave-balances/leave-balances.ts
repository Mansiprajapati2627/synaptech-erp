import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService, Employee, LeaveRequest } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

interface EmployeeBalance {
  id: number;
  name: string;
  department: string;
  annualQuota: number;
  usedDays: number;
  remainingDays: number;
}

@Component({
  selector: 'app-leave-balances',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './leave-balances.html',
  styleUrl: './leave-balances.css'
})
export class LeaveBalances implements OnInit {
  balances: EmployeeBalance[] = [];
  loading = false;
  readonly annualQuota = 12;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      emps: this.api.loadEmployees().pipe(catchError(() => of([]))),
      leaves: this.api.getLeaveRequests().pipe(catchError(() => of([])))
    }).subscribe(({ emps, leaves }) => {
      const validEmps = (emps || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
      this.balances = validEmps.map(emp => {
        const empLeaves = (leaves || []).filter(l =>
          (l.employeeId === emp.id || (l.employeeName && l.employeeName.toLowerCase() === emp.name.toLowerCase())) &&
          l.status === 'Approved'
        );

        const usedDays = empLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);
        const remainingDays = Math.max(0, this.annualQuota - usedDays);

        return {
          id: emp.id,
          name: emp.name,
          department: emp.department || 'General',
          annualQuota: this.annualQuota,
          usedDays,
          remainingDays
        };
      });
      this.loading = false;
    });
  }
}
