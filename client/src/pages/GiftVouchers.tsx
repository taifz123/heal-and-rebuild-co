import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Gift } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useState } from "react";

export default function GiftVouchers() {
  const { isAuthenticated } = useAuth();
  const [purchaseAmount, setPurchaseAmount] = useState("100");
  const [redeemCode, setRedeemCode] = useState("");

  const createCheckout = trpc.stripe.createGiftVoucherCheckout.useMutation({
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

  const redeemVoucher = trpc.giftVouchers.redeem.useMutation({
    onSuccess: (data) => {
      toast.success(`Voucher redeemed! $${data.amount} added to your account`);
      setRedeemCode("");
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to redeem voucher');
    },
  });

  const handlePurchase = () => {
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error('Amount must be at least $10');
      return;
    }
    createCheckout.mutate({ amount: purchaseAmount });
  };

  const handleRedeem = () => {
    if (!redeemCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }
    redeemVoucher.mutate({ code: redeemCode.trim() });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h2 className="text-3xl font-light mb-4">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to purchase or redeem gift vouchers</p>
          <a href={getLoginUrl()}>
            <Button size="lg">Sign In</Button>
          </a>
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
            <Link href="/dashboard">
              <Button variant="default" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
          <Link href="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-5xl lg:text-6xl font-light mb-4">Gift Vouchers</h1>
            <p className="text-xl text-muted-foreground font-light">
              Share the gift of wellness with loved ones
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Purchase Voucher */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Gift className="h-8 w-8" />
                  <CardTitle className="text-2xl">Purchase Voucher</CardTitle>
                </div>
                <CardDescription>
                  Create a gift voucher for any amount
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voucher Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="10"
                      step="10"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      className="pl-8"
                      placeholder="100"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum amount: $10</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-1 w-1 rounded-full bg-foreground"></div>
                    <span>Valid for 1 year from purchase</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-1 w-1 rounded-full bg-foreground"></div>
                    <span>Redeemable for any service</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-1 w-1 rounded-full bg-foreground"></div>
                    <span>Unique code sent via email</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePurchase}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? 'Processing...' : 'Purchase Voucher'}
                </Button>
              </CardContent>
            </Card>

            {/* Redeem Voucher */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Redeem Voucher</CardTitle>
                <CardDescription>
                  Enter your voucher code to redeem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voucher Code</label>
                  <Input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    placeholder="HEAL-XXXXXXXXXX"
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the code exactly as shown on your voucher
                  </p>
                </div>

                <div className="bg-secondary p-4 space-y-2">
                  <p className="text-sm font-medium">How to redeem:</p>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Enter your voucher code above</li>
                    <li>Click "Redeem Voucher"</li>
                    <li>Credit will be added to your account</li>
                    <li>Use it for any service booking</li>
                  </ol>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleRedeem}
                  disabled={redeemVoucher.isPending || !redeemCode.trim()}
                >
                  {redeemVoucher.isPending ? 'Redeeming...' : 'Redeem Voucher'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
