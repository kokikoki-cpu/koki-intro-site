document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("hero-photo").src = PROFILE.photo;
  document.getElementById("hero-photo").alt = PROFILE.name;
  document.getElementById("hero-photo-caption").textContent = PROFILE.photoCaption || "";
  document.getElementById("hero-name").textContent = PROFILE.name;
  document.getElementById("hero-tagline").textContent = PROFILE.tagline || "";
  document.getElementById("hero-meta").textContent = PROFILE.meta;

  const self = PEOPLE.find((p) => p.isSelf);
  const careerList = document.getElementById("home-career");
  if (self && careerList) {
    careerList.innerHTML = self.career.map((step) => `<li>${step}</li>`).join("");
  }

  const hobbiesWrap = document.getElementById("home-hobbies");
  if (hobbiesWrap && PROFILE.hobbies) {
    hobbiesWrap.innerHTML = PROFILE.hobbies
      .map((h) => `<span class="tag">${h}</span>`)
      .join("");
  }

  initEgyptParallax();
});

function initEgyptParallax() {
  const bg = document.getElementById("egyptBg");
  const hero = document.querySelector(".hero");
  if (!bg || !hero) return;
  if (window.matchMedia("(hover: none)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layers = [...bg.querySelectorAll(".egypt-layer")];

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.depth) || 0.05;
      const moveX = relX * depth * 220;
      const moveY = relY * depth * 220;
      layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  });

  hero.addEventListener("mouseleave", () => {
    layers.forEach((layer) => {
      layer.style.transform = "";
    });
  });
}
