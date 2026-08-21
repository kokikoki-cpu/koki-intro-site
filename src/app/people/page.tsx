"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { PEOPLE, type Person } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";
import SpaceBackdrop from "@/components/SpaceBackdrop";
import ReturnToSystem from "@/components/ReturnToSystem";
import { unlock, useUnlockedFrom } from "@/lib/unlock";

const MemoryGame = dynamic(() => import("@/components/games/MemoryGame"), { ssr: false });

/** 記憶ゲームの盤面（6マス）。人物写真＋旅の写真を混ぜる */
const MEMORY_CELLS = [
  { photo: "/images/profile/koki.jpg", label: "1" },
  { photo: "/images/people/p2-srilanka.jpg", label: "2" },
  { photo: "/images/people/p3-india.jpg", label: "3" },
  { photo: "/images/people/p4-ethiopia.jpg", label: "4" },
  { photo: "/images/countries/india.jpg", label: "5" },
  { photo: "/images/countries/kenya.jpg", label: "6" },
];

const PEOPLE_IDS = PEOPLE.map((p) => p.id);

export default function PeoplePage() {
  const [modal, setModal] = useState<ModalData>(null);
  const [pending, setPending] = useState<Person | null>(null);
  const found = useUnlockedFrom(PEOPLE_IDS);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const showPerson = (p: Person, celebrate = false) => {
    if (p.isSelf && p.career) {
      setModal({
        photo: p.photo,
        title: p.name,
        tagline: `出現場所: ${p.place}`,
        celebrate,
        body: (
          <>
            <ul className="m-0 list-none p-0 text-left">
              {p.career.map((step, i) => (
                <li
                  key={i}
                  className="relative ml-1 border-l-2 border-(--color-line) py-1.5 pl-5 text-sm"
                >
                  <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-ember)" />
                  {step}
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-2 text-left text-sm font-extrabold text-(--color-nebula)">
              今後の目標
            </p>
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
      setModal({ photo: p.photo, title: p.name, tagline: `出現場所: ${p.place}`, body: p.story, celebrate });
    }
  };

  const onCard = (p: Person) => {
    if (found.has(p.id)) showPerson(p);
    else setPending(p);
  };

  const reveal = () => {
    if (!pending) return;
    unlock(pending.id);
    showPerson(pending, true);
    setPending(null);
  };

  // 合言葉での全解錠は GameShell 側で sessionStorage に反映済み
  const unlockAll = () => {
    if (pending) showPerson(pending);
    setPending(null);
  };

  const scrollByCard = (dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("div[data-card]") as HTMLElement | null;
    const distance = card ? card.offsetWidth + 22 : 300;
    track.scrollBy({ left: dir * distance, behavior: "smooth" });
  };

  return (
    <>
      <section className="space relative flex min-h-[calc(100vh-60px)] flex-col justify-center px-5 py-10 text-(--color-white) md:px-14">
        <SpaceBackdrop scenery="steppe" />

        <div className="relative mx-auto mb-6 w-full max-w-[1120px]">
          <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-tight">
            世界のクセ強人類
          </h1>
        </div>
        <p className="relative mx-auto mb-3 w-full max-w-[1120px] text-sm font-bold text-(--color-ember)">
          発見 {found.size} / {PEOPLE.length}
        </p>

        <div className="relative z-1 mx-auto flex w-full max-w-[1120px] items-center gap-3">
          <button
            onClick={() => scrollByCard(-1)}
            aria-label="前へ"
            className="hidden h-11 w-11 flex-none rounded-full border border-(--color-white)/30 bg-(--color-ink)/80 text-lg text-(--color-white) transition hover:scale-105 hover:bg-(--color-nebula) md:block"
          >
            &#8592;
          </button>
          <div
            ref={trackRef}
            className="flex flex-1 gap-5 overflow-x-auto scroll-smooth py-2 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:h-1.5"
          >
            {PEOPLE.map((p) => {
              const done = found.has(p.id);
              return (
                <div
                  key={p.id}
                  data-card
                  onClick={() => onCard(p)}
                  className="w-[min(72vw,300px)] flex-none cursor-pointer rounded-md border-2 border-(--color-white)/30 bg-(--color-ink)/80 backdrop-blur-sm [scroll-snap-align:start] transition hover:-translate-y-1 hover:border-(--color-ember)"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-t-[4px] bg-black/40">
                    <Image
                      src={p.photo}
                      alt={done ? p.name : "未発見"}
                      fill
                      className={done ? "object-cover" : "object-cover brightness-0 opacity-75"}
                      sizes="300px"
                    />
                    {!done && (
                      <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-extrabold text-(--color-white)">
                        ?
                      </span>
                    )}
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="text-xl font-extrabold">{done ? p.name : "？？？"}</h3>
                    <p className="mt-0.5 mb-2 text-sm text-(--color-bg-soft)/70">
                      出現場所: {done ? p.place : "？"}
                    </p>
                    <p className="line-clamp-3 text-sm text-(--color-bg-soft)/80">
                      {done ? (p.isSelf ? p.goals![0] : p.story) : "押して捕まえると正体がわかる"}
                    </p>
                    {!done && (
                      <p className="mt-2 text-sm tracking-[0.2em] text-(--color-ember)">
                        {"★".repeat(p.level)}
                        <span className="text-(--color-white)/25">{"★".repeat(5 - p.level)}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => scrollByCard(1)}
            aria-label="次へ"
            className="hidden h-11 w-11 flex-none rounded-full border border-(--color-white)/30 bg-(--color-ink)/80 text-lg text-(--color-white) transition hover:scale-105 hover:bg-(--color-nebula) md:block"
          >
            &#8594;
          </button>
        </div>
      </section>

      {pending && (
        <MemoryGame
          personName="？？？"
          itemId={pending.id}
          level={pending.level}
          cells={MEMORY_CELLS}
          onReveal={reveal}
          onClose={() => setPending(null)}
          onUnlockAll={unlockAll}
        />
      )}

      <ReturnToSystem />
      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
