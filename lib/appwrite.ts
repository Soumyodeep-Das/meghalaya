import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

if (!projectId) {
    console.warn("Appwrite Project ID is missing. Please set NEXT_PUBLIC_APPWRITE_PROJECT_ID in .env.local");
}

client
    .setEndpoint(endpoint)
    .setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export const APPWRITE_CONFIG = {
    DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'meghalaya_db',
    USERS_COLLECTION_ID: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'usersMeta',
    EXPENSES_COLLECTION_ID: process.env.NEXT_PUBLIC_APPWRITE_EXPENSES_COLLECTION_ID || 'expenses',
    DELETE_REQUESTS_COLLECTION_ID: process.env.NEXT_PUBLIC_APPWRITE_DELETE_REQUESTS_COLLECTION_ID || 'deleteRequests',
    BUCKET_ID: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || 'receipts',
};

export { client };
