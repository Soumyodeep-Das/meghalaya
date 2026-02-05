"use client";

import { useEffect, useState } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { Expense } from "@/types";
import { ExpenseCard } from "@/components/ExpenseCard";
import { Button } from "@/components/ui/button";
import { Query, ID } from "appwrite";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, BarChart3, WifiOff } from "lucide-react";
import { getQueue } from "@/lib/indexedDB";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
    const { userMeta } = useAuth();
    const { isOnline } = useOffline();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExpenses = async () => {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                [Query.orderDesc("timestamp")]
            );
            return response.documents as unknown as Expense[];
        } catch (error) {
            console.error("Failed to fetch expenses", error);
            return [];
        }
    };

    const fetchLocal = async () => {
        // Merge server data with local queue for optimistic UI (simplified: just list queue for now if offline)
        const queue = await getQueue();
        const localExpenses = queue
            .filter(item => item.action === 'create')
            .map(item => ({ ...item.data, $id: item.tempId })); // Mock structure
        return localExpenses;
    };

    const loadData = async () => {
        setLoading(true);
        if (isOnline) {
            const serverData = await fetchExpenses();
            setExpenses(serverData);
        } else {
            // Load cached logic? Or just IDB? 
            // Requirement says "Caching: Latest expense list". 
            // Implementing full caching logic is time consuming, but we can assume 'expenses' are synced.
            // For now, let's just show what's in queue as "Pending" or handle basic display.
            // Realistically, we'd cache the server response in localStorage.
            const cached = localStorage.getItem("expense_cache");
            if (cached) {
                setExpenses(JSON.parse(cached));
            }
            const local = await fetchLocal();
            // Merge or append? 
            // Simple append
            setExpenses(prev => [...prev, ...local]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [isOnline]);

    useEffect(() => {
        if (expenses.length > 0 && isOnline) {
            localStorage.setItem("expense_cache", JSON.stringify(expenses));
        }
    }, [expenses, isOnline]);


    const handleDelete = async (id: string) => {
        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                id
            );
            toast.success("Expense deleted");
            setExpenses(expenses.filter(e => e.$id !== id));
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleRequestDelete = async (id: string) => {
        try {
            try {
                await databases.createDocument(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.DELETE_REQUESTS_COLLECTION_ID,
                    ID.unique(),
                    {
                        expenseId: id,
                        requestedBy: userMeta?.userId,
                        approved: false
                    }
                );
                toast.success("Deletion requested");
            } catch (error: any) {
                if (error.code === 409 || error.type === "document_already_exists") {
                    toast.success("Request already sent");
                    return;
                }
                toast.error("Failed to request delete");
            }
        } catch (error) {
            toast.error("Failed to request delete");
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-muted/20 pb-20 pt-4">

                {/* Content */}
                <main className="p-4 max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-muted-foreground">
                            Total Spent: ${expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                        </span>
                        {/* Filter UI could go here */}
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-10">Loading...</div>
                    ) : (
                        expenses.map(expense => (
                            <ExpenseCard
                                key={expense.$id}
                                expense={expense}
                                currentUser={userMeta}
                                onDelete={handleDelete}
                                onRequestDelete={handleRequestDelete}
                            />
                        ))
                    )}

                    {expenses.length === 0 && !loading && (
                        <div className="text-center p-10 text-muted-foreground">
                            No expenses yet. Start spending!
                        </div>
                    )}
                </main>

                {/* Floating Action Button */}
                <Link href="/add" className="fixed bottom-6 right-6">
                    <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
                        <Plus className="h-6 w-6" />
                    </Button>
                </Link>
            </div>
        </ProtectedRoute>
    );
}
