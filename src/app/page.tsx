import { COUNTRIES, PEOPLE, PROFILE, SPORTS, WORLD_INTRO } from "@/lib/data";
import ShootingGameGate from "@/components/ShootingGameGate";
import CosmosHome from "@/components/CosmosHome";

/**
 * 流星に流す写真。**もらった素材を全部使う**。
 * 流星は8本しかないので、1本が一周するたびに次の写真へ送る（CosmosHome 側）。
 * こうすると眺めているうちにプール全部が空を通る。
 */
const SKY_PHOTOS = [
  PROFILE.photo,
  "/images/profile/koki-stand.jpg",
  ...COUNTRIES.map((c) => c.photo),
  ...SPORTS.map((s) => s.photo),
  /* バトルの背景用に取り込んだ分。国が確定していない写真もここで使う */
  "/images/battle/africa-1.jpg",
  "/images/battle/africa-mideast.jpg",
  "/images/battle/africa-samerica.jpg",
  "/images/battle/africa-samerica-2.jpg",
  "/images/battle/hot-country.jpg",
  "/images/battle/sea-country.jpg",
  "/images/battle/peru-piranha.jpg",
  "/images/battle/argentina-patagonia.jpg",
  "/images/battle/brazil-2.jpg",
  "/images/battle/india-2.jpg",
  "/images/battle/antarctica-2.jpg",
  "/images/battle/india.jpg",
  "/images/battle/turkey.jpg",
  "/images/battle/jordan.jpg",
];

export default function Home() {
  const self = PEOPLE.find((p) => p.isSelf)!;

  return (
    <>
      <ShootingGameGate />

      <CosmosHome
        name={PROFILE.name}
        sunPhoto={self.photo}
        photos={SKY_PHOTOS}
        strengths={PROFILE.strengths}
        career={self.career!}
        hobbies={PROFILE.hobbies}
        visited={WORLD_INTRO.visited}
      />
    </>
  );
}
