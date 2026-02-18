import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Calendar, Gift, MapPin, Dumbbell, Heart, Sparkles } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <div className="text-2xl font-bold tracking-tight cursor-pointer">
                HEAL & REBUILD CO
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/memberships">
                <span className="text-sm uppercase tracking-wider hover:text-muted-foreground transition-colors cursor-pointer">
                  Memberships
                </span>
              </Link>
              <Link href="/book">
                <span className="text-sm uppercase tracking-wider hover:text-muted-foreground transition-colors cursor-pointer">
                  Book Now
                </span>
              </Link>
              <Link href="/gift-vouchers">
                <span className="text-sm uppercase tracking-wider hover:text-muted-foreground transition-colors cursor-pointer">
                  Gift Vouchers
                </span>
              </Link>
              <Link href="/location">
                <span className="text-sm uppercase tracking-wider hover:text-muted-foreground transition-colors cursor-pointer">
                  Location
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="default" size="sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl lg:text-8xl font-light mb-8 leading-tight">
              Restore. Rebuild. Renew.
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto font-light">
              A sanctuary for wellness and transformation. Where movement meets mindfulness, and strength is cultivated from within.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/memberships">
                <Button size="lg" className="text-base px-8 py-6 uppercase tracking-wider">
                  Explore Memberships
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/book">
                <Button size="lg" variant="outline" className="text-base px-8 py-6 uppercase tracking-wider">
                  Book a Session
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6 lg:px-12">
        <div className="h-px bg-border"></div>
      </div>

      {/* Services Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-6xl font-light mb-6">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Curated experiences designed to elevate your physical and mental wellbeing
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="group cursor-pointer">
              <div className="border border-border p-8 lg:p-12 transition-all hover:border-foreground h-full flex flex-col">
                <Dumbbell className="h-12 w-12 mb-6" />
                <h3 className="text-2xl lg:text-3xl mb-4">Strength Training</h3>
                <p className="text-muted-foreground font-light leading-relaxed flex-grow">
                  State-of-the-art equipment and personalized programs to build sustainable strength and endurance.
                </p>
              </div>
            </div>
            <div className="group cursor-pointer">
              <div className="border border-border p-8 lg:p-12 transition-all hover:border-foreground h-full flex flex-col">
                <Heart className="h-12 w-12 mb-6" />
                <h3 className="text-2xl lg:text-3xl mb-4">Therapy Sessions</h3>
                <p className="text-muted-foreground font-light leading-relaxed flex-grow">
                  Expert-led therapeutic treatments including massage, physiotherapy, and recovery protocols.
                </p>
              </div>
            </div>
            <div className="group cursor-pointer">
              <div className="border border-border p-8 lg:p-12 transition-all hover:border-foreground h-full flex flex-col">
                <Sparkles className="h-12 w-12 mb-6" />
                <h3 className="text-2xl lg:text-3xl mb-4">Wellness Programs</h3>
                <p className="text-muted-foreground font-light leading-relaxed flex-grow">
                  Holistic wellness experiences combining movement, meditation, and nutritional guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6 lg:px-12">
        <div className="h-px bg-border"></div>
      </div>

      {/* Membership CTA */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl lg:text-6xl font-light mb-6">Begin Your Journey</h2>
            <p className="text-xl text-muted-foreground mb-12 font-light leading-relaxed">
              Choose from flexible membership options designed to fit your lifestyle. Monthly, quarterly, or annual passes available.
            </p>
            <Link href="/memberships">
              <Button size="lg" className="text-base px-8 py-6 uppercase tracking-wider">
                View Membership Options
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6 lg:px-12">
        <div className="h-px bg-border"></div>
      </div>

      {/* Quick Actions */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/book">
              <div className="border border-border p-8 lg:p-10 hover:border-foreground transition-all cursor-pointer group">
                <Calendar className="h-10 w-10 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl mb-3">Book a Session</h3>
                <p className="text-muted-foreground font-light">
                  Schedule your next gym session, therapy appointment, or wellness experience.
                </p>
              </div>
            </Link>
            <Link href="/gift-vouchers">
              <div className="border border-border p-8 lg:p-10 hover:border-foreground transition-all cursor-pointer group">
                <Gift className="h-10 w-10 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl mb-3">Gift Vouchers</h3>
                <p className="text-muted-foreground font-light">
                  Share the gift of wellness with loved ones through our curated vouchers.
                </p>
              </div>
            </Link>
            <Link href="/location">
              <div className="border border-border p-8 lg:p-10 hover:border-foreground transition-all cursor-pointer group">
                <MapPin className="h-10 w-10 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl mb-3">Visit Us</h3>
                <p className="text-muted-foreground font-light">
                  Find directions, parking information, and nearby amenities for your visit.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold tracking-tight">HEAL & REBUILD CO</div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Terms of Service</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Contact</span>
            </div>
          </div>
          <div className="text-center mt-8 text-sm text-muted-foreground">
            © 2026 Heal & Rebuild Co. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
