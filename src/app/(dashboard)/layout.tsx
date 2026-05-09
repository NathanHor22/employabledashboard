import { createClient } from '@/lib/supabase/server';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import type { Profile } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      profile = data;
    } else {
      // Profile row missing (user signed up before schema was run) — create it now
      const { data: created } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      profile = created;
    }
  }

  return (
    <DashboardLayoutClient profile={profile}>
      {children}
    </DashboardLayoutClient>
  );
}
