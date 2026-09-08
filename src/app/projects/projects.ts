// src/app/projects/projects.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { TaskDetailModal, TaskData, ActivityEntry as TaskActivityEntry } from './task-detail-modal/task-detail-modal.component';

// ------ Project-level activity (separate from task activity) ------
interface ProjectActivityEntry {
  id: string;
  text: string;
  date: string;
}

// ------ Task-level interfaces (re-exported from modal, but we define here for clarity) ------
// We'll use the imported types from modal for task fields.
// But we need to define our own ProjectTask that uses those types.
// We'll import the modal's types and use them.

// Since we import ActivityEntry from modal, we can use it directly.

interface TaskComment {
  author: string;
  text: string;
  timestamp: string;
}

interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

interface Attachment {
  id: string;
  name: string;
  url?: string;
  uploadedBy?: string;
  timestamp?: string;
}

// ProjectTask uses the modal's ActivityEntry type (with author, text, timestamp)
interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  assignedTo?: string;
  dueDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'To do' | 'In progress' | 'Done' | 'Blocked';
  comments?: TaskComment[];
  subtasks?: SubTask[];
  attachments?: Attachment[];
  activity?: TaskActivityEntry[]; // from modal
}

interface ProjectRecord {
  name: string;
  description: string;
  owner: string;
  status: 'On track' | 'At risk' | 'Completed';
  progress: number;
  color: string;
  priority: 'High' | 'Medium' | 'Low';
  startDate: string;
  deadline: string;
  members: string[];
  tasks: ProjectTask[];
  activity: ProjectActivityEntry[]; // project-level activity
  messages?: { author: string; text: string; timestamp: string }[];
}

@Component({
  imports: [FormsModule, TaskDetailModal],
  selector: 'app-projects',
  styleUrl: './projects.css',
  templateUrl: './projects.html',
})
export class Projects implements OnInit {
  private readonly storageKey = 'synaptech-projects';
  showForm = false;
  newName = '';
  newOwner = '';
  searchTerm = '';
  statusFilter = 'All statuses';
  viewMode: 'grid' | 'table' = 'grid';
  selectedProject?: ProjectRecord;
  newMemberName = '';
  newCommentText = '';
  newMessage = '';

  // Task modal state
  selectedTask: ProjectTask | null = null;
  selectedTaskProject: ProjectRecord | null = null;
  isCreatingTask = false;
  newTaskTitle = '';

  readonly statuses = ['All statuses', 'On track', 'At risk', 'Completed'];
  readonly priorities: ProjectRecord['priority'][] = ['High', 'Medium', 'Low'];

  /** Current employee directory, used by the Create Project lead selector. */
  get availableEmployees(): string[] {
    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as Array<{ name?: string }>;
    const names = employees.map(employee => employee.name?.trim() ?? '').filter(Boolean);
    return names.length ? names : ['Mansi Prajapati', 'Rohan Mehta', 'Neel Desai', 'Riya Shah', 'Aarav Shah'];
  }

