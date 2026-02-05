"use client";

import { useState } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { OAuthProvider } from "appwrite";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { refreshAuth } = useAuth();
    const router = useRouter();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await account.createEmailPasswordSession(email, password);
            await refreshAuth();
            toast.success("Welcome back!");
            router.push("/"); // AuthContext will handle redirect to dashboard or trip-key
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        try {
            account.createOAuth2Session(
                OAuthProvider.Google,
                `${window.location.origin}/`,
                `${window.location.origin}/login`
            );
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>Enter your email below to login to your account.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <form onSubmit={handleEmailLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Input
                                id="password"
                                type="password"
                                placeholder="Password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                        Google
                    </Button>
                </CardContent>
                <CardFooter>
                    <div className="text-sm text-center w-full">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="underline">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
