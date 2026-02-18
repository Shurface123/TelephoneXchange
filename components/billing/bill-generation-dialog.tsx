"use client"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/hooks/use-toast"

interface BillGenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: () => void
}

export function BillGenerationDialog({ open, onOpenChange, onGenerated }: BillGenerationDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    billType: "",
    accountName: "",
    accountNumber: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!formData.billType || !formData.accountName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/billing/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `${formData.billType.charAt(0).toUpperCase() + formData.billType.slice(1)} bill generated successfully`,
        })
        onGenerated()
        resetForm()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate bill",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setFormData({
      billType: "",
      accountName: "",
      accountNumber: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate New Bill</DialogTitle>
          <DialogDescription>Create a new billing invoice for the specified period</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billType">Billing Cycle *</Label>
            <Select
              value={formData.billType}
              onValueChange={(value: string) => setFormData((prev) => ({ ...prev, billType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select billing cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Billing</SelectItem>
                <SelectItem value="weekly">Weekly Billing</SelectItem>
                <SelectItem value="monthly">Monthly Billing</SelectItem>
                <SelectItem value="yearly">Yearly Billing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              value={formData.accountName}
              onChange={(e) => setFormData((prev) => ({ ...prev, accountName: e.target.value }))}
              placeholder="Enter account name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number (Optional)</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, accountNumber: e.target.value }))}
              placeholder="Auto-generated if not provided"
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Billing Information</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Bills are automatically calculated based on call usage</li>
              <li>• Service charges (5%) and VAT (12.5%) are included</li>
              <li>• Payment due date is set to 30 days from generation</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
