// src/app/projects/tasks/tasks.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [FormsModule, RouterLink, ErpPage],
  templateUrl: './tasks.html',
  styleUrls: ['./tasks.css']
})
export class Tasks implements OnInit {
  activeTab: 'my' | 'team' = 'my';
  searchTerm = '';
  statusFilter = '';
  assigneeFilter = '';
  allUsers: string[] = [];
  tasks: (any & { projectName: string })[] = [];

  constructor(public auth: AuthService, private api: ApiService, private route: ActivatedRoute) { }

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || '';
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'] as any;
      } else {
        this.activeTab = 'my';
      }
    });
    this.loadTasks();
  }

  loadTasks(): void {
    localStorage.removeItem('synaptech-projects');
    this.api.getTasks().subscribe({
      next: (data) => {
        if (data) {
          this.tasks = data.map(t => ({
            ...t,
            projectName: t.projectName || 'General'
          }));
        }
      },
      error: () => {
        this.tasks = [];
      }
    });
    const users = new Set<string>();
    this.tasks.forEach(t => { if (t.assignedTo) users.add(t.assignedTo); });

    try {
      const stored = JSON.parse(localStorage.getItem('synaptech-employees') || '[]') as Array<{ name?: string; role?: string }>;
      stored.filter(e => e.role?.toLowerCase() !== 'admin').forEach(e => {
        if (e.name?.trim()) users.add(e.name.trim());
      });
    } catch { }

    this.allUsers = Array.from(users);
  }

  get filteredTasks() {
    const search = this.searchTerm.toLowerCase();
    const user = this.auth.user;
    const currentName = (user?.employeeName || user?.name || '').trim().toLowerCase();
    const currentEmail = (user?.email || '').trim().toLowerCase();

    return this.tasks.filter(t => {
      const assignedTo = (t.assignedTo || t.assignee || '').trim().toLowerCase();
      let isAssignedToMe = false;
      if (assignedTo) {
        if (currentName && (assignedTo === currentName || assignedTo.includes(currentName) || currentName.includes(assignedTo))) {
          isAssignedToMe = true;
        }
        if (currentEmail && assignedTo === currentEmail) {
          isAssignedToMe = true;
        }
      }

      const matchesTab = this.activeTab === 'my' ? isAssignedToMe : true;

      return matchesTab &&
        (!this.statusFilter || t.status === this.statusFilter) &&
        (!this.assigneeFilter || t.assignedTo === this.assigneeFilter) &&
        (!search || t.title.toLowerCase().includes(search) || t.projectName.toLowerCase().includes(search));
    });
  }
}