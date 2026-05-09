import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Users } from 'lucide-react';
import type { SupportResource } from '@/types';

export default async function SocialGroupsPage() {
  const supabase = await createClient();
  const { data: groups } = await supabase
    .from('support_resources')
    .select('*')
    .eq('category', 'social_groups')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const socialGroups: SupportResource[] = groups ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Social Groups</h1>
        <p className="text-slate-500 mt-1">Connect with peers and find your community</p>
      </div>

      {socialGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-100">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700">No social groups yet</h2>
          <p className="text-sm text-slate-400 text-center max-w-sm">
            Social groups and peer networking resources will appear here when added by an admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {socialGroups.map((group) => (
            <Card key={group.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{group.provider_name}</p>
                    <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">{group.description}</p>
                )}
                <div className="flex gap-2">
                  {group.external_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(group.external_url!, '_blank', 'noopener,noreferrer')}
                      className="flex-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Learn More
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
