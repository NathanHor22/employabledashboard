export type UserRole = 'user' | 'admin';

export type AssessmentType = 'ef' | 'me_manual';
export type AssessmentStatus = 'draft' | 'submitted';

export type ResourceCategory =
  | 'mental_health'
  | 'physical_health'
  | 'late_diagnosis'
  | 'social_groups';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  is_current: boolean;
  uploaded_at: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  type: AssessmentType;
  data: Record<string, unknown>;
  status: AssessmentStatus;
  ef_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupportResource {
  id: string;
  category: ResourceCategory;
  title: string;
  description: string | null;
  provider_name: string | null;
  provider_logo_url: string | null;
  external_url: string | null;
  booking_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  profileCompletion: number;
  hasResume: boolean;
  assessmentStatus: 'none' | 'draft' | 'submitted';
  resourceCount: number;
}
