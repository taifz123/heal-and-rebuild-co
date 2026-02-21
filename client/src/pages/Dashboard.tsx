import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Clock,
  CreditCard,
  AlertCircle,
  XCircle,
  ArrowRight,
  LogOut,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Dashboard() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: summary } = trpc.bookings.getSummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: bookings } = trpc.bookings.getMy.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: activeSub } = trpc.subscriptions.getActive.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: activeMembership } = trpc.memberships.getActive.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const cancelBooking = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled");
      utils.bookings.getMy.invalidate();
      utils.bookings.getSummary.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel booking");
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h2 className="text-3xl font-light mb-4">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to access your dashboard</p>
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const upcomingBookings =
    bookings?.filter((b) => b.status === "confirmed" || b.status === "pending") || [];
  const pastBookings =
    bookings?.filter(
      (b) => b.status === "completed" || b.status === "cancelled" || b.status === "no_show"
    ) || [];

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user?.name || user?.email}
              </span>
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 sm:pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 max-w-5xl">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-2">
              Welcome back, {user?.name || "Member"}
            </h1>
            <p className="text-lg text-muted-foreground font-light">
              Manage your bookings and membership
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {/* Weekly Quota */}
            <Card className="col-span-2 border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Weekly Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.hasActiveSubscription ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-light">
                        {summary.sessionsRemaining}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        / {summary.weeklyLimit} remaining
                      </span>
                    </div>
                    <Progress
                      value={
                        summary.weeklyLimit > 0
                          ? (summary.sessionsUsed / summary.weeklyLimit) * 100
                          : 0
                      }
                      className="h-2"
                    />
                    {summary.sessionsRemaining === 0 && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Limit reached — resets Monday
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-light text-muted-foreground mb-2">No plan</p>
                    <Link href="/memberships">
                      <Button size="sm" variant="outline">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl sm:text-4xl font-light">{upcomingBookings.length}</span>
                <p className="text-xs text-muted-foreground mt-1">sessions booked</p>
              </CardContent>
            </Card>

            {/* Plan */}
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-lg sm:text-xl font-medium">
                  {summary?.tierName || "None"}
                </span>
                {activeSub && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">
                      {activeSub.status}
                    </Badge>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link href="/book">
              <Button className="gap-2">
                <Calendar className="h-4 w-4" />
                Book a Session
              </Button>
            </Link>
            <Link href="/memberships">
              <Button variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" />
                {summary?.hasActiveSubscription ? "Manage Plan" : "Get Membership"}
              </Button>
            </Link>
            <Link href="/gift-vouchers">
              <Button variant="outline" className="gap-2">
                <Gift className="h-4 w-4" />
                Gift Vouchers
              </Button>
            </Link>
          </div>

          {/* Subscription / Membership Info */}
          {(activeSub || activeMembership) && (
            <Card className="border-2 mb-8">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Your Membership</CardTitle>
              </CardHeader>
              <CardContent>
                {activeSub ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-lg">{summary?.tierName} Subscription</p>
                      <p className="text-sm text-muted-foreground">
                        Status:{" "}
                        <Badge variant="outline" className="capitalize">
                          {activeSub.status}
                        </Badge>
                      </p>
                      {activeSub.currentPeriodEnd && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Current period ends{" "}
                          {format(new Date(activeSub.currentPeriodEnd), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <Link href="/memberships">
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                ) : activeMembership ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-lg">Legacy Membership</p>
                      <p className="text-sm text-muted-foreground">
                        Valid until {format(new Date(activeMembership.endDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sessions used: {activeMembership.sessionsUsed}
                      </p>
                    </div>
                    <Link href="/memberships">
                      <Button variant="outline" size="sm">
                        Upgrade
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Bookings */}
          <Card className="border-2 mb-8">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Upcoming Sessions</CardTitle>
              <CardDescription>Your confirmed and pending bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-3">No upcoming sessions</p>
                  <Link href="/book">
                    <Button size="sm" variant="outline" className="gap-1">
                      Book Now <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {booking.sessionSlot?.name || `Booking #${booking.id}`}
                          </span>
                          <Badge className={`text-xs ${statusColor(booking.status)}`}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {booking.sessionSlot ? (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(booking.sessionSlot.startsAtUtc), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(booking.sessionSlot.startsAtUtc), "h:mm a")}
                              </span>
                            </>
                          ) : booking.bookingDate ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(booking.bookingDate), "MMM d, yyyy h:mm a")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => cancelBooking.mutate({ id: booking.id })}
                        disabled={cancelBooking.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Past Sessions</CardTitle>
                <CardDescription>Your booking history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pastBookings.slice(0, 10).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-3 p-3 border rounded-lg opacity-70"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {booking.sessionSlot?.name || `Booking #${booking.id}`}
                        </span>
                        {booking.bookingDate && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(booking.bookingDate), "MMM d")}
                          </span>
                        )}
                      </div>
                      <Badge className={`text-xs ${statusColor(booking.status)}`}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
