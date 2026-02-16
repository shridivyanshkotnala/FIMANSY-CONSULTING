import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-aspect-ratio";
import { cn } from "@/lib/utils";

/*
  Avatar

  User profile image with fallback initials/icon.
  Used in headers, comments, user menus etc.
*/

export const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));

Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));

AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));

AvatarFallback.displayName = "AvatarFallback";
