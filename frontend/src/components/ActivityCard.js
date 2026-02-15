import React from 'react';
import { Clock, MapPin, Coins, ExternalLink, ArrowRight } from 'lucide-react';

export default function ActivityCard({ activity, isLast, currencySymbol: _currencySymbol }) {
  return (
    <div className="relative" data-testid={`activity-card-${activity.order}`}>
      {/* Timeline connector */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
            {activity.order}
          </div>
          {!isLast && (
            <div className="w-0.5 flex-1 bg-stone-200 my-1 min-h-[24px]" />
          )}
        </div>

        {/* Card */}
        <div className="flex-1 bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-heading text-lg font-bold text-primary leading-tight">{activity.name}</h4>
            <span className="font-mono text-xs bg-sand-100 text-stone-600 px-2 py-1 rounded-lg whitespace-nowrap">
              {activity.start_time} - {activity.end_time}
            </span>
          </div>

          <p className="text-sm text-stone-600 mb-3 leading-relaxed">{activity.description}</p>

          <div className="flex flex-wrap gap-3 text-xs">
            {activity.location && (
              <div className="flex items-center gap-1 text-stone-500">
                <MapPin className="w-3.5 h-3.5" />
                <span>{activity.location}</span>
              </div>
            )}
            {activity.duration_minutes && (
              <div className="flex items-center gap-1 text-stone-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{activity.duration_minutes} min</span>
              </div>
            )}
            {activity.cost_estimate && (
              <div className="flex items-center gap-1 text-stone-500">
                <Coins className="w-3.5 h-3.5" />
                <span>{activity.cost_estimate}</span>
              </div>
            )}
          </div>

          {activity.tips && (
            <p className="text-xs text-success mt-2 bg-success/5 rounded-lg px-3 py-1.5 font-medium">
              Tip: {activity.tips}
            </p>
          )}

          {activity.booking_url && (
            <a
              href={activity.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-accent hover:underline"
              data-testid={`booking-link-${activity.order}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View / Book Activity
            </a>
          )}

          {!isLast && activity.transport_to_next && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{activity.transport_to_next} ({activity.travel_time_to_next})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
