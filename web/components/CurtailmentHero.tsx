import Image from "next/image";

export default function CurtailmentHero({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", width: "100%" }}>
      <div aria-hidden style={{ pointerEvents: "none", position: "absolute", inset: 0 }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <Image
            src="/images/hero-solar-curtailment.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "right center" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(5,15,11,0.15) 0%, rgba(5,15,11,0.4) 55%, rgba(5,15,11,0.9) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(5,15,11,0.45) 0%, transparent 70%)",
          }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </section>
  );
}
