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
const parisImage = 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const maldivesImage = 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const monacoImage = 'https://images.pexels.com/photos/1619569/pexels-photo-1619569.jpeg?auto=compress&cs=tinysrgb&w=1200';
const riverImage = 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const hotelImage = 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const champagneImage = 'https://images.pexels.com/photos/60217/pexels-photo-60217.jpeg?auto=compress&cs=tinysrgb&w=1200';
export const retreatImage = 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1400';
export const luxuryHeroImage = 'https://www.uniqhotels.com/media/hotels/16/2._zannier_hotels_sonop_-_exterior.jpg';
export const conciergeImage = 'https://images.unsplash.com/photo-1651084296297-2c66780dc322?auto=format&fit=crop&fm=jpg&q=70&w=1600';

export const classicDestinations = [
  {
    nameKey: 'home.destinations.paris.name',
    tagKey: 'home.destinations.paris.tag',
    image: parisImage,
  },
  {
    nameKey: 'home.destinations.maldives.name',
    tagKey: 'home.destinations.maldives.tag',
    image: maldivesImage,
  },
  {
    nameKey: 'home.destinations.monaco.name',
    tagKey: 'home.destinations.monaco.tag',
    image: monacoImage,
  },
  {
    nameKey: 'home.destinations.parisExperiences.name',
    tagKey: 'home.destinations.parisExperiences.tag',
    image: riverImage,
  },
] as const;

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
};

export const pageRoutes: Record<Page, string> = {
  home: '/',
  luxury: '/prestige/luxury',
  corporate: '/prestige/corporate',
  crm: '/crm',
};

export const inquiryLabelKeys: Record<InquiryKind, string> = {
  classic: 'inquiry.labels.classic',
  luxury: 'inquiry.labels.luxury',
  corporate: 'inquiry.labels.corporate',
};

export function getPageFromPathname(pathname: string): Page {
  if (pathname === pageRoutes.crm) return 'crm';
  if (pathname === pageRoutes.luxury) return 'luxury';
  if (pathname === pageRoutes.corporate) return 'corporate';
  return 'home';
}
