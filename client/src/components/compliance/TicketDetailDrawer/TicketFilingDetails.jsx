export function TicketFilingDetails({ filingMetadata }) {
  // Only render if there's any filing metadata to show
  if (!filingMetadata?.acknowledgement_number && !filingMetadata?.filing_fee && !filingMetadata?.late_fee) {
    return null;
  }

  return (
    <div className="border-t p-4 bg-muted/20">
      <p className="text-xs font-medium mb-2">Filing Details</p>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {filingMetadata.acknowledgement_number && (
          <div>
            <span className="text-muted-foreground">Ack. No:</span>
            <span className="ml-1 font-mono">{filingMetadata.acknowledgement_number}</span>
          </div>
        )}
        {filingMetadata.filing_fee && (
          <div>
            <span className="text-muted-foreground">Fee:</span>
            <span className="ml-1">₹{filingMetadata.filing_fee}</span>
          </div>
        )}
        {filingMetadata.late_fee && (
          <div>
            <span className="text-muted-foreground">Late Fee:</span>
            <span className="ml-1 text-destructive">₹{filingMetadata.late_fee}</span>
          </div>
        )}
      </div>
    </div>
  );
}