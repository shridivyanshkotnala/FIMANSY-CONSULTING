// React and routing imports
import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProcessInvoiceMutation } from "@/Redux/Slices/api/uploadApi"; // Redux mutation for AI extraction
// Layout and UI components
import { PillarLayout } from "@/components/layout/PillarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, Loader2, CheckCircle2, AlertCircle, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
// Feature-specific components
import { TransactionApprovalTable } from "@/components/bank/TransactionApprovalTable";
import { InvoiceReviewModal } from "@/components/invoice/InvoiceReviewModal";
import { WorkflowStepper } from "@/components/ui/workflow-stepper";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { uploadInvoice } from "@/lib/r2Upload"; // Function to upload files to Cloudflare R2
import { mapToZohoInvoice } from "@/lib/mapToZohoInvoice"; // Function to map extracted data to Zoho Invoice format
import {useSyncInvoiceMutation} from "@/Redux/Slices/api/invoiceApi"; // Redux mutation for syncing invoice to Zoho
/**
 * Configuration object defining settings for each document type
 * Maps document types to their UI labels, descriptions, accepted file types, and extraction functions
 */
const documentTypeConfig = {
  // Sales invoice configuration - for customer invoices (revenue side)
  sales_invoice: {
    title: 'Sales Invoice',
    description: 'Upload customer invoices for GST recognition and revenue tracking',
    acceptedTypes: '.pdf',
    extractFunction: 'extract-invoice',
  },
  // Expense invoice configuration - for vendor bills (expense side)
  expense_invoice: {
    title: 'Expense Invoice',
    description: 'Upload vendor bills for GST input detection and expense categorization',
    acceptedTypes: '.pdf',
    extractFunction: 'extract-invoice',
  },
  // Bank statement configuration - for transaction extraction and reconciliation
  bank_statement: {
    title: 'Bank Statement',
    description: 'Upload PDF bank statements for transaction extraction and reconciliation',
    acceptedTypes: '.pdf',
    extractFunction: 'extract-bank-statement',
  },
  // Loan document configuration - for debt financing documents
  loan: {
    title: 'Loan Document',
    description: 'Upload loan agreements, EMI schedules, and sanction letters',
    acceptedTypes: '.pdf',
    extractFunction: 'extract-document',
  },
  // Equity document configuration - for equity financing documents
  equity: {
    title: 'Equity Document',
    description: 'Upload share certificates, subscription agreements, and cap table documents',
    acceptedTypes: '.pdf',
    extractFunction: 'extract-document',
  },
  // Other document configuration - for miscellaneous documents
  other: {
    title: 'Other Document',
    description: 'Upload rent agreements, salary registers, asset invoices, and miscellaneous documents',
    acceptedTypes: '.pdf',
    extractFunction: 'extract-document',
  },
};

/**
 * Upload Component
 * Main component for handling document uploads with AI-powered extraction
 * Supports multiple document types: invoices, bank statements, loans, equity, and other documents
 * Features drag-and-drop upload, AI extraction, and review workflows
 */
