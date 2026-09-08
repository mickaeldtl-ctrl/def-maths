const SPREADSHEET_ID = "1yQWvx7FOmqQ1rzB2Hq-JY79fVP2LcZsoAL6Fd2_lH9w";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

let allCards = [];
let filteredCards = [];
let currentIndex = 0;

// Éléments du DOM
const loadingEl = document.getElementById('loading');
const containerEl = document.getElementById('flashcardContainer');
const cardQuestion = document.getElementById('cardQuestion');
const cardDetails = document.getElementById('cardDetails');
const cardResponse = document.getElementById('cardResponse');
const counterEl = document.getElementById('counter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const randomBtn = document.getElementById('randomBtn');
const searchInput = document.getElementById('searchInput');

const btnAgain = document.getElementById('btnAgain');
const btnHard = document.getElementById('btnHard');
const btnEasy = document.getElementById('btnEasy');

// Gestion du stockage local (Courbe de l'oubli)
function getSRSData() {
  return JSON.parse(localStorage.getItem('srs_flashcards') || '{}');
}

function saveSRSData(data) {
  localStorage.setItem('srs_flashcards', JSON.stringify(data));
}

// Chargement des données CSV
Papa.parse(SHEET_URL, {
  download: true,
  header: false,
  complete: function(results) {
    const rows = results.data;
    if (!rows || rows.length <= 1) {
      loadingEl.textContent = "Aucune donnée trouvée dans le tableau.";
      return;
    }

    const srsData = getSRSData();

    // Lecture basée sur 3 colonnes : A (Questions), B (Réponse), C (Statut)
    allCards = rows.slice(1).map(row => {
      const question = row[0] ? row[0].trim() : '';
      const cardSRS = srsData[question] || { interval: 0, nextReview: 0 };
      
      return {
        q: question,
        r: row[1] ? row[1].trim() : 'Pas de réponse renseignée.',
        statut: row[2] ? row[2].trim().toUpperCase() : '',
        interval: cardSRS.interval,
        nextReview: cardSRS.nextReview
      };
    }).filter(card => card.q.length > 0 && card.q !== "Questions" && card.statut === "OK");

    if (allCards.length === 0) {
      loadingEl.textContent = "Aucune carte validée avec 'OK'.";
      return;
    }

    // Tri prioritaire : d'abord les cartes dues pour révision
    allCards.sort((a, b) => a.nextReview - b.nextReview);

    filteredCards = [...allCards];
    loadingEl.classList.add('hidden');
    containerEl.classList.remove('hidden');
    showCard(0);
  },
  error: function() {
    loadingEl.innerHTML = "⚠️ Erreur lors du chargement du fichier Google Sheet.";
  }
});

function showCard(index) {
  if (filteredCards.length === 0) {
    cardQuestion.textContent = "Aucune carte ne correspond.";
    cardResponse.textContent = "";
    cardDetails.classList.add('hidden');
    counterEl.textContent = "0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  cardDetails.classList.remove('hidden');
  cardDetails.removeAttribute('open');

  currentIndex = index;
  const card = filteredCards[currentIndex];

  cardQuestion.textContent = card.q;
  cardResponse.innerHTML = `<p>${card.r}</p>`;

  counterEl.textContent = `Carte ${currentIndex + 1} / ${filteredCards.length}`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === filteredCards.length - 1;
}

// Algorithme de Répétition Espacée
function rateCard(rating) {
  const card = filteredCards[currentIndex];
  const srsData = getSRSData();

  let interval = card.interval || 0;

  if (rating === 'again') {
    interval = 0; // À revoir immédiatement
  } else if (rating === 'hard') {
    interval = interval === 0 ? 1 : Math.round(interval * 1.5);
  } else if (rating === 'easy') {
    interval = interval === 0 ? 3 : Math.round((interval + 1) * 2.5); // Espacement renforcé
  }

  const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);

  srsData[card.q] = { interval, nextReview };
  saveSRSData(srsData);

  card.interval = interval;
  card.nextReview = nextReview;

  // Passe automatiquement à la carte suivante
  if (currentIndex < filteredCards.length - 1) {
    showCard(currentIndex + 1);
  } else {
    showCard(0);
  }
}

// Événements auto-évaluation
btnAgain.addEventListener('click', () => rateCard('again'));
btnHard.addEventListener('click', () => rateCard('hard'));
btnEasy.addEventListener('click', () => rateCard('easy'));

// Navigation
prevBtn.addEventListener('click', () => { if (currentIndex > 0) showCard(currentIndex - 1); });
nextBtn.addEventListener('click', () => { if (currentIndex < filteredCards.length - 1) showCard(currentIndex + 1); });

randomBtn.addEventListener('click', () => {
  if (filteredCards.length <= 1) return;
  let newIndex;
  do { newIndex = Math.floor(Math.random() * filteredCards.length); } while (newIndex === currentIndex);
  showCard(newIndex);
});

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  filteredCards = allCards.filter(c =>
    c.q.toLowerCase().includes(q) ||
    c.r.toLowerCase().includes(q)
  );
  showCard(0);
});

document.addEventListener('keydown', (e) => {
  if (document.activeElement === searchInput) return;
  if (e.key === 'ArrowLeft' && !prevBtn.disabled) showCard(currentIndex - 1);
  if (e.key === 'ArrowRight' && !nextBtn.disabled) showCard(currentIndex + 1);
});
