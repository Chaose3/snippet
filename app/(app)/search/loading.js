import { s } from "../../../components/snippet/homeStyles";

export default function SearchLoading() {
  return (
    <div style={s.searchPage} aria-busy="true" aria-label="Loading search">
      <p style={s.tabHeading}>Search</p>
      <div
        style={{
          height: 72,
          maxWidth: 400,
          width: "100%",
          margin: "0 auto 1.25rem",
          borderRadius: 26,
          background: "rgba(255,255,255,0.06)",
        }}
      />
    </div>
  );
}
