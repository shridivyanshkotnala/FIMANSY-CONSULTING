// constants.js
export const STATUS_PIPELINE = [
  "initiated",
  "pending_docs",
  "in_progress",
  "filed",
  "approved",
  "closed",
];

export const STATUS_LABELS = {
  initiated: "Initiated",
  not_started: "Not Started",
  pending_docs: "Pending Docs",
  in_progress: "In Progress",
  filed: "Filed",
  approved: "Approved",
  overdue: "Overdue",
  ignored: "Ignored",
  closed: "Closed",
};

export const STATUS_TRANSITIONS = {
  initiated: ["pending_docs"],
  not_started: ["initiated"],
  pending_docs: ["in_progress", "overdue"], // Add overdue as possible transition
  in_progress: ["filed", "overdue"], // Add overdue as possible transition
  filed: ["approved", "overdue"], // Add overdue as possible transition
  overdue: ["in_progress", "pending_docs", "filed"], // More options from overdue
  approved: ["closed"],
  closed: [],
};

export const STATUS_CONFIG = {
  initiated: { label: "Initiated", className: "bg-blue-100 text-blue-700 border-blue-300" },
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-700 border-gray-300" },
  pending_docs: { label: "Pending Docs", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-700 border-purple-300" },
  filed: { label: "Filed", className: "bg-green-100 text-green-700 border-green-300" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-300" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-300" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-700 border-gray-300" },
};

export const SECTION_TABS = [
  { key: "timeline", label: "Timeline", icon: "Clock" },
  { key: "comments", label: "Comments", icon: "MessageSquare" },
  { key: "documents", label: "Documents", icon: "FileText" },
];