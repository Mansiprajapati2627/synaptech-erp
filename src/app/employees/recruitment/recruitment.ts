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

  candidates: Candidate[] = [
    { id: 'c1', name: 'Vikram Malhotra', position: 'Senior Backend Developer', department: 'Engineering', experience: '5 yrs', stage: 'Interview', rating: 4.8, email: 'vikram.m@gmail.com', appliedDate: '2026-09-01' },
    { id: 'c2', name: 'Ananya Roy', position: 'UI/UX Designer', department: 'Design', experience: '3 yrs', stage: 'Screening', rating: 4.2, email: 'ananya.roy@outlook.com', appliedDate: '2026-09-04' },
    { id: 'c3', name: 'Karan Joshi', position: 'DevOps Engineer', department: 'Infrastructure', experience: '4 yrs', stage: 'Offered', rating: 4.9, email: 'karan.j@techmail.com', appliedDate: '2026-08-28' },
    { id: 'c4', name: 'Sneha Verma', position: 'Frontend Developer', department: 'Engineering', experience: '2 yrs', stage: 'Applied', rating: 4.0, email: 'sneha.v@yahoo.com', appliedDate: '2026-09-10' },
    { id: 'c5', name: 'Rohan Gupta', position: 'Product Manager', department: 'Product', experience: '6 yrs', stage: 'Applied', rating: 4.6, email: 'rohan.g@product.io', appliedDate: '2026-09-12' },
    { id: 'c6', name: 'Meera Kapoor', position: 'QA Automation Engineer', department: 'Quality', experience: '3 yrs', stage: 'Screening', rating: 4.4, email: 'meera.k@qa.org', appliedDate: '2026-09-08' }
  ];

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

