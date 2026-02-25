import { CheckCircle } from 'lucide-react';

const STACK_ITEMS = [
  'React 18 with React Router',
  'Tailwind CSS for styling',
  'ESLint for code quality',
  'Jest + Testing Library for unit tests',
  'Playwright for E2E tests',
  'Semgrep + Trivy for security',
  'AWS S3 for static hosting',
  'CloudFront CDN with HTTPS',
  'GitHub Actions CI/CD pipeline',
];

function About() {
  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold mb-6">About This Template</h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          This is a production-ready template for deploying static websites to
          AWS S3 and CloudFront with a robust CI/CD pipeline. Fork it, customise it,
          and ship your next project with confidence.
        </p>

        <h2 className="font-heading text-2xl font-semibold mb-4">Tech Stack</h2>
        <ul className="space-y-3 mb-12">
          {STACK_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle size={20} className="text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h2 className="font-heading text-2xl font-semibold mb-4">Quick Start</h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm font-mono text-sm">
          <pre className="text-gray-700 whitespace-pre-wrap">{`# Clone the template
git clone <your-repo-url>

# Install dependencies
cd frontend && yarn install

# Start development server
yarn start

# Run tests
yarn test --watchAll=false

# Build for production
yarn build`}</pre>
        </div>
      </div>
    </div>
  );
}

export default About;
