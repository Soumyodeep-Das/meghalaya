"use client";

import { useEffect, useState } from "react";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Expense } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Loader2 } from "lucide-react";
import { Query } from "appwrite";
import ProtectedRoute from "@/components/ProtectedRoute";
import { calculateShare } from "@/lib/utils";

export default function AnalyticsPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            // Parallel fetch
            const [expenseParams, userResponse] = await Promise.all([
                databases.listDocuments(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.EXPENSES_COLLECTION_ID,
                    [Query.limit(100)]
                ),
                databases.listDocuments(
                    APPWRITE_CONFIG.DATABASE_ID,
                    APPWRITE_CONFIG.USERS_COLLECTION_ID
                )
            ]);

            setExpenses((expenseParams.documents as unknown as Expense[]).filter(e => e.category !== 'SETTINGS'));
            setUserCount(userResponse.total);

            const map: Record<string, string> = {};
            userResponse.documents.forEach((doc: any) => {
                map[doc.$id] = doc.name;
                // Also map userId (Auth ID) for backward compatibility with older expenses
                if (doc.userId) {
                    map[doc.userId] = doc.name;
                }
            });
            setUserMap(map);
        };

        try {
            loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const audio = new Audio('/cid-acp-bc.mp3');
        audio.play().catch(e => console.error("Audio play failed", e));
    }, []);

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Category Breakdown
    const categoryData = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const pieChartData = Object.keys(categoryData).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: categoryData[key]
    }));

    const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28'];

    // Group Unique Users by Name to handle multiple IDs (Auth vs Legacy)
    // Invert userMap: Name -> [id1, id2, ...]
    const nameToIds: Record<string, string[]> = {};

    // Populate from userMap
    Object.entries(userMap).forEach(([id, name]) => {
        if (!nameToIds[name]) nameToIds[name] = [];
        if (!nameToIds[name].includes(id)) nameToIds[name].push(id);
    });

    // Also scan expenses for any IDs not in userMap (fallback)
    expenses.forEach(e => {
        const spenderName = userMap[e.spentBy] || "Unknown";
        if (spenderName !== "Unknown") {
            if (!nameToIds[spenderName]) nameToIds[spenderName] = [];
            if (!nameToIds[spenderName].includes(e.spentBy)) nameToIds[spenderName].push(e.spentBy);
        }
    });

    const uniqueNames = Object.keys(nameToIds).filter(Boolean);

    const financialData = uniqueNames.map(name => {
        const ids = nameToIds[name];

        // Total Spent by this person (matches ANY of their IDs)
        const spent = expenses
            .filter(e => ids.includes(e.spentBy))
            .reduce((sum, e) => sum + e.amount, 0);

        // Total Share (Cost) for this person
        const share = expenses.reduce((sum, e) => {
            const isCustomInvolved = e.splitMode === 'custom' && ids.some(id => e.splitAmong.includes(id));
            const isEqualInvolved = e.splitMode === 'equal';

            if (isEqualInvolved) {
                return sum + (userCount > 0 ? e.amount / userCount : 0);
            } else if (isCustomInvolved) {
                return sum + (e.splitAmong.length > 0 ? e.amount / e.splitAmong.length : 0);
            }

            return sum;
        }, 0);

        // Calculate Repayments (Settlements)
        // If I marked as PAID, I effectively "Spent" that amount (RepaymentsMade)
        // If someone marked as PAID to me, I effectively "Un-spent" that amount (RepaymentsReceived)
        let repaymentsMade = 0;
        let repaymentsReceived = 0;

        expenses.forEach(e => {
            if (!e.repaymentStatus) return;
            try {
                const statusMap = JSON.parse(e.repaymentStatus);

                // Calculate share amount for this expense
                let amountPerPerson = 0;
                if (e.splitMode === 'equal') {
                    amountPerPerson = userCount > 0 ? e.amount / userCount : 0;
                } else if (e.splitMode === 'custom') {
                    amountPerPerson = e.splitAmong.length > 0 ? e.amount / e.splitAmong.length : 0;
                }

                // Check if *this person* made a repayment (is a debtor who paid)
                // This person is in splitAmong AND marked 'paid' AND is NOT the spender
                // (Self-split doesn't count as repayment, usually handled by logic, but let's be safe: creditor != debtor)
                if (ids.some(myId => statusMap[myId] === 'paid' && e.splitAmong.includes(myId))) {
                    // Only count if I am NOT the spender (cannot repay myself)
                    if (!ids.includes(e.spentBy)) {
                        repaymentsMade += amountPerPerson;
                    }
                }

                // Check if *this person* received a repayment (is the spender)
                if (ids.includes(e.spentBy)) {
                    // Sum up all OTHER people who paid
                    e.splitAmong.forEach(borrowerId => {
                        if (!ids.includes(borrowerId) && statusMap[borrowerId] === 'paid') {
                            repaymentsReceived += amountPerPerson;
                        }
                    });
                }

            } catch (err) {
                console.error("Failed to parse repayment", err);
            }
        });

        // Net Paid = What I put in + What I gave back - What I got back
        const netPaid = spent + repaymentsMade - repaymentsReceived;

        if (spent === 0 && share === 0) return null;

        // Create initials for chart (First Last -> FL)
        const shortName = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

        const balance = share - netPaid;

        return {
            uid: ids[0], // Use first ID as key
            name,
            shortName,
            Spent: netPaid, // Show effective spending (Direct + Repaid - Reimbursed)
            Share: share,
            Balance: balance
        };
    }).filter(Boolean); // Remote nulls

    return (
        <ProtectedRoute>
            <div className="p-4 max-w-2xl mx-auto pb-20 space-y-6">
                <h1 className="text-2xl font-bold">Trip Analytics</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Trip Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-primary">₹{totalSpent.toFixed(0)}</div>
                    </CardContent>
                </Card>

                {/* Spending vs Share Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Spending vs Share</CardTitle>
                        <CardDescription>Compare what you Paid vs your Actual Share</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financialData as any[]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="shortName" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip
                                        labelFormatter={(label, payload) => {
                                            if (payload && payload.length > 0) {
                                                return payload[0].payload.name;
                                            }
                                            return label;
                                        }}
                                        formatter={(value: any) => `₹${Number(value || 0).toFixed(0)}`}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Spent" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Share" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `₹${Number(value || 0).toFixed(0)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {financialData?.map((data: any) => (
                                <div key={data.uid} className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <p className="font-medium">{data.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Net Paid: <span className="text-green-600 font-semibold">₹{data.Spent.toFixed(0)}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Share: ₹{data.Share.toFixed(0)}</p>
                                        {data.Balance > 0 ? (
                                            <p className="text-sm font-bold text-red-600">
                                                To Pay: ₹{data.Balance.toFixed(0)}
                                            </p>
                                        ) : (
                                            <p className="text-sm font-bold text-green-600">
                                                Gets Back: ₹{Math.abs(data.Balance).toFixed(0)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
