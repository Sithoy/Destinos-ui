export type Page = 'home' | 'luxury' | 'corporate';
export type PrestigePage = Extract<Page, 'luxury' | 'corporate'>;
export type InquiryKind = 'classic' | 'luxury' | 'corporate';