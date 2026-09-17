// src/app/shared/roles.ts

export const SYSTEM_ROLES: string[] = ['Staff', 'HR', 'Manager'];

export const DEPARTMENT_DESIGNATIONS_MAP: Record<string, string[]> = {
  'Developer': [
    'Software Development Intern', 'Junior Software Developer', 'Software Developer',
    'Senior Software Developer', 'Full Stack Developer', 'Backend Developer',
    'Frontend Developer', 'Mobile App Developer', 'QA Engineer',
    'Automation Test Engineer', 'DevOps Engineer', 'Cloud Engineer',
    'Data Analyst', 'Data Scientist', 'AI/ML Engineer', 'UI/UX Designer',
    'Technical Lead', 'Tech Lead', 'Engineering Manager', 'Project Manager', 'Product Manager'
  ],
  'Development': [
    'Software Development Intern', 'Junior Software Developer', 'Software Developer',
    'Senior Software Developer', 'Full Stack Developer', 'Backend Developer',
    'Frontend Developer', 'Mobile App Developer', 'QA Engineer',
    'Automation Test Engineer', 'DevOps Engineer', 'Cloud Engineer',
    'Data Analyst', 'Data Scientist', 'AI/ML Engineer', 'UI/UX Designer',
    'Technical Lead', 'Tech Lead', 'Engineering Manager', 'Project Manager', 'Product Manager'
  ],
  'IT': [
    'Software Development Intern', 'Junior Software Developer', 'Software Developer',
    'Senior Software Developer', 'Full Stack Developer', 'Backend Developer',
    'Frontend Developer', 'Mobile App Developer', 'QA Engineer',
    'Automation Test Engineer', 'DevOps Engineer', 'Cloud Engineer',
    'Data Analyst', 'Data Scientist', 'AI/ML Engineer', 'UI/UX Designer',
    'Technical Lead', 'Tech Lead', 'Engineering Manager', 'Project Manager', 'Product Manager'
  ],
  'HR': [
    'HR Intern', 'HR Executive', 'HR Associate', 'HR Specialist',
    'Senior HR Executive', 'HR Manager', 'HR Business Partner',
    'Talent Acquisition Executive', 'Recruiter', 'Recruitment Manager'
  ],
  'Finance': [
    'Accounts Intern', 'Accounts Executive', 'Accountant', 'Senior Accountant',
    'Finance Executive', 'Finance Analyst', 'Financial Controller',
    'Finance Manager', 'Chief Financial Officer (CFO)'
  ],
  'Accounts': [
    'Accounts Intern', 'Accounts Executive', 'Accountant', 'Senior Accountant',
    'Finance Executive', 'Finance Analyst', 'Financial Controller',
    'Finance Manager', 'Chief Financial Officer (CFO)'
  ],
  'Sales': [
    'Sales Intern', 'Sales Executive', 'Sales Associate',
    'Business Development Executive', 'Business Development Associate',
    'Business Development Manager', 'Sales Manager', 'Account Manager', 'Sales Director'
  ],
  'Business Development': [
    'Sales Intern', 'Sales Executive', 'Sales Associate',
    'Business Development Executive', 'Business Development Associate',
    'Business Development Manager', 'Sales Manager', 'Account Manager', 'Sales Director'
  ],
  'Marketing': [
    'Marketing Intern', 'Marketing Executive', 'Digital Marketing Executive',
    'Social Media Executive', 'Content Writer', 'Content Strategist',
    'SEO Specialist', 'Marketing Manager', 'Brand Manager'
  ],
  'Operations': [
    'Operations Intern', 'Operations Executive', 'Operations Associate',
    'Operations Manager', 'Customer Support Executive', 'Customer Success Executive',
    'Customer Success Manager', 'Administrative Executive', 'Office Administrator'
  ],
  'Support': [
    'Operations Intern', 'Operations Executive', 'Operations Associate',
    'Operations Manager', 'Customer Support Executive', 'Customer Success Executive',
    'Customer Success Manager', 'Administrative Executive', 'Office Administrator'
  ],
  'Management': [
    'Team Lead', 'Department Head', 'General Manager', 'Operations Manager',
    'Director', 'Vice President', 'Chief Operating Officer (COO)', 'Chief Executive Officer (CEO)'
  ],
  'Leadership': [
    'Team Lead', 'Department Head', 'General Manager', 'Operations Manager',
    'Director', 'Vice President', 'Chief Operating Officer (COO)', 'Chief Executive Officer (CEO)'
  ],
  'Interns': [
    'Software Development Intern', 'HR Intern', 'Accounts Intern',
    'Sales Intern', 'Marketing Intern', 'Operations Intern', 'Intern'
  ]
};

export const ALL_ROLES: string[] = ['Staff', 'HR', 'Manager'];

export function getRolesForDepartment(departmentName?: string | null, currentRole?: string | null): string[] {
  const roles = [...SYSTEM_ROLES];
  if (currentRole && !roles.includes(currentRole) && currentRole !== 'Admin' && currentRole !== 'Employee') {
    roles.push(currentRole);
  }
  return roles;
}
