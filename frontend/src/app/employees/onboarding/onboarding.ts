import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../shared/erp-page/erp-page';

export interface OnboardingTask {
  id: string;
  title: string;
  category: 'IT' | 'HR' | 'Asset' | 'Intro';
  completed: boolean;
}

export interface NewHire {
  id: string;
  name: string;
  role: string;
  department: string;
  startDate: string;
  buddy: string;
  progress: number;
  tasks: OnboardingTask[];
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css'
})
export class Onboarding {
  searchTerm: string = '';
  showInitiateModal: boolean = false;

  newHireForm = {
    name: '',
    role: '',
    department: 'Engineering',
    startDate: '',
    buddy: 'Sarah Jenkins'
  };

  newHires: NewHire[] = [];

  get filteredHires(): NewHire[] {
    return this.newHires.filter(h =>
      h.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      h.role.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      h.department.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get overallAverageProgress(): number {
    if (!this.newHires.length) return 0;
    const total = this.newHires.reduce((acc, h) => acc + h.progress, 0);
    return Math.round(total / this.newHires.length);
  }

  get totalPendingTasks(): number {
    return this.newHires.reduce((acc, h) => acc + h.tasks.filter(t => !t.completed).length, 0);
  }

  toggleTask(hire: NewHire, task: OnboardingTask) {
    task.completed = !task.completed;
    this.recalculateProgress(hire);
  }

  recalculateProgress(hire: NewHire) {
    if (!hire.tasks.length) return;
    const completedCount = hire.tasks.filter(t => t.completed).length;
    hire.progress = Math.round((completedCount / hire.tasks.length) * 100);
  }

  openInitiateModal() {
    this.showInitiateModal = true;
  }

  closeInitiateModal() {
    this.showInitiateModal = false;
  }

  submitInitiateOnboarding() {
    if (!this.newHireForm.name || !this.newHireForm.role) return;

    const newHireObj: NewHire = {
      id: 'nh-' + (this.newHires.length + 1),
      name: this.newHireForm.name,
      role: this.newHireForm.role,
      department: this.newHireForm.department,
      startDate: this.newHireForm.startDate || '2026-10-01',
      buddy: this.newHireForm.buddy,
      progress: 0,
      tasks: [
        { id: 'nt1', title: 'Identity & Email Account Setup', category: 'IT', completed: false },
        { id: 'nt2', title: 'HR Policy & Compliance Signing', category: 'HR', completed: false },
        { id: 'nt3', title: 'Hardware Asset Allocation', category: 'Asset', completed: false },
        { id: 'nt4', title: 'Manager 1-on-1 Introduction', category: 'Intro', completed: false }
      ]
    };

    this.newHires.unshift(newHireObj);
    this.showInitiateModal = false;
    this.newHireForm = { name: '', role: '', department: 'Engineering', startDate: '', buddy: 'Sarah Jenkins' };
  }

  getInitials(name: string): string {
    if (!name) return 'NH';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}

