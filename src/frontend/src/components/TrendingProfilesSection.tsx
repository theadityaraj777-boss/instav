import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import type React from "react";
import { type CreatorRanking, useGetTopCreators } from "../hooks/useQueries";
import AvatarPlaceholder from "./AvatarPlaceholder";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Color configs for ranks 3-10 (cycling)
const RANK_COLORS = [
  {
    border: "oklch(0.62 0.26 303 / 60%)",
    bg: "oklch(0.62 0.26 303 / 8%)",
    text: "oklch(0.72 0.20 303)",
    ring: "linear-gradient(135deg, oklch(0.62 0.26 303), oklch(0.52 0.24 300))",
  }, // purple
  {
    border: "oklch(0.82 0.18 200 / 60%)",
    bg: "oklch(0.82 0.18 200 / 8%)",
    text: "oklch(0.82 0.18 200)",
    ring: "linear-gradient(135deg, oklch(0.82 0.18 200), oklch(0.70 0.18 210))",
  }, // cyan
  {
    border: "oklch(0.68 0.22 25 / 60%)",
    bg: "oklch(0.68 0.22 25 / 8%)",
    text: "oklch(0.75 0.20 25)",
    ring: "linear-gradient(135deg, oklch(0.68 0.22 25), oklch(0.60 0.22 20))",
  }, // coral
  {
    border: "oklch(0.72 0.20 140 / 60%)",
    bg: "oklch(0.72 0.20 140 / 8%)",
    text: "oklch(0.72 0.20 140)",
    ring: "linear-gradient(135deg, oklch(0.72 0.20 140), oklch(0.60 0.20 150))",
  }, // green
  {
    border: "oklch(0.75 0.22 350 / 60%)",
    bg: "oklch(0.75 0.22 350 / 8%)",
    text: "oklch(0.75 0.22 350)",
    ring: "linear-gradient(135deg, oklch(0.75 0.22 350), oklch(0.65 0.22 340))",
  }, // pink
  {
    border: "oklch(0.60 0.20 240 / 60%)",
    bg: "oklch(0.60 0.20 240 / 8%)",
    text: "oklch(0.70 0.18 240)",
    ring: "linear-gradient(135deg, oklch(0.60 0.20 240), oklch(0.52 0.22 255))",
  }, // blue
  {
    border: "oklch(0.75 0.18 55 / 60%)",
    bg: "oklch(0.75 0.18 55 / 8%)",
    text: "oklch(0.78 0.18 55)",
    ring: "linear-gradient(135deg, oklch(0.75 0.18 55), oklch(0.65 0.20 45))",
  }, // orange
  {
    border: "oklch(0.72 0.18 175 / 60%)",
    bg: "oklch(0.72 0.18 175 / 8%)",
    text: "oklch(0.72 0.18 175)",
    ring: "linear-gradient(135deg, oklch(0.72 0.18 175), oklch(0.62 0.18 185))",
  }, // teal
];

// Shimmer keyframes injected once
const SHIMMER_STYLE = `
@keyframes goldShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes silverShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 24px 4px rgba(255,200,0,0.35), 0 0 60px 12px rgba(255,160,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15); }
  50%       { box-shadow: 0 0 40px 10px rgba(255,200,0,0.55), 0 0 80px 20px rgba(255,140,0,0.25), inset 0 1px 0 rgba(255,255,255,0.20); }
}
@keyframes pulseSilver {
  0%, 100% { box-shadow: 0 0 20px 4px rgba(192,192,192,0.30), 0 0 50px 10px rgba(160,160,160,0.12), inset 0 1px 0 rgba(255,255,255,0.12); }
  50%       { box-shadow: 0 0 34px 8px rgba(210,210,210,0.50), 0 0 70px 16px rgba(180,180,180,0.20), inset 0 1px 0 rgba(255,255,255,0.18); }
}
`;

function injectShimmerStyles() {
  if (
    typeof document !== "undefined" &&
    !document.getElementById("trending-shimmer-styles")
  ) {
    const el = document.createElement("style");
    el.id = "trending-shimmer-styles";
    el.textContent = SHIMMER_STYLE;
    document.head.appendChild(el);
  }
}

interface GoldCardProps {
  creator: CreatorRanking;
  name: string;
  handle: string;
  followerCount: number;
  onClick: () => void;
}

