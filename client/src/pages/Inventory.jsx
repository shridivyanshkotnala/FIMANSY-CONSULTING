// Inventory.jsx
// Converted TSX → JSX
// Purpose: Inventory management screen (items + stock movement tracking)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemsList } from "@/components/inventory/InventoryItemsList";
import { StockMovements } from "@/components/inventory/StockMovements";
import { Package, ArrowRightLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
REDUX INTEGRATION PLAN
----------------------
inventorySlice should contain:
 - items
 - stockMovements
 - addItem()
 - updateStock()
 - recordMovement()

InventoryItemsList & StockMovements currently likely fetch internally.
Later they must read/write via Redux selectors + dispatch actions instead.
*/

export default function Inventory() {
  // UI state only (tab selection) — should stay local, not Redux
  const [activeTab, setActiveTab] = useState("items");
  const navigate = useNavigate();

  return (
    <PillarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}> 
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Inventory</h1>
              <p className="text-muted-foreground">Manage inventory items and track stock movements</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Items</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Movements</span>
            </TabsTrigger>
          </TabsList>

          {/* Inventory master data */}
          {/* FUTURE REDUX SELECTOR: selectInventoryItems */}
          <TabsContent value="items" className="mt-6">
            <InventoryItemsList />
          </TabsContent>

          {/* Stock ledger / transaction history */}
          {/* FUTURE REDUX SELECTOR: selectStockMovements */}
          <TabsContent value="movements" className="mt-6">
            <StockMovements />
          </TabsContent>
        </Tabs>
      </div>
    </PillarLayout>
  );
}
