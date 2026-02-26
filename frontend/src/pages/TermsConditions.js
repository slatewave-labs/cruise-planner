import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ExternalLink, Shield, Scale, Globe, Brain, Map, MapPin, ShoppingBag, BarChart3, Server, UserCheck, Info, BookOpen, Gavel, Mail } from 'lucide-react';

const LAST_UPDATED = 'February 2026';

const sections = [
  {
    number: 1,
    icon: Scale,
    title: 'Acceptance of Terms',
    description:
      'Please read these Terms of Use carefully before using ShoreExplorer.',
    paragraphs: [
      'By accessing or using ShoreExplorer (the "Service"), including our website and any associated applications, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, you must not access or use the Service.',
      'These Terms constitute a legally binding agreement between you ("User", "you", or "your") and Slatewave Labs ("we", "us", or "our"), the developer and operator of ShoreExplorer. Your continued use of the Service following the posting of any changes to these Terms constitutes acceptance of those changes.',
      'We recommend that you review these Terms periodically to stay informed of any updates. If you are using the Service on behalf of an organisation, you represent and warrant that you have the authority to bind that organisation to these Terms.',
    ],
    terms: [],
    url: null,
    linkLabel: null,
  },
  {
    number: 2,
    icon: Info,
    title: 'Service Description',
    description:
      'What ShoreExplorer does — and what it does not do.',
    paragraphs: [
      'ShoreExplorer is a cruise port day-trip planning tool that helps travellers create personalised shore excursion itineraries. The Service uses artificial intelligence, weather data, mapping technology, and curated activity information to generate suggested day plans for cruise port visits.',
    ],
    terms: [
      'ShoreExplorer generates AI-powered day plans with suggested activities, walking routes, estimated costs, and timing recommendations for cruise port stops.',
      'The Service provides weather forecasts, interactive maps, and optional route exports to assist with trip planning.',
      'ShoreExplorer may display links to third-party booking platforms where you can purchase tours, tickets, or experiences. We do not sell, fulfil, or guarantee any third-party products or services.',
      'The Service is intended as a planning aid only. It does not replace professional travel advice, and all information should be independently verified before you travel.',
      'ShoreExplorer does not process payments, issue tickets, or handle bookings directly. All transactions occur on third-party platforms under their own terms and conditions.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 3,
    icon: Globe,
    title: 'Open-Meteo Weather API',
    description:
      'ShoreExplorer uses the Open-Meteo API to provide weather forecast data for your cruise port destinations.',
    paragraphs: [
      'Weather information displayed within ShoreExplorer is sourced from the Open-Meteo API, an open-source weather forecast service that aggregates data from leading national meteorological agencies worldwide.',
    ],
    terms: [
      'Open-Meteo data is licensed under CC BY 4.0 (Creative Commons Attribution 4.0 International). Attribution: "Weather data by Open-Meteo.com".',
      'Data sources include, but are not limited to, NOAA GFS (United States), DWD ICON (Germany), Météo-France, JMA (Japan), MET Norway, ECMWF, and the Canadian Meteorological Centre.',
      'The Open-Meteo API is free for non-commercial use with limited daily API calls. Commercial use requires a paid API subscription.',
      'Weather forecasts are estimates based on meteorological models and may not accurately reflect actual conditions at the time of your visit. Always check local conditions and official maritime weather advisories before going ashore.',
      'Forecast accuracy decreases significantly beyond 7 days. Plans generated well in advance of your port visit may include weather data that changes substantially as the date approaches.',
    ],
    url: 'https://open-meteo.com/en/terms',
    linkLabel: 'Open-Meteo Terms & Licence',
  },
  {
    number: 4,
    icon: Brain,
    title: 'Groq AI / Llama 3.3 70B (Plan Generation)',
    description:
      'Day plans are generated using Meta\'s Llama 3.3 70B large language model, hosted and served via the Groq inference platform.',
    paragraphs: [
      'ShoreExplorer uses artificial intelligence to generate personalised shore excursion itineraries. The AI model (Llama 3.3 70B) is accessed through the Groq Cloud API. It is important that you understand the limitations and responsibilities associated with AI-generated content.',
    ],
    terms: [
      'All AI-generated day plans, activity descriptions, cost estimates, time recommendations, and route suggestions are provided as informational suggestions only. They must not be relied upon as definitive, accurate, or up-to-date travel advice.',
      'AI-generated content may contain factual inaccuracies, including incorrect locations, outdated opening hours, wrong pricing, non-existent establishments, or unsafe route suggestions. You must independently verify all details before acting on them.',
      'The AI model does not have access to real-time data. Information about business closures, seasonal changes, local events, construction, or safety advisories will not be reflected in generated plans.',
      'Use of the Groq Cloud API is subject to Groq\'s Terms of Service and Acceptable Use Policy. ShoreExplorer transmits your port destination, travel date, preferences, and mobility requirements to the Groq API for plan generation. No personally identifiable information (such as your name or email) is sent.',
      'Llama 3.3 70B is developed by Meta and released under the Llama 3.3 Community Licence Agreement. ShoreExplorer\'s use of this model complies with Meta\'s acceptable use policy.',
      'ShoreExplorer does not guarantee the availability, speed, or uninterrupted operation of the AI plan generation service. Groq API outages or rate limits may temporarily prevent plan generation.',
    ],
    url: 'https://groq.com/terms-of-use/',
    linkLabel: 'Groq Terms of Use',
  },
  {
    number: 5,
    icon: Map,
    title: 'OpenStreetMap & Leaflet (Interactive Maps)',
    description:
      'Map visualisation is powered by Leaflet.js using OpenStreetMap tile data and contributor-generated geographic information.',
    paragraphs: [
      'ShoreExplorer displays interactive maps to help you visualise activity locations, walking routes, and points of interest in your port destination. These maps rely on open-source software and openly licensed geographic data.',
    ],
    terms: [
      'OpenStreetMap (OSM) geographic data is licensed under the Open Data Commons Open Database License (ODbL 1.0). You are free to copy, distribute, and adapt OSM data, provided you credit OpenStreetMap and its contributors and distribute any adapted data under the same licence.',
      'Map tile imagery is © OpenStreetMap contributors. The cartographic design of the tiles is licensed under the Creative Commons Attribution-ShareAlike 2.0 licence (CC BY-SA 2.0).',
      'Leaflet.js is an open-source JavaScript library released under the BSD 2-Clause licence.',
      'If you take screenshots or share images of maps from ShoreExplorer, you must include the attribution: "© OpenStreetMap contributors".',
      'Map data may not always reflect current road layouts, paths, building footprints, or points of interest. Verify routes and locations locally, especially in areas with recent construction or redevelopment.',
    ],
    url: 'https://www.openstreetmap.org/copyright',
    linkLabel: 'OpenStreetMap Copyright & Licence',
  },
  {
    number: 6,
    icon: MapPin,
    title: 'Google Maps (Route Export)',
    description:
      'ShoreExplorer allows you to export your day plan route to Google Maps for turn-by-turn navigation.',
    paragraphs: [
      'When you choose to export a route, ShoreExplorer constructs a Google Maps URL containing the waypoints from your day plan. You are then redirected to the Google Maps application or website.',
    ],
    terms: [
      'Google Maps is a product of Google LLC. Your use of Google Maps is governed by the Google Maps Platform Terms of Service and Google\'s general Terms of Service.',
      'Route directions, walking distances, and estimated travel times provided by Google Maps are approximations and may vary based on real-time conditions, closures, and routing changes.',
      'ShoreExplorer has no control over the accuracy, availability, or functionality of Google Maps. We are not responsible for any issues arising from your use of Google Maps, including incorrect directions or navigation errors.',
      'Google Maps may collect data about your location and usage in accordance with Google\'s Privacy Policy. Please review Google\'s privacy practices separately.',
    ],
    url: 'https://cloud.google.com/maps-platform/terms',
    linkLabel: 'Google Maps Platform Terms',
  },
  {
    number: 7,
    icon: ShoppingBag,
    title: 'Affiliate Partners & Booking Links',
    description:
      'ShoreExplorer may display links to third-party booking platforms including Viator, GetYourGuide, Klook, TripAdvisor, and Booking.com.',
    paragraphs: [
      'To help you book activities, tours, and experiences at your port destinations, ShoreExplorer may include links to third-party platforms. Some of these links are affiliate links, which means we may earn a commission if you make a purchase through them.',
    ],
    terms: [
      'Affiliate Disclosure: ShoreExplorer participates in affiliate programmes operated by Viator (a TripAdvisor company), GetYourGuide, Klook, TripAdvisor, and Booking.com, among others. When you click an affiliate link and make a purchase, ShoreExplorer may receive a small commission at no additional cost to you.',
      'The inclusion of any third-party link does not constitute an endorsement, recommendation, or guarantee of that provider\'s products, services, quality, safety, or reliability. We do not vet, audit, or verify individual tour operators or experience providers listed on these platforms.',
      'All bookings made through affiliate links are governed entirely by the terms and conditions, cancellation policies, and privacy policies of the respective third-party platform. ShoreExplorer is not a party to any transaction between you and a third-party provider.',
      'Prices, availability, tour descriptions, and reviews displayed on third-party platforms may change at any time without notice to ShoreExplorer. The information shown in your day plan may differ from what is currently available on the booking platform.',
      'If you experience any issues with a booking made through an affiliate link — including cancellations, refunds, disputes, or quality concerns — you must contact the third-party platform or tour operator directly. ShoreExplorer cannot intervene in or resolve third-party booking disputes.',
      'Affiliate commissions help fund the continued development and free availability of ShoreExplorer. We are committed to displaying relevant, high-quality suggestions regardless of affiliate relationship status.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 8,
    icon: BarChart3,
    title: 'Google Analytics & Cookies',
    description:
      'ShoreExplorer uses Google Analytics to understand how the Service is used and to improve the user experience.',
    paragraphs: [
      'We use analytics tools to collect anonymised, aggregated data about how visitors interact with ShoreExplorer. This helps us understand which features are most useful, identify issues, and prioritise improvements.',
    ],
    terms: [
      'ShoreExplorer uses Google Analytics, a web analytics service provided by Google LLC. Google Analytics uses cookies — small text files stored on your device — to collect standard usage data such as pages visited, session duration, device type, and approximate geographic region.',
      'The data collected by Google Analytics is anonymised and aggregated. We do not use Google Analytics to collect personally identifiable information such as your name, email address, or precise location.',
      'Google processes Analytics data in accordance with the Google Privacy Policy. Google may transfer and store this data on servers outside your country of residence.',
      'You may opt out of Google Analytics tracking by installing the Google Analytics Opt-out Browser Add-on, available at https://tools.google.com/dlpage/gaoptout. You may also block cookies through your browser settings.',
      'ShoreExplorer may also use essential cookies required for basic functionality (such as remembering your preferences). These cookies do not track you across other websites.',
      'By continuing to use the Service, you consent to the use of cookies as described in this section. For full details on our data practices, please see our Privacy Policy.',
    ],
    url: 'https://policies.google.com/privacy',
    linkLabel: 'Google Privacy Policy',
  },
  {
    number: 9,
    icon: Server,
    title: 'AWS Cloud Infrastructure',
    description:
      'ShoreExplorer is hosted on Amazon Web Services (AWS) cloud infrastructure.',
    paragraphs: [
      'The backend services, databases, and APIs that power ShoreExplorer are hosted on AWS data centres. We use industry-standard cloud infrastructure to ensure reliable performance, data security, and availability.',
    ],
    terms: [
      'ShoreExplorer\'s backend services run on AWS infrastructure located in the US East (Virginia / us-east-1) region, unless otherwise specified. Data may be processed in other AWS regions for redundancy and performance purposes.',
      'AWS provides physical security, network security, and infrastructure compliance certifications including ISO 27001, SOC 1/2/3, and GDPR compliance frameworks.',
      'Data transmitted between your device and ShoreExplorer\'s servers is encrypted in transit using TLS (Transport Layer Security). Data at rest is encrypted using AWS-managed encryption keys.',
      'ShoreExplorer relies on AWS\'s uptime commitments but does not guarantee uninterrupted availability of the Service. Planned maintenance, infrastructure incidents, or AWS outages may temporarily affect access.',
      'For details on AWS\'s security practices and compliance certifications, refer to the AWS Cloud Security documentation.',
    ],
    url: 'https://aws.amazon.com/service-terms/',
    linkLabel: 'AWS Service Terms',
  },
  {
    number: 10,
    icon: UserCheck,
    title: 'User Responsibilities',
    description:
      'Your obligations when using ShoreExplorer.',
    paragraphs: [
      'While ShoreExplorer strives to provide helpful and accurate planning tools, travel inherently involves risk and uncertainty. You are ultimately responsible for your own safety and decisions when visiting cruise port destinations.',
    ],
    terms: [
      'You must independently verify all travel information provided by ShoreExplorer, including activity locations, opening hours, admission costs, transport options, and walking routes, before relying on them.',
      'You are solely responsible for your personal safety and the safety of anyone travelling with you. This includes assessing your physical fitness for suggested activities, checking local safety advisories, and following the guidance of local authorities.',
      'You must ensure that you return to your cruise ship before the published departure time. ShoreExplorer provides estimated activity durations and travel times, but these are approximations only. Always allow a generous safety margin — we recommend returning to the port area at least 60 minutes before the ship\'s departure.',
      'You must verify cruise ship schedules, port arrival and departure times, and any tender requirements directly with your cruise line. ShoreExplorer is not affiliated with any cruise line and does not receive real-time ship schedule data.',
      'You are responsible for compliance with all local laws, regulations, and customs at your port of call. This includes visa requirements, restricted areas, photography restrictions, and local dress codes.',
      'You must not use the Service for any unlawful purpose, attempt to interfere with its operation, or access data not intended for you.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 11,
    icon: BookOpen,
    title: 'Intellectual Property',
    description:
      'Ownership of content and materials within ShoreExplorer.',
    paragraphs: [],
    terms: [
      'The ShoreExplorer name, logo, visual design, user interface, and original written content are the intellectual property of ShoreExplorer and are protected by applicable copyright and trademark laws.',
      'AI-generated day plans are created dynamically based on your inputs and AI model outputs. While you are free to use generated plans for your personal travel planning, you may not systematically scrape, reproduce, or commercially redistribute bulk AI-generated content from the Service.',
      'Third-party content — including map data (OpenStreetMap), weather data (Open-Meteo), activity descriptions sourced from booking platforms, and images — remains the intellectual property of their respective owners and is used under their applicable licences.',
      'User-generated content, such as saved trips and preferences, remains your property. By using the Service, you grant ShoreExplorer a limited, non-exclusive licence to process this data solely for the purpose of providing the Service to you.',
      'You may not copy, modify, distribute, or create derivative works based on ShoreExplorer\'s proprietary code, design, or branding without prior written consent.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 12,
    icon: Shield,
    title: 'Limitation of Liability',
    description:
      'Important limitations on ShoreExplorer\'s liability to you.',
    paragraphs: [
      'Please read this section carefully as it limits our liability to you.',
    ],
    terms: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT.',
      'ShoreExplorer does not warrant that: (a) the Service will be uninterrupted, timely, secure, or error-free; (b) the information, content, or AI-generated plans will be accurate, reliable, or complete; (c) any defects in the Service will be corrected; or (d) the Service will meet your specific requirements.',
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ShoreExplorer, its owners, directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or other intangible losses, arising out of or in connection with your use of (or inability to use) the Service.',
      'Without limiting the foregoing, ShoreExplorer shall not be liable for: missed cruise ship departures; personal injury or property damage during shore excursions; financial losses from third-party bookings; inaccurate weather forecasts; incorrect AI-generated information; or any actions taken based on information provided by the Service.',
      'In jurisdictions that do not allow the exclusion or limitation of certain warranties or liabilities, our liability shall be limited to the maximum extent permitted by law.',
      'Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by applicable law.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 13,
    icon: Shield,
    title: 'Data Storage & Privacy',
    description:
      'How ShoreExplorer handles your data.',
    paragraphs: [
      'Your privacy is important to us. This section provides a summary — please also review our full Privacy Policy for complete details.',
    ],
    terms: [
      'Trip data (destinations, dates, preferences, and generated plans) is stored in our database to provide the Service to you. This data is associated with an anonymous device identifier — not with your name, email, or any personally identifiable information.',
      'ShoreExplorer uses your browser\'s localStorage to store preferences and session data on your device. This data does not leave your device unless you actively generate a plan or save a trip.',
      'We do not sell, rent, or share your personal data with third parties for marketing purposes.',
      'When you generate a day plan, your port destination, travel date, group composition, and preference selections are transmitted to the Groq API for AI processing. This data is subject to Groq\'s data processing and retention policies.',
      'Anonymous, aggregated usage analytics may be collected to improve the Service (see Section 8: Google Analytics & Cookies).',
      'You may request deletion of your stored trip data by contacting us at the email address provided in Section 16.',
    ],
    url: null,
    linkLabel: null,
    hasPrivacyLink: true,
  },
  {
    number: 14,
    icon: Gavel,
    title: 'Modifications to Terms',
    description:
      'Our right to update these Terms.',
    paragraphs: [],
    terms: [
      'ShoreExplorer reserves the right to modify, amend, or replace these Terms at any time at our sole discretion.',
      'When we make material changes to these Terms, we will update the "Last Updated" date at the top of this page. We may also provide additional notice through the Service interface where appropriate.',
      'Your continued use of the Service after any changes to these Terms constitutes your acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop using the Service.',
      'We encourage you to review this page periodically to stay informed about our terms and conditions.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 15,
    icon: Scale,
    title: 'Governing Law & Jurisdiction',
    description:
      'The legal framework under which these Terms operate.',
    paragraphs: [],
    terms: [
      'These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.',
      'Any disputes arising out of or in connection with these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the state and federal courts located in the State of Delaware, United States.',
      'If you are accessing the Service from outside the United States, you are responsible for compliance with any applicable local laws. Nothing in these Terms limits any consumer protection rights that cannot be waived or limited under the laws of your jurisdiction of residence.',
      'If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions of these Terms remain in full force and effect.',
      'Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.',
    ],
    url: null,
    linkLabel: null,
  },
  {
    number: 16,
    icon: Mail,
    title: 'Contact Information',
    description:
      'How to reach us with questions about these Terms.',
    paragraphs: [
      'If you have any questions, concerns, or requests regarding these Terms of Use, our data practices, or any aspect of the ShoreExplorer Service, please contact us:',
    ],
    terms: [
      'Email: hello@slatewave-labs.com',
      'Please include "Terms of Use Enquiry" in the subject line of your email so we can direct your message appropriately.',
      'We aim to respond to all enquiries within 5 working days.',
    ],
    url: null,
    linkLabel: null,
  },
];

export default function TermsConditions() {
  return (
    <div
      className="min-h-screen bg-secondary px-4 md:px-8 py-8 md:py-12"
      data-testid="terms-page"
    >
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary">
            Terms &amp; Conditions
          </h1>
        </div>
        <p className="text-stone-600 font-body mb-2 ml-[52px]">
          Terms of use, third-party service terms, and legal policies for
          ShoreExplorer.
        </p>
        <p className="text-sm text-stone-400 font-body mb-8 ml-[52px]">
          Last Updated: {LAST_UPDATED}
        </p>

        {/* Introductory note */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
          <p className="font-body text-stone-600 text-sm leading-relaxed">
            Welcome to ShoreExplorer. These Terms of Use govern your access to
            and use of the ShoreExplorer application and its associated
            services. ShoreExplorer is a cruise port day-trip planning tool that
            uses artificial intelligence, open weather data, interactive maps,
            and curated activity links to help you plan shore excursions.
            ShoreExplorer is built and maintained by{' '}
            <a
              href="https://slatewave-labs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent font-semibold hover:underline"
              aria-label="Slatewave Labs (opens in new tab)"
            >
              Slatewave Labs
            </a>
            . Please
            read these Terms carefully. By using ShoreExplorer, you agree to be
            bound by all of the terms set out below. For information about how
            we collect and process your data, please also review our{' '}
            <Link
              to="/privacy"
              className="text-accent font-semibold hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-8">
          <h2 className="font-heading text-lg font-bold text-primary mb-4">
            Table of Contents
          </h2>
          <nav aria-label="Terms sections navigation">
            <ol className="space-y-1.5">
              {sections.map((section) => (
                <li key={section.number}>
                  <a
                    href={`#section-${section.number}`}
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
                id={`section-${section.number}`}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm scroll-mt-24"
                data-testid={`terms-section-${i}`}
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

                {/* Privacy Policy cross-link */}
                {section.hasPrivacyLink && (
                  <div className="ml-11 mb-4">
                    <Link
                      to="/privacy"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline min-h-[48px]"
                    >
                      <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                      View our full Privacy Policy
                    </Link>
                  </div>
                )}

                {/* External link */}
                {section.url && (
                  <div className="ml-11">
                    <a
                      href={section.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline min-h-[48px]"
                      data-testid={`terms-link-${i}`}
                    >
                      <ExternalLink
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                      {section.linkLabel || 'View Full Terms'}
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
            These Terms were last updated on {LAST_UPDATED}.
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
