import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatCommentDate } from "./utils";

export function TicketComments({ 
  comments = [], 
  newComment, 
  submitting, 
  onCommentChange, 
  onAddComment 
}) {
  const { user } = useAuth();
  
  // Determine if current user is admin/accountant
  const isAdmin = user?.role === "admin" || user?.role === "accountant";

  console.log("🎯 TicketComments rendering with comments:", comments);

  // Filter out any comments that are actually success wrappers
  const validComments = comments.filter(comment => {
    // Skip if comment is a success wrapper
    if (comment?.success === true) return false;
    // Skip if comment has data field but no _id
    if (comment?.data && !comment?._id) return false;
    return true;
  });

  console.log("🎯 Valid comments after filtering:", validComments);

  return (
    <div className="space-y-4">
      {validComments.length > 0 ? (
        <div className="space-y-3">
          {validComments.map((comment) => {
            // Debug each comment
            console.log("🎯 Rendering comment:", comment);
            
            // Handle multiple possible field names from different sources
            const commentId = comment._id || comment.id || `temp-${Date.now()}-${Math.random()}`;
            
            // Get the message from various possible fields
            const message = comment.message || comment.content || comment.text || "";
            
            // Get role
            const role = comment.author_role || comment.role || "user";
            const isAdminComment = role === "accountant" || role === "admin";
            
            // Get display name
            const displayName = 
              comment.author_name || 
              comment.user_id?.name || 
              (isAdminComment ? "Accountant" : "Client");
            
            // Format date
            const { formatted, relative } = formatCommentDate(comment);
            
            return (
              <div 
                key={commentId} 
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {displayName}
                    </span>
                    <Badge 
                      variant={isAdminComment ? "default" : "secondary"}
                      className="text-[9px] px-1 py-0"
                    >
                      {isAdminComment ? "Accountant" : "Client"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground" title={formatted}>
                    {relative || "just now"}
                  </span>
                </div>
                
                <p className="text-sm whitespace-pre-wrap">{message}</p>
                
                {comment.attachments?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comment.attachments.map((att, idx) => (
                      <Badge 
                        key={`${commentId}-att-${idx}`}
                        variant="outline" 
                        className="text-[9px] cursor-pointer hover:bg-primary/10"
                      >
                        📎 {typeof att === 'string' ? att.split('/').pop() : 'Attachment'}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No comments yet. Start the conversation.</p>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onAddComment();
            }
          }}
        />
        <Button
          size="icon"
          onClick={onAddComment}
          disabled={!newComment.trim() || submitting}
          className="shrink-0 self-end"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {isAdmin ? "Press Ctrl+Enter to send (visible to client)" : "Press Ctrl+Enter to send"}
      </p>
    </div>
  );
}