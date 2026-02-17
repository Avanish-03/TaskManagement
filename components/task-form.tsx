"use client"

import React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { TaskType, TimeSegment } from "@/types"

function calculateSegmentDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)

  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0

  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em

  if (endMin <= startMin) return 0

  return endMin - startMin
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return `${hours}h ${mins}m`
}

function calculateTotalDuration(segments: TimeSegment[]): number {
  let total = 0
  for (const segment of segments) {
    total += calculateSegmentDuration(segment.startTime, segment.endTime)
  }
  return total
}

const MIN_WORK_DURATION_MINUTES = 460
const TARGET_WORK_DURATION_MINUTES = 480

function getDayType(dateStr: string): "Work" | "Weekend" {
  const d = new Date(dateStr)
  const day = d.getDay()
  return day === 0 || day === 6 ? "Weekend" : "Work"
}

interface TaskFormProps {
  onTaskSaved: () => void
  editingTask?: TaskType | null
  onCancelEdit?: () => void
}

export function TaskForm({
  onTaskSaved,
  editingTask,
  onCancelEdit,
}: TaskFormProps) {

  const [date, setDate] = useState("")
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([
    { startTime: "", endTime: "" },
  ])
  const [description, setDescription] = useState("")
  const [taskType, setTaskType] = useState<"Work" | "Holiday" | "Weekend" | "Leave">("Work")
  const [saving, setSaving] = useState(false)

  const isNonWorkType = taskType === "Holiday" || taskType === "Weekend" || taskType === "Leave"

  useEffect(() => {
    if (editingTask) {
      const d = new Date(editingTask.date)
      setDate(d.toISOString().split("T")[0])
      setDescription(editingTask.description)
      setTaskType(editingTask.type)

      if (editingTask.timeSegments?.length) {
        setTimeSegments(editingTask.timeSegments)
      }
    }
  }, [editingTask])

  useEffect(() => {
    if (date) {
      const dayType = getDayType(date)
      if (dayType === "Weekend") {
        setTaskType("Weekend")
      }
    }
  }, [date])

  useEffect(() => {
    if (isNonWorkType) {
      setTimeSegments([{ startTime: "", endTime: "" }])
    }
  }, [taskType])

  function resetForm() {
    setDate("")
    setTimeSegments([{ startTime: "", endTime: "" }])
    setDescription("")
    setTaskType("Work")
  }

  function addTimeSegment() {
    setTimeSegments([...timeSegments, { startTime: "", endTime: "" }])
  }

  function removeTimeSegment(index: number) {
    if (timeSegments.length > 1) {
      setTimeSegments(timeSegments.filter((_, i) => i !== index))
    } else {
      toast.error("At least one time segment is required")
    }
  }

  function updateTimeSegment(index: number, field: "startTime" | "endTime", value: string) {
    const updated = [...timeSegments]
    updated[index] = { ...updated[index], [field]: value }
    setTimeSegments(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!date || !description) {
      toast.error("Please fill in date and description")
      return
    }

    let validSegments: TimeSegment[] = []
    let totalMinutes = 0
    let duration = ""

    if (!isNonWorkType) {

      validSegments = timeSegments.filter(
        (seg) => seg.startTime && seg.endTime
      )

      if (validSegments.length === 0) {
        toast.error("Please add at least one time segment")
        return
      }

      for (const segment of validSegments) {
        const segmentDuration = calculateSegmentDuration(segment.startTime, segment.endTime)
        if (segmentDuration <= 0) {
          toast.error("End time must be after start time")
          return
        }
      }

      totalMinutes = calculateTotalDuration(validSegments)

      if (totalMinutes < MIN_WORK_DURATION_MINUTES) {
        toast.error(`Minimum required: ${formatDuration(MIN_WORK_DURATION_MINUTES)}`)
        return
      }

      duration = formatDuration(totalMinutes)

    } else {
      duration = taskType
    }

    const d = new Date(date)

    const taskData = {
      date: d.toISOString(),
      timeSegments: validSegments,
      description,
      type: taskType,
      duration,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    }

    setSaving(true)

    try {
      const method = editingTask?._id ? "PUT" : "POST"

      const res = await fetch("/api/tasks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingTask?._id ? { _id: editingTask._id, ...taskData } : taskData
        ),
      })

      const resBody = await res.json()

      if (res.ok) {
        toast.success(editingTask ? "Task updated" : "Task created")
        resetForm()
        onCancelEdit?.()
        onTaskSaved()
      } else {
        toast.error(resBody.error || "Failed")
      }

    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const totalMinutes = calculateTotalDuration(
    timeSegments.filter((seg) => seg.startTime && seg.endTime)
  )
  const totalDuration = formatDuration(totalMinutes)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">
          {editingTask ? "Edit Task" : "Add New Task"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Task Type</Label>
              <Select
                value={taskType}
                onValueChange={(val) =>
                  setTaskType(val as "Work" | "Holiday" | "Weekend" | "Leave")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                  <SelectItem value="Weekend">Weekend</SelectItem>
                  <SelectItem value="Leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isNonWorkType && (
            <div className="flex flex-col gap-3">
              {timeSegments.map((segment, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={segment.startTime}
                    onChange={(e) =>
                      updateTimeSegment(index, "startTime", e.target.value)
                    }
                    required
                  />
                  <Input
                    type="time"
                    value={segment.endTime}
                    onChange={(e) =>
                      updateTimeSegment(index, "endTime", e.target.value)
                    }
                    required
                  />
                  {timeSegments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeTimeSegment(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addTimeSegment}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Time Segment
              </Button>

              {totalDuration !== "0h 0m" && (
                <p className="text-sm font-medium">
                  Total Duration: {totalDuration}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {editingTask ? "Update Task" : "Add Task"}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
