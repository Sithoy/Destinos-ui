import {
  Briefcase,
  Building2,
  CalendarDays,
  Compass,
  Crown,
  MapPin,
  Palmtree,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import type { InquiryKind, Page } from '../types';
export const classicLogo = '/logos/dpm-classic.svg';
export const luxuryLogo = '/logos/dpm-prestige-luxury.svg';
export const corporateLogo = '/logos/dpm-prestige-corporate.svg';

export const heroImage = 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1800';
export const maldivesImage = 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const hotelImage = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const champagneImage = 'https://images.pexels.com/photos/60217/pexels-photo-60217.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const retreatImage = 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1400';
export const luxuryHeroImage = 'https://www.uniqhotels.com/media/hotels/16/2._zannier_hotels_sonop_-_exterior.jpg';

export const serviceIcons = [
  ['home.offer.services.flights', CalendarDays],
  ['home.offer.services.accommodation', Building2],
  ['home.offer.services.transport', MapPin],
  ['home.offer.services.experiences', Compass],
] as const;

export const whyChooseUs = [
  ['home.why.items.planning', ShieldCheck],
  ['home.why.items.support', Star],
  ['home.why.items.destinations', Palmtree],
  ['home.why.items.flexible', Crown],
] as const;

export const luxuryExperiences = [
  ['luxury.experiences.items.resorts', Sparkles],
  ['luxury.experiences.items.transfers', MapPin],
  ['luxury.experiences.items.honeymoon', Crown],
  ['luxury.experiences.items.safari', Palmtree],
] as const;

export const luxuryExperienceCards = [
  {
    itemKey: 'luxury.experiences.items.resorts',
    Icon: Sparkles,
    image: 'https://images.pexels.com/photos/30037392/pexels-photo-30037392.jpeg?auto=compress&cs=tinysrgb&w=1200',
    position: 'object-center',
  },
  {
    itemKey: 'luxury.experiences.items.transfers',
    Icon: MapPin,
    image: 'https://images.pexels.com/photos/36498953/pexels-photo-36498953.jpeg?auto=compress&cs=tinysrgb&w=1200',
    position: 'object-center',
  },
  {
    itemKey: 'luxury.experiences.items.honeymoon',
    Icon: Crown,
    image: 'https://images.pexels.com/photos/32556099/pexels-photo-32556099.jpeg?auto=compress&cs=tinysrgb&w=1200',
    position: 'object-center',
  },
  {
    itemKey: 'luxury.experiences.items.safari',
    Icon: Palmtree,
    image: 'https://images.pexels.com/photos/26921854/pexels-photo-26921854.jpeg?auto=compress&cs=tinysrgb&w=1200',
    position: 'object-center',
  },
] as const;

export const corporateServices = [
  ['corporate.services.items.executive', Briefcase],
  ['corporate.services.items.conference', CalendarDays],
  ['corporate.services.items.teams', Building2],
  ['corporate.services.items.reporting', ShieldCheck],
] as const;

export const pageMeta: Record<Page, { logo: string; bg: string }> = {
  home: { logo: classicLogo, bg: 'bg-white text-slate-900' },
  luxury: { logo: luxuryLogo, bg: 'bg-[rgb(36,31,27)] text-white' },
  corporate: { logo: corporateLogo, bg: 'bg-[rgb(5,17,36)] text-white' },
  crm: { logo: classicLogo, bg: 'bg-[#07111d] text-white' },
  corporatePortal: { logo: classicLogo, bg: 'bg-[#07111f] text-white' },
};

export const pageRoutes: Record<Page, string> = {
  home: '/',
  luxury: '/prestige/luxury',
  corporate: '/prestige/corporate',
  crm: '/crm',
  corporatePortal: '/ctm',
};

export const ctmPrimaryRoute = '/ctm';
export const ctmLegacyRoute = '/corporate-portal';

export const inquiryLabelKeys: Record<InquiryKind, string> = {
  classic: 'inquiry.labels.classic',
  luxury: 'inquiry.labels.luxury',
  corporate: 'inquiry.labels.corporate',
};

export function getPageFromPathname(pathname: string): Page | null {
  const normalizedPathname = pathname.toLowerCase();
  if (
    normalizedPathname === ctmPrimaryRoute ||
    normalizedPathname.startsWith(`${ctmPrimaryRoute}/`) ||
    normalizedPathname === ctmLegacyRoute ||
    normalizedPathname.startsWith(`${ctmLegacyRoute}/`)
  ) return 'corporatePortal';
  if (pathname === pageRoutes.crm) return 'crm';
  if (pathname === pageRoutes.luxury) return 'luxury';
  if (pathname === pageRoutes.corporate) return 'corporate';
  if (pathname === pageRoutes.home) return 'home';
  return null;
}
