export interface Sublink {
  id: string;
  url: string;
  enabled: boolean;
  lastHash?: string;
  status: 'updated' | 'unchanged' | 'pending';
  lastChecked?: number;
}

export interface Fundacion {
  id: string;
  name: string;
  url: string;
  category: string;
  sublinks?: Sublink[];
  lastHash?: string;
  status: 'updated' | 'unchanged' | 'pending';
  lastChecked?: number;
  createdAt: number;
}

export interface ChangeDetected {
  id: string;
  fundacionId: string;
  sublinkId?: string;
  url: string;
  detectedAt: number;
  reviewed: boolean;
  changes?: string;
}
