// src/app/documents/documents.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

export interface Document {
  id: string;
  name: string;
  category: 'HR Policies' | 'Onboarding' | 'Contracts' | 'Payroll' | 'Other';
  description: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  fileType: string;
  url: string;
}

@Component({
  imports: [FormsModule],
  selector: 'app-documents',
  templateUrl: './documents.html',
  styleUrl: './documents.css'
})
export class Documents implements OnInit {
  private readonly storageKey = 'synaptech-documents';

  documents: Document[] = [];
  searchTerm = '';
  selectedCategory = 'All Categories';
  categories = ['All Categories', 'HR Policies', 'Onboarding', 'Contracts', 'Payroll', 'Other'];

  showUploadForm = false;
  newDocument: Partial<Document> = {};
  selectedFile: File | null = null;
  uploadError = '';
  successMessage = '';

  constructor(public auth: AuthService) {}

  get isHR(): boolean {
    return this.auth.hasRole(['Admin', 'HR']);
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.documents = JSON.parse(saved);
    } else {
      // Dummy data
      this.documents = [
        {
          id: 'doc1',
          name: 'Employee Handbook 2026',
          category: 'HR Policies',
          description: 'Complete guide to company policies and procedures.',
          uploadedBy: 'Aarav Shah',
          uploadDate: '2026-01-15',
          fileSize: '2.4 MB',
          fileType: 'PDF',
          url: ''
        },
        {
          id: 'doc2',
          name: 'Offer Letter Template',
          category: 'Onboarding',
          description: 'Standard offer letter template for new hires.',
          uploadedBy: 'Mansi Prajapati',
          uploadDate: '2026-02-20',
          fileSize: '156 KB',
          fileType: 'DOCX',
          url: ''
        },
        {
          id: 'doc3',
          name: 'NDA Agreement',
          category: 'Contracts',
          description: 'Non-disclosure agreement for all employees.',
          uploadedBy: 'Aarav Shah',
          uploadDate: '2026-03-01',
          fileSize: '89 KB',
          fileType: 'PDF',
          url: ''
        },
        {
          id: 'doc4',
          name: 'Onboarding Checklist',
          category: 'Onboarding',
          description: 'Step-by-step checklist for new employee onboarding.',
          uploadedBy: 'Mansi Prajapati',
          uploadDate: '2026-03-15',
          fileSize: '45 KB',
          fileType: 'XLSX',
          url: ''
        },
        {
          id: 'doc5',
          name: 'Payroll Policy',
          category: 'Payroll',
          description: 'Company policy on payroll processing and salary structure.',
          uploadedBy: 'Admin',
          uploadDate: '2026-04-01',
          fileSize: '210 KB',
          fileType: 'PDF',
          url: ''
        }
      ];
      this.saveDocuments();
    }
  }

  saveDocuments(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.documents));
  }

  get filteredDocuments(): Document[] {
    const search = this.searchTerm.toLowerCase();
    return this.documents.filter(doc =>
      (this.selectedCategory === 'All Categories' || doc.category === this.selectedCategory) &&
      (doc.name.toLowerCase().includes(search) || doc.description.toLowerCase().includes(search))
    );
  }

  get stats() {
    return {
      total: this.documents.length,
      policies: this.documents.filter(d => d.category === 'HR Policies').length,
      onboarding: this.documents.filter(d => d.category === 'Onboarding').length,
      contracts: this.documents.filter(d => d.category === 'Contracts').length
    };
  }

  getFileIcon(fileType: string): string {
    const iconMap: Record<string, string> = {
      'PDF': '📄',
      'DOCX': '📝',
      'DOC': '📝',
      'XLSX': '📊',
      'XLS': '📊',
      'TXT': '📄',
      'PNG': '🖼️',
      'JPG': '🖼️',
      'JPEG': '🖼️'
    };
    return iconMap[fileType] || '📎';
  }

  toggleUploadForm(): void {
    this.showUploadForm = !this.showUploadForm;
    this.uploadError = '';
    this.successMessage = '';
    if (!this.showUploadForm) {
      this.newDocument = {};
      this.selectedFile = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const size = this.selectedFile.size;
      if (size > 5 * 1024 * 1024) {
        this.uploadError = 'File size exceeds 5MB limit.';
        this.selectedFile = null;
        return;
      }
      this.uploadError = '';
    }
  }

  uploadDocument(): void {
    const name = this.newDocument.name?.trim() || '';
    const category = this.newDocument.category as Document['category'] | undefined;
    const description = this.newDocument.description?.trim() || '';

    if (!name) {
      this.uploadError = 'Please enter a document name.';
      return;
    }
    if (!category) {
      this.uploadError = 'Please select a category.';
      return;
    }

    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result as string || '';
        this.saveDocumentWithFile(name, category, description, fileData);
      };
      reader.readAsDataURL(this.selectedFile);
    } else {
      this.saveDocumentWithFile(name, category, description, '');
    }
  }

  private saveDocumentWithFile(name: string, category: Document['category'], description: string, fileData: string): void {
    const fileSize = this.selectedFile
      ? (this.selectedFile.size / 1024).toFixed(1) + ' KB'
      : '0 KB';
    const fileType = this.selectedFile
      ? this.selectedFile.name.split('.').pop()?.toUpperCase() || 'Unknown'
      : 'Unknown';

    const newDoc: Document = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      category,
      description,
      uploadedBy: this.auth.user?.name || 'Unknown',
      uploadDate: new Date().toISOString().slice(0, 10),
      fileSize,
      fileType,
      url: fileData
    };

    this.documents.unshift(newDoc);
    this.saveDocuments();
    this.successMessage = '✅ Document uploaded successfully!';
    this.newDocument = {};
    this.selectedFile = null;
    this.showUploadForm = false;
    setTimeout(() => this.successMessage = '', 3000);
  }

  deleteDocument(id: string): void {
    if (confirm('Are you sure you want to delete this document?')) {
      this.documents = this.documents.filter(d => d.id !== id);
      this.saveDocuments();
    }
  }

  downloadDocument(doc: Document): void {
    if (doc.url) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name + '.' + doc.fileType.toLowerCase();
      link.click();
    } else {
      const content = `Document: ${doc.name}\nCategory: ${doc.category}\nDescription: ${doc.description}\nUploaded by: ${doc.uploadedBy}\nDate: ${doc.uploadDate}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.name + '.txt';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }
}