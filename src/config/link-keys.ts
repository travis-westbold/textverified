/* The canonical list of link names, developer-owned. Editors change link
   DESTINATIONS in src/content/links.json; adding or removing a name happens
   here so `LinkKey` stays a compile-time type and every consumer is checked. */
export const LINK_KEYS = [
  'home',
  'productsPage',

  'faq',
  'blog',
  'about',
  'contact',

  'signIn',
  'signInSupport',
  'resetPassword',
  'contactForm',
  'register',
  'account',

  'pricing',

  'products',
  'verifications',
  'sms',
  'extension',
  'extensionBlog',
  'rentals',
  'developerApi',
  'apiDocs',
  'freeNumbers',
  'creditsInfo',
  'buyCredits',

  'updates',
  'announcements',
  'terms',
  'privacy',
  'support',
  'linkedin',
] as const;

export type LinkKey = (typeof LINK_KEYS)[number];
