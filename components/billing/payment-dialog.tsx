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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/hooks/use-toast"

interface Bill {
  id: number
  invoiceNumber: string
  accountName: string
  totalAmount: number
}

interface PaymentDialogProps {
  bill: Bill
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentRecorded: () => void
}

export function PaymentDialog({ bill, open, onOpenChange, onPaymentRecorded }: PaymentDialogProps) {
  const { toast } = useToast()
  const [paymentData, setPaymentData] = useState({
    paymentMethod: "",
    paymentReference: "",
    notes: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    if (!paymentData.paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch(`/api/billing/${bill.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "paid",
          paymentMethod: paymentData.paymentMethod,
          paymentReference: paymentData.paymentReference,
          paymentNotes: paymentData.notes,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Payment recorded for invoice ${bill.invoiceNumber}`,
        })
        onPaymentRecorded()
        resetForm()
      } else {
        throw new Error("Payment recording failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setPaymentData({
      paymentMethod: "",
      paymentReference: "",
      notes: "",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Record payment for invoice {bill.invoiceNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Account:</span>
              <span>{bill.accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Amount Due:</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(bill.totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={paymentData.paymentMethod}
              onValueChange={(value: string) => setPaymentData((prev) => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentReference">Payment Reference</Label>
            <Input
              id="paymentReference"
              value={paymentData.paymentReference}
              onChange={(e) => setPaymentData((prev) => ({ ...prev, paymentReference: e.target.value }))}
              placeholder="Transaction ID, cheque number, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPaymentData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional payment notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing}>
            {isProcessing ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
