import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Check, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Memberships() {
  const { isAuthenticated } = useAuth();
  const { data: tiers, isLoading } = trpc.membershipTiers.getAll.useQuery();
  const { data: activeSub } = trpc.subscriptions.getActive.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createSubscription = trpc.stripe.createSubscriptionCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        toast.info("Redirecting to secure checkout...");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout");
    },
  });

  const createOneTime = trpc.stripe.createMembershipCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        toast.info("Redirecting to secure checkout...");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout");
    },
  });

  const handleSubscribe = (tierId: number) => {
    createSubscription.mutate({ tierId });
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(0)}`;
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "annual": return "Annual";
      default: return duration.charAt(0).toUpperCase() + duration.slice(1);
    }
  };

  const parseFeatures = (features: string | null) => {
    if (!features) return [];
    try {
      return JSON.parse(features);
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading memberships...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/">
              <div className="text-xl sm:text-2xl font-bold tracking-tight cursor-pointer">
                HEAL & REBUILD CO
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="default" size="sm">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 sm:pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <Link href="/">
            <Button variant="ghost" className="mb-6 sm:mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          {/* Active Subscription Banner */}
          {activeSub && (
            <Card className="border-2 border-green-200 bg-green-50/50 mb-8 max-w-4xl mx-auto">
              <CardContent className="py-4 sm:py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 shrink-0" />
                    <div>
                      <p className="font-medium">Active Subscription</p>
                      <p className="text-sm text-muted-foreground">
                        You're currently subscribed. Manage your plan from the dashboard.
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">View Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light mb-4 sm:mb-6">
              Membership Plans
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
              Choose the membership that fits your wellness journey. All plans include access to our
              full range of facilities and services.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {tiers?.map((tier, index) => {
              const features = parseFeatures(tier.features);
              const isPopular = index === 1; // Middle tier is "popular"
              const isCurrentPlan = activeSub?.tierId === tier.id;

              return (
                <Card
                  key={tier.id}
                  className={`border-2 transition-all relative ${
                    isPopular ? "border-foreground shadow-lg scale-[1.02]" : "border-border hover:border-foreground"
                  } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-foreground text-background px-3 py-1 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-600 text-white px-3 py-1 text-xs">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-6 sm:pb-8 pt-6 sm:pt-8">
                    <CardTitle className="text-2xl sm:text-3xl mb-2">{tier.name}</CardTitle>
                    <CardDescription className="text-base">
                      {getDurationLabel(tier.duration)} Subscription
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-6 sm:pb-8">
                    <div className="mb-6">
                      <div className="text-4xl sm:text-5xl font-light mb-2">
                        {formatPrice(tier.price)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        per {tier.duration === "quarterly" ? "quarter" : tier.duration.replace("ly", "")}
                      </div>
                    </div>
                    {tier.sessionsPerWeek > 0 && (
                      <div className="mb-6 py-3 px-4 bg-secondary rounded-md">
                        <div className="text-sm font-medium">
                          {tier.sessionsPerWeek} sessions per week
                        </div>
                      </div>
                    )}
                    {tier.description && (
                      <p className="text-muted-foreground mb-6 font-light text-sm">
                        {tier.description}
                      </p>
                    )}
                    {features.length > 0 && (
                      <div className="space-y-3 text-left">
                        {features.map((feature: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pb-6 sm:pb-8">
                    {isAuthenticated ? (
                      isCurrentPlan ? (
                        <Button className="w-full" size="lg" variant="outline" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => handleSubscribe(tier.id)}
                          disabled={createSubscription.isPending || !!activeSub}
                        >
                          {createSubscription.isPending
                            ? "Processing..."
                            : activeSub
                            ? "Cancel Current First"
                            : "Subscribe Now"}
                        </Button>
                      )
                    ) : (
                      <Link href="/login" className="w-full">
                        <Button className="w-full" size="lg">
                          Sign In to Subscribe
                        </Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {(!tiers || tiers.length === 0) && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No membership tiers available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
