import { type NextRequest, NextResponse } from "next/server"

// Mock departments data
const departments = [
  {
    id: "admin",
    staff: [
      { id: "1", name: "John Smith", position: "Director", extension: "100", isAvailable: true },
      { id: "2", name: "Mary Johnson", position: "Assistant", extension: "101", isAvailable: true },
    ],
  },
  {
    id: "hr",
    staff: [
      { id: "3", name: "Sarah Wilson", position: "HR Manager", extension: "110", isAvailable: true },
      { id: "4", name: "David Brown", position: "HR Officer", extension: "111", isAvailable: false },
    ],
  },
  {
    id: "finance",
    staff: [
      { id: "5", name: "Michael Davis", position: "Finance Manager", extension: "120", isAvailable: true },
      { id: "6", name: "Lisa Anderson", position: "Accountant", extension: "121", isAvailable: true },
    ],
  },
  {
    id: "it",
    staff: [
      { id: "7", name: "Robert Taylor", position: "IT Manager", extension: "130", isAvailable: true },
      { id: "8", name: "Jennifer White", position: "System Admin", extension: "131", isAvailable: true },
    ],
  },
  {
    id: "health",
    staff: [
      { id: "9", name: "Dr. Patricia Moore", position: "Chief Medical Officer", extension: "140", isAvailable: true },
      { id: "10", name: "Nurse Grace Adams", position: "Senior Nurse", extension: "141", isAvailable: false },
    ],
  },
  {
    id: "extension",
    staff: [
      { id: "11", name: "James Wilson", position: "Extension Manager", extension: "150", isAvailable: true },
      { id: "12", name: "Maria Garcia", position: "Field Officer", extension: "151", isAvailable: true },
    ],
  },
]

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const department = departments.find((d) => d.id === params.id)

  if (!department) {
    return NextResponse.json(
      {
        success: false,
        message: "Department not found",
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    success: true,
    data: department.staff,
  })
}
