"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/hooks/use-toast"

interface Call {
  id: string
  callerName: string
  department: string
}

interface Department {
  id: string
  name: string
  extension: string
}

interface Staff {
  id: string
  name: string
  position: string
  extension: string
  isAvailable: boolean
}

interface CallTransferDialogProps {
  call: Call
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransfer: () => void
}

export function CallTransferDialog({ call, open, onOpenChange, onTransfer }: CallTransferDialogProps) {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [reason, setReason] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)

  useEffect(() => {
    if (open) {
      fetchDepartments()
    }
  }, [open])

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentStaff(selectedDepartment)
    }
  }, [selectedDepartment])

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      const result = await response.json()
      if (result.success) {
        setDepartments(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error)
    }
  }

  const fetchDepartmentStaff = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/departments/${departmentId}/staff`)
      const result = await response.json()
      if (result.success) {
        setStaff(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error)
    }
  }

  const handleTransfer = async () => {
    if (!selectedDepartment) {
      toast({
        title: "Error",
        description: "Please select a department",
        variant: "destructive",
      })
      return
    }

    setIsTransferring(true)

    try {
      const response = await fetch("/api/calls/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: call.id,
          fromDepartment: call.department,
          toDepartment: selectedDepartment,
          toEmployee: selectedEmployee,
          reason: reason,
          transferredBy: "current-user", // In production, get from auth context
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Call transferred to ${departments.find((d) => d.id === selectedDepartment)?.name}`,
        })
        onTransfer()
        resetForm()
      } else {
        throw new Error("Transfer failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to transfer call",
        variant: "destructive",
      })
    } finally {
      setIsTransferring(false)
    }
  }

  const resetForm = () => {
    setSelectedDepartment("")
    setSelectedEmployee("")
    setReason("")
    setStaff([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Call</DialogTitle>
          <DialogDescription>Transfer call from {call.callerName} to another department</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} (Ext. {dept.extension})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDepartment && staff.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="employee">Specific Staff Member (Optional)</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id} disabled={!member.isAvailable}>
                      {member.name} - {member.position} (Ext. {member.extension})
                      {!member.isAvailable && " - Unavailable"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Transfer Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Brief reason for transfer..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={isTransferring || !selectedDepartment}>
            {isTransferring ? "Transferring..." : "Transfer Call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
