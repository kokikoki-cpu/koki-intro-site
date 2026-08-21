export type Hobby = { label: string; href?: string };

export const PROFILE = {
  name: "清水航樹",
  englishName: "KOKI SHIMIZU",
  tagline: "旅。野生。世界。",
  meta: "30歳 / 1996.02.06生まれ / A型 / 水瓶座",
  photo: "/images/profile/pyramid.jpg",
  hobbies: [
    { label: "世界一周記YouTube", href: "https://www.youtube.com/@koookiblog" },
    { label: "映画鑑賞", href: "https://filmarks.com/users/25852744" },
    { label: "早起き" },
  ] as Hobby[],
  strengths: [
    {
      key: "action",
      title: "行動力",
      desc: "知らない場所へ行くこと",
      link: "/world",
      linkLabel: "世界地図を見る",
    },
    {
      key: "curiosity",
      title: "好奇心",
      desc: "知らない人に話しかけること",
      link: "/people",
      linkLabel: "人図鑑を見る",
    },
    {
      key: "body",
      title: "体力",
      desc: "身体能力",
      link: "/sports",
      linkLabel: "スポーツを見る",
    },
  ],
};

/** ゲームの難易度（1=やさしい 〜 5=最難関）。項目ごとに変える */
export type Level = 1 | 2 | 3 | 4 | 5;

/** どのゲームでその国を解錠するか。地図の9カ国が全部フライトで「飽きた」ため分けた */
export type CountryGame = "battle" | "balloon" | "iceflow" | "flight";

/**
 * バトルのコマンド。
 * - `weak`  … その相手に効く一手。**実際に清水さんがその国でやったこと**を当てる
 * - `normal`… 通る。ダメージは小さい
 * - `guard` … 受け。敵の予告が出ている間に選ぶと無効化できる（他の時に選ぶと無駄）
 */
export type BattleCommand = { label: string; kind: "weak" | "normal" | "guard" };

export type Battle = {
  /** 相手。story に書かれている実際の出来事から取る（作り話を足さない） */
  enemy: string;
  /** 攻撃の予告に出す一言 */
  telegraph: string;
  /** 決着の一言 */
  finish: string;
  commands: [BattleCommand, BattleCommand, BattleCommand];
};

export type Country = {
  id: string;
  level: Level;
  name: string;
  tagline: string;
  story: string;
  photo: string;
  x: number;
  y: number;
  game: CountryGame;
  /** game が "battle" のときだけ持つ */
  battle?: Battle;
};

/* x/y は /images/world-map.svg (Wikimedia Commons "BlankMap-World-Equirectangular",
   パブリックドメイン) 上の各国パス(id=ISOコード)の中心を実測した % 座標 */
