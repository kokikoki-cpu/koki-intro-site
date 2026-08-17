import { COUNTRIES, PEOPLE, PROFILE, SPORTS, WORLD_INTRO } from "@/lib/data";
import HeroStage3D from "@/components/HeroStage3D";
import ShootingGameGate from "@/components/ShootingGameGate";
import SolarSystem from "@/components/SolarSystem";

/** 立体ヒーローの円周に並べる実写。旅の写真を主役にする */
const HERO_PHOTOS = [
  PROFILE.photo,
  ...COUNTRIES.map((c) => c.photo),
  SPORTS[2].photo,
  SPORTS[5].photo,
];

export default function Home() {
  const self = PEOPLE.find((p) => p.isSelf)!;

  return (
    <>
      <ShootingGameGate />

      <section className="relative h-[clamp(300px,46vh,420px)] w-full overflow-hidden md:h-[clamp(380px,62vh,560px)]">
        <HeroStage3D photos={HERO_PHOTOS} />

        {/* 文字を読ませるための、背景色と同じ色のフェード（下から） */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-(--color-bg) via-(--color-bg)/82 to-transparent" />

        <div className="pointer-events-none absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1120px] px-5 pb-6 md:px-14 md:pb-9">
            <h1 className="font-display text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[0.98] tracking-tight">
              {PROFILE.name}
            </h1>
            <p className="mt-2 font-display text-lg font-bold tracking-[0.18em] text-(--color-accent-dark) md:text-2xl">
              {PROFILE.tagline}
            </p>
            <p className="mt-1.5 text-sm text-(--color-ink-soft)">{PROFILE.meta}</p>
          </div>
        </div>

        <p className="pointer-events-none absolute right-5 top-4 text-xs text-(--color-ink-soft)/70 md:right-14">
          写真はドラッグで回せる
        </p>
      </section>

      <SolarSystem
        sunName={PROFILE.name}
        sunPhoto={self.photo}
        strengths={PROFILE.strengths}
        career={self.career!}
        hobbies={PROFILE.hobbies}
        visited={WORLD_INTRO.visited}
      />
    </>
  );
}
