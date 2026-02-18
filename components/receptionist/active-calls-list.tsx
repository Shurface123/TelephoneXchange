"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { Phone, PhoneOff, Clock, User, Search, Filter } from "lucide-react"

interface ActiveCall {
  id: string
  callerName: string
  callerPhone: string
  department: string
  startTime: string
  duration: string
  status: "connected" | "on-hold" | "transferring"
  priority: "low" | "medium" | "high" | "urgent"
}

export function ActiveCallsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCalls] = useState<ActiveCall[]>([
    {
      id: "CALL001",
      callerName: "John Doe",
      callerPhone: "+233 24 123 4567",
      department: "Finance",
      startTime: "10:30 AM",
      duration: "05:23",
      status: "connected",
      priority: "medium",
    },
    {
      id: "CALL002",
      callerName: "Jane Smith",
      callerPhone: "+233 20 987 6543",
      department: "HR",
      startTime: "10:45 AM",
      duration: "02:15",
      status: "on-hold",
      priority: "high",
    },
    {
      id: "CALL003",
      callerName: "Michael Johnson",
      callerPhone: "+233 26 555 0123",
      department: "IT",
      startTime: "11:00 AM",
      duration: "01:30",
      status: "transferring",
      priority: "urgent",
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "on-hold":
        return "bg-yellow-500"
      case "transferring":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
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

  const filteredCalls = activeCalls.filter(
    (call) =>
      call.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.callerPhone.includes(searchTerm) ||
      call.department.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Active Calls ({activeCalls.length})
              </CardTitle>
              <CardDescription>Monitor and manage ongoing calls</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search calls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active calls at the moment</p>
              </div>
            ) : (
              filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(call.status)}`}></div>
                        <span className="font-medium">{call.callerName}</span>
                      </div>
                      <Badge variant="outline" className={getPriorityColor(call.priority)}>
                        {call.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{call.status.replace("-", " ").toUpperCase()}</Badge>
                      <Button variant="outline" size="sm">
                        <PhoneOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {call.callerPhone}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {call.department}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Started: {call.startTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration: {call.duration}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm">
                      Transfer
                    </Button>
                    <Button variant="outline" size="sm">
                      Hold
                    </Button>
                    <Button variant="outline" size="sm">
                      Notes
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
