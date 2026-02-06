"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();

  // Attempt to unmute when user interacts (optional, but button is safer)
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        className="absolute top-0 left-0 h-full w-full object-cover transition-opacity duration-1000 opacity-80"
      >
        <source src="/modiji_core.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay Gradient for Text Readability & Theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-purple-900/20 to-black/80 z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 space-y-8">

        {/* Hero Text */}
        <div className="space-y-4 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg">
            MEGHALAYA <span className="text-purple-400">2026</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto font-light drop-shadow-md">
            The ultimate expense tracker for the ultimate trip.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-5 duration-1000 delay-300">
          <Link href={user ? "/dashboard" : "/login"}>
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg shadow-purple-900/50 transition-all hover:scale-105"
            >
              {user ? "Go to Dashboard" : "Get Started"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {!user && (
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 px-8 py-6 text-lg rounded-full transition-all"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Audio Toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-8 right-8 z-30 p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-purple-600/80 transition-all duration-300 group"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="h-6 w-6 group-hover:scale-110 transition-transform" />
        ) : (
          <Volume2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* Footer / Credit */}
      <div className="absolute bottom-4 left-0 w-full text-center z-20 pointer-events-none">
        <p className="text-xs text-white/30 tracking-widest uppercase">Designed for the Boys</p>
      </div>
    </main>
  );
}
