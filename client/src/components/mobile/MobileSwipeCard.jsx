import { useState, useRef } from "react";
import { Check, Edit, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

/*
========================================================
MobileSwipeCard

Reusable gesture container.
Used for transactional actions (approve, link, edit, etc).

IMPORTANT:
Swipe actions should NEVER contain business logic.
They must trigger:
  → Redux action
  → or domain handler

This component only exposes gesture intent.
========================================================
*/

export function MobileSwipeCard({
  children,
  leftActions = [],
  rightActions = [],
  onClick,
  className,
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const currentX = useRef(0);

  const actionWidth = 72;
  const maxLeftSwipe = leftActions.length * actionWidth;
  const maxRightSwipe = rightActions.length * actionWidth;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = translateX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const diff = e.touches[0].clientX - startX.current;
    let newTranslate = currentX.current + diff;

    // resistance beyond max swipe
    if (newTranslate > maxLeftSwipe) {
      newTranslate = maxLeftSwipe + (newTranslate - maxLeftSwipe) * 0.2;
    } else if (newTranslate < -maxRightSwipe) {
      newTranslate = -maxRightSwipe + (newTranslate + maxRightSwipe) * 0.2;
    }

    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // snap behavior
    if (translateX > maxLeftSwipe / 2) setTranslateX(maxLeftSwipe);
    else if (translateX < -maxRightSwipe / 2) setTranslateX(-maxRightSwipe);
    else setTranslateX(0);
  };

  const resetSwipe = () => setTranslateX(0);

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      
      {/* LEFT ACTIONS → swipe right */}
      {leftActions.length > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{ width: maxLeftSwipe }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                /*
                Later:
                dispatch(actionDomainEvent())
                NOT local UI mutation
                */
                action.onClick();
                resetSwipe();
              }}
              className={cn(
                "flex flex-col items-center justify-center px-4 text-white touch-manipulation",
                action.color
              )}
              style={{ width: actionWidth }}
            >
              {action.icon}
              <span className="text-[10px] mt-1 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* RIGHT ACTIONS → swipe left */}
      {rightActions.length > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ width: maxRightSwipe }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                /*
                Later:
                dispatch(actionDomainEvent())
                */
                action.onClick();
                resetSwipe();
              }}
              className={cn(
                "flex flex-col items-center justify-center px-4 text-white touch-manipulation",
                action.color
              )}
              style={{ width: actionWidth }}
            >
              {action.icon}
              <span className="text-[10px] mt-1 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div
        className={cn(
          "relative bg-card border touch-manipulation",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={translateX === 0 ? onClick : resetSwipe}
      >
        {children}
      </div>
    </div>
  );
}

/*
========================================================
STANDARDIZED ACTION PRESETS

Important:
These are UI presets only.
Actual business action comes from parent container.
========================================================
*/

export const SwipeActions = {
  approve: (onClick) => ({
    icon: <Check className="h-5 w-5" />,
    label: "Approve",
    color: "bg-success",
    onClick,
  }),

  edit: (onClick) => ({
    icon: <Edit className="h-5 w-5" />,
    label: "Edit",
    color: "bg-primary",
    onClick,
  }),

  attach: (onClick) => ({
    icon: <Paperclip className="h-5 w-5" />,
    label: "Attach",
    color: "bg-info",
    onClick,
  }),
};
