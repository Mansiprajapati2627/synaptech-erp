// src/app/projects/tasks/tasks.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './tasks.html',
  styleUrls: ['./tasks.css']
})
export class Tasks implements OnInit {
  searchTerm = '';
  statusFilter = '';
  assigneeFilter = '';
  allUsers: string[] = [];
  tasks: (any & { projectName: string })[] = [];

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
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
    return this.tasks.filter(t =>
      (!this.statusFilter || t.status === this.statusFilter) &&
      (!this.assigneeFilter || t.assignedTo === this.assigneeFilter) &&
      (!search || t.title.toLowerCase().includes(search) || t.projectName.toLowerCase().includes(search))
    );
  }
}