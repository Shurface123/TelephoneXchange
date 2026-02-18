"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"
import { useToast } from "../hooks/use-toast"
import { AlertTriangle, User, Calendar, MapPin, Settings, DollarSign } from "lucide-react"

interface Fault {
  id: number
  ticketNumber: string
  faultType: string
  title: string
  description: string
  location: string
  equipmentAffected: string
  priority: string
  status: string
  reportedByName: string
  assignedToName?: string
  reportedAt: string
  assignedAt?: string
  resolvedAt?: string
  resolutionNotes?: string
  estimatedCost?: number
  actualCost?: number
}

interface FaultDetailsDialogProps {
  fault: Fault
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function FaultDetailsDialog({ fault, open, onOpenChange, onUpdated }: FaultDetailsDialogProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState(fault.status)
  const [resolutionNotes, setResolutionNotes] = useState(fault.resolutionNotes || "")
  const [actualCost, setActualCost] = useState(fault.actualCost?.toString() || "")
  const [isUpdating, setIsUpdating] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800 border-red-300"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-300"
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
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
      case "critical":
        return "border-red-500 text-red-700"
      default:
        return "border-gray-500 text-gray-700"
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)

    try {
      const response = await fetch(`/api/faults/${fault.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          resolutionNotes: resolutionNotes || null,
          actualCost: actualCost ? Number.parseFloat(actualCost) : null,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Fault updated successfully",
        })
        onUpdated()
      } else {
        throw new Error("Update failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update fault",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fault Details - {fault.ticketNumber}
          </DialogTitle>
          <DialogDescription>Complete information and status updates for this fault report</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(fault.status)}>{fault.status.replace("_", " ").toUpperCase()}</Badge>
            <Badge variant="outline" className={getPriorityColor(fault.priority)}>
              {fault.priority.toUpperCase()} PRIORITY
            </Badge>
            <Badge variant="outline">{fault.faultType.toUpperCase()}</Badge>
          </div>

          {/* Fault Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{fault.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Reported By</p>
                  <p className="font-medium">{fault.reportedByName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Reported Date</p>
                  <p className="font-medium">{new Date(fault.reportedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{fault.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Equipment</p>
                  <p className="font-medium">{fault.equipmentAffected}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Problem Description</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p>{fault.description}</p>
            </div>
          </div>

          {/* Cost Information */}
          {(fault.estimatedCost || fault.actualCost) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fault.estimatedCost && (
                    <div>
                      <p className="text-sm text-gray-500">Estimated Cost</p>
                      <p className="font-medium">GHS {fault.estimatedCost.toFixed(2)}</p>
                    </div>
                  )}
                  {fault.actualCost && (
                    <div>
                      <p className="text-sm text-gray-500">Actual Cost</p>
                      <p className="font-medium">GHS {fault.actualCost.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Assignment Information */}
          {fault.assignedToName && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Assignment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Assigned To</p>
                    <p className="font-medium">{fault.assignedToName}</p>
                  </div>
                  {fault.assignedAt && (
                    <div>
                      <p className="text-sm text-gray-500">Assigned Date</p>
                      <p className="font-medium">{new Date(fault.assignedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Resolution Information */}
          {fault.status === "resolved" && fault.resolvedAt && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Resolution Details</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Resolved Date</p>
                    <p className="font-medium">{new Date(fault.resolvedAt).toLocaleString()}</p>
                  </div>
                  {fault.resolutionNotes && (
                    <div>
                      <p className="text-sm text-gray-500">Resolution Notes</p>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p>{fault.resolutionNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Update Section for Technicians */}
          {fault.status !== "closed" && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Update Fault Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                      title="Select fault status"
                      aria-label="Select fault status"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Actual Cost (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCost}
                      onChange={(e) => setActualCost(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                    rows={3}
                    placeholder="Describe the resolution or current progress..."
                  />
                </div>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? "Updating..." : "Update Fault"}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
