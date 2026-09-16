import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ErpPage } from '../../../shared/erp-page/erp-page';

@Component({
  selector: 'app-team-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErpPage],
  templateUrl: './team-tasks.html',
  styleUrl: './team-tasks.css'
})
export class TeamTasks implements OnInit {
  tasks: any[] = [];
  searchTerm = '';
  statusFilter = '';
  projectStatusFilter = 'All';
  toastMsg = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.api.getTasks().subscribe({
      next: (data) => {
        if (data) {
          this.tasks = data.map(t => ({
            id: String(t.id),
            title: t.title,
            projectName: t.projectName || 'General',
            projectStatus: 'Ongoing',
            assignedTo: t.assignedTo,
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
            done: t.done
          }));
        }
      },
      error: () => {
        this.tasks = [];
      }
    });
  }

  get filteredTasks(): any[] {
    const s = this.searchTerm.toLowerCase();

    return this.tasks.filter(t => {
      const matchesSearch = !s || t.title.toLowerCase().includes(s) || (t.assignedTo && t.assignedTo.toLowerCase().includes(s)) || t.projectName.toLowerCase().includes(s);
      const matchesStatus = !this.statusFilter || t.status === this.statusFilter;

      let matchesProjectStatus = true;
      if (this.projectStatusFilter === 'Ongoing') {
        matchesProjectStatus = t.projectStatus === 'Ongoing' || t.projectStatus === 'On track';
      } else if (this.projectStatusFilter === 'Starting Soon') {
        matchesProjectStatus = t.projectStatus === 'Starting Soon' || t.projectStatus === 'At risk';
      } else if (this.projectStatusFilter === 'Completed') {
        matchesProjectStatus = t.projectStatus === 'Completed';
      }

      return matchesSearch && matchesStatus && matchesProjectStatus;
    });
  }

  onStatusChange(task: any, newStatus: string): void {
    task.status = newStatus;
    task.done = (newStatus === 'Done');

    const numId = Number(task.id);
    if (!isNaN(numId) && numId > 0) {
      this.api.updateTask(numId, { status: newStatus, done: task.done }).subscribe({
        next: () => this.showToast(`Updated "${task.title}" status to ${newStatus}`),
        error: () => this.showToast(`Updated "${task.title}" status to ${newStatus}`)
      });
    } else {
      this.showToast(`Updated "${task.title}" status to ${newStatus}`);
    }
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => {
      if (this.toastMsg === msg) this.toastMsg = '';
    }, 3000);
  }
}
