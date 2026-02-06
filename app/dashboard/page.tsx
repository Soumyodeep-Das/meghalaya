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
    const [viewMode, setViewMode] = useState<"all" | "mine">("all");

    const [userMap, setUserMap] = useState<Record<string, string>>({});

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

    const fetchUsers = async () => {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.USERS_COLLECTION_ID
            );
            const map: Record<string, string> = {};
            response.documents.forEach((doc: any) => {
                map[doc.$id] = doc.name;
            });
            setUserMap(map);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const fetchLocal = async () => {
        const queue = await getQueue();
        const localExpenses = queue
            .filter(item => item.action === 'create')
            .map(item => ({ ...item.data, $id: item.tempId }));
        return localExpenses;
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (isOnline) {
                const [serverData, _] = await Promise.all([fetchExpenses(), fetchUsers()]);
                setExpenses(serverData);
            } else {
                const cached = localStorage.getItem("expense_cache");
                if (cached) {
                    setExpenses(JSON.parse(cached));
                }
                const cachedUsers = localStorage.getItem("users_cache");
                if (cachedUsers) {
                    setUserMap(JSON.parse(cachedUsers));
                }
                const local = await fetchLocal();
                setExpenses(prev => [...prev, ...local]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isOnline]);

    useEffect(() => {
        if (expenses.length > 0 && isOnline) {
            localStorage.setItem("expense_cache", JSON.stringify(expenses));
        }
        if (Object.keys(userMap).length > 0 && isOnline) {
            localStorage.setItem("users_cache", JSON.stringify(userMap));
        }
    }, [expenses, userMap, isOnline]);

    const handleDelete = async (id: string) => {
        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                id
            );
            toast.success("Expense deleted");
            setExpenses(prev => prev.filter(e => e.$id !== id));
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
    const displayedExpenses = expenses.filter(e => {
        if (viewMode === 'all') return true;

        const myId = userMeta?.$id;
        if (!myId) return false;

        const isSpender = e.spentBy === myId;
        // If split is equal, I am involved if there are no specific exclusions (assuming equal implies everyone for now, logic in Add Page sends empty array for equal)
        // Wait, Add Page logic: splitAmong = [] if 'equal'.
        // If equal, everyone is involved.
        const isInvolved = e.splitMode === 'equal' || e.splitAmong.includes(myId);

        return isSpender || isInvolved;
    });

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-muted/20 pb-20 pt-4">

                {/* Content */}
                <main className="p-4 max-w-2xl mx-auto">
                    {/* Header & Filter */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">
                                Total: ₹{expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode("all")}
                                className={`py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                            >
                                All Trip Expenses
                            </button>
                            <button
                                onClick={() => setViewMode("mine")}
                                className={`py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'mine' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                            >
                                My Expenses
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-10">Loading...</div>
                    ) : (
                        displayedExpenses.map(expense => (
                            <ExpenseCard
                                key={expense.$id}
                                expense={expense}
                                currentUser={userMeta}
                                userMap={userMap}
                                onDelete={handleDelete}
                                onRequestDelete={handleRequestDelete}
                            />
                        ))
                    )}

                    {displayedExpenses.length === 0 && !loading && (
                        <div className="text-center p-10 text-muted-foreground">
                            {viewMode === 'all' ? "No expenses yet." : "You have no expenses yet."}
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
