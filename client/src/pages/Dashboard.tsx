import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Calendar, CreditCard, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Dashboard() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: memberships, isLoading: membershipsLoading } = trpc.memberships.getMy.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: bookings, isLoading: bookingsLoading } = trpc.bookings.getMy.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const cancelBooking = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      utils.bookings.getMy.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel booking");
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
          <p className="text-muted-foreground mb-6">Please sign in to view your dashboard</p>
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeMembership = memberships?.find(m => m.status === 'active');
  const upcomingBookings = bookings?.filter(b => 
    b.status !== 'cancelled' && new Date(b.bookingDate) > new Date()
  ).sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime());

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
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user?.name || user?.email}
              </span>
              {user?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
          <div className="mb-12">
            <h1 className="text-5xl lg:text-6xl font-light mb-4">Your Dashboard</h1>
            <p className="text-xl text-muted-foreground font-light">
              Manage your memberships and bookings
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link href="/book">
              <Card className="border-2 hover:border-foreground transition-all cursor-pointer h-full">
                <CardHeader>
                  <Calendar className="h-8 w-8 mb-2" />
                  <CardTitle>Book Session</CardTitle>
                  <CardDescription>Schedule your next visit</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/memberships">
              <Card className="border-2 hover:border-foreground transition-all cursor-pointer h-full">
                <CardHeader>
                  <CreditCard className="h-8 w-8 mb-2" />
                  <CardTitle>Memberships</CardTitle>
                  <CardDescription>View and manage plans</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/gift-vouchers">
              <Card className="border-2 hover:border-foreground transition-all cursor-pointer h-full">
                <CardHeader>
                  <Clock className="h-8 w-8 mb-2" />
                  <CardTitle>Gift Vouchers</CardTitle>
                  <CardDescription>Purchase or redeem</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Active Membership */}
          <div className="mb-12">
            <h2 className="text-3xl font-light mb-6">Active Membership</h2>
            {membershipsLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            ) : activeMembership ? (
              <Card className="border-2">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2">Active Plan</CardTitle>
                      <CardDescription>
                        Valid until {format(new Date(activeMembership.endDate), 'MMMM d, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-1">Sessions Used</div>
                      <div className="text-2xl font-light">{activeMembership.sessionsUsed}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="text-lg capitalize">{activeMembership.status}</p>
                    </div>
                    <Link href="/memberships">
                      <Button variant="outline">Upgrade Plan</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No active membership</p>
                  <Link href="/memberships">
                    <Button>Browse Memberships</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upcoming Bookings */}
          <div>
            <h2 className="text-3xl font-light mb-6">Upcoming Bookings</h2>
            {bookingsLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            ) : upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id} className="border-2">
                    <CardContent className="py-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-medium mb-2">Booking #{booking.id}</h3>
                          <p className="text-muted-foreground mb-1">
                            {format(new Date(booking.bookingDate), 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-muted-foreground">
                            {format(new Date(booking.bookingDate), 'h:mm a')}
                          </p>
                          <div className="mt-3">
                            <span className={`inline-block px-3 py-1 text-xs uppercase tracking-wider ${
                              booking.status === 'confirmed' ? 'bg-foreground text-background' : 'bg-secondary'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelBooking.mutate({ id: booking.id })}
                          disabled={cancelBooking.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                      {booking.notes && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm text-muted-foreground">Notes: {booking.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Link href="/book">
                    <Button>Book a Session</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
