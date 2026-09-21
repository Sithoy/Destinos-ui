import type { InquiryKind } from '../types';
import { PrestigeExperience } from './PrestigeExperience';

export function CorporatePage({ openInquiry }: { openInquiry: (kind: InquiryKind) => void }) {
  return <PrestigeExperience kind="corporate" onEnquire={() => openInquiry('corporate')} />;
}
