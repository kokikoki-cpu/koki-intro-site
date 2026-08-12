/* ==========================================================================
   共通スクリプト: ナビ開閉 / スクロールフェードイン / モーダル制御
   ========================================================================== */

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    nav.classList.toggle("is-open");
  });
}

function initReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* シンプルなモーダル制御。呼び出し側は
   openModal({ photo, tagline, title, body }) の形で使う */
function createModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal__close" aria-label="閉じる">&times;</button>
      <img class="modal__photo" alt="" />
      <div class="modal__body">
        <p class="modal__tagline"></p>
        <h3 class="modal__title"></h3>
        <div class="modal__text"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector(".modal__close");
  const close = () => overlay.classList.remove("is-open");
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return {
    open({ photo, tagline, title, body }) {
      overlay.querySelector(".modal__photo").src = photo || "";
      overlay.querySelector(".modal__photo").alt = title || "";
      overlay.querySelector(".modal__tagline").textContent = tagline || "";
      overlay.querySelector(".modal__title").textContent = title || "";
      overlay.querySelector(".modal__text").textContent = body || "";
      overlay.classList.add("is-open");
    },
    close,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initReveal();
});
