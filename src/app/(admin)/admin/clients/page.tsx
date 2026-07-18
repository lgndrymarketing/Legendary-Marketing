"use client";

import { useState } from "react";
import { PageHero } from "@/components/ui/firecrawl";
import { Button } from "@/components/ui/button";
import { ClientRoster } from "@/components/admin/client-roster";
import { Plus } from "lucide-react";

export default function AdminClientsPage() {
  const [addTrigger, setAddTrigger] = useState(0);

  return (
    <div className="space-y-10">
      <PageHero
        title="Clients"
        description="The agency roster — packages, retainers, setup fees, and client statuses."
        action={
          <Button size="sm" onClick={() => setAddTrigger((n) => n + 1)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Client
          </Button>
        }
      />
      <ClientRoster addTrigger={addTrigger} />
    </div>
  );
}