  projects: ProjectRecord[] = [
    {
      name: 'Synaptech ERP', description: 'The internal people operations workspace.', owner: 'Mansi Prajapati',
      status: 'On track', progress: 50, color: 'purple', priority: 'High', startDate: '2025-01-15', deadline: '2026-03-31',
      members: ['Mansi Prajapati', 'Rohan Mehta', 'Neel Desai'],
      tasks: [
        {
          id: 't1', title: 'Design database schema', done: true, assignedTo: 'Mansi Prajapati', dueDate: '2025-02-01', priority: 'High', status: 'Done', comments: [],
          description: 'Design the database schema for the ERP system.',
          subtasks: [{ id: 'st1', title: 'Create ER diagram', done: true }, { id: 'st2', title: 'Define relationships', done: true }],
          attachments: [{ id: 'a1', name: 'schema.sql', uploadedBy: 'Mansi Prajapati', timestamp: '2025-01-20' }],
          activity: [{ id: 'act1', author: 'Mansi Prajapati', text: 'Created this task', timestamp: '2025-01-15T10:00:00' }]
        },
        {
          id: 't2', title: 'Build employee module', done: true, assignedTo: 'Rohan Mehta', dueDate: '2025-03-15', priority: 'High', status: 'Done', comments: [],
          description: 'Build the employee module with CRUD operations.',
          subtasks: [{ id: 'st3', title: 'Create API endpoints', done: true }, { id: 'st4', title: 'Build UI', done: true }],
          attachments: [],
          activity: []
        },
        {
          id: 't3', title: 'Build leave management module', done: false, assignedTo: 'Neel Desai', dueDate: '2025-05-30', priority: 'Medium', status: 'In progress', comments: [],
          description: 'Build the leave management module.',
          subtasks: [{ id: 'st5', title: 'Design database tables', done: true }, { id: 'st6', title: 'Build API', done: false }, { id: 'st7', title: 'Build UI', done: false }],
          attachments: [{ id: 'a2', name: 'leave-flow.png', uploadedBy: 'Neel Desai', timestamp: '2025-04-10' }],
          activity: []
        },
        {
          id: 't4', title: 'Set up role-based access', done: false, assignedTo: 'Mansi Prajapati', dueDate: '2025-06-15', priority: 'High', status: 'To do', comments: [],
          description: 'Set up role-based access control for the system.',
          subtasks: [{ id: 'st8', title: 'Define permissions', done: false }, { id: 'st9', title: 'Implement guards', done: false }],
          attachments: [{ id: 'a3', name: 'permissions-list.xlsx', uploadedBy: 'Mansi Prajapati', timestamp: '2025-06-01' }],
          activity: []
        }
      ],
      activity: [
        { id: 'a3', text: 'Completed task: Build employee module', date: 'Apr 10, 2025' },
        { id: 'a2', text: 'Completed task: Design database schema', date: 'Feb 02, 2025' },
        { id: 'a1', text: 'Project created', date: 'Jan 15, 2025' }
      ],
      messages: []
    },
    {
      name: 'Client portal', description: 'A clearer way for clients to follow delivery.', owner: 'Rohan Mehta',
      status: 'At risk', progress: 33, color: 'coral', priority: 'Medium', startDate: '2025-04-01', deadline: '2025-12-15',
      members: ['Rohan Mehta', 'Riya Shah'],
      tasks: [
        {
          id: 't5', title: 'Gather client requirements', done: true, assignedTo: 'Riya Shah', dueDate: '2025-04-20', priority: 'High', status: 'Done', comments: [],
          description: 'Gather requirements from the client.',
          subtasks: [{ id: 'st10', title: 'Schedule meetings', done: true }, { id: 'st11', title: 'Create requirements document', done: true }],
          attachments: [{ id: 'a4', name: 'requirements.docx', uploadedBy: 'Riya Shah', timestamp: '2025-04-15' }],
          activity: []
        },
        {
          id: 't6', title: 'Design UI mockups', done: false, assignedTo: 'Rohan Mehta', dueDate: '2025-05-10', priority: 'Medium', status: 'In progress', comments: [],
          description: 'Design UI mockups for the client portal.',
          subtasks: [{ id: 'st12', title: 'Create wireframes', done: true }, { id: 'st13', title: 'Create high-fidelity mockups', done: false }],
          attachments: [{ id: 'a5', name: 'wireframes.fig', uploadedBy: 'Rohan Mehta', timestamp: '2025-04-25' }],
          activity: []
        },
        {
          id: 't7', title: 'Build authentication flow', done: false, assignedTo: 'Riya Shah', dueDate: '2025-06-01', priority: 'Low', status: 'To do', comments: [],
          description: 'Build the authentication flow for the client portal.',
          subtasks: [],
          attachments: [],
          activity: []
        }
      ],
      activity: [
        { id: 'a2', text: 'Completed task: Gather client requirements', date: 'Apr 18, 2025' },
        { id: 'a1', text: 'Project created', date: 'Apr 01, 2025' }
      ],
      messages: []
    }
  ];

