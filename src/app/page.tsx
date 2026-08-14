import Image from "next/image";
import Link from "next/link";
import { PEOPLE, PROFILE, WORLD_INTRO } from "@/lib/data";
import EgyptParallax from "@/components/EgyptParallax";
import ShootingGameGate from "@/components/ShootingGameGate";

export default function Home() {
  const self = PEOPLE.find((p) => p.isSelf)!;

  return (
    <>
      <ShootingGameGate />

      <section className="hero-section relative overflow-hidden">
        <EgyptParallax />
        <div className="relative z-1 mx-auto max-w-[1120px] px-5 pt-4 md:px-14 md:pt-6">
          <div className="relative overflow-hidden rounded-2xl shadow-[0_24px_48px_rgba(31,42,46,0.2)]">
            <div className="relative aspect-[3/2] w-full md:aspect-[16/5]">
              <Image
                src={PROFILE.photo}
                alt={PROFILE.name}
                fill
                sizes="(max-width: 768px) 100vw, 1120px"
                className="object-cover"
                style={{ objectPosition: "32% 55%" }}
                priority
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/0 to-transparent px-5 pb-4 pt-8 md:px-8 md:pb-6">
              <h1 className="font-display text-3xl font-extrabold text-(--color-white) [text-shadow:0_2px_12px_rgba(0,0,0,0.25)] md:text-5xl">
                {PROFILE.name}
              </h1>
              <p className="mt-1.5 font-display text-sm font-bold tracking-wider text-(--color-white)/90 md:text-lg">
                {PROFILE.tagline}
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-sm text-(--color-ink-soft)">{PROFILE.meta}</p>
        </div>
      </section>

      <section className="px-5 pb-6 pt-3.5 md:px-14">
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
