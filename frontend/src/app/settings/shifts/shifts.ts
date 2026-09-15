import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../shared/erp-page/erp-page';

interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  flexMinutes: number;
  isNightShift: boolean;
}

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './shifts.html',
  styleUrl: './shifts.css'
})
export class Shifts implements OnInit {
  private readonly storageKey = 'synaptech-work-shifts';

  shifts: ShiftItem[] = [
    { id: 'sh-1', name: 'General Day Shift', startTime: '09:00 AM', endTime: '06:00 PM', flexMinutes: 15, isNightShift: false },
    { id: 'sh-2', name: 'APAC Early Morning', startTime: '06:00 AM', endTime: '03:00 PM', flexMinutes: 15, isNightShift: false },
    { id: 'sh-3', name: 'Evening Shift', startTime: '02:00 PM', endTime: '11:00 PM', flexMinutes: 15, isNightShift: false },
    { id: 'sh-4', name: 'US Night Shift', startTime: '10:00 PM', endTime: '07:00 AM', flexMinutes: 30, isNightShift: true }
  ];

  newName = '';
  newStartTime = '09:00 AM';
  newEndTime = '06:00 PM';
  newFlexMinutes = 15;
  newIsNightShift = false;

  searchQuery = '';
  savedMsg = '';
  showAddForm = false;

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.shifts = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load shifts', e);
      }
    }
  }

  get totalShiftsCount(): number {
    return this.shifts.length;
  }

  get dayShiftsCount(): number {
    return this.shifts.filter(s => !s.isNightShift).length;
  }

  get nightShiftsCount(): number {
    return this.shifts.filter(s => s.isNightShift).length;
  }

  get filteredShifts(): ShiftItem[] {
    return this.shifts.filter(shift =>
      shift.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      shift.startTime.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      shift.endTime.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  addShift(): void {
    if (!this.newName.trim()) return;
    const newShift: ShiftItem = {
      id: 'sh-' + Date.now(),
      name: this.newName.trim(),
      startTime: this.newStartTime,
      endTime: this.newEndTime,
      flexMinutes: this.newFlexMinutes || 15,
      isNightShift: this.newIsNightShift
    };
    this.shifts.unshift(newShift);
    this.saveToStorage();
    this.newName = '';
    this.showAddForm = false;
    this.savedMsg = 'Work shift configuration saved!';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  deleteShift(id: string): void {
    this.shifts = this.shifts.filter(s => s.id !== id);
    this.saveToStorage();
    this.savedMsg = 'Shift configuration removed.';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.shifts));
  }
}
