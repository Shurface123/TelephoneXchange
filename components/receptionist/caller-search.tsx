"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, User, Phone, Building, Clock, History } from "lucide-react"

interface CallerRecord {
  id: string
  name: string
  phone: string
  organization: string
  lastCallDate: string
  totalCalls: number
  notes: string
  isFrequent: boolean
}

export function CallerSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<CallerRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const mockCallers: CallerRecord[] = [
    {
      id: "1",
      name: "John Doe",
      phone: "+233 24 123 4567",
      organization: "Ghana Cocoa Board",
      lastCallDate: "2024-01-15",
      totalCalls: 15,
      notes: "Quality Control inquiries, prefers morning calls",
      isFrequent: true,
    },
    {
      id: "2",
      name: "Jane Smith",
      phone: "+233 20 987 6543",
      organization: "Cocoa Research Institute",
      lastCallDate: "2024-01-10",
      totalCalls: 8,
      notes: "Research collaboration requests",
      isFrequent: false,
    },
    {
      id: "3",
      name: "Michael Johnson",
      phone: "+233 26 555 0123",
      organization: "Farmers Association",
      lastCallDate: "2024-01-12",
      totalCalls: 22,
      notes: "Extension services, training programs",
      isFrequent: true,
    },
  ]

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)

    // Simulate API search
    setTimeout(() => {
      const results = mockCallers.filter(
        (caller) =>
          caller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          caller.phone.includes(searchTerm) ||
          caller.organization.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setSearchResults(results)
      setIsSearching(false)
    }, 500)
  }

  const handleQuickFill = (caller: CallerRecord) => {
    // This would typically populate the call intake form
    console.log("Quick filling caller data:", caller)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Caller Search & History
          </CardTitle>
          <CardDescription>Search for existing callers and view their call history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by name, phone number, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {searchResults.length === 0 && searchTerm && !isSearching && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No callers found matching your search</p>
              </div>
            )}

            {searchResults.map((caller) => (
              <div
                key={caller.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{caller.name}</h3>
                      {caller.isFrequent && <Badge variant="secondary">Frequent Caller</Badge>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {caller.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {caller.organization}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Last call: {caller.lastCallDate}
                      </div>
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Total calls: {caller.totalCalls}
                      </div>
                    </div>

                    {caller.notes && (
                      <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        <strong>Notes:</strong> {caller.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleQuickFill(caller)}>
                      Quick Fill
                    </Button>
                    <Button variant="outline" size="sm">
                      View History
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Searches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["John Doe", "+233 24", "Ghana Cocoa", "Quality Control"].map((term) => (
              <Button key={term} variant="outline" size="sm" onClick={() => setSearchTerm(term)}>
                {term}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
