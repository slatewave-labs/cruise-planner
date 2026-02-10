import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Ship, Sun, MapPin, ArrowRight, Anchor } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Ship, title: 'Your Cruise, Your Plan', desc: 'Enter your ship and port schedule, and we handle the rest.' },
  { icon: Sun, title: 'Weather-Smart', desc: 'Real-time weather data ensures your day plan suits the conditions.' },
  { icon: MapPin, title: 'Circular Routes', desc: 'Adventures that start and end at your ship, with time to spare.' },
  { icon: Compass, title: 'AI-Powered', desc: 'Personalised itineraries crafted by AI based on your preferences.' },
];

export default function Landing() {
  return (
    <div data-testid="landing-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1639369480706-ffda22f88dec?w=1400&q=80)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-primary/90" />
        <div className="relative px-6 py-20 md:py-32 max-w-5xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-6 text-sm font-medium">
              <Anchor className="w-4 h-4" />
              Cruise Port Day Planner
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold mb-6 leading-tight text-balance">
              Make Every Port<br />an Adventure
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              AI-powered day plans for every cruise port of call. Personalised routes, real-time weather, and activities tailored to your style.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/trips/new"
                data-testid="get-started-btn"
                className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95 min-h-[48px]"
              >
                Start Planning
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/trips"
                data-testid="view-trips-btn"
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white rounded-full px-8 py-4 text-lg font-semibold hover:bg-white/25 transition-all min-h-[48px]"
              >
                My Trips
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 md:py-24 max-w-6xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-primary mb-4">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          From ship to shore and back again, ShoreExplorer plans your perfect day.
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
            Ready to Explore?
          </h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Create your first trip and let AI plan the perfect day at each port of call.
          </p>
          <Link
            to="/trips/new"
            data-testid="cta-start-btn"
            className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-8 py-4 font-bold shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95 min-h-[48px]"
          >
            Create Your Trip
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
