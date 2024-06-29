const headerEl = document.querySelector(".header__row");

// access anilist api and use a graphql query to retrieve data
// const CACHE_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

async function fetchAniListData(genre = "") {
  // const cacheKey = `anilist_${genre}`;
  // const cachedData = localStorage.getItem(cacheKey);
  // const cachedTime = localStorage.getItem(`${cacheKey}_time`);

  // if (cachedData && cachedTime && (Date.now() - cachedTime) < CACHE_TIME) {
  //   return JSON.parse(cachedData);
  // }

  const query = `
    query {
      Page(page: 1, perPage: 40) {
        media(type: ANIME, sort: POPULARITY_DESC, genre_in: "${genre}") {
          id
          title {
            romaji
            english
          }
          description
          genres
          episodes
          duration
          status
          startDate {
            year
            month
            day
          }
          format
        }
      }
    }`;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    const animeList = data.data.Page.media;

    // // Store data in local storage
    // localStorage.setItem(cacheKey, JSON.stringify(animeList));
    // localStorage.setItem(`${cacheKey}_time`, Date.now());

    return animeList;
  } catch (error) {
    console.error("Error fetching AniList data:", error);
    return [];
  }
}


// fetch the repective kitsu cover image
async function fetchKitsuCoverImage(title) {
  const query = `filter[text]=${encodeURIComponent(title)}`;

  const response = await fetch(`https://kitsu.io/api/edge/anime?${query}`);
  const data = await response.json();

  try {
    if (data.data.length > 0) {
      const coverImage =
        data.data[0].attributes.coverImage.original ||
        data.data[0].attributes.coverImage.large;
      return coverImage;
    } else {
      throw new Error("No data found for title");
    }
  } catch (error) {
    console.error("Error fetching Kitsu cover image:", error);
    return "";
  }
}

function truncateText(text, numWords) {
  const cleanText = text.replace(/<[^>]*>/g, "");
  const words = cleanText.split(" ");
  if (words.length > numWords) {
    return (
      words.slice(0, numWords).join(" ") +
      ` . . . view in <span class="text--purple">More Info</span>`
    );
  } else {
    return text;
  }
}

async function displayRandomAnime() {
  const animeList = await fetchAniListData("action");

  if (animeList.length === 0) {
    console.error("No anime found in the list.");
    return;
  }

  let randomIndex = Math.floor(Math.random() * animeList.length);
  let selectedAnime = animeList[randomIndex];

  console.log(selectedAnime.title.romaji);

  const coverImage = await fetchKitsuCoverImage(
    selectedAnime.title.romaji || selectedAnime.title.english
  );

  const title = selectedAnime.title.english || selectedAnime.title.romaji;

  if (title.toLowerCase().includes("season")) {
    console.log(selectedAnime.title.english);
    await displayRandomAnime();
  } else {
    document.querySelector(".header__title").textContent = title;
    document.querySelector(
      ".header__genre"
    ).innerHTML = `Genre: ${selectedAnime.genres
      .map((genre) => `<span class="genre__tag">${genre}</span>`)
      .join(" ")}`;
    document.querySelector(".header__para").innerHTML = truncateText(
      selectedAnime.description,
      35
    );
    const imageEl = document.querySelector(".background__image");
    imageEl.src = coverImage;
    imageEl.alt = selectedAnime.title.english;

    if (title.toLowerCase().includes("demon slayer")) {
      imageEl.classList.add("demon-slayer");
    } else {
      imageEl.classList.remove("demon-slayer");
    }

    console.log(selectedAnime.title.english);

    document
      .querySelector(".header__button--info")
      .addEventListener("click", () => {
        showMoreInfo(selectedAnime, coverImage);
      });

    const loadingImage = document.querySelector(".loading__img--wrapper");
    if (loadingImage) {
      loadingImage.classList.add("finished-loading");
    }
  }
}

// open modal for more info

