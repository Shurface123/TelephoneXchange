"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/hooks/use-toast"

interface FaultReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReported: () => void
}

export function FaultReportDialog({ open, onOpenChange, onReported }: FaultReportDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    faultType: "",
    title: "",
    description: "",
    location: "",
    equipmentAffected: "",
    priority: "medium",
    estimatedCost: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.faultType || !formData.title || !formData.description || !formData.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/faults", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          estimatedCost: formData.estimatedCost ? Number.parseFloat(formData.estimatedCost) : null,
          reportedByName: "Current User", // In production, get from auth context
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `Fault report ${result.data.ticketNumber} created successfully`,
        })
        onReported()
        resetForm()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create fault report",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      faultType: "",
      title: "",
      description: "",
      location: "",
      equipmentAffected: "",
      priority: "medium",
      estimatedCost: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Equipment Fault</DialogTitle>
          <DialogDescription>Submit a new fault report for equipment or system issues</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faultType">Fault Type *</Label>
              <Select
                value={formData.faultType}
                onValueChange={(value: string) => setFormData((prev) => ({ ...prev, faultType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fault type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware Issue</SelectItem>
                  <SelectItem value="software">Software Problem</SelectItem>
                  <SelectItem value="network">Network Issue</SelectItem>
                  <SelectItem value="line_issue">Phone Line Problem</SelectItem>
                  <SelectItem value="equipment">Equipment Malfunction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: string) => setFormData((prev) => ({ ...prev, priority: value }))}
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
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Critical
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Fault Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the fault"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Provide detailed information about the fault, symptoms, and when it occurred"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Department, room number, or specific location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipmentAffected">Equipment Affected</Label>
              <Input
                id="equipmentAffected"
                value={formData.equipmentAffected}
                onChange={(e) => setFormData((prev) => ({ ...prev, equipmentAffected: e.target.value }))}
                placeholder="Specific equipment, extension number, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Repair Cost (GHS)</Label>
            <Input
              id="estimatedCost"
              type="number"
              step="0.01"
              value={formData.estimatedCost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, estimatedCost: e.target.value }))
              }
              placeholder="Optional estimated cost for repairs"
            />
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Important Notes</h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• For critical issues affecting multiple users, select "Critical" priority</li>
              <li>• Include as much detail as possible to help technicians diagnose the problem</li>
              <li>• You will receive a ticket number for tracking this fault report</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Fault Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
