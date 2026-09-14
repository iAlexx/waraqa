# WARAQA — Master Product, UX, Design, and Engineering Roadmap

**Document language:** English  
**Product interface language:** Arabic (`ar-SY`)  
**Product name:** Waraqa / ورقة  
**Document version:** 1.1  
**Status:** MVP implementation specification  
**Primary audience:** Cursor Agent, developers, product reviewers, designers, and potential incubators  
**Core rule:** This file is the single source of truth before implementation starts.

---

## 0. Product Decision

Waraqa is an independent Syrian guidance platform that helps people understand administrative procedures and prepare the correct documents before visiting a service center.

Waraqa is **not**:

- a government portal;
- a ministry website;
- an official source of law;
- a document-processing office;
- a payment gateway for government fees;
- a service that completes official procedures on behalf of users.

Waraqa should help a person answer:

- Which procedure applies to my exact situation?
- What documents do I personally need?
- What are the steps, and in which order?
- Where should I go?
- What are the latest verified fees and expected timelines?
- Which mistakes could cause rejection or an unnecessary return visit?
- Which official source supports every important claim?
- When was the information last checked?

The product value is not a collection of static articles. The product value is a **personalized, source-backed, interactive journey** that reduces wasted trips, incorrect paperwork, misinformation, and dependence on hearsay.

### Proposed Arabic tagline

> ورقة بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة، وبحسب حالتك.

### Mandatory independence disclaimer

This disclaimer must be visible in the site header or immediately below the hero, in the footer, and inside each transaction page:

> **ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً.** المعلومات منشورة للمساعدة، وقد تتغير التعليمات أو تختلف بين جهة وأخرى. تأكد دائماً من الجهة الرسمية قبل التقديم.

Compact badge:

> منصة مستقلة — مو موقع حكومي

The disclaimer may never be hidden behind a modal or placed only inside the Terms page.

---

# 1. MVP Objectives

## 1.1 Primary objective

Launch a reliable, mobile-first MVP that can be demonstrated to TechTown, an incubator, a private partner, or a potential public-sector partner.

The MVP must contain:

- five complete and reviewed procedures;
- a polished Arabic RTL public experience;
- an interactive question flow;
- personalized requirements and steps;
- sources and verification dates;
- a professional Payload CMS administration panel;
- a documented review and publishing workflow;
- automated tests and a clean production build;
- deployment on a free preview URL without a custom domain.

## 1.2 Measurable success criteria

The MVP is ready only when all of the following are true:

1. A user can reach a relevant procedure from the home page within three meaningful actions.
2. A user can complete the interactive guide without creating an account.
3. The result changes correctly according to the user's answers.
4. Every critical requirement, fee, location, and instruction can reference a source.
5. Every published procedure shows a last-verified date.
6. An administrator can add, edit, review, and publish content without editing source code.
7. A researcher cannot publish content directly.
8. RTL works correctly on mobile and desktop.
9. The site remains usable on a slow connection and an entry-level Android device.
10. `lint`, `typecheck`, unit tests, integration tests, end-to-end tests, and production build pass before a phase is marked complete.
11. No government logo, seal, eagle, ministry mark, or misleading official visual element is used.
12. The application is deployable to a free Vercel URL.

## 1.3 Explicit MVP exclusions

Do not implement the following in the first MVP:

- government fee payments;
- uploading identity cards, passports, family records, or sensitive personal documents;
- national ID numbers;
- citizen accounts;
- completing procedures on behalf of a user;
- open-ended AI chat;
- automatic legal advice;
- native Android or iOS apps;
- every procedure in Syria;
- employee or institution ratings;
- scraping and publishing unverified content automatically;
- official branding or ministry logos;
- a public comment section;
- a marketplace for paid intermediaries;
- multi-tenant office management;
- complex microservices;
- Redis, Kafka, Elasticsearch, or Kubernetes unless a later measured need appears.

---

# 2. Target Users

## 2.1 Ordinary citizen

A person using a phone, potentially with a slow connection, who may not know the official procedure name.

Needs:

- search using everyday Syrian wording;
- aliases such as “لا حكم عليه” for “سجل عدلي”;
- short explanations;
- a clear next action;
- readable requirements;
- confidence about freshness and sources;
- the ability to print or share the result.

## 2.2 Expatriate, traveler, or family member abroad

Needs to understand differences between:

- inside Syria vs. outside Syria;
- personal attendance vs. legal authorization;
- embassy, consulate, ministry, and local-center steps;
- adult vs. minor procedures;
- ordinary vs. urgent processing.

## 2.3 Content researcher

Collects official information, records sources, drafts changes, and flags uncertainty. Cannot publish.

## 2.4 Reviewer

Checks the evidence, wording, logic, and completeness. Can approve or reject drafts but should not manage system-level settings.

## 2.5 Administrator

Manages users, permissions, settings, publishing, content restoration, audit logs, and deployments.

## 2.6 Future commercial user: service office

Not part of the first MVP. A future paid edition may provide:

- customer cases;
- missing-document tracking;
- WhatsApp sharing;
- payment notes;
- internal assignments;
- a white-label portal.

---

# 3. Independent Syrian Visual Identity

## 3.1 Design direction

The visual identity should feel:

- Syrian in spirit;
- trustworthy and calm;
- modern rather than bureaucratic;
- respectful of public-service contexts;
- visually related to local architecture and manuscript geometry;
- clearly independent from the government.

The supplied ministry screenshots may be used only as broad visual research for regional color harmony and cultural familiarity. They must **not** be copied in layout, header structure, emblem placement, typography, navigation, or page composition.

## 3.2 Logo concept

The initial logo may be a simple custom wordmark “ورقة” combined with one abstract symbol:

- a folded sheet corner;
- a checklist mark;
- a path or sequence of steps;
- a simplified geometric window inspired by Syrian architecture;
- a non-official eight-point geometric motif.

Forbidden:

- Syrian eagle;
- flag treatment;
- ministry seals;
- official stamps;
- government document frames;
- designs that imitate state letterheads;
- official crests or coat-of-arms silhouettes.

The MVP can launch with a typographic wordmark and defer a final trademark-ready logo.

## 3.3 Color palette

Use design tokens rather than hard-coded colors.

```css
:root {
  --color-brand-950: #062f2b;
  --color-brand-900: #0a3d37;
  --color-brand-800: #115149;
  --color-brand-700: #1f6b61;
  --color-brand-100: #dff1ed;
  --color-brand-50:  #f1faf8;

  --color-gold-700: #9b7632;
  --color-gold-600: #b58c42;
  --color-gold-500: #c9a55d;
  --color-gold-100: #f4ead4;

  --color-ink-950: #14201e;
  --color-ink-700: #3f4d4a;
  --color-ink-500: #697572;
  --color-border:  #dbe3e0;
  --color-surface: #ffffff;
  --color-canvas:  #f8faf9;
  --color-ivory:   #fbf8f0;

  --color-success: #19734d;
  --color-warning: #9a6700;
  --color-danger:  #b42318;
  --color-info:    #175cd3;
}
```

### Color usage rules

- Deep green is the primary action and navigation color.
- Gold is an accent, not the main text color.
- Gold text on white must not be used when contrast is insufficient.
- Body text uses dark ink, never pure black by default.
- Warning, success, error, and information colors are semantic and must not be replaced by brand colors.
- Never depend on color alone to communicate status.
- Maintain WCAG AA contrast for normal text.
- Keep backgrounds mostly white, ivory, or extremely light green.
- Avoid large dark-green pages that feel like copied ministry sites.

## 3.4 Geometric patterns

A light Syrian geometric pattern may appear:

- behind the hero at 2–4% opacity;
- inside an empty state;
- in print headers;
- as a subtle footer texture.

Rules:

- must not reduce text contrast;
- must be CSS or optimized SVG;
- must not resemble an official watermark;
- must remain decorative and non-interactive;
- disable or simplify it on low-power/mobile contexts when needed.

## 3.5 Typography

Preferred Arabic fonts:

1. **IBM Plex Sans Arabic** for interface and body text; or
2. **Noto Sans Arabic** as a robust fallback; or
3. **Cairo** if already available and performance is acceptable.

Recommended stack:

```css
font-family: "IBM Plex Sans Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
```

Typography rules:

- body size: minimum 16px on mobile;
- body line-height: 1.75–1.9 for Arabic;
- buttons: 15–16px, medium or semibold;
- labels: 14–15px;
- page title: fluid `clamp(1.8rem, 4vw, 3rem)`;
- avoid very thin Arabic weights;
- avoid full paragraphs in bold;
- prevent tight line-height that clips diacritics.

## 3.6 Spacing and shape

Use an 8px spacing system with 4px substeps.

