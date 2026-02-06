"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Expense, UserMeta } from "@/types";
import { cn } from "@/lib/utils";

import { calculateShare } from "@/lib/utils";

interface ExpenseDetailsDialogProps {
    expense: Expense;
    userMap: Record<string, string>;
    currentUser: UserMeta | null;
    userCount: number;
    onUpdateStatus: (expenseId: string, newStatus: string) => Promise<void>;
    children: React.ReactNode;
}

export function ExpenseDetailsDialog({ expense, userMap, currentUser, userCount, onUpdateStatus, children }: ExpenseDetailsDialogProps) {
    const categoryColors = {
        food: "bg-orange-100 text-orange-800",
        transport: "bg-blue-100 text-blue-800",
        hotel: "bg-purple-100 text-purple-800",
        misc: "bg-gray-100 text-gray-800",
    };

    const spenderName = userMap[expense.spentBy] || "Unknown";
    const creatorName = userMap[expense.createdBy] || "System";

    let repaymentStatus: Record<string, string> = {};
    try {
        repaymentStatus = expense.repaymentStatus ? JSON.parse(expense.repaymentStatus) : {};
    } catch (e) {
        console.error("Failed to parse repayment status", e);
    }

    const canManage = currentUser?.$id === expense.spentBy || currentUser?.role === 'admin';

    const handleToggleStatus = (userId: string) => {
        if (!canManage) return;

        const currentStatus = repaymentStatus[userId] || 'due';
        const newStatus = currentStatus === 'paid' ? 'due' : 'paid';

        const updatedStatus = { ...repaymentStatus, [userId]: newStatus };
        onUpdateStatus(expense.$id, JSON.stringify(updatedStatus));
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl">Expense Details</DialogTitle>
                            <DialogDescription>
                                {new Date(expense.timestamp).toLocaleString()}
                            </DialogDescription>
                        </div>
                        <span className={cn("px-2 py-1 rounded text-xs uppercase font-bold", categoryColors[expense.category as keyof typeof categoryColors])}>
                            {expense.category}
                        </span>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Amount & Purpose */}
                    <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-2xl font-bold">₹{expense.amount.toFixed(2)}</span>
                        <div>
                            <span className="font-medium text-lg block text-right">{expense.purpose}</span>
                            <span className="text-xs text-muted-foreground uppercase font-bold block text-right">
                                {expense.paymentMode || 'online'}
                            </span>
                        </div>
                    </div>

                    {/* People */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="block text-muted-foreground">Paid By</span>
                            <span className="font-medium">{spenderName}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Added By</span>
                            <span className="font-medium">{creatorName}</span>
                        </div>
                    </div>

                    {/* My Share Breakdown */}
                    {currentUser && (
                        <div className="bg-orange-50 p-3 rounded-md border border-orange-100">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-orange-900">Your Share</span>
                                <span className="text-lg font-bold text-orange-700">
                                    ₹{calculateShare(expense, currentUser.$id, userCount).toFixed(2)}
                                </span>
                            </div>
                            {expense.spentBy === currentUser.$id && (
                                <p className="text-xs text-orange-800 mt-1">
                                    (You paid for this, so you are owed ₹{(expense.amount - calculateShare(expense, currentUser.$id, userCount)).toFixed(2)})
                                </p>
                            )}
                        </div>
                    )}

                    {/* Split Info */}
                    <div className="space-y-2">
                        <span className="block text-muted-foreground text-sm">Split Mode: <span className="font-medium capitalize">{expense.splitMode}</span></span>

                        <div className="bg-muted/30 p-3 rounded-md max-h-60 overflow-y-auto">
                            <span className="text-xs font-semibold uppercase text-muted-foreground block mb-1">Involved Members & Status</span>
                            {expense.splitMode === 'equal' && expense.splitAmong.length === 0 ? (
                                <p className="text-sm text-amber-600 mb-2">Shared equally (Old record or All Users). Status tracking might be limited.</p>
                            ) : null}

                            <ul className="text-sm space-y-2">
                                {(expense.splitAmong.length > 0 ? expense.splitAmong : Object.keys(userMap)).map(uid => {
                                    // Filter out if splitAmong is defined, otherwise assume all (fallback logic needs care)
                                    // Actually, if splitMode is equal and splitAmong is empty, it means ALL users.
                                    // So we iterator over userMap keys.
                                    // But we should filter basically.

                                    // Improving logic:
                                    // If splitAmong has items, use it.
                                    // If splitMode=equal and splitAmong=[], use all users from userMap keys (assuming map has all active users).

                                    // Ideally expense should store involved IDs always. But legacy 'equal' might be empty.
                                    // If empty, we can't accurately track status unless we migrate data or infer all.
                                    // Let's rely on what we have.

                                    if (uid === expense.spentBy && !repaymentStatus[uid]) return null; // Skip spender if clear

                                    // Check if this uid is actually involved
                                    if (expense.splitMode === 'custom' && !expense.splitAmong.includes(uid)) return null;

                                    const isSpender = uid === expense.spentBy;
                                    const status = repaymentStatus[uid] || (isSpender ? 'paid' : 'due');

                                    return (
                                        <li key={uid} className="flex items-center justify-between bg-background p-2 rounded border">
                                            <div className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                                                {userMap[uid] || "Unknown"}
                                            </div>
                                            <button
                                                onClick={() => handleToggleStatus(uid)}
                                                disabled={!canManage}
                                                className={cn(
                                                    "px-2 py-0.5 text-xs font-bold rounded-full border transition-all",
                                                    status === 'paid'
                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                        : "bg-red-100 text-red-700 border-red-200",
                                                    canManage && "hover:scale-105 cursor-pointer active:scale-95"
                                                )}
                                            >
                                                {status.toUpperCase()}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                    {/* Receipt Placeholder if needed */}
                    {expense.receipt && (
                        <div className="text-sm text-blue-500 underline cursor-pointer">
                            View Receipt
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
