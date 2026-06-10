import { Outlet, useNavigate } from "@tanstack/react-router";
import React, { useCallback } from "react";
import { toast } from "sonner";
import { useNewMessageNotification } from "../hooks/useQueries";
import { useGetUserProfile } from "../hooks/useQueries";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";

function MessageNotificationListener() {
  const navigate = useNavigate();

  const handleNewMessage = useCallback(
    (senderPrincipal: string, preview: string) => {
      toast.custom(
        (id) => (
          <MessageToast
            toastId={id}
            senderPrincipal={senderPrincipal}
            preview={preview}
            onNavigate={() => {
              toast.dismiss(id);
              navigate({ to: "/messages" });
            }}
          />
        ),
        { duration: 4000 },
      );
    },
    [navigate],
  );

  useNewMessageNotification(handleNewMessage);
  return null;
}

interface MessageToastProps {
  toastId: string | number;
  senderPrincipal: string;
  preview: string;
  onNavigate: () => void;
}

function MessageToast({
  senderPrincipal,
  preview,
  onNavigate,
}: MessageToastProps) {
  const { data: senderProfile } = useGetUserProfile(senderPrincipal);
  const senderName = senderProfile?.name ?? `${senderPrincipal.slice(0, 8)}…`;

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="flex items-start gap-3 w-full cursor-pointer text-left"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.10 0.012 265 / 95%), oklch(0.08 0.010 265 / 95%))",
        border: "1px solid oklch(0.78 0.16 75 / 40%)",
        borderRadius: "12px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "12px 14px",
        boxShadow:
          "0 4px 24px oklch(0.78 0.16 75 / 12%), 0 0 0 1px oklch(0.78 0.16 75 / 10%)",
        width: "100%",
      }}
    >
      <span
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: "linear-gradient(135deg, #f5c842, #e8a020)",
          color: "oklch(0.07 0.006 265)",
        }}
      >
        {senderName.slice(0, 1).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold truncate"
          style={{ color: "#f5c842" }}
        >
          {senderName}
        </p>
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: "oklch(0.75 0.015 60)" }}
        >
          {preview}
        </p>
      </div>
    </button>
  );
}

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <MessageNotificationListener />
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
