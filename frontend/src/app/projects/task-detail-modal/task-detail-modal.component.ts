// src/app/projects/task-detail-modal/task-detail-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface TaskComment {
  author: string;
  text: string;
  timestamp: string;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url?: string;
  uploadedBy?: string;
  timestamp?: string;
}

export interface ActivityEntry {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface TaskData {
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
  activity?: ActivityEntry[];
}

@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [FormsModule, CommonModule], // ✅ FormsModule is here
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <span class="task-id">#{{ task?.id?.slice(0, 6) }}</span>
            <span class="task-status" [class]="task?.status || 'To do'">
              {{ task?.status || 'To do' }}
            </span>
          </div>
          <button class="close-btn" (click)="close()">✕</button>
        </div>

        <!-- Title -->
        <input class="task-title" [(ngModel)]="task.title" placeholder="Task title" (change)="logActivity('Title updated')">

        <!-- Description -->
        <div class="field-group">
          <label>Description</label>
          <textarea [(ngModel)]="task.description" placeholder="Add a detailed description..." rows="3" (change)="logActivity('Description updated')"></textarea>
        </div>

        <!-- Meta fields -->
        <div class="task-meta-grid">
          <div class="meta-field">
            <label>Assignee</label>
            <select [(ngModel)]="task.assignedTo" (change)="logActivity('Assignee changed to ' + (task.assignedTo || 'unassigned'))">
              <option value="">Unassigned</option>
              @for (member of members; track member) {
                <option [value]="member">{{ member }}</option>
              }
            </select>
          </div>
          <div class="meta-field">
            <label>Due date</label>
            <input type="date" [(ngModel)]="task.dueDate" (change)="logActivity('Due date updated')">
          </div>
          <div class="meta-field">
            <label>Priority</label>
            <select [(ngModel)]="task.priority" (change)="logActivity('Priority changed to ' + task.priority)">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div class="meta-field">
            <label>Status</label>
            <select [(ngModel)]="task.status" (change)="logActivity('Status changed to ' + task.status)">
              <option value="To do">To do</option>
              <option value="In progress">In progress</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
        </div>

        <!-- Subtasks -->
        <div class="subtasks-section">
          <div class="section-header">
            <h4>Subtasks</h4>
            <span>{{ (task.subtasks || []).filter(s => s.done).length }} of {{ (task.subtasks || []).length }}</span>
          </div>
          <div class="subtask-list">
            @for (subtask of task.subtasks || []; track subtask.id) {
              <div class="subtask-item">
                <label>
                  <input type="checkbox" [checked]="subtask.done" (change)="toggleSubtask(subtask)">
                  <span [class.done]="subtask.done">{{ subtask.title }}</span>
                </label>
                <button class="remove-subtask" (click)="removeSubtask(subtask)">×</button>
              </div>
            } @empty {
              <p class="empty-hint">No subtasks yet.</p>
            }
          </div>
          <div class="add-subtask">
            <input [(ngModel)]="newSubtaskTitle" placeholder="Add a subtask..." (keyup.enter)="addSubtask()">
            <button (click)="addSubtask()">Add</button>
          </div>
        </div>

        <!-- Comments -->
        <div class="comments-section">
          <h4>Comments</h4>
          <div class="comment-list">
            @for (comment of task.comments || []; track $index) {
              <div class="comment">
                <strong>{{ comment.author }}</strong>
                <span>{{ comment.text }}</span>
                <small>{{ comment.timestamp }}</small>
              </div>
            } @empty {
              <p class="empty-hint">No comments yet.</p>
            }
          </div>
          <div class="add-comment">
            <input [(ngModel)]="newComment" placeholder="Write a comment..." (keyup.enter)="addComment()">
            <button (click)="addComment()">Post</button>
          </div>
        </div>

        <!-- 🔥 ATTACHMENTS – WORKING -->
        <div class="attachments-section">
          <div class="section-header">
            <h4>Attachments</h4>
            <span>{{ (task.attachments || []).length }}</span>
          </div>
          <div class="attachment-list">
            @for (att of task.attachments || []; track att.id) {
              <div class="attachment-item">
                <span class="att-icon">📎</span>
                <span class="att-name">{{ att.name }}</span>
                <span class="att-meta">({{ att.uploadedBy || 'Unknown' }})</span>
                <button class="remove-attachment" (click)="removeAttachment(att)">×</button>
              </div>
            } @empty {
              <p class="empty-hint">No attachments.</p>
            }
          </div>
          <div class="add-attachment">
            <input 
              [(ngModel)]="newAttachmentName" 
              placeholder="Attachment name..." 
              (keyup.enter)="addAttachment()"
            >
            <button (click)="addAttachment()">Add</button>
          </div>
        </div>

