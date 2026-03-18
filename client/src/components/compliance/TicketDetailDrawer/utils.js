import { format, formatDistanceToNow, isValid } from "date-fns";

export const safeFormatDate = (dateValue, formatString, fallback = "—") => {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isValid(date)) {
      return format(date, formatString);
    }
    return fallback;
  } catch (error) {
    console.warn("Invalid date value:", dateValue);
    return fallback;
  }
};

export const safeFormatDistance = (dateValue, fallback = "—") => {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return fallback;
  } catch (error) {
    console.warn("Invalid date value for distance:", dateValue);
    return fallback;
  }
};

export const formatCommentDate = (comment) => {
  const commentDate = comment.createdAt || comment.created_at || comment.timestamp;
  if (!commentDate) return { formatted: "—", relative: "—" };
  
  try {
    const date = new Date(commentDate);
    if (isValid(date)) {
      return {
        formatted: format(date, "dd MMM yyyy, HH:mm"),
        relative: formatDistanceToNow(date, { addSuffix: true })
      };
    }
  } catch (error) {
    console.warn("Error formatting comment date:", error);
  }
  return { formatted: "—", relative: "—" };
};