function GoldCard({
  creator,
  name,
  handle,
  followerCount,
  onClick,
}: GoldCardProps) {
  injectShimmerStyles();
  return (
    <button
      type="button"
      data-ocid="trending.item.1"
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden relative transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99]"
      style={{
        background:
          "linear-gradient(135deg, #FFD700 0%, #FFA500 40%, #FF8C00 70%, #DAA520 100%)",
        border: "2px solid #FFD700",
        animation: "pulseGlow 3s ease-in-out infinite",
        padding: "0",
      }}
    >
      {/* Shimmer overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "goldShimmer 2.8s linear infinite",
          pointerEvents: "none",
          borderRadius: "inherit",
          zIndex: 1,
        }}
      />

      {/* Card content */}
      <div className="relative z-10 p-5">
        {/* Top row: crown + TRENDING #1 badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: "1.8rem",
                filter: "drop-shadow(0 2px 6px rgba(255,100,0,0.7))",
              }}
            >
              👑
            </span>
            <span
              className="font-display font-black tracking-widest uppercase"
              style={{
                fontSize: "0.65rem",
                color: "#1a0a00",
                background: "rgba(0,0,0,0.18)",
                padding: "3px 10px",
                borderRadius: "999px",
                letterSpacing: "0.12em",
              }}
            >
              Trending #1
            </span>
          </div>
          {/* Shadow count pill */}
          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,220,0,0.5)",
              borderRadius: "999px",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              className="font-bold"
              style={{
                fontSize: "0.85rem",
                color: "#fff8dc",
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              {formatCount(followerCount)}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                color: "rgba(255,248,220,0.75)",
                fontWeight: 600,
              }}
            >
              Shadows
            </span>
          </div>
        </div>

        {/* Avatar + info row */}
        <div className="flex items-center gap-4">
          {/* Avatar with thick yellow→orange→red gradient ring */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              padding: 3,
              background:
                "linear-gradient(135deg, #FFEC00 0%, #FF8C00 50%, #E83030 100%)",
              flexShrink: 0,
              boxShadow: "0 4px 20px rgba(255,140,0,0.60)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#1a0a00",
              }}
            >
              <AvatarPlaceholder
                name={name}
                profilePicture={creator.profile?.profilePhoto}
                size="lg"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Name, handle, follow prompt */}
          <div className="flex-1 min-w-0">
            <p
              className="font-display font-black truncate"
              style={{
                fontSize: "1.15rem",
                color: "#fff",
                textShadow: "0 2px 8px rgba(0,0,0,0.40)",
                lineHeight: 1.2,
              }}
            >
              {name} ♕
            </p>
            {handle && (
              <p
                className="truncate mt-0.5"
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(255,235,150,0.85)",
                  fontWeight: 500,
                }}
              >
                @{handle}
              </p>
            )}
            {/* Follow button */}
            <div
              className="mt-3 inline-flex items-center gap-1.5 font-semibold"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,220,50,0.50)",
                borderRadius: "999px",
                padding: "5px 16px",
                fontSize: "0.75rem",
                color: "#fff8dc",
                backdropFilter: "blur(4px)",
              }}
            >
              + Shadow
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

interface SilverCardProps {
  creator: CreatorRanking;
  name: string;
  handle: string;
  followerCount: number;
  onClick: () => void;
}