Suggested tokens:

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
--space-12: 3rem;
--space-16: 4rem;
```

Corner radii:

- controls: 12px;
- cards: 16px;
- large hero/search surfaces: 20–24px;
- pills: fully rounded only for compact status badges.

Do not make every element a rounded card. Use visual hierarchy, whitespace, separators, and typography.

## 3.7 Shadows

Use low-contrast shadows only for floating menus, dialogs, sticky mobile actions, and selected cards.

```css
--shadow-sm: 0 1px 2px rgb(15 35 30 / 0.06);
--shadow-md: 0 8px 24px rgb(15 35 30 / 0.10);
--shadow-lg: 0 20px 50px rgb(15 35 30 / 0.14);
```

Avoid heavy black shadows and glossy visual effects.

---

# 4. Product Language and Copywriting

## 4.1 Tone

All public-facing copy is Arabic in a Syrian conversational style close to Modern Standard Arabic.

The tone must be:

- clear;
- friendly;
- respectful;
- calm;
- concise;
- helpful without sounding childish;
- non-legalistic unless quoting an official source.

Good examples:

- “شو المعاملة اللي بدك تعرف تفاصيلها؟”
- “جاوبنا على كم سؤال لنطلعلك المطلوب حسب حالتك.”
- “تأكد من هالأوراق قبل ما تطلع.”
- “آخر مرة تحققنا من هالمعلومة كانت بتاريخ…”
- “المعلومة ممكن تختلف حسب المركز، لذلك تأكد من الجهة الرسمية.”
- “ما لقينا نتيجة مطابقة. جرّب اسم تاني أو كلمة الناس بتستخدمها.”

Avoid:

- rigid bureaucratic language throughout the interface;
- excessive slang;
- jokes inside critical instructions;
- absolute guarantees;
- “مضمون 100%”;
- “أكيد رح تنقبل معاملتك”;
- insulting or blame-oriented errors;
- machine-translated Arabic;
- mixed Arabic-English labels when Arabic exists.

## 4.2 Content rules

- One instruction per sentence when possible.
- Start steps with a verb.
- Explain abbreviations on first use.
- Use official terminology in titles and everyday aliases in search metadata.
- Separate verified official information from community-reported notes.
- Never write a fee without currency, effective date, and verification status.
- Never write a location without governorate and responsible agency.
- Never claim a duration is guaranteed.
- Mark estimates clearly.
- Preserve official source wording in a quoted/source field, but rewrite user guidance in accessible language.

## 4.3 Dates, numbers, and currency

- Locale: `ar-SY`.
- Store all dates as ISO timestamps in UTC.
- Display dates consistently in Arabic.
- Allow Arabic or Latin digits in search inputs.
- Store monetary values as integers in minor units only if the currency supports minor units; for SYP, store integer pounds.
- Always store currency code (`SYP`, `USD`, `EUR`, etc.).
- Fees require `effectiveFrom`, `lastVerifiedAt`, and `source`.
- Do not silently convert currencies.

---

# 5. Core UX Principles

1. **Mobile first:** design for 360–430px widths before desktop.
2. **No account required:** the full public guide must work anonymously.
3. **One decision at a time:** avoid long forms.
4. **Progress is visible:** show step number and completion state.
5. **Back navigation preserves answers.**
6. **No dead ends:** every empty or error state offers a next action.
7. **Source visibility:** important claims show source and last verification.
8. **Plain language first:** official wording remains available but not dominant.
9. **Low cognitive load:** reduce simultaneous choices.
10. **Strong touch targets:** minimum 44×44 CSS pixels.
11. **No misleading urgency:** avoid countdowns and pressure patterns.
12. **No dark patterns:** reporting, sharing, and source links remain clear.
13. **Local resilience:** preserve current guide answers in session/local storage.
14. **Printability:** final results should print cleanly on A4.
15. **Accessibility:** keyboard, screen reader, focus visibility, and reduced motion are first-class requirements.

---

# 6. Information Architecture and Routes

## 6.1 Public routes

```text
/
/search
/categories
/categories/[slug]
/transactions/[slug]
/transactions/[slug]/guide
/transactions/[slug]/result
/about
/how-it-works
/methodology
/disclaimer
/privacy
/terms
/contact
/report-information
/not-found
```

Optional MVP route:

```text
/sources/[id]
```

## 6.2 Administration routes

Payload should own the standard admin route:

```text
/admin
/admin/login
```

Do not expose internal dashboards through public navigation.

## 6.3 API and server actions

Suggested public endpoints or route handlers:

```text
GET  /api/public/categories
GET  /api/public/transactions
GET  /api/public/transactions/[slug]
POST /api/public/guide/evaluate
POST /api/public/reports
GET  /api/public/search
GET  /api/health
```

Rules:

- public endpoints return published records only;
- draft content is never exposed without authenticated preview permission;
- all POST endpoints validate with Zod;
- all public write endpoints are rate-limited;
- errors return safe messages and a trace ID, not stack traces;
- internal Payload endpoints retain Payload access controls.

---

# 7. Home Page Specification

## 7.1 Header

Desktop header:

- Waraqa wordmark;
- search shortcut;
- “التصنيفات”;
- “كيف بتشتغل ورقة؟”;
- “عن ورقة”;
- independence badge;
- menu button only when navigation does not fit.

Mobile header:

- wordmark on the right;
- accessible menu button on the left;
- no crowded secondary actions;
- sticky header only if it does not consume excessive height.

Header requirements:

- clear focus styles;
- skip-to-content link;
- no official emblems;
- maximum mobile height around 64px;
- active state uses more than color alone.

## 7.2 Hero

Primary Arabic copy:

> خلّينا نجهز معاملتك قبل ما تطلع

Supporting copy:

> ابحث عن المعاملة، جاوب على كم سؤال، وخد قائمة واضحة بالأوراق والخطوات حسب حالتك.

Primary control: a large search input with a search button.

Placeholder:

> اكتب اسم المعاملة… مثل جواز سفر أو لا حكم عليه

Under the search:

- example chips;
- independence disclaimer;
- short trust statement;
- optional “تصفح حسب التصنيف” secondary action.

The hero must not use a large political or governmental image. Prefer an abstract geometric background or a custom neutral illustration of documents and steps.

## 7.3 Categories

Initial categories:

- الأحوال المدنية;
- الجوازات والسفر;
- التعليم والشهادات;
- المركبات والقيادة;
- التصديقات والوكالات;
- السجل العدلي والوثائق;
- الأعمال والتراخيص (future or limited MVP).

Each category card contains:

- icon;
- Arabic title;
- one-line description;
- number of published procedures when useful;
- accessible link area.

## 7.4 Popular procedures

Show four to six verified procedures based on manually configured popularity in MVP. Do not pretend analytics-driven popularity before sufficient data exists.

Card content:

- procedure title;
- short purpose;
- category;
- last verified date;
- “اعرف شو المطلوب” action.

## 7.5 How Waraqa works

Three simple steps:

1. “دوّر على معاملتك.”
2. “جاوب حسب حالتك.”
3. “جهّز أوراقك وخطواتك.”

Use concise icons and no long paragraphs.

## 7.6 Trust section

Explain:

- every important item is linked to a source;
- the last verification date is shown;
- users can report changed information;
- Waraqa is independent and not governmental.

## 7.7 Footer

Include:

- independence disclaimer;
- methodology;
- about;
- privacy;
- terms;
- contact;
- report outdated information;
- copyright;
- version or last deployment identifier in non-production or optional technical footer.

Do not show social icons unless official Waraqa accounts actually exist.

---

# 8. Arabic Search

## 8.1 Search behavior

The search must support:

- official procedure title;
- common Syrian aliases;
- partial terms;
- normalized Arabic letters;
- common spelling variation;
- category title;
- agency name;
- important keywords;
- optional typo tolerance using PostgreSQL trigram similarity.

Examples:

```text
لا حكم عليه -> سجل عدلي
غير محكوم -> سجل عدلي
ورقة عائلية -> بيان عائلي
اخراج قيد -> إخراج قيد فردي
تجديد باسبور -> تجديد جواز سفر
```

## 8.2 Text normalization

Create one well-tested normalization function. It should:

- trim whitespace;
- collapse repeated spaces;
- remove Arabic diacritics;
- normalize `أ`, `إ`, and `آ` to `ا` for search only;
- normalize `ى` to `ي` for search only;
- optionally normalize `ة` carefully through alias strategy rather than destructive display replacement;
- normalize Arabic and Persian digits;
- remove tatweel;
- lowercase Latin text;
- preserve original display text.

Do not mutate stored titles into normalized text. Store or generate a separate searchable representation.

## 8.3 Search implementation

MVP order:

1. exact alias match;
2. exact title match;
3. prefix match;
4. full-text search;
5. trigram similarity fallback.

Use PostgreSQL indexes. Avoid Elasticsearch in MVP.

Suggested indexed fields:

- `title`;
- `searchText`;
- `aliases`;
- `keywords`;
- `category`;
- publication status.

## 8.4 Results screen

Must include:

- query in the search field;
- result count;
- category filters;
- accessible clear button;
- highlighted matched aliases only when safe;
- empty state with examples;
- loading skeleton;
- no-result reporting option only when it does not create spam.

No result copy:

> ما لقينا معاملة مطابقة. جرّب اسم تاني، أو كلمة الناس بتستخدمها عادةً.

---

# 9. Transaction Page

## 9.1 Page header

Show:

- breadcrumb;
- category;
- official title;
- common aliases;
- short purpose;
- independent-platform badge;
- verification status;
- last verified date;
- primary action: “بلّش الدليل”;
- secondary action: “شوف المعلومات العامة”.

## 9.2 Content sections

Suggested order:

1. “هالمعاملة لمين؟”
2. “قبل ما تبلّش”
3. “المعلومات بتختلف حسب حالتك” callout
4. interactive guide CTA
5. general expected documents
6. general steps
7. fees
8. locations or agencies
9. expected duration
10. official sources
11. common mistakes
12. last verification and reviewer information
13. report changed information
14. disclaimer.

The general page must not replace the personalized guide. It should make clear that exact requirements depend on answers.

## 9.3 Verification badge states

```text
verified       = تم التحقق
review_due     = بحاجة مراجعة قريباً
outdated       = المعلومة قديمة
community_note = ملاحظة من المستخدمين
unverified     = غير مؤكدة
```

Only administrators/reviewers can set official verification states.

---

# 10. Interactive Guide Engine

## 10.1 User flow

1. User opens a transaction.
2. User presses “بلّش الدليل”.
3. The system presents one question per screen when possible.
4. The user selects an answer.
5. Progress updates.
6. Back navigation preserves previous answers.
7. Conditional questions appear only when relevant.
8. The engine evaluates the selected variant and rules.
9. A personalized result is generated.
10. The result is shareable and printable.

## 10.2 Example flow

Transaction: Passport

Questions:

1. “شو نوع المعاملة؟”
   - أول مرة
   - تجديد
   - بدل ضائع
   - بدل تالف

2. “وين رح تقدم؟”
   - داخل سوريا
   - خارج سوريا

3. “صاحب العلاقة بالغ ولا قاصر؟”
   - بالغ
   - قاصر

4. “بدك الخدمة العادية ولا المستعجلة؟”
   - عادية
   - مستعجلة

Possible result additions:

- if `minor`, add guardian approval requirements;
- if `renewal`, require previous passport;
- if `lost`, add police report or officially verified replacement process;
- if `outside_syria`, display embassy/consular steps;
- if `urgent`, display urgent fee and duration only when verified.

## 10.3 Rules model for MVP

Avoid an unrestricted expression language. Use a constrained, typed model.

Recommended structure:

```ts
type ConditionOperator = "equals" | "notEquals" | "includes" | "exists";

