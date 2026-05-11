'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, ExternalLink, CalendarDays, HeartPulse, Globe, Brain, ClipboardList, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SupportResource, ResourceCategory } from '@/types';

const CATEGORIES: { value: ResourceCategory | 'all'; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'All Resources', icon: Globe },
  { value: 'mental_health', label: 'Mental Health', icon: Brain },
  { value: 'physical_health', label: 'Physical Health', icon: HeartPulse },
  { value: 'late_diagnosis', label: 'Late Diagnosis', icon: ClipboardList },
  { value: 'social_groups', label: 'Social Groups', icon: Users },
];

export default function ResourcesPage() {
  const supabase = createClient();
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('support_resources')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setResources(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = resources.filter((r) => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.provider_name?.toLowerCase().includes(search.toLowerCase());
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
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                activeCategory === cat.value
                  ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
              }`}
            >
              <CatIcon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
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

function ResourceCard({ resource }: { resource: SupportResource }) {
  const categoryIcon: Record<ResourceCategory, LucideIcon> = {
    mental_health: Brain,
    physical_health: HeartPulse,
    late_diagnosis: ClipboardList,
    social_groups: Users,
  };
  const CategoryIcon = categoryIcon[resource.category];

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col flex-1 pt-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 shrink-0">
            <CategoryIcon className="w-5 h-5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-medium">
              {resource.provider_name ?? 'Provider'}
            </p>
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">{resource.title}</h3>
          </div>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-4 line-clamp-3">
            {resource.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {resource.external_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(resource.external_url!, '_blank', 'noopener,noreferrer')}
              className="flex-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Learn More
            </Button>
          )}
          {resource.booking_url && (
            <Button
              size="sm"
              onClick={() => window.open(resource.booking_url!, '_blank', 'noopener,noreferrer')}
              className="flex-1"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Book
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
