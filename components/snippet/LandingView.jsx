"use client";

import { memo } from "react";
import { GRAD, s } from "./homeStyles";
import { ConnectSpotifyButton } from "./ConnectSpotifyButton";

const LANDING_FEATURES = [
  { title: "Skip to the best part", body: "Jump instantly to what matters" },
  { title: "Build highlight reels", body: "Save your favorite moments" },
  {
    title: "Bring your library with you",
    body: "Your playlists and songs carry over, so listening never restarts from scratch",
  },
  { title: "Built for real listening", body: "No more skipping around manually" },
];

export const LandingView = memo(function LandingView({ emailCopied, onCopyEmail }) {
  return (
    <div style={s.landingWrap}>
      <section style={{ ...s.landingHero, animationDelay: "0ms" }} className="landingFadeUp">
        <div style={s.landingHeroGlow} />
        <p
          style={{
            ...s.landingHeadline,
            background: GRAD,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Jump to the best parts.
        </p>
        <p style={s.landingSubheadline}>Play any song and skip straight to what hits.</p>
        <ConnectSpotifyButton />
        <p style={s.landingCtaMeta}>Takes 5 seconds • No data stored</p>
        <p style={s.landingMicroText}>No account needed</p>
      </section>

      <section style={{ ...s.landingSection, animationDelay: "90ms" }} className="landingFadeUp">
        <p style={s.landingSectionTitle}>Music, but edited for you.</p>
        <p style={s.landingSectionBody}>
          Save and replay the best moments of any song — the drop, the verse, the part that actually hits.
        </p>
      </section>

      <section style={{ ...s.landingSection, animationDelay: "140ms" }} className="landingFadeUp">
        <p style={s.landingSectionTitle}>What Snippet does</p>
        <div style={s.landingFeatureGrid}>
          {LANDING_FEATURES.map((feature) => (
            <article key={feature.title} style={s.landingFeatureCard}>
              <p style={s.landingFeatureTitle}>{feature.title}</p>
              <p style={s.landingFeatureBody}>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...s.landingSection, animationDelay: "190ms" }} className="landingFadeUp">
        <p style={s.landingSectionTitle}>Built with privacy in mind</p>
        <p style={s.landingSectionBody}>
          Snippet does not store your Spotify login or personal data. We use Spotify’s official authentication —
          nothing is saved on our servers.
        </p>
      </section>

      <section style={{ ...s.landingSection, animationDelay: "240ms" }} className="landingFadeUp">
        <p style={s.landingSectionTitle}>Powered by listeners, not algorithms</p>
        <p style={s.landingSectionBody}>The best parts are discovered by people, not decided for you.</p>
      </section>

      <section style={{ ...s.landingSection, ...s.landingFinalCta, animationDelay: "290ms" }} className="landingFadeUp">
        <p style={s.landingSectionTitle}>Start in seconds</p>
        <ConnectSpotifyButton />
        <p style={s.landingCtaMeta}></p>
      </section>

      <section style={{ ...s.landingDisclaimer, animationDelay: "340ms" }} className="landingFadeUp">
        <p style={s.landingDisclaimerTitle}>Built by a two-person team</p>
        <p style={s.landingDisclaimerBody}>
          We&apos;re a two man army trying to make our dream real. Snippet is still in development, and we&apos;re
          shaping it in public. If you have feedback, ideas, or something feels off, please send me an email at{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#c084fc",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "inherit",
                fontFamily: "inherit",
              }}
              onClick={onCopyEmail}
            >
              chaose3@outlook.com
            </button>
            {emailCopied && (
              <span
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#1e1030",
                  border: "1px solid rgba(224,170,255,0.2)",
                  color: "#e0aaff",
                  fontSize: "0.72rem",
                  padding: "0.25rem 0.6rem",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                Copied!
              </span>
            )}
          </span>
        </p>
      </section>
    </div>
  );
});
