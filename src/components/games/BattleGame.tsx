"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import type { GamePhase } from "./three-kit";
import type { Battle, BattleCommand, Level } from "@/lib/data";
import { preloadSfx, sfx } from "@/lib/sfx";

/**
 * 国を解錠するエンカウントバトル（FFのATBの骨格を借りたもの）。
 *
 * Three.js を使っていないのは意図的:
 * この画面の主役は「実写の写真」と「明朝の文字」で、立体である必要がどこにもない。
 * DOM+CSS なら文字が滲まず、スマホでも軽い（MemoryGame / SprintGame と同じ判断）。
 *
 * ATB から借りた骨格:
 *  1. 時間は常に流れている（待っている間に敵が殴ってくる）
 *  2. ゲージが満ちて初めてコマンドが開く = 「あと少しで動ける」が見える
 *  3. 選ぶとゲージが空になる = 一手の重さが出る
 *
 * 覚えゲーにしないための2層:
 *  - 相手ごとに「効く一手」がある（＝発見の快感）。それは data.ts の kind:"weak" で、
 *    **その国で清水さんが実際にやったこと**になっている
 *  - 敵は攻撃前に予告を出す。その間だけ kind:"guard" が有効（＝反応の緊張）。
 *    予告中に攻撃コマンドを選ぶと倍のダメージを食らうので、殴り続けるだけでは勝てない
 *
 * スマホで指が邪魔にならない理由: 触るのは画面下のコマンド枠だけで、
 * 戦っている絵は指より上にある（DESIGN.md「指と被る問題」の解決策②）。
 */

/** 難易度。敵のHPと殴る間隔、予告の長さ、ゲージの速さが変わる */
function tuning(level: Level) {
  const t = (level - 1) / 4; // 0（易）〜 1（難）
  const mix = (easy: number, hard: number) => Math.round(easy + (hard - easy) * t);
  return {
    enemyHp: mix(58, 124),
    playerHp: 100,
    /** ゲージが満ちるまで */
    atbMs: mix(1500, 2500),
    /** 敵が殴ってくる間隔 */
    enemyIntervalMs: mix(3400, 1900),
    /** 予告が出てから殴られるまで（短いほど反応が難しい） */
    telegraphMs: mix(1400, 750),
    enemyDamage: mix(11, 21),
  };
}

const DAMAGE = { weak: 22, normal: 8, guard: 0 } as const;
const TICK_MS = 50;

type Floater = { id: number; text: string; tone: "hit" | "hurt" | "guard" };

