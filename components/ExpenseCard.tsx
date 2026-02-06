"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense, UserMeta } from "@/types";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { ExpenseDetailsDialog } from "./ExpenseDetailsDialog";

import { calculateShare } from "@/lib/utils";

interface ExpenseCardProps {
    expense: Expense;
    currentUser: UserMeta | null;
    userMap: Record<string, string>;
    userCount: number;
    viewMode?: "all" | "mine" | "shares";
    onDelete: (id: string) => void;
    onRequestDelete: (id: string) => void;
    onUpdateStatus: (expenseId: string, newStatus: string) => Promise<void>;
}

export function ExpenseCard({ expense, currentUser, userMap, userCount, viewMode = 'all', onDelete, onRequestDelete, onUpdateStatus }: ExpenseCardProps) {
    const isOwner = currentUser?.$id === expense.createdBy; // Check against Doc ID
    const isAdmin = currentUser?.role === "admin";
    // ... (handleDelete same)

    const handleDelete = () => {
        if (isAdmin) {
            if (confirm("Are you sure you want to delete this expense?")) {
                onDelete(expense.$id);
            }
        } else {
            if (confirm("Request admin to delete this expense?")) {
                onRequestDelete(expense.$id);
            }
        }
    };

    const categoryColors = {
        food: "bg-orange-100 text-orange-800",
        transport: "bg-blue-100 text-blue-800",
        hotel: "bg-purple-100 text-purple-800",
        misc: "bg-gray-100 text-gray-800",
    };

    const spenderName = userMap[expense.spentBy] || "Unknown";
    const myShare = calculateShare(expense, currentUser?.$id || "", userCount);

    // Logic for display amount
    const isShareView = viewMode === 'shares';
    const displayAmount = isShareView ? myShare : expense.amount;
    const isPaidByMe = expense.spentBy === currentUser?.$id;

    return (
        <Card className="mb-4 relative">
            <ExpenseDetailsDialog expense={expense} userMap={userMap} currentUser={currentUser} onUpdateStatus={onUpdateStatus} userCount={userCount}>
                <div className="cursor-pointer transition-colors hover:bg-muted/30">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className={cn("text-lg font-bold", isShareView && "text-orange-600")}>
                                {isShareView && <span className="mr-1">My Share:</span>}
                                ₹{displayAmount.toFixed(0)}
                            </CardTitle>
                            <CardDescription>{new Date(expense.timestamp).toLocaleDateString()}</CardDescription>

                            {!isShareView && myShare > 0 && (
                                <p className="text-sm font-semibold text-orange-600 mt-1">
                                    My Share: ₹{myShare.toFixed(0)}
                                </p>
                            )}

                            {isShareView && (
                                <p className="text-sm font-semibold text-black mt-1">
                                    Trip Total: ₹{expense.amount.toFixed(0)}
                                </p>
                            )}
                        </div>
                        <span className={cn("px-2 py-1 rounded text-xs uppercase font-bold", categoryColors[expense.category as keyof typeof categoryColors])}>
                            {expense.category}
                        </span>
                    </CardHeader>
                    <CardContent>
                        <p className="font-medium text-foreground">{expense.purpose}</p>
                        <p className="text-sm text-muted-foreground">Paid by: {expense.spentBy === currentUser?.$id ? "You" : spenderName}</p>
                    </CardContent>
                </div>
            </ExpenseDetailsDialog>
            <CardFooter className="flex justify-end pt-0 absolute bottom-2 right-2 pointer-events-auto">
                {(isOwner || isAdmin) && (
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
