"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense, UserMeta } from "@/types";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface ExpenseCardProps {
    expense: Expense;
    currentUser: UserMeta | null;
    userMap: Record<string, string>;
    onDelete: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

export function ExpenseCard({ expense, currentUser, userMap, onDelete, onRequestDelete }: ExpenseCardProps) {
    const isOwner = currentUser?.$id === expense.createdBy; // Check against Doc ID
    const isAdmin = currentUser?.role === "admin";

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
        fuel: "bg-blue-100 text-blue-800",
        hotel: "bg-purple-100 text-purple-800",
        misc: "bg-gray-100 text-gray-800",
    };

    const spenderName = userMap[expense.spentBy] || "Unknown";

    return (
        <Card className="mb-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold">${expense.amount.toFixed(2)}</CardTitle>
                    <CardDescription>{new Date(expense.timestamp).toLocaleDateString()}</CardDescription>
                </div>
                <span className={cn("px-2 py-1 rounded text-xs uppercase font-bold", categoryColors[expense.category as keyof typeof categoryColors])}>
                    {expense.category}
                </span>
            </CardHeader>
            <CardContent>
                <p className="font-medium text-foreground">{expense.purpose}</p>
                <p className="text-sm text-muted-foreground">Paid by: {expense.spentBy === currentUser?.$id ? "You" : spenderName}</p>
            </CardContent>
            <CardFooter className="flex justify-end pt-0">
                {(isOwner || isAdmin) && (
                    <Button variant="ghost" size="icon" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
