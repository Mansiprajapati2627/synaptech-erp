import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Employee } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-leave-balances',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './leave-balances.html',
  styleUrl: './leave-balances.css'
})
export class LeaveBalances implements OnInit {
  employees: Employee[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.employees$.subscribe(emps => {
      this.employees = (emps || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
    });
    this.api.loadEmployees().subscribe();
  }
}
