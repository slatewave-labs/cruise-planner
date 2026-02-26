import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ExternalLink,
  Info,
  Database,
  Settings,
  Cookie,
  Globe,
  Server,
  Clock,
  UserCheck,
  Plane,
  Users,
  RefreshCw,
  Mail,
} from 'lucide-react';

const LAST_UPDATED = 'February 2026';

const sections = [
  {
    number: 1,
    icon: Info,
    title: 'Introduction',
    description:
      'Who we are and what this Privacy Policy covers.',
    paragraphs: [
      'ShoreExplorer ("we", "us", or "our") is a cruise port day-trip planning tool that helps travellers create personalised shore excursion itineraries using artificial intelligence, weather data, interactive maps, and curated activity information.',
      'This Privacy Policy explains how we collect, use, store, and protect your information when you use the ShoreExplorer website and application (the "Service"). It also describes your rights regarding your personal data and how you can exercise them.',
      'We are committed to protecting your privacy and handling your data transparently. ShoreExplorer does not require you to create an account or provide personally identifiable information (such as your name or email address) to use the Service.',
    ],
    terms: [],
    subsections: [],
    url: null,
    linkLabel: null,
    hasTermsLink: true,
  },
  {
    number: 2,
    icon: Database,
    title: 'Information We Collect',
    description:
      'The types of information we collect and how we collect them.',
    paragraphs: [
      'We collect limited information to provide and improve the Service. ShoreExplorer is designed with a privacy-first approach — we do not require registration, and we minimise the data we collect.',
    ],
    terms: [],
    subsections: [
      {
        heading: '(a) Information You Provide',
        items: [
          'Trip details: cruise ship name, cruise line, port destinations, travel dates, and arrival/departure times that you enter when setting up a trip.',
          'Preferences and group information: activity preferences (e.g. culture, food, adventure), mobility requirements, group composition (e.g. travelling with children, seniors), and budget preferences that you select when generating a day plan.',
          'These details are used solely to generate personalised shore excursion plans and are not linked to your real-world identity.',
        ],
      },
      {
        heading: '(b) Automatically Collected Information',
        items: [
          'Device identifier: When you first use ShoreExplorer, a random UUID (Universally Unique Identifier) is generated and stored in your browser\'s localStorage. This anonymous identifier is sent to our backend as an X-Device-Id header to associate your trips with your device. It does not identify you personally.',
          'localStorage data: Trip data, generated day plans, and your cookie consent preferences are stored locally on your device using your browser\'s localStorage. This data does not leave your device unless you actively generate a plan or save a trip.',
        ],
      },
      {
        heading: '(c) Analytics Data',
        items: [
          'Google Analytics: We use Google Analytics to collect anonymised, aggregated usage data including pages visited, session duration, device type, browser type, referring pages, and approximate geographic region (country/city level).',
          'Google Analytics uses cookies to collect this information. The data is anonymised and cannot be used to identify you personally. IP anonymisation is enabled.',
        ],
      },
      {
        heading: '(d) Data Shared with Third-Party Services',
        items: [
          'Groq API (AI plan generation): When you generate a day plan, your port destination, travel dates, activity preferences, mobility requirements, and group composition are sent to the Groq Cloud API for AI processing. No personally identifiable information (name, email, device ID) is sent to Groq.',
          'Open-Meteo API (weather data): Latitude and longitude coordinates of your port destination, along with travel dates, are sent to the Open-Meteo API to retrieve weather forecasts. No personally identifiable information is sent to Open-Meteo.',
        ],
      },
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 3,
    icon: Settings,
    title: 'How We Use Your Information',
    description:
      'The purposes for which we process your data.',
    paragraphs: [
      'We process your information only for legitimate purposes directly related to providing and improving the Service. We do not sell, rent, or share your data with third parties for marketing purposes.',
    ],
    terms: [
      'Service delivery: To generate personalised AI-powered day plans based on your trip details, preferences, and group composition.',
      'Weather integration: To display relevant weather forecasts for your port destinations on your travel dates.',
      'Trip management: To save and retrieve your trip data and generated plans so you can access them across sessions on the same device.',
      'Analytics and improvements: To understand how the Service is used, identify popular features, diagnose technical issues, and prioritise development efforts.',
      'Security: To detect and prevent abuse, fraud, or technical issues that could harm the Service or its users.',
      'Legal compliance: To comply with applicable laws, regulations, and legal processes.',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 4,
    icon: Cookie,
    title: 'Cookies & Similar Technologies',
    description:
      'How we use cookies, localStorage, and similar technologies.',
    paragraphs: [
      'ShoreExplorer uses a limited number of cookies and browser storage mechanisms. When you first visit ShoreExplorer, a cookie consent banner allows you to accept or decline non-essential cookies. Your preference is stored in localStorage.',
    ],
    terms: [],
    subsections: [
      {
        heading: 'Essential Storage (Always Active)',
        items: [
          'localStorage — Trip Data: Stores your saved trips, generated day plans, and trip preferences locally on your device. Required for the Service to function. No expiry (persists until you clear browser data).',
          'localStorage — Device ID: Stores your anonymous UUID device identifier. Used to associate trips with your device on our backend. No expiry (persists until you clear browser data).',
          'localStorage — Cookie Consent: Stores your cookie consent preference (accepted or declined). No expiry (persists until you clear browser data).',
        ],
      },
      {
        heading: 'Analytics Cookies (Require Consent)',
        items: [
          '_ga (Google Analytics): Distinguishes unique users. Duration: 2 years. Set by Google.',
          '_ga_[ID] (Google Analytics): Maintains session state. Duration: 2 years. Set by Google.',
          'These cookies collect anonymised usage data such as pages visited, session duration, and device type. They do not track you across other websites. You can opt out via the cookie banner or your browser settings.',
        ],
      },
      {
        heading: 'Third-Party Cookies (Affiliate Partners)',
        items: [
          'When you click an affiliate link to a third-party booking platform (such as Viator, GetYourGuide, Klook, TripAdvisor, or Booking.com), that platform may set its own cookies on your device.',
          'ShoreExplorer has no control over third-party cookies. Please review the cookie policies of any third-party sites you visit through our links.',
        ],
      },
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 5,
    icon: Globe,
    title: 'Third-Party Services',
    description:
      'External services we integrate with and what data is shared with each.',
    paragraphs: [
      'ShoreExplorer integrates with several third-party services to provide its features. Each service receives only the minimum data necessary for its function.',
    ],
    terms: [],
    subsections: [
      {
        heading: 'Groq Cloud API (AI Processing)',
        items: [
          'Purpose: Generates AI-powered shore excursion day plans using the Llama large language model.',
          'Data shared: Port destination, travel dates, activity preferences, mobility requirements, group composition.',
          'Data NOT shared: Device ID, IP address, name, email, or any personally identifiable information.',
          'Groq\'s data processing is governed by their Terms of Service and Privacy Policy.',
        ],
        url: 'https://groq.com/privacy-policy/',
        linkLabel: 'Groq Privacy Policy',
      },
      {
        heading: 'Open-Meteo API (Weather Data)',
        items: [
          'Purpose: Provides weather forecast data for port destinations.',
          'Data shared: Latitude/longitude coordinates and date ranges.',
          'Data NOT shared: Device ID, IP address (beyond standard HTTP requests), or any personally identifiable information.',
          'Open-Meteo is an open-source weather API licensed under CC BY 4.0.',
        ],
        url: 'https://open-meteo.com/en/terms',
        linkLabel: 'Open-Meteo Terms',
      },
      {
        heading: 'Google Analytics',
        items: [
          'Purpose: Anonymised usage analytics to improve the Service.',
          'Data shared: Page views, session duration, device type, browser type, approximate location (country/city), referring pages.',
          'IP anonymisation is enabled. No personally identifiable information is collected.',
        ],
        url: 'https://policies.google.com/privacy',
        linkLabel: 'Google Privacy Policy',
      },
      {
        heading: 'OpenStreetMap & Leaflet (Maps)',
        items: [
          'Purpose: Displays interactive maps of port destinations and activity locations.',
          'Data shared: Standard HTTP request data (IP address) when map tiles are loaded from OpenStreetMap tile servers.',
          'Map data is licensed under the Open Data Commons Open Database License (ODbL).',
        ],
        url: 'https://wiki.osmfoundation.org/wiki/Privacy_Policy',
        linkLabel: 'OpenStreetMap Privacy Policy',
      },
      {
        heading: 'Affiliate Partners (Viator, GetYourGuide, Klook, TripAdvisor, Booking.com)',
        items: [
          'Purpose: Provides links to book tours, activities, and experiences at port destinations.',
          'Data shared: When you click an affiliate link, the third-party platform receives standard HTTP referral data. ShoreExplorer does not transmit your trip data or preferences to affiliate partners.',
          'Each affiliate partner has its own privacy policy and cookie practices. We encourage you to review them before making a purchase.',
        ],
        affiliateLinks: [
          { name: 'Viator', url: 'https://www.viator.com/privacyPolicy' },
          { name: 'GetYourGuide', url: 'https://www.getyourguide.com/privacy-policy' },
          { name: 'Klook', url: 'https://www.klook.com/en-GB/policy/' },
          { name: 'TripAdvisor', url: 'https://www.tripadvisor.com/pages/privacy.html' },
          { name: 'Booking.com', url: 'https://www.booking.com/content/privacy.html' },
        ],
        url: null,
        linkLabel: null,
      },
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 6,
    icon: Server,
    title: 'Data Storage & Security',
    description:
      'How and where your data is stored and the measures we take to protect it.',
    paragraphs: [
      'We take the security of your data seriously and implement appropriate technical and organisational measures to protect it.',
    ],
    terms: [
      'Client-side storage: Trip data, generated plans, your device ID, and cookie preferences are stored in your browser\'s localStorage on your own device. This data is under your control and can be cleared at any time through your browser settings.',
      'Backend infrastructure: Our backend services are hosted on Amazon Web Services (AWS) in the US East (Virginia / us-east-1) region. AWS provides industry-leading physical security, network security, and compliance certifications including ISO 27001 and SOC 1/2/3.',
      'Encryption in transit: All data transmitted between your device and ShoreExplorer\'s servers is encrypted using TLS (Transport Layer Security / HTTPS).',
      'Encryption at rest: Data stored on our backend servers is encrypted at rest using AWS-managed encryption keys.',
      'No account system: ShoreExplorer does not use passwords, email addresses, or user accounts. There are no login credentials to be compromised.',
      'Access controls: Access to backend systems and databases is restricted to authorised personnel only and protected by multi-factor authentication.',
      'Incident response: In the unlikely event of a data breach, we will notify affected users and relevant supervisory authorities in accordance with applicable data protection laws.',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 7,
    icon: Clock,
    title: 'Data Retention',
    description:
      'How long we keep your data and when it is deleted.',
    paragraphs: [
      'We retain data only for as long as necessary to fulfil the purposes described in this Privacy Policy.',
    ],
    terms: [
      'localStorage data: Data stored in your browser\'s localStorage (trips, plans, device ID, cookie preferences) persists until you manually clear your browser data, clear site data for ShoreExplorer, or uninstall your browser. We have no ability to remotely delete localStorage data.',
      'Backend trip data: Trip data stored on our servers is retained for up to 12 months from the date of your last interaction with the Service. After this period, inactive trip data is automatically purged.',
      'AI-generated plans: Generated day plans are stored on our backend to allow you to retrieve them. They follow the same 12-month retention period as trip data.',
      'Analytics data: Google Analytics data is retained for 14 months, in accordance with Google\'s default data retention settings. After this period, data is automatically deleted by Google.',
      'Server logs: Technical server logs (which may contain IP addresses and request metadata) are retained for a maximum of 90 days for debugging and security purposes, after which they are automatically deleted.',
      'You can request early deletion of your backend data at any time by contacting us (see Section 12).',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 8,
    icon: UserCheck,
    title: 'Your Privacy Rights',
    description:
      'Your data protection rights under applicable privacy laws worldwide.',
    paragraphs: [
      'Depending on your location, you may have specific data protection rights under applicable privacy laws. Below we describe the rights available under the EU/UK General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other applicable frameworks. You can exercise any of these rights by contacting us at the email address in Section 12.',
    ],
    terms: [
      'Right of access: You have the right to request a copy of the personal data we hold about you. Because ShoreExplorer uses anonymous device identifiers rather than personal accounts, you will need to provide your device ID (found in your browser\'s localStorage under the key used by the application) to help us locate your data.',
      'Right to rectification: You have the right to request correction of any inaccurate or incomplete personal data we hold about you.',
      'Right to erasure ("right to be forgotten"): You have the right to request deletion of your personal data. For localStorage data, you can delete this yourself through your browser settings. For backend data, contact us with your device ID and we will delete your records.',
      'Right to restrict processing: You have the right to request that we limit how we process your data in certain circumstances, for example while we investigate a complaint.',
      'Right to data portability: You have the right to receive your personal data in a structured, commonly used, machine-readable format (such as JSON) and to transmit it to another controller.',
      'Right to object: You have the right to object to our processing of your data where we rely on legitimate interests as the legal basis. You can also object to processing for analytics purposes by declining cookies via the consent banner.',
      'Right to withdraw consent: Where we process data based on your consent (e.g. analytics cookies), you can withdraw consent at any time by clearing your cookies or adjusting your preferences via the cookie banner. Withdrawal of consent does not affect the lawfulness of processing carried out before withdrawal.',
      'California residents (CCPA/CPRA): If you are a California resident, you have the right to know what personal information we collect, the right to delete your personal information, the right to opt out of the sale or sharing of personal information (note: ShoreExplorer does not sell your personal information), and the right to non-discrimination for exercising your privacy rights. To submit a verifiable consumer request, contact us at the email address in Section 12.',
      'Other US state privacy laws: Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), and other states with comprehensive privacy legislation may have similar rights to access, delete, and opt out of certain data processing. Contact us to exercise these rights.',
      'We will respond to all data rights requests within 30 days (or within the time frame required by applicable law). There is no fee for exercising your rights, unless requests are manifestly unfounded or excessive.',
      'If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection supervisory authority. In the UK, this is the Information Commissioner\'s Office (ICO). In the EU, contact your national data protection authority. In the US, you may contact your state attorney general\'s office.',
    ],
    subsections: [],
    url: 'https://ico.org.uk/make-a-complaint/',
    linkLabel: 'ICO — Make a Complaint',
  },
  {
    number: 9,
    icon: Plane,
    title: 'International Data Transfers',
    description:
      'Where your data is processed and the safeguards in place for cross-border transfers.',
    paragraphs: [
      'ShoreExplorer\'s infrastructure and third-party service providers are located in multiple jurisdictions. We ensure that appropriate safeguards are in place for any international transfers of personal data.',
    ],
    terms: [
      'AWS (hosting): Our primary backend infrastructure is hosted in AWS US East (Virginia / us-east-1), within the United States. Data stored on our servers remains within this region unless otherwise specified.',
      'Groq Cloud API (AI processing): The Groq API processes data in the United States. Data sent to Groq (port destination, dates, preferences) does not include personally identifiable information. Transfers are protected by Groq\'s data processing agreements and Standard Contractual Clauses (SCCs) where applicable.',
      'Google Analytics: Google processes analytics data globally, including in the United States. Google has implemented Standard Contractual Clauses and other safeguards for international data transfers in accordance with GDPR requirements.',
      'Open-Meteo API (weather data): Open-Meteo is operated from within the European Union. Weather API requests (latitude, longitude, dates) do not contain personally identifiable information.',
      'OpenStreetMap tile servers: Map tile requests are served by globally distributed servers operated by the OpenStreetMap Foundation. Only standard HTTP request data (IP address) is shared.',
      'Where data is transferred outside the EEA or UK, we rely on adequacy decisions, Standard Contractual Clauses, or other lawful transfer mechanisms as required by GDPR.',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 10,
    icon: Users,
    title: 'Children\'s Privacy',
    description:
      'Our policy regarding the use of the Service by children.',
    paragraphs: [
      'ShoreExplorer is designed for adult travellers and is not directed at children under the age of 16.',
    ],
    terms: [
      'We do not knowingly collect personal data from children under 16 years of age. Because ShoreExplorer does not require account registration or the provision of personal details, we have limited means of verifying user age.',
      'If you are a parent or guardian and believe your child has provided personal data to ShoreExplorer, please contact us at the email address in Section 12. We will take steps to delete any such data promptly.',
      'If we become aware that we have inadvertently collected personal data from a child under 16, we will delete that data as soon as reasonably practicable.',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 11,
    icon: RefreshCw,
    title: 'Changes to This Policy',
    description:
      'How we will notify you of updates to this Privacy Policy.',
    paragraphs: [],
    terms: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.',
      'When we make material changes, we will update the "Last Updated" date at the top of this page. For significant changes, we may also provide a prominent notice within the Service (such as a banner or notification).',
      'Your continued use of the Service after any changes to this Privacy Policy constitutes your acceptance of the updated policy. If you do not agree with the revised policy, you should stop using the Service and clear your browser\'s localStorage data for ShoreExplorer.',
      'We encourage you to review this page periodically to stay informed about how we protect your information.',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 12,
    icon: Mail,
    title: 'Contact Us',
    description:
      'How to reach us with privacy questions or data requests.',
    paragraphs: [
      'If you have any questions about this Privacy Policy, wish to exercise your data protection rights, or have concerns about how we handle your information, please contact us:',
    ],
    terms: [
      'Email: hello@slatewave-labs.com',
      'For data protection enquiries, please include "Privacy / Data Request" in the subject line of your email so we can direct your message to the appropriate team.',
      'When making a data access, portability, or deletion request, please include your device ID (found in your browser\'s developer tools under Application → localStorage) so we can locate your data.',
      'We aim to respond to all privacy-related enquiries within 30 days, or within the time frame required by applicable law in your jurisdiction.',
    ],
    subsections: [],
    url: null,
    linkLabel: null,
  },
];

export default function PrivacyPolicy() {
  return (
    <div
      className="min-h-screen bg-secondary px-4 md:px-8 py-8 md:py-12"
      data-testid="privacy-page"
    >
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary">
            Privacy Policy
          </h1>
        </div>
        <p className="text-stone-600 font-body mb-2 ml-[52px]">
          How ShoreExplorer collects, uses, stores, and protects your
          information.
        </p>
        <p className="text-sm text-stone-400 font-body mb-8 ml-[52px]">
          Last Updated: {LAST_UPDATED}
        </p>

        {/* Introductory note */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
          <p className="font-body text-stone-600 text-sm leading-relaxed">
            Your privacy matters to us. ShoreExplorer is designed with a
            privacy-first approach — we do not require account registration,
            we do not collect your name or email to use the Service, and we
            minimise the data we process. This policy explains exactly what
            information we collect, why we collect it, and what rights you
            have. Please also review our{' '}
            <Link
              to="/terms"
              className="text-accent font-semibold hover:underline"
            >
              Terms &amp; Conditions
            </Link>{' '}
            for the full terms governing your use of ShoreExplorer.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-8">
          <h2 className="font-heading text-lg font-bold text-primary mb-4">
            Table of Contents
          </h2>
          <nav aria-label="Privacy policy sections navigation">
            <ol className="space-y-1.5">
              {sections.map((section) => (
                <li key={section.number}>
                  <a
                    href={`#privacy-section-${section.number}`}
                    className="font-body text-sm text-stone-600 hover:text-accent transition-colors"
                  >
                    {section.number}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={section.number}
                id={`privacy-section-${section.number}`}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm scroll-mt-24"
                data-testid={`privacy-section-${i}`}
              >
                {/* Section heading */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Icon
                      className="w-4 h-4 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="font-heading text-xl font-bold text-primary">
                    {section.number}. {section.title}
                  </h2>
                </div>

                {/* Description */}
                <p className="font-body text-sm text-stone-500 mb-4 ml-11">
                  {section.description}
                </p>

                {/* Prose paragraphs */}
                {section.paragraphs.length > 0 && (
                  <div className="space-y-3 mb-4 ml-11">
                    {section.paragraphs.map((para, pIdx) => (
                      <p
                        key={pIdx}
                        className="font-body text-sm text-stone-600 leading-relaxed"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {/* Bullet terms */}
                {section.terms.length > 0 && (
                  <ul className="space-y-3 mb-4 ml-11">
                    {section.terms.map((term, j) => (
                      <li
                        key={j}
                        className="font-body text-sm text-stone-600 leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-accent mt-1 shrink-0 font-bold">
                          •
                        </span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Sub-sections (for sections with grouped content) */}
                {section.subsections && section.subsections.length > 0 && (
                  <div className="space-y-5 ml-11">
                    {section.subsections.map((sub, sIdx) => (
                      <div key={sIdx}>
                        <h3 className="font-body text-sm font-bold text-primary mb-2">
                          {sub.heading}
                        </h3>
                        <ul className="space-y-2">
                          {sub.items.map((item, iIdx) => (
                            <li
                              key={iIdx}
                              className="font-body text-sm text-stone-600 leading-relaxed flex items-start gap-2"
                            >
                              <span className="text-accent mt-1 shrink-0 font-bold">
                                •
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {/* Sub-section external link */}
                        {sub.url && (
                          <div className="mt-2">
                            <a
                              href={sub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline min-h-[48px]"
                            >
                              <ExternalLink
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                              />
                              {sub.linkLabel || 'Learn More'}
                            </a>
                          </div>
                        )}
                        {/* Affiliate partner links */}
                        {sub.affiliateLinks && sub.affiliateLinks.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                            {sub.affiliateLinks.map((link, aIdx) => (
                              <a
                                key={aIdx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline min-h-[48px]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                {link.name} Privacy Policy
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Terms page cross-link */}
                {section.hasTermsLink && (
                  <div className="ml-11 mb-4">
                    <Link
                      to="/terms"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline min-h-[48px]"
                    >
                      <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                      View our Terms &amp; Conditions
                    </Link>
                  </div>
                )}

                {/* Section-level external link */}
                {section.url && (
                  <div className="ml-11">
                    <a
                      href={section.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline min-h-[48px]"
                      data-testid={`privacy-link-${i}`}
                    >
                      <ExternalLink
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                      {section.linkLabel || 'Learn More'}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 mb-4 text-center">
          <p className="font-body text-xs text-stone-400 leading-relaxed">
            © {new Date().getFullYear()} ShoreExplorer. All rights reserved.
            <br />
            This Privacy Policy was last updated on {LAST_UPDATED}.
            <br />
            Questions? Contact us at{' '}
            <a
              href="mailto:hello@slatewave-labs.com"
              className="text-accent hover:underline"
            >
              hello@slatewave-labs.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}