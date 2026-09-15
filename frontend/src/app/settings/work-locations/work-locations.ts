import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../shared/erp-page/erp-page';

interface LocationItem {
  id: string;
  name: string;
  type: 'Headquarters' | 'Regional Office' | 'Remote Hub';
  city: string;
  address: string;
  totalEmp: number;
  isActive: boolean;
}

@Component({
  selector: 'app-work-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './work-locations.html',
  styleUrl: './work-locations.css'
})
export class WorkLocations implements OnInit {
  private readonly storageKey = 'synaptech-work-locations';

  locations: LocationItem[] = [
    { id: 'loc-1', name: 'Synaptech Headquarters', type: 'Headquarters', city: 'Ahmedabad', address: 'SG Highway, Bodakdev, Ahmedabad, Gujarat', totalEmp: 45, isActive: true }
  ];

  newName = '';
  newType: 'Headquarters' | 'Regional Office' | 'Remote Hub' = 'Headquarters';
  newCity = 'Ahmedabad';
  newAddress = '';
  newTotalEmp = 45;

  searchQuery = '';
  selectedTypeFilter = 'All';
  savedMsg = '';
  showAddForm = false;

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasLegacy = Array.isArray(parsed) && parsed.some((l: any) => l.city !== 'Ahmedabad');
        if (Array.isArray(parsed) && parsed.length > 0 && !hasLegacy) {
          this.locations = parsed;
        } else {
          this.saveToStorage();
        }
      } catch (e) {
        console.error('Failed to load work locations', e);
        this.saveToStorage();
      }
    } else {
      this.saveToStorage();
    }
  }

  get totalLocationsCount(): number {
    return this.locations.length;
  }

  get officeCount(): number {
    return this.locations.filter(l => l.type !== 'Remote Hub').length;
  }

  get remoteCount(): number {
    return this.locations.filter(l => l.type === 'Remote Hub').length;
  }

  get filteredLocations(): LocationItem[] {
    return this.locations.filter(loc => {
      const matchesSearch = loc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            loc.city.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            loc.address.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesType = this.selectedTypeFilter === 'All' || loc.type === this.selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }

  addLocation(): void {
    if (!this.newName.trim() || !this.newCity.trim()) return;
    const newLoc: LocationItem = {
      id: 'loc-' + Date.now(),
      name: this.newName.trim(),
      type: this.newType,
      city: this.newCity.trim(),
      address: this.newAddress.trim() || 'Ahmedabad, Gujarat',
      totalEmp: this.newTotalEmp || 0,
      isActive: true
    };
    this.locations.unshift(newLoc);
    this.saveToStorage();
    this.newName = '';
    this.newCity = 'Ahmedabad';
    this.newAddress = '';
    this.showAddForm = false;
    this.savedMsg = 'Work location saved successfully!';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  toggleLocationStatus(loc: LocationItem): void {
    loc.isActive = !loc.isActive;
    this.saveToStorage();
  }

  deleteLocation(id: string): void {
    this.locations = this.locations.filter(l => l.id !== id);
    this.saveToStorage();
    this.savedMsg = 'Work location removed.';
    setTimeout(() => this.savedMsg = '', 2500);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.locations));
  }
}
