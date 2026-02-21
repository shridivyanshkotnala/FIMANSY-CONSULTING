// Step 1: Upload file to Supabase storage with organized path structure
      const fileName = `${organization.id}/${documentType}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // Step 2: Update status to extracting and increase progress
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'extracting', progress: 50, pdfUrl: urlData.publicUrl } : f
      ));

      // Convert file to base64 for AI processing
      const base64 = await fileToBase64(file);

      // Step 3: Invoke AI extraction edge function based on document type
      const { data: extractionResult, error: extractionError } = await supabase.functions
        .invoke(config.extractFunction, {
          body: { 
            pdfBase64: base64,
            fileName: file.name,
            documentType: documentType,
          }
        });

      if (extractionError) throw new Error(`Extraction failed: ${extractionError.message}`);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error || 'Extraction failed');
      }

      // Update progress after successful extraction
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 80 } : f
      ));

      // Step 4: Handle extraction results based on document type
      // For bank statements: store transactions and open review modal
      if (documentType === 'bank_statement') {
        const { metadata, transactions, summary, confidence } = extractionResult;
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'review', 
            progress: 100,
            bankMetadata: metadata,
            bankTransactions: transactions,
            bankSummary: summary,
            extractedData: { ...metadata, confidence },
          } : f
        ));
        setReviewingBankStatement(index);
      } else if (documentType === 'sales_invoice' || documentType === 'expense_invoice') {
        // For invoices: extract invoice data and determine category, then open review modal
        const extractedData = extractionResult.invoice;
        const documentCategory = documentType === 'sales_invoice' ? 'revenue' : 
                                (extractedData.document_category || 'expense');
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'review', 
            progress: 100, 
            extractedData: { ...extractedData, document_category: documentCategory },
          } : f
        ));
        setReviewingInvoice(index);
      } else {
        // For other document types: save directly without review
        await handleGenericDocumentResult(extractionResult, urlData.publicUrl, file.name, index);
      }

    } catch (error) {
      // Handle any errors during processing and update file status
      console.error('Processing error:', error);
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'error', error: error.message } : f
      ));
    }


const handleConfirmInvoice = async (invoice) => {
    if (!organization || reviewingInvoice === null) return;
    
    const fileData = files[reviewingInvoice];
    if (!fileData) return;
    
    setIsSaving(true);
    try {
      // Fetch expense categories to match with invoice expense account
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('organization_id', organization.id);

      // Match expense account from invoice with existing categories
      let expenseCategoryId = null;
      if (categories && invoice.expense_account) {
        const matchedCategory = categories.find(c => 
          c.name.toLowerCase().includes(invoice.expense_account?.toLowerCase() || '') ||
          invoice.expense_account?.toLowerCase().includes(c.name.toLowerCase())
        );
        expenseCategoryId = matchedCategory?.id || null;
      }

      // Insert invoice data into invoices table
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organization.id,
          document_category: invoice.document_category,
          invoice_number: invoice.invoice_number,
          date_of_issue: invoice.date_of_issue,
          due_date: invoice.due_date || null,
          vendor_name: invoice.vendor_name,
          vendor_gstin: invoice.vendor_gstin || null,
          vendor_city: invoice.vendor_city || null,
          vendor_gst_registration_status: invoice.vendor_gst_registration_status || null,
          vendor_business_type: invoice.vendor_business_type || null,
          customer_name: invoice.customer_name || null,
          customer_city: invoice.customer_city || null,
          place_of_supply: invoice.place_of_supply || null,
          taxable_amount: invoice.taxable_amount,
          cgst: invoice.cgst,
          sgst: invoice.sgst,
          igst: invoice.igst,
          total_gst: invoice.total_gst,
          total_with_gst: invoice.total_with_gst,
          expense_account: invoice.expense_account || null,
          payment_mode: invoice.payment_mode || null,
          gst_reasoning: invoice.gst_reasoning || null,
          confidence: invoice.confidence,
          expense_category_id: expenseCategoryId,
          pdf_url: fileData.pdfUrl,
          status: 'approved',
          duplicate_check_key: `${invoice.vendor_name}-${invoice.invoice_number}`,
        });

      if (insertError) throw new Error(`Save failed: ${insertError.message}`);

      // Update file status to success
      setFiles(prev => prev.map((f, i) => 
        i === reviewingInvoice ? { ...f, status: 'success', extractedData: invoice } : f
      ));

      toast({ title: "Success", description: "Invoice saved to ledger" });
      setReviewingInvoice(null);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };