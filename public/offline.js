(() => {
  const translations = {
    en: {
      title: "You are offline",
      description:
        "WallettuTrack cannot load your data without a connection. Try again when your network is available.",
      retry: "Try again",
      pageTitle: "WallettuTrack — Offline",
    },
    it: {
      title: "Sei offline",
      description:
        "WallettuTrack non può caricare i tuoi dati senza connessione. Riprova quando la rete sarà disponibile.",
      retry: "Riprova",
      pageTitle: "WallettuTrack — Offline",
    },
    de: {
      title: "Du bist offline",
      description:
        "WallettuTrack kann deine Daten ohne Verbindung nicht laden. Versuche es erneut, sobald das Netzwerk verfügbar ist.",
      retry: "Erneut versuchen",
      pageTitle: "WallettuTrack — Offline",
    },
    fr: {
      title: "Vous êtes hors ligne",
      description:
        "WallettuTrack ne peut pas charger vos données sans connexion. Réessayez lorsque le réseau sera disponible.",
      retry: "Réessayer",
      pageTitle: "WallettuTrack — Hors ligne",
    },
  };

  let savedLocale = null;
  try {
    savedLocale = window.localStorage.getItem("wallettutrack-locale");
  } catch {
    // Browser storage may be disabled; browser preferences remain available.
  }

  const requestedLocale = savedLocale || navigator.languages?.[0] || navigator.language;
  const locale = requestedLocale?.toLowerCase().split(/[-_]/)[0];
  const selected = translations[locale] || translations.en;

  document.documentElement.lang = translations[locale] ? locale : "en";
  document.title = selected.pageTitle;
  document.getElementById("offline-title").textContent = selected.title;
  document.getElementById("offline-description").textContent = selected.description;
  document.getElementById("retry-button").textContent = selected.retry;
  document.getElementById("retry-button").addEventListener("click", () => location.reload());
})();
