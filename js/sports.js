document.addEventListener("DOMContentLoaded", () => {
  const leadEl = document.getElementById("sports-lead");
  if (leadEl) leadEl.textContent = SPORTS_INTRO.lead;

  const grid = document.getElementById("sports-grid");
  const modal = createModal();

  SPORTS.forEach((sport, i) => {
    const card = document.createElement("article");
    card.className = "sport-card reveal";
    card.style.setProperty("--i", i);
    card.innerHTML = `
      <img class="sport-card__img" src="${sport.photo}" alt="${sport.name}">
      <p class="sport-card__label">${sport.name}</p>
    `;
    card.addEventListener("click", () => {
      modal.open({
        photo: sport.photo,
        title: sport.name,
        body: sport.desc,
      });
    });
    grid.appendChild(card);
  });

  initReveal();
});
