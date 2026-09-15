// src/app/shared/roles.ts

export const DEPARTMENT_ROLES_MAP: Record<string, string[]> = {
  'HR': [
    'HR Manager',
    'HR Executive',
    'HR Coordinator',
    'Recruiter',
    'HR Intern'
  ],
  'Developer': [
    'Tech Lead',
    'Software Developer',
    'Backend Developer',
    'Frontend Developer',
    'Full Stack Developer',
    '.NET Developer',
    'Python Developer',
    'Developer Intern'
  ],
  'Developers': [
    'Tech Lead',
    'Software Developer',
    'Backend Developer',
    'Frontend Developer',
    'Full Stack Developer',
    '.NET Developer',
    'Python Developer',
    'Developer Intern'
  ],
  'Interns': [
    'Software Development Intern',
    'HR Intern',
    'Marketing Intern',
    'Sales Intern',
    'Finance Intern',
    'Operations Intern'
  ],
  'Marketing': [
    'Marketing Manager',
    'Marketing Executive',
    'Digital Marketing Executive',
    'Social Media Manager',
    'Content Writer',
    'Graphic Designer'
  ],
  'Sales': [
    'Sales Manager',
    'Sales Executive',
    'Business Development Manager',
    'Business Development Executive',
    'Sales Intern'
  ],
  'Operations': [
    'Operations Manager',
    'Operations Executive',
    'Operations Coordinator',
    'Project Coordinator',
    'Customer Support Executive',
    'Operations Intern'
  ],
  'Finance': [
    'Finance Manager',
    'Accountant',
    'Finance Executive',
    'Payroll Executive',
    'Financial Analyst',
    'Finance Intern'
  ]
};

export const ALL_ROLES: string[] = Array.from(
  new Set(Object.values(DEPARTMENT_ROLES_MAP).flat())
);

export function getRolesForDepartment(departmentName?: string | null, currentRole?: string | null): string[] {
  if (!departmentName || !departmentName.trim()) {
    const list = [...ALL_ROLES];
    if (currentRole && !list.includes(currentRole)) {
      list.unshift(currentRole);
    }
    return list;
  }

  const normalized = departmentName.trim().toLowerCase();
  const matchedKey = Object.keys(DEPARTMENT_ROLES_MAP).find(
    k => k.toLowerCase() === normalized || k.toLowerCase().replace(/s$/, '') === normalized.replace(/s$/, '')
  );

  let roles = matchedKey ? [...DEPARTMENT_ROLES_MAP[matchedKey]] : [...ALL_ROLES];

  if (currentRole && !roles.includes(currentRole)) {
    roles = [currentRole, ...roles];
  }

  return roles;
}
