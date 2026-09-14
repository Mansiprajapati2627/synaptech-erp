import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ApiService, Employee } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-apply-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './apply-leave.html',
  styleUrl: './apply-leave.css'
})
export class ApplyLeave implements OnInit {
  newName = '';
  newType = 'Casual leave';
  newDays = 1;
  newStartDate = '';
  newEndDate = '';
  newDuration = 'Full day';
  newReason = '';
  formError = '';
  employees: Employee[] = [];

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {}

  get isEmployee(): boolean { return this.auth.role === 'Employee'; }

  ngOnInit(): void {
    if (this.isEmployee) {
      this.newName = this.auth.user?.employeeName || this.auth.user?.name || '';
    }
    this.api.employees$.subscribe(emps => {
      this.employees = (emps || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
      if (!this.newName && this.employees.length > 0) {
        this.newName = this.employees[0].name;
      }
    });
    this.api.loadEmployees().subscribe();
  }

  submitLeave(): void {
    this.formError = '';
    const name = this.newName.trim();
    if (!name) { this.formError = 'Select employee name.'; return; }
    if (!this.newStartDate) { this.formError = 'Select start date.'; return; }

    const saved = JSON.parse(localStorage.getItem('synaptech-leave-requests') || '[]') as any[];
    saved.unshift({
      name,
      type: this.newType,
      dates: this.newDays === 1 ? this.newStartDate : `${this.newStartDate} to ${this.newEndDate}`,
      startDate: this.newStartDate,
      endDate: this.newEndDate || this.newStartDate,
      days: this.newDays,
      duration: this.newDuration,
      reason: this.newReason.trim(),
      status: 'Pending',
      initials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    });

    localStorage.setItem('synaptech-leave-requests', JSON.stringify(saved));
    this.router.navigate(['/my-leave']);
  }
}
