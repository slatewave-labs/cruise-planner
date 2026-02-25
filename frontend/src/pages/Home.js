import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Static assets served from S3 + CloudFront edge locations worldwide.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'HTTPS everywhere, Origin Access Control, and automated security scanning.',
  },
  {
    icon: Globe,
    title: 'Global CDN',
    description: 'CloudFront delivers your site from 400+ edge locations around the world.',
  },
];

function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-white py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Static Site Template
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto text-balance">
            A production-ready template for hosting static websites on AWS S3 &amp; CloudFront,
            with a best-in-class CI/CD pipeline powered by GitHub Actions.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/about"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-full hover:bg-blue-600 transition-colors min-h-[48px]"
            >
              Get Started <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-full hover:border-gray-400 hover:text-white transition-colors min-h-[48px]"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center mb-12">
            Built for Production
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={24} className="text-accent" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-6">
            CI/CD Pipeline
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Every push is linted, tested, built, E2E tested, and security scanned
            before deployment.
          </p>
          <div className="bg-secondary rounded-2xl p-6 sm:p-8 text-left font-mono text-sm overflow-x-auto">
            <pre className="text-gray-700 whitespace-pre-wrap">{`CI Pipeline (on every PR)
├── Lint (ESLint)
├── Test (Jest + coverage)
├── Build (production bundle)
├── E2E (Playwright)
├── Security (Semgrep + Trivy)
└── YAML Lint

Deploy (on merge to main)
├── Build frontend
├── Sync to S3 (smart caching)
├── Invalidate CloudFront
└── Smoke test`}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
