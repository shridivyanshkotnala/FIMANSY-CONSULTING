import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMeQuery } from "@/Redux/Slices/api/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";
import { useCompleteOnboardingMutation } from "@/Redux/Slices/api/authApi";

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: user, isLoading } = useMeQuery();

  
  const [completeOnboarding] = useCompleteOnboardingMutation();

  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");

  // already has org → go dashboard
  useEffect(() => {
    if (!isLoading && user?.isOnboarded) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();

    if (orgName.trim().length < 2) {
      toast({
        title: "Validation Error",
        description: "Organization name must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      // TEMP: until org API exists
      // we simulate org selection

      const res = await completeOnboarding(orgName.trim()).unwrap();

      toast({
        title: "Organization Created",
        description: "You can now enter the dashboard",
      });
      // store active organization id for header/query usage
      if (res?.data?.organization?._id) {
        localStorage.setItem("activeOrgId", res.data.organization._id);
      }
      navigate("/dashboard", { replace: true });



    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground font-serif">F</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-serif">Welcome to Fimansy</h1>
          <p className="text-center text-muted-foreground">
            Let's set up your organization to get started
          </p>
        </div>

        <Card>
          <form onSubmit={handleCreateOrg}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Create Organization
              </CardTitle>
              <CardDescription>
                Your organization is where your team will collaborate
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  type="text"
                  placeholder="e.g., ABC Technologies Pvt Ltd"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Organization
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
