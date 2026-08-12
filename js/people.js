document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("people-track");
  const modal = createModal();
  const modalEl = document.querySelector(".modal");

  PEOPLE.forEach((person) => {
    const card = document.createElement("article");
    card.className = "person-card";
    const excerpt = person.isSelf
      ? person.goals[0]
      : person.story;
    card.innerHTML = `
      <img class="person-card__photo" src="${person.photo}" alt="${person.name}">
      <div class="person-card__body">
        <h3 class="person-card__name">${person.name}</h3>
        <p class="person-card__place">出現場所: ${person.place}</p>
        <p class="person-card__excerpt">${excerpt}</p>
      </div>
    `;
    card.addEventListener("click", () => openPersonDetail(person));
    track.appendChild(card);
  });

  function openPersonDetail(person) {
    if (person.isSelf) {
      modal.open({
        photo: person.photo,
        tagline: `出現場所: ${person.place}`,
        title: person.name,
        body: "",
      });
      const textEl = modalEl.querySelector(".modal__text");
      textEl.innerHTML = `
        <ul class="career-list">
          ${person.career.map((step) => `<li>${step}</li>`).join("")}
        </ul>
        <p class="goals-title">今後の目標</p>
        <ul class="goals-list">
          ${person.goals.map((g) => `<li>${g}</li>`).join("")}
        </ul>
      `;
    } else {
      modal.open({
        photo: person.photo,
        tagline: `出現場所: ${person.place}`,
        title: person.name,
        body: person.story,
      });
    }
  }

  const prevBtn = document.querySelector(".slider__arrow--prev");
  const nextBtn = document.querySelector(".slider__arrow--next");
  const scrollByCard = (dir) => {
    const card = track.querySelector(".person-card");
    const gap = 22;
    const distance = card ? card.offsetWidth + gap : 300;
    track.scrollBy({ left: dir * distance, behavior: "smooth" });
  };
  prevBtn.addEventListener("click", () => scrollByCard(-1));
  nextBtn.addEventListener("click", () => scrollByCard(1));
});
