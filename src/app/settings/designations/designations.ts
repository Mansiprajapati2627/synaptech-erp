import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../shared/erp-page/erp-page';

interface DesignationItem {
  id: string;
  title: string;
  department: string;
  count: number;
}

@Component({
  selector: 'app-designations',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './designations.html',
  styleUrl: './designations.css'
})
export class Designations implements OnInit {
  private readonly storageKey = 'synaptech-designations';

  designations: DesignationItem[] = [
    { id: 'des-1', title: 'Senior Software Engineer', department: 'Engineering', count: 6 },
    { id: 'des-2', title: 'Lead Frontend Developer', department: 'Engineering', count: 4 },
    { id: 'des-3', title: 'HR Business Partner', department: 'Human Resources', count: 2 },
    { id: 'des-4', title: 'Product Manager', department: 'Product', count: 3 },
    { id: 'des-5', title: 'Financial Analyst', department: 'Finance', count: 2 },
    { id: 'des-6', title: 'QA Automation Engineer', department: 'Engineering', count: 3 },
    { id: 'des-7', title: 'UI/UX Product Designer', department: 'Product', count: 2 }
  ];

  newTitle = '';
  newDept = 'Engineering';
  newCount = 1;
  searchQuery = '';
  selectedDeptFilter = 'All';
  savedMsg = '';
  showAddForm = false;

  departments = ['Engineering', 'Human Resources', 'Product', 'Finance', 'Sales & Marketing', 'Operations'];

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.designations = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load designations', e);
      }
    }
  }

  get totalDesignationsCount(): number {
    return this.designations.length;
  }

  get uniqueDepartmentsCount(): number {
    return new Set(this.designations.map(d => d.department)).size;
  }

  get totalMembersCount(): number {
    return this.designations.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }

  get filteredDesignations(): DesignationItem[] {
    return this.designations.filter(des => {
      const matchesSearch = des.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            des.department.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesDept = this.selectedDeptFilter === 'All' || des.department === this.selectedDeptFilter;
      return matchesSearch && matchesDept;
    });
  }

  addDesignation(): void {
    if (!this.newTitle.trim()) return;
    const newDes: DesignationItem = {
      id: 'des-' + Date.now(),
      title: this.newTitle.trim(),
      department: this.newDept,
      count: this.newCount || 0
    };
    this.designations.unshift(newDes);
    this.saveToStorage();
    this.newTitle = '';
    this.newCount = 1;
    this.showAddForm = false;
    this.savedMsg = 'Designation added successfully!';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  deleteDesignation(id: string): void {
    this.designations = this.designations.filter(d => d.id !== id);
    this.saveToStorage();
    this.savedMsg = 'Designation removed.';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.designations));
  }
}
