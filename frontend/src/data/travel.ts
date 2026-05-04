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
export const luxuryGatewayImage = 'https://images.pexels.com/photos/4577176/pexels-photo-4577176.jpeg?auto=compress&cs=tinysrgb&w=1400';
export const corporateGatewayImage = 'https://images.pexels.com/photos/7643758/pexels-photo-7643758.jpeg?auto=compress&cs=tinysrgb&w=1400';

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
  corporatePortal: '/corporate-portal',
};

export const inquiryLabelKeys: Record<InquiryKind, string> = {
  classic: 'inquiry.labels.classic',
  luxury: 'inquiry.labels.luxury',
  corporate: 'inquiry.labels.corporate',
};

export function getPageFromPathname(pathname: string): Page {
  if (pathname.startsWith(pageRoutes.corporatePortal)) return 'corporatePortal';
  if (pathname === pageRoutes.crm) return 'crm';
  if (pathname === pageRoutes.luxury) return 'luxury';
  if (pathname === pageRoutes.corporate) return 'corporate';
  return 'home';
}
