import { Link } from "wouter";
import { Briefcase, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-6">
          <Briefcase className="w-10 h-10 text-primary" />
        </div>
        <p className="text-8xl font-black text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Looks like this page went out of stock. Let's get you back to your dashboard.
        </p>
        <Link href="/">
          <Button className="cursor-pointer gap-2">
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