export default function BattleGame({
  countryName,
  itemId,
  level,
  battle,
  bgPhoto,
  playerPhoto,
  enemyPhoto,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  countryName: string;
  /** 解錠キー。初回クリア率の表示に使う */
  itemId: string;
  level: Level;
  battle: Battle;
  /** 背景に敷くその国の写真 */
  bgPhoto: string;
  /** 自分（立ち姿） */
  playerPhoto: string;
  /** 相手の面。その国の記憶の写真を丸く抜いて使う */
  enemyPhoto: string;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const cfg = tuning(level);

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [enemyHp, setEnemyHp] = useState(cfg.enemyHp);
  const [playerHp, setPlayerHp] = useState(cfg.playerHp);
  const [atb, setAtb] = useState(0);
  const [open, setOpen] = useState(false);
  const [telegraph, setTelegraph] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("");

  /* ロジックは ref で持つ。state だけで回すと setInterval が古い値を見る */
  const openRef = useRef(false);
  const telegraphRef = useRef(false);
  const guardedRef = useRef(false);
  const atbRef = useRef(0);
  const nextAttackRef = useRef(0);
  const enemyHpRef = useRef(cfg.enemyHp);
  const playerHpRef = useRef(cfg.playerHp);
  const floaterId = useRef(0);
  const timer = useRef<number | null>(null);
  /* GameShell が要求する参照。このゲームは 3D を使わないので中身は使わない */
  const mountRef = useRef<HTMLDivElement>(null);

  /* 音はここ1箇所で鳴らす。ダメージ表示と音は必ず同時に出るべきものなので、
     別々の場所に書くと片方だけ鳴る/出ないというズレが生まれる */
  const pop = useCallback((text: string, tone: Floater["tone"]) => {
    if (tone === "hit") sfx("hit");
    else if (tone === "hurt") sfx("damage");
    const id = ++floaterId.current;
    setFloaters((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 900);
  }, []);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    enemyHpRef.current = cfg.enemyHp;
    playerHpRef.current = cfg.playerHp;
    atbRef.current = 0;
    openRef.current = false;
    telegraphRef.current = false;
    guardedRef.current = false;
    nextAttackRef.current = Date.now() + cfg.enemyIntervalMs;
    setEnemyHp(cfg.enemyHp);
    setPlayerHp(cfg.playerHp);
    setAtb(0);
    setOpen(false);
    setTelegraph(false);
    setMessage("");
    setPhase("playing");

    timer.current = window.setInterval(() => {
      const now = Date.now();

      /* ① ゲージ。開いている間は止める（選ぶ時間を奪わない） */
      if (!openRef.current) {
        atbRef.current = Math.min(1, atbRef.current + TICK_MS / cfg.atbMs);
        setAtb(atbRef.current);
        if (atbRef.current >= 1) {
          openRef.current = true;
          setOpen(true);
        }
      }

      /* ② 予告 */
      const toAttack = nextAttackRef.current - now;
      if (toAttack <= cfg.telegraphMs && !telegraphRef.current) {
        telegraphRef.current = true;
        setTelegraph(true);
      }

      /* ③ 敵の攻撃 */
      if (toAttack <= 0) {
        if (guardedRef.current) {
          pop("受けた", "guard");
          setMessage("受けきった");
        } else {
          playerHpRef.current = Math.max(0, playerHpRef.current - cfg.enemyDamage);
          setPlayerHp(playerHpRef.current);
          pop(`-${cfg.enemyDamage}`, "hurt");
          setShake(true);
          window.setTimeout(() => setShake(false), 340);
        }
        guardedRef.current = false;
        telegraphRef.current = false;
        setTelegraph(false);
        nextAttackRef.current = now + cfg.enemyIntervalMs;

        if (playerHpRef.current <= 0) {
          stop();
          setPhase("lost");
        }
      }
    }, TICK_MS);
  }, [cfg.atbMs, cfg.enemyDamage, cfg.enemyHp, cfg.enemyIntervalMs, cfg.playerHp, cfg.telegraphMs, pop, stop]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    preloadSfx();
  }, []);

  /* useCallback で包むのは lint 対策も兼ねている: コンポーネント本体に直接書くと
     中の Date.now() が「レンダー中の不純な呼び出し」として弾かれる（実際はイベント処理）。 */
  const choose = useCallback((cmd: BattleCommand) => {
    if (!openRef.current || phase !== "playing") return;

    if (cmd.kind === "guard") {
      if (telegraphRef.current) {
        guardedRef.current = true;
        setMessage("構えた");
        /* 読み切ったご褒美に、次の一手をすぐ撃たせる */
        atbRef.current = 0.7;
      } else {
        setMessage("空を切った");
        atbRef.current = 0;
      }
    } else {
      /* 予告中に殴りにいくと倍もらう。だから「殴り続ける」だけでは勝てない */
      const risky = telegraphRef.current;
      const dmg = DAMAGE[cmd.kind];
      enemyHpRef.current = Math.max(0, enemyHpRef.current - dmg);
      setEnemyHp(enemyHpRef.current);
      pop(`-${dmg}`, "hit");
      setMessage(cmd.kind === "weak" ? "効いた" : "浅い");
      if (risky) {
        playerHpRef.current = Math.max(0, playerHpRef.current - cfg.enemyDamage);
        setPlayerHp(playerHpRef.current);
        pop(`-${cfg.enemyDamage}`, "hurt");
        setShake(true);
        window.setTimeout(() => setShake(false), 340);
        guardedRef.current = false;
        telegraphRef.current = false;
        setTelegraph(false);
        nextAttackRef.current = Date.now() + cfg.enemyIntervalMs;
      }
      atbRef.current = 0;
    }

    openRef.current = false;
    setOpen(false);
    setAtb(atbRef.current);

    if (enemyHpRef.current <= 0) {
      stop();
      setMessage(battle.finish);
      setPhase("won");
    } else if (playerHpRef.current <= 0) {
      stop();
      setPhase("lost");
    }
  }, [battle.finish, cfg.enemyDamage, cfg.enemyIntervalMs, phase, pop, stop]);

  return (
    <GameShell
      title={`${battle.enemy}と対峙`}
      target={countryName}
      rule={
        <>
          ゲージが満ちたら一手選べる。この相手に効く一手はひとつだけ。
          <br />
          「{battle.telegraph}」が出ている間は受けに回れ。殴りにいくと倍もらう。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>{battle.enemy}</span>
          <span>体力 {playerHp}</span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className={`battle ${shake ? "battle--shake" : ""}`}>
          {/* 背景はその国の実写。夜空に馴染ませるため暗いスクリムを重ねる */}
          {/* 先読みする。ゲームは押した瞬間に開くので、遅延読み込みだと
              最初の数秒が黒い画面になる（この画面が出るまで一度も要求されないので、
              初期表示を重くする心配はない） */}
          <Image src={bgPhoto} alt="" fill sizes="620px" className="battle__bg" priority />
          <div className="battle__scrim" />

          {/* 相手 */}
          <div className="battle__enemy">
            <div className={`battle__face ${telegraph ? "battle__face--tell" : ""}`}>
              <Image src={enemyPhoto} alt="" fill sizes="160px" loading="eager" className="object-cover" />
            </div>
            <p className="battle__name font-display">{battle.enemy}</p>
            <div className="battle__bar">
              <span style={{ width: `${(enemyHp / cfg.enemyHp) * 100}%` }} />
            </div>
            {telegraph && <p className="battle__tell font-display">{battle.telegraph}</p>}
          </div>

          {/* 自分。立ち姿を枠付きの札にして置く（切り抜かないので粗が出ない） */}
          <div className="battle__me">
            <Image src={playerPhoto} alt="" fill sizes="150px" loading="eager" className="object-cover" />
          </div>

          {/* ダメージ数字 */}
          <div className="battle__floaters" aria-hidden>
            {floaters.map((f) => (
              <span key={f.id} className={`battle__pop battle__pop--${f.tone} font-display`}>
                {f.text}
              </span>
            ))}
          </div>

          {/* 下部のコマンド枠。スマホで触るのはここだけ */}
          <div className="battle__panel">
            {message && <p className="battle__msg font-display">{message}</p>}
            <div className="battle__atb" aria-label="次の一手までのゲージ">
              <span style={{ width: `${atb * 100}%` }} />
            </div>
            <div className="battle__cmds">
              {battle.commands.map((c) => (
                <button
                  key={c.label}
                  onClick={() => choose(c)}
                  disabled={!open || phase !== "playing"}
                  className="battle__cmd font-display"
                  data-track={`battle-cmd-${countryName}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
      onStart={start}
      onRetry={start}
      onClose={() => {
        stop();
        onClose();
      }}
      onReveal={onReveal}
      onUnlockAll={onUnlockAll}
    />
  );
}
