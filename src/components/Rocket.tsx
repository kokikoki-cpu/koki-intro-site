/** レトロなブリキのロケット（ピンク塗装 × 金属地 × 金の帯）。移動の演出で使い回す */
export default function Rocket({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.24} viewBox="0 0 44 56" aria-hidden>
      {/* 噴射 */}
      <path className="ship__flame" d="M22 47 L16 56 L22 51 L28 56 Z" fill="#ffcf8a" />
      <path className="ship__flame" d="M22 47 L19 53 L22 50 L25 53 Z" fill="#fffdf8" />

      {/* 尾翼 */}
      <path d="M12 32 L3 46 L7 48 L14 41 Z" fill="#c73f7d" stroke="#3a2030" strokeWidth="1.4" />
      <path d="M32 32 L41 46 L37 48 L30 41 Z" fill="#c73f7d" stroke="#3a2030" strokeWidth="1.4" />

      {/* 胴体（金属地） */}
      <path
        d="M22 2 C29 9 33 18 33 27 L33 41 L11 41 L11 27 C11 18 15 9 22 2 Z"
        fill="#d9d5cd"
        stroke="#3a2030"
        strokeWidth="1.6"
      />
      {/* 上半分はピンク塗装 */}
      <path
        d="M22 2 C29 9 33 18 33 26 L11 26 C11 18 15 9 22 2 Z"
        fill="#d1497f"
        stroke="#3a2030"
        strokeWidth="1.6"
      />
      <path d="M12 26 L32 26" stroke="#e0a94a" strokeWidth="2.2" />

      {/* 丸窓 */}
      <circle cx="22" cy="20" r="5" fill="#eef1ee" stroke="#c73f7d" strokeWidth="1.6" />
      <circle cx="22" cy="33" r="5" fill="#eef1ee" stroke="#c73f7d" strokeWidth="1.6" />

      {/* 側面のブースター */}
      <rect x="6" y="30" width="5" height="11" rx="2.4" fill="#b9b5ad" stroke="#3a2030" strokeWidth="1.2" />
      <rect x="33" y="30" width="5" height="11" rx="2.4" fill="#b9b5ad" stroke="#3a2030" strokeWidth="1.2" />

      {/* 脚 */}
      <path d="M15 41 L13 46" stroke="#3a2030" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 41 L31 46" stroke="#3a2030" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