export default function Upload() {
  // Navigation and routing
  const orgId = localStorage.getItem("activeOrgId");

  const organization = useSelector(state => state.org?.organization) || {
    _id: orgId,
    name: "My Company",
    baseCurrency: "INR"
  };

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get document type from URL query params, default to expense_invoice
  const documentType = searchParams.get('type') || 'expense_invoice';
  // Get configuration for the selected document type
  const config = documentTypeConfig[documentType] || documentTypeConfig.expense_invoice;

  // Authentication and organization context
  // const { organization } = useAuth();
  const { toast } = useToast();

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false); // Tracks if user is dragging files over drop zone

  // File processing state
  const [files, setFiles] = useState([]); // Array of uploaded files with their processing status
  const [isProcessing, setIsProcessing] = useState(false); // Global processing flag

  // Review modal state - tracks which file is being reviewed
  const [reviewingBankStatement, setReviewingBankStatement] = useState(null); // Index of bank statement being reviewed
  const [reviewingInvoice, setReviewingInvoice] = useState(null); // Index of invoice being reviewed
  const [isSaving, setIsSaving] = useState(false); // Flag for save operation in progress // Flag for save operation in progress
  const [extractInvoice, { isLoading: isExtracting, error: extractError }] = useProcessInvoiceMutation();
  /**
   * Handles drag over event for file drop zone
   * Prevents default behavior and sets dragging state to true
   */

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Handles drag leave event for file drop zone
   * Resets dragging state when user drags out of the drop zone
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * Converts a file object to base64 encoded string
   * Used for sending file data to edge functions for AI processing
   *

  /**
   * Processes an uploaded file through the complete workflow:
   * 1. Uploads file to Supabase storage ---
   * 2. Converts file to base64  
   * 3. Invokes appropriate AI extraction function
   * 4. Updates file state based on document type (review or success)
   * 
   * @param {File} file - The file to process
   * @param {number} index comments- Index of the file in the files array
   */






  const processFile = async (file, index) => {

    // Step 1 — uploading state
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: 'uploading', progress: 20 } : f
    ));

    try {

      // ===============================
      // 1️⃣ Upload to Cloudflare R2
      // ===============================
      const userId = localStorage.getItem("userId") || "guest";
      const publicUrl = await uploadInvoice(file, userId);


      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'extracting', progress: 50, pdfUrl: publicUrl } : f
      ));


      // ===============================
      // 2️⃣ Call AI Extraction (Redux)
      // ===============================
      const extractionResult = await extractInvoice({
        fileUrl: publicUrl,
        fileName: file.name
      }).unwrap();


      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, progress: 80 } : f
      ));


      // ===============================
      // 3️⃣ SAME OLD WORKFLOW (UNCHANGED)
      // ===============================

      if (documentType === 'sales_invoice' || documentType === 'expense_invoice') {

        const extractedData = extractionResult;
        
        // Debug: Log what we received from the API
        console.log('🔍 Extraction Result:', extractionResult);
        console.log('🔍 Extracted Data:', extractedData);

        const documentCategory =
          documentType === 'sales_invoice'
            ? 'revenue'
            : (extractedData.document_category || 'expense');

        const finalData = { ...extractedData, document_category: documentCategory };
        console.log('🔍 Final Data being set:', finalData);

        setFiles(prev => prev.map((f, i) =>
          i === index ? {
            ...f,
            status: 'review',
            progress: 100,
            extractedData: finalData,
          } : f
        ));

        // Use setTimeout to ensure state update has completed before opening modal
        setTimeout(() => {
          setReviewingInvoice(index);
        }, 0);

      } else {
        // keep your generic document flow intact
        await handleGenericDocumentResult(extractionResult, publicUrl, file.name, index);
      }

    } catch (error) {

      console.error("Processing error:", error);

      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'error', error: error.message } : f
      ));
    }
  };










  // const processFile = async (file, index) => {

  //   // Step 1 — uploading state
  //   setFiles(prev => prev.map((f, i) =>
  //     i === index ? { ...f, status: 'uploading', progress: 20 } : f
  //   ));

  //   try {

  //     // ===============================
  //     // 1️⃣ Upload to Supabase
  //     // ===============================
  //     const publicUrl = await uploadInvoice(file, user._id);

  //     setFiles(prev => prev.map((f, i) =>
  //       i === index ? { ...f, status: 'processing', progress: 45, pdfUrl: publicUrl } : f
  //     ));

  //     // ===============================
  //     // 2️⃣ Backend AI Processing
  //     // ===============================
  //     const extractionResult = await processInvoice({
  //       fileUrl: publicUrl
  //     }).unwrap();

  //     setFiles(prev => prev.map((f, i) =>
  //       i === index ? { ...f, progress: 80 } : f
  //     ));

  //     // ===============================
  //     // 3️⃣ REVIEW FLOW (UNCHANGED)
  //     // ===============================

  //     if (documentType === 'sales_invoice' || documentType === 'expense_invoice') {

  //       const extractedData = extractionResult;

  //       const documentCategory =
  //         documentType === 'sales_invoice'
  //           ? 'revenue'
  //           : (extractedData.document_category || 'expense');

  //       setFiles(prev => prev.map((f, i) =>
  //         i === index ? {
  //           ...f,
  //           status: 'review',
  //           progress: 100,
  //           extractedData: { ...extractedData, document_category: documentCategory },
  //         } : f
  //       ));

  //       setReviewingInvoice(index);

  //     } else {
  //       await handleGenericDocumentResult(extractionResult, publicUrl, file.name, index);
  //     }

  //   } catch (error) {

  //     console.error("Processing error:", error);

  //     setFiles(prev => prev.map((f, i) =>
  //       i === index ? { ...f, status: 'error', error: error.message } : f
  //     ));
  //   }
  // };

  /**
   * Handles confirmation and saving of reviewed bank statement transactions
   * Saves document metadata and approved transactions to the database
   * 
   * @param {Array} approvedTransactions - Array of transactions approved by the user
   */




  /*

  const handleConfirmBankTransactions = async (approvedTransactions) => {
    if (!organization || reviewingBankStatement === null) return;
    
    const fileData = files[reviewingBankStatement];
    if (!fileData || !fileData.bankMetadata) return;
    
    setIsSaving(true);
    try {
      // Step 1: Save document metadata to documents table
      const { data: docRecord, error: docError } = await supabase
        .from('documents')
        .insert([{
          organization_id: organization.id,
          document_type: 'bank_statement',
          file_name: fileData.file.name,
          file_url: fileData.pdfUrl || '',
          status: 'processed',
          metadata: JSON.parse(JSON.stringify(fileData.bankMetadata)),
        }])
        .select()
        .single();

      if (docError) throw new Error(`Document save failed: ${docError.message}`);

      // Step 2: Save approved transactions to bank_transactions table
      if (approvedTransactions.length > 0) {
        const bankTransactions = approvedTransactions.map((t) => ({
          organization_id: organization.id,
          statement_id: docRecord.id,
          transaction_date: t.transaction_date,
          description: t.description,
          debit_amount: t.debit_amount,
          credit_amount: t.credit_amount,
          balance: t.balance,
          bank_name: fileData.bankMetadata.bank_name,
          account_number: fileData.bankMetadata.account_number,
          transaction_type: t.transaction_type,
          category: t.category,
          reconciliation_status: 'approved',
          notes: JSON.stringify({
            account: t.account,
            paid_through: t.paid_through,
            expense_type: t.expense_type,
            gst_treatment: t.gst_treatment,
            source_of_supply: t.source_of_supply,
            destination_of_supply: t.destination_of_supply,
            ai_reviewed: true,
            user_edited: t.is_edited,
          }),
        }));

        const { error: txError } = await supabase
          .from('bank_transactions')
          .insert(bankTransactions);

        if (txError) throw new Error(`Transaction save failed: ${txError.message}`);
      }

      // Update file status to success and store transaction count
      setFiles(prev => prev.map((f, i) => 
        i === reviewingBankStatement ? { 
          ...f, 
          status: 'success', 
          transactionCount: approvedTransactions.length,
        } : f
      ));

      toast({
        title: "Success",
        description: `${approvedTransactions.length} transactions approved and posted to ledger`,
      });

      setReviewingBankStatement(null);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

*/






  const [syncInvoice, { isLoading: syncing }] = useSyncInvoiceMutation();
  /**
   * Handles confirmation and saving of reviewed invoice
   * Matches expense account to category and saves invoice to database
   * 
   * 
   * 
   * @param {Object} invoice - The reviewed and potentially edited invoice data
   */
  const handleConfirmInvoice = async (invoice) => {
    if (reviewingInvoice === null) return;

    const fileData = files[reviewingInvoice];
    if (!fileData) return;

    setIsSaving(true);

    try {
      // IMPORTANT:
      // We do NOT save to database here anymore.
      // This step only confirms AI extraction and marks document as approved in UI state.

      const approvedInvoice = {
        ...invoice,
        status: "approved",
        approvedAt: new Date().toISOString(),
        pdf_url: fileData.pdfUrl, // comes from R2 upload
        duplicate_check_key: `${invoice.vendor_name}-${invoice.invoice_number}`,
      };
      const zohoInvoicePayload = mapToZohoInvoice(approvedInvoice);

      const result = await syncInvoice(zohoInvoicePayload).unwrap();
      if (!result.success) {
        throw new Error(result.message || "Failed to sync invoice to Zoho");
      }
      // Update UI state exactly like before (critical — keeps workflow intact)
      setFiles(prev =>
        prev.map((f, i) =>
          i === reviewingInvoice
            ? { ...f, status: "success", extractedData: approvedInvoice }
            : f
        )
      );

      toast({
        title: "Success",
        description: "Invoice data extracted and approved successfully",
      });

      setReviewingInvoice(null);

    } catch (error) {
      console.error("Confirm error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles saving of generic document types (loan, equity, other)
   * These documents don't require review and are saved directly
   * 
   * @param {Object} result - Extraction result from AI
   * @param {string} pdfUrl - Public URL of the uploaded PDF
   * @param {string} fileName - Name of the file
   * @param {number} index - Index of the file in the files array
   */




  /*
  const handleGenericDocumentResult = async (result, pdfUrl, fileName, index) => {
    if (!organization) return;

    // Save document directly to documents table without review
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id: organization.id,
        document_type: documentType,
        file_name: fileName,
        file_url: pdfUrl,
        status: 'processed',
        metadata: result.data,
      });

    if (docError) throw new Error(`Document save failed: ${docError.message}`);

    // Update file status to success
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'success', progress: 100, extractedData: result.data } : f
    ));
  };
*/



  /**
   * Handles file drop event in the drop zone
   * Filters PDF files, adds them to state, and processes each file
   */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    // Filter only PDF files from dropped files
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (droppedFiles.length === 0) {
      toast({ title: "Invalid File", description: "Please upload PDF files only", variant: "destructive" });
      return;
    }

    // Create file objects with initial status
    const newFiles = droppedFiles.map(file => ({ file, status: 'uploading', progress: 0 }));

    // Add files to state and process each one sequentially
    const startIndex = files.length;
    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(true);

    for (let i = 0; i < droppedFiles.length; i++) {
      await processFile(droppedFiles[i], startIndex + i);
    }

    setIsProcessing(false);
  }, [files.length, organization, toast, documentType]);

  /**
   * Handles file selection from file input
   * Similar to handleDrop but triggered by file input click
   */
  const handleFileSelect = async (e) => {
    // Filter only PDF files from selected files
    const selectedFiles = Array.from(e.target.files || []).filter(
      file => file.type === 'application/pdf'
    );

    if (selectedFiles.length === 0) {
      toast({ title: "Invalid File", description: "Please upload PDF files only", variant: "destructive" });
      return;
    }

    // Create file objects with initial status
    const newFiles = selectedFiles.map(file => ({ file, status: 'uploading', progress: 0 }));

    // Add files to state and process each one sequentially
    const startIndex = files.length;
    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      await processFile(selectedFiles[i], startIndex + i);
    }

    setIsProcessing(false);
    // Reset input value to allow re-uploading same file
    e.target.value = '';
  };

  /**
   * Removes a file from the files array
   * @param {number} index - Index of the file to remove
   */
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Count successfully processed files
  const successCount = files.filter(f => f.status === 'success').length;

  /**
   * Returns the appropriate route for viewing results based on document type
   * @returns {string} Route path for results page
   */
  const getResultsRoute = () => {
    if (documentType === 'bank_statement') return '/bank-transactions';
    if (documentType === 'sales_invoice' || documentType === 'expense_invoice') return '/invoices';
    return '/documents';
  };

  /**
   * Renders the status indicator for each uploaded file
   * Shows different UI based on file processing status (uploading, extracting, review, success, error)
   * 
   * @param {Object} uploadedFile - File object with status and metadata
   * @param {number} index - Index of the file in the files array
   * @returns {JSX.Element} Status indicator element
   */
  const renderFileStatus = (uploadedFile, index) => {
    // Show uploading status with spinner
    if (uploadedFile.status === 'uploading') {
      return (
        <span className="text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading...
        </span>
      );
    }
    // Show extracting status with AI indication
    if (uploadedFile.status === 'extracting') {
      return (
        <span className="text-primary flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Extracting data with AI...
        </span>
      );
    }
    // Show review status with action button to open review modal
    if (uploadedFile.status === 'review') {
      return (
        <span className="text-primary flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Ready for review
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              if (documentType === 'bank_statement') setReviewingBankStatement(index);
              else setReviewingInvoice(index);
            }}
          >
            Review now →
          </Button>
        </span>
      );
    }
    // Show success status with extracted data summary
    if (uploadedFile.status === 'success') {
      // For bank statements: show bank name and transaction count
      if (documentType === 'bank_statement') {
        return (
          <span className="text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {uploadedFile.extractedData?.bank_name} • {uploadedFile.transactionCount} transactions saved
          </span>
        );
      }
      // For invoices: show category, amount, and vendor name
      if (uploadedFile.extractedData?.total_with_gst) {
        return (
          <span className="text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span className="capitalize px-1.5 py-0.5 rounded text-xs bg-muted">
              {uploadedFile.extractedData?.document_category}
            </span>
            ₹{uploadedFile.extractedData?.total_with_gst.toLocaleString('en-IN')} • {uploadedFile.extractedData?.vendor_name}
          </span>
        );
      }
      // For generic documents: show generic success message
      return (
        <span className="text-success flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Document processed successfully
        </span>
      );
    }
    // Show error status with error message
    if (uploadedFile.status === 'error') {
      return (
        <span className="text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {uploadedFile.error}
        </span>
      );
    }
    return null;
  };

  // Get the file objects currently being reviewed
  const reviewingBankFile = reviewingBankStatement !== null ? files[reviewingBankStatement] : null;
  const reviewingInvoiceFile = reviewingInvoice !== null ? files[reviewingInvoice] : null;
  
  // Debug: Log what's being passed to the modal
  if (reviewingInvoiceFile) {
    console.log('📋 Reviewing Invoice File:', reviewingInvoiceFile);
    console.log('📋 Invoice Data for Modal:', reviewingInvoiceFile?.extractedData);
  }

  /**
   * Determines the current workflow step based on the latest file's status
   * Used for the workflow stepper component
   * @returns {number} Current step index (0-2)
   */
  const getCurrentStep = () => {
    if (files.length === 0) return 0;
    const latestFile = files[files.length - 1];
    if (latestFile.status === 'uploading') return 0;
    if (latestFile.status === 'extracting') return 1;
    if (latestFile.status === 'review') return 2;
    return 2;
  };

  // Workflow steps configuration for the stepper component
  const workflowSteps = [
    { id: 'upload', label: 'Upload', description: 'Select your file' },
    { id: 'extract', label: 'Extracting', description: 'AI reads the document' },
    { id: 'verify', label: 'Verify & Save', description: 'Review and confirm' },
  ];

  // ========== COMPONENT RENDER ==========
  return (
    <PillarLayout>
      <div className="p-6">
        {/* Page header with title, description, and help button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{`Upload ${config.title}`}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          <ContextualHelp content="Upload your document here. Our AI will extract key data like dates, amounts, GST details, and vendor info. Review the results before saving." />
        </div>

        {/* Main content container with max width */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button to return to command center */}
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Command Centre
          </Button>

          {/* Workflow stepper - shows progress through upload, extract, verify steps */}
          {files.length > 0 && (
            <Card className="p-6">
              <WorkflowStepper steps={workflowSteps} currentStep={getCurrentStep()} />
            </Card>
          )}

          {/* Bank statement transaction approval table - shown when reviewing bank statement */}
          {reviewingBankFile && reviewingBankFile.bankTransactions && reviewingBankFile.bankMetadata && reviewingBankFile.bankSummary && (
            <TransactionApprovalTable
              metadata={reviewingBankFile.bankMetadata}
              transactions={reviewingBankFile.bankTransactions}
              summary={reviewingBankFile.bankSummary}
              onConfirmAll={handleConfirmBankTransactions}
              onCancel={() => setReviewingBankStatement(null)}
              isSubmitting={isSaving}
            />
          )}

          {/* Invoice review modal - shown when reviewing sales or expense invoice */}
          <InvoiceReviewModal
            open={reviewingInvoice !== null}
            onClose={() => setReviewingInvoice(null)}
            invoice={reviewingInvoiceFile?.extractedData || null}
            pdfUrl={reviewingInvoiceFile?.pdfUrl}
            onSave={handleConfirmInvoice}
            isSubmitting={isSaving}
          />

          {/* Upload drop zone card - hidden when reviewing bank statement */}
          {!reviewingBankFile && (
            <Card>
              <CardHeader>
                <CardTitle>Upload {config.title}</CardTitle>
                <CardDescription>
                  {config.description}. Our AI will extract all details automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Drag and drop zone with visual feedback */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                  )}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {/* Hidden file input triggered by clicking the drop zone */}
                  <input id="file-input" type="file" accept={config.acceptedTypes} multiple onChange={handleFileSelect} className="hidden" />
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <UploadIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drop PDF files here</p>
                      <p className="text-sm text-muted-foreground">or click to browse files</p>
                    </div>
                    <Button variant="outline" disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Select Files'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploaded files list card - shows all uploaded files with their status */}
          {files.length > 0 && !reviewingBankFile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Uploaded Files ({files.length})</span>
                  {/* View Results button - shown when at least one file is successfully processed */}
                  {successCount > 0 && (
                    <Button size="sm" onClick={() => navigate(getResultsRoute())}>
                      View Results ({successCount})
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* List of uploaded files with status and actions */}
                <div className="space-y-3">
                  {files.map((uploadedFile, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                      {/* File icon */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {/* File details and status */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{uploadedFile.file.name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          {renderFileStatus(uploadedFile, index)}
                        </div>
                        {/* Progress bar - shown during uploading and extracting */}
                        {(uploadedFile.status === 'uploading' || uploadedFile.status === 'extracting') && (
                          <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadedFile.progress}%` }} />
                          </div>
                        )}
                      </div>
                      {/* Remove file button - disabled during processing */}
                      <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={uploadedFile.status === 'uploading' || uploadedFile.status === 'extracting'}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PillarLayout>
  );
}