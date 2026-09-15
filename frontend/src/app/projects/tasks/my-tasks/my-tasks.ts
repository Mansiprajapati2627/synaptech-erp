import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth.service';
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

interface ProjectItem {
  name: string;
  description?: string;
  owner?: string;
  status: 'Ongoing' | 'Starting Soon' | 'Completed' | 'On track' | 'At risk';
  progress?: number;
  startDate?: string;
  deadline?: string;
  tasks: any[];
}

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './my-tasks.html',
  styleUrl: './my-tasks.css'
})
export class MyTasks implements OnInit {
  projects: ProjectItem[] = [];
  myTasks: TaskItem[] = [];
  
  searchTerm = '';
  statusFilter = '';
  projectStatusFilter = 'All';

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

  constructor(public auth: AuthService) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || 'Mansi Prajapati';
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    let storedProjects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as ProjectItem[];
    
    // Seed default projects if localStorage is empty
    if (!storedProjects || storedProjects.length === 0) {
      storedProjects = [
        {
          name: 'Synaptech ERP',
          description: 'Internal ERP & people operations suite.',
          owner: 'Mansi Prajapati',
          status: 'Ongoing',
          progress: 65,
          startDate: '2025-01-15',
          deadline: '2026-03-31',
          tasks: [
            { id: 't1', title: 'Design database schema', done: true, assignedTo: 'Mansi Prajapati', dueDate: '2025-02-01', priority: 'High', status: 'Done' },
            { id: 't2', title: 'Implement Attendance & Leave module', done: true, assignedTo: 'Mansi Prajapati', dueDate: '2026-03-10', priority: 'High', status: 'Done' },
            { id: 't3', title: 'Finalize Payroll & Settings workflow', done: false, assignedTo: 'Mansi Prajapati', dueDate: '2026-03-25', priority: 'Medium', status: 'In progress' }
          ]
        },
        {
          name: 'Mobile App Redesign',
          description: 'iOS & Android employee mobile self-service app.',
          owner: 'Rohan Mehta',
          status: 'Ongoing',
          progress: 40,
          startDate: '2025-11-01',
          deadline: '2026-04-15',
          tasks: [
            { id: 't4', title: 'Figma UI wireframes & prototypes', done: true, assignedTo: 'Rohan Mehta', dueDate: '2025-12-20', priority: 'High', status: 'Done' },
            { id: 't5', title: 'Flutter mobile app API integration', done: false, assignedTo: 'Mansi Prajapati', dueDate: '2026-04-01', priority: 'High', status: 'In progress' }
          ]
        },
        {
          name: 'AI Analytics Hub',
          description: 'Predictive attrition & employee performance intelligence.',
          owner: 'Neel Desai',
          status: 'Starting Soon',
          progress: 10,
          startDate: '2026-04-01',
          deadline: '2026-06-30',
          tasks: [
            { id: 't6', title: 'Model architecture & dataset preparation', done: false, assignedTo: 'Mansi Prajapati', dueDate: '2026-04-20', priority: 'Medium', status: 'To do' }
          ]
        },
        {
          name: 'Legacy Data Migration',
          description: 'Migration of historical employee payroll logs.',
          owner: 'Mansi Prajapati',
          status: 'Completed',
          progress: 100,
          startDate: '2025-06-01',
          deadline: '2025-12-15',
          tasks: [
            { id: 't7', title: 'Export CSV archives to SQL database', done: true, assignedTo: 'Mansi Prajapati', dueDate: '2025-11-30', priority: 'High', status: 'Done' }
          ]
        }
      ];
      localStorage.setItem('synaptech-projects', JSON.stringify(storedProjects));
    }

    this.projects = storedProjects;

    const user = this.auth.user;
    const currentName = (user?.employeeName || user?.name || '').trim().toLowerCase();
    const currentEmail = (user?.email || '').trim().toLowerCase();
    const currentCode = user?.employeeId ? String(user.employeeId) : '';
    const list: TaskItem[] = [];

    this.projects.forEach(p => {
      p.tasks?.forEach((t: any) => {
        const assignedTo = (t.assignedTo || t.assignee || '').trim().toLowerCase();
        const assignedEmail = (t.assignedEmail || '').trim().toLowerCase();

        let isMatch = false;
        if (assignedTo) {
          if (currentName && (assignedTo === currentName || assignedTo.includes(currentName) || currentName.includes(assignedTo))) {
            isMatch = true;
          }
          if (currentEmail && (assignedTo === currentEmail || assignedEmail === currentEmail)) {
            isMatch = true;
          }
          if (currentCode && assignedTo === currentCode) {
            isMatch = true;
          }
        }

        if (isMatch) {
          list.push({
            ...t,
            projectName: p.name,
            projectStatus: p.status || 'Ongoing'
          });
        }
      });
    });

