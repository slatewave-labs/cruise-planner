import React from 'react';
import { Info, Code, Database, Cloud, Cpu, Layout } from 'lucide-react';

const techStack = [
  {
    category: 'Frontend',
    icon: Layout,
    items: [
      'React 18 with React Router',
      'Tailwind CSS for styling',
      'Framer Motion for animations',
      'Lucide React for icons',
      'Axios for API calls',
    ],
  },
  {
    category: 'Backend',
    icon: Code,
    items: [
      'Python FastAPI framework',
      'Pydantic models for validation',
      'Async/await patterns',
      'Automatic OpenAPI docs',
      'CORS middleware configured',
    ],
  },
  {
    category: 'Database',
    icon: Database,
    items: [
      'AWS DynamoDB (single-table design)',
      'Generic CRUD operations',
      'Automatic type conversion',
      'UUID-based IDs',
    ],
  },
  {
    category: 'AI Integration',
    icon: Cpu,
    items: [
      'Groq LLM API ready',
      'Structured prompt templates',
      'JSON response parsing',
      'Error handling patterns',
    ],
  },
  {
    category: 'Infrastructure',
    icon: Cloud,
    items: [
      'Docker containerization',
      'AWS deployment ready',
      'Environment-based config',
      'Health check endpoints',
    ],
  },
];

const concepts = [
  {
    title: 'Mobile-First Design',
    description: 'Responsive layouts optimized for 375px mobile screens with 48px minimum touch targets.',
  },
  {
    title: 'Design System',
    description: 'Consistent color palette, typography (Playfair Display + Plus Jakarta Sans), and component patterns.',
  },
  {
    title: 'API-First Architecture',
    description: 'Clean separation between frontend and backend with RESTful API endpoints.',
  },
  {
    title: 'Error Handling',
    description: 'Comprehensive error states with user-friendly messages and loading indicators.',
  },
  {
    title: 'Testing Ready',
    description: 'Components include data-testid attributes for automated testing.',
  },
];

export default function About() {
  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto" data-testid="about-page">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
          <Info className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary">
          About This Template
        </h1>
      </div>
      <p className="text-muted-foreground mb-8 ml-13">
        A production-ready full-stack application template with modern best practices.
      </p>

      {/* Overview */}
      <div className="bg-gradient-to-br from-primary to-ocean-800 rounded-2xl p-8 text-white mb-8">
        <h2 className="font-heading text-2xl font-bold mb-4">What You Get</h2>
        <p className="text-white/80 leading-relaxed mb-4">
          This template provides a complete foundation for building modern web applications. It includes:
        </p>
        <ul className="space-y-2 text-white/90">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-1">✓</span>
            <span>React frontend with Tailwind CSS and responsive design patterns</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-1">✓</span>
            <span>FastAPI backend with automatic API documentation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-1">✓</span>
            <span>DynamoDB integration with single-table design</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-1">✓</span>
            <span>Groq LLM AI integration ready to use</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-1">✓</span>
            <span>AWS infrastructure setup with Docker</span>
          </li>
        </ul>
      </div>

      {/* Tech Stack */}
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-primary mb-6">Tech Stack</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {techStack.map((section, i) => {
            const Icon = section.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
                data-testid={`tech-section-${i}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-primary">{section.category}</h3>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-sm text-stone-600 flex items-start gap-2">
                      <span className="text-accent mt-1 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Concepts */}
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-primary mb-6">Key Concepts</h2>
        <div className="space-y-4">
          {concepts.map((concept, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
              data-testid={`concept-${i}`}
            >
              <h3 className="font-heading text-lg font-bold text-primary mb-2">{concept.title}</h3>
              <p className="text-sm text-stone-600">{concept.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation Link */}
      <div className="bg-sand-100 rounded-2xl border border-stone-200 p-6">
        <h2 className="font-heading text-lg font-bold text-primary mb-2">Learn More</h2>
        <p className="text-sm text-stone-600 mb-4">
          For detailed documentation on architecture, deployment, and customization, see the TEMPLATE.md file in the repository root.
        </p>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
          <Code className="w-4 h-4" />
          <span>Check TEMPLATE.md for full documentation</span>
        </div>
      </div>
    </div>
  );
}
