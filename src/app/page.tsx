import Link from "next/link";
import { COUNTRIES, PEOPLE, PROFILE, SPORTS, WORLD_INTRO } from "@/lib/data";
import HeroStage3D from "@/components/HeroStage3D";
import ShootingGameGate from "@/components/ShootingGameGate";

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

      <section className="px-5 pb-6 pt-5 md:px-14">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="mb-2.5 font-display text-xl font-extrabold md:text-2xl">強み</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.25fr_1fr_1fr]">
            {PROFILE.strengths.map((s) => (
              <Link
                key={s.key}
                href={s.link}
                className="rounded-md border-2 border-(--color-ink) bg-(--color-white) p-[18px] text-center transition hover:-translate-y-1 hover:border-(--color-accent)"
              >
                <h3 className="text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1 text-sm text-(--color-ink-soft)">{s.desc}</p>
                <span className="mt-2.5 inline-block text-sm font-bold text-(--color-accent-dark)">
                  {s.linkLabel} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-7 md:px-14">
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-start gap-5 md:grid-cols-[1.25fr_1fr_1fr]">
          <div className="relative rounded-md border-2 border-(--color-ink) bg-(--color-white) p-[22px] pt-7 md:col-span-2">
            <span className="absolute -top-3.5 left-[22px] rounded-full bg-(--color-accent) px-3.5 py-1 font-display text-sm font-bold text-(--color-white)">
              職歴
            </span>
            <ul className="m-0 list-none p-0 text-left">
              {self.career!.map((step, i) => (
                <li
                  key={i}
                  className="relative ml-1 border-l-2 border-(--color-line) py-1.5 pl-5 text-sm"
                >
                  <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-accent)" />
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-md border-2 border-(--color-ink) bg-(--color-white) p-[22px] pt-7">
            <span className="absolute -top-3.5 left-[22px] rounded-full bg-(--color-accent) px-3.5 py-1 font-display text-sm font-bold text-(--color-white)">
              趣味・活動
            </span>
            <p className="my-1 mb-4 flex items-baseline gap-2">
              <strong className="font-display text-4xl font-extrabold leading-none text-(--color-accent-dark)">
                {WORLD_INTRO.visited}
              </strong>
              <span className="text-sm text-(--color-ink-soft)">カ国制覇</span>
            </p>
            <div className="flex flex-wrap gap-2.5">
              {PROFILE.hobbies.map((h) =>
                h.href ? (
                  <a
                    key={h.label}
                    href={h.href}
                    target="_blank"
                    rel="noopener"
                    className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold transition hover:border-(--color-accent) hover:text-(--color-accent-dark)"
                  >
                    {h.label}
                  </a>
                ) : (
                  <span
                    key={h.label}
                    className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold"
                  >
                    {h.label}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
