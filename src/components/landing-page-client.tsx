"use client"

import Link from "next/link"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import {
  Dumbbell,
  MessageSquare,
  TrendingUp,
  Trophy,
  Zap,
  Shield,
  Clock,
  Users,
  Star,
} from "lucide-react"

interface LandingPageClientProps {
  isAuthenticated: boolean
}

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Workout Tracking",
    description: "Track every set, rep, and weight in real-time with our intuitive session logger.",
  },
  {
    icon: MessageSquare,
    title: "Coach Messaging",
    description: "Communicate directly with your coach through instant messaging.",
  },
  {
    icon: TrendingUp,
    title: "Progress Analytics",
    description: "Visualize your progress with detailed charts and personal records.",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description: "Earn badges, maintain streaks, and celebrate PRs with your team.",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description: "Changes sync instantly across all devices. No refresh needed.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is encrypted and never shared without your permission.",
  },
]

const TESTIMONIALS = [
  {
    name: "Marcus Johnson",
    role: "Personal Trainer",
    content: "GymPro has transformed how I manage my clients. The real-time tracking and messaging features are game-changers.",
    rating: 5,
  },
  {
    name: "Sarah Chen",
    role: "Fitness Enthusiast",
    content: "I love seeing my progress visualized. The PR celebrations keep me motivated to push harder every session.",
    rating: 5,
  },
  {
    name: "Mike Rodriguez",
    role: "Gym Owner",
    content: "Our members love the platform. It's increased client retention by 40% since we started using it.",
    rating: 5,
  },
]

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: ["1 Coach Connection", "Basic Workout Tracking", "Progress Charts", "Mobile App Access"],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "For serious athletes",
    features: [
      "Unlimited Coaches",
      "Advanced Analytics",
      "Custom Training Plans",
      "Priority Support",
      "PR Celebrations",
      "Export Data",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "per month",
    description: "For gyms & studios",
    features: [
      "Everything in Pro",
      "Team Management",
      "Branded Experience",
      "API Access",
      "Dedicated Support",
      "Custom Integrations",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export function LandingPageClient({ isAuthenticated }: LandingPageClientProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "GymPro",
            applicationCategory: "HealthApplication",
            operatingSystem: "Web",
            description:
              "Professional gym management platform for coaches and clients. Track workouts, plans, and progress in real-time.",
            url: "https://gympro.app",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              ratingCount: "1247",
            },
          }),
        }}
      />

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is GymPro?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "GymPro is a professional gym management platform that connects coaches and clients. It features real-time workout tracking, messaging, progress analytics, and gamification.",
                },
              },
              {
                "@type": "Question",
                name: "Is GymPro free to use?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes! GymPro offers a free tier that includes basic workout tracking, progress charts, and one coach connection. Pro and Team plans are available for advanced features.",
                },
              },
              {
                "@type": "Question",
                name: "Can I use GymPro on my phone?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Absolutely! GymPro is a Progressive Web App (PWA) that works on any device. You can install it on your phone for a native app experience.",
                },
              },
            ],
          }),
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-gradient-neon">GymPro</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              The professional gym management platform for coaches and clients.
              Track workouts, manage plans, and achieve goals together.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {isAuthenticated ? (
                <div className="flex gap-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="flex gap-4">
                  <SignInButton mode="modal">
                    <button className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-800/50 bg-zinc-900/50 px-8 text-sm font-semibold text-foreground transition-all hover:bg-zinc-900/70">
                      Create Account
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>

            <p className="mt-4 text-sm text-muted-foreground/60">
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="border-b border-zinc-800/50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Everything you need to{" "}
              <span className="text-gradient-neon">crush your goals</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Built for coaches who demand the best for their clients, and athletes
              who refuse to settle.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 transition-all hover:border-primary/30 hover:bg-zinc-900/70"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-zinc-800/50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Loved by <span className="text-gradient-neon">fitness pros</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Join thousands of coaches and athletes who have transformed their
              training with GymPro.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="size-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground/60">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Simple, <span className="text-gradient-neon">transparent</span> pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.popular
                    ? "border-primary/50 bg-card"
                    : "border-zinc-800/50 bg-zinc-900/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground/60">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground/60">
                    /{plan.period}
                  </span>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Zap className="size-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <SignUpButton mode="modal">
                  <button
                    className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:brightness-110"
                        : "border border-border/30 bg-zinc-900/50 text-foreground hover:bg-zinc-900/70"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </SignUpButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-800/50 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to <span className="text-gradient-neon">level up</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Join thousands of fitness professionals and athletes who trust GymPro
            to manage their training.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <SignUpButton mode="modal">
              <button className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
                Start Free Today
              </button>
            </SignUpButton>
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span>1,247+ Users</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4" />
              <span>Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              <span>Secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-lg font-bold text-gradient-neon">GymPro</div>
            <p className="text-sm text-muted-foreground/60">
              © {new Date().getFullYear()} GymPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