type RuleCondition = {
  questionKey: string;
  operator: ConditionOperator;
  value?: string | string[] | boolean;
};

type DecisionRule = {
  id: string;
  all?: RuleCondition[];
  any?: RuleCondition[];
  effects: RuleEffect[];
  priority: number;
};

type RuleEffect =
  | { type: "includeRequirement"; requirementId: string }
  | { type: "excludeRequirement"; requirementId: string }
  | { type: "includeStep"; stepId: string }
  | { type: "excludeStep"; stepId: string }
  | { type: "includeFee"; feeId: string }
  | { type: "includeNotice"; noticeId: string }
  | { type: "selectVariant"; variantId: string };
```

Rules:

- evaluation must be deterministic;
- conflicting effects must have documented precedence;
- exclusion should override inclusion at the same priority;
- higher priority executes after lower priority;
- duplicate items are removed by stable ID;
- content order follows configured order, not rule execution order;
- unknown answers must never produce invented defaults;
- invalid rule references fail validation before publication;
- preview mode must show which rules fired.

## 10.4 Guide result

The result page includes:

- a short summary of selected answers;
- personalized document checklist;
- personalized steps;
- fees that apply;
- relevant service centers or agencies;
- time estimate with uncertainty label;
- warnings and common mistakes;
- source list;
- last verified date;
- print;
- WhatsApp share;
- restart or edit answers;
- report changed information;
- mandatory disclaimer.

## 10.5 State management

For MVP:

- keep active answers in URL-safe or session state where practical;
- persist a draft in `sessionStorage` or `localStorage` with schema version;
- never store sensitive personal data;
- allow “ابدأ من جديد”;
- expire incompatible saved state after a schema version change;
- avoid requiring server-side user sessions for anonymous guides.

---

# 11. Checklist, Save, Share, and Print

## 11.1 Checklist

Requirements:

- checkboxes are local-only;
- completion is saved locally;
- each item may contain quantity, original/copy status, notes, and source;
- checked state is not transmitted unless analytics explicitly excludes item content;
- provide “إلغاء تحديد الكل”;
- do not imply checked means officially accepted.

## 11.2 WhatsApp sharing

Generate concise Arabic text, for example:

```text
هاي قائمة معاملتي من ورقة:

المعاملة: تجديد جواز سفر
الحالة: داخل سوريا — بالغ — خدمة عادية

الأوراق المطلوبة:
1. ...
2. ...

آخر تحقق: ...
المصدر والتفاصيل: [URL]

ورقة منصة مستقلة وليست موقعاً حكومياً.
```

Rules:

- encode URL safely;
- do not include private answers beyond what is necessary;
- cap message length;
- include a stable result URL only if result reconstruction is safe;
- otherwise link to the transaction and instruct the recipient to run the guide.

## 11.3 Printing

Provide a dedicated print stylesheet:

- A4 portrait;
- white background;
- black/dark text;
- no navigation, footer menus, or decorative patterns;
- show title, selected situation, requirements, steps, fees, sources, verification date, and disclaimer;
- preserve Arabic RTL;
- avoid breaking a checklist item across pages;
- include generated date;
- include QR code only if implemented accessibly and reliably, otherwise omit from MVP.

---

# 12. Reporting Changed Information

## 12.1 Public form

Fields:

- related transaction;
- related section: documents, fees, steps, location, duration, source, other;
- what appears incorrect;
- what the user encountered;
- optional public source URL;
- optional service center;
- optional contact email or phone, clearly marked and not required;
- consent checkbox for processing the report;
- honeypot field;
- anti-spam token if needed.

Arabic introduction:

> لاحظت معلومة تغيّرت؟ خبرنا عنها، وفريق ورقة بيراجعها قبل ما يعدّل المحتوى.

## 12.2 Security and moderation

- reports are never published automatically;
- strip unsafe HTML;
- validate URL protocols;
- limit lengths;
- rate-limit by IP or privacy-preserving fingerprint;
- do not request identity documents;
- do not expose reporter contact details to public users;
- keep status history;
- allow reviewer notes;
- record resolution reason;
- delete spam and sensitive attachments; attachments are excluded from MVP.

---

# 13. Payload CMS Administration

## 13.1 Roles

### Admin

Can:

- manage users and roles;
- manage site settings;
- create, edit, review, publish, archive, and restore content;
- view audit events;
- run migrations through deployment workflow;
- manage taxonomy and system configuration.

### Reviewer

Can:

- read all content;
- edit review fields;
- approve or reject drafts;
- publish approved content if policy permits;
- resolve user reports;
- view revision history.

Cannot:

- manage admins;
- modify environment settings;
- bypass required sources.

### Researcher

Can:

- create and edit drafts;
- add sources;
- submit for review;
- respond to reviewer comments.

Cannot:

- publish;
- approve own work;
- manage users;
- delete audit history.

### Viewer

Read-only access to admin content and reports.

## 13.2 Content workflow

```text
DRAFT
  -> IN_REVIEW
  -> CHANGES_REQUESTED
  -> IN_REVIEW
  -> APPROVED
  -> PUBLISHED
  -> REVIEW_DUE
  -> OUTDATED
  -> ARCHIVED