export const COUNTRIES: Country[] = [
  {
    id: "argentina",
    level: 2,
    name: "アルゼンチン",
    tagline: "みんな大好きメッシとパタゴニアの国",
    story:
      "アルゼンチンにてブラジルのユニフォームを着たところ、タトゥー軍団に追いかけられる。",
    photo: "/images/countries/argentina.jpg",
    x: 28.48,
    y: 68.76,
    game: "battle",
    battle: {
      enemy: "タトゥー軍団",
      telegraph: "取り囲まれる",
      finish: "ユニフォームは脱げばただの旅人",
      commands: [
        { label: "脱ぐ", kind: "weak" },
        { label: "走る", kind: "normal" },
        { label: "謝る", kind: "guard" },
      ],
    },
  },
  {
    id: "brazil",
    level: 3,
    name: "ブラジル",
    tagline: "最強のサッカー王国",
    story:
      "地球の裏側なのに巨大な日本人街がある。地球の裏側でわざわざ食べる松屋こそ贅沢of贅沢。",
    photo: "/images/countries/brazil.jpg",
    x: 31.05,
    y: 56.57,
    game: "battle",
    battle: {
      enemy: "地球の裏側のホームシック",
      telegraph: "郷愁が押し寄せる",
      finish: "裏側で食う松屋は贅沢of贅沢",
      commands: [
        { label: "松屋を食う", kind: "weak" },
        { label: "歩く", kind: "normal" },
        { label: "深呼吸", kind: "guard" },
      ],
    },
  },
  {
    id: "peru",
    level: 1,
    name: "ペルー",
    tagline: "食と密林の国",
    story:
      "アマゾンの秘境にてペルーとブラジルでしか合法摂取を許されてないありがたい樹液をいただく。三日三晩嘔吐と下痢と幻覚に苦しむ。",
    photo: "/images/countries/peru.jpg",
    x: 25.32,
    y: 54.03,
    game: "battle",
    battle: {
      enemy: "樹液の幻覚",
      telegraph: "幻が濃くなる",
      finish: "三日三晩、耐えきった",
      commands: [
        { label: "耐える", kind: "weak" },
        { label: "吐く", kind: "normal" },
        { label: "目を閉じる", kind: "guard" },
      ],
    },
  },
  {
    id: "antarctica",
    level: 5,
    name: "南極",
    tagline: "世界で最も建造物が少ない土地。自然なままの土地",
    story: "ペンギンはかわいいけど臭いことが発覚。",
    photo: "/images/countries/antarctica.jpg",
    x: 48.93,
    y: 84.35,
    game: "iceflow",
  },
  {
    id: "india",
    level: 2,
    name: "インド",
    tagline: "人間の森",
    story:
      "手軽に刺激を味わいたいならインド一択。ただ街を歩いているだけで、自分の常識が崩れるありがたい場所。",
    photo: "/images/countries/india.jpg",
    x: 69.14,
    y: 38.75,
    game: "battle",
    battle: {
      enemy: "人間の森",
      telegraph: "人波が来る",
      finish: "常識が崩れる音がした",
      commands: [
        { label: "流れに乗る", kind: "weak" },
        { label: "値切る", kind: "normal" },
        { label: "立ち止まる", kind: "guard" },
      ],
    },
  },
  {
    id: "jordan",
    level: 3,
    name: "ヨルダン",
    tagline: "イスラム圏no.1満足度",
    story:
      "地政学的にとっても行きづらい場所。敬遠されがちだが、治安は良くて見どころたっぷり！泊まったドミトリーでお気に入りのサンダルをパクられたのでマイナス1点。",
    photo: "/images/countries/jordan.jpg",
    x: 56.46,
    y: 33.62,
    game: "flight",
    battle: {
      enemy: "サンダル泥棒",
      telegraph: "足音が近づく",
      finish: "サンダルは戻らなかった",
      commands: [
        { label: "追う", kind: "weak" },
        { label: "叫ぶ", kind: "normal" },
        { label: "抱える", kind: "guard" },
      ],
    },
  },
  {
    id: "turkey",
    level: 1,
    name: "トルコ",
    tagline: "気球インスタ映えスポット",
    story: "何も考えずに一生に一度はカッパドキアで気球に乗りに行くべし。",
    photo: "/images/countries/turkey.jpg",
    x: 55.99,
    y: 29.76,
    game: "balloon",
  },
  {
    id: "kenya",
    level: 4,
    name: "ケニア",
    tagline: "マサイの国の戦士たち",
    story: "物乞いに半日付きまとわれて結果仲良くなる。別れ際に1000円あげた。",
    photo: "/images/countries/kenya.jpg",
    x: 56.68,
    y: 49.41,
    game: "battle",
    battle: {
      enemy: "半日ついてくる物乞い",
      telegraph: "距離を詰めてくる",
      finish: "別れ際に千円あげた",
      commands: [
        { label: "仲良くなる", kind: "weak" },
        { label: "無視する", kind: "normal" },
        { label: "財布を守る", kind: "guard" },
      ],
    },
  },
  {
    id: "namibia",
    level: 4,
    name: "ナミビア",
    tagline: "砂漠と動物の国",
    story:
      "1週間ロードトリップ中に誤って車の後ろを開けたまま就寝。食料を猿にすべて没収され、アフリカにて強制ラマダン開始。",
    photo: "/images/countries/namibia.jpg",
    x: 51.29,
    y: 60.97,
    game: "flight",
    battle: {
      enemy: "猿の群れ",
      telegraph: "荷台を狙ってくる",
      finish: "アフリカで強制ラマダン開始",
      commands: [
        { label: "諦める", kind: "weak" },
        { label: "追い払う", kind: "normal" },
        { label: "荷台を閉める", kind: "guard" },
      ],
    },
  },
];

export const WORLD_MAP_ASPECT = 2752.766 / 1537.631;

export const WORLD_INTRO = {
  visited: 40,
  lead: "訪れた国は40カ国。知らない場所を歩くと子どものように、360度すべてが新鮮",
  sub: "体感寿命を伸ばすコツ",
};

