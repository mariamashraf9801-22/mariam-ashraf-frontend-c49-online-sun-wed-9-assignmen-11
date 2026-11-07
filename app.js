const NASA_KEY = "bU7WaOFtMVnWeJGvbySkFHQt5WestD49c69xOgQa";
const APOD_URL = "https://api.nasa.gov/planetary/apod";
const PLANETS_URL = "https://solar-system-opendata-proxy.vercel.app/api/planets";
const LAUNCHES_URL = "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/";

let planetsData = [];
let launchesData = [];

async function loadApod(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let target = date;
  const isToday = !date;
  if (isToday) target = fmt(new Date());

  let data = null;
  let usedDate = target;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(`${APOD_URL}?api_key=${NASA_KEY}&date=${usedDate}`);
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch (e) {}
    if (!isToday) break;
    const d = new Date(usedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    usedDate = fmt(d);
  }

  if (!data) {
    try {
      const url = date ? `${APOD_URL}?api_key=${NASA_KEY}&date=${date}` : `${APOD_URL}?api_key=${NASA_KEY}`;
      const res = await fetch(url);
      if (res.ok) data = await res.json();
    } catch (e) {}
  }

  if (!data) {
    console.error("Error fetching APOD");
    document.getElementById("apod-loading").innerHTML = `<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i><p class="text-slate-400">Failed to load today's image</p><p class="text-slate-500 text-sm mt-2">Please try again later</p>`;
    return;
  }

  if (isToday) {
    const input = document.getElementById("apod-date-input");
    if (input) input.value = usedDate;
    const wrapper = input ? input.closest(".date-input-wrapper") : null;
    if (wrapper) {
      const d = new Date(usedDate + "T00:00:00");
      wrapper.setAttribute("data-date", d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
    }
  }

  try {
    const container = document.getElementById("apod-image-container");
    const loading = document.getElementById("apod-loading");
    const img = document.getElementById("apod-image");
    loading.classList.remove("hidden");
    img.classList.add("hidden");
    img.src = "";
    const overlay = container.querySelector(".absolute.inset-0");
    if (overlay && overlay !== loading) overlay.remove();

    const formatted = new Date(data.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("apod-date").textContent = `Astronomy Picture of the Day - ${formatted}`;
    document.getElementById("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${formatted}`;
    document.getElementById("apod-date-info").textContent = formatted;
    document.getElementById("apod-title").textContent = data.title;
    document.getElementById("apod-explanation").textContent = data.explanation;

    const copyright = document.getElementById("apod-copyright");
    if (data.copyright) {
      copyright.innerHTML = `<i class="fas fa-copyright mr-1"></i>Copyright: ${data.copyright.trim()}`;
      copyright.classList.remove("hidden");
    } else {
      copyright.classList.add("hidden");
    }
    document.getElementById("apod-media-type").textContent = data.media_type === "image" ? "Image" : "Video";

    if (data.media_type === "image") {
      img.src = data.url;
      img.alt = data.title;
      img.onload = () => {
        loading.classList.add("hidden");
        img.classList.remove("hidden");
      };
      img.onerror = () => {
        loading.innerHTML = `<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i><p class="text-slate-400">Failed to load image</p>`;
      };
      const wrap = document.createElement("div");
      wrap.className = "absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity";
      wrap.innerHTML = `<div class="absolute bottom-6 left-6 right-6"><a href="${data.hdurl || data.url}" target="_blank" class="block w-full py-3 bg-white/10 backdrop-blur-md rounded-lg font-semibold hover:bg-white/20 transition-colors text-center"><i class="fas fa-expand mr-2"></i>View Full Resolution</a></div>`;
      container.appendChild(wrap);
    } else if (data.media_type === "video") {
      loading.classList.add("hidden");
      container.innerHTML = `<iframe src="${data.url}" class="w-full h-full" frameborder="0" allowfullscreen></iframe>`;
    }
  } catch (err) {
    console.error("Error fetching APOD:", err);
    document.getElementById("apod-loading").innerHTML = `<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i><p class="text-slate-400">Failed to load today's image</p><p class="text-slate-500 text-sm mt-2">Please try again later</p>`;
  }
}

async function loadPlanets() {
  try {
    const res = await fetch(PLANETS_URL);
    const json = await res.json();
    planetsData = json.bodies.filter((b) => b.isPlanet === true);
    renderPlanetsGrid();
    renderComparison();
    const earth = planetsData.find((p) => p.englishName.toLowerCase() === "earth");
    if (earth) showPlanet(earth);
  } catch (err) {
    console.error("Error fetching planets:", err);
    const grid = document.getElementById("planets-grid");
    if (grid) {
      grid.innerHTML = `<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-4"></i><p class="text-slate-400">Failed to load planets data. Please try again later.</p></div>`;
    }
  }
}

async function loadLaunches() {
  try {
    const res = await fetch(`${LAUNCHES_URL}?limit=10`);
    const json = await res.json();
    launchesData = json.results;
    const count = document.getElementById("launches-count");
    const mobile = document.getElementById("launches-count-mobile");
    if (count) count.textContent = `${launchesData.length} Launches`;
    if (mobile) mobile.textContent = `${launchesData.length}`;
    renderFeatured();
    renderLaunchesGrid();
  } catch (err) {
    console.error("Error fetching launches:", err);
    const featured = document.getElementById("featured-launch");
    const grid = document.getElementById("launches-grid");
    const msg = `<div class="col-span-full text-center py-12"><i class="fas fa-exclamation-triangle text-red-400 text-5xl mb-4"></i><p class="text-slate-400 text-lg">Failed to load launches data</p><p class="text-slate-500 text-sm mt-2">Please try again later</p></div>`;
    if (featured) featured.innerHTML = msg;
    if (grid) grid.innerHTML = msg;
  }
}

function renderFeatured() {
  const el = document.getElementById("featured-launch");
  if (!el || launchesData.length === 0) return;
  const n = launchesData[0];
  const launchDate = new Date(n.net);
  const diffDays = Math.ceil((launchDate - new Date()) / (1000 * 60 * 60 * 24));
  const dateStr = launchDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = launchDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  const statusColors = { Go: "green", Success: "green", TBD: "yellow", Hold: "red", TBC: "yellow" };
  const status = n.status ? n.status.abbrev : "TBD";
  const color = statusColors[status] || "blue";
  const imgUrl = (n.image && n.image.image_url) || (n.rocket && n.rocket.configuration && n.rocket.configuration.image_url) || "";
  const provider = (n.launch_service_provider && n.launch_service_provider.name) || "Unknown";
  const rocket = (n.rocket && n.rocket.configuration && n.rocket.configuration.name) || "N/A";
  const location = (n.pad && n.pad.location && n.pad.location.name) || "Unknown";
  const country = (n.pad && n.pad.location && n.pad.location.country && n.pad.location.country.name) || "Unknown";
  const mission = (n.mission && n.mission.description) || "Mission details will be available closer to launch date.";

  el.innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>
                Featured Launch
              </span>
              <span class="px-4 py-1.5 bg-${color}-500/20 text-${color}-400 rounded-full text-sm font-semibold">
                ${status}
              </span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${n.name}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2">
                <i class="fas fa-building"></i>
                <span>${provider}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-rocket"></i>
                <span>${rocket}</span>
              </div>
            </div>
            ${diffDays > 0 ? `
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${diffDays}</p>
                <p class="text-xs text-slate-400">Days Until Launch</p>
              </div>
            </div>
            ` : ""}
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-calendar"></i>
                  Launch Date
                </p>
                <p class="font-semibold">${dateStr}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-clock"></i>
                  Launch Time
                </p>
                <p class="font-semibold">${timeStr}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-map-marker-alt"></i>
                  Location
                </p>
                <p class="font-semibold text-sm">${location}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2">
                  <i class="fas fa-globe"></i>
                  Country
                </p>
                <p class="font-semibold">${country}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${mission}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <button class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>
              View Full Details
            </button>
            <div class="icons self-end md:self-center">
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                <i class="far fa-heart"></i>
              </button>
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors">
                <i class="fas fa-bell"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="relative">
          ${imgUrl ? `
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            <img src="${imgUrl}" alt="${n.name}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='images/launch-placeholder.png';" />
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
          ` : `
          <div class="flex items-center justify-center h-full min-h-[400px] bg-slate-900/50 rounded-2xl">
            <div class="text-center">
              <i class="fas fa-rocket text-6xl text-slate-700 mb-4"></i>
              <p class="text-slate-500">No image available</p>
            </div>
          </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderLaunchesGrid() {
  const el = document.getElementById("launches-grid");
  if (!el || launchesData.length === 0) return;
  const list = launchesData.slice(1, 10);
  el.innerHTML = list.map((a) => {
    const date = new Date(a.net);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
    const status = a.status ? a.status.abbrev : "TBD";
    const statusColors = { Go: "green", Success: "green", TBD: "yellow", Hold: "red", TBC: "yellow" };
    const color = statusColors[status] || "blue";
    const thumb = (a.image && a.image.thumbnail_url) || "";
    const provider = (a.launch_service_provider && a.launch_service_provider.name) || "Unknown";
    const rocket = (a.rocket && a.rocket.configuration && a.rocket.configuration.name) || "N/A";
    const loc = (a.pad && a.pad.location && a.pad.location.name) || "Unknown";
    return `
      <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
        ${thumb ? `
        <div class="relative h-48 overflow-hidden bg-slate-900/50">
          <img src="${thumb}" alt="${a.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.onerror=null; this.src='images/launch-placeholder.png';" />
          <div class="absolute top-3 right-3">
            <span class="px-3 py-1 bg-${color}-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">
              ${status}
            </span>
          </div>
        </div>
        ` : `
        <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
          <i class="fas fa-rocket text-5xl text-slate-700"></i>
          <div class="absolute top-3 right-3">
            <span class="px-3 py-1 bg-${color}-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">
              ${status}
            </span>
          </div>
        </div>
        `}
        <div class="p-5">
          <div class="mb-3">
            <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
              ${a.name}
            </h4>
            <p class="text-sm text-slate-400 flex items-center gap-2">
              <i class="fas fa-building text-xs"></i>
              ${provider}
            </p>
          </div>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-calendar text-slate-500 w-4"></i>
              <span class="text-slate-300">${dateStr}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-clock text-slate-500 w-4"></i>
              <span class="text-slate-300">${timeStr}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-rocket text-slate-500 w-4"></i>
              <span class="text-slate-300">${rocket}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
              <span class="text-slate-300 line-clamp-1">${loc}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
            <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">
              Details
            </button>
            <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
              <i class="far fa-heart"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

const planetColors = {
  mercury: "#eab308",
  venus: "#f97316",
  earth: "#3b82f6",
  mars: "#ef4444",
  jupiter: "#fb923c",
  saturn: "#facc15",
  uranus: "#06b6d4",
  neptune: "#2563eb"
};

const planetImages = {
  mercury: "images/mercury.png",
  venus: "images/venus.png",
  earth: "images/earth.png",
  mars: "images/mars.png",
  jupiter: "images/jupiter.png",
  saturn: "images/saturn.png",
  uranus: "images/uranus.png",
  neptune: "images/neptune.png"
};

function renderPlanetsGrid() {
  const el = document.getElementById("planets-grid");
  if (!el) return;
  el.innerHTML = planetsData.map((p) => {
    const name = p.englishName.toLowerCase();
    const color = planetColors[name] || "#64748b";
    const img = planetImages[name] || "";
    const au = (p.semimajorAxis / 149597870700).toFixed(2);
    return `
      <div class="planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group" data-planet-id="${p.id}" style="--planet-color: ${color}" onmouseover="this.style.borderColor='${color}80'" onmouseout="this.style.borderColor='#334155'">
        <div class="relative mb-3 h-24 flex items-center justify-center">
          <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform" src="${img}" alt="${p.englishName}" />
        </div>
        <h4 class="font-semibold text-center text-sm">${p.englishName}</h4>
        <p class="text-xs text-slate-400 text-center">${au} AU</p>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".planet-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.planetId;
      const planet = planetsData.find((p) => p.id === id);
      if (planet) showPlanet(planet);
    });
  });
}

function renderComparison() {
  const el = document.getElementById("planet-comparison-tbody");
  if (!el) return;
  const colors = {
    mercury: "#6b7280",
    venus: "#fb923c",
    earth: "#3b82f6",
    mars: "#ef4444",
    jupiter: "#fdba74",
    saturn: "#fde047",
    uranus: "#22d3ee",
    neptune: "#2563eb"
  };
  const earth = planetsData.find((p) => p.englishName.toLowerCase() === "earth");
  const earthMass = earth && earth.mass ? earth.mass.massValue * Math.pow(10, earth.mass.massExponent) : 1;

  el.innerHTML = planetsData.map((p) => {
    const name = p.englishName.toLowerCase();
    const color = colors[name] || "slate-500";
    const au = (p.semimajorAxis / 149597870700).toFixed(2);
    const diameter = p.meanRadius ? (p.meanRadius * 2).toFixed(0) : "N/A";
    const mass = p.mass ? ((p.mass.massValue * Math.pow(10, p.mass.massExponent)) / earthMass).toFixed(3) : "N/A";
    let orbit = p.sideralOrbit ? p.sideralOrbit.toFixed(0) : "N/A";
    if (p.sideralOrbit && p.sideralOrbit > 365) orbit = `${(p.sideralOrbit / 365.25).toFixed(1)} years`;
    else if (p.sideralOrbit) orbit = `${orbit} days`;
    const moons = p.moons ? p.moons.length : 0;
    let type = "Terrestrial";
    let bg = "#f9731680";
    let fg = "#fb923c";
    if (["jupiter", "saturn"].includes(name)) {
      type = "Gas Giant";
      bg = "#a855f780";
      fg = "#c084fc";
    } else if (["uranus", "neptune"].includes(name)) {
      type = "Ice Giant";
      bg = "#3b82f680";
      fg = "#60a5fa";
    }
    return `
      <tr class="${name === "earth" ? "hover:bg-slate-800/30 transition-colors bg-blue-500/5" : "hover:bg-slate-800/30 transition-colors"}">
        <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
          <div class="flex items-center space-x-2 md:space-x-3">
            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
            <span class="font-semibold text-sm md:text-base whitespace-nowrap">${p.englishName}</span>
          </div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${au}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${parseInt(diameter).toLocaleString()}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${mass}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${orbit}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${moons}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
          <span class="px-2 py-1 rounded text-xs" style="background-color: ${bg}; color: ${fg}">
            ${type}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

const descriptions = {
  earth: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 29% of Earth's surface is land consisting of continents and islands. The remaining 71% is covered with water, mostly by oceans, seas, gulfs, and other salt-water bodies, but also by lakes, rivers, and other fresh water, which together constitute the hydrosphere.",
  mars: 'Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. Named after the Roman god of war, it is often referred to as the "Red Planet" due to its reddish appearance.',
  jupiter: "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass one-thousandth that of the Sun, but two-and-a-half times that of all the other planets combined.",
  saturn: "Saturn is the sixth planet from the Sun and the second-largest in the Solar System. It is a gas giant with an average radius about nine times that of Earth, and is best known for its extensive ring system.",
  venus: "Venus is the second planet from the Sun. It is named after the Roman goddess of love and beauty. As the second-brightest natural object in the night sky after the Moon, Venus can cast shadows.",
  mercury: "Mercury is the smallest planet in the Solar System and the closest to the Sun. Its orbit around the Sun takes 87.97 Earth days, the shortest of all the planets in the Solar System.",
  uranus: "Uranus is the seventh planet from the Sun. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System. Uranus is unique in that it rotates on its side.",
  neptune: "Neptune is the eighth and farthest known planet from the Sun in the Solar System. It is the fourth-largest planet by diameter and the third-most-massive planet."
};

function factsFor(p) {
  const facts = [];
  if (p.mass) facts.push(`Mass: ${p.mass.massValue} × 10^${p.mass.massExponent} kg`);
  if (p.gravity) facts.push(`Surface gravity: ${p.gravity} m/s²`);
  if (p.density) facts.push(`Density: ${p.density} g/cm³`);
  if (p.axialTilt) facts.push(`Axial tilt: ${p.axialTilt}°`);
  if (p.discoveredBy) facts.push(`Discovered by: ${p.discoveredBy}`);
  if (facts.length < 3) {
    facts.push(`Mean radius: ${p.meanRadius.toFixed(0)} km`);
    if (p.moons) facts.push(`Has ${p.moons.length} moon(s)`);
  }
  return facts.slice(0, 4);
}

function showPlanet(p) {
  const name = p.englishName.toLowerCase();
  const img = document.getElementById("planet-detail-image");
  if (img) {
    img.src = planetImages[name] || "";
    img.alt = p.englishName;
  }
  const title = document.getElementById("planet-detail-name");
  if (title) title.textContent = p.englishName;
  const desc = document.getElementById("planet-detail-description");
  if (desc) desc.textContent = descriptions[name] || `${p.englishName} is a fascinating celestial body in our Solar System with unique characteristics.`;

  const dist = document.getElementById("planet-distance");
  const rad = document.getElementById("planet-radius");
  const mass = document.getElementById("planet-mass");
  const dens = document.getElementById("planet-density");
  const orb = document.getElementById("planet-orbital-period");
  const rot = document.getElementById("planet-rotation");
  const moons = document.getElementById("planet-moons");
  const grav = document.getElementById("planet-gravity");

  if (dist) dist.textContent = `${(p.semimajorAxis / 1e6).toFixed(1)}M km`;
  if (rad) rad.textContent = `${p.meanRadius ? p.meanRadius.toFixed(0) : "N/A"} km`;
  if (mass) mass.textContent = p.mass ? `${p.mass.massValue} × 10^${p.mass.massExponent} kg` : "N/A";
  if (dens) dens.textContent = p.density ? `${p.density.toFixed(2)} g/cm³` : "N/A";
  if (orb) orb.textContent = p.sideralOrbit ? `${p.sideralOrbit.toFixed(2)} days` : "N/A";
  if (rot) rot.textContent = p.sideralRotation ? `${p.sideralRotation.toFixed(2)} hours` : "N/A";
  if (moons) moons.textContent = p.moons ? p.moons.length : 0;
  if (grav) grav.textContent = p.gravity ? `${p.gravity.toFixed(2)} m/s²` : "N/A";

  const discoverer = document.getElementById("planet-discoverer");
  const discDate = document.getElementById("planet-discovery-date");
  const bodyType = document.getElementById("planet-body-type");
  const volume = document.getElementById("planet-volume");
  if (discoverer) discoverer.textContent = p.discoveredBy || "Known since antiquity";
  if (discDate) discDate.textContent = p.discoveryDate || "Ancient times";
  if (bodyType) bodyType.textContent = p.bodyType || "Planet";
  if (volume) {
    const v = p.vol ? `${p.vol.volValue} × 10^${p.vol.volExponent} km³` : "N/A";
    volume.textContent = v;
  }

  const perihelion = document.getElementById("planet-perihelion");
  const aphelion = document.getElementById("planet-aphelion");
  const ecc = document.getElementById("planet-eccentricity");
  const inc = document.getElementById("planet-inclination");
  const tilt = document.getElementById("planet-axial-tilt");
  const temp = document.getElementById("planet-temp");
  const esc = document.getElementById("planet-escape");
  if (perihelion) perihelion.textContent = p.perihelion ? `${(p.perihelion / 1e6).toFixed(1)}M km` : "N/A";
  if (aphelion) aphelion.textContent = p.aphelion ? `${(p.aphelion / 1e6).toFixed(1)}M km` : "N/A";
  if (ecc) ecc.textContent = p.eccentricity ? p.eccentricity.toFixed(5) : "N/A";
  if (inc) inc.textContent = p.inclination ? `${p.inclination.toFixed(2)}°` : "N/A";
  if (tilt) tilt.textContent = p.axialTilt ? `${p.axialTilt.toFixed(2)}°` : "N/A";
  if (temp) temp.textContent = p.avgTemp ? `${p.avgTemp}°C` : "N/A";
  if (esc) esc.textContent = p.escape ? `${(p.escape / 1e3).toFixed(2)} km/s` : "N/A";

  const facts = document.getElementById("planet-facts");
  if (facts) {
    facts.innerHTML = factsFor(p).map((f) => `
      <li class="flex items-start">
        <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
        <span class="text-slate-300">${f}</span>
      </li>
    `).join("");
  }
}

function setupDateInput() {
  const input = document.getElementById("apod-date-input");
  if (!input) return;
  const wrapper = input.closest(".date-input-wrapper");
  const loadBtn = document.getElementById("load-date-btn");
  const todayBtn = document.getElementById("today-apod-btn");
  if (!wrapper || !loadBtn || !todayBtn) return;

  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = fmt(today);
  input.max = todayStr;
  input.value = todayStr;

  const updateLabel = (val) => {
    if (val) {
      const d = new Date(val + "T00:00:00");
      wrapper.setAttribute("data-date", d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
    } else {
      wrapper.setAttribute("data-date", "Select a date");
    }
  };
  updateLabel(todayStr);

  input.addEventListener("change", () => updateLabel(input.value));
  loadBtn.addEventListener("click", () => {
    if (input.value) loadApod(input.value);
  });
  todayBtn.addEventListener("click", () => {
    input.value = todayStr;
    updateLabel(todayStr);
    loadApod(null);
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value) loadApod(input.value);
  });
}

function setupNav() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".app-section");
  function show(section) {
    sections.forEach((s) => s.classList.add("hidden"));
    document.querySelectorAll(`[data-section="${section}"]`).forEach((s) => s.classList.remove("hidden"));
    links.forEach((l) => {
      if (l.dataset.section === section) {
        l.classList.remove("text-slate-300", "hover:bg-slate-800");
        l.classList.add("bg-blue-500/10", "text-blue-400");
      } else {
        l.classList.remove("bg-blue-500/10", "text-blue-400");
        l.classList.add("text-slate-300", "hover:bg-slate-800");
      }
    });
    window.scrollTo(0, 0);
  }
  links.forEach((l) => {
    l.addEventListener("click", (e) => {
      e.preventDefault();
      show(l.dataset.section);
      closeSidebar();
    });
  });
  show("today-in-space");
}

function setupSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  if (!sidebar || !toggle) return;
  let overlay = null;
  function open() {
    sidebar.classList.add("sidebar-open");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "sidebar-overlay";
      overlay.addEventListener("click", close);
      document.body.appendChild(overlay);
    }
  }
  function close() {
    sidebar.classList.remove("sidebar-open");
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (sidebar.classList.contains("sidebar-open")) close();
    else open();
  });
  window.closeSidebar = close;
}

window.addEventListener("load", () => {
  setupNav();
  setupSidebar();
  setupDateInput();
  loadApod(null);
  loadPlanets();
  loadLaunches();
});
