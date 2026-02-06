import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Expense } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const calculateShare = (expense: Expense, userId: string, totalUsers: number): number => {
  if (!userId) return 0;

  // If I am not involved, share is 0
  const isInvolved = expense.splitMode === 'equal' || expense.splitAmong.includes(userId);
  if (!isInvolved) return 0;

  if (expense.splitMode === 'equal') {
    // Fallback to splitAmong.length if equal but somehow handled as array, 
    // but strictly 'equal' implies all users.
    return totalUsers > 0 ? expense.amount / totalUsers : 0;
  } else {
    return expense.splitAmong.length > 0 ? expense.amount / expense.splitAmong.length : 0;
  }
};