```

Rules:

- only published content appears publicly;
- researcher submission records timestamp and user;
- reviewer rejection requires a comment;
- publishing requires at least one valid source for every critical section;
- publishing sets `publishedAt` and `publishedBy`;
- approval must be invalidated if critical fields change afterward;
- scheduled review date is calculated from verification policy;
- outdated content remains accessible only if explicitly configured and clearly warned, otherwise hide it from public search;
- revisions must be restorable.

## 13.3 Admin dashboard

Dashboard cards:

- procedures awaiting review;
- procedures due for verification;
- open user reports;
- broken or unreachable sources discovered manually or by scheduled check later;
- recently published changes;
- content missing a source;
- content with invalid rules;
- publication count by category.

## 13.4 Admin editing experience

Payload field groups should match the content editor's mental model:

1. Basics
2. Audience and situations
3. Questions
4. Requirements
5. Steps
6. Fees
7. Locations
8. Sources
9. Common mistakes
10. Verification
11. SEO
12. Workflow

Provide inline help text in Arabic or English according to admin preference, but field names may remain English in code.

## 13.5 Preview

Preview must support:

- draft transaction page;
- draft guide;
- selected answer simulation;
- list of fired rules;
- missing reference warnings;
- mobile and desktop preview sizes where practical.

---

# 14. Data Model

Use Payload collections and blocks with PostgreSQL. Prefer normalized relationships for reusable entities and structured embedded blocks for transaction-owned ordered content.

## 14.1 Users

Collection: `users`

Fields:

```text
name
displayName
email
password/auth fields
role: admin | reviewer | researcher | viewer
isActive
preferredLocale
lastLoginAt
createdAt
updatedAt
```

Requirements:

- email unique;
- strong password policy;
- optional MFA in a later phase;
- disabled users cannot log in;
- never expose user emails publicly.

## 14.2 Categories

Collection: `categories`

```text
title
slug
description
iconKey
sortOrder
isFeatured
status
seoTitle
seoDescription
```

## 14.3 Agencies

Collection: `agencies`

```text
name
shortName
slug
type
websiteUrl
contactNotes
isOfficial
status
```

`isOfficial` means the agency itself is official; it does not make Waraqa official.

## 14.4 Service Centers

Collection: `service-centers`

```text
name
agency
governorate
city
area
addressText
mapUrl
phoneNumbers
openingHours
accessibilityNotes
appointmentRequired
notes
lastVerifiedAt
sources
status
```

Do not publish precise coordinates unless sourced and useful.

## 14.5 Sources

Collection: `sources`

```text
title
publisher
sourceType: official_page | official_pdf | official_post | law | circular | direct_confirmation | other
url
publishedAt
accessedAt
archivedCopyReference
language
notes
isPrimary
verificationStatus
lastCheckedAt
```

Rules:

- URL required for online sources;
- direct confirmation requires a note describing method and date;
- a screenshot is evidence support, not automatically a legal source;
- copyrighted material must not be copied excessively;
- preserve citation metadata even if URL later breaks.

## 14.6 Documents

Collection: `documents`

```text
name
slug
description
aliases
documentType
issuingAgency
validityNotes
replacementNotes
sensitiveDataWarning
status
```

Reusable examples:

- identity card;
- civil record extract;
- family statement;
- personal photos;
- police report;
- previous passport.

## 14.7 Transactions

Collection: `transactions`

Core fields:

```text
title
slug
shortDescription
longDescription
aliases[]
keywords[]
category
responsibleAgencies[]
audiences[]
status
publicationStatus
featured
sortOrder
```

Guidance fields:

```text
eligibilitySummary
beforeYouStart[]
generalRequirements[]
generalSteps[]
fees[]
serviceCenters[]
durations[]
commonMistakes[]
questions[]
variants[]
decisionRules[]
notices[]
```

Verification fields:

```text
sources[]
lastVerifiedAt
verifiedBy
reviewDueAt
verificationStatus
verificationNotes
publishedAt
publishedBy
```

SEO fields:

```text
seoTitle
seoDescription
canonicalPath
socialImage
```

System fields:

```text
schemaVersion
createdBy
updatedBy
createdAt
updatedAt
```

## 14.8 Requirement block

```text
id
document: relationship or custom text
title
description
quantity
copyType: original | copy | certified_copy | photo | digital | other
required: boolean
conditionalLabel
notes
sourceReferences[]
sortOrder
verificationStatus
```

## 14.9 Step block

```text
id
title
description
agency
serviceCenter
estimatedDuration
appointmentRequired
onlineUrl
warnings[]
sourceReferences[]
sortOrder
verificationStatus
```

## 14.10 Fee block

```text
id
label
amount
currency
feeType
serviceSpeed
paymentMethod
paymentLocation
effectiveFrom
effectiveTo
isEstimate
notes
sourceReferences[]
lastVerifiedAt
sortOrder
```

If exact amount is unavailable, use a text notice and clearly mark uncertainty. Never store invented zero amounts.

## 14.11 Question block

```text
id
key
prompt
helpText
type: single_choice | multiple_choice | boolean
required
options[]
showWhen
sortOrder
```

Option:

```text
value
label
description
iconKey
```

Question keys are stable machine identifiers and must not change after publication without migration.

## 14.12 Variant block

```text
id
key
title
description
matchConditions[]
requirements[]
steps[]
fees[]
notices[]
sourceReferences[]
priority
```

Variants handle large scenario differences. Rules handle additive or subtractive details.

## 14.13 User Reports

Collection: `user-reports`

```text
transaction
section
message
reportedValue
suggestedValue
serviceCenter
sourceUrl
contactMethodEncryptedOrProtected
status: new | triaged | investigating | resolved | rejected | spam
assignedTo
reviewNotes
resolutionSummary
createdAt
resolvedAt
```

Contact information requires stricter access than report text.

## 14.14 Audit Events

Collection or immutable log: `audit-events`

```text
actor
action
entityType
entityId
summary
beforeReference
afterReference
ipHash optional
userAgentSummary optional
createdAt
```

Do not log passwords, tokens, full request bodies, or sensitive user data.

## 14.15 Site Settings Global

Payload Global: `site-settings`

```text
siteName
tagline
independenceDisclaimer
footerDisclaimer
contactEmail
supportPhone optional
socialLinks[]
searchExamples[]
featuredTransactions[]
homePageSections
verificationPolicyDays
maintenanceMode
analyticsEnabled
```

---

# 15. Technical Stack

## 15.1 Core stack

Recommended MVP stack:

- Next.js App Router;
- TypeScript with strict mode;
- Payload CMS;
- PostgreSQL;
- Payload PostgreSQL adapter;
- Tailwind CSS;
- accessible component primitives, with shadcn/ui only where it improves speed without visual sameness;
- Zod for custom boundary validation;
- `pnpm`;
- Vercel for public deployment;
- Supabase Postgres or another compatible managed PostgreSQL provider;
- private GitHub repository.

Version rule:

- Cursor must verify current official compatibility between Node.js, Next.js, React, Payload, and the PostgreSQL adapter before installation.
- Pin exact versions in the lockfile.
- Do not upgrade major versions during the MVP without a dedicated migration task.

## 15.2 Testing stack

- Vitest for unit tests;
- React Testing Library for component behavior;
- Playwright for E2E;
- axe integration for accessibility checks;
- ESLint;
- TypeScript compiler;
- production build validation.

## 15.3 Recommended utilities

- `clsx` / `tailwind-merge` for class composition;
- `date-fns` or an equivalent lightweight date utility if needed;
- a mature Arabic-capable slug strategy;
- server-side structured logging;
- `next-safe-action` only if it clearly improves typed server actions; otherwise use plain server actions/route handlers;
- Sentry or similar only after the MVP if free limits and privacy policy are acceptable.

## 15.4 Do not add in MVP

- NestJS;
- a separate backend repository;
- GraphQL consumption in the public frontend unless needed;
- Redux for simple guide state;
- Redis;
- queue infrastructure;
- microservices;
- Elasticsearch;
- complex event sourcing;
- citizen authentication;
- a general AI assistant;
- automatic source scraping and publishing.

---

# 16. Proposed Project Structure

```text
waraqa/
├─ docs/
│  ├─ WARAQA_MASTER_ROADMAP_EN.md
│  ├─ ARCHITECTURE.md
│  ├─ DATA_MODEL.md
│  ├─ CONTENT_GUIDE.md
│  ├─ SECURITY.md
│  └─ ADR/
├─ public/
│  ├─ icons/
│  ├─ patterns/
│  └─ manifest.webmanifest
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx
│  │  │  ├─ search/
│  │  │  ├─ categories/
│  │  │  ├─ transactions/[slug]/
│  │  │  ├─ about/
│  │  │  ├─ methodology/
│  │  │  ├─ disclaimer/
│  │  │  ├─ privacy/
│  │  │  └─ terms/
│  │  ├─ (payload)/
│  │  │  ├─ admin/
│  │  │  └─ api/
│  │  ├─ api/
│  │  │  ├─ public/
│  │  │  └─ health/
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ not-found.tsx
│  │  └─ error.tsx
│  ├─ collections/
│  │  ├─ Users.ts
│  │  ├─ Categories.ts
│  │  ├─ Agencies.ts
│  │  ├─ ServiceCenters.ts
│  │  ├─ Sources.ts
│  │  ├─ Documents.ts
│  │  ├─ Transactions.ts
│  │  ├─ UserReports.ts
│  │  └─ AuditEvents.ts
│  ├─ globals/
│  │  └─ SiteSettings.ts
│  ├─ blocks/
│  │  ├─ RequirementBlock.ts
│  │  ├─ StepBlock.ts
│  │  ├─ FeeBlock.ts
│  │  ├─ QuestionBlock.ts
│  │  ├─ VariantBlock.ts
│  │  └─ NoticeBlock.ts
│  ├─ access/
│  │  ├─ roles.ts
│  │  ├─ canPublish.ts
│  │  └─ publicReadPublished.ts
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ layout/
│  │  ├─ search/
│  │  ├─ transaction/
│  │  ├─ guide/
│  │  ├─ sources/
│  │  └─ feedback/
│  ├─ features/
│  │  ├─ arabic-search/
│  │  ├─ guide-engine/
│  │  ├─ content-verification/
│  │  ├─ sharing/
│  │  └─ reporting/
│  ├─ lib/
│  │  ├─ db/
│  │  ├─ payload/
│  │  ├─ validation/
│  │  ├─ security/
│  │  ├─ analytics/
│  │  ├─ env.ts
│  │  └─ logger.ts
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ print.css
│  │  └─ utilities.css
│  ├─ payload.config.ts
│  └─ payload-types.ts
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  ├─ fixtures/
│  └─ accessibility/
├─ migrations/
├─ scripts/
│  ├─ seed.ts
│  ├─ verify-content.ts
│  └─ check-env.ts
├─ .env.example
├─ eslint.config.*
├─ next.config.*
├─ playwright.config.ts
├─ postcss.config.*
├─ tailwind.config.* or CSS-first config
├─ tsconfig.json
├─ vitest.config.ts
├─ package.json
├─ pnpm-lock.yaml
└─ README.md
```

Architecture rules:

- domain logic must not live inside page components;
- Payload collections contain schema and access hooks, not all business logic;
- guide evaluation must be a pure, testable service;
- public data fetching must enforce publication status server-side;
- client components are used only when interaction requires them;
- never expose server secrets through `NEXT_PUBLIC_*` variables;
- code files and identifiers should be English;
- user-facing strings remain Arabic.

---

# 17. Correct RTL Implementation

## 17.1 Root configuration

```tsx
<html lang="ar-SY" dir="rtl">
```

Do not apply RTL only through CSS. Semantic direction must be present in HTML.

## 17.2 CSS rules

Use logical properties:

- `margin-inline-start` / Tailwind logical equivalents;
- `padding-inline`;
- `border-inline-start`;
- `inset-inline-start`;
- `text-align: start`;
- `float: inline-start` when needed.

Avoid hard-coded `left` and `right` for layout unless the element is physically directional.

Directional icons:

- back arrows must point according to RTL navigation;
- next arrows point toward the left in an RTL flow;
- external-link icons remain semantically recognizable;
- phone, search, check, warning, print, and location icons generally do not mirror;
- progress bars fill from the right in RTL.

Mixed content:

- use `dir="ltr"` for URLs, email addresses, codes, and phone numbers when needed;
- use `unicode-bidi: plaintext` or isolated spans carefully;
- test punctuation around Latin terms;
- ensure number/currency order is readable.

## 17.3 Mandatory RTL tests

Test at least:

- home header and mobile menu;
- search icon placement;
- breadcrumbs;
- cards with icons;
- question options;
- progress indicator;
- back/next buttons;
- checklist;
- tables or fee lists;
- modal and drawer alignment;
- toast notifications;
- print output;
- Arabic mixed with English URLs;
- long Arabic titles;
- empty and error states.

No phase passes while obvious RTL defects remain.

---

# 18. Responsive and Mobile UX

## 18.1 Required viewport tests

```text
320 × 568
360 × 800
375 × 812
390 × 844
412 × 915
430 × 932
768 × 1024
1024 × 768
1280 × 800
1440 × 900
```

## 18.2 Mobile rules

- no horizontal scrolling;
- primary search visible without excessive scrolling;
- minimum touch target 44px;
- sticky bottom action may be used in guide/result pages;
- avoid multi-column forms;
- one question per screen where practical;
- fixed headers must not hide focused elements;
- dialogs should become bottom sheets when more ergonomic;
- never lock body scroll incorrectly;
- keyboard opening must not cover the active input/action;
- preserve state after orientation change;
- use compact cards, not desktop cards scaled down;
- show the most important information first;
- avoid carousels for critical information;
- do not hide sources behind tiny icons.

## 18.3 Desktop rules

- content max width around 1180–1280px;
- reading columns max around 720–800px;
- use side navigation only when it improves long transaction pages;
- avoid empty ultra-wide areas;
- maintain clear visual hierarchy;
- guide questions should not become needlessly wide.

---

# 19. Accessibility

Target WCAG 2.2 AA where feasible.

Requirements:

- semantic headings in order;
- one `h1` per page;
- skip link;
- keyboard navigation for all interactive elements;
- visible focus rings;
- form labels connected to controls;
- errors announced with `aria-live` or appropriate semantics;
- progress has text, not only graphics;
- icons have accessible names or are hidden when decorative;
- color contrast AA;
- reduced-motion support;
- no autoplay video;
- no content conveyed only by hover;
- screen-reader-friendly checklist;
- dialog focus trap and return focus;
- large enough text and controls;
- zoom to 200% without loss of functionality;
- no CAPTCHA that blocks users with disabilities; use invisible anti-spam methods first;
- source links describe destination;
- status badges include text.

Automated axe checks are required but do not replace manual keyboard and screen-reader testing.

---

# 20. Performance and Weak-Internet Strategy

Performance budget for key public pages on a mid-range mobile profile:

- initial JavaScript kept minimal;
- LCP target under 2.5s under reasonable 4G testing and optimized server response;
- CLS under 0.1;
- INP under 200ms when realistically measured;
- home page compressed transfer target under approximately 500KB excluding cached font assets, with a goal to be lower;
- no unoptimized hero photos;
- no unnecessary third-party scripts.

Implementation rules:

- default to Server Components;
- lazy-load noncritical client components;
- optimize and subset fonts;
- self-host fonts when licensing allows;
- use SVG icons;
- use Next Image only where actual images exist;
- cache published content with appropriate revalidation;
- revalidate after publishing through a secure server action/hook;
- avoid hydration for static content;
- keep guide engine payload limited to the active transaction;
- compress JSON responses;
- show useful skeletons;
- provide clear retry behavior.

## 20.1 PWA

MVP PWA scope:

- valid web app manifest;
- installable icon set;
- theme color;
- app name and short name;
- basic offline fallback page;
- cache only safe public static assets;
- do not cache admin pages;
- do not cache stale transaction data indefinitely;
- clearly show when displayed data may be offline/stale;
- advanced offline transaction browsing can be a later phase.

---

# 21. Security and Privacy

## 21.1 Principles

- collect the minimum data;
- no identity documents;
- no national IDs;
- no citizen account in MVP;
- secrets remain server-side;
- validate every external input;
- enforce access controls in Payload and server code;
- sanitize rich text output;
- rate-limit public writes;
- use secure cookies;
- protect admin authentication;
- log security-relevant actions without logging secrets;
- keep dependencies maintained;
- use database migrations, not manual production edits.

## 21.2 Admin protection

- Payload admin route is not linked publicly;
- login errors do not reveal whether an email exists;
- account lockout or progressive delay after repeated failures;
- secure password reset;
- HTTPS only in production;
- `httpOnly`, `secure`, and suitable `sameSite` cookies;
- role checks on every privileged operation;
- researcher cannot publish through API manipulation;
- CSRF protections as provided/recommended by framework;
- content security policy planned and tested;
- no service-role database key in browser code;
- production admin accounts created intentionally, not seeded with public passwords.

## 21.3 Public content safety

- rich text rendered through a safe serializer;
- external links use safe protocols;
- user reports are plain text;
- URLs validated;
- no direct HTML from user input;
- no file uploads in MVP reports;
- source previews do not execute remote scripts;
- search queries are parameterized;
- guide rules cannot execute arbitrary code.

## 21.4 Privacy

Privacy page must explain:

- what anonymous technical data may be collected;
- what report contact data is optional;
- retention period;
- who can access report data;
- that Waraqa is independent;
- that local checklist state stays on the device;
- how to request deletion of supplied contact data.

---

# 22. SEO and Link Sharing

Requirements:

- Arabic metadata;
- unique title and description per transaction;
- canonical URLs;
- Open Graph metadata;
- sitemap for published pages;
- robots rules that exclude admin, previews, and internal APIs;
- structured data only when semantically accurate;
- no claims of official authority in metadata;
- stable human-readable slugs;
- redirects for changed slugs;
- server-rendered public content;
- useful social card using Waraqa branding, not government branding.

Suggested title format:

```text
[اسم المعاملة]: الأوراق والخطوات حسب حالتك | ورقة
```

---

# 23. Privacy-Respecting Analytics

MVP analytics can be omitted initially. If enabled, collect only product-improvement metrics such as:

- page views;
- search terms after privacy review;
- zero-result searches;
- guide starts;
- guide completions;
- transaction popularity;
- report submission count;
- device category and coarse performance metrics.

Do not collect:

- document checklist content;
- sensitive answers;
- full IP addresses in product analytics;
- personal identity;
- keystroke recordings;
- session replay by default.

Search logs must have a retention policy and filters for accidentally entered personal information.

---

# 24. Initial MVP Procedures

The first five procedures should be selected based on source availability and real user demand. Proposed set:

1. First-time passport application.
2. Passport renewal.
3. Individual civil record extract.
4. Criminal record certificate.
5. Educational certificate authentication.

Alternative procedures may replace any item if reliable current sources are unavailable.

Each seed procedure must include:

- official title;
- aliases;
- category;
- purpose;
- audience;
- at least one decision question when relevant;
- requirements;
- steps;
- fees or an explicit verified “not available” state;
- locations/agencies;
- duration with uncertainty;
- common mistakes;
- sources;
- last verified date;
- reviewer approval;
- Arabic copy review;
- mobile and print QA.

No demo content may be presented as verified official information unless it has actually been verified. When using placeholders, label them visibly:

> بيانات تجريبية للعرض — ليست معلومات رسمية

---

# 25. Phased Implementation Plan

## Phase 0 — Decisions and Compatibility Audit

### Tasks

- read this roadmap completely;
- inspect the current repository, if any;
- verify official compatibility between Node.js, Next.js, React, Payload, and the PostgreSQL adapter;
- document chosen exact versions;
- decide package manager (`pnpm`);
- decide database provider for local and production;
- write architecture decision records;
- define environment variables;
- confirm deployment limitations on the selected free plans;
- identify risks before code generation;
- do not build product features yet.

### Deliverables

- `docs/ARCHITECTURE.md`;
- `docs/ADR/0001-stack.md`;
- `.env.example` without secrets;
- implementation phase checklist;
- compatibility report;
- risk register.

### Gate

Phase 0 passes only when:

- chosen versions are supported together;
- no secret is committed;
- architecture matches the MVP scope;
- no unnecessary service is added;
- the developer reviews and accepts the plan.

## Phase 1 — Project Bootstrap

### Tasks

- create the Next.js + Payload project;
- enable strict TypeScript;
- configure PostgreSQL;
- configure environment validation;
- configure ESLint;
- configure formatting if used;
- configure Vitest;
- configure Playwright;
- add health endpoint;
- add root Arabic locale and RTL;
- create README setup instructions;
- create CI workflow if repository permissions allow.

### Mandatory scripts

```json
{
  "dev": "...",
  "build": "...",
  "start": "...",
  "lint": "...",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
}
```

### Acceptance criteria

- local app starts;
- Payload admin loads;
- database connection works;
- health route returns success;
- no TypeScript error;
- lint passes;
- one sample unit test passes;
- production build passes;
- setup works from a clean clone using README.

## Phase 2 — Design System and RTL Foundation

### Tasks

- implement design tokens;
- configure fonts;
- create base layout;
- create button, input, textarea, select, checkbox, radio card, badge, callout, card, dialog, drawer, toast, skeleton, breadcrumb, and progress components;
- create header and footer shells;
- implement skip link and focus styles;
- create geometric background utility;
- create visual story/demo page for components in development only;
- write RTL component tests.

### Acceptance criteria

- all components work at required mobile widths;
- keyboard operation works;
- focus is visible;
- contrast passes;
- no component assumes LTR;
- reduced motion works;
- design does not imitate a ministry website;
- visual QA screenshots are stored for review.

## Phase 3 — Core Payload Collections

**Status: COMPLETE — OWNER APPROVED** (2026-07-18)

### Owner amendment (2026-07-18) — Outcome A

**Roadmap conflict evidence (this section vs Phase 4):** The Phase 3 task list below originally covered Users, Categories, Agencies, Service Centers, Sources, Documents, and Site Settings — **no Transaction collection**. Phase 4 (~2108–2120) listed “implement Transaction collection” plus workflow/blocks/preview/audit events.

**Owner instruction:** authorize retaining the full `transactions` content model in Phase 3 (fields, drafts/versions, sources, steps, and related publish gates). Do **not** treat the original Phase 4 “implement Transaction collection” line as a rebuild of that schema.

QA: Round 01 owner-approved at `docs/qa/phase-3/approved/round-01-core-collections/`.

### Tasks

- implement Users and role access;
- implement Categories;
- implement Agencies;
- implement Service Centers;
- implement Sources;
- implement Documents;
- implement Site Settings (minimal Payload global — see §14.15; public UI consumption remains Phase 5);
- implement full `transactions` content model (owner amendment 2026-07-18 — Outcome A);
- generate Payload types;
- create migrations;
- add admin labels and help text;
- write access-control tests.

### Acceptance criteria

- researcher cannot manage users;
- viewer is read-only;
- public APIs expose no draft collection data;
- migrations run on an empty database;
- generated types compile;
- admin forms are usable in RTL or acceptable admin language configuration;
- seed admin creation is secure and documented.

## Phase 4 — Transactions Schema and Workflow

**Status: COMPLETE — OWNER APPROVED**

### Scope note (Outcome A — 2026-07-18)

The full `transactions` content model (fields, drafts, sources, steps) is **already authorized, implemented, and owner-approved in Phase 3**. Phase 4 **must not** rebuild or duplicate that schema. Phase 4 extends **workflow only** on the existing model: editorial transitions, audit events, scheduled review, secure preview, source-coverage gates, public access enforcement, and Admin workflow UX.

### Delivered (owner-approved)

- Central editorial workflow service (submit / request changes / resubmit / approve / publish / unpublish / archive / restore / mark outdated / restore revision)
- Approval invalidation after critical content edits
- Source-coverage approve/publish gates (`coveredSections`)
- Scheduled review metadata + outdated handling
- Archived/outdated/inactive/draft exclusion at access-query layer
- Immutable `audit-events` with readable actors (`النظام` fallback)
- Secure HMAC draft preview (`PREVIEW_SECRET` server-only)
- Role/state-aware Arabic Admin workflow actions; read-only status cards; reviewer notes; Arabic source blocker dialog
- Arabic publication status list cells; Waraqa Admin login branding
- GraphQL remains disabled; no Media / citizen uploads
- QA evidence: `docs/qa/phase-4/approved/` Rounds 02–04 (Round 01 not approved evidence)

### Remaining Admin polish debt (non-blocking)

Payload-owned English chrome strings (Create New, Save Draft, Publish changes, Search by, Columns, Filters, Login Email/Password labels, etc.) remain where unsupported without fragile workarounds.

### Acceptance criteria

- [x] researcher can create a draft and submit / resubmit;
- [x] researcher cannot publish;
- [x] reviewer can request changes / approve / publish / unpublish;
- [x] approval is invalidated after critical edits;
- [x] only published + active + non-archived + non-outdated records are publicly readable;
- [x] revision restoration works;
- [x] a transaction missing required source evidence cannot approve/publish;
- [x] audit event is recorded for publish/unpublish (and other workflow actions);
- [x] owner visual approval of Phase 4 QA Rounds 02–04.

## Phase 5 — Public Shell and Home Page

**Status: COMPLETE — OWNER APPROVED** (`phase-5-complete`)

### Tasks

- [x] implement public header/footer;
- [x] hero search entry (native GET; Phase 6 boundary);
- [x] categories;
- [x] featured procedures (configured, publication-safe);
- [x] how-it-works section;
- [x] trust section;
- [x] disclaimers;
- [x] loading and error states;
- [x] metadata (Phase 5-level Open Graph; not Phase 11 SEO);
- [x] responsive behavior;
- [x] owner visual approval (QA Rounds 01–03 → `docs/qa/phase-5/approved/`).

### Acceptance criteria

- [x] home page works without JavaScript for primary content;
- [x] search entry is usable with keyboard;
- [x] disclaimer is clearly visible;
- [x] no government logo or official visual implication;
- [x] mobile layout passes all target widths;
- [x] Lighthouse/accessibility review has no critical issue;
- [x] production build passes.

### Boundaries

**Not Phase 5:** Arabic search engine/results (Phase 6), full transaction pages (Phase 7), reporting flow (Phase 10), sitemap/robots/revalidation (Phase 11).

## Phase 6 — Arabic Search

**Status: COMPLETE — OWNER APPROVED** (`phase-6-complete`)

### Tasks

- [x] implement normalization utility;
- [x] aliases and search text generation;
- [x] PostgreSQL search indexes;
- [x] search route;
- [x] result page;
- [x] category / agency / service-center filters;
- [x] no-result state;
- [x] search analytics interface without sensitive logging (deferred — no extra analytics beyond existing infra);
- [x] unit and integration tests;
- [x] owner visual approval (QA Rounds 01–03 → `docs/qa/phase-6/approved/`).

### Acceptance criteria

- [x] normalization is deterministic;
- [x] SQL is parameterized (Payload Where + migration SQL);
- [x] draft content is excluded;
- [x] performance is acceptable with a realistic seed set (candidate cap documented);
- [x] empty query behavior is intentional;
- [x] mobile keyboard behavior is correct (native GET; E2E).

See [SEARCH_ARCHITECTURE.md](./SEARCH_ARCHITECTURE.md).

### Boundaries

**Not Phase 6:** full transaction pages (Phase 7), interactive guide (Phase 8), reporting (Phase 10).

## Phase 7 — Transaction Page

**Status: COMPLETE — OWNER APPROVED** (branch `phase-7-public-transaction-details`; tag `phase-7-complete`)

See [TRANSACTION_DETAIL_ARCHITECTURE.md](./TRANSACTION_DETAIL_ARCHITECTURE.md).

### Tasks

- [x] transaction data loader (public DTO; `overrideAccess: false`);
- [x] page header (title, summary, category, agency, last reviewed, disclaimer);
- [x] trust messaging (`آخر مراجعة`, official sources, independent-platform disclaimer) — not editorial verification badges;
- [x] requirements / documents;
- [x] ordered steps;
- [x] fees;
- [x] service centers;
- [x] duration;
- [x] sources (safe http(s) only);
- [ ] common mistakes — **schema field does not exist**; not invented in Phase 7;
- [ ] guide CTA — **Phase 8 boundary**;
- [ ] report CTA — **Phase 10 boundary**;
- [x] print-safe SSR public view foundation (no client-only requirement);
- [x] basic SEO metadata (Arabic title/description/OG) — not full Phase 11 SEO system.

### Acceptance criteria

- [x] missing optional sections do not leave empty containers;
- [x] source links are safe and accessible;
- [x] outdated / archived / draft / inactive are **not found** publicly (owner Phase 7 policy; no warning page that leaks existence);
- [x] page renders server-side;
- [x] long Arabic content remains readable;
- [x] array sections preserve saved order;
- [x] no draft / private editorial content leaks.

## Phase 8 — Guide Engine

> **Owner decision (2026-07-20):** Phase 8 ships **in-memory answers only** and an **in-session result checklist**. Roadmap items below for “save local progress”, “browser refresh preserves safe progress”, and “schema-version mismatch in local storage” are **deferred to Phase 9+**. WhatsApp share, print, and persistent checklists remain Phase 9 scope. See [INTERACTIVE_GUIDE_ARCHITECTURE.md](./INTERACTIVE_GUIDE_ARCHITECTURE.md).
>
> **Update (2026-09-12):** Phase 9 delivered P9-A…P9-E (checklist, `localStorage`, A4 print, WhatsApp share, edit answers). OS Print Preview remains Phase 13 manual QA. Share permalinks/tokens remain deferred.

### Tasks

- define typed answer model;
- implement pure rule evaluator;
- implement variant selection;
- implement conflict precedence;
- implement question visibility;
- create step-by-step UI;
- save local progress;
- edit previous answers;
- preview fired rules in admin preview;
- unit tests covering edge cases.

### Required test cases

- adult vs. minor;
- first-time vs. renewal;
- inside vs. outside Syria;
- ordinary vs. urgent;
- multiple matching additive rules;
- include/exclude conflict;
- missing answer;
- invalid reference;
- duplicate result item;
- backward navigation;
- schema-version mismatch in local storage.

### Acceptance criteria

- evaluator is pure and deterministic;
- no `eval` or arbitrary code execution;
- all references validated;
- result order stable;
- browser refresh preserves safe progress;
- keyboard and screen reader can complete guide;
- unit coverage is strong for domain logic.

## Phase 9 — Result, Checklist, Share, and Print

### Tasks

- personalized result summary;
- checklist;
- local persistence;
- edit answers;
- restart;
- WhatsApp share;
- print stylesheet;
- source and disclaimer section;
- result error recovery.

### Acceptance criteria

- checklist persists locally;
- WhatsApp text is correct Arabic and URL-safe;
- print output is clean A4 RTL;
- no navigation appears in print;
- changing answers recalculates result;
- no sensitive data is placed in a share URL;
- result works on small screens.

**Status (2026-09-12):** Implemented as P9-A…P9-E. Known carry-over: real OS/browser Print Preview is Phase 13 manual QA (P9-C limitation). Share permalinks/tokens not in scope.

## Phase 10 — User Reports

### Tasks

- public report form;
- Zod validation;
- rate limiting;
- honeypot;
- Payload collection;
- admin triage workflow;
- privacy copy;
- resolution logging;
- notifications only if a safe email provider is configured; otherwise admin dashboard is sufficient.

### Acceptance criteria

- spam controls work;
- HTML is not rendered from report text;
- contact field is optional and protected;
- report is not publicly visible;
- reviewer can resolve/reject;
- submission displays a clear success state;
- no attachment upload exists.

**Status (2026-09-12):** Implemented. Notifications deferred (no email adapter). See CONTENT_MODEL § user-reports.

## Phase 11 — Admin UX Refinement

**Status:** COMPLETE (closure branch — pending review merge)

### Tasks

- [x] group transaction fields logically (P11-A);
- [x] add inline descriptions (P11-A);
- [x] add validation messages (Arabic APIErrors for publish/triage/assignment/delete);
- [x] add rule preview (P11-C);
- [x] add missing-source indicators (P11-B readiness — canonical; no second engine);
- [x] dashboard widgets (editorial counts + Admin list links);
- [x] review-due filters (list column + overdue cell + due query);
- [x] report assignment (`assignedTo` + ACL + audit);
- [x] safer delete/archive behavior (server-enforced Transaction policy);
- [x] admin mobile usability at tablet width (768px smoke).

### Acceptance criteria

- [x] a non-developer can create a complete draft (P11-A IA + help);
- [x] reviewer can understand what changed (workflow + readiness + audit);
- [x] dangerous actions require confirmation / server block (hard delete blocked; archive preferred);
- [x] publication blockers are explicit (P11-B);
- [x] no raw IDs are required for routine content entry;
- [x] relationships are searchable.

### Deferred (documented)

- Payload English Admin chrome localization pack.
- Assignment notifications.
- Full SEO sitemap/robots/revalidation (separate track; not Admin UX acceptance).

## Phase 12 — Seed Content — COMPLETE (2026-09-13, DEMO)

### Status

Implemented on branch workflow as **DEMO-labeled** seed content (not government-certified PRODUCTION).

Artifacts:

- `docs/content/PHASE_12_SOURCE_AUDIT.md`
- `docs/content/PHASE_12_CONTENT_REVIEW.md`
- Catalog + idempotent seed: `src/lib/content/phase12/*`, `scripts/phase12-seed-content.ts`

### Selected procedures (all `contentClass=DEMO`)

1. معادلة شهادة ثانوية غير سورية (practical Golden Demo case)
2. تنظيم وكالة في بعثة دبلوماسية سورية
3. تسجيل زواج عبر بعثة دبلوماسية سورية
4. استخراج وثيقة أحوال مدنية عبر البعثة
5. تجديد جواز سفر منتهٍ عبر البعثة

### Tasks (done)

- researched five procedures from opened reliable sources;
- created a Source record for every important claim;
- entered Syrian-friendly Arabic citizen copy;
- ran claim/editorial review via seeded reviewer identity;
- tested guide answer-path matrices;
- labeled uncertain fees/freshness with NEEDS_OFFICIAL_CONFIRMATION;
- DEMO public label + P0-06 isolation preserved;
- verified source URLs were opened (no snippet-only evidence).

### Acceptance criteria (met as DEMO)

- five procedures READY_FOR_DEMO and demo-labeled;
- no placeholder lorem ipsum;
- no invented fee amounts, durations, or addresses;
- reviewer identity recorded on VERIFIED claims;
- guide paths produce meaningful claim-backed results;
- Arabic copy authored for citizen clarity;
- currency/amounts omitted where unsupported (honest UNKNOWN / confirmation-needed).

## Phase 13 — Quality Hardening

### Tasks

- complete unit, integration, and E2E suites;
- accessibility audit;
- manual RTL audit;
- **required: manual OS/browser Print Preview QA for personalized guide result (P9-C carry-over — A4 portrait, RTL, margins, page breaks, checklist `[✓]`/`[ ]`, DEMO warning, independence disclaimer, sources; Playwright `emulateMedia('print')` alone is not sufficient);**
- security review;
- dependency audit;
- performance audit;
- error boundary tests;
- empty database test;
- fresh clone setup test;
- migration rollback/backup plan;
- privacy and legal copy review;
- visual regression captures.

### Acceptance criteria

All commands pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

And:

- no critical accessibility issue;
- no high-severity dependency vulnerability without documented mitigation;
- no console errors in key flows;
- no secret in repository history;
- no broken public route;
- no horizontal mobile overflow;
- no critical source missing;
- recovery from API/database failure is understandable.

## Phase 14 — Deployment and Demo

### Tasks

- create production PostgreSQL project;
- configure production environment securely;
- deploy to Vercel;
- run migrations;
- create production admin manually;
- seed reviewed content;
- configure preview deployment;
- set robots and metadata;
- run production smoke tests;
- create demo account with limited access only if needed;
- prepare TechTown demo script;
- document backup and restore procedure.

### Acceptance criteria

- production URL works;
- admin authentication works;
- public content is published correctly;
- all production smoke tests pass;
- draft data is not exposed;
- disclaimer is visible;
- preview and production environments are separated;
- no production secret appears in logs or client bundles;
- backup procedure is documented.

---

# 26. Detailed Test Plan

## 26.1 Unit tests

Test:

- Arabic normalization;
- digit normalization;
- alias matching;
- rule condition evaluation;
- `all` and `any` logic;
- priority ordering;
- include/exclude conflict;
- duplicate removal;
- variant selection;
- question visibility;
- result sorting;
- fee date applicability;
- verification-state calculation;
- WhatsApp message generation;
- local-state migration;
- safe URL validation.

## 26.2 Integration tests

Test:

- public transaction query returns published only;
- researcher role cannot publish;
- reviewer workflow;
- publishing hook triggers revalidation;
- invalid source prevents publication;
- report submission writes sanitized record;
- search index returns aliases;
- transaction deletion/archive relationship behavior;
- migration on clean database;
- audit log creation.

## 26.3 E2E public flows

- home -> search -> transaction -> guide -> result;
- category -> transaction;
- no-result search;
- report changed information;
- checklist persistence;
- edit answers;
- print view;
- mobile menu;
- offline fallback;
- 404 and error recovery;
- outdated warning.

## 26.4 E2E admin flows

- login;
- create draft;
- add source;
- add questions and rules;
- submit for review;
- request changes;
- approve;
- publish;
- verify public visibility;
- archive;
- restore revision;
- triage report;
- role restriction checks.

## 26.5 Accessibility tests

- keyboard-only home and guide;
- skip link;
- focus order;
- modal/drawer focus;
- radio card announcements;
- error announcement;
- progress semantics;
- source links;
- axe checks on home, search, transaction, guide, result, and report pages;
- 200% zoom;
- reduced motion.

## 26.6 Visual QA

Capture screenshots for:

- all required viewport sizes;
- home;
- search results and empty state;
- transaction page;
- every guide state;
- result;
- print preview;
- admin critical forms;
- error and loading states;
- long Arabic copy;
- mixed Arabic/Latin content.

---

# 27. Definition of Done

A feature or phase is done only when:

- acceptance criteria are met;
- code follows the architecture;
- no unresolved TypeScript error;
- lint passes;
- relevant unit/integration tests exist and pass;
- relevant E2E tests exist and pass;
- production build passes;
- mobile and RTL are manually checked;
- accessibility is reviewed;
- error/loading/empty states exist;
- security impact is reviewed;
- documentation is updated;
- no placeholder or invented official data remains;
- no secret is committed;
- the final report states exactly what changed and which commands passed.

“Looks good” is not a Definition of Done.

---

# 28. Cursor Working Rules

## 28.1 Primary rule

Cursor must work one phase at a time. It must not generate the entire application in one uncontrolled pass.

## 28.2 Before writing code

Cursor must:

1. read this file fully;
2. inspect existing files;
3. state the current phase;
4. list assumptions;
5. identify files to create or modify;
6. identify migration impact;
7. identify security and RTL risks;
8. ask only essential blocking questions;
9. avoid replacing working code without reason.

## 28.3 During implementation

Cursor must:

- keep TypeScript strict;
- avoid `any` unless justified and documented;
- never use `@ts-ignore` to hide a design problem;
- never disable ESLint rules globally to pass CI;
- never delete failing tests to claim success;
- never invent official procedure data;
- never expose secrets;
- never place database admin/service keys in client code;
- use migrations for schema changes;
- create small, reviewable changes;
- reuse domain functions instead of duplicating logic;
- write comments for decisions, not obvious syntax;
- preserve Arabic interface copy exactly unless the task changes it;
- use logical CSS properties and verify RTL;
- avoid adding dependencies without explaining why;
- keep public pages server-rendered when possible;
- add error handling and loading states.

## 28.4 Before declaring completion

Cursor must run and report:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For phases with browser flows:

```bash
pnpm test:e2e
```

It must also:

- inspect browser console;
- inspect server logs;
- test at 360px and 1440px;
- verify RTL manually;
- verify no horizontal overflow;
- verify no secret is in client bundle;
- verify database migration status;
- verify all new environment variables are documented;
- state any unresolved warning honestly.

If any command fails, Cursor must not say the phase is complete.

## 28.5 Required phase report format

```text
Phase:
Status: COMPLETE | BLOCKED | PARTIAL

Implemented:
- ...

Files changed:
- ...

Database migrations:
- ...

Tests added:
- ...

Commands executed:
- command -> PASS/FAIL

Manual QA:
- mobile -> PASS/FAIL
- desktop -> PASS/FAIL
- RTL -> PASS/FAIL
- accessibility -> PASS/FAIL

Security notes:
- ...

Known limitations:
- ...

Next recommended phase:
- ...
```

---

# 29. Master Prompt for Cursor

Copy the following prompt into Cursor after placing this roadmap inside `docs/WARAQA_MASTER_ROADMAP_EN.md`:

```text
You are the senior product engineer responsible for building Waraqa (ورقة), an independent Syrian administrative-procedure guidance platform.

Before doing any work, read docs/WARAQA_MASTER_ROADMAP_EN.md completely. Treat it as the single source of truth. The roadmap is written in English, while all public-facing product copy must be Arabic using Syrian conversational wording close to Modern Standard Arabic.

Non-negotiable product rules:
1. Waraqa is not a government website and must never visually or verbally imply that it is official.
2. Do not use any government logo, eagle, seal, flag treatment, ministry emblem, or copied ministry layout.
3. Display the independence disclaimer clearly on the home page, footer, and transaction pages.
4. The public application is Arabic-first with html lang="ar-SY" and dir="rtl".
5. Mobile UX is the priority. Test at 360px before desktop.
6. Do not invent government requirements, fees, durations, laws, or locations.
7. Demo data must be visibly labeled as demo data unless it was verified from reliable sources.
8. Do not collect identity documents, national IDs, or unnecessary personal data.
9. Payload access control must prevent researchers from publishing.
10. Public APIs may return published content only.
11. Use strict TypeScript. Do not silence errors with @ts-ignore, broad any, disabled lint rules, or deleted tests.
12. Work one roadmap phase at a time.
13. Before coding, provide a concise implementation plan for the current phase.
14. After coding, run the required checks and report their actual results.
15. Never claim completion while lint, typecheck, tests, build, migrations, or required E2E checks are failing.

Technical direction:
- Next.js App Router
- Payload CMS
- PostgreSQL
- TypeScript strict mode
- Tailwind CSS
- Zod at custom input boundaries
- Vitest
- Playwright
- pnpm
- Vercel deployment

Architecture principles:
- Keep guide evaluation as pure testable domain logic.
- Keep public data fetching server-side and publication-safe.
- Prefer Server Components.
- Use Client Components only for interaction.
- Use logical CSS properties for RTL.
- Store user-facing strings in Arabic; keep code identifiers in English.
- Use migrations for schema changes.
- Do not introduce microservices or unnecessary infrastructure.

For every phase, use this response structure:
1. Current repository assessment
2. Assumptions and blockers
3. Files to create/modify
4. Implementation steps
5. Implementation
6. Tests and commands executed
7. Manual QA result
8. Security and RTL notes
9. Known limitations
10. Next phase recommendation

Do not start a later phase until the current phase acceptance gate passes or the user explicitly authorizes an exception.
```

---

# 30. First Execution Prompt — Phase 0 Only

```text
Read docs/WARAQA_MASTER_ROADMAP_EN.md completely.

Perform Phase 0 only: Decisions and Compatibility Audit.

Do not implement product pages, Payload collections, or UI components yet.

Tasks:
1. Inspect the repository and report its current state.
2. Verify current official compatibility among Node.js, Next.js, React, Payload CMS, the Payload PostgreSQL adapter, TypeScript, and the intended Vercel deployment model.
3. Recommend exact versions and explain the compatibility basis.
4. Confirm whether Supabase PostgreSQL is suitable for this deployment and list any connection or pooling constraints that must be handled.
5. Define the environment-variable contract without exposing real secrets.
6. Create or propose:
   - docs/ARCHITECTURE.md
   - docs/ADR/0001-stack.md
   - docs/SECURITY.md
   - .env.example
   - a phase checklist
7. Identify the main risks related to Payload + Next.js deployment, migrations, database connections, Arabic RTL, and free-tier limits.
8. Do not install dependencies or write feature code until the audit is reviewed.

Output the Phase 0 report using the mandatory report format in the roadmap.
```

---

# 31. TechTown Demo Script

Target demo length: 5–7 minutes.

## 31.1 Opening: the problem

Arabic speaking point:

> اليوم أي شخص بدو يعمل معاملة ممكن يضيع بين مواقع مختلفة، منشورات قديمة، وأسئلة ما إلها جواب واضح. وغالباً بيطلع من البيت وبيرجع لأن ورقة ناقصته أو لأن التعليمات تغيّرت.

## 31.2 Explain Waraqa

> ورقة منصة إرشادية مستقلة. ما بتنفذ المعاملة، وما بتدّعي إنها جهة حكومية. هي بتساعد الشخص يعرف المطلوب حسب حالته، مع مصدر وتاريخ تحقق لكل معلومة مهمة.

## 31.3 Live flow

1. Open home page on a phone-sized viewport.
2. Search using an everyday alias such as “لا حكم عليه”.
3. Open the official transaction page.
4. Point to the visible independent-platform disclaimer.
5. Start the guide.
6. Answer two or three questions.
7. Show personalized documents and steps.
8. Check one document.
9. Show the source and last-verified date.
10. Show WhatsApp share and print.
11. Submit a changed-information report.

## 31.4 Admin demonstration

1. Log into a restricted researcher account.
2. Show that the researcher can draft but cannot publish.
3. Add or edit a source.
4. Submit for review.
5. Switch to reviewer/admin if appropriate.
6. Approve and publish.
7. Show revision history and audit event.

## 31.5 Business/partnership ask

> نبحث عن احتضان استراتيجي، مساعدة بالتحقق القانوني والمحتوى، وربط مع جهات ومراكز خدمة لإطلاق تجربة تجريبية. الملكية الفكرية والكود يبقوا ضمن المشروع، وأي تعاون أو استثمار بيكون بعقد واضح.

---

# 32. Risks and Mitigations

## 32.1 Outdated information

Risk: Instructions, fees, and locations change.

Mitigation:

- verification dates;
- review-due policy;
- source records;
- user reports;
- clear uncertainty labels;
- dashboard alerts;
- no automatic unreviewed publishing.

## 32.2 Appearance of being governmental

Risk: Users may assume the product is official.

Mitigation:

- visible disclaimer;
- independent logo;
- no official symbols;
- distinct layout;
- methodology page;
- neutral domain and metadata;
- legal review before public launch.

## 32.3 Rule engine complexity

Risk: Incorrect conditions create wrong results.

Mitigation:

- constrained typed operators;
- no arbitrary expressions;
- preview fired rules;
- strong unit tests;
- publication validation;
- start with five procedures;
- prefer variants for large scenario differences.

## 32.4 Weak internet

Risk: Users abandon slow pages.

Mitigation:

- server rendering;
- small JS bundles;
- optimized fonts and images;
- no heavy analytics;
- local progress persistence;
- simple offline fallback;
- performance budgets.

## 32.5 Idea copying

Risk: A competitor copies the concept.

Mitigation:

- private repository;
- documented commit history;
- trademark/name review later;
- retain control of hosting and accounts;
- build trusted data and workflow, which are harder to copy than UI;
- do not share source code in a sales demo;
- use contracts before sharing confidential implementation details.

## 32.6 Unverified content

Risk: Demo data is mistaken for official truth.

Mitigation:

- visible demo labels;
- source-required publication;
- reviewer role;
- verification status;
- no fabricated information;
- hide incomplete procedures from public search.

## 32.7 Free-tier constraints

Risk: database pausing, connection limits, build limits, or bandwidth restrictions.

Mitigation:

- verify current provider limits in Phase 0;
- use connection pooling correctly;
- minimize preview environments hitting production DB;
- monitor usage;
- document upgrade path;
- keep architecture portable.

## 32.8 Security compromise

Risk: unauthorized publishing or data modification.

Mitigation:

- strong admin passwords;
- role-based access;
- secure cookies;
- audit logs;
- limited accounts;
- dependency updates;
- backups;
- optional MFA later;
- no public database credentials.

---

# 33. Post-MVP Roadmap

## Stage 2 — Content Expansion

- 20–30 verified procedures;
- more governorates;
- better center directory;
- source health checking;
- editorial dashboard improvements;
- richer Arabic search;
- public changelog.

## Stage 3 — Service Office Edition

- multi-tenant organizations;
- customer cases;
- missing-document tracking;
- role-based office teams;
- branded share pages;
- subscriptions;
- export and reports;
- contracts and privacy separation.

## Stage 4 — Partner and Institutional Integrations

- public API;
- embeddable procedure widget;
- university or NGO portals;
- appointment/deep links where officially supported;
- verified partner badges;
- service-center status updates;
- organization-specific content overlays.

## Stage 5 — Carefully Governed AI Assistance

Only after the content base is mature:

- retrieval-based assistant restricted to approved Waraqa content;
- every answer includes citations;
- no legal guarantees;
- no unsourced generation;
- refusal when evidence is missing;
- evaluation set for Arabic correctness and hallucination prevention.

---

# 34. Start Decision

The project may begin when all of the following are accepted:

- Waraqa is an independent guidance platform, not a government portal.
- The roadmap document remains in English for engineering clarity.
- The public interface remains Arabic (`ar-SY`) with correct RTL.
- Arabic copy uses a Syrian conversational style close to formal Arabic.
- The visual identity is Syrian-inspired but not official or copied.
- Payload CMS + PostgreSQL is the preferred MVP backend/content stack, subject to Phase 0 compatibility verification.
- The MVP begins with five verified procedures.
- Cursor works phase by phase and cannot claim completion before all required checks pass.
- No custom domain is required for the first demo.
- No unverified government information may be presented as fact.

**Final instruction:** Place this file at `docs/WARAQA_MASTER_ROADMAP_EN.md`, commit it before implementation, and start with Phase 0 only.
