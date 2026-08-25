import { collection, config, fields, singleton } from '@keystatic/core';
import { LINK_KEYS } from './src/config/link-keys';

/* The editing UI for everyone in the org: forms over the YAML/JSON in
   src/content/. Every save is a git commit, which auto-deploys — and the zod
   schemas in src/content.config.ts re-validate at build time, so a bad edit
   can fail a deploy but never break the live site.

   This config mirrors those schemas; if they drift, the build fails loudly.
   Editors need a GitHub account with access to the repo. In dev the admin
   runs at /keystatic against the local files; in production it uses the
   GitHub App configured via KEYSTATIC_* env vars on Vercel. */

const linkOptions = LINK_KEYS.map((key) => ({ label: key, value: key }));
const linkField = (label: string) =>
  fields.select({ label, options: linkOptions, defaultValue: 'home' });

/* This file is bundled for the browser too (the admin is a client app), so
   only the statically-replaced process.env.NODE_ENV is safe here. Dev edits
   the local files; a production build uses the GitHub App (and the admin is
   only mounted in production when its env vars exist — see astro.config). */
const useGitHub = process.env.NODE_ENV === 'production';

export default config({
  storage: useGitHub
    ? {
        kind: 'github',
        repo: { owner: 'travis-westbold', name: 'textverified-redesign' },
        /* the Astro app lives in a subdirectory of the repo */
        pathPrefix: 'astro-prototype',
      }
    : { kind: 'local' },
  ui: {
    brand: { name: 'Textverified' },
    navigation: {
      Pages: ['home', 'products', 'faqPageCopy', 'contactPage', 'contactFormPage', 'aboutPage'],
      Content: ['reviews', 'pricing', 'faqs', 'faqPage'],
      Site: ['navigation', 'footer', 'links'],
    },
  },
  collections: {
    reviews: collection({
      label: 'Reviews',
      path: 'src/content/reviews/*',
      format: { data: 'yaml' },
      slugField: 'role',
      schema: {
        role: fields.slug({ name: { label: 'Reviewer role' } }),
        order: fields.integer({ label: 'Order', validation: { min: 1 } }),
        rating: fields.number({ label: 'Rating (1–5, halves allowed)', validation: { min: 1, max: 5 } }),
        quote: fields.text({ label: 'Quote', multiline: true }),
        location: fields.text({ label: 'Location' }),
      },
    }),
    pricing: collection({
      label: 'Pricing plans',
      path: 'src/content/pricing/*',
      format: { data: 'yaml' },
      slugField: 'name',
      schema: {
        name: fields.slug({ name: { label: 'Plan name' } }),
        order: fields.integer({ label: 'Order', validation: { min: 1 } }),
        price: fields.text({ label: 'Price (display string, e.g. $0.25)' }),
        cadence: fields.text({ label: 'Cadence (e.g. / verification)' }),
        featured: fields.checkbox({ label: 'Featured plan', defaultValue: false }),
        description: fields.text({ label: 'Description', multiline: true }),
        features: fields.array(fields.text({ label: 'Feature' }), {
          label: 'Feature list',
          itemLabel: (props) => props.value ?? 'feature',
        }),
      },
    }),
    faqs: collection({
      label: 'Homepage FAQ',
      path: 'src/content/faqs/*',
      format: { data: 'yaml' },
      slugField: 'question',
      schema: {
        question: fields.slug({ name: { label: 'Question' } }),
        order: fields.integer({ label: 'Order', validation: { min: 1 } }),
        answer: fields.text({
          label: 'Answer (plain text; <a href="…">links</a> allowed)',
          multiline: true,
        }),
      },
    }),
    faqPage: collection({
      label: 'FAQ page questions',
      path: 'src/content/faq-page/*',
      format: { data: 'yaml' },
      slugField: 'question',
      schema: {
        question: fields.slug({ name: { label: 'Question' } }),
        order: fields.integer({ label: 'Order', validation: { min: 1 } }),
        category: fields.select({
          label: 'Topic',
          options: ['General', 'Verifications', 'Rentals', 'Credits'].map((value) => ({ label: value, value })),
          defaultValue: 'General',
        }),
        anchor: fields.text({ label: 'Permanent URL anchor' }),
        answer: fields.text({
          label: 'Answer (HTML: paragraphs, lists, bold, emphasis, and links)',
          multiline: true,
        }),
      },
    }),
  },
  singletons: {
    navigation: singleton({
      label: 'Header navigation',
      path: 'src/content/settings/navigation',
      format: { data: 'yaml' },
      schema: {
        productsMenu: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            detail: fields.text({ label: 'Detail line' }),
            icon: fields.select({
              label: 'Icon',
              options: ['grid', 'message', 'phone', 'mobile', 'api'].map((value) => ({ label: value, value })),
              defaultValue: 'message',
            }),
            link: linkField('Destination'),
            lead: fields.checkbox({ label: 'Full-width lead entry', defaultValue: false }),
          }),
          { label: 'Products menu', itemLabel: (props) => props.fields.name.value },
        ),
        mainNav: fields.array(
          fields.object({ label: fields.text({ label: 'Label' }), link: linkField('Destination') }),
          { label: 'Main navigation', itemLabel: (props) => props.fields.label.value },
        ),
      },
    }),
    footer: singleton({
      label: 'Footer',
      path: 'src/content/settings/footer',
      format: { data: 'yaml' },
      schema: {
        groups: fields.array(
          fields.object({
            title: fields.text({ label: 'Group title' }),
            items: fields.array(
              fields.object({ label: fields.text({ label: 'Label' }), link: linkField('Destination') }),
              { label: 'Items', itemLabel: (props) => props.fields.label.value },
            ),
          }),
          { label: 'Link groups', itemLabel: (props) => props.fields.title.value },
        ),
        aboutBlurb: fields.text({ label: 'About blurb', multiline: true }),
        copyright: fields.text({ label: 'Copyright line' }),
        legal: fields.array(
          fields.object({ label: fields.text({ label: 'Label' }), link: linkField('Destination') }),
          { label: 'Legal links', itemLabel: (props) => props.fields.label.value },
        ),
      },
    }),
    links: singleton({
      label: 'Link destinations',
      path: 'src/content/links',
      format: { data: 'json' },
      schema: Object.fromEntries(
        LINK_KEYS.map((key) => [key, fields.url({ label: key, validation: { isRequired: true } })]),
      ),
    }),
    home: singleton({
      label: 'Homepage',
      path: 'src/content/pages/home',
      format: { data: 'yaml' },
      schema: {
        meta: fields.object({
          title: fields.text({ label: 'Meta title' }),
          description: fields.text({ label: 'Meta description', multiline: true }),
          canonical: fields.url({ label: 'Canonical URL' }),
          keywords: fields.text({ label: 'Meta keywords', multiline: true }),
        }, { label: 'Page meta' }),
        hero: fields.object({
          eyebrow: fields.text({ label: 'Eyebrow' }),
          title: fields.text({ label: 'Headline' }),
          strongPre: fields.text({ label: 'Second line (before underline)' }),
          mark: fields.object({
            pre: fields.text({ label: 'Underlined phrase — plain part' }),
            em: fields.text({ label: 'Underlined phrase — accent part' }),
          }, { label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
          primaryCta: fields.text({ label: 'Primary button' }),
          signInCta: fields.text({ label: 'Sign-in button' }),
          learnCta: fields.text({ label: 'Learn-more link' }),
          trustLabel: fields.text({ label: 'Trust strip label' }),
          platforms: fields.array(fields.text({ label: 'Platform' }), {
            label: 'Marquee platforms',
            itemLabel: (props) => props.value ?? 'platform',
          }),
        }, { label: 'Hero' }),
        showcase: fields.object({
          kicker: fields.text({ label: 'Kicker' }),
          headingPre: fields.text({ label: 'Heading (before underline)' }),
          markEm: fields.text({ label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
          features: fields.array(
            fields.object({
              icon: fields.select({
                label: 'Icon',
                options: ['message', 'phone', 'mobile', 'card'].map((value) => ({ label: value, value })),
                defaultValue: 'message',
              }),
              title: fields.text({ label: 'Title' }),
              description: fields.text({ label: 'Description', multiline: true }),
            }),
            { label: 'Feature cards (exactly 4)', itemLabel: (props) => props.fields.title.value },
          ),
        }, { label: 'Dashboard showcase' }),
        offer: fields.object({
          headingPre: fields.text({ label: 'Heading (before underline)' }),
          markEm: fields.text({ label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
          cards: fields.array(
            fields.object({
              tag: fields.text({ label: 'Tag' }),
              title: fields.text({ label: 'Title' }),
              body: fields.text({ label: 'Body', multiline: true }),
              link: linkField('Learn-more destination'),
            }),
            { label: 'Offer cards (exactly 3 — each pairs with a demo panel)', itemLabel: (props) => props.fields.title.value },
          ),
        }, { label: 'What we offer' }),
        reviewsHead: fields.object({
          headingPre: fields.text({ label: 'Heading (before underline)' }),
          markEm: fields.text({ label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
        }, { label: 'Reviews section head' }),
        pricingHead: fields.object({
          headingPre: fields.text({ label: 'Heading (before underline)' }),
          markEm: fields.text({ label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
        }, { label: 'Pricing section head' }),
        faqHead: fields.object({
          heading: fields.text({ label: 'Heading' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
          moreLabel: fields.text({ label: 'See-more button label' }),
        }, { label: 'FAQ section head' }),
        signupCta: fields.object({
          heading: fields.text({ label: 'Heading' }),
          body: fields.text({ label: 'Body', multiline: true }),
          buttonLabel: fields.text({ label: 'Button label' }),
        }, { label: 'Signup band' }),
      },
    }),
    products: singleton({
      label: 'Products page',
      path: 'src/content/pages/products',
      format: { data: 'yaml' },
      schema: {
        meta: fields.object({
          title: fields.text({ label: 'Meta title' }),
          description: fields.text({ label: 'Meta description', multiline: true }),
          canonical: fields.url({ label: 'Canonical URL' }),
        }, { label: 'Page meta' }),
        hero: fields.object({
          kicker: fields.text({ label: 'Kicker' }),
          title: fields.text({ label: 'Headline (first line)' }),
          mark: fields.object({
            pre: fields.text({ label: 'Underlined phrase — plain part' }),
            em: fields.text({ label: 'Underlined phrase — accent part' }),
          }, { label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
          primaryCta: fields.text({ label: 'Primary button' }),
          secondaryCta: fields.text({ label: 'Secondary button' }),
        }, { label: 'Hero' }),
        jumpLinks: fields.array(
          fields.object({
            label: fields.text({ label: 'Label' }),
            anchor: fields.text({ label: 'Anchor (section id)' }),
          }),
          { label: 'Jump pills', itemLabel: (props) => props.fields.label.value },
        ),
        sections: fields.array(
          fields.object({
            id: fields.select({
              label: 'Section (fixed — picks the device mock)',
              options: ['sms', 'extension', 'voice', 'rentals', 'api', 'credits'].map((value) => ({ label: value, value })),
              defaultValue: 'sms',
            }),
            kicker: fields.text({ label: 'Kicker' }),
            tone: fields.select({
              label: 'Background tone',
              options: ['dark', 'deep', 'light'].map((value) => ({ label: value, value })),
              defaultValue: 'dark',
            }),
            flip: fields.checkbox({ label: 'Device on the left', defaultValue: false }),
            ink: fields.checkbox({ label: 'Ink (light-background) underline', defaultValue: false }),
            headingPre: fields.text({ label: 'Heading (before underline)' }),
            markEm: fields.text({ label: 'Underlined phrase' }),
            lede: fields.text({ label: 'Lede', multiline: true }),
            steps: fields.array(
              fields.object({
                title: fields.text({ label: 'Step title' }),
                text: fields.text({ label: 'Step text', multiline: true }),
              }),
              { label: 'Steps', itemLabel: (props) => props.fields.title.value },
            ),
            primaryLabel: fields.text({ label: 'Primary button label (optional)' }),
            primaryLink: linkField('Primary destination'),
            secondaryLabel: fields.text({ label: 'Secondary button label (optional)' }),
            secondaryLink: linkField('Secondary destination'),
          }),
          { label: 'Product sections (exactly 6, one per mock)', itemLabel: (props) => props.fields.headingPre.value },
        ),
        verificationExtras: fields.object({
          kicker: fields.text({ label: 'Kicker' }),
          heading: fields.text({ label: 'Heading' }),
          cards: fields.array(
            fields.object({
              icon: fields.select({
                label: 'Icon',
                options: ['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat'].map((value) => ({ label: value, value })),
                defaultValue: 'refresh',
              }),
              title: fields.text({ label: 'Title' }),
              body: fields.text({ label: 'Body (plain text; <a href="…">links</a> allowed)', multiline: true }),
            }),
            { label: 'Cards', itemLabel: (props) => props.fields.title.value },
          ),
        }, { label: 'Verification extras' }),
        generalExtras: fields.object({
          kicker: fields.text({ label: 'Kicker' }),
          heading: fields.text({ label: 'Heading' }),
          cards: fields.array(
            fields.object({
              icon: fields.select({
                label: 'Icon',
                options: ['refresh', 'globe', 'refund', 'list', 'bulk', 'bolt', 'chat'].map((value) => ({ label: value, value })),
                defaultValue: 'bulk',
              }),
              title: fields.text({ label: 'Title' }),
              body: fields.text({ label: 'Body (plain text; <a href="…">links</a> allowed)', multiline: true }),
            }),
            { label: 'Cards', itemLabel: (props) => props.fields.title.value },
          ),
        }, { label: 'General extras' }),
        signupCta: fields.object({
          heading: fields.text({ label: 'Heading' }),
          body: fields.text({ label: 'Body', multiline: true }),
          buttonLabel: fields.text({ label: 'Button label' }),
        }, { label: 'Signup band' }),
      },
    }),
    faqPageCopy: singleton({
      label: 'FAQ page',
      path: 'src/content/pages/faq',
      format: { data: 'yaml' },
      schema: {
        meta: fields.object({
          title: fields.text({ label: 'Meta title' }),
          description: fields.text({ label: 'Meta description', multiline: true }),
          canonical: fields.url({ label: 'Canonical URL' }),
        }, { label: 'Page meta' }),
        hero: fields.object({
          kicker: fields.text({ label: 'Kicker' }),
          title: fields.text({ label: 'Headline (before underline)' }),
          mark: fields.object({
            pre: fields.text({ label: 'Underlined phrase — plain part' }),
            em: fields.text({ label: 'Underlined phrase — accent part' }),
            post: fields.text({ label: 'Text after underlined phrase' }),
          }, { label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
          primaryCta: fields.text({ label: 'Primary button' }),
          secondaryCta: fields.text({ label: 'Secondary button' }),
        }, { label: 'Hero' }),
        searchPlaceholder: fields.text({ label: 'Search placeholder' }),
        closing: fields.object({
          heading: fields.text({ label: 'Heading' }),
          body: fields.text({ label: 'Body', multiline: true }),
          buttonLabel: fields.text({ label: 'Button label' }),
        }, { label: 'Closing band' }),
      },
    }),
    contactPage: singleton({
      label: 'Contact page',
      path: 'src/content/pages/contact',
      format: { data: 'yaml' },
      schema: {
        meta: fields.object({
          title: fields.text({ label: 'Meta title' }),
          description: fields.text({ label: 'Meta description', multiline: true }),
          canonical: fields.url({ label: 'Canonical URL' }),
        }, { label: 'Page meta' }),
        hero: fields.object({
          kicker: fields.text({ label: 'Kicker' }),
          title: fields.text({ label: 'Headline (before underline)' }),
          markEm: fields.text({ label: 'Underlined phrase' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
        }, { label: 'Hero' }),
        /* Three, and only three: the layout puts them in one row with their
           buttons on a shared line, which a fourth would break. */
        choices: fields.array(
          fields.object({
            icon: fields.select({
              label: 'Icon',
              options: [
                { label: 'Account', value: 'account' },
                { label: 'Key', value: 'key' },
                { label: 'Mail', value: 'mail' },
              ],
              defaultValue: 'account',
            }),
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
            buttonLabel: fields.text({ label: 'Button label' }),
            link: fields.text({ label: 'Link name (from links.json)' }),
          }, { label: 'Choice' }),
          { label: 'Choices', itemLabel: (item) => item.fields.buttonLabel.value },
        ),
        closing: fields.object({
          heading: fields.text({ label: 'Heading' }),
          body: fields.text({ label: 'Body', multiline: true }),
          buttonLabel: fields.text({ label: 'Button label' }),
        }, { label: 'Closing band' }),
      },
    }),
    contactFormPage: singleton({
      label: 'Contact form page',
      /* Field labels and the Send button are not here: they are UI
         implementation copy, and they post under names the backend expects. */
      path: 'src/content/pages/contact-form',
      format: { data: 'yaml' },
      schema: {
        meta: fields.object({
          title: fields.text({ label: 'Meta title' }),
          description: fields.text({ label: 'Meta description', multiline: true }),
          canonical: fields.url({ label: 'Canonical URL' }),
        }, { label: 'Page meta' }),
        header: fields.object({
          title: fields.text({ label: 'Headline' }),
          lede: fields.text({ label: 'Lede', multiline: true }),
        }, { label: 'Header' }),
      },
    }),
    aboutPage: singleton({
      label: 'About page',
      path: 'src/content/pages/about',
      format: { data: 'yaml' },
      schema: {
        meta: fields.object({
          title: fields.text({ label: 'Meta title' }),
          description: fields.text({ label: 'Meta description', multiline: true }),
          canonical: fields.url({ label: 'Canonical URL' }),
        }, { label: 'Page meta' }),
        hero: fields.object({
          title: fields.text({ label: 'Headline' }),
        }, { label: 'Hero' }),
        mission: fields.object({
          heading: fields.text({ label: 'Heading' }),
          /* "Pull out" is the one editorial control here: it sets which line
             the layout lifts to heading weight with the brand underline. */
          paragraphs: fields.array(
            fields.object({
              text: fields.text({ label: 'Paragraph', multiline: true }),
              emphasis: fields.checkbox({ label: 'Pull this line out', defaultValue: false }),
            }, { label: 'Paragraph' }),
            { label: 'Paragraphs', itemLabel: (item) => item.fields.text.value.slice(0, 60) },
          ),
        }, { label: 'Mission' }),
        /* Split around its link so the destination stays in links.json. */
        getInTouch: fields.object({
          heading: fields.text({ label: 'Heading' }),
          before: fields.text({ label: 'Sentence before the link', multiline: true }),
          linkLabel: fields.text({ label: 'Link text' }),
          link: fields.text({ label: 'Link name (from links.json)' }),
          after: fields.text({ label: 'Sentence after the link' }),
        }, { label: 'Get in touch' }),
      },
    }),
  },
});
