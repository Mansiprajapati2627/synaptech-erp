import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-salary',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './salary.html',
  styleUrl: './salary.css'
})
export class Salary implements OnInit {
  employees: any[] = [];
  searchTerm = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('synaptech-payroll');
    if (saved) {
      this.employees = JSON.parse(saved);
    } else {
      this.api.employees$.subscribe(list => {
        this.employees = list.map(e => ({
          employeeName: e.name,
          email: e.email,
          department: e.department || 'General',
          baseSalary: 60000,
          allowances: 12000,
          deductions: 6000,
          netSalary: 66000
        }));
      });
      this.api.loadEmployees().subscribe();
    }
  }

  get filteredList(): any[] {
    const s = this.searchTerm.toLowerCase();
    return this.employees.filter(e => !s || e.employeeName.toLowerCase().includes(s));
  }
}
