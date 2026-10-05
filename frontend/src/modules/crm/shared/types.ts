import type { InquiryKind, LeadPriority } from '../../../types';
import type { AttentionLevel } from './leadMeta';

export type CrmSurfaceStyles = {
  panel: string;
  panelSoft: string;
  row: string;
  rowActive: string;
  muted: string;
  soft: string;
  input: string;
  select: string;
  tableHead: string;
  buttonGhost: string;
  buttonActive: string;
  type: Record<InquiryKind, string>;
  priority: Record<LeadPriority, string>;
  attention: Record<AttentionLevel, string>;
};
