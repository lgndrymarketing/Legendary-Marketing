"use client";

import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { motion } from "motion/react";

const testimonials = [
  {
    quote: "Legendary Marketing took over our Meta and Google campaigns and our cost-per-lead dropped 42% in the first six weeks. The real-time reporting was a game-changer — I always knew exactly where our ad spend stood.",
    name: "Sarah Mitchell",
    role: "Founder, Maison Noir",
    rating: 5,
  },
  {
    quote: "Best agency experience I've ever had. No back-and-forth emails, no mystery reports. Everything was right there in the dashboard. Our pipeline doubled within the first quarter.",
    name: "David Chen",
    role: "CTO, DataPulse",
    rating: 5,
  },
  {
    quote: "The GoHighLevel automation they set up saves our sales team 20+ hours per week and no lead falls through the cracks anymore. Their team really understood our workflow and built exactly what we needed.",
    name: "Maria Gonzalez",
    role: "Operations Lead, HelpStream",
    rating: 5,
  },
  {
    quote: "We needed a lead funnel fast and Legendary Marketing delivered. We hit a 4.5x ROAS within the first month. Already planning our next campaign with them.",
    name: "James Okafor",
    role: "CEO, GrowthForge",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="orange" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            What our clients{" "}
            <span className="text-gradient-orange">say</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Don&apos;t just take our word for it.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 sm:p-8"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-orange text-orange" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-semibold">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
