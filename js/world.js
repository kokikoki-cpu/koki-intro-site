document.addEventListener("DOMContentLoaded", () => {
  const leadEl = document.getElementById("world-lead");
  if (leadEl) {
    leadEl.textContent = `${WORLD_INTRO.lead}（${WORLD_INTRO.sub}）`;
  }

  const pinsWrap = document.getElementById("map-pins");
  const modal = createModal();

  COUNTRIES.forEach((country) => {
    const pin = document.createElement("button");
    pin.className = "pin";
    pin.style.left = `${country.x}%`;
    pin.style.top = `${country.y}%`;
    pin.setAttribute("aria-label", country.name);
    pin.innerHTML = `
      <span class="pin__label">${country.name}</span>
      <span class="pin__dot"></span>
    `;
    pin.addEventListener("click", () => {
      modal.open({
        photo: country.photo,
        tagline: country.tagline,
        title: country.name,
        body: country.story,
      });
    });
    pinsWrap.appendChild(pin);
  });
});
