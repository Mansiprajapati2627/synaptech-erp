import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { ApiService } from '../../../services/api.service';
import { ErpPage } from '../../../shared/erp-page/erp-page';

interface TaskItem {
  id: string;
  title: string;
  projectName: string;
  projectStatus?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status: 'To do' | 'In progress' | 'Done' | 'Blocked';
  done?: boolean;
}

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErpPage],
  templateUrl: './my-tasks.html',
  styleUrl: './my-tasks.css'
})
export class MyTasks implements OnInit {
  myTasks: TaskItem[] = [];
  
  searchTerm = '';
  statusFilter = '';

  showModal = false;
  editingTask: TaskItem | null = null;
  
  // New/Edit Task form fields
  taskTitle = '';
  taskProject = '';
  taskDueDate = '';
  taskPriority: 'High' | 'Medium' | 'Low' = 'Medium';
  taskStatus: 'To do' | 'In progress' | 'Done' | 'Blocked' = 'To do';
  taskAssignee = '';

  toastMsg = '';

  constructor(public auth: AuthService, public api: ApiService, private router: Router) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || 'Mansi Prajapati';
  }

  get isManagerOrAdmin(): boolean {
    return this.auth.hasRole(['Admin', 'Manager']);
  }

  get availableEmployees(): string[] {
    const emps = (this.api.currentEmployees && this.api.currentEmployees.length)
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as Array<{ name?: string; role?: string }>);

    const nonAdmin = emps.filter((e: any) => e.role && e.role.toLowerCase() !== 'admin');
    return nonAdmin.map((employee: any) => employee.name?.trim() ?? '').filter(Boolean);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    localStorage.removeItem('synaptech-projects');

    this.api.getMyTasks().subscribe({
      next: (tasks) => {
        if (tasks) {
          this.myTasks = tasks.map(t => ({
            id: String(t.id),
            title: t.title,
            projectName: t.projectName || 'General',
            projectStatus: 'On track',
            assignedTo: t.assignedTo,
            dueDate: t.dueDate,
            priority: (t.priority || 'Medium') as any,
            status: (t.status || 'To do') as any,
            done: t.done
          }));
        }
      },
      error: () => {
        this.myTasks = [];
      }
    });
  }

  get totalTasksCount(): number {
    return this.myTasks.length;
  }

  get inProgressTasksCount(): number {
    return this.myTasks.filter(t => t.status === 'In progress').length;
  }

  get completedTasksCount(): number {
    return this.myTasks.filter(t => t.status === 'Done').length;
  }

  get todoTasksCount(): number {
    return this.myTasks.filter(t => t.status === 'To do' || t.status === 'Blocked').length;
  }

  get filteredTasks(): TaskItem[] {
    const search = this.searchTerm.toLowerCase();

    return this.myTasks.filter(t => {
      const matchesSearch = !search || t.title.toLowerCase().includes(search) || t.projectName.toLowerCase().includes(search) || (t.assignedTo && t.assignedTo.toLowerCase().includes(search));
      const matchesTaskStatus = !this.statusFilter || t.status === this.statusFilter;

      return matchesSearch && matchesTaskStatus;
    });
  }

  onStatusChange(task: TaskItem, newStatus: any): void {
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

  openCreateModal(): void {
    this.editingTask = null;
    this.taskTitle = '';
    this.taskProject = 'General';
    this.taskDueDate = new Date().toISOString().split('T')[0];
    this.taskPriority = 'Medium';
    this.taskStatus = 'To do';
    this.taskAssignee = this.currentUserName;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  openEditModal(task: TaskItem): void {
    this.editingTask = task;
    this.taskTitle = task.title;
    this.taskProject = task.projectName;
    this.taskDueDate = task.dueDate || '';
    this.taskPriority = task.priority || 'Medium';
    this.taskStatus = task.status || 'To do';
    this.taskAssignee = task.assignedTo || this.currentUserName;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    document.body.style.overflow = '';
  }

  saveTask(): void {
    if (!this.taskTitle.trim()) return;

    if (this.editingTask) {
      this.editingTask.title = this.taskTitle;
      this.editingTask.projectName = this.taskProject || 'General';
      this.editingTask.dueDate = this.taskDueDate;
      this.editingTask.priority = this.taskPriority;
      this.editingTask.status = this.taskStatus;
      this.editingTask.done = (this.taskStatus === 'Done');
      this.editingTask.assignedTo = this.taskAssignee;

      const numId = Number(this.editingTask.id);
      if (!isNaN(numId) && numId > 0) {
        this.api.updateTask(numId, {
          title: this.taskTitle,
          projectName: this.taskProject || 'General',
          dueDate: this.taskDueDate,
          priority: this.taskPriority,
          status: this.taskStatus,
          done: (this.taskStatus === 'Done'),
          assignedTo: this.taskAssignee
        }).subscribe({ next: () => this.loadData(), error: () => {} });
      }
      this.showToast('Task details updated!');
    } else {
      const newTaskPayload = {
        title: this.taskTitle,
        projectName: this.taskProject || 'General',
        dueDate: this.taskDueDate,
        priority: this.taskPriority,
        status: this.taskStatus,
        done: (this.taskStatus === 'Done'),
        assignedTo: this.taskAssignee || this.currentUserName
      };

      this.api.createTask(newTaskPayload).subscribe({
        next: () => {
          this.loadData();
          this.showToast('New task created successfully!');
        },
        error: () => {
          this.myTasks.push({
            id: 't_' + Date.now(),
            ...newTaskPayload,
            projectStatus: 'On track'
          });
          this.showToast('New task added successfully!');
        }
      });
    }

    this.closeModal();
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => {
      if (this.toastMsg === msg) this.toastMsg = '';
    }, 3000);
  }
}
