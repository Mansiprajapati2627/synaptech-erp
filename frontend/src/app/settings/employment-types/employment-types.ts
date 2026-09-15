import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../shared/erp-page/erp-page';

interface EmploymentTypeItem {
  id: string;
  code: string;
  name: string;
  hoursPerWeek: string;
  desc: string;
  isPermanent: boolean;
}

@Component({
  selector: 'app-employment-types',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './employment-types.html',
  styleUrl: './employment-types.css'
})
export class EmploymentTypes implements OnInit {
  private readonly storageKey = 'synaptech-employment-types';

  types: EmploymentTypeItem[] = [
    { id: 'emp-1', code: 'FT', name: 'Full-Time Permanent', hoursPerWeek: '40 hrs/wk', desc: 'Standard 40 hours per week with full health benefits and paid leave', isPermanent: true },
    { id: 'emp-2', code: 'PT', name: 'Part-Time Regular', hoursPerWeek: '20 hrs/wk', desc: 'Flexible hourly employment under 30 hours per week', isPermanent: false },
    { id: 'emp-3', code: 'CT', name: 'Contractor / Vendor', hoursPerWeek: 'Variable', desc: 'Fixed-term project engagement via 1099 / B2B contract', isPermanent: false },
    { id: 'emp-4', code: 'IN', name: 'Internship Program', hoursPerWeek: '35 hrs/wk', desc: 'Trainee position for 3 to 6 months with mentorship stipends', isPermanent: false },
    { id: 'emp-5', code: 'FT-R', name: 'Full-Time Remote', hoursPerWeek: '40 hrs/wk', desc: 'Distributed full-time position with home-office allowances', isPermanent: true }
  ];

  newCode = '';
  newName = '';
  newHours = '40 hrs/wk';
  newDesc = '';
  newIsPermanent = true;
  searchQuery = '';
  savedMsg = '';
  showAddForm = false;

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.types = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load employment types', e);
      }
    }
  }

  get totalTypesCount(): number {
    return this.types.length;
  }

  get permanentCount(): number {
    return this.types.filter(t => t.isPermanent).length;
  }

  get flexibleCount(): number {
    return this.types.filter(t => !t.isPermanent).length;
  }

  get filteredTypes(): EmploymentTypeItem[] {
    return this.types.filter(t =>
      t.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  addType(): void {
    if (!this.newCode.trim() || !this.newName.trim()) return;
    const item: EmploymentTypeItem = {
      id: 'emp-' + Date.now(),
      code: this.newCode.trim().toUpperCase(),
      name: this.newName.trim(),
      hoursPerWeek: this.newHours || '40 hrs/wk',
      desc: this.newDesc.trim() || 'Standard employment contract structure',
      isPermanent: this.newIsPermanent
    };
    this.types.unshift(item);
    this.saveToStorage();
    this.newCode = '';
    this.newName = '';
    this.newDesc = '';
    this.showAddForm = false;
    this.savedMsg = 'Employment type category created successfully!';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  deleteType(id: string): void {
    this.types = this.types.filter(t => t.id !== id);
    this.saveToStorage();
    this.savedMsg = 'Employment type removed.';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.types));
  }
}
