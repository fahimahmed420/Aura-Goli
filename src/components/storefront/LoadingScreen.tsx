"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  isLoading: boolean;
}

export default function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(isLoading);
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setIsVisible(true);
      setProgress(0);

      // Simulate progress while loading
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 30;
        });
      }, 300);

      return () => clearInterval(interval);
    } else {
      // Complete progress
      setProgress(100);

      // Slide out animation (0.6s)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 100);

      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
        setProgress(0);
      }, 700);

      return () => {
        clearTimeout(timer);
        clearTimeout(unmountTimer);
      };
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "#0b0b14",
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-spinner {
            animation: none !important;
          }
          .loading-text {
            animation: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col items-center gap-8">
        {/* Logo/Brand */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            fontFamily: "'Playfair Display', serif",
            color: "#c9a84c",
            letterSpacing: "4px",
          }}
        >
          AURA GOLI
        </div>

        {/* Spinner */}
        <div
          className="loading-spinner"
          style={{
            width: "64px",
            height: "64px",
            border: "4px solid rgba(201, 168, 76, 0.2)",
            borderTopColor: "#c9a84c",
            borderRadius: "50%",
            animation: "spin 1.2s linear infinite",
          }}
        />

        {/* Progress Counter */}
        <div className="text-center">
          <div
            style={{
              fontSize: "14px",
              color: "#faf7f0",
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            {Math.round(progress)}%
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: "200px",
              height: "2px",
              background: "rgba(201, 168, 76, 0.2)",
              borderRadius: "1px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#c9a84c",
                width: `${progress}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Loading Text */}
        <div
          className="loading-text"
          style={{
            fontSize: "12px",
            color: "#faf7f0",
            letterSpacing: "2px",
            textTransform: "uppercase",
            animation: "pulse-text 1.5s ease-in-out infinite",
          }}
        >
          Loading
        </div>
      </div>
    </div>
  );
}