export type Person = {
  id: string;
  level: Level;
  no: string;
  name: string;
  place: string;
  photo: string;
  isSelf?: boolean;
  career?: string[];
  goals?: string[];
  story?: string;
};

export const PEOPLE: Person[] = [
  {
    id: "p1",
    level: 5,
    no: "No.1",
    name: "清水航樹",
    place: "日本",
    photo: "/images/profile/koki.jpg",
    isSelf: true,
    career: [
      "日本大学 体育学科",
      "東京消防庁 府中消防署 朝日出張所 特別消火中隊2番隊員",
      "株式会社セルミュラー",
      "旅人",
      "株式会社Beyond（インバウンドマーケ）",
      "株式会社セルミュラー",
    ],
    goals: ["良き出会いと強い繋がりを作る", "旅人を助けるためのサービスを作りたい"],
  },
  {
    id: "p2",
    level: 2,
    no: "No.2",
    name: "宿のオーナー",
    place: "スリランカ",
    photo: "/images/people/p2-srilanka.jpg",
    story:
      "宿のオーナー。サファリツアーが何故か男性だけ高い料金にて設定。他の日本人女性を連れてきたところ、大幅ディスカウント。下心は人を動かすのだ。",
  },
  {
    id: "p3",
    level: 3,
    no: "No.3",
    name: "インドのおばちゃん",
    place: "インド",
    photo: "/images/people/p3-india.jpg",
    story:
      "インド料理店にて隣のインド人女性に好かれる。写真撮影者はおそらく彼女の子ども。",
  },
  {
    id: "p4",
    level: 4,
    no: "No.4",
    name: "アフリカの詐欺師",
    place: "エチオピア",
    photo: "/images/people/p4-ethiopia.jpg",
    story:
      "詐欺師。謎の寺院に案内されて、その後入場料1万円を請求される。お金ないから逃げた。",
  },
];

/**
 * どのゲームでその競技を解錠するか。
 * 6競技すべてが同じ「連打で走る」だと飽きる、という指摘への対応。
 * - `sprint` … 連打で走る＋ハードルを跳ぶ（既存）
 * - `pairs`  … 神経衰弱。同じ写真を2枚めくって揃える
 * - `flags`  … 赤上げて白上げて。言われた通りの旗だけ上げる（引っかけ入り）
 */
export type SportGame = "sprint" | "pairs" | "flags";

export type Sport = {
  id: string;
  level: Level;
  name: string;
  photo: string;
  desc: string;
  game: SportGame;
};

export const SPORTS: Sport[] = [
  {
    id: "tennis",
    level: 1,
    name: "公式テニス",
    photo: "/images/sports/tennis.jpg",
    desc: "中学校・高校にてハマる。今でも定期的にやります。",
    game: "flags",
  },
  {
    id: "ultimate",
    level: 2,
    name: "アルティメット",
    photo: "/images/sports/ultimate.jpg",
    desc: "大学にて始める。インカレ3位。",
    game: "pairs",
  },
  {
    id: "padel",
    level: 3,
    name: "パデル",
    photo: "/images/sports/padel.jpg",
    desc: "当時のクライアントに誘われてハマる。「Fire padel TV」というYouTubeチャンネルを作る。今もたまに試合に出る。",
    game: "flags",
  },
  {
    id: "futsal",
    level: 3,
    name: "フットサル",
    photo: "/images/sports/futsal.jpg",
    desc: "渋谷でたまにやります！サッカーを知っていると世界中の男と仲良くなりやすい。",
    game: "sprint",
  },
  {
    id: "tabletennis",
    level: 4,
    name: "卓球",
    photo: "/images/sports/tabletennis.jpg",
    desc: "すべてのスポーツの中で一番好き。高校時代にハマりすぎてスポッチャで徹夜卓球をする。",
    game: "flags",
  },
  {
    id: "marathon",
    level: 5,
    name: "マラソン",
    photo: "/images/sports/marathon.jpg",
    desc: "妻の趣味に付き合う。ハーフマラソンとトレランの大会には何回か出た。今年の目標はフルマラソン制覇。",
    game: "sprint",
  },
];

export const SPORTS_INTRO = {
  lead: "物心ついたときから大好きなスポーツ。スポーツをやっているときが一番集中力が上がります。毎日1hのなにかしらの運動が日課。",
};
