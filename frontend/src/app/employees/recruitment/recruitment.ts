import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpPage } from '../../shared/erp-page/erp-page';

export interface Candidate {
  id: string;
  name: string;
  position: string;
  department: string;
  experience: string;
  stage: 'Applied' | 'Screening' | 'Interview' | 'Offered';
  rating: number;
  email: string;
  appliedDate: string;
}

@Component({
  selector: 'app-recruitment',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './recruitment.html',
  styleUrl: './recruitment.css'
})
export class Recruitment {
  searchTerm: string = '';
  selectedFilterPos: string = 'ALL';

  showJobModal: boolean = false;
  showCandidateModal: boolean = false;
  selectedCandidate: Candidate | null = null;

  newJob = {
    title: '',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote'
  };

  newCandidate = {
    name: '',
    position: 'Backend Developer',
    department: 'Engineering',
    experience: '3 yrs',
    email: '',
    rating: 4.5
  };

  stages: ('Applied' | 'Screening' | 'Interview' | 'Offered')[] = ['Applied', 'Screening', 'Interview', 'Offered'];

  candidates: Candidate[] = [];

  get filteredCandidates(): Candidate[] {
    return this.candidates.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            c.position.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            c.department.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesPos = this.selectedFilterPos === 'ALL' || c.position === this.selectedFilterPos;
      return matchesSearch && matchesPos;
    });
  }

  getCandidatesByStage(stage: string): Candidate[] {
    return this.filteredCandidates.filter(c => c.stage === stage);
  }

  moveStage(candidate: Candidate, targetStage: 'Applied' | 'Screening' | 'Interview' | 'Offered') {
    candidate.stage = targetStage;
  }

  openCandidateDetails(c: Candidate) {
    this.selectedCandidate = c;
    this.showCandidateModal = true;
  }

  closeCandidateModal() {
    this.showCandidateModal = false;
    this.selectedCandidate = null;
  }

  openJobModal() {
    this.showJobModal = true;
  }

  closeJobModal() {
    this.showJobModal = false;
  }

  submitNewJob() {
    if (!this.newJob.title) return;
    alert(`Successfully posted new job opening for "${this.newJob.title}"!`);
    this.newJob = { title: '', department: 'Engineering', type: 'Full-time', location: 'Remote' };
    this.showJobModal = false;
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}

