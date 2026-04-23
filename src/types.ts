export type Page = 'home' | 'luxury' | 'corporate' | 'crm';
export type PrestigePage = Extract<Page, 'luxury' | 'corporate'>;
export type InquiryKind = 'classic' | 'luxury' | 'corporate';
export type LeadStatus = 'new' | 'contacted' | 'planning' | 'proposal' | 'won' | 'execution' | 'completed' | 'lost';
export type LeadEmailStatus = 'pending' | 'sent' | 'failed';
export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent';
export type CrmRole = 'admin' | 'manager' | 'agent' | 'client' | 'viewer' | 'none';

export type CrmUser = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  role: CrmRole;
  canAccessCrm: boolean;
  canManageClients: boolean;
  canManageUsers: boolean;
};

export type CrmSession = {
  token: string;
  user: CrmUser;
};

export type CrmManagedUser = CrmUser & {
  isActive: boolean;
  groups: string[];
  displayName: string;
  date_joined?: string;
  last_login?: string | null;
};

export type CrmClient = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  clientType: 'private' | 'corporate';
  companyName: string;
  email: string;
  phone: string;
  preferredContact: string;
  serviceLevel: InquiryKind;
  owner: string;
  notes: string;
  lastRequestAt: string;
  activeRequestCount: number;
};

export type CrmLead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  service: string;
  serviceKey: InquiryKind;
  name: string;
  contact: string;
  email: string;
  whatsapp: string;
  preferredContact: string;
  requestedServices: string;
  tripType: string;
  departureCity: string;
  destination: string;
  dates: string;
  travelers: string;
  budget: string;
  urgency: string;
  priority: LeadPriority;
  notes: string;
  status: LeadStatus;
  emailStatus: LeadEmailStatus;
  internalNotes: string;
  clientId?: string | null;
  clientName?: string;
};