function showMoreInfo(anime, coverImage) {
  const modal = document.getElementById("modal");
  document.querySelector(".modal__title").innerHTML =
    anime.title.english || anime.title.romaji || anime.title;
  document.querySelector(".modal__image").src = coverImage;
  document.querySelector(".modal__image").alt =
    anime.title.romaji || anime.title.english;
  document.querySelector(".modal__description").innerHTML = anime.description;
  document.querySelector(".modal__details").innerHTML = `
        <p>Release Date: ${anime.startDate.year}-${anime.startDate.month}-${
    anime.startDate.day
  }</p>
        <p>Episode Count: ${anime.episodes || "N/A"}</p>
        <p>Duration: ${
          anime.duration ? `${anime.duration} min per ep` : "N/A"
        }</p>
        <p>Status: ${anime.status}</p>
    `;

  // Show the modal
  modal.style.display = "block";
}

// Function to close the modal
function closeModal() {
  closedModal = document.querySelector(".modal__content");

  closedModal.classList += " modal__content--closing";

  setTimeout(() => {
    document.getElementById("modal").style.display = "none";
    closedModal.classList.remove("modal__content--closing");
  }, 200);
}

// let showMovies = false;

// function seriesMode() {
//   showMovies = false;
//   const mode = showMovies ? "MOVIE" : "TV";
//   console.log(`Displaying ${mode}s`);
// }

// function movieMode() {
//   showMovies = true;
//   const mode = showMovies ? "MOVIE" : "TV";
//   console.log(`Displaying ${mode}s`);
// }

// Populate slider

