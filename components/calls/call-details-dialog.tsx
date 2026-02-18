"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"
import { Phone, Clock, User, Building, FileText, AlertCircle } from "lucide-react"

interface Call {
  id: string
  callReference: string
  callerName: string
  callerPhone: string
  department: string
  callType: string
  status: string
  priority: string
  callStartTime: string
  callEndTime?: string
  durationMinutes: number
  reasonForCall: string
  notes?: string
  organization?: string
  transferHistory?: Array<{
    from: string
    to: string
    reason: string
    transferredAt: string
  }>
}

interface CallDetailsDialogProps {
  call: Call
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CallDetailsDialog({ call, open, onOpenChange }: CallDetailsDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "connected":
        return "bg-green-100 text-green-800 border-green-300"
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "missed":
        return "bg-red-100 text-red-800 border-red-300"
      case "transferring":
        return "bg-purple-100 text-purple-800 border-purple-300"
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
      case "urgent":
        return "border-red-500 text-red-700"
      default:
        return "border-gray-500 text-gray-700"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Details - {call.callReference}
          </DialogTitle>
          <DialogDescription>Complete information about this call</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(call.status)}>{call.status.toUpperCase()}</Badge>
            <Badge variant="outline" className={getPriorityColor(call.priority)}>
              {call.priority.toUpperCase()} PRIORITY
            </Badge>
          </div>

          {/* Caller Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Caller Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{call.callerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{call.callerPhone}</p>
                </div>
              </div>
              {call.organization && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Organization</p>
                    <p className="font-medium">{call.organization}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Call Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Call Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{call.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Call Type</p>
                  <p className="font-medium">{call.callType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Start Time</p>
                  <p className="font-medium">{new Date(call.callStartTime).toLocaleString()}</p>
                </div>
              </div>
              {call.callEndTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">{call.durationMinutes} minutes</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Reason for Call */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reason for Call
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p>{call.reasonForCall}</p>
            </div>
          </div>

          {/* Notes */}
          {call.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Additional Notes</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p>{call.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Transfer History */}
          {call.transferHistory && call.transferHistory.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Transfer History
                </h3>
                <div className="space-y-2">
                  {call.transferHistory.map((transfer, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {transfer.from} → {transfer.to}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(transfer.transferredAt).toLocaleString()}
                        </span>
                      </div>
                      {transfer.reason && <p className="text-sm text-gray-600 mt-1">{transfer.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
