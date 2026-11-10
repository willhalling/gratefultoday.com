export type SocialPlatform =
  | 'spotify'
  | 'appleMusic'
  | 'youtube'
  | 'x'
  | 'instagram'
  | 'tiktok'
  | 'soundcloud'
  | 'bandcamp'
  | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  // Optional URL or profile handle; when omitted, icon shows without text
  url?: string;
}

export interface SocialLinksData {
  links: SocialLink[];
  heading: string;
}