async function displayAnimeByGenre(genre, containerClass) {
  const animeList = await fetchAniListData(genre);
  const container = document.querySelector(`.${containerClass}`);

  console.log(animeList);
  if (!container) {
    console.error(`Element with class '${containerClass}' not found`);
    return;
  }

  if (!container) {
    console.error(`Element with class '${containerClass}' not found`);
    return;
  }

  container.innerHTML = "";
  const seenTitles = new Set();

  let animeCount = 0;

  const normalizeTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/[\W_]+/g, " ") // Replace non-alphanumeric characters with space
      .replace(/\b\d\b/g, " ")
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();
  };

  const coverImages = await Promise.all(
    animeList.map(async (anime) => {
      const titleEng = anime.title.english || "";
      const titleJap = anime.title.romaji || "";
      const coverImage = await fetchKitsuCoverImage(titleJap || titleEng);

      const normalizedEngTitle = normalizeTitle(titleEng);
      const normalizedJapTitle = normalizeTitle(titleJap);

      if (coverImage === "") {
        return null;
      }

      if (
        normalizedEngTitle.includes("to the top") ||
        normalizedEngTitle.includes("iwatobi") ||
        normalizedEngTitle.includes("land vs air") ||
        normalizedEngTitle.includes("megalobox 2 nomad") ||
        normalizedEngTitle.includes("2") ||
        normalizedEngTitle.includes("2nd") ||
        normalizedEngTitle.includes("3rd") ||
        normalizedEngTitle.includes("4th") ||
        normalizedJapTitle.includes("2") ||
        normalizedJapTitle.includes("2nd") ||
        normalizedJapTitle.includes("3rd") ||
        normalizedJapTitle.includes("4th") ||
        normalizedEngTitle.includes("ii")
      ) {
        return null;
      }

      const anotherRegEx = /\banother\b/;

      if (anotherRegEx.test(normalizedEngTitle)) {
        return null;
      }

      if (animeCount >= 24) {
        return null; // Limit to 24 items
      }

      if (
        !normalizedEngTitle.includes("season") &&
        !seenTitles.has(normalizedJapTitle)
      ) {
        seenTitles.add(normalizedJapTitle);
        animeCount++;
        return {
          id: anime.id,
          title: titleEng || titleJap,
          description: anime.description,
          genres: anime.genres,
          episodes: anime.episodes,
          duration: anime.duration,
          status: anime.status,
          startDate: anime.startDate,
          coverImage: coverImage,
          format: anime.format,
        };
      }
      return null;
    })
  );

  console.log(seenTitles);

  const limitedCoverImages = coverImages
    .filter((item) => item !== null)
    .slice(0, 24);

  limitedCoverImages.forEach((anime) => {
    if (anime.title.toLowerCase().includes("demon slayer")) {
      const animeHTML = `
                    <div class="anime__window--wrapper">
                        <div class="anime__window" data-anime-id="${anime.id}">
                            <figure class="window__img--wrapper">
                                <h1 class="anime__title">${anime.title}</h1>
                                <img class="window__img demon-slayer" src="${anime.coverImage}" alt="${anime.title}-img" />
                            </figure>
                        </div>
                    </div>
                `;
      container.insertAdjacentHTML("beforeend", animeHTML);
    } else if (anime.title.toLowerCase().includes("attack on titan")) {
      const animeHTML = `
                    <div class="anime__window--wrapper">
                        <div class="anime__window" data-anime-id="${anime.id}">
                            <figure class="window__img--wrapper">
                                <h1 class="anime__title">${anime.title}</h1>
                                <img class="window__img aot" src="${anime.coverImage}" alt="${anime.title}-img" />
                            </figure>
                        </div>
                    </div>
                `;
      container.insertAdjacentHTML("beforeend", animeHTML);
    } else {
      const animeHTML = `
                    <div class="anime__window--wrapper">
                        <div class="anime__window" data-anime-id="${anime.id}">
                            <figure class="window__img--wrapper">
                                <h1 class="anime__title">${anime.title}</h1>
                                <img class="window__img" src="${anime.coverImage}" alt="${anime.title}-img" />
                            </figure>
                        </div>
                    </div>
                `;
      container.insertAdjacentHTML("beforeend", animeHTML);
    }
  });

  const firstClones = container.querySelectorAll(".anime__window--wrapper");
  for (let i = 0; i < 2; i++) {
    firstClones.forEach((clone, index) => {
      if (index < 30) {
        container.appendChild(clone.cloneNode(true));
      }
    });
  }

  const animeWindows = container.querySelectorAll(".anime__window");
  animeWindows.forEach((element) => {
    element.addEventListener("click", () => {
      const animeId = element.getAttribute("data-anime-id");
      const selectedAnime = limitedCoverImages.find(
        (anime) => anime.id === parseInt(animeId)
      );
      showMoreInfo(selectedAnime, selectedAnime.coverImage);
    });
  });
}

