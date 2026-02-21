import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Users, Calendar, DollarSign, TrendingUp, Activity, Search, Plus, Eye,
  CreditCard, BarChart3, AlertTriangle, ShieldAlert, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";

export default function Admin() {
  const utils = trpc.useUtils();

  // ── State ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [overrideType, setOverrideType] = useState<string>("add_sessions");
  const [overrideDelta, setOverrideDelta] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("all");
  const [newSlot, setNewSlot] = useState({
    name: "",
    startsAtUtc: "",
    endsAtUtc: "",
    capacity: "10",
    trainerName: "",
  });

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: stats } = trpc.admin.getDashboardStats.useQuery();
  const { data: users } = trpc.admin.getUsers.useQuery();
  const { data: bookings } = trpc.bookings.getAll.useQuery();
  const { data: subscriptions } = trpc.subscriptions.getAll.useQuery();
  const { data: sessionSlots } = trpc.sessionSlots.getAll.useQuery();
  const { data: revenue } = trpc.admin.getRevenue.useQuery();
  const { data: memberDetail } = trpc.admin.getMemberDetail.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId }
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
      utils.admin.getUsers.invalidate();
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

  // ── Filtering ──────────────────────────────────────────────────────────
  const filteredUsers = users?.filter((u) => {
    const matchesSearch = !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = memberStatusFilter === "all" || u.status === memberStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBookings = bookings?.filter((b) => {
    return bookingStatusFilter === "all" || b.status === bookingStatusFilter;
  });

  // ── Helpers ────────────────────────────────────────────────────────────
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
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      expired: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
      past_due: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      suspended: "bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300",
      no_show: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      user: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return (
      <Badge className={`text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </Badge>
    );
  };

  /** Detect churn risk: no bookings in last 14 days + has active subscription */
  const getChurnSignal = (u: any) => {
    if (!u.lastSignedIn) return null;
    const daysSinceLogin = differenceInDays(new Date(), new Date(u.lastSignedIn));
    if (daysSinceLogin > 14) {
      return { level: "warning" as const, days: daysSinceLogin };
    }
    if (daysSinceLogin > 30) {
      return { level: "critical" as const, days: daysSinceLogin };
    }
    return null;
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
                <TabsTrigger value="audit">Audit Log</TabsTrigger>
              </TabsList>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                MEMBERS TAB — with status filter, churn signals, status badges
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="members">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">Members</CardTitle>
                      <CardDescription>View and manage user accounts</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <TableHead>Status</TableHead>
                          <TableHead>Churn Risk</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers?.map((u) => {
                          const churn = getChurnSignal(u);
                          return (
                            <TableRow key={u.id} className={u.status === "suspended" ? "opacity-60" : ""}>
                              <TableCell className="font-mono text-xs">#{u.id}</TableCell>
                              <TableCell>{u.name || "-"}</TableCell>
                              <TableCell className="text-xs">{u.email || "-"}</TableCell>
                              <TableCell>{statusBadge(u.role)}</TableCell>
                              <TableCell>{statusBadge(u.status || "active")}</TableCell>
                              <TableCell>
                                {churn ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs gap-1 ${
                                      churn.level === "critical"
                                        ? "border-red-300 text-red-700"
                                        : "border-orange-300 text-orange-700"
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {churn.days}d inactive
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {u.lastSignedIn
                                  ? format(new Date(u.lastSignedIn), "MMM d, h:mm a")
                                  : "Never"}
                              </TableCell>
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
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredUsers?.length === 0 && (
                      <p className="text-center py-8 text-muted-foreground">No members match your filters</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Member Detail Dialog with Confirmation Modals ────── */}
              <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      Member Detail
                      {memberDetail?.user?.status && statusBadge(memberDetail.user.status)}
                    </DialogTitle>
                    <DialogDescription>
                      {memberDetail?.user?.name || "Unnamed"} ({memberDetail?.user?.email})
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
                        {/* Usage progress bar */}
                        <div className="mt-3">
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                memberDetail.currentWeek.sessionsUsed >= memberDetail.currentWeek.sessionsLimit
                                  ? "bg-red-500"
                                  : memberDetail.currentWeek.sessionsUsed >= memberDetail.currentWeek.sessionsLimit * 0.8
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(100, memberDetail.currentWeek.sessionsLimit > 0
                                  ? (memberDetail.currentWeek.sessionsUsed / memberDetail.currentWeek.sessionsLimit) * 100
                                  : 0)}%`,
                              }}
                            />
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

                      {/* Override Actions with Confirmation */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" /> Apply Override
                        </h4>
                        <div className="space-y-3">
                          <Select value={overrideType} onValueChange={setOverrideType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add_sessions">Add Sessions</SelectItem>
                              <SelectItem value="remove_sessions">Remove Sessions</SelectItem>
                              <SelectItem value="suspend">Suspend Account</SelectItem>
                              <SelectItem value="reactivate">Reactivate Account</SelectItem>
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

                          {/* Confirmation dialog for risky actions */}
                          {overrideType === "suspend" || overrideType === "reactivate" ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant={overrideType === "suspend" ? "destructive" : "default"}
                                  size="sm"
                                  disabled={!overrideReason || applyOverride.isPending}
                                >
                                  {applyOverride.isPending
                                    ? "Applying..."
                                    : overrideType === "suspend"
                                    ? "Suspend Account"
                                    : "Reactivate Account"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {overrideType === "suspend"
                                      ? "Suspend this member?"
                                      : "Reactivate this member?"}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {overrideType === "suspend"
                                      ? `This will immediately prevent ${memberDetail.user?.name || "this user"} from booking sessions or accessing their account. They will need to be manually reactivated.`
                                      : `This will restore ${memberDetail.user?.name || "this user"}'s access to book sessions and use their account.`}
                                    <br /><br />
                                    <strong>Reason:</strong> {overrideReason}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleApplyOverride}
                                    className={overrideType === "suspend" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                                  >
                                    Confirm {overrideType === "suspend" ? "Suspension" : "Reactivation"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  disabled={!overrideReason || applyOverride.isPending}
                                >
                                  {applyOverride.isPending ? "Applying..." : "Apply Override"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Override</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    You are about to <strong>{overrideType.replace("_", " ")}</strong>
                                    {overrideDelta ? ` (${overrideDelta} sessions)` : ""} for{" "}
                                    <strong>{memberDetail.user?.name || "this user"}</strong>.
                                    <br /><br />
                                    <strong>Reason:</strong> {overrideReason}
                                    <br /><br />
                                    This action will be recorded in the audit trail.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleApplyOverride}>
                                    Confirm Override
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
                                  {o.sessionDelta != null && (
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

            {/* ═══════════════════════════════════════════════════════════
                BOOKINGS TAB — with status filter and confirmation modals
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="bookings">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">All Bookings</CardTitle>
                      <CardDescription>Manage and update booking statuses</CardDescription>
                    </div>
                    <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {filteredBookings && filteredBookings.length > 0 ? (
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
                          {filteredBookings.map((b) => (
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
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-xs h-7 text-destructive"
                                        >
                                          No Show
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Mark as No Show?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will mark booking #{b.id} as a no-show. The member's session credit will not be returned.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() =>
                                              updateBookingStatus.mutate({ id: b.id, status: "no_show" })
                                            }
                                          >
                                            Confirm No Show
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No bookings match your filter</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                SESSION SLOTS TAB
            ═══════════════════════════════════════════════════════════ */}
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
                          <DialogDescription>Add a new bookable session time</DialogDescription>
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
                              <TableCell>
                                <span className={slot.bookedCount >= slot.capacity ? "text-red-600 font-medium" : ""}>
                                  {slot.bookedCount}
                                </span>
                              </TableCell>
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

            {/* ═══════════════════════════════════════════════════════════
                SUBSCRIPTIONS TAB — with churn signals
            ═══════════════════════════════════════════════════════════ */}
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
                            <TableHead>Risk</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriptions.map((sub) => {
                            const isExpiringSoon = sub.currentPeriodEnd &&
                              differenceInDays(new Date(sub.currentPeriodEnd), new Date()) <= 7 &&
                              sub.status === "active";
                            return (
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
                                <TableCell>
                                  {isExpiringSoon && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Expiring soon
                                    </Badge>
                                  )}
                                  {sub.status === "past_due" && (
                                    <Badge variant="outline" className="text-xs border-red-300 text-red-700 gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Payment failed
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {format(new Date(sub.createdAt), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                REVENUE TAB
            ═══════════════════════════════════════════════════════════ */}
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
                    Payment transaction data is tracked via Stripe webhooks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-3">
                      Detailed revenue charts coming soon
                    </p>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">Open Stripe Dashboard</Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                OVERRIDES TAB
            ═══════════════════════════════════════════════════════════ */}
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

            {/* ═══════════════════════════════════════════════════════════
                AUDIT LOG TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="audit">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Audit Log
                  </CardTitle>
                  <CardDescription>
                    System-wide audit trail of authentication events, admin actions, and security events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuditLogTable />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/** Sub-component for the overrides table */
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
                <Badge variant="outline" className="text-xs">{o.changeType}</Badge>
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

/** Sub-component for the audit log table */
function AuditLogTable() {
  const { data: auditLogs, isLoading } = trpc.admin.getAuditLogs.useQuery();

  if (isLoading) {
    return <p className="text-center py-8 text-muted-foreground">Loading audit logs...</p>;
  }

  if (!auditLogs || auditLogs.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No audit log entries yet</p>;
  }

  const actionBadge = (action: string) => {
    const colors: Record<string, string> = {
      "auth.login": "bg-green-100 text-green-800",
      "auth.register": "bg-blue-100 text-blue-800",
      "auth.logout": "bg-gray-100 text-gray-800",
      "auth.login.failed": "bg-red-100 text-red-800",
      "auth.login.blocked": "bg-red-200 text-red-900",
      "auth.otp.requested": "bg-yellow-100 text-yellow-800",
    };
    return (
      <Badge className={`text-xs ${colors[action] || "bg-gray-100 text-gray-800"}`}>
        {action}
      </Badge>
    );
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLogs.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">#{log.id}</TableCell>
              <TableCell>{actionBadge(log.action)}</TableCell>
              <TableCell className="text-xs">{log.userId ?? "-"}</TableCell>
              <TableCell className="text-xs">
                {log.entityType ? `${log.entityType}${log.entityId ? `#${log.entityId}` : ""}` : "-"}
              </TableCell>
              <TableCell className="text-xs max-w-[200px] truncate">
                {log.details || "-"}
              </TableCell>
              <TableCell className="text-xs font-mono">{log.ipAddress || "-"}</TableCell>
              <TableCell className="text-xs">
                {format(new Date(log.createdAt), "MMM d, h:mm a")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
