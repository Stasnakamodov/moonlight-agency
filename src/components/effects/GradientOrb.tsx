export function GradientOrb() {
  return (
    <>
      <div
        className="gradient-orb gradient-orb-slow"
        style={{
          background:
            "radial-gradient(circle, rgba(125,211,252,0.15) 0%, transparent 70%)",
          left: "0",
          bottom: "20%",
        }}
        aria-hidden="true"
      />
      <div
        className="gradient-orb"
        style={{
          background:
            "radial-gradient(circle, rgba(196,181,253,0.1) 0%, transparent 70%)",
          right: "0",
          top: "40%",
          animationDelay: "-10s",
        }}
        aria-hidden="true"
      />
      <div
        className="gradient-orb gradient-orb-fast"
        style={{
          background:
            "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)",
          left: "25%",
          top: "60%",
          animationDelay: "-5s",
        }}
        aria-hidden="true"
      />
    </>
  );
}