function moveSlider(containerClass) {
  const rightClick = document.querySelector(
    `.${containerClass} .arrow__wrapper--right`
  );
  const leftClick = document.querySelector(
    `.${containerClass} .arrow__wrapper--left`
  );
  let slider = document.querySelector(`.${containerClass} .slider__content`);
  let isAnimating = false;
  let slideNumber = 1;

  const sliderThumbEl = document.querySelector(
    `.${containerClass} .slider__indicator`
  );
  const sliderThumb = document.querySelector(
    `.${containerClass} .slider__indicator--thumb`
  );

  rightClick.addEventListener("click", function () {
    if (isAnimating) return;

    const windowImage = document.querySelector(".anime__window--wrapper");
    const windowComputedStyle = getComputedStyle(windowImage);
    const windowWidth = windowImage.offsetWidth;
    //did right on purpose
    const windowMarginLeft = parseFloat(windowComputedStyle.marginRight);
    const windowMarginRight = parseFloat(windowComputedStyle.marginRight);
    const windowTotalWidth = windowWidth + windowMarginLeft + windowMarginRight;
    const translateSlide = -windowTotalWidth * 6 - 2.5;

    const currentTransform = getComputedStyle(slider).transform;
    let currentTranslateX = 0;

    leftClick.style.display = "flex";

    if (currentTransform !== "none") {
      const matrixValues = currentTransform.split(",");
      currentTranslateX = parseFloat(matrixValues[4]);
    }

    const newTranslateX = currentTranslateX + translateSlide;
    slider.style.transform = `translateX(${newTranslateX}px)`;
    console.log(`Right ${newTranslateX}`);

    updateSliderThumbRight();

    isAnimating = true;

    setTimeout(() => {
      slideNumber += 1;
      console.log(`Slide ${slideNumber}`);
      isAnimating = false;
      if (slideNumber === 2) {
        let loopSlide = 5 * translateSlide;
        slideNumber += 4;
        console.log(`loops ${loopSlide}`);
        requestAnimationFrame(() => {
          slider.style.transition = "none";
          slider.style.transform = `translateX(${loopSlide}px)`;

          requestAnimationFrame(() => {
            slider.style.transition = "transform 600ms";
          });
        });
      } else if (slideNumber === 11) {
        let loopSlide = 6 * translateSlide;
        slideNumber = 7;
        console.log(`loops ${loopSlide}`);
        console.log(slideNumber);

        requestAnimationFrame(() => {
          slider.style.transition = "none";
          slider.style.transform = `translateX(${loopSlide}px)`;

          requestAnimationFrame(() => {
            slider.style.transition = "transform 600ms";
          });
        });
      }
    }, 800);
  });

  leftClick.addEventListener("click", function () {
    if (isAnimating) return;
    const windowImage = document.querySelector(".anime__window--wrapper");
    const windowComputedStyle = getComputedStyle(windowImage);
    const windowWidth = windowImage.offsetWidth;
    //did right on purpose
    const windowMarginLeft = parseFloat(windowComputedStyle.marginRight);
    const windowMarginRight = parseFloat(windowComputedStyle.marginRight);
    const windowTotalWidth = windowWidth + windowMarginLeft + windowMarginRight;
    const translateSlide = -windowTotalWidth * 6 - 2.5;

    const currentTransform = getComputedStyle(slider).transform;
    let currentTranslateX = 0;

    if (currentTransform !== "none") {
      const matrixValues = currentTransform.split(",");
      currentTranslateX = parseFloat(matrixValues[4]);
    }

    const newTranslateX = currentTranslateX - translateSlide;
    slider.style.transform = `translateX(${newTranslateX}px)`;
    console.log(`Left ${newTranslateX}`);

    updateSliderThumbLeft();

    isAnimating = true;

    setTimeout(() => {
      slideNumber -= 1;
      console.log(`Slide ${slideNumber}`);
      isAnimating = false;
      if (slideNumber === 2) {
        const loopSlide = 5 * translateSlide;
        slideNumber = 6;
        console.log(`loops ${loopSlide}`);

        requestAnimationFrame(() => {
          slider.style.transition = "none";
          slider.style.transform = `translateX(${loopSlide}px)`;

          requestAnimationFrame(() => {
            slider.style.transition = "transform 600ms";
          });
        });
      }
    }, 800);
  });

  function updateSliderThumbRight() {
    const sliderThumbComputedStyle = getComputedStyle(sliderThumbEl);
    const sliderThumbWidth = sliderThumb.offsetWidth;
    const thumbMarginLeft = parseFloat(sliderThumbComputedStyle.marginLeft);
    const thumbMarginRight = parseFloat(sliderThumbComputedStyle.marginRight);
    const sliderThumbTotalWidth =
      sliderThumbWidth + thumbMarginLeft + thumbMarginRight;

    const slideOne = sliderThumbTotalWidth;
    const slideTwo = sliderThumbTotalWidth * 2;
    const slideThree = sliderThumbTotalWidth * 3;
    const slideFour = sliderThumbTotalWidth * 0;

    if (slideNumber === 1 || slideNumber === 5 || slideNumber === 9) {
      sliderThumb.style.transform = `translateX(${slideOne}px)`;
    } else if (slideNumber === 2 || slideNumber === 6 || slideNumber === 10) {
      sliderThumb.style.transform = `translateX(${slideTwo}px)`;
    } else if (slideNumber === 3 || slideNumber === 7 || slideNumber === 11) {
      sliderThumb.style.transform = `translateX(${slideThree}px)`;
    } else if (slideNumber === 4 || slideNumber === 8 || slideNumber === 12) {
      sliderThumb.style.transform = `translateX(${slideFour}px)`;
    }
  }

  function updateSliderThumbLeft() {
    const sliderThumbComputedStyle = getComputedStyle(sliderThumbEl);
    const sliderThumbWidth = sliderThumb.offsetWidth;
    const thumbMarginLeft = parseFloat(sliderThumbComputedStyle.marginLeft);
    const thumbMarginRight = parseFloat(sliderThumbComputedStyle.marginRight);
    const sliderThumbTotalWidth =
      sliderThumbWidth + thumbMarginLeft + thumbMarginRight;

    const slideOne = sliderThumbTotalWidth * 3;
    const slideTwo = sliderThumbTotalWidth * 0;
    const slideThree = sliderThumbTotalWidth * 1;
    const slideFour = sliderThumbTotalWidth * 2;

    if (slideNumber === 1 || slideNumber === 5 || slideNumber === 9) {
      sliderThumb.style.transform = `translateX(${slideOne}px)`;
    } else if (slideNumber === 2 || slideNumber === 6 || slideNumber === 10) {
      sliderThumb.style.transform = `translateX(${slideTwo}px)`;
    } else if (slideNumber === 3 || slideNumber === 7 || slideNumber === 11) {
      sliderThumb.style.transform = `translateX(${slideThree}px)`;
    } else if (slideNumber === 4 || slideNumber === 8 || slideNumber === 12) {
      sliderThumb.style.transform = `translateX(${slideFour}px)`;
    }
  }
}

