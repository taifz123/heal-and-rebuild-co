import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
import { LOGIN_PATH } from "@/const";
import { toast } from "sonner";

export default function Memberships() {
  const { isAuthenticated } = useAuth();
  const { data: tiers, isLoading } = trpc.membershipTiers.getAll.useQuery();
  const createCheckout = trpc.stripe.createMembershipCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast.info('Redirecting to secure checkout...');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create checkout');
    },
  });

  const handleSelectPlan = (tierId: number) => {
    createCheckout.mutate({ tierId });
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(0)}`;
  };

  const getDurationLabel = (duration: string) => {
    return duration.charAt(0).toUpperCase() + duration.slice(1);
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
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading memberships...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <div className="text-2xl font-bold tracking-tight cursor-pointer">
                HEAL & REBUILD CO
              </div>
            </Link>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="default" size="sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href={LOGIN_PATH}>
                  <Button variant="default" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-12">
          <Link href="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-light mb-6">Membership Options</h1>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              Choose the membership that fits your wellness journey. All plans include access to our full range of facilities and services.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers?.map((tier) => {
              const features = parseFeatures(tier.features);
              return (
                <Card key={tier.id} className="border-2 border-border hover:border-foreground transition-all">
                  <CardHeader className="text-center pb-8 pt-8">
                    <CardTitle className="text-3xl mb-2">{tier.name}</CardTitle>
                    <CardDescription className="text-base">
                      {getDurationLabel(tier.duration)} Access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="mb-6">
                      <div className="text-5xl font-light mb-2">{formatPrice(tier.price)}</div>
                      <div className="text-sm text-muted-foreground">per {tier.duration}</div>
                    </div>
                    {tier.description && (
                      <p className="text-muted-foreground mb-6 font-light">{tier.description}</p>
                    )}
                    {tier.sessionsPerWeek > 0 && (
                      <div className="mb-6 py-3 px-4 bg-secondary">
                        <div className="text-sm font-medium">{tier.sessionsPerWeek} sessions per week</div>
                      </div>
                    )}
                    {features.length > 0 && (
                      <div className="space-y-3 text-left">
                        {features.map((feature: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pb-8">
                    {isAuthenticated ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => handleSelectPlan(tier.id)}
                        disabled={createCheckout.isPending}
                      >
                        {createCheckout.isPending ? 'Processing...' : 'Select Plan'}
                      </Button>
                    ) : (
                      <Link href={LOGIN_PATH} className="w-full">
                        <Button className="w-full" size="lg">
                          Sign In to Continue
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
