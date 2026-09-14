import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../../shared/erp-page/erp-page';

@Component({
  selector: 'app-team-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './team-tasks.html',
  styleUrl: './team-tasks.css'
})
export class TeamTasks implements OnInit {
  tasks: any[] = [];
  searchTerm = '';
  statusFilter = '';
  projectStatusFilter = 'All';
  toastMsg = '';

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    const projects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];
    const list: any[] = [];
    projects.forEach(p => {
      p.tasks?.forEach((t: any) => {
        list.push({ ...t, projectName: p.name, projectStatus: p.status || 'Ongoing' });
      });
    });
    this.tasks = list;
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

    const storedProjects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];
    for (const p of storedProjects) {
      if (p.name === task.projectName) {
        const found = p.tasks?.find((t: any) => t.id === task.id || t.title === task.title);
        if (found) {
          found.status = newStatus;
          found.done = (newStatus === 'Done');
          break;
        }
      }
    }
    localStorage.setItem('synaptech-projects', JSON.stringify(storedProjects));
    this.showToast(`Updated "${task.title}" status to ${newStatus}`);
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => {
      if (this.toastMsg === msg) this.toastMsg = '';
    }, 3000);
  }
}