window.addEventListener("scroll", () => {
  const navbarContainer = document.getElementById("navbar__container");
  const scrollPosition = window.scrollY;

  if (scrollPosition > 0) {
    navbarContainer.style.setProperty("background-color", "#0A0C0E");
  } else {
    navbarContainer.style.setProperty("background", "transparent");
  }
});

function loadSearchBar() {
  const searchBar = document.getElementById("searchbar");
  searchBar.style.display = "flex";

  setTimeout(() => {
    searchBar.style.display = "none";
  }, 200);
}

function activateSearchbar() {
  const searchBarIcon = document.getElementById("searchbarIcon");
  const searchBar = document.getElementById("searchbar");

  searchBarIcon.classList.add("searchbar--on");
  searchBar.style.display = "flex";

  searchBarIcon.addEventListener("click", function () {
    searchBar.focus();
    searchBar.select();
  });

  document.addEventListener("click", function (event) {
    const isClickInside =
      searchBar.contains(event.target) || searchBarIcon.contains(event.target);

    if (!isClickInside) {
      searchBarIcon.classList.remove("searchbar--on");
      searchBar.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  displayRandomAnime();
  displayAnimeByGenre("action", "popular__slider");
  await displayAnimeByGenre("romance", "romance__slider");
  await displayAnimeByGenre("psychological", "horror__slider");
  await displayAnimeByGenre("sports", "sport__slider");

  moveSlider("popular__container");
  moveSlider("romance__container");
  moveSlider("horror__container");
  moveSlider("sport__container");

  document.getElementById("searchbarIcon").addEventListener("click", () => {
    activateSearchbar();
  });
});

async function fetchSearchData(searchTerm = "") {
  const query = `
    query {
      Page(page: 1, perPage: 40) {
        media(type: ANIME, sort: POPULARITY_DESC, search: "${searchTerm}") {
          id
          title {
            romaji
            english
          }
          description
          genres
          episodes
          duration
          status
          startDate {
            year
            month
            day
          }
          format
        }
      }
    }`;
}
