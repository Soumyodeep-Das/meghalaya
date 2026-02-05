# Meghalaya PWA Expense Tracker

A Next.js 14 Responsive PWA for tracking trip expenses with offline support, Appwrite backend, and detailed analytics.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Backend & Auth**: Appwrite
- **State/Offline**: IndexedDB + React Context
- **Charts**: Recharts

## Setup Instructions

1.  **Clone & Install**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Create a `.env.local` file with:
    ```env
    NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
    NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_APPWRITE_DATABASE_ID=meghalaya_db
    NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=usersMeta
    NEXT_PUBLIC_APPWRITE_EXPENSES_COLLECTION_ID=expenses
    NEXT_PUBLIC_APPWRITE_DELETE_REQUESTS_COLLECTION_ID=deleteRequests
    NEXT_PUBLIC_APPWRITE_BUCKET_ID=receipts
    ```

3.  **Appwrite Configuration (Critical)**
    
    ### Allow Email/Password Auth
    - Go to **Auth** > **Settings** > Enable **Email/Password**.

    ### Database & Collections
    Create a Database named `meghalaya_db`. Create the following Collections:

    #### 1. `usersMeta`
    *Stores user roles and trip keys.*
    - **Attributes**:
        - `userId` (String, size: 255, Required)
        - `name` (String, size: 255, Required)
        - `photo` (Url, Optional)
        - `role` (String, size: 50, Required) -> values: "admin", "user"
        - `tripKey` (String, size: 50, Required)
        - `createdBy` (String, size: 255, Required)
    - **Indexes**:
        - `idx_userId` (Key: `userId`, Type: Unique) -> **Required for Login**
        - `idx_tripKey` (Key: `tripKey`, Type: Unique) -> **Required for Joining Trip**

    #### 2. `expenses`
    *Stores all expense records.*
    - **Attributes**:
        - `createdBy` (String, size: 255, Required)
        - `spentBy` (String, size: 255, Required)
        - `amount` (Float, Required)
        - `purpose` (String, size: 255, Required)
        - `category` (String, size: 50, Required)
        - `splitMode` (String, size: 50, Required)
        - `splitAmong` (String, Array, Required)
        - `receipt` (String, size: 1000, Optional)
        - `timestamp` (Integer, Required)
    - **Indexes**:
        - `idx_timestamp` (Key: `timestamp` DESC) -> Useful for sorting on dashboard

    #### 3. `deleteRequests`
    *Stores requests from normal users to delete an expense.*
    - **Attributes**:
        - `expenseId` (String, size: 255, Required)
        - `requestedBy` (String, size: 255, Required)
        - `approved` (Boolean, Required)
        - `approvedBy` (String, size: 255, Optional)
    - **Indexes**:
        - `idx_approved` (Key: `approved`) -> Useful for filtering pending requests

    ### Permissions (RLS)
    For simplicity in this PWA, you can set **Collection Level Permissions**:
    - **Role: Any** -> Read, Create, Update, Delete.
    *(In a stricter production environment, you would limit `usersMeta` and `deleteRequests` modification to Admins only via Appwrite Teams or Server Functions.)*

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## Offline Support
The app uses a Service Worker to cache assets and IndexedDB to queue expenses when offline. When connection is restored, expenses are automatically synced.

## User Guide
- **First Sign Up**: You will be redirected to a `/setup` page.
- **Admin**: Choose "Create New Trip". This makes you the Admin and lets you generate keys for others.
- **Users**: Choose "Join Trip" and enter the key provided by the Admin.
