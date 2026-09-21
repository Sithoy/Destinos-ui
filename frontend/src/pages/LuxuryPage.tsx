import type { InquiryKind } from '../types';
import { PrestigeExperience } from './PrestigeExperience';

export function LuxuryPage({ openInquiry }: { openInquiry: (kind: InquiryKind) => void }) {
  return <PrestigeExperience kind="luxury" onEnquire={() => openInquiry('luxury')} />;
}
