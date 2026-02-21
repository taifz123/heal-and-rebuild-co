import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Search,
  Plus,
  Eye,
  Settings,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // ── State ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [overrideType, setOverrideType] = useState<string>("add_sessions");
  const [overrideDelta, setOverrideDelta] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({
    name: "",
    startsAtUtc: "",
    endsAtUtc: "",
    capacity: "10",
    trainerName: "",
  });

  // ── Queries ────────────────────────────────────────────────────────────
  const isAdmin = isAuthenticated && user?.role === "admin";

  const { data: stats } = trpc.admin.getDashboardStats.useQuery(undefined, { enabled: isAdmin });
  const { data: users } = trpc.admin.getUsers.useQuery(undefined, { enabled: isAdmin });
  const { data: bookings } = trpc.bookings.getAll.useQuery(undefined, { enabled: isAdmin });
  const { data: memberships } = trpc.memberships.getAll.useQuery(undefined, { enabled: isAdmin });
  const { data: subscriptions } = trpc.subscriptions.getAll.useQuery(undefined, { enabled: isAdmin });
  const { data: sessionSlots } = trpc.sessionSlots.getAll.useQuery(undefined, { enabled: isAdmin });
  const { data: revenue } = trpc.admin.getRevenue.useQuery(undefined, { enabled: isAdmin });
  const { data: memberDetail } = trpc.admin.getMemberDetail.useQuery(
    { userId: selectedUserId! },
    { enabled: isAdmin && !!selectedUserId }
  );

  // ── Mutations ──────────────────────────────────────────────────────────
  const updateBookingStatus = trpc.bookings.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Booking status updated");
      utils.bookings.getAll.invalidate();
      utils.admin.getDashboardStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const applyOverride = trpc.admin.applyOverride.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.admin.getMemberDetail.invalidate();
      utils.admin.getDashboardStats.invalidate();
      setOverrideReason("");
      setOverrideDelta("");
    },
    onError: (err) => toast.error(err.message),
  });

  const createSlot = trpc.sessionSlots.create.useMutation({
    onSuccess: () => {
      toast.success("Session slot created");
      utils.sessionSlots.getAll.invalidate();
      setShowSlotDialog(false);
      setNewSlot({ name: "", startsAtUtc: "", endsAtUtc: "", capacity: "10", trainerName: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Access Guard ───────────────────────────────────────────────────────
  if (!isAdmin) {
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

  const filteredUsers = searchQuery
    ? users?.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const handleApplyOverride = () => {
    if (!selectedUserId || !overrideReason) {
      toast.error("Please fill in all required fields");
      return;
    }
    applyOverride.mutate({
      userId: selectedUserId,
      changeType: overrideType as any,
      sessionDelta: overrideDelta ? parseInt(overrideDelta) : undefined,
      reason: overrideReason,
    });
  };

  const handleCreateSlot = () => {
    if (!newSlot.name || !newSlot.startsAtUtc || !newSlot.endsAtUtc) {
      toast.error("Name, start time, and end time are required");
      return;
    }
    createSlot.mutate({
      name: newSlot.name,
      startsAtUtc: new Date(newSlot.startsAtUtc).toISOString(),
      endsAtUtc: new Date(newSlot.endsAtUtc).toISOString(),
      capacity: parseInt(newSlot.capacity) || 10,
      trainerName: newSlot.trainerName || undefined,
    });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      confirmed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800",
      expired: "bg-gray-100 text-gray-800",
      past_due: "bg-orange-100 text-orange-800",
      suspended: "bg-red-100 text-red-800",
      no_show: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={`text-xs ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </Badge>
    );
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
            <Link href="/dashboard">
              <Button variant="outline" size="sm">My Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 sm:pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 max-w-7xl">
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light mb-2">Admin Dashboard</h1>
            <p className="text-lg text-muted-foreground font-light">
              Manage members, bookings, sessions, and revenue
            </p>
          </div>

          {/* ── Stats Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-light">{stats?.totalUsers || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-light">{stats?.activeMembers || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-light">{stats?.activeSubscriptions || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-light">{stats?.totalBookings || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-light">{stats?.totalSessionsThisWeek || 0}</div>
                <p className="text-xs text-muted-foreground">sessions</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Revenue (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-light">
                  ${parseFloat(stats?.revenue?.last30Days || "0").toFixed(0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────── */}
          <Tabs defaultValue="members" className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-max">
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="sessions">Session Slots</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="overrides">Overrides</TabsTrigger>
              </TabsList>
            </div>

            {/* ── Members Tab ──────────────────────────────────────── */}
            <TabsContent value="members">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">Members</CardTitle>
                      <CardDescription>View and manage user accounts</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers?.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-mono text-xs">#{u.id}</TableCell>
                            <TableCell>{u.name || "-"}</TableCell>
                            <TableCell className="text-xs">{u.email || "-"}</TableCell>
                            <TableCell>{statusBadge(u.role)}</TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(u.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setShowMemberDialog(true);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Member Detail Dialog */}
              <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Member Detail</DialogTitle>
                    <DialogDescription>
                      {memberDetail?.user?.name} ({memberDetail?.user?.email})
                    </DialogDescription>
                  </DialogHeader>
                  {memberDetail && (
                    <div className="space-y-6">
                      {/* Current Week Usage */}
                      <div>
                        <h4 className="font-medium mb-2">Current Week Usage</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-secondary rounded">
                            <p className="text-xs text-muted-foreground">Used</p>
                            <p className="text-xl font-light">{memberDetail.currentWeek.sessionsUsed}</p>
                          </div>
                          <div className="p-3 bg-secondary rounded">
                            <p className="text-xs text-muted-foreground">Limit</p>
                            <p className="text-xl font-light">{memberDetail.currentWeek.sessionsLimit}</p>
                          </div>
                          <div className="p-3 bg-secondary rounded">
                            <p className="text-xs text-muted-foreground">Remaining</p>
                            <p className="text-xl font-light">
                              {Math.max(0, memberDetail.currentWeek.sessionsLimit - memberDetail.currentWeek.sessionsUsed)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Subscription */}
                      {memberDetail.subscription && (
                        <div>
                          <h4 className="font-medium mb-2">Active Subscription</h4>
                          <div className="p-3 border rounded">
                            <p>
                              <strong>{memberDetail.subscription.tierName}</strong>{" "}
                              {statusBadge(memberDetail.subscription.status)}
                            </p>
                            {memberDetail.subscription.currentPeriodEnd && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Period ends: {format(new Date(memberDetail.subscription.currentPeriodEnd), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Override Actions */}
                      <div>
                        <h4 className="font-medium mb-2">Apply Override</h4>
                        <div className="space-y-3">
                          <Select value={overrideType} onValueChange={setOverrideType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add_sessions">Add Sessions</SelectItem>
                              <SelectItem value="remove_sessions">Remove Sessions</SelectItem>
                              <SelectItem value="suspend">Suspend</SelectItem>
                              <SelectItem value="reactivate">Reactivate</SelectItem>
                            </SelectContent>
                          </Select>
                          {(overrideType === "add_sessions" || overrideType === "remove_sessions") && (
                            <Input
                              type="number"
                              placeholder="Number of sessions"
                              value={overrideDelta}
                              onChange={(e) => setOverrideDelta(e.target.value)}
                            />
                          )}
                          <Textarea
                            placeholder="Reason for override (required)"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                          />
                          <Button
                            onClick={handleApplyOverride}
                            disabled={applyOverride.isPending}
                            size="sm"
                          >
                            {applyOverride.isPending ? "Applying..." : "Apply Override"}
                          </Button>
                        </div>
                      </div>

                      {/* Recent Overrides */}
                      {memberDetail.overrides.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Override History</h4>
                          <div className="space-y-2">
                            {memberDetail.overrides.map((o: any) => (
                              <div key={o.id} className="p-2 border rounded text-sm">
                                <div className="flex items-center gap-2">
                                  {statusBadge(o.changeType)}
                                  {o.sessionDelta && (
                                    <span className="text-xs text-muted-foreground">
                                      ({o.sessionDelta > 0 ? "+" : ""}{o.sessionDelta} sessions)
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {format(new Date(o.createdAt), "MMM d, h:mm a")}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{o.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Bookings */}
                      {memberDetail.recentBookings.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Recent Bookings</h4>
                          <div className="space-y-1">
                            {memberDetail.recentBookings.slice(0, 5).map((b: any) => (
                              <div key={b.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                <span>#{b.id}</span>
                                {statusBadge(b.status)}
                                <span className="text-xs text-muted-foreground">
                                  {b.bookingDate ? format(new Date(b.bookingDate), "MMM d") : "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* ── Bookings Tab ─────────────────────────────────────── */}
            <TabsContent value="bookings">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">All Bookings</CardTitle>
                  <CardDescription>Manage and update booking statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {bookings && bookings.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Slot</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookings.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono text-xs">#{b.id}</TableCell>
                              <TableCell className="text-xs">{b.userId}</TableCell>
                              <TableCell className="text-xs">
                                {b.sessionSlot?.name || b.sessionSlotId || "-"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {b.bookingDate
                                  ? format(new Date(b.bookingDate), "MMM d, h:mm a")
                                  : b.sessionSlot?.startsAtUtc
                                  ? format(new Date(b.sessionSlot.startsAtUtc), "MMM d, h:mm a")
                                  : "-"}
                              </TableCell>
                              <TableCell>{statusBadge(b.status)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {b.status === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={() =>
                                        updateBookingStatus.mutate({ id: b.id, status: "confirmed" })
                                      }
                                    >
                                      Confirm
                                    </Button>
                                  )}
                                  {(b.status === "confirmed" || b.status === "pending") && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs h-7 text-destructive"
                                      onClick={() =>
                                        updateBookingStatus.mutate({ id: b.id, status: "no_show" })
                                      }
                                    >
                                      No Show
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No bookings found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Session Slots Tab ────────────────────────────────── */}
            <TabsContent value="sessions">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">Session Slots</CardTitle>
                      <CardDescription>Create and manage available session times</CardDescription>
                    </div>
                    <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                          <Plus className="h-3 w-3" /> New Slot
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Session Slot</DialogTitle>
                          <DialogDescription>
                            Add a new bookable session time
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input
                              placeholder="e.g. Morning HIIT"
                              value={newSlot.name}
                              onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Start Time</label>
                            <Input
                              type="datetime-local"
                              value={newSlot.startsAtUtc}
                              onChange={(e) => setNewSlot({ ...newSlot, startsAtUtc: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">End Time</label>
                            <Input
                              type="datetime-local"
                              value={newSlot.endsAtUtc}
                              onChange={(e) => setNewSlot({ ...newSlot, endsAtUtc: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Capacity</label>
                            <Input
                              type="number"
                              value={newSlot.capacity}
                              onChange={(e) => setNewSlot({ ...newSlot, capacity: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Trainer (optional)</label>
                            <Input
                              placeholder="Trainer name"
                              value={newSlot.trainerName}
                              onChange={(e) => setNewSlot({ ...newSlot, trainerName: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreateSlot} disabled={createSlot.isPending}>
                            {createSlot.isPending ? "Creating..." : "Create Slot"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {sessionSlots && sessionSlots.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Booked</TableHead>
                            <TableHead>Trainer</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionSlots.map((slot) => (
                            <TableRow key={slot.id}>
                              <TableCell className="font-medium">{slot.name}</TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(slot.startsAtUtc), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(slot.startsAtUtc), "h:mm a")} –{" "}
                                {format(new Date(slot.endsAtUtc), "h:mm a")}
                              </TableCell>
                              <TableCell>{slot.capacity}</TableCell>
                              <TableCell>{slot.bookedCount}</TableCell>
                              <TableCell className="text-xs">{slot.trainerName || "-"}</TableCell>
                              <TableCell>
                                {slot.isActive ? statusBadge("active") : statusBadge("cancelled")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-3">No session slots created yet</p>
                        <Button size="sm" onClick={() => setShowSlotDialog(true)}>
                          Create First Slot
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Subscriptions Tab ────────────────────────────────── */}
            <TabsContent value="subscriptions">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">Subscriptions</CardTitle>
                  <CardDescription>Active and past subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {subscriptions && subscriptions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Period End</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriptions.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-mono text-xs">#{sub.id}</TableCell>
                              <TableCell>{sub.userId}</TableCell>
                              <TableCell>{sub.tierId}</TableCell>
                              <TableCell>{statusBadge(sub.status)}</TableCell>
                              <TableCell className="text-xs">{sub.paymentProvider}</TableCell>
                              <TableCell className="text-xs">
                                {sub.currentPeriodEnd
                                  ? format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(sub.createdAt), "MMM d, yyyy")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Revenue Tab ──────────────────────────────────────── */}
            <TabsContent value="revenue">
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Revenue (30d)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-light">
                      ${parseFloat(revenue?.totalRevenue || stats?.revenue?.last30Days || "0").toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-light">
                      {revenue?.transactionCount || stats?.revenue?.transactionCount || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Failed Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-light text-destructive">
                      {revenue?.failedPayments || stats?.revenue?.failedPayments || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl">Revenue Details</CardTitle>
                  <CardDescription>
                    Payment transaction data is tracked via Stripe webhooks. View detailed breakdowns
                    in your Stripe Dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-3">
                      Detailed revenue charts coming soon
                    </p>
                    <a
                      href="https://dashboard.stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        Open Stripe Dashboard
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Overrides Tab ────────────────────────────────────── */}
            <TabsContent value="overrides">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">Admin Overrides</CardTitle>
                  <CardDescription>
                    Audit trail of all admin actions on member accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OverridesTable />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/** Sub-component for the overrides table to keep the main component cleaner */
function OverridesTable() {
  const { data: overrides } = trpc.admin.getOverrides.useQuery();

  if (!overrides || overrides.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No overrides recorded yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Delta</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map((o: any) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs">#{o.id}</TableCell>
              <TableCell>{o.userId}</TableCell>
              <TableCell>{o.adminUserId}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {o.changeType}
                </Badge>
              </TableCell>
              <TableCell>{o.sessionDelta ?? "-"}</TableCell>
              <TableCell className="text-xs max-w-[200px] truncate">{o.reason}</TableCell>
              <TableCell className="text-xs">
                {format(new Date(o.createdAt), "MMM d, h:mm a")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
