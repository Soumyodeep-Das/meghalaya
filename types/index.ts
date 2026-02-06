export interface UserMeta {
    $id: string; // Appwrite Document ID
    userId: string; // Auth User ID
    name: string;
    photo: string | null;
    role: "admin" | "user";
    tripKey: string;
    createdBy: string;
}

export interface Expense {
    $id: string;
    createdBy: string; // userId who added this
    spentBy: string; // userId of the person who paid
    amount: number;
    purpose: string;
    category: string;
    splitMode: "equal" | "custom";
    splitAmong: string[]; // array of userIds
    receipt: string | null; // URL or File ID
    paymentMode: "online" | "offline";
    repaymentStatus: string; // JSON string of Record<userId, "paid" | "due">
    timestamp: number;
}

export interface DeleteRequest {
    $id: string;
    expenseId: string;
    requestedBy: string;
    approved: boolean;
    approvedBy: string | null;
}

export interface QueueItem {
    id: number;
    tempId: string;
    data: any;
    action: 'create' | 'delete';
    timestamp: number;
}
