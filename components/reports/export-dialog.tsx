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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Download, FileText, Table, BarChart3 } from "lucide-react"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { toast } = useToast()
  const [exportFormat, setExportFormat] = useState("")
  const [reportTypes, setReportTypes] = useState({
    calls: false,
    billing: false,
    performance: false,
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!exportFormat) {
      toast({
        title: "Error",
        description: "Please select an export format",
        variant: "destructive",
      })
      return
    }

    const selectedReports = Object.entries(reportTypes).filter(([_, selected]) => selected)
    if (selectedReports.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one report type",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)

    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Success",
        description: `Reports exported successfully as ${exportFormat.toUpperCase()}`,
      })

      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export reports",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const resetForm = () => {
    setExportFormat("")
    setReportTypes({
      calls: false,
      billing: false,
      performance: false,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reports
          </DialogTitle>
          <DialogDescription>Choose format and report types to export</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF Document
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Excel Spreadsheet
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    CSV File
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Report Types</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="calls"
                  checked={reportTypes.calls}
                  onCheckedChange={(checked) => setReportTypes((prev) => ({ ...prev, calls: checked as boolean }))}
                />
                <Label htmlFor="calls" className="text-sm font-normal">
                  Call Analytics Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="billing"
                  checked={reportTypes.billing}
                  onCheckedChange={(checked) => setReportTypes((prev) => ({ ...prev, billing: checked as boolean }))}
                />
                <Label htmlFor="billing" className="text-sm font-normal">
                  Billing & Revenue Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="performance"
                  checked={reportTypes.performance}
                  onCheckedChange={(checked) =>
                    setReportTypes((prev) => ({ ...prev, performance: checked as boolean }))
                  }
                />
                <Label htmlFor="performance" className="text-sm font-normal">
                  Performance Metrics Report
                </Label>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Export Information</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Reports include data from selected date range</li>
              <li>• PDF format includes charts and visualizations</li>
              <li>• Excel/CSV formats contain raw data for analysis</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Download className="mr-2 h-4 w-4 animate-pulse" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Reports
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
