'use client';

import { useState } from 'react';
import { Search, Brain, HeartPulse, ClipboardList, Users, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Category = 'mental_health' | 'physical_health' | 'late_diagnosis' | 'social_groups';

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  domain: string;
  category: Category;
}

const RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Malaysian Mental Health Association',
    description: 'Promoting mental health awareness, providing advocacy and support services across Malaysia.',
    url: 'https://mmha.org.my/',
    domain: 'mmha.org.my',
    category: 'mental_health',
  },
  {
    id: '2',
    title: 'Mental Illness Awareness & Support Association',
    description: 'A platform supporting individuals and families affected by mental illness in Malaysia.',
    url: 'https://miasa.org.my/',
    domain: 'miasa.org.my',
    category: 'mental_health',
  },
  {
    id: '3',
    title: 'Befrienders Kuala Lumpur',
    description: 'Free, confidential emotional support and crisis intervention available 24 hours a day.',
    url: 'https://www.befrienders.org.my/',
    domain: 'befrienders.org.my',
    category: 'mental_health',
  },
  {
    id: '4',
    title: 'AIA Mental Care Helpline',
    description: "Access AIA's dedicated mental health helpline and wellbeing resources.",
    url: 'https://www.aia.com.my/en/knowledge-hub/protect-well/mental-care-helpline.html',
    domain: 'aia.com.my',
    category: 'mental_health',
  },
  {
    id: '5',
    title: 'Affordable Mental Health Therapy in Malaysia',
    description: 'A curated guide to low-cost and subsidised therapy options for Malaysians.',
    url: 'https://www.homage.com.my/resources/affordable-mental-health-therapy-malaysia/',
    domain: 'homage.com.my',
    category: 'mental_health',
  },
  {
    id: '6',
    title: 'Government Assistance for Persons with Disabilities',
    description: 'Apply for official government financial aid and support programs for Malaysians with disabilities.',
    url: 'https://www.malaysia.gov.my/en/digital-services/application-for-assistance-for-persons-with-disabilities',
    domain: 'malaysia.gov.my',
    category: 'late_diagnosis',
  },
];

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All Resources' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'physical_health', label: 'Physical Health' },
  { value: 'late_diagnosis', label: 'Late Diagnosis' },
  { value: 'social_groups', label: 'Social Groups' },
];

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  mental_health: Brain,
  physical_health: HeartPulse,
  late_diagnosis: ClipboardList,
  social_groups: Users,
};

const CATEGORY_LABEL: Record<Category, string> = {
  mental_health: 'Mental Health',
  physical_health: 'Physical Health',
  late_diagnosis: 'Late Diagnosis',
  social_groups: 'Social Groups',
};

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = RESOURCES.filter((r) => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.domain.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support Resources</h1>
        <p className="text-slate-500 mt-1">Find support services tailored to your needs</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeCategory === cat.value
                ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100">
            <HeartPulse className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">No resources found</p>
          <p className="text-sm text-slate-400">Try a different category or search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const CategoryIcon = CATEGORY_ICON[resource.category];

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
    >
      {/* Category badge */}
      <div className="flex items-center gap-1.5 mb-4">
        <CategoryIcon className="w-3.5 h-3.5 text-sky-500" />
        <span className="text-xs font-medium text-sky-600">{CATEGORY_LABEL[resource.category]}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-2 flex-1">
        {resource.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-500 leading-relaxed mb-5">
        {resource.description}
      </p>

      {/* Link */}
      <div className="flex items-center gap-1 text-sm font-medium text-sky-600 group-hover:text-sky-700 mt-auto">
        <span>{resource.domain}</span>
        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  );
}
