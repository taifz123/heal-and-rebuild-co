import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, requires the user to have admin role */
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute wraps pages that require authentication.
 *
 * - Shows a loading spinner while auth state is being resolved
 * - Redirects to login if not authenticated
 * - Shows "Access Denied" if requireAdmin is true and user is not admin
 */
export default function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6 space-y-4">
          <h2 className="text-3xl font-light">Sign In Required</h2>
          <p className="text-muted-foreground">
            You need to be signed in to access this page.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (requireAdmin && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6 space-y-4">
          <h2 className="text-3xl font-light">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access this page.
          </p>
          <Link href="/">
            <Button size="lg">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
