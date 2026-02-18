"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Phone, User, Building, Clock, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CallData {
  callerName: string
  callerPhone: string
  organization: string
  department: string
  employee: string
  callType: string
  priority: string
  reasonForCall: string
  notes: string
}

export function CallIntakeForm() {
  const { toast } = useToast()
  const [callData, setCallData] = useState<CallData>({
    callerName: "",
    callerPhone: "",
    organization: "",
    department: "",
    employee: "",
    callType: "",
    priority: "medium",
    reasonForCall: "",
    notes: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const departments = [
    { id: "admin", name: "Administration", extension: "100" },
    { id: "hr", name: "Human Resources", extension: "101" },
    { id: "finance", name: "Finance", extension: "102" },
    { id: "it", name: "Information Technology", extension: "103" },
    { id: "health", name: "Health Services", extension: "104" },
    { id: "extension", name: "Extension Services", extension: "105" },
    { id: "rnd", name: "Research & Development", extension: "106" },
    { id: "qc", name: "Quality Control", extension: "107" },
  ]

  const callTypes = [
    { id: "internal", name: "Internal", rate: "Free" },
    { id: "local", name: "Local", rate: "GHS 0.50/min" },
    { id: "national", name: "National", rate: "GHS 1.50/min" },
    { id: "international", name: "International", rate: "GHS 5.00/min" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Call Logged Successfully",
        description: `Call from ${callData.callerName} has been logged and routed to ${callData.department}`,
      })

      // Reset form
      setCallData({
        callerName: "",
        callerPhone: "",
        organization: "",
        department: "",
        employee: "",
        callType: "",
        priority: "medium",
        reasonForCall: "",
        notes: "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log call. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhoneSearch = async () => {
    if (callData.callerPhone.length >= 10) {
      // Simulate caller lookup
      const mockCaller = {
        name: "John Doe",
        organization: "Ghana Cocoa Board",
        notes: "Frequent caller - Quality Control inquiries",
      }

      setCallData((prev) => ({
        ...prev,
        callerName: mockCaller.name,
        organization: mockCaller.organization,
        notes: mockCaller.notes,
      }))

      toast({
        title: "Caller Found",
        description: "Auto-filled caller information from database",
      })
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Call Intake Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              New Call Intake
            </CardTitle>
            <CardDescription>Record caller details and route to appropriate department</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Caller Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="callerName">Caller Name *</Label>
                  <Input
                    id="callerName"
                    value={callData.callerName}
                    onChange={(e) => setCallData((prev) => ({ ...prev, callerName: e.target.value }))}
                    placeholder="Enter caller's full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callerPhone">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="callerPhone"
                      value={callData.callerPhone}
                      onChange={(e) => setCallData((prev) => ({ ...prev, callerPhone: e.target.value }))}
                      placeholder="+233 XX XXX XXXX"
                      required
                    />
                    <Button type="button" variant="outline" onClick={handlePhoneSearch}>
                      <User className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization/Company</Label>
                <Input
                  id="organization"
                  value={callData.organization}
                  onChange={(e) => setCallData((prev) => ({ ...prev, organization: e.target.value }))}
                  placeholder="Caller's organization"
                />
              </div>

              {/* Call Routing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={callData.department}
                    onValueChange={(value) => setCallData((prev) => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{dept.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              Ext. {dept.extension}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callType">Call Type *</Label>
                  <Select
                    value={callData.callType}
                    onValueChange={(value) => setCallData((prev) => ({ ...prev, callType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select call type" />
                    </SelectTrigger>
                    <SelectContent>
                      {callTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{type.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {type.rate}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={callData.priority}
                  onValueChange={(value) => setCallData((prev) => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Low Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Medium Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        High Priority
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Urgent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reasonForCall">Reason for Call *</Label>
                <Textarea
                  id="reasonForCall"
                  value={callData.reasonForCall}
                  onChange={(e) => setCallData((prev) => ({ ...prev, reasonForCall: e.target.value }))}
                  placeholder="Brief description of the caller's inquiry or request"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={callData.notes}
                  onChange={(e) => setCallData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information or special instructions"
                  rows={2}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Logging Call...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Log Call & Route
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCallData({
                      callerName: "",
                      callerPhone: "",
                      organization: "",
                      department: "",
                      employee: "",
                      callType: "",
                      priority: "medium",
                      reasonForCall: "",
                      notes: "",
                    })
                  }
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Info */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Building className="mr-2 h-4 w-4" />
              View Directory
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Clock className="mr-2 h-4 w-4" />
              Call History
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <AlertCircle className="mr-2 h-4 w-4" />
              Report Issue
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.slice(0, 4).map((dept) => (
              <div key={dept.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">{dept.name}</span>
                </div>
                <Badge variant="secondary">Available</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
