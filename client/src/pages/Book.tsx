import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Calendar, Clock, Users, Dumbbell, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow } from "date-fns";
import { useState, useMemo } from "react";

export default function Book() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [selectedDate, setSelectedDate] = useState<string>("all");

  const { data: slots, isLoading: slotsLoading } = trpc.sessionSlots.getAvailable.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.bookings.getSummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: serviceTypes } = trpc.serviceTypes.getAll.useQuery();

  const bookSlot = trpc.bookings.book.useMutation({
    onSuccess: () => {
      toast.success("Session booked successfully!");
      utils.sessionSlots.getAvailable.invalidate();
      utils.bookings.getSummary.invalidate();
      utils.bookings.getMy.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to book session");
    },
  });

  // Group slots by date
  const groupedSlots = useMemo(() => {
    if (!slots) return {};
    const groups: Record<string, typeof slots> = {};
    for (const slot of slots) {
      const dateKey = format(new Date(slot.startsAtUtc), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(slot);
    }
    return groups;
  }, [slots]);

  const dateKeys = Object.keys(groupedSlots).sort();
  const filteredDateKeys = selectedDate === "all" ? dateKeys : dateKeys.filter((d) => d === selectedDate);

  const getServiceName = (serviceTypeId: number | null) => {
    if (!serviceTypeId || !serviceTypes) return "";
    const st = serviceTypes.find((s) => s.id === serviceTypeId);
    return st?.name || "";
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  const handleBook = (slotId: number, serviceTypeId: number | null) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to book a session");
      return;
    }
    if (!summary?.canBook) {
      if (!summary?.hasActiveSubscription) {
        toast.error("You need an active membership to book sessions");
      } else {
        toast.error("You've reached your weekly session limit");
      }
      return;
    }
    bookSlot.mutate({
      sessionSlotId: slotId,
      serviceTypeId: serviceTypeId || 1,
    });
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 max-w-5xl">
          <div className="mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light mb-4">Book a Session</h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-light">
              Choose from available sessions and reserve your spot
            </p>
          </div>

          {/* Quota Summary Card */}
          {isAuthenticated && (
            <Card className="border-2 mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Your Weekly Quota</CardTitle>
                {summary?.tierName && (
                  <CardDescription>{summary.tierName} Plan</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : summary?.hasActiveSubscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {summary.sessionsUsed} of {summary.weeklyLimit} sessions used this week
                      </span>
                      <span className="font-medium">
                        {summary.sessionsRemaining} remaining
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
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Weekly limit reached. Resets next Monday.</span>
                      </div>
                    )}
                    {summary.sessionsRemaining > 0 && summary.sessionsRemaining <= 2 && (
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Only {summary.sessionsRemaining} session{summary.sessionsRemaining > 1 ? "s" : ""} remaining this week</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">No active membership</p>
                    <Link href="/memberships">
                      <Button size="sm">Get a Membership</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Date Filter */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              <Button
                variant={selectedDate === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("all")}
              >
                All Dates
              </Button>
              {dateKeys.map((dateKey) => (
                <Button
                  key={dateKey}
                  variant={selectedDate === dateKey ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDate(dateKey)}
                >
                  {formatDateLabel(dateKey)}
                </Button>
              ))}
            </div>
          </div>

          {/* Session Slots */}
          {slotsLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading available sessions...</p>
              </CardContent>
            </Card>
          ) : filteredDateKeys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-2">No sessions available</p>
                <p className="text-sm text-muted-foreground">
                  Check back later for new sessions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {filteredDateKeys.map((dateKey) => (
                <div key={dateKey}>
                  <h2 className="text-xl sm:text-2xl font-light mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatDateLabel(dateKey)}
                  </h2>
                  <div className="grid gap-3 sm:gap-4">
                    {groupedSlots[dateKey].map((slot) => {
                      const spotsLeft = slot.capacity - slot.bookedCount;
                      const isFull = spotsLeft <= 0;
                      const isLowCapacity = spotsLeft <= 3 && !isFull;

                      return (
                        <Card
                          key={slot.id}
                          className={`border-2 transition-all ${
                            isFull ? "opacity-60" : "hover:border-foreground"
                          }`}
                        >
                          <CardContent className="py-4 sm:py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start sm:items-center gap-2 flex-wrap mb-2">
                                  <h3 className="text-lg sm:text-xl font-medium truncate">
                                    {slot.name}
                                  </h3>
                                  {slot.serviceTypeId && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      {getServiceName(slot.serviceTypeId)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(slot.startsAtUtc), "h:mm a")} –{" "}
                                    {format(new Date(slot.endsAtUtc), "h:mm a")}
                                  </span>
                                  {slot.trainerName && (
                                    <span className="flex items-center gap-1">
                                      <Dumbbell className="h-3.5 w-3.5" />
                                      {slot.trainerName}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {isFull ? (
                                      <span className="text-destructive font-medium">Full</span>
                                    ) : isLowCapacity ? (
                                      <span className="text-amber-600 font-medium">
                                        {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left
                                      </span>
                                    ) : (
                                      <span>{spotsLeft} spots available</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <Button
                                  onClick={() => handleBook(slot.id, slot.serviceTypeId)}
                                  disabled={isFull || bookSlot.isPending || (isAuthenticated && !summary?.canBook)}
                                  className="w-full sm:w-auto"
                                  size="sm"
                                >
                                  {bookSlot.isPending ? "Booking..." : isFull ? "Full" : "Book Now"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Not signed in prompt */}
          {!isAuthenticated && (
            <Card className="mt-8 border-2 border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Sign in with an active membership to book sessions
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/login">
                    <Button>Sign In</Button>
                  </Link>
                  <Link href="/memberships">
                    <Button variant="outline">View Memberships</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
