"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Expense, UserMeta } from "@/types";
import { cn } from "@/lib/utils";

interface ExpenseDetailsDialogProps {
    expense: Expense;
    userMap: Record<string, string>;
    children: React.ReactNode;
}

export function ExpenseDetailsDialog({ expense, userMap, children }: ExpenseDetailsDialogProps) {
    const categoryColors = {
        food: "bg-orange-100 text-orange-800",
        fuel: "bg-blue-100 text-blue-800",
        hotel: "bg-purple-100 text-purple-800",
        misc: "bg-gray-100 text-gray-800",
    };

    const spenderName = userMap[expense.spentBy] || "Unknown";
    const creatorName = userMap[expense.createdBy] || "System";

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
                        <span className="font-medium text-lg">{expense.purpose}</span>
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

                    {/* Split Info */}
                    <div className="space-y-2">
                        <span className="block text-muted-foreground text-sm">Split Mode: <span className="font-medium capitalize">{expense.splitMode}</span></span>

                        <div className="bg-muted/30 p-3 rounded-md max-h-40 overflow-y-auto">
                            <span className="text-xs font-semibold uppercase text-muted-foreground block mb-1">Involved Members</span>
                            {expense.splitMode === 'equal' ? (
                                <p className="text-sm">Shared equally among everyone.</p>
                            ) : (
                                <ul className="text-sm space-y-1">
                                    {expense.splitAmong.map(uid => (
                                        <li key={uid} className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                                            {userMap[uid] || "Unknown"}
                                        </li>
                                    ))}
                                    {expense.splitAmong.length === 0 && <li>No members selected</li>}
                                </ul>
                            )}
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
