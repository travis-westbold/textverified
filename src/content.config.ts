import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { LINK_KEYS } from './config/link-keys';

/* destinations live in links.json; YAML references them by name */
const linkKey = z.enum(LINK_KEYS);

/* Content the org edits (via Keystatic or any YAML editor) lives under
   src/content/. These schemas are the safety net: a bad edit fails the
   BUILD — Vercel keeps serving the last good deploy — it never breaks the
   live site. Copy is sourced verbatim from textverified.com; editors own
   its accuracy from here on. */

/* FAQ answers and extras bodies render via set:html, so they are an
   injection surface once non-developers edit them. Allow plain text plus
   bare <a href="…"> links — nothing else. */
const SAFE_HTML = /^(?:[^<>]|<a href="[^"<>]+">|<\/a>)*$/;
const safeHtml = z.string().min(1).refine(
  (value) => SAFE_HTML.test(value),
  'Only plain text and <a href="…"> links are allowed here',
);

const reviews = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/reviews' }),
  schema: z.object({
    order: z.number().int().positive(),
    rating: z.number().min(1).max(5).multipleOf(0.5),
    quote: z.string().min(1),
    role: z.string().min(1),
    location: z.string().min(1),
  }),
});

const pricing = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/pricing' }),
  schema: z.object({
    order: z.number().int().positive(),
    name: z.string().min(1),
    price: z.string().min(1), // display string — "$0.25", not a number
    cadence: z.string().min(1),
    featured: z.boolean().default(false),
    description: z.string().min(1),
    features: z.array(z.string().min(1)).min(1),
  }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/faqs' }),
  schema: z.object({
    order: z.number().int().positive(),
    question: z.string().min(1),
    answer: safeHtml,
  }),
});

const navigation = defineCollection({
  loader: glob({ pattern: 'navigation.yaml', base: './src/content/settings' }),
  schema: z.object({
    productsMenu: z.array(z.object({
      name: z.string().min(1),
      detail: z.string().min(1),
      icon: z.enum(['grid', 'message', 'phone', 'mobile', 'api']),
      link: linkKey,
      lead: z.boolean().default(false),
    })).min(1),
    mainNav: z.array(z.object({ label: z.string().min(1), link: linkKey })).min(1),
  }),
});

const footer = defineCollection({
  loader: glob({ pattern: 'footer.yaml', base: './src/content/settings' }),
  schema: z.object({
    groups: z.array(z.object({
      title: z.string().min(1),
      items: z.array(z.object({ label: z.string().min(1), link: linkKey })).min(1),
    })).min(1),
    aboutBlurb: z.string().min(1),
    copyright: z.string().min(1),
    legal: z.array(z.object({ label: z.string().min(1), link: linkKey })).min(1),
  }),
});

/* short reusable shapes for the page singletons */
const meta = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  canonical: z.string().url(),
  keywords: z.string().optional(),
});
/* `post` lets the emphasised word sit mid-phrase, e.g. SMS *and* Voice */
const mark = z.object({ pre: z.string().optional(), em: z.string().min(1), post: z.string().optional() });
const ctaBand = z.object({ heading: z.string().min(1), body: z.string().min(1), buttonLabel: z.string().min(1) });

const home = defineCollection({
  loader: glob({ pattern: 'home.yaml', base: './src/content/pages' }),
  schema: z.object({
    meta,
    hero: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      strongPre: z.string().min(1),
      mark,
      lede: z.string().min(1),
      primaryCta: z.string().min(1),
      signInCta: z.string().min(1),
      learnCta: z.string().min(1),
      trustLabel: z.string().min(1),
      platforms: z.array(z.string().min(1)).min(1),
    }),
    showcase: z.object({
      kicker: z.string().min(1),
      headingPre: z.string().min(1),
      markEm: z.string().min(1),
      lede: z.string().min(1),
      features: z.array(z.object({
        icon: z.enum(['message', 'phone', 'mobile', 'card']),
        title: z.string().min(1),
        description: z.string().min(1),
      })).length(4),
    }),
    offer: z.object({
      headingPre: z.string().min(1),
      markEm: z.string().min(1),
      lede: z.string().min(1),
      cards: z.array(z.object({
        tag: z.string().min(1),
        title: z.string().min(1),
        body: z.string().min(1),
        link: linkKey,
      })).length(3), // the three demo panels are layout — the card count is fixed
    }),
    reviewsHead: z.object({ headingPre: z.string().min(1), markEm: z.string().min(1), lede: z.string().min(1) }),
    pricingHead: z.object({ headingPre: z.string().min(1), markEm: z.string().min(1), lede: z.string().min(1) }),
    faqHead: z.object({ heading: z.string().min(1), lede: z.string().min(1), moreLabel: z.string().min(1) }),
    signupCta: ctaBand,
  }),
});

const products = defineCollection({
  loader: glob({ pattern: 'products.yaml', base: './src/content/pages' }),
  schema: z.object({
    meta,
    hero: z.object({
      kicker: z.string().min(1),
      title: z.string().min(1),
      mark,
      lede: z.string().min(1),
      primaryCta: z.string().min(1),
      secondaryCta: z.string().min(1),
    }),
    jumpLinks: z.array(z.object({ label: z.string().min(1), anchor: z.string().min(1) })).min(1),
    /* which device frame and mock screen a section gets is layout, keyed by
       id in products.astro — so ids are a fixed enum, not free text */
    sections: z.array(z.object({
      id: z.enum(['sms', 'extension', 'voice', 'rentals', 'api', 'credits']),
      kicker: z.string().min(1),
      tone: z.enum(['dark', 'deep', 'light']),
      flip: z.boolean().default(false),
      ink: z.boolean().default(false),
      headingPre: z.string().min(1),
      markEm: z.string().min(1),
      lede: z.string().min(1),
      steps: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).min(1),
      primaryLabel: z.string().optional(),
      primaryLink: linkKey.optional(),
      secondaryLabel: z.string().optional(),
      secondaryLink: linkKey.optional(),
    })).length(6),
    verificationExtras: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      cards: z.array(z.object({
        icon: z.enum(['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat']),
        title: z.string().min(1),
        body: safeHtml,
      })).min(1),
    }),
    generalExtras: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      cards: z.array(z.object({
        icon: z.enum(['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat']),
        title: z.string().min(1),
        body: safeHtml,
      })).min(1),
    }),
    signupCta: ctaBand,
  }),
});

