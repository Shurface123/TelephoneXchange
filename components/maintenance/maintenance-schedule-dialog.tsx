"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useToast } from "../hooks/use-toast"

interface MaintenanceScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled: () => void
}

export function MaintenanceScheduleDialog({ open, onOpenChange, onScheduled }: MaintenanceScheduleDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    maintenanceType: "",
    title: "",
    description: "",
    technicianId: "",
    scheduledDate: "",
    estimatedCost: "",
    partsUsed: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const technicians = [
    { id: "3", name: "Robert Taylor - IT Manager" },
    { id: "8", name: "Jennifer White - System Admin" },
    { id: "10", name: "Technical Support Team" },
  ]

  const handleSubmit = async () => {
    if (!formData.maintenanceType || !formData.title || !formData.description || !formData.scheduledDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const selectedTechnician = technicians.find((t) => t.id === formData.technicianId)

      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          technicianId: formData.technicianId ? Number.parseInt(formData.technicianId) : null,
          technicianName: selectedTechnician?.name || "Unassigned",
          estimatedCost: formData.estimatedCost ? Number.parseFloat(formData.estimatedCost) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Maintenance scheduled successfully",
        })
        onScheduled()
        resetForm()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule maintenance",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      maintenanceType: "",
      title: "",
      description: "",
      technicianId: "",
      scheduledDate: "",
      estimatedCost: "",
      partsUsed: "",
      notes: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
          <DialogDescription>Schedule preventive or corrective maintenance activities</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceType">Maintenance Type *</Label>
              <Select
                value={formData.maintenanceType}
                onValueChange={(value: string) => setFormData((prev) => ({ ...prev, maintenanceType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select maintenance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive Maintenance</SelectItem>
                  <SelectItem value="corrective">Corrective Maintenance</SelectItem>
                  <SelectItem value="emergency">Emergency Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date *</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Maintenance Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of maintenance work"
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
              placeholder="Detailed description of maintenance activities to be performed"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="technicianId">Assign Technician</Label>
            <Select
              value={formData.technicianId}
              onValueChange={(value: string) => setFormData((prev) => ({ ...prev, technicianId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (GHS)</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, estimatedCost: e.target.value }))
                }
                placeholder="Estimated maintenance cost"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partsUsed">Parts/Materials Needed</Label>
              <Input
                id="partsUsed"
                value={formData.partsUsed}
                onChange={(e) => setFormData((prev) => ({ ...prev, partsUsed: e.target.value }))}
                placeholder="List of parts or materials required"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any additional notes or special instructions"
              rows={3}
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Maintenance Guidelines</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Preventive maintenance should be scheduled during off-peak hours</li>
              <li>• Emergency repairs will be prioritized over scheduled maintenance</li>
              <li>• Ensure all required parts are available before starting work</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Maintenance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
