"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"
import { Button } from "../ui/button"
import { FileText, Download, Printer, Mail } from "lucide-react"

interface BillItem {
  callId: string
  serviceType: string
  description: string
  quantity: number
  unitRate: number
  amount: number
}

interface Bill {
  id: number
  invoiceNumber: string
  accountName: string
  accountNumber: string
  billType: string
  billingPeriodStart: string
  billingPeriodEnd: string
  totalCalls: number
  totalDurationMinutes: number
  subtotalAmount: number
  serviceCharges: number
  taxAmount: number
  totalAmount: number
  status: string
  dueDate: string
  paidDate?: string
  billItems?: BillItem[]
  createdAt: string
}

interface BillDetailsDialogProps {
  bill: Bill
  open: boolean
  onOpenChange: (open: boolean) => void
  formatCurrency: (amount: number) => string
}

export function BillDetailsDialog({ bill, open, onOpenChange, formatCurrency }: BillDetailsDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "paid":
        return "bg-green-100 text-green-800 border-green-300"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-300"
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details - {bill.invoiceNumber}
              </DialogTitle>
              <DialogDescription>Complete billing information and breakdown</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">COCOBOD CHED</h2>
                <p className="text-gray-600 dark:text-gray-400">Cocoa Health and Extension Division</p>
                <p className="text-sm text-gray-500">P.O. Box M37, Accra, Ghana</p>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(bill.status)}>{bill.status.toUpperCase()}</Badge>
                <p className="text-sm text-gray-500 mt-2">
                  Invoice Date: {new Date(bill.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">Due Date: {bill.dueDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <p className="font-medium">{bill.accountName}</p>
                <p className="text-sm text-gray-600">Account: {bill.accountNumber}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Billing Period:</h3>
                <p className="text-sm">
                  {bill.billingPeriodStart} to {bill.billingPeriodEnd}
                </p>
                <p className="text-sm text-gray-600">
                  Cycle: {bill.billType.charAt(0).toUpperCase() + bill.billType.slice(1)}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{bill.totalCalls}</div>
              <div className="text-sm text-gray-600">Total Calls</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{bill.totalDurationMinutes}</div>
              <div className="text-sm text-gray-600">Total Minutes</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {bill.totalDurationMinutes > 0 ? (bill.totalDurationMinutes / bill.totalCalls).toFixed(1) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Duration (min)</div>
            </div>
          </div>

          {/* Bill Items */}
          {bill.billItems && bill.billItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Service Details</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Rate</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {bill.billItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium">{item.serviceType.toUpperCase()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity} min</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unitRate)}/min</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Billing Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Billing Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotalAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charges (5%):</span>
                <span>{formatCurrency(bill.serviceCharges || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (12.5%):</span>
                <span>{formatCurrency(bill.taxAmount || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">{formatCurrency(bill.totalAmount)}</span>
              </div>
            </div>

            {bill.status === "paid" && bill.paidDate && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 rounded border border-green-300">
                <p className="text-green-800 dark:text-green-200 font-medium">✓ Paid on {bill.paidDate}</p>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <h4 className="font-medium mb-2">Payment Terms & Conditions:</h4>
            <ul className="space-y-1">
              <li>• Payment is due within 30 days of invoice date</li>
              <li>• Late payments may incur additional charges</li>
              <li>• All rates are based on current Telecel tariffs</li>
              <li>• For billing inquiries, contact CHED Finance Department</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