  constructor(public auth: AuthService) {}
  logout(): void { this.auth.logout(); }

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ProjectRecord>[];
      this.projects = parsed.map(project => this.normalizeProject(project));
      this.save();
    }
  }

  private normalizeProject(project: Partial<ProjectRecord>): ProjectRecord {
    const owner = project.owner ?? '';
    return {
      name: project.name ?? '',
      description: project.description ?? '',
      owner,
      status: project.status ?? 'On track',
      progress: project.progress ?? 0,
      color: project.color ?? 'purple',
      priority: project.priority ?? 'Medium',
      startDate: project.startDate ?? '',
      deadline: project.deadline ?? '',
      members: project.members?.length ? project.members : (owner ? [owner] : []),
      tasks: (project.tasks || []).map(t => ({
        id: t.id || this.makeId(),
        title: t.title || '',
        description: t.description || '',
        done: t.done || false,
        assignedTo: t.assignedTo || '',
        dueDate: t.dueDate || '',
        priority: t.priority || 'Medium',
        status: t.status || 'To do',
        comments: t.comments || [],
        subtasks: t.subtasks || [],
        attachments: t.attachments || [],
        activity: t.activity || []
      })),
      activity: project.activity ?? [],
      messages: project.messages ?? []
    };
  }

  private makeId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  private todayLabel(): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  }

  // ------ Project-level activity logging ------
  private logProjectActivity(project: ProjectRecord, text: string): void {
    project.activity.unshift({ id: this.makeId(), text, date: this.todayLabel() });
  }

  toggleForm(): void { this.showForm = !this.showForm; }

  addProject(): void {
    const name = this.newName.trim();
    const owner = this.newOwner.trim();
    if (!name || !owner) return;
    this.projects.push({
      name, description: 'A new project for the Synaptech team.', owner,
      status: 'On track', progress: 0, color: 'aqua', priority: 'Medium', startDate: '', deadline: '',
      members: [owner], tasks: [], activity: [{ id: this.makeId(), text: 'Project created', date: this.todayLabel() }],
      messages: []
    });
    this.save(); this.newName = ''; this.newOwner = ''; this.showForm = false;
  }

  save(): void { localStorage.setItem(this.storageKey, JSON.stringify(this.projects)); }

  get filteredProjects(): ProjectRecord[] {
    const search = this.searchTerm.trim().toLowerCase();
    return this.projects.filter(project =>
      (this.statusFilter === 'All statuses' || project.status === this.statusFilter) &&
      (!search || `${project.name} ${project.owner} ${project.description}`.toLowerCase().includes(search))
    );
  }

  get stats() {
    const total = this.projects.length;
    const onTrack = this.projects.filter(p => p.status === 'On track').length;
    const atRisk = this.projects.filter(p => p.status === 'At risk').length;
    const completed = this.projects.filter(p => p.status === 'Completed').length;
    const avgProgress = total ? Math.round(this.projects.reduce((sum, p) => sum + p.progress, 0) / total) : 0;
    return { total, onTrack, atRisk, completed, avgProgress };
  }

  setView(mode: 'grid' | 'table'): void { this.viewMode = mode; }

  openProject(project: ProjectRecord): void {
    this.selectedProject = project;
    this.newMemberName = '';
    this.newTaskTitle = '';
    this.newCommentText = '';
    this.newMessage = '';
    this.selectedTask = null;
    this.selectedTaskProject = null;
    this.isCreatingTask = false;
  }
  closeProject(): void { this.selectedProject = undefined; }

  get taskProgressLocked(): boolean { return !!this.selectedProject && this.selectedProject.tasks.length > 0; }
  get completedTaskCount(): number { return this.selectedProject?.tasks.filter(t => t.done).length ?? 0; }

  private recomputeProgress(project: ProjectRecord): void {
    if (project.tasks.length === 0) return;
    project.progress = Math.round((project.tasks.filter(t => t.done).length / project.tasks.length) * 100);
  }

  // ---------- Create task modal ----------
  openCreateTaskModal(): void {
    this.isCreatingTask = true;
    this.newTaskTitle = '';
    const emptyTask: ProjectTask = {
      id: this.makeId(),
      title: '',
      description: '',
      done: false,
      assignedTo: '',
      dueDate: '',
      priority: 'Medium',
      status: 'To do',
      comments: [],
      subtasks: [],
      attachments: [],
      activity: [{ id: this.makeId(), author: this.auth.user?.name || 'Unknown', text: 'Created this task', timestamp: new Date().toLocaleString() }]
    };
    this.selectedTask = emptyTask;
    this.selectedTaskProject = this.selectedProject || null;
  }

  // ---------- Task Modal methods ----------
  openTaskModal(task: ProjectTask): void {
    this.isCreatingTask = false;
    this.selectedTask = { ...task };
    this.selectedTaskProject = this.selectedProject || null;
  }

  closeTaskModal(): void {
    this.selectedTask = null;
    this.selectedTaskProject = null;
    this.isCreatingTask = false;
    this.newTaskTitle = '';
  }

  onTaskUpdated(updatedTask: ProjectTask): void {
    const project = this.selectedProject;
    if (!project) return;

    if (this.isCreatingTask) {
      project.tasks.push(updatedTask);
      this.logProjectActivity(project, `Added task: ${updatedTask.title}`);
    } else {
      const index = project.tasks.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        project.tasks[index] = updatedTask;
        this.logProjectActivity(project, `Updated task: ${updatedTask.title}`);
      }
    }
    this.recomputeProgress(project);
    this.save();
    this.closeTaskModal();
  }

  onTaskDeleted(taskId: string): void {
    const project = this.selectedProject;
    if (!project) return;
    const task = project.tasks.find(t => t.id === taskId);
    project.tasks = project.tasks.filter(t => t.id !== taskId);
    if (task) {
      this.logProjectActivity(project, `Deleted task: ${task.title}`);
    }
    this.recomputeProgress(project);
    this.save();
    this.closeTaskModal();
  }

  // ---------- Existing task methods ----------
  addTask(): void {
    const project = this.selectedProject;
    const title = this.newTaskTitle.trim();
    if (!project || !title) return;
    project.tasks.push({
      id: this.makeId(),
      title,
      description: '',
      done: false,
      assignedTo: '',
      dueDate: '',
      priority: 'Medium',
      status: 'To do',
      comments: [],
      subtasks: [],
      attachments: [],
      activity: [{ id: this.makeId(), author: this.auth.user?.name || 'Unknown', text: 'Created this task', timestamp: new Date().toLocaleString() }]
    });
    this.logProjectActivity(project, `Added task: ${title}`);
    this.recomputeProgress(project);
    this.save();
    this.newTaskTitle = '';
  }

  toggleTask(task: ProjectTask): void {
    const project = this.selectedProject;
    if (!project) return;
    task.done = !task.done;
    task.status = task.done ? 'Done' : 'To do';
    this.logProjectActivity(project, `${task.done ? 'Completed' : 'Reopened'} task: ${task.title}`);
    this.recomputeProgress(project);
    this.save();
  }

  deleteTask(task: ProjectTask): void {
    const project = this.selectedProject;
    if (!project) return;
    project.tasks = project.tasks.filter(item => item !== task);
    this.logProjectActivity(project, `Removed task: ${task.title}`);
    this.recomputeProgress(project);
    this.save();
  }

  addTaskComment(task: ProjectTask): void {
    const project = this.selectedProject;
    if (!project || !this.newCommentText.trim()) return;
    if (!task.comments) task.comments = [];
    task.comments.push({
      author: this.auth.user?.name || 'Unknown',
      text: this.newCommentText.trim(),
      timestamp: new Date().toLocaleString()
    });
    this.logProjectActivity(project, `Commented on task: ${task.title}`);
    this.save();
    this.newCommentText = '';
  }

  postMessage(): void {
    const project = this.selectedProject;
    if (!project || !this.newMessage.trim()) return;
    if (!project.messages) project.messages = [];
    project.messages.push({
      author: this.auth.user?.name || 'Unknown',
      text: this.newMessage.trim(),
      timestamp: new Date().toLocaleString()
    });
    this.logProjectActivity(project, `Posted a message`);
    this.save();
    this.newMessage = '';
  }

  addMember(): void {
    const project = this.selectedProject;
    const name = this.newMemberName.trim();
    if (!project || !name || project.members.includes(name)) return;
    project.members.push(name);
    this.logProjectActivity(project, `Added ${name} to the team`);
    this.save();
    this.newMemberName = '';
  }

  removeMember(name: string): void {
    const project = this.selectedProject;
    if (!project) return;
    project.members = project.members.filter(m => m !== name);
    this.logProjectActivity(project, `Removed ${name} from the team`);
    this.save();
  }

  saveProjectDetails(): void {
    const project = this.selectedProject;
    if (!project || !project.name.trim() || !project.owner.trim()) return;
    if (project.tasks.length === 0) project.progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
    project.tasks.forEach(t => {
      if (!t.status) t.status = t.done ? 'Done' : 'To do';
      if (!t.priority) t.priority = 'Medium';
    });
    this.logProjectActivity(project, 'Project details updated');
    this.save();
  }

  deleteProject(): void {
    if (!this.selectedProject) return;
    this.projects = this.projects.filter(p => p !== this.selectedProject);
    this.save();
    this.closeProject();
  }
}
