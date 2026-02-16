import { useNavigate, useSearchParams } from "react-router-dom";
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorManagement } from "@/components/banking/VendorManagement";
import { MakePayment } from "@/components/banking/MakePayment";
import { PaymentHistory } from "@/components/banking/PaymentHistory";
import { BankTransactionList } from "@/components/banking/BankTransactionList";
import { Building2, Send, History, Receipt, ArrowLeft, CreditCard, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBanking } from "@/components/mobile/MobileBanking";

export default function Banking() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Persist tab in URL so refresh / navigation doesn't reset UI
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "transactions";

  const setActiveTab = (value) => {
    setSearchParams({ tab: value });
  };

  if (isMobile) {
    return <MobileBanking />;
  }

  return (
    <PillarLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Banking</h1>
                <p className="text-muted-foreground">
                  Manage transactions, vendors and payments
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => navigate("/upload?type=bank_statement")}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Statement
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">

            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>

            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Vendors</span>
            </TabsTrigger>

            <TabsTrigger value="payment" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Pay</span>
            </TabsTrigger>

            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>

          </TabsList>

          <TabsContent value="transactions" className="mt-6">
            <BankTransactionList />
          </TabsContent>

          <TabsContent value="vendors" className="mt-6">
            <VendorManagement />
          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <MakePayment />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <PaymentHistory />
          </TabsContent>
        </Tabs>

      </div>
    </PillarLayout>
  );
}
