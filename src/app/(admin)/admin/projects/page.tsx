"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, ArrowRight } from "lucide-react";

const demoProjects = [
  { id: "1", client: "John Doe", name: "Meta Ads Launch", service: "Paid Advertising", status: "in_progress", phase: "Build & Launch", payment: "paid" },
  { id: "2", client: "Jane Smith", name: "Lead Gen Funnel", service: "High-Converting Funnels", status: "in_progress", phase: "Strategy & Setup", payment: "paid" },
  { id: "3", client: "Bob Wilson", name: "Google Ads Program", service: "Paid Advertising", status: "payment_pending", phase: "Discovery", payment: "pending" },
  { id: "4", client: "Sarah Lee", name: "Brand Website", service: "Websites & Landing Pages", status: "completed", phase: "Scale", payment: "paid" },
  { id: "5", client: "Mike Chen", name: "GoHighLevel Pipeline Setup", service: "CRM & Automation", status: "in_progress", phase: "Optimization", payment: "paid" },
];

export default function AdminProjectsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Projects</h1>
        <p className="text-muted-foreground mt-1">Manage all client projects and update phases.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-orange" />
            All Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Service</th>
                  <th className="pb-3 font-medium">Phase</th>
                  <th className="pb-3 font-medium">Payment</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {demoProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/50">
                    <td className="py-3 font-medium">{project.name}</td>
                    <td className="py-3 text-muted-foreground">{project.client}</td>
                    <td className="py-3 text-muted-foreground">{project.service}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{project.phase}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={project.payment === "paid" ? "success" : "warning"}>
                        {project.payment}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          project.status === "completed" ? "success" :
                          project.status === "payment_pending" ? "warning" : "orange"
                        }
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/projects/${project.id}`}>
                          Manage <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
