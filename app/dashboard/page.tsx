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
import { calculateShare } from "@/lib/utils";

export default function DashboardPage() {
    const { userMeta } = useAuth();
    const { isOnline } = useOffline();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"all" | "mine" | "shares">("all");

    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [userCount, setUserCount] = useState(0);

    const fetchExpenses = async () => {
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                [Query.orderDesc("timestamp"), Query.limit(100)]
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
                // Also map userId (Auth ID) for backward compatibility with older expenses
                if (doc.userId) {
                    map[doc.userId] = doc.name;
                }
            });
            setUserMap(map);
            setUserCount(response.documents.length);
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
                const cachedCount = localStorage.getItem("users_count_cache");
                if (cachedCount) {
                    setUserCount(parseInt(cachedCount));
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
            localStorage.setItem("users_count_cache", userCount.toString());
        }
    }, [expenses, userMap, userCount, isOnline]);


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

    const myActualShareTotal = expenses.reduce((acc, curr) => acc + calculateShare(curr, userMeta?.$id || "", userCount), 0);

    const handleUpdateStatus = async (expenseId: string, newStatus: string) => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.DATABASE_ID,
                APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                expenseId,
                { repaymentStatus: newStatus }
            );
            toast.success("Status updated");
            setExpenses(prev => prev.map(e => e.$id === expenseId ? { ...e, repaymentStatus: newStatus } : e));
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    const displayedExpenses = expenses.filter(e => {
        const myId = userMeta?.$id;
        if (!myId) return false;

        if (viewMode === 'shares') {
            return calculateShare(e, myId, userCount) > 0;
        }

        if (viewMode === 'all') return true;

        // viewMode === 'mine'
        const isSpender = e.spentBy === myId;
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
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-card p-4 rounded-xl border shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Trip Total</p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                    ₹{expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(0)}
                                </p>
                            </div>
                            <div className="bg-card p-4 rounded-xl border shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">My Share</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    ₹{myActualShareTotal.toFixed(0)}
                                </p>
                            </div>
                            <div className="bg-card p-4 rounded-xl border shadow-sm col-span-2">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">My Total Involvement (Spent + Split)</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-2xl font-bold text-foreground">
                                        ₹{expenses
                                            .filter(e => {
                                                const myId = userMeta?.$id;
                                                if (!myId) return false;
                                                return e.spentBy === myId || e.splitMode === 'equal' || e.splitAmong.includes(myId);
                                            })
                                            .reduce((acc, curr) => acc + curr.amount, 0)
                                            .toFixed(0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        (Expenses you are part of)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="grid grid-cols-3 gap-2 bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode("all")}
                                className={`py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewMode === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                            >
                                All Trip
                            </button>
                            <button
                                onClick={() => setViewMode("mine")}
                                className={`py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewMode === 'mine' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                            >
                                My Expenses
                            </button>
                            <button
                                onClick={() => setViewMode("shares")}
                                className={`py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewMode === 'shares' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                            >
                                My Shares
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
                                userCount={userCount}
                                viewMode={viewMode}
                                onDelete={handleDelete}
                                onRequestDelete={handleRequestDelete}
                                onUpdateStatus={handleUpdateStatus}
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
