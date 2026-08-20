import { COUNTRIES, PEOPLE, PROFILE, SPORTS, WORLD_INTRO } from "@/lib/data";
import ShootingGameGate from "@/components/ShootingGameGate";
import CosmosHome from "@/components/CosmosHome";

/** 流れ星として夜空を横切る実写。旅の写真を主役にする */
const SKY_PHOTOS = [
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
