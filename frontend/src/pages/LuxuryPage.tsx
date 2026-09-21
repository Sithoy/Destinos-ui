import type { InquiryKind } from '../types';
import { PrestigeExperience } from './PrestigeExperience';

export function LuxuryPage({ openInquiry }: { openInquiry: (kind: InquiryKind, destination?: string) => void }) {
  return <PrestigeExperience kind="luxury" onEnquire={(interest) => openInquiry('luxury', interest)} />;
}
