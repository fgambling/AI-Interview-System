import React, { useMemo, useState } from 'react';

interface RoleFormProps {
  onSubmit: (role: string) => void;
  isLoading?: boolean;
}

const CATEGORIES = {
  'Frontend': [
    'Frontend Developer (React)',
    'Frontend Developer (Vue.js)',
    'Frontend Developer (Angular)',
    'Web Developer (Full-stack JS)'
  ],
  'Backend': [
    'Backend Developer (.NET Core)',
    'Backend Developer (Node.js)',
    'Backend Developer (Java Spring Boot)',
    'Backend Developer (Go)'
  ],
  'Mobile': [
    'iOS Developer (Swift)',
    'Android Developer (Kotlin/Java)',
    'Cross-platform Mobile (Flutter/React Native)'
  ],
  'Data / AI': [
    'Data Engineer (ETL/Big Data)',
    'Data Analyst (SQL/Python)',
    'Machine Learning Engineer',
    'MLOps Engineer'
  ],
  'Cloud / DevOps': [
    'DevOps Engineer (CI/CD, Docker, Kubernetes)',
    'Cloud Engineer (AWS/Azure/GCP)',
    'Site Reliability Engineer (SRE)'
  ],
  'Security / QA': [
    'Cybersecurity Engineer',
    'QA/Test Automation Engineer'
  ]
} as const;

const LEVELS = ['Junior', 'Mid', 'Senior'] as const;

const RoleForm: React.FC<RoleFormProps> = ({ onSubmit, isLoading = false }) => {
  const [category, setCategory] = useState<keyof typeof CATEGORIES | ''>('');
  const [level, setLevel] = useState<typeof LEVELS[number] | ''>('');
  const [subRole, setSubRole] = useState<string>('');
  const [otherNotes, setOtherNotes] = useState('');

  const subRoleOptions = useMemo(() => {
    if (!category) return [] as string[];
    return [...CATEGORIES[category]];
  }, [category]);

  const canSubmit = useMemo(() => {
    if (!category) return false;
    // level and subRole can be empty, but at least one of subRole or otherNotes is required
    if (!subRole && otherNotes.trim().length < 3) return false;
    return true;
  }, [category, subRole, otherNotes]);

  const buildRoleString = () => {
    const parts: string[] = [];
    if (level) parts.push(level);
    if (subRole) parts.push(subRole);
    const extra = otherNotes.trim();
    // Additional information appended in parentheses if exists
    if (extra) {
      parts.push(`(${extra})`);
    }
    return parts.join(' ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(buildRoleString());
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select Job Role
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as any); setSubRole(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="" disabled>Select category</option>
              {Object.keys(CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Level (optional)</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || !category}
            >
              <option value="">None</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sub-role (optional)</label>
            <select
              value={subRole}
              onChange={(e) => setSubRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || !category}
            >
              <option value="">None</option>
              {subRoleOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Other details (tech stack, domain, tools)</label>
          <input
            type="text"
            value={otherNotes}
            onChange={(e) => setOtherNotes(e.target.value)}
            placeholder="e.g., Python + FastAPI, React + Next.js, AWS + Terraform"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              !canSubmit || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? 'Generating...' : 'Generate Questions'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleForm;