    this.myTasks = list;
  }

  get ongoingProjectsCount(): number {
    return this.projects.filter(p => p.status === 'Ongoing' || p.status === 'On track').length;
  }

  get startingSoonProjectsCount(): number {
    return this.projects.filter(p => p.status === 'Starting Soon' || p.status === 'At risk').length;
  }

  get completedProjectsCount(): number {
    return this.projects.filter(p => p.status === 'Completed').length;
  }

  viewMode: 'projects' | 'tasks' = 'projects';

  get filteredProjects(): ProjectItem[] {
    const search = this.searchTerm.toLowerCase();
    return this.projects.filter(p => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search));
      
      let matchesStatus = true;
      if (this.projectStatusFilter === 'Ongoing') {
        matchesStatus = p.status === 'Ongoing' || p.status === 'On track';
      } else if (this.projectStatusFilter === 'Starting Soon') {
        matchesStatus = p.status === 'Starting Soon' || p.status === 'At risk';
      } else if (this.projectStatusFilter === 'Completed') {
        matchesStatus = p.status === 'Completed';
      }

      return matchesSearch && matchesStatus;
    });
  }

  updateProjectStatus(project: ProjectItem, newStatus: any): void {
    project.status = newStatus;
    if (newStatus === 'Completed') project.progress = 100;
    
    const storedProjects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];
    const target = storedProjects.find(p => p.name === project.name);
    if (target) {
      target.status = newStatus;
      if (newStatus === 'Completed') target.progress = 100;
      localStorage.setItem('synaptech-projects', JSON.stringify(storedProjects));
      this.loadData();
      this.showToast(`Updated "${project.name}" status to ${newStatus}`);
    }
  }

  get filteredTasks(): TaskItem[] {
    const search = this.searchTerm.toLowerCase();

    return this.myTasks.filter(t => {
      const matchesSearch = !search || t.title.toLowerCase().includes(search) || t.projectName.toLowerCase().includes(search);
      const matchesTaskStatus = !this.statusFilter || t.status === this.statusFilter;

      let matchesProjectStatus = true;
      if (this.projectStatusFilter === 'Ongoing') {
        matchesProjectStatus = t.projectStatus === 'Ongoing' || t.projectStatus === 'On track';
      } else if (this.projectStatusFilter === 'Starting Soon') {
        matchesProjectStatus = t.projectStatus === 'Starting Soon' || t.projectStatus === 'At risk';
      } else if (this.projectStatusFilter === 'Completed') {
        matchesProjectStatus = t.projectStatus === 'Completed';
      }

      return matchesSearch && matchesTaskStatus && matchesProjectStatus;
    });
  }

  onStatusChange(task: TaskItem, newStatus: any): void {
    task.status = newStatus;
    task.done = (newStatus === 'Done');

    // Persist change to localStorage
    const storedProjects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];
    for (const p of storedProjects) {
      if (p.name === task.projectName) {
        const foundTask = p.tasks?.find((t: any) => t.id === task.id || t.title === task.title);
        if (foundTask) {
          foundTask.status = newStatus;
          foundTask.done = (newStatus === 'Done');
          break;
        }
      }
    }
    localStorage.setItem('synaptech-projects', JSON.stringify(storedProjects));
    this.showToast(`Updated "${task.title}" status to ${newStatus}`);
  }

  openCreateModal(): void {
    this.editingTask = null;
    this.taskTitle = '';
    this.taskProject = this.projects[0]?.name || 'Synaptech ERP';
    this.taskDueDate = new Date().toISOString().split('T')[0];
    this.taskPriority = 'Medium';
    this.taskStatus = 'To do';
    this.taskAssignee = this.currentUserName;
    this.showModal = true;
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
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveTask(): void {
    if (!this.taskTitle.trim()) return;

    const storedProjects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];

    if (this.editingTask) {
      // Update existing task
      this.editingTask.title = this.taskTitle;
      this.editingTask.projectName = this.taskProject;
      this.editingTask.dueDate = this.taskDueDate;
      this.editingTask.priority = this.taskPriority;
      this.editingTask.status = this.taskStatus;
      this.editingTask.done = (this.taskStatus === 'Done');
      this.editingTask.assignedTo = this.taskAssignee;

      for (const p of storedProjects) {
        if (p.name === this.taskProject) {
          const found = p.tasks?.find((t: any) => t.id === this.editingTask!.id || t.title === this.editingTask!.title);
          if (found) {
            found.title = this.taskTitle;
            found.dueDate = this.taskDueDate;
            found.priority = this.taskPriority;
            found.status = this.taskStatus;
            found.done = (this.taskStatus === 'Done');
            found.assignedTo = this.taskAssignee;
          }
        }
      }
      this.showToast('Task details updated!');
    } else {
      // Create new task
      const newTask = {
        id: 't_' + Date.now(),
        title: this.taskTitle,
        done: (this.taskStatus === 'Done'),
        assignedTo: this.taskAssignee || this.currentUserName,
        dueDate: this.taskDueDate,
        priority: this.taskPriority,
        status: this.taskStatus
      };

      const pIndex = storedProjects.findIndex(p => p.name === this.taskProject);
      if (pIndex !== -1) {
        storedProjects[pIndex].tasks = storedProjects[pIndex].tasks || [];
        storedProjects[pIndex].tasks.push(newTask);
      } else if (storedProjects.length > 0) {
        storedProjects[0].tasks.push(newTask);
      }

      this.showToast('New task added successfully!');
    }

    localStorage.setItem('synaptech-projects', JSON.stringify(storedProjects));
    this.loadData();
    this.closeModal();
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    setTimeout(() => {
      if (this.toastMsg === msg) this.toastMsg = '';
    }, 3000);
  }
}
