// src/app/projects/tasks/tasks.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

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

  constructor(public auth: AuthService, private route: ActivatedRoute) {}

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
    const projects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];
    const all: any[] = [];
    projects.forEach(p => {
      p.tasks?.forEach((t: any) => {
        all.push({ ...t, projectName: p.name });
      });
    });
    this.tasks = all;
    const users = new Set<string>();
    this.tasks.forEach(t => { if (t.assignedTo) users.add(t.assignedTo); });

    // Include stored employees as available assignees
    try {
      const stored = JSON.parse(localStorage.getItem('synaptech-employees') || '[]') as Array<{ name?: string; role?: string }>;
      stored.filter(e => e.role?.toLowerCase() !== 'admin').forEach(e => {
        if (e.name?.trim()) users.add(e.name.trim());
      });
    } catch {}

    this.allUsers = Array.from(users);
  }

  get filteredTasks() {
    const search = this.searchTerm.toLowerCase();
    const currentName = this.currentUserName.toLowerCase();

    return this.tasks.filter(t => {
      const matchesTab = this.activeTab === 'my'
        ? (t.assignedTo && t.assignedTo.toLowerCase() === currentName) || !t.assignedTo
        : true;

      return matchesTab &&
        (!this.statusFilter || t.status === this.statusFilter) &&
        (!this.assigneeFilter || t.assignedTo === this.assigneeFilter) &&
        (!search || t.title.toLowerCase().includes(search) || t.projectName.toLowerCase().includes(search));
    });
  }
}