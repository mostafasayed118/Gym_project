"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function AssignClientForm() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const assignCoach = useMutation(api.auth.assignCoach);

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : "skip",
  );

  const [clientClerkId, setClientClerkId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!convexUser || !clientClerkId) return;

    setIsSubmitting(true);
    try {
      await assignCoach({
        clientClerkId,
        coachClerkId: convexUser.clerkId,
      });
      toast.success("Client assigned successfully!");
      router.push("/coach/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign client");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/coach/dashboard" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Client</h1>
          <p className="text-muted-foreground text-sm">
            Assign an existing user to your coaching roster.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="clientClerkId" className="mb-1.5">
              Client Clerk ID
            </Label>
            <Input
              id="clientClerkId"
              placeholder="e.g. user_3FHhGOhUt3u91vKoe09JsugwFY6"
              value={clientClerkId}
              onChange={(e) => setClientClerkId(e.target.value)}
              required
            />
            <p className="text-muted-foreground mt-1 text-xs">
              The Clerk user ID of the client you want to assign.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/coach/dashboard" />}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !clientClerkId}>
          {isSubmitting ? "Assigning..." : "Assign Client"}
        </Button>
      </div>
    </form>
  );
}
