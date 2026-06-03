import { s } from "../../../components/snippet/homeStyles";

export default function SnippetsLoading() {
  return (
    <div style={s.searchPage} aria-busy="true" aria-label="Loading snippets">
      <p style={s.tabHeading}>Snippets</p>
      <div
        style={{
          height: 120,
          width: "100%",
          borderRadius: 24,
          background: "rgba(255,255,255,0.06)",
        }}
      />
    </div>
  );
}
