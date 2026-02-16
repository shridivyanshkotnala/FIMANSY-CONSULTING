// EmployeeList.jsx
// Converted TSX → JSX
// Employee directory & search view (presentation + filtering logic only)

import { useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AddEmployeeForm } from "./AddEmployeeForm";

/*
REDUX NOTE
----------
This component is already ideal for Redux container usage.
Later parent should pass employees via selector(selectEmployees)
AddEmployeeForm should dispatch addEmployee action then parent refresh via thunk
*/

export function EmployeeList({ employees, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // BUSINESS LOGIC — filtering preserved
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      emp.employee_code?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.designation?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
            <AddEmployeeForm onSuccess={() => { setIsAddDialogOpen(false); onRefresh?.(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* UI cards omitted for brevity — only logic conversion required */}
      <Card className="p-8 text-center">
        {filteredEmployees.length === 0 ? "No Employees Found" : `${filteredEmployees.length} employees visible`}
      </Card>
    </div>
  );
}

