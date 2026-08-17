"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PEOPLE } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";

const WALKERS = [
  { top: "14%", size: 9, dir: "walk-right" as const, dur: "16s", delay: "-2s", left: "-6%" },
  { top: "30%", size: 13, dir: "walk-left" as const, dur: "21s", delay: "-6s", left: "108%" },
  { top: "48%", size: 7, dir: "walk-right" as const, dur: "13s", delay: "-9s", left: "-6%" },
  { top: "63%", size: 11, dir: "walk-left" as const, dur: "19s", delay: "-1s", left: "108%" },
  { top: "78%", size: 8, dir: "walk-right" as const, dur: "17s", delay: "-12s", left: "-6%" },
  { top: "22%", size: 6, dir: "walk-left" as const, dur: "24s", delay: "-4s", left: "108%" },
  { top: "88%", size: 10, dir: "walk-right" as const, dur: "20s", delay: "-15s", left: "-6%" },
];

export default function PeoplePage() {
  const [modal, setModal] = useState<ModalData>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const openPerson = (p: (typeof PEOPLE)[number]) => {
    if (p.isSelf && p.career) {
      setModal({
        photo: p.photo,
        title: p.name,
        tagline: `出現場所: ${p.place}`,
        body: (
          <>
            <ul className="m-0 list-none p-0 text-left">
              {p.career.map((step, i) => (
                <li key={i} className="relative ml-1 border-l-2 border-(--color-line) py-1.5 pl-5 text-sm">
                  <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-accent)" />
                  {step}
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-2 text-left text-sm font-extrabold text-(--color-accent-dark)">今後の目標</p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-left text-sm">
              {p.goals!.map((g) => (
                <li key={g} className="rounded-lg bg-(--color-bg-soft) px-3.5 py-2.5">
                  {g}
                </li>
              ))}
            </ul>
          </>
        ),
      });
    } else {
      setModal({ photo: p.photo, title: p.name, tagline: `出現場所: ${p.place}`, body: p.story });
    }
  };

  const scrollByCard = (dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("a, div[data-card]") as HTMLElement | null;
    const distance = card ? card.offsetWidth + 22 : 300;
    track.scrollBy({ left: dir * distance, behavior: "smooth" });
  };

  return (
    <>
      <section className="page-hero-photo">
        <Image src="/images/people/p4-ethiopia.jpg" alt="" fill className="object-cover" sizes="100vw" />
        <div className="page-hero-scrim" />
        <div className="page-hero-ambient" aria-hidden>
          {WALKERS.map((w, i) => (
            <span
              key={i}
              className="walker"
              style={{
                top: w.top,
                left: w.left,
                width: w.size,
                height: w.size,
                background: "rgba(255,255,255,0.8)",
                animation: `${w.dir} ${w.dur} linear infinite`,
                animationDelay: w.delay,
              }}
            />
          ))}
        </div>
        <div className="relative z-3 mx-auto w-full max-w-[1120px] px-5 py-5 md:px-14">
          <h1 className="font-display text-2xl font-extrabold text-(--color-white) md:text-4xl">
            世界のクセ強人類
          </h1>
          <p className="mt-2 max-w-md text-sm text-(--color-white)/85">
            人図鑑 — 好奇心の先で出会った、忘れられない人たち
          </p>
        </div>
      </section>

      <section className="px-5 py-6 md:px-14">
        <div className="relative mx-auto flex max-w-[1120px] items-center gap-3">
          <button
            onClick={() => scrollByCard(-1)}
            aria-label="前へ"
            className="hidden h-11 w-11 flex-none rounded-full border border-(--color-line) bg-(--color-white) text-lg transition hover:scale-105 hover:bg-(--color-accent) hover:text-(--color-white) md:block"
          >
            &#8592;
          </button>
          <div
            ref={trackRef}
            className="flex flex-1 gap-5 overflow-x-auto scroll-smooth py-2 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:h-1.5"
          >
            {PEOPLE.map((p) => (
              <div
                key={p.id}
                data-card
                onClick={() => openPerson(p)}
                className="w-[min(72vw,300px)] flex-none cursor-pointer rounded-md border-2 border-(--color-ink) bg-(--color-white) [scroll-snap-align:start] transition hover:-translate-y-1 hover:border-(--color-accent)"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-t-[4px] bg-(--color-bg-soft)">
                  <Image src={p.photo} alt={p.name} fill className="object-cover" sizes="300px" />
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-xl font-extrabold">{p.name}</h3>
                  <p className="mt-0.5 mb-2 text-sm text-(--color-ink-soft)">出現場所: {p.place}</p>
                  <p className="line-clamp-3 text-sm text-(--color-ink-soft)">
                    {p.isSelf ? p.goals![0] : p.story}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => scrollByCard(1)}
            aria-label="次へ"
            className="hidden h-11 w-11 flex-none rounded-full border border-(--color-line) bg-(--color-white) text-lg transition hover:scale-105 hover:bg-(--color-accent) hover:text-(--color-white) md:block"
          >
            &#8594;
          </button>
        </div>
      </section>

      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