const verifications = defineCollection({
  loader: glob({ pattern: 'verifications.yaml', base: './src/content/pages' }),
  schema: z.object({
    meta,
    hero: z.object({
      kicker: z.string().min(1),
      title: z.string().min(1),
      mark,
      lede: z.string().min(1),
      primaryCta: z.string().min(1),
      secondaryCta: z.string().min(1),
    }),
    sections: z.array(z.object({
      id: z.enum(['sms', 'voice']),
      kicker: z.string().min(1),
      tone: z.enum(['dark', 'deep', 'light']),
      flip: z.boolean().default(false),
      ink: z.boolean().default(false),
      headingPre: z.string().min(1),
      markEm: z.string().min(1),
      lede: z.string().min(1),
      steps: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).min(1),
      primaryLabel: z.string().optional(),
      primaryLink: linkKey.optional(),
    })).length(2),
    extras: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      cards: z.array(z.object({
        icon: z.enum(['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat']),
        title: z.string().min(1),
        body: safeHtml,
      })).min(1),
    }),
    /* icon names are keys of brandIconPaths; UseCases.astro fails the build
       on an unknown one, which keeps this list free-text for editors */
    useCases: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      lede: z.string().min(1),
      cards: z.array(z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        icons: z.array(z.string().min(1)).min(1),
      })).length(3),
    }),
    planCompare: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      lede: z.string().min(1),
      plans: z.array(z.object({
        name: z.string().min(1),
        price: z.string().min(1),
        unit: z.string().min(1),
        description: z.string().min(1),
        features: z.array(z.string().min(1)).min(1),
        ctaLabel: z.string().min(1),
        ctaLink: linkKey,
        featured: z.boolean().default(false),
      })).length(2),
    }),
    signupCta: ctaBand,
  }),
});

const automate = defineCollection({
  loader: glob({ pattern: 'automate.yaml', base: './src/content/pages' }),
  schema: z.object({
    meta,
    hero: z.object({
      kicker: z.string().min(1),
      title: z.string().min(1),
      mark,
      lede: z.string().min(1),
      primaryCta: z.string().min(1),
      secondaryCta: z.string().min(1),
    }),
    sections: z.array(z.object({
      id: z.enum(['start', 'bulk']),
      kicker: z.string().min(1),
      tone: z.enum(['dark', 'deep', 'light']),
      flip: z.boolean().default(false),
      ink: z.boolean().default(false),
      headingPre: z.string().min(1),
      markEm: z.string().min(1),
      lede: z.string().min(1),
      steps: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).min(1),
      primaryLabel: z.string().optional(),
      primaryLink: linkKey.optional(),
      secondaryLabel: z.string().optional(),
      secondaryLink: linkKey.optional(),
    })).length(2),
    extras: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      cards: z.array(z.object({
        icon: z.enum(['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat', 'code', 'key']),
        title: z.string().min(1),
        body: safeHtml,
      })).min(1),
    }),
    signupCta: ctaBand,
  }),
});

const rentals = defineCollection({
  loader: glob({ pattern: 'rentals.yaml', base: './src/content/pages' }),
  schema: z.object({
    meta,
    hero: z.object({
      kicker: z.string().min(1),
      title: z.string().min(1),
      mark,
      lede: z.string().min(1),
      primaryCta: z.string().min(1),
      secondaryCta: z.string().min(1),
    }),
    sections: z.array(z.object({
      id: z.enum(['setup', 'manage']),
      kicker: z.string().min(1),
      tone: z.enum(['dark', 'deep', 'light']),
      flip: z.boolean().default(false),
      ink: z.boolean().default(false),
      headingPre: z.string().min(1),
      markEm: z.string().min(1),
      lede: z.string().min(1),
      steps: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).min(1),
      primaryLabel: z.string().optional(),
      primaryLink: linkKey.optional(),
      secondaryLabel: z.string().optional(),
      secondaryLink: linkKey.optional(),
    })).length(2),
    useCases: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      lede: z.string().min(1),
      cards: z.array(z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        icons: z.array(z.string().min(1)).min(1),
      })).length(3),
    }),
    extras: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      cards: z.array(z.object({
        icon: z.enum(['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat', 'code', 'key', 'clock']),
        title: z.string().min(1),
        body: safeHtml,
      })).min(1),
    }),
    planCompare: z.object({
      kicker: z.string().min(1),
      heading: z.string().min(1),
      lede: z.string().min(1),
      plans: z.array(z.object({
        name: z.string().min(1),
        price: z.string().min(1),
        unit: z.string().min(1),
        description: z.string().min(1),
        features: z.array(z.string().min(1)).min(1),
        ctaLabel: z.string().min(1),
        ctaLink: linkKey,
        featured: z.boolean().default(false),
      })).length(2),
    }),
    signupCta: ctaBand,
  }),
});

export const collections = { reviews, pricing, faqs, navigation, footer, home, products, verifications, automate, rentals };
