// components/SectionTabs.jsx
import React from 'react';
import { Clock, MessageSquare, FileText } from "lucide-react";

const ICON_MAP = {
  Clock,
  MessageSquare,
  FileText
};

export function SectionTabs({ activeSection, onSectionChange, commentsCount = 0 }) {
  const tabs = [
    { key: "timeline", label: "Timeline", icon: "Clock" },
    { key: "comments", label: "Comments", icon: "MessageSquare" },
    { key: "documents", label: "Documents", icon: "FileText" },
  ];

  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {tabs.map(({ key, label, icon }) => {
        const Icon = ICON_MAP[icon];
        return (
          <button
            key={key}
            onClick={() => onSectionChange(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              activeSection === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {key === "comments" && commentsCount > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">
                {commentsCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}