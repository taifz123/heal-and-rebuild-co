import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.admin.getDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: users, isLoading: usersLoading } = trpc.admin.getUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: bookings, isLoading: bookingsLoading } = trpc.bookings.getAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: memberships, isLoading: membershipsLoading } = trpc.memberships.getAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const updateBookingStatus = trpc.bookings.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Booking status updated");
      utils.bookings.getAll.invalidate();
      utils.admin.getDashboardStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h2 className="text-3xl font-light mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Admin access required</p>
          <Link href="/">
            <Button size="lg">Go Home</Button>
          </Link>
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
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  My Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
          <div className="mb-12">
            <h1 className="text-5xl lg:text-6xl font-light mb-4">Admin Dashboard</h1>
            <p className="text-xl text-muted-foreground font-light">
              Manage members, bookings, and business metrics
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light">{stats?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light">{stats?.activeMembers || 0}</div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light">{stats?.totalBookings || 0}</div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bookings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light">{stats?.pendingBookings || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="memberships">Memberships</TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl">All Bookings</CardTitle>
                  <CardDescription>Manage and update booking statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading...</p>
                  ) : bookings && bookings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Service ID</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>#{booking.id}</TableCell>
                            <TableCell>{booking.userId}</TableCell>
                            <TableCell>{booking.serviceTypeId}</TableCell>
                            <TableCell>
                              {format(new Date(booking.bookingDate), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-block px-2 py-1 text-xs uppercase ${
                                booking.status === 'confirmed' ? 'bg-foreground text-background' : 'bg-secondary'
                              }`}>
                                {booking.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {booking.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'confirmed' })}
                                  disabled={updateBookingStatus.isPending}
                                >
                                  Confirm
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No bookings found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl">All Members</CardTitle>
                  <CardDescription>View and manage user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading...</p>
                  ) : users && users.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>#{user.id}</TableCell>
                            <TableCell>{user.name || '-'}</TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>
                              <span className={`inline-block px-2 py-1 text-xs uppercase ${
                                user.role === 'admin' ? 'bg-foreground text-background' : 'bg-secondary'
                              }`}>
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Memberships Tab */}
            <TabsContent value="memberships">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl">All Memberships</CardTitle>
                  <CardDescription>View active and expired memberships</CardDescription>
                </CardHeader>
                <CardContent>
                  {membershipsLoading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading...</p>
                  ) : memberships && memberships.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Tier ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Sessions Used</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberships.map((membership) => (
                          <TableRow key={membership.id}>
                            <TableCell>#{membership.id}</TableCell>
                            <TableCell>{membership.userId}</TableCell>
                            <TableCell>{membership.tierId}</TableCell>
                            <TableCell>
                              <span className={`inline-block px-2 py-1 text-xs uppercase ${
                                membership.status === 'active' ? 'bg-foreground text-background' : 'bg-secondary'
                              }`}>
                                {membership.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {format(new Date(membership.startDate), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {format(new Date(membership.endDate), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{membership.sessionsUsed}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No memberships found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
