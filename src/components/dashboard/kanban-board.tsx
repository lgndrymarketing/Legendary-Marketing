"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { KanbanSquare, Plus, User } from "lucide-react";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
}

export interface TeamMemberOption {
  id: string;
  name: string;
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

const priorityVariant: Record<TaskPriority, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

interface KanbanBoardProps {
  projectId: string;
  canEdit?: boolean;
  teamMembers?: TeamMemberOption[];
}

export function KanbanBoard({ projectId, canEdit = true, teamMembers = [] }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(() => {
    fetch(`/api/tasks?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const createTask = async (status: TaskStatus) => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title: newTitle }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [...prev, { ...task, status }]);
      if (status !== "todo") updateStatus(task.id, status);
      setNewTitle("");
      setAddingTo(null);
    }
  };

  if (loading) {
    return <EmptyState icon={KanbanSquare} title="Loading board..." description="" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        return (
          <div
            key={column.id}
            className="rounded-xl border border-border bg-muted/30 p-3 min-h-[200px]"
            onDragOver={(e) => canEdit && e.preventDefault()}
            onDrop={() => {
              if (canEdit && dragTaskId) updateStatus(dragTaskId, column.id);
              setDragTaskId(null);
            }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold">{column.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnTasks.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {columnTasks.map((task) => {
                const assignee = teamMembers.find((m) => m.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={() => setDragTaskId(task.id)}
                    className={cn(
                      "rounded-lg border border-border bg-card p-3 shadow-sm",
                      canEdit && "cursor-grab active:cursor-grabbing"
                    )}
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2.5">
                      <Badge variant={priorityVariant[task.priority]} className="text-[10px] capitalize">
                        {task.priority}
                      </Badge>
                      {assignee && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {canEdit && (
              addingTo === column.id ? (
                <div className="mt-2 space-y-1.5">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createTask(column.id);
                      if (e.key === "Escape") setAddingTo(null);
                    }}
                    placeholder="Task title..."
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => createTask(column.id)}
                      className="text-xs font-medium text-primary-foreground bg-primary rounded px-2 py-1"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingTo(null)}
                      className="text-xs text-muted-foreground px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo(column.id)}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