        <!-- Activity History -->
        <div class="activity-section">
          <h4>Activity</h4>
          <div class="activity-list">
            @for (entry of task.activity || []; track entry.id) {
              <div class="activity-entry">
                <span class="activity-author">{{ entry.author }}</span>
                <span class="activity-text">{{ entry.text }}</span>
                <small class="activity-time">{{ entry.timestamp }}</small>
              </div>
            } @empty {
              <p class="empty-hint">No activity yet.</p>
            }
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-actions">
          <button class="delete-btn" (click)="openDeleteConfirm()">Delete task</button>
          <button class="save-btn" (click)="save()">Save changes</button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation overlay -->
    @if (showDeleteConfirm) {
      <div class="delete-confirm-overlay" (click)="showDeleteConfirm = false">
        <div class="delete-confirm-box" (click)="$event.stopPropagation()">
          <h3>Delete task</h3>
          <p>Are you sure you want to permanently delete <strong>"{{ task?.title }}"</strong>?</p>
          <div class="delete-confirm-actions">
            <button class="cancel-btn" (click)="showDeleteConfirm = false">Cancel</button>
            <button class="confirm-delete-btn" (click)="confirmDelete()">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay { position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content { background: #fffdfb; border-radius: 12px; max-width: 760px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 28px 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.25s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .header-left { display: flex; gap: 12px; align-items: center; }
    .task-id { color: #887f9e; font-size: 12px; font-weight: bold; background: #f0ebf5; padding: 4px 10px; border-radius: 12px; }
    .task-status { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .task-status.To\\ do { background: #eee6f3; color: #67558d; }
    .task-status.In\\ progress { background: #e2f3f0; color: #3a8577; }
    .task-status.Done { background: #e4f1e8; color: #4b8062; }
    .task-status.Blocked { background: #f6e1dc; color: #b35f55; }
    .close-btn { background: none; border: none; font-size: 24px; color: #887f9e; cursor: pointer; padding: 0 4px; }
    .close-btn:hover { color: #51476d; }
    .task-title { width: 100%; font-size: 24px; font-family: Georgia, 'Times New Roman', serif; border: none; border-bottom: 2px solid transparent; padding: 6px 0; margin-bottom: 12px; background: transparent; color: #51476d; outline: none; }
    .task-title:focus { border-bottom-color: #8e83bd; }
    .field-group { margin-bottom: 16px; }
    .field-group label { display: block; font-size: 11px; font-weight: bold; color: #887f9e; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-group textarea { width: 100%; padding: 10px; border: 1px solid #d9cce2; border-radius: 4px; background: #fcf9f4; color: #51476d; font-size: 13px; resize: vertical; outline: none; }
    .field-group textarea:focus { border-color: #8e83bd; }
    .task-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .meta-field label { display: block; font-size: 11px; font-weight: bold; color: #887f9e; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-field select, .meta-field input { width: 100%; padding: 8px 10px; border: 1px solid #d9cce2; border-radius: 4px; background: #fcf9f4; color: #51476d; font-size: 13px; outline: none; }
    .meta-field select:focus, .meta-field input:focus { border-color: #8e83bd; }
    .subtasks-section, .comments-section, .attachments-section, .activity-section { margin-bottom: 20px; border-top: 1px solid #eee5ef; padding-top: 16px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .section-header h4 { margin: 0; color: #51476d; font-family: Georgia, 'Times New Roman', serif; font-weight: normal; }
    .section-header span { color: #887f9e; font-size: 12px; }
    .subtask-list, .attachment-list { margin: 8px 0; }
    .subtask-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0ebf5; }
    .subtask-item label { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; }
    .subtask-item label span { font-size: 13px; color: #51476d; }
    .subtask-item label span.done { text-decoration: line-through; color: #887f9e; }
    .remove-subtask, .remove-attachment { background: none; border: none; color: #c3b6cf; font-size: 16px; cursor: pointer; }
    .remove-subtask:hover, .remove-attachment:hover { color: #b35f55; }
    .add-subtask, .add-comment, .add-attachment { display: flex; gap: 8px; margin-top: 6px; }
    .add-subtask input, .add-comment input, .add-attachment input { flex: 1; padding: 6px 10px; border: 1px solid #d9cce2; border-radius: 4px; background: #fcf9f4; font-size: 13px; outline: none; }
    .add-subtask input:focus, .add-comment input:focus, .add-attachment input:focus { border-color: #8e83bd; }
    .add-subtask button, .add-comment button, .add-attachment button { padding: 6px 14px; border: 0; border-radius: 4px; background: #8e83bd; color: #fff; font-weight: bold; cursor: pointer; }
    .add-subtask button:hover, .add-comment button:hover, .add-attachment button:hover { background: #766aa5; }
    .comment-list { max-height: 150px; overflow-y: auto; margin-bottom: 8px; }
    .comment { padding: 6px 0; border-bottom: 1px solid #f0ebf5; font-size: 13px; }
    .comment strong { color: #8e83bd; }
    .comment small { display: block; color: #887f9e; font-size: 10px; margin-top: 2px; }
    .attachment-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f0ebf5; }
    .att-icon { font-size: 16px; }
    .att-name { flex: 1; font-size: 13px; color: #51476d; }
    .att-meta { font-size: 11px; color: #887f9e; }
    .activity-list { max-height: 120px; overflow-y: auto; }
    .activity-entry { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f0ebf5; font-size: 12px; }
    .activity-author { font-weight: bold; color: #8e83bd; }
    .activity-text { flex: 1; color: #51476d; }
    .activity-time { color: #887f9e; font-size: 10px; }
    .empty-hint { color: #887f9e; font-size: 12px; margin: 4px 0; }
    .modal-actions { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee5ef; }
    .delete-btn { padding: 8px 16px; border: 1px solid #efcfc8; border-radius: 5px; background: #fff5f2; color: #b35f55; font-size: 12px; cursor: pointer; }
    .delete-btn:hover { background: #f6e1dc; }
    .save-btn { padding: 8px 20px; border: 0; border-radius: 5px; background: #70679b; color: #fff; font-weight: bold; cursor: pointer; }
    .save-btn:hover { background: #5f5688; }
    .delete-confirm-overlay { position: fixed; inset: 0; z-index: 10003; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
    .delete-confirm-box { background: #fffdfb; border-radius: 8px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
    .delete-confirm-box h3 { margin: 0 0 8px; color: #51476d; font-family: Georgia, 'Times New Roman', serif; font-weight: normal; }
    .delete-confirm-box p { color: #887f9e; font-size: 14px; margin: 0 0 20px; }
    .delete-confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .delete-confirm-actions button { padding: 8px 20px; border: 0; border-radius: 4px; font-weight: bold; cursor: pointer; }
    .cancel-btn { background: #f0ebf5; color: #67558d; }
    .cancel-btn:hover { background: #e6dce9; }
    .confirm-delete-btn { background: #b35f55; color: #fff; }
    .confirm-delete-btn:hover { background: #a14e44; }
    @media (max-width: 600px) {
      .modal-content { padding: 20px; }
      .task-meta-grid { grid-template-columns: 1fr; }
      .modal-actions { flex-direction: column-reverse; gap: 10px; }
      .modal-actions button { width: 100%; }
    }
  `]
})
export class TaskDetailModal implements OnInit {
  @Input() task!: TaskData;
  @Input() members: string[] = [];
  @Input() currentUser?: string;
  @Output() closeModal = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<TaskData>();
  @Output() taskDeleted = new EventEmitter<string>();

  newComment = '';
  newSubtaskTitle = '';
  newAttachmentName = '';
  showDeleteConfirm = false;
  private originalTask: TaskData | null = null;

  ngOnInit(): void {
    this.originalTask = JSON.parse(JSON.stringify(this.task));
    if (!this.task.subtasks) this.task.subtasks = [];
    if (!this.task.attachments) this.task.attachments = [];
    if (!this.task.comments) this.task.comments = [];
    if (!this.task.activity) this.task.activity = [];
    if (this.task.activity?.length === 0) {
      this.logActivity('Created this task');
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  // ----- Subtasks -----
  addSubtask(): void {
    const title = this.newSubtaskTitle.trim();
    if (!title) return;
    if (!this.task.subtasks) this.task.subtasks = [];
    this.task.subtasks.push({ id: Date.now().toString(36), title, done: false });
    this.logActivity(`Added subtask: "${title}"`);
    this.newSubtaskTitle = '';
  }

  toggleSubtask(subtask: any): void {
    subtask.done = !subtask.done;
    this.logActivity(`${subtask.done ? 'Completed' : 'Reopened'} subtask: "${subtask.title}"`);
  }

  removeSubtask(subtask: any): void {
    this.task.subtasks = this.task.subtasks?.filter(s => s.id !== subtask.id);
    this.logActivity(`Removed subtask: "${subtask.title}"`);
  }

  // ----- Comments -----
  addComment(): void {
    if (!this.newComment.trim()) return;
    if (!this.task.comments) this.task.comments = [];
    this.task.comments.push({
      author: this.currentUser || 'Unknown',
      text: this.newComment.trim(),
      timestamp: new Date().toLocaleString()
    });
    this.logActivity(`Commented: "${this.newComment.trim()}"`);
    this.newComment = '';
  }

  // 🔥 ATTACHMENTS – WORKING
  addAttachment(): void {
    const name = this.newAttachmentName.trim();
    if (!name) return;
    if (!this.task.attachments) this.task.attachments = [];
    this.task.attachments.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      uploadedBy: this.currentUser || 'Unknown',
      timestamp: new Date().toLocaleString()
    });
    this.logActivity(`Added attachment: "${name}"`);
    this.newAttachmentName = ''; // clears the input
  }

  removeAttachment(att: any): void {
    this.task.attachments = this.task.attachments?.filter(a => a.id !== att.id);
    this.logActivity(`Removed attachment: "${att.name}"`);
  }

  // ----- Activity -----
  logActivity(text: string): void {
    if (!this.task.activity) this.task.activity = [];
    this.task.activity.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      author: this.currentUser || 'Unknown',
      text,
      timestamp: new Date().toLocaleString()
    });
  }

  // ----- Delete -----
  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    this.taskDeleted.emit(this.task.id);
    this.close();
  }

  // ----- Save -----
  save(): void {
    this.taskUpdated.emit(this.task);
    this.close();
  }
}