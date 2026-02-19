import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Layers, Cpu, Cloud, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Zap, title: 'Fast API Backend', desc: 'High-performance Python FastAPI with async/await support and automatic API documentation.' },
  { icon: Layers, title: 'React Frontend', desc: 'Modern React with Tailwind CSS, Framer Motion animations, and responsive design patterns.' },
  { icon: Cpu, title: 'AI Integration', desc: 'Ready-to-use Groq LLM integration for AI-powered features and intelligent workflows.' },
  { icon: Cloud, title: 'Cloud Ready', desc: 'AWS infrastructure with DynamoDB, containerized deployments, and production-ready patterns.' },
];

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-ocean-800 to-ocean-900" />
        <div className="relative px-6 py-20 md:py-32 max-w-5xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-6 text-sm font-medium">
              <Cloud className="w-4 h-4" />
              Full-Stack Template
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold mb-6 leading-tight text-balance">
              Welcome to My App
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              A full-stack application template with React, FastAPI, and AWS infrastructure
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/items"
                data-testid="get-started-btn"
                className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95 min-h-[48px]"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/about"
                data-testid="learn-more-btn"
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white rounded-full px-8 py-4 text-lg font-semibold hover:bg-white/25 transition-all min-h-[48px]"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 md:py-24 max-w-6xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-primary mb-4">
          What's Included
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Everything you need to build modern full-stack applications
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                data-testid={`feature-card-${i}`}
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-bold text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-3xl mx-auto bg-primary rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
            Ready to Build?
          </h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Start exploring the template features and build your next great application.
          </p>
          <Link
            to="/items"
            data-testid="cta-start-btn"
            className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-8 py-4 font-bold shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95 min-h-[48px]"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
