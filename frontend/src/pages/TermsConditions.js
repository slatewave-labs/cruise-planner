import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

const sections = [
  {
    title: 'Open-Meteo Weather API',
    description: 'ShoreExplorer uses the Open-Meteo API for weather forecast data. Open-Meteo provides free, open-source weather data from national weather services.',
    terms: [
      'Open-Meteo data is licensed under CC BY 4.0 (Creative Commons Attribution 4.0 International).',
      'Attribution is required when using their data.',
      'Data sources include NOAA GFS, DWD ICON, MeteoFrance, JMA, and other national weather services.',
      'Free for non-commercial use. Commercial use requires an API subscription.',
    ],
    url: 'https://open-meteo.com/en/terms',
  },
  {
    title: 'Google Gemini (Plan Generation)',
    description: 'Day plans are generated using Google Gemini technology. The integration is managed through the Emergent platform.',
    terms: [
      'Generated content is provided as suggestions only and should not be relied upon as definitive travel advice.',
      'Users should independently verify all activity details, costs, opening hours, and safety information.',
      'Google Gemini is subject to Google\'s Terms of Service and Acceptable Use Policy.',
      'Generated plans may contain inaccuracies regarding locations, prices, or availability.',
    ],
    url: 'https://ai.google.dev/gemini-api/terms',
  },
  {
    title: 'OpenStreetMap (Leaflet Maps)',
    description: 'Map visualisation is powered by Leaflet using OpenStreetMap tile data.',
    terms: [
      'OpenStreetMap data is licensed under the Open Data Commons Open Database License (ODbL).',
      'Map tiles are copyright OpenStreetMap contributors.',
      'The cartography is licensed under CC BY-SA 2.0.',
      'Users must provide attribution when sharing map screenshots.',
    ],
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    title: 'Google Maps (Route Export)',
    description: 'ShoreExplorer offers the option to export your day plan route to Google Maps for navigation.',
    terms: [
      'Google Maps is subject to Google Maps Platform Terms of Service.',
      'Route directions and travel times are estimates and may vary.',
      'Google Maps usage is subject to their standard usage limits and policies.',
    ],
    url: 'https://cloud.google.com/maps-platform/terms',
  },
  {
    title: 'ShoreExplorer App',
    description: 'General terms for using the ShoreExplorer application.',
    terms: [
      'ShoreExplorer is provided "as is" without warranty of any kind.',
      'Travel plans are AI-generated suggestions. Always verify locally.',
      'Users are responsible for their own safety and travel decisions.',
      'Activity costs, availability, and booking URLs may change without notice.',
      'ShoreExplorer does not process payments or handle bookings directly.',
      'Personal trip data is stored locally and not shared with third parties.',
      'Cruise ship schedules should be verified with your cruise line.',
    ],
    url: null,
  },
];

export default function TermsConditions() {
  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto" data-testid="terms-page">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary">
          Terms & Conditions
        </h1>
      </div>
      <p className="text-muted-foreground mb-8 ml-13">
        Third-party service terms and usage policies for ShoreExplorer.
      </p>

      <div className="space-y-6">
        {sections.map((section, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
            data-testid={`terms-section-${i}`}
          >
            <h2 className="font-heading text-lg font-bold text-primary mb-2">{section.title}</h2>
            <p className="text-sm text-stone-500 mb-4">{section.description}</p>
            <ul className="space-y-2 mb-4">
              {section.terms.map((term, j) => (
                <li key={j} className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-accent mt-1 shrink-0">-</span>
                  <span>{term}</span>
                </li>
              ))}
            </ul>
            {section.url && (
              <a
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                data-testid={`terms-link-${i}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Terms
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