function SilverCard({
  creator,
  name,
  handle,
  followerCount,
  onClick,
}: SilverCardProps) {
  injectShimmerStyles();
  return (
    <button
      type="button"
      data-ocid="trending.item.2"
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden relative transition-transform duration-200 hover:scale-[1.015] active:scale-[0.99]"
      style={{
        background:
          "linear-gradient(135deg, #C0C0C0 0%, #A8A9AD 30%, #8E9499 60%, #D3D3D3 100%)",
        border: "2px solid #C8C8C8",
        animation: "pulseSilver 3.4s ease-in-out infinite",
        padding: "0",
      }}
    >
      {/* Shimmer overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "silverShimmer 3.2s linear infinite",
          pointerEvents: "none",
          borderRadius: "inherit",
          zIndex: 1,
        }}
      />

      {/* Card content */}
      <div className="relative z-10 p-4">
        {/* Top row: medal + TRENDING #2 badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="font-display font-black"
              style={{
                fontSize: "1.5rem",
                color: "#2a2a2a",
                textShadow: "0 2px 4px rgba(255,255,255,0.35)",
              }}
            >
              🥈
            </span>
            <span
              className="font-display font-black tracking-widest uppercase"
              style={{
                fontSize: "0.62rem",
                color: "#1a1a1a",
                background: "rgba(0,0,0,0.15)",
                padding: "3px 10px",
                borderRadius: "999px",
                letterSpacing: "0.12em",
              }}
            >
              Trending #2
            </span>
          </div>
          {/* Shadow count pill */}
          <div
            style={{
              background: "rgba(0,0,0,0.20)",
              border: "1px solid rgba(220,220,220,0.45)",
              borderRadius: "999px",
              padding: "3px 10px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              className="font-bold"
              style={{
                fontSize: "0.82rem",
                color: "#f0f0f0",
                textShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              {formatCount(followerCount)}
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                color: "rgba(240,240,240,0.70)",
                fontWeight: 600,
              }}
            >
              Shadows
            </span>
          </div>
        </div>

        {/* Avatar + info row */}
        <div className="flex items-center gap-4">
          {/* Avatar with silver→gray gradient ring */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              padding: 3,
              background:
                "linear-gradient(135deg, #E8E8E8 0%, #B0B3B8 50%, #787878 100%)",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(150,150,150,0.45)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: "#1c1c1e",
              }}
            >
              <AvatarPlaceholder
                name={name}
                profilePicture={creator.profile?.profilePhoto}
                size="lg"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Name, handle, follow prompt */}
          <div className="flex-1 min-w-0">
            <p
              className="font-display font-black truncate"
              style={{
                fontSize: "1.05rem",
                color: "#fff",
                textShadow: "0 2px 6px rgba(0,0,0,0.35)",
                lineHeight: 1.2,
              }}
            >
              {name}
            </p>
            {handle && (
              <p
                className="truncate mt-0.5"
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(220,220,220,0.80)",
                  fontWeight: 500,
                }}
              >
                @{handle}
              </p>
            )}
            {/* Follow button */}
            <div
              className="mt-3 inline-flex items-center gap-1.5 font-semibold"
              style={{
                background: "rgba(0,0,0,0.28)",
                border: "1px solid rgba(220,220,220,0.40)",
                borderRadius: "999px",
                padding: "4px 14px",
                fontSize: "0.73rem",
                color: "#f0f0f0",
                backdropFilter: "blur(4px)",
              }}
            >
              + Shadow
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function TrendingProfilesSection() {
  const { data: creators = [], isLoading } = useGetTopCreators(10);
  const navigate = useNavigate();

  return (
    <section className="px-4 py-3">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5" style={{ color: "#f5c842" }} />
        <h2
          className="font-display font-semibold text-base"
          style={{ color: "oklch(0.96 0.008 60)" }}
        >
          Trending
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((k) => (
            <div
              key={k}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "oklch(0.10 0.010 265 / 60%)" }}
            >
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="w-24 h-3.5 rounded" />
                <Skeleton className="w-16 h-3 rounded" />
              </div>
              <Skeleton className="w-10 h-3.5 rounded" />
            </div>
          ))
        ) : creators.length === 0 ? (
          <p className="text-muted-foreground text-xs py-2">
            No trending creators yet
          </p>
        ) : (
          creators.map((creator: CreatorRanking) => {
            const rank = Number(creator.rank);
            const name =
              creator.profile?.name ?? creator.principal.toString().slice(0, 8);
            const handle = creator.profile?.handle ?? "";
            const followerCount = Number(creator.followerCount);
            const goToProfile = () =>
              navigate({
                to: "/user/$principal",
                params: { principal: creator.principal.toString() },
              });

            if (rank === 1) {
              return (
                <GoldCard
                  key={creator.principal.toString()}
                  creator={creator}
                  name={name}
                  handle={handle}
                  followerCount={followerCount}
                  onClick={goToProfile}
                />
              );
            }

            if (rank === 2) {
              return (
                <SilverCard
                  key={creator.principal.toString()}
                  creator={creator}
                  name={name}
                  handle={handle}
                  followerCount={followerCount}
                  onClick={goToProfile}
                />
              );
            }

            // Rank 3-10 — cycle through colors (unchanged)
            const colorIdx = (rank - 3) % RANK_COLORS.length;
            const c = RANK_COLORS[colorIdx];
            const cardStyle: React.CSSProperties = {
              background: c.bg,
              border: `1px solid ${c.border}`,
            };
            const rankBadge = (
              <span
                style={{ fontSize: "0.75rem", color: c.text, fontWeight: 700 }}
              >
                #{rank}
              </span>
            );

            return (
              <button
                type="button"
                key={creator.principal.toString()}
                data-ocid={`trending.item.${rank}`}
                onClick={goToProfile}
                className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={cardStyle}
              >
                {/* Rank badge */}
                <div className="w-6 flex-shrink-0 flex items-center justify-center">
                  {rankBadge}
                </div>

                {/* Avatar with colored ring */}
                <div
                  className="w-10 h-10 rounded-full p-0.5 flex-shrink-0"
                  style={{ background: c.ring }}
                >
                  <div
                    className="w-full h-full rounded-full overflow-hidden"
                    style={{ background: "oklch(0.05 0.008 265)" }}
                  >
                    <AvatarPlaceholder
                      name={name}
                      profilePicture={creator.profile?.profilePhoto}
                      size="md"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Name / handle */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "oklch(0.96 0.008 60)" }}
                  >
                    {name}
                  </p>
                  {handle && (
                    <p
                      className="text-xs truncate"
                      style={{ color: "oklch(0.50 0.010 60)" }}
                    >
                      @{handle}
                    </p>
                  )}
                </div>

                {/* Shadow count */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: c.text }}>
                    {formatCount(followerCount)}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.45 0.010 60)" }}
                  >
                    shadows
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
