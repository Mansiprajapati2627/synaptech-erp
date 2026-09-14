import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { ApiService, Employee } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './my-team.html',
  styleUrl: './my-team.css'
})
export class MyTeam implements OnInit {
  teamMembers: Employee[] = [];
  searchTerm = '';
  loading = false;

  constructor(public auth: AuthService, private api: ApiService) {}

  get currentUserName(): string {
    return this.auth.user?.name || 'Manager';
  }

  ngOnInit(): void {
    this.loading = true;
    this.api.employees$.subscribe(emps => {
      this.teamMembers = (emps || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
      this.loading = false;
    });

    this.api.loadEmployees().subscribe();
  }

  get filteredMembers(): Employee[] {
    const search = this.searchTerm.toLowerCase();
    return this.teamMembers.filter(e =>
      !search || e.name.toLowerCase().includes(search) || e.role.toLowerCase().includes(search) || (e.department && e.department.toLowerCase().includes(search))
    );
  }
}
