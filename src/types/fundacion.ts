export interface Sublink {
  id: string;
  url: string;
  enabled: boolean;
  last_hash?: string;
  status: 'updated' | 'unchanged' | 'pending';
  last_checked?: string;
  fundacion_id?: string;
  created_at?: string;
}

export interface Fundacion {
  id: string;
  name: string;
  url: string;
  category: string;
  sublinks?: Sublink[];
  last_hash?: string;
  status: 'updated' | 'unchanged' | 'pending';
  last_checked?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChangeDetected {
  id: string;
  fundacion_id: string;
  sublink_id?: string;
  url: string;
  detected_at: string;
  reviewed: boolean;
  changes_description?: string;
}
