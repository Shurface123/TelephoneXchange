"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Clock, User, Phone, CheckCircle, AlertCircle } from "lucide-react"

interface FollowUp {
  id: string
  callerName: string
  callerPhone: string
  department: string
  originalCallDate: string
  followUpDate: string
  reason: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "completed" | "overdue"
}

export function FollowUpNotifications() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([
    {
      id: "FU001",
      callerName: "John Doe",
      callerPhone: "+233 24 123 4567",
      department: "Finance",
      originalCallDate: "2024-01-10",
      followUpDate: "2024-01-15",
      reason: "Pending invoice clarification",
      priority: "high",
      status: "overdue",
    },
    {
      id: "FU002",
      callerName: "Jane Smith",
      callerPhone: "+233 20 987 6543",
      department: "HR",
      originalCallDate: "2024-01-12",
      followUpDate: "2024-01-16",
      reason: "Job application status update",
      priority: "medium",
      status: "pending",
    },
    {
      id: "FU003",
      callerName: "Michael Johnson",
      callerPhone: "+233 26 555 0123",
      department: "Extension Services",
      originalCallDate: "2024-01-11",
      followUpDate: "2024-01-14",
      reason: "Training program schedule confirmation",
      priority: "low",
      status: "completed",
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-500 text-yellow-700 bg-yellow-50"
      case "completed":
        return "border-green-500 text-green-700 bg-green-50"
      case "overdue":
        return "border-red-500 text-red-700 bg-red-50"
      default:
        return "border-gray-500 text-gray-700 bg-gray-50"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "border-green-500 text-green-700"
      case "medium":
        return "border-yellow-500 text-yellow-700"
      case "high":
        return "border-orange-500 text-orange-700"
      case "urgent":
        return "border-red-500 text-red-700"
      default:
        return "border-gray-500 text-gray-700"
    }
  }

  const markAsCompleted = (id: string) => {
    setFollowUps((prev) => prev.map((fu) => (fu.id === id ? { ...fu, status: "completed" as const } : fu)))
  }

  const pendingCount = followUps.filter((fu) => fu.status === "pending").length
  const overdueCount = followUps.filter((fu) => fu.status === "overdue").length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Follow-ups</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">3</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Follow-up Notifications
          </CardTitle>
          <CardDescription>Manage scheduled follow-ups and callbacks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {followUps.map((followUp) => (
              <div
                key={followUp.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{followUp.callerName}</h3>
                      <Badge variant="outline" className={getPriorityColor(followUp.priority)}>
                        {followUp.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(followUp.status)}>{followUp.status.toUpperCase()}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {followUp.callerPhone}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {followUp.department}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Original: {followUp.originalCallDate}
                      </div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Follow-up: {followUp.followUpDate}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      <strong>Reason:</strong> {followUp.reason}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {followUp.status !== "completed" && (
                      <Button variant="outline" size="sm" onClick={() => markAsCompleted(followUp.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Phone className="mr-2 h-4 w-4" />
                      Call Now
                    </Button>
                    <Button variant="outline" size="sm">
                      Reschedule
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
