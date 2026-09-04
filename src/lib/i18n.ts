export const SUPPORTED_LOCALES = ["en", "it", "de", "fr"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationValues = Record<string, string | number>;

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "wallettutrack-locale";

export const LOCALE_OPTIONS: ReadonlyArray<{
  value: AppLocale;
  label: string;
  intlLocale: string;
}> = [
  { value: "en", label: "English", intlLocale: "en-GB" },
  { value: "it", label: "Italiano", intlLocale: "it-IT" },
  { value: "de", label: "Deutsch", intlLocale: "de-DE" },
  { value: "fr", label: "Français", intlLocale: "fr-FR" },
];

type LocalizedMessage = Record<Exclude<AppLocale, "en">, string>;

/**
 * English source text is the stable message key. Keeping the four variants
 * together makes missing translations visible during review and testing.
 */
const MESSAGES: Record<string, LocalizedMessage> = {
  "Personal Finance Manager": {
    it: "Gestore delle finanze personali",
    de: "Persönlicher Finanzmanager",
    fr: "Gestionnaire de finances personnelles",
  },
  "Track daily, weekly, and monthly spending with a calendar, statistics, multiple currencies, and budgets.": {
    it: "Tieni sotto controllo le spese giornaliere, settimanali e mensili con calendario, statistiche, valute multiple e budget.",
    de: "Behalte tägliche, wöchentliche und monatliche Ausgaben mit Kalender, Statistiken, mehreren Währungen und Budgets im Blick.",
    fr: "Suivez vos dépenses quotidiennes, hebdomadaires et mensuelles avec un calendrier, des statistiques, plusieurs devises et des budgets.",
  },
  "Track and plan your expenses with a calendar, forecasts, budgets, and multiple currencies.": {
    it: "Monitora e pianifica le spese con calendario, previsioni, budget e valute multiple.",
    de: "Verfolge und plane deine Ausgaben mit Kalender, Prognosen, Budgets und mehreren Währungen.",
    fr: "Suivez et planifiez vos dépenses avec un calendrier, des prévisions, des budgets et plusieurs devises.",
  },
  Privacy: { it: "Privacy", de: "Datenschutz", fr: "Confidentialité" },
  "Terms of use": {
    it: "Termini di utilizzo",
    de: "Nutzungsbedingungen",
    fr: "Conditions d'utilisation",
  },
  "Source code": {
    it: "Codice sorgente",
    de: "Quellcode",
    fr: "Code source",
  },
  Language: { it: "Lingua", de: "Sprache", fr: "Langue" },
  "Change language": {
    it: "Cambia lingua",
    de: "Sprache ändern",
    fr: "Changer de langue",
  },
  "Could not change language": {
    it: "Impossibile cambiare lingua",
    de: "Sprache konnte nicht geändert werden",
    fr: "Impossible de changer de langue",
  },
  "Language updated": {
    it: "Lingua aggiornata",
    de: "Sprache aktualisiert",
    fr: "Langue mise à jour",
  },
  Dashboard: { it: "Panoramica", de: "Übersicht", fr: "Tableau de bord" },
  Transactions: { it: "Movimenti", de: "Transaktionen", fr: "Transactions" },
  Transfers: { it: "Trasferimenti", de: "Umbuchungen", fr: "Virements" },
  Calendar: { it: "Calendario", de: "Kalender", fr: "Calendrier" },
  Forecasts: { it: "Previsioni", de: "Prognosen", fr: "Prévisions" },
  Statistics: { it: "Statistiche", de: "Statistiken", fr: "Statistiques" },
  Budget: { it: "Budget", de: "Budget", fr: "Budget" },
  "Recurring items": {
    it: "Movimenti ricorrenti",
    de: "Wiederkehrende Posten",
    fr: "Opérations récurrentes",
  },
  Categories: { it: "Categorie", de: "Kategorien", fr: "Catégories" },
  Settings: { it: "Impostazioni", de: "Einstellungen", fr: "Paramètres" },
  "New transaction": {
    it: "Nuovo movimento",
    de: "Neue Transaktion",
    fr: "Nouvelle transaction",
  },
  New: { it: "Nuovo", de: "Neu", fr: "Nouveau" },
  "Sign out": { it: "Esci", de: "Abmelden", fr: "Se déconnecter" },
  "Change theme": {
    it: "Cambia tema",
    de: "Design ändern",
    fr: "Changer de thème",
  },
  "Active account": {
    it: "Conto attivo",
    de: "Aktives Konto",
    fr: "Compte actif",
  },
  "Create another account in Settings before switching": {
    it: "Crea un altro conto nelle Impostazioni prima di cambiare",
    de: "Erstelle vor dem Wechsel ein weiteres Konto in den Einstellungen",
    fr: "Créez un autre compte dans les Paramètres avant de changer",
  },
  "Switch active account": {
    it: "Cambia conto attivo",
    de: "Aktives Konto wechseln",
    fr: "Changer de compte actif",
  },
  "Could not switch account": {
    it: "Impossibile cambiare conto",
    de: "Konto konnte nicht gewechselt werden",
    fr: "Impossible de changer de compte",
  },
  "Connection error while switching accounts": {
    it: "Errore di connessione durante il cambio conto",
    de: "Verbindungsfehler beim Kontowechsel",
    fr: "Erreur de connexion lors du changement de compte",
  },
  Loading: { it: "Caricamento", de: "Wird geladen", fr: "Chargement" },
  "Something went wrong": {
    it: "Qualcosa è andato storto",
    de: "Etwas ist schiefgelaufen",
    fr: "Un problème est survenu",
  },
  "Try again": { it: "Riprova", de: "Erneut versuchen", fr: "Réessayer" },
  Close: { it: "Chiudi", de: "Schließen", fr: "Fermer" },
  Cancel: { it: "Annulla", de: "Abbrechen", fr: "Annuler" },
  Save: { it: "Salva", de: "Speichern", fr: "Enregistrer" },
  Saving: { it: "Salvataggio", de: "Wird gespeichert", fr: "Enregistrement" },
  Delete: { it: "Elimina", de: "Löschen", fr: "Supprimer" },
  Edit: { it: "Modifica", de: "Bearbeiten", fr: "Modifier" },
  Add: { it: "Aggiungi", de: "Hinzufügen", fr: "Ajouter" },
  Search: { it: "Cerca", de: "Suchen", fr: "Rechercher" },
  Reset: { it: "Reimposta", de: "Zurücksetzen", fr: "Réinitialiser" },
  Confirm: { it: "Conferma", de: "Bestätigen", fr: "Confirmer" },
  Continue: { it: "Continua", de: "Weiter", fr: "Continuer" },
  Back: { it: "Indietro", de: "Zurück", fr: "Retour" },
  Next: { it: "Avanti", de: "Weiter", fr: "Suivant" },
  Yes: { it: "Sì", de: "Ja", fr: "Oui" },
  No: { it: "No", de: "Nein", fr: "Non" },
  All: { it: "Tutti", de: "Alle", fr: "Tous" },
  None: { it: "Nessuno", de: "Keine", fr: "Aucun" },
  Name: { it: "Nome", de: "Name", fr: "Nom" },
  Description: { it: "Descrizione", de: "Beschreibung", fr: "Description" },
  Notes: { it: "Note", de: "Notizen", fr: "Notes" },
  Amount: { it: "Importo", de: "Betrag", fr: "Montant" },
  Date: { it: "Data", de: "Datum", fr: "Date" },
  Type: { it: "Tipo", de: "Typ", fr: "Type" },
  Account: { it: "Conto", de: "Konto", fr: "Compte" },
  Category: { it: "Categoria", de: "Kategorie", fr: "Catégorie" },
  Currency: { it: "Valuta", de: "Währung", fr: "Devise" },
  Income: { it: "Entrata", de: "Einnahme", fr: "Revenu" },
  Expense: { it: "Spesa", de: "Ausgabe", fr: "Dépense" },
  Balance: { it: "Saldo", de: "Kontostand", fr: "Solde" },
  Total: { it: "Totale", de: "Gesamt", fr: "Total" },
  Actions: { it: "Azioni", de: "Aktionen", fr: "Actions" },
  Optional: { it: "Facoltativo", de: "Optional", fr: "Facultatif" },
  "No data available": {
    it: "Nessun dato disponibile",
    de: "Keine Daten verfügbar",
    fr: "Aucune donnée disponible",
  },
  "Connection error": {
    it: "Errore di connessione",
    de: "Verbindungsfehler",
    fr: "Erreur de connexion",
  },
  "A budget already exists for this category and period": {
    it: "Esiste già un budget per questa categoria e questo periodo",
    de: "Für diese Kategorie und diesen Zeitraum ist bereits ein Budget vorhanden",
    fr: "Un budget existe déjà pour cette catégorie et cette période",
  },
  "A budget references a missing category": {
    it: "Un budget fa riferimento a una categoria mancante",
    de: "Ein Budget verweist auf eine fehlende Kategorie",
    fr: "Un budget fait référence à une catégorie manquante",
  },
  "A category with this name already exists": {
    it: "Esiste già una categoria con questo nome",
    de: "Eine Kategorie mit diesem Namen ist bereits vorhanden",
    fr: "Une catégorie portant ce nom existe déjà",
  },
  "A rule already exists for this keyword": {
    it: "Esiste già una regola per questa parola chiave",
    de: "Für dieses Schlüsselwort ist bereits eine Regel vorhanden",
    fr: "Une règle existe déjà pour ce mot-clé",
  },
  "Account not found": {
    it: "Conto non trovato",
    de: "Konto nicht gefunden",
    fr: "Compte introuvable",
  },
  "An account with this name already exists": {
    it: "Esiste già un conto con questo nome",
    de: "Ein Konto mit diesem Namen ist bereits vorhanden",
    fr: "Un compte portant ce nom existe déjà",
  },
  "At least one account must remain": {
    it: "Deve rimanere almeno un conto",
    de: "Mindestens ein Konto muss bestehen bleiben",
    fr: "Au moins un compte doit être conservé",
  },
  "Budget not found": {
    it: "Budget non trovato",
    de: "Budget nicht gefunden",
    fr: "Budget introuvable",
  },
  "Category not found": {
    it: "Categoria non trovata",
    de: "Kategorie nicht gefunden",
    fr: "Catégorie introuvable",
  },
  "Email is already registered": {
    it: "L’indirizzo email è già registrato",
    de: "Die E-Mail-Adresse ist bereits registriert",
    fr: "L’adresse e-mail est déjà enregistrée",
  },
  "Event not found": {
    it: "Evento non trovato",
    de: "Ereignis nicht gefunden",
    fr: "Événement introuvable",
  },
  "File too large (maximum 5 MB)": {
    it: "File troppo grande (massimo 5 MB)",
    de: "Datei zu groß (maximal 5 MB)",
    fr: "Fichier trop volumineux (5 Mo maximum)",
  },
  "Goal not found": {
    it: "Obiettivo non trovato",
    de: "Ziel nicht gefunden",
    fr: "Objectif introuvable",
  },
  "Import has already been undone": {
    it: "L’importazione è già stata annullata",
    de: "Der Import wurde bereits rückgängig gemacht",
    fr: "L’importation a déjà été annulée",
  },
  "Import not found": {
    it: "Importazione non trovata",
    de: "Import nicht gefunden",
    fr: "Importation introuvable",
  },
  "Incorrect confirmation email": {
    it: "Email di conferma errata",
    de: "Falsche Bestätigungs-E-Mail-Adresse",
    fr: "Adresse e-mail de confirmation incorrecte",
  },
  "Incorrect current password": {
    it: "Password attuale errata",
    de: "Aktuelles Passwort ist falsch",
    fr: "Mot de passe actuel incorrect",
  },
  "Initial setup failed": {
    it: "Configurazione iniziale non riuscita",
    de: "Ersteinrichtung fehlgeschlagen",
    fr: "Échec de la configuration initiale",
  },
  "Invalid account": {
    it: "Conto non valido",
    de: "Ungültiges Konto",
    fr: "Compte invalide",
  },
  "Invalid confirmation: enter the account email to continue": {
    it: "Conferma non valida: inserisci l’email dell’account per continuare",
    de: "Ungültige Bestätigung: Gib die E-Mail-Adresse des Kontos ein, um fortzufahren",
    fr: "Confirmation invalide : saisissez l’adresse e-mail du compte pour continuer",
  },
  "Invalid date parameters (YYYY-MM-DD)": {
    it: "Parametri data non validi (AAAA-MM-GG)",
    de: "Ungültige Datumsparameter (JJJJ-MM-TT)",
    fr: "Paramètres de date invalides (AAAA-MM-JJ)",
  },
  "Invalid request body": {
    it: "Contenuto della richiesta non valido",
    de: "Ungültiger Anfrageinhalt",
    fr: "Contenu de la requête invalide",
  },
  "Invalid data": {
    it: "Dati non validi",
    de: "Ungültige Daten",
    fr: "Données invalides",
  },
  "Invalid backup": {
    it: "Backup non valido",
    de: "Ungültige Sicherung",
    fr: "Sauvegarde invalide",
  },
  "Invalid request format": {
    it: "Formato della richiesta non valido",
    de: "Ungültiges Anfrageformat",
    fr: "Format de requête invalide",
  },
  "Invalid year or month": {
    it: "Anno o mese non valido",
    de: "Ungültiges Jahr oder ungültiger Monat",
    fr: "Année ou mois invalide",
  },
  "No account available": {
    it: "Nessun conto disponibile",
    de: "Kein Konto verfügbar",
    fr: "Aucun compte disponible",
  },
  "No file uploaded": {
    it: "Nessun file caricato",
    de: "Keine Datei hochgeladen",
    fr: "Aucun fichier envoyé",
  },
  "Registration unavailable": {
    it: "Registrazione non disponibile",
    de: "Registrierung nicht verfügbar",
    fr: "Inscription indisponible",
  },
  "Request too large": {
    it: "Richiesta troppo grande",
    de: "Anfrage zu groß",
    fr: "Requête trop volumineuse",
  },
  "Restore failed; no data was changed": {
    it: "Ripristino non riuscito; nessun dato è stato modificato",
    de: "Wiederherstellung fehlgeschlagen; es wurden keine Daten geändert",
    fr: "Échec de la restauration ; aucune donnée n’a été modifiée",
  },
  "Rule not found": {
    it: "Regola non trovata",
    de: "Regel nicht gefunden",
    fr: "Règle introuvable",
  },
  "Some rows were imported in the meantime; refresh the preview": {
    it: "Nel frattempo sono state importate alcune righe; aggiorna l’anteprima",
    de: "Inzwischen wurden einige Zeilen importiert; aktualisiere die Vorschau",
    fr: "Certaines lignes ont été importées entre-temps ; actualisez l’aperçu",
  },
  "Tag already exists": {
    it: "Il tag esiste già",
    de: "Tag ist bereits vorhanden",
    fr: "Le libellé existe déjà",
  },
  "Tag not found": {
    it: "Tag non trovato",
    de: "Tag nicht gefunden",
    fr: "Libellé introuvable",
  },
  "The CSV contains no valid rows": {
    it: "Il CSV non contiene righe valide",
    de: "Die CSV-Datei enthält keine gültigen Zeilen",
    fr: "Le fichier CSV ne contient aucune ligne valide",
  },
  "The backup contains duplicate data": {
    it: "Il backup contiene dati duplicati",
    de: "Die Sicherung enthält doppelte Daten",
    fr: "La sauvegarde contient des données en double",
  },
  "The end date must be after the start date": {
    it: "La data di fine deve essere successiva alla data di inizio",
    de: "Das Enddatum muss nach dem Startdatum liegen",
    fr: "La date de fin doit être postérieure à la date de début",
  },
  "The primary currency cannot be changed after adding balances or movements": {
    it: "La valuta principale non può essere cambiata dopo aver aggiunto saldi o movimenti",
    de: "Die Hauptwährung kann nach dem Hinzufügen von Kontoständen oder Transaktionen nicht mehr geändert werden",
    fr: "La devise principale ne peut plus être modifiée après l’ajout de soldes ou de mouvements",
  },
  "The transfer must involve the active account": {
    it: "Il trasferimento deve coinvolgere il conto attivo",
    de: "Die Umbuchung muss das aktive Konto betreffen",
    fr: "Le virement doit concerner le compte actif",
  },
  "This account contains data; move or delete it before removing the account": {
    it: "Questo conto contiene dati; spostali o eliminali prima di rimuovere il conto",
    de: "Dieses Konto enthält Daten; verschiebe oder lösche sie, bevor du das Konto entfernst",
    fr: "Ce compte contient des données ; déplacez-les ou supprimez-les avant de retirer le compte",
  },
  "Transaction not found": {
    it: "Movimento non trovato",
    de: "Transaktion nicht gefunden",
    fr: "Transaction introuvable",
  },
  Unauthorized: {
    it: "Non autorizzato",
    de: "Nicht autorisiert",
    fr: "Non autorisé",
  },
  "User not found": {
    it: "Utente non trovato",
    de: "Benutzer nicht gefunden",
    fr: "Utilisateur introuvable",
  },
  "Operation completed": {
    it: "Operazione completata",
    de: "Vorgang abgeschlossen",
    fr: "Opération terminée",
  },
  "Welcome back": {
    it: "Bentornato",
    de: "Willkommen zurück",
    fr: "Bon retour",
  },
  "Sign in to manage your finances": {
    it: "Accedi per gestire le tue finanze",
    de: "Melde dich an, um deine Finanzen zu verwalten",
    fr: "Connectez-vous pour gérer vos finances",
  },
  Email: { it: "Email", de: "E-Mail", fr: "E-mail" },
  Password: { it: "Password", de: "Passwort", fr: "Mot de passe" },
  "Sign in": { it: "Accedi", de: "Anmelden", fr: "Se connecter" },
  "Don't have an account?": {
    it: "Non hai un account?",
    de: "Du hast noch kein Konto?",
    fr: "Vous n'avez pas de compte ?",
  },
  Register: { it: "Registrati", de: "Registrieren", fr: "S'inscrire" },
  "Too many attempts. Try again in 15 minutes.": {
    it: "Troppi tentativi. Riprova tra 15 minuti.",
    de: "Zu viele Versuche. Versuche es in 15 Minuten erneut.",
    fr: "Trop de tentatives. Réessayez dans 15 minutes.",
  },
  "Invalid credentials": {
    it: "Credenziali non valide",
    de: "Ungültige Anmeldedaten",
    fr: "Identifiants invalides",
  },
  "Create your account": {
    it: "Crea il tuo account",
    de: "Erstelle dein Konto",
    fr: "Créez votre compte",
  },
  "Set up the administrator for this installation": {
    it: "Configura l'amministratore di questa installazione",
    de: "Richte den Administrator für diese Installation ein",
    fr: "Configurez l'administrateur de cette installation",
  },
  "Use at least 12 characters, preferably a long passphrase.": {
    it: "Usa almeno 12 caratteri, preferibilmente una frase di accesso lunga.",
    de: "Verwende mindestens 12 Zeichen, vorzugsweise eine lange Passphrase.",
    fr: "Utilisez au moins 12 caractères, de préférence une longue phrase secrète.",
  },
  "Already have an account?": {
    it: "Hai già un account?",
    de: "Du hast bereits ein Konto?",
    fr: "Vous avez déjà un compte ?",
  },
  "Password must be at least 12 characters": {
    it: "La password deve contenere almeno 12 caratteri",
    de: "Das Passwort muss mindestens 12 Zeichen lang sein",
    fr: "Le mot de passe doit comporter au moins 12 caractères",
  },
  "Registration failed": {
    it: "Registrazione non riuscita",
    de: "Registrierung fehlgeschlagen",
    fr: "Échec de l'inscription",
  },
  "Account created. You can now sign in.": {
    it: "Account creato. Ora puoi accedere.",
    de: "Konto erstellt. Du kannst dich jetzt anmelden.",
    fr: "Compte créé. Vous pouvez maintenant vous connecter.",
  },
  "Registration closed": {
    it: "Registrazione chiusa",
    de: "Registrierung geschlossen",
    fr: "Inscriptions fermées",
  },
  "This installation already has an administrator or is not accepting new registrations.": {
    it: "Questa installazione ha già un amministratore o non accetta nuove registrazioni.",
    de: "Diese Installation hat bereits einen Administrator oder akzeptiert keine neuen Registrierungen.",
    fr: "Cette installation possède déjà un administrateur ou n'accepte pas de nouvelles inscriptions.",
  },
  "If you manage this server, review and change REGISTRATION_MODE, then restart the application.": {
    it: "Se gestisci questo server, controlla e modifica REGISTRATION_MODE, quindi riavvia l'applicazione.",
    de: "Wenn du diesen Server verwaltest, prüfe und ändere REGISTRATION_MODE und starte die Anwendung neu.",
    fr: "Si vous gérez ce serveur, vérifiez et modifiez REGISTRATION_MODE, puis redémarrez l'application.",
  },
  "Back to sign in": {
    it: "Torna all'accesso",
    de: "Zurück zur Anmeldung",
    fr: "Retour à la connexion",
  },
  "Initial setup": {
    it: "Configurazione iniziale",
    de: "Ersteinrichtung",
    fr: "Configuration initiale",
  },
  Profile: { it: "Profilo", de: "Profil", fr: "Profil" },
  Review: { it: "Riepilogo", de: "Prüfen", fr: "Vérification" },
  "Set up your workspace": {
    it: "Configura il tuo spazio di lavoro",
    de: "Richte deinen Arbeitsbereich ein",
    fr: "Configurez votre espace de travail",
  },
  "Four steps, then you can start managing your accounts.": {
    it: "Quattro passaggi, poi potrai iniziare a gestire i tuoi conti.",
    de: "Vier Schritte, dann kannst du deine Konten verwalten.",
    fr: "Quatre étapes, puis vous pourrez commencer à gérer vos comptes.",
  },
  "Step {current} of {total}": {
    it: "Passaggio {current} di {total}",
    de: "Schritt {current} von {total}",
    fr: "Étape {current} sur {total}",
  },
  "Welcome to WallettuTrack": {
    it: "Benvenuto in WallettuTrack",
    de: "Willkommen bei WallettuTrack",
    fr: "Bienvenue dans WallettuTrack",
  },
  "Customize your profile and choose the currency used for totals and statistics.": {
    it: "Personalizza il profilo e scegli la valuta usata per totali e statistiche.",
    de: "Passe dein Profil an und wähle die Währung für Summen und Statistiken.",
    fr: "Personnalisez votre profil et choisissez la devise utilisée pour les totaux et les statistiques.",
  },
  "What should we call you?": {
    it: "Come dobbiamo chiamarti?",
    de: "Wie dürfen wir dich nennen?",
    fr: "Comment devons-nous vous appeler ?",
  },
  "Primary currency": {
    it: "Valuta principale",
    de: "Hauptwährung",
    fr: "Devise principale",
  },
  "Your first account": {
    it: "Il tuo primo conto",
    de: "Dein erstes Konto",
    fr: "Votre premier compte",
  },
  "This can be your bank, Revolut, or wallet. You can add more later.": {
    it: "Può essere la tua banca, Revolut o un portafoglio. Potrai aggiungerne altri in seguito.",
    de: "Das kann deine Bank, Revolut oder dein Portemonnaie sein. Später kannst du weitere hinzufügen.",
    fr: "Il peut s'agir de votre banque, Revolut ou de votre portefeuille. Vous pourrez en ajouter d'autres plus tard.",
  },
  "Account name": {
    it: "Nome del conto",
    de: "Kontoname",
    fr: "Nom du compte",
  },
  "Main account": {
    it: "Conto principale",
    de: "Hauptkonto",
    fr: "Compte principal",
  },
  "Current balance": {
    it: "Saldo attuale",
    de: "Aktueller Kontostand",
    fr: "Solde actuel",
  },
  "This is the starting point for forecasts. Negative balances are allowed.": {
    it: "Questo è il punto di partenza delle previsioni. Sono ammessi saldi negativi.",
    de: "Dies ist der Ausgangspunkt für Prognosen. Negative Salden sind zulässig.",
    fr: "C'est le point de départ des prévisions. Les soldes négatifs sont autorisés.",
  },
  "Choose your categories": {
    it: "Scegli le tue categorie",
    de: "Wähle deine Kategorien",
    fr: "Choisissez vos catégories",
  },
  "Keep only the useful ones. At least one expense and one income category are required.": {
    it: "Mantieni solo quelle utili. Sono richieste almeno una categoria di spesa e una di entrata.",
    de: "Behalte nur die nützlichen. Mindestens eine Ausgaben- und eine Einnahmenkategorie ist erforderlich.",
    fr: "Ne conservez que les catégories utiles. Au moins une catégorie de dépense et une de revenu est requise.",
  },
  Expenses: { it: "Spese", de: "Ausgaben", fr: "Dépenses" },
  "All set": { it: "Tutto pronto", de: "Alles bereit", fr: "Tout est prêt" },
  "Review the summary. You can change these choices later in Settings.": {
    it: "Controlla il riepilogo. Potrai cambiare queste scelte in seguito nelle Impostazioni.",
    de: "Prüfe die Zusammenfassung. Du kannst diese Auswahl später in den Einstellungen ändern.",
    fr: "Vérifiez le récapitulatif. Vous pourrez modifier ces choix plus tard dans les Paramètres.",
  },
  "Initial balance": {
    it: "Saldo iniziale",
    de: "Anfangssaldo",
    fr: "Solde initial",
  },
  "{count} selected": {
    it: "{count} selezionate",
    de: "{count} ausgewählt",
    fr: "{count} sélectionnées",
  },
  "Get started": { it: "Inizia", de: "Loslegen", fr: "Commencer" },
  "Select all": {
    it: "Seleziona tutte",
    de: "Alle auswählen",
    fr: "Tout sélectionner",
  },
  "Deselect all": {
    it: "Deseleziona tutte",
    de: "Alle abwählen",
    fr: "Tout désélectionner",
  },
  "Enter your name": {
    it: "Inserisci il tuo nome",
    de: "Gib deinen Namen ein",
    fr: "Saisissez votre nom",
  },
  "Enter an account name": {
    it: "Inserisci un nome per il conto",
    de: "Gib einen Kontonamen ein",
    fr: "Saisissez un nom de compte",
  },
  "Enter a valid balance": {
    it: "Inserisci un saldo valido",
    de: "Gib einen gültigen Kontostand ein",
    fr: "Saisissez un solde valide",
  },
  "Choose at least one expense category": {
    it: "Scegli almeno una categoria di spesa",
    de: "Wähle mindestens eine Ausgabenkategorie",
    fr: "Choisissez au moins une catégorie de dépense",
  },
  "Choose at least one income category": {
    it: "Scegli almeno una categoria di entrata",
    de: "Wähle mindestens eine Einnahmenkategorie",
    fr: "Choisissez au moins une catégorie de revenu",
  },
  "Setup failed": {
    it: "Configurazione non riuscita",
    de: "Einrichtung fehlgeschlagen",
    fr: "Échec de la configuration",
  },
  "Setup completed": {
    it: "Configurazione completata",
    de: "Einrichtung abgeschlossen",
    fr: "Configuration terminée",
  },
  "Page not found": {
    it: "Pagina non trovata",
    de: "Seite nicht gefunden",
    fr: "Page introuvable",
  },
  "The page you are looking for does not exist or has been moved.": {
    it: "La pagina che cerchi non esiste o è stata spostata.",
    de: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
    fr: "La page recherchée n'existe pas ou a été déplacée.",
  },
  "Back to dashboard": {
    it: "Torna alla panoramica",
    de: "Zurück zur Übersicht",
    fr: "Retour au tableau de bord",
  },
  "An unexpected error occurred while loading. Your data is safe — try again.": {
    it: "Si è verificato un errore imprevisto durante il caricamento. I tuoi dati sono al sicuro: riprova.",
    de: "Beim Laden ist ein unerwarteter Fehler aufgetreten. Deine Daten sind sicher – versuche es erneut.",
    fr: "Une erreur inattendue s'est produite pendant le chargement. Vos données sont en sécurité — réessayez.",
  },
  Notifications: { it: "Notifiche", de: "Benachrichtigungen", fr: "Notifications" },
  "Unread notifications ({count})": {
    it: "Notifiche non lette ({count})",
    de: "Ungelesene Benachrichtigungen ({count})",
    fr: "Notifications non lues ({count})",
  },
  "Mark all as read": {
    it: "Segna tutte come lette",
    de: "Alle als gelesen markieren",
    fr: "Tout marquer comme lu",
  },
  "All clear ✨ No alerts for the active account.": {
    it: "Tutto a posto ✨ Nessun avviso per il conto attivo.",
    de: "Alles in Ordnung ✨ Keine Hinweise für das aktive Konto.",
    fr: "Tout va bien ✨ Aucune alerte pour le compte actif.",
  },
  "Low balance in {account}": {
    it: "Saldo basso su {account}",
    de: "Niedriger Kontostand bei {account}",
    fr: "Solde faible sur {account}",
  },
  "{balance} is below the {threshold} threshold": {
    it: "{balance} è inferiore alla soglia di {threshold}",
    de: "{balance} liegt unter dem Schwellenwert von {threshold}",
    fr: "{balance} est inférieur au seuil de {threshold}",
  },
  "{category}: budget at {percent}%": {
    it: "{category}: budget al {percent}%",
    de: "{category}: Budget bei {percent} %",
    fr: "{category} : budget à {percent} %",
  },
  "{spent} of {limit} this month": {
    it: "{spent} su {limit} questo mese",
    de: "{spent} von {limit} in diesem Monat",
    fr: "{spent} sur {limit} ce mois-ci",
  },
  "Planned event": {
    it: "Evento pianificato",
    de: "Geplantes Ereignis",
    fr: "Événement planifié",
  },
  "{description} is today": {
    it: "{description} è oggi",
    de: "{description} ist heute",
    fr: "{description} a lieu aujourd’hui",
  },
  "{description} on {date}": {
    it: "{description} il {date}",
    de: "{description} am {date}",
    fr: "{description} le {date}",
  },
  "{name}: overdue ({date})": {
    it: "{name}: scaduto ({date})",
    de: "{name}: überfällig ({date})",
    fr: "{name} : en retard ({date})",
  },
  "{name}: due soon ({date})": {
    it: "{name}: scadenza imminente ({date})",
    de: "{name}: bald fällig ({date})",
    fr: "{name} : bientôt à échéance ({date})",
  },
  "{description} price increase": {
    it: "Aumento di prezzo per {description}",
    de: "Preiserhöhung bei {description}",
    fr: "Augmentation du prix de {description}",
  },
  "New amount {amount} (+{percent}%)": {
    it: "Nuovo importo {amount} (+{percent}%)",
    de: "Neuer Betrag {amount} (+{percent} %)",
    fr: "Nouveau montant {amount} (+{percent} %)",
  },
  "Enter a valid amount": {
    it: "Inserisci un importo valido",
    de: "Gib einen gültigen Betrag ein",
    fr: "Saisissez un montant valide",
  },
  "Save failed": {
    it: "Salvataggio non riuscito",
    de: "Speichern fehlgeschlagen",
    fr: "Échec de l'enregistrement",
  },
  "Transaction updated": {
    it: "Movimento aggiornato",
    de: "Transaktion aktualisiert",
    fr: "Transaction mise à jour",
  },
  "Transaction saved": {
    it: "Movimento salvato",
    de: "Transaktion gespeichert",
    fr: "Transaction enregistrée",
  },
  "Edit transaction": {
    it: "Modifica movimento",
    de: "Transaktion bearbeiten",
    fr: "Modifier la transaction",
  },
  "Duplicate transaction": {
    it: "Duplica movimento",
    de: "Transaktion duplizieren",
    fr: "Dupliquer la transaction",
  },
  "Update the transaction details.": {
    it: "Aggiorna i dettagli del movimento.",
    de: "Aktualisiere die Transaktionsdetails.",
    fr: "Mettez à jour les détails de la transaction.",
  },
  "Copy of the transaction dated today: edit and save it.": {
    it: "Copia del movimento con la data di oggi: modificala e salvala.",
    de: "Kopie der Transaktion mit heutigem Datum: bearbeiten und speichern.",
    fr: "Copie de la transaction datée d'aujourd'hui : modifiez-la et enregistrez-la.",
  },
  "Record an expense or income transaction.": {
    it: "Registra un movimento di spesa o entrata.",
    de: "Erfasse eine Ausgabe oder Einnahme.",
    fr: "Enregistrez une dépense ou un revenu.",
  },
  "Select a category": {
    it: "Seleziona una categoria",
    de: "Kategorie auswählen",
    fr: "Sélectionner une catégorie",
  },
  "For example, grocery shopping": {
    it: "Ad esempio, spesa al supermercato",
    de: "Zum Beispiel Lebensmitteleinkauf",
    fr: "Par exemple, courses alimentaires",
  },
  "Tags and projects": {
    it: "Tag e progetti",
    de: "Tags und Projekte",
    fr: "Tags et projets",
  },
  Note: { it: "Nota", de: "Notiz", fr: "Note" },
  "Could not load transactions": {
    it: "Impossibile caricare i movimenti",
    de: "Transaktionen konnten nicht geladen werden",
    fr: "Impossible de charger les transactions",
  },
  "Deletion failed": {
    it: "Eliminazione non riuscita",
    de: "Löschen fehlgeschlagen",
    fr: "Échec de la suppression",
  },
  "Transaction deleted": {
    it: "Movimento eliminato",
    de: "Transaktion gelöscht",
    fr: "Transaction supprimée",
  },
  "Search description or notes…": {
    it: "Cerca nella descrizione o nelle note…",
    de: "Beschreibung oder Notizen durchsuchen…",
    fr: "Rechercher dans la description ou les notes…",
  },
  "All types": { it: "Tutti i tipi", de: "Alle Typen", fr: "Tous les types" },
  "All categories": {
    it: "Tutte le categorie",
    de: "Alle Kategorien",
    fr: "Toutes les catégories",
  },
  Tag: { it: "Tag", de: "Tag", fr: "Tag" },
  "All tags": { it: "Tutti i tag", de: "Alle Tags", fr: "Tous les tags" },
  From: { it: "Da", de: "Von", fr: "Du" },
  To: { it: "A", de: "Bis", fr: "Au" },
  "{count} forecast transactions included in the list (yellow dashed styling) — not yet occurred and generated by recurrence rules.": {
    it: "{count} movimenti previsti inclusi nell'elenco (stile tratteggiato giallo): non ancora avvenuti e generati dalle regole di ricorrenza.",
    de: "{count} prognostizierte Transaktionen in der Liste (gelb gestrichelt) – noch nicht erfolgt und durch Wiederholungsregeln erzeugt.",
    fr: "{count} transactions prévisionnelles incluses dans la liste (style jaune en pointillés) — pas encore effectuées et générées par les règles de récurrence.",
  },
  "Loading…": { it: "Caricamento…", de: "Wird geladen…", fr: "Chargement…" },
  "No transactions found.": {
    it: "Nessun movimento trovato.",
    de: "Keine Transaktionen gefunden.",
    fr: "Aucune transaction trouvée.",
  },
  "In {currency}": {
    it: "In {currency}",
    de: "In {currency}",
    fr: "En {currency}",
  },
  forecast: { it: "previsto", de: "Prognose", fr: "prévision" },
  Recurring: { it: "Ricorrente", de: "Wiederkehrend", fr: "Récurrent" },
  "Manage recurrence rule": {
    it: "Gestisci regola di ricorrenza",
    de: "Wiederholungsregel verwalten",
    fr: "Gérer la règle de récurrence",
  },
  "Manage the recurrence rule that generates this forecast": {
    it: "Gestisci la regola di ricorrenza che genera questa previsione",
    de: "Verwalte die Wiederholungsregel, die diese Prognose erzeugt",
    fr: "Gérer la règle de récurrence qui génère cette prévision",
  },
  Duplicate: { it: "Duplica", de: "Duplizieren", fr: "Dupliquer" },
  "Duplicate with today's date": {
    it: "Duplica con la data di oggi",
    de: "Mit heutigem Datum duplizieren",
    fr: "Dupliquer avec la date d'aujourd'hui",
  },
  "{total} results · page {page}/{pages}": {
    it: "{total} risultati · pagina {page}/{pages}",
    de: "{total} Ergebnisse · Seite {page}/{pages}",
    fr: "{total} résultats · page {page}/{pages}",
  },
  "Delete this transaction?": {
    it: "Eliminare questo movimento?",
    de: "Diese Transaktion löschen?",
    fr: "Supprimer cette transaction ?",
  },
  "This action cannot be undone.": {
    it: "Questa azione non può essere annullata.",
    de: "Diese Aktion kann nicht rückgängig gemacht werden.",
    fr: "Cette action est irréversible.",
  },
  Daily: { it: "Giornaliera", de: "Täglich", fr: "Quotidienne" },
  Weekly: { it: "Settimanale", de: "Wöchentlich", fr: "Hebdomadaire" },
  Monthly: { it: "Mensile", de: "Monatlich", fr: "Mensuelle" },
  Yearly: { it: "Annuale", de: "Jährlich", fr: "Annuelle" },
  daily: { it: "giornaliera", de: "täglich", fr: "quotidienne" },
  weekly: { it: "settimanale", de: "wöchentlich", fr: "hebdomadaire" },
  monthly: { it: "mensile", de: "monatlich", fr: "mensuelle" },
  yearly: { it: "annuale", de: "jährlich", fr: "annuelle" },
  "Every day": { it: "Ogni giorno", de: "Jeden Tag", fr: "Chaque jour" },
  "Every {count} days": {
    it: "Ogni {count} giorni",
    de: "Alle {count} Tage",
    fr: "Tous les {count} jours",
  },
  "Every week{days}": {
    it: "Ogni settimana{days}",
    de: "Jede Woche{days}",
    fr: "Chaque semaine{days}",
  },
  "Every {count} weeks{days}": {
    it: "Ogni {count} settimane{days}",
    de: "Alle {count} Wochen{days}",
    fr: "Toutes les {count} semaines{days}",
  },
  "Day {day} of each month": {
    it: "Giorno {day} di ogni mese",
    de: "Tag {day} jedes Monats",
    fr: "Le {day} de chaque mois",
  },
  "Every {count} months · day {day}": {
    it: "Ogni {count} mesi · giorno {day}",
    de: "Alle {count} Monate · Tag {day}",
    fr: "Tous les {count} mois · jour {day}",
  },
  "Every {count} years · {month} {day}": {
    it: "Ogni {count} anni · {day} {month}",
    de: "Alle {count} Jahre · {day}. {month}",
    fr: "Tous les {count} ans · {day} {month}",
  },
  "Select a start date": {
    it: "Seleziona una data di inizio",
    de: "Wähle ein Startdatum",
    fr: "Sélectionnez une date de début",
  },
  "Select at least one day of the week": {
    it: "Seleziona almeno un giorno della settimana",
    de: "Wähle mindestens einen Wochentag",
    fr: "Sélectionnez au moins un jour de la semaine",
  },
  "Rule updated": {
    it: "Regola aggiornata",
    de: "Regel aktualisiert",
    fr: "Règle mise à jour",
  },
  "Rule created": {
    it: "Regola creata",
    de: "Regel erstellt",
    fr: "Règle créée",
  },
  "Update failed": {
    it: "Aggiornamento non riuscito",
    de: "Aktualisierung fehlgeschlagen",
    fr: "Échec de la mise à jour",
  },
  "Delete the rule \"{name}\"? Previously generated transactions will remain.": {
    it: "Eliminare la regola \"{name}\"? I movimenti generati in precedenza resteranno invariati.",
    de: "Regel \"{name}\" löschen? Bereits erzeugte Transaktionen bleiben erhalten.",
    fr: "Supprimer la règle \"{name}\" ? Les transactions déjà générées seront conservées.",
  },
  "Rule deleted": {
    it: "Regola eliminata",
    de: "Regel gelöscht",
    fr: "Règle supprimée",
  },
  "Recurring transactions": {
    it: "Movimenti ricorrenti",
    de: "Wiederkehrende Transaktionen",
    fr: "Transactions récurrentes",
  },
  "Subscriptions, rent, salaries, and more, generated automatically when due": {
    it: "Abbonamenti, affitto, stipendi e altro, generati automaticamente alla scadenza",
    de: "Abonnements, Miete, Gehälter und mehr, bei Fälligkeit automatisch erzeugt",
    fr: "Abonnements, loyer, salaires et plus encore, générés automatiquement à l'échéance",
  },
  "New rule": { it: "Nuova regola", de: "Neue Regel", fr: "Nouvelle règle" },
  "No recurrence rules. Create one to automate periodic transactions.": {
    it: "Nessuna regola di ricorrenza. Creane una per automatizzare i movimenti periodici.",
    de: "Keine Wiederholungsregeln. Erstelle eine, um regelmäßige Transaktionen zu automatisieren.",
    fr: "Aucune règle de récurrence. Créez-en une pour automatiser les transactions périodiques.",
  },
  "Recurring item": {
    it: "Movimento ricorrente",
    de: "Wiederkehrender Posten",
    fr: "Opération récurrente",
  },
  paused: { it: "in pausa", de: "pausiert", fr: "en pause" },
  "{schedule} · from {start}": {
    it: "{schedule} · dal {start}",
    de: "{schedule} · ab {start}",
    fr: "{schedule} · à partir du {start}",
  },
  " to {end}": { it: " al {end}", de: " bis {end}", fr: " au {end}" },
  " · last: {date}": {
    it: " · ultimo: {date}",
    de: " · zuletzt: {date}",
    fr: " · dernière : {date}",
  },
  Pause: { it: "Metti in pausa", de: "Pausieren", fr: "Mettre en pause" },
  Enable: { it: "Attiva", de: "Aktivieren", fr: "Activer" },
  "Edit rule": { it: "Modifica regola", de: "Regel bearbeiten", fr: "Modifier la règle" },
  "New recurrence rule": {
    it: "Nuova regola di ricorrenza",
    de: "Neue Wiederholungsregel",
    fr: "Nouvelle règle de récurrence",
  },
  "Transactions are generated automatically when their date arrives.": {
    it: "I movimenti vengono generati automaticamente alla data prevista.",
    de: "Transaktionen werden zum vorgesehenen Datum automatisch erzeugt.",
    fr: "Les transactions sont générées automatiquement à la date prévue.",
  },
  "For example, rent": {
    it: "Ad esempio, affitto",
    de: "Zum Beispiel Miete",
    fr: "Par exemple, loyer",
  },
  Frequency: { it: "Frequenza", de: "Häufigkeit", fr: "Fréquence" },
  "Repeat every": {
    it: "Ripeti ogni",
    de: "Wiederholen alle",
    fr: "Répéter tous les",
  },
  day: { it: "giorno", de: "Tag", fr: "jour" },
  days: { it: "giorni", de: "Tage", fr: "jours" },
  week: { it: "settimana", de: "Woche", fr: "semaine" },
  weeks: { it: "settimane", de: "Wochen", fr: "semaines" },
  month: { it: "mese", de: "Monat", fr: "mois" },
  months: { it: "mesi", de: "Monate", fr: "mois" },
  year: { it: "anno", de: "Jahr", fr: "an" },
  years: { it: "anni", de: "Jahre", fr: "ans" },
  "Days of the week": {
    it: "Giorni della settimana",
    de: "Wochentage",
    fr: "Jours de la semaine",
  },
  "Day of the month": {
    it: "Giorno del mese",
    de: "Tag des Monats",
    fr: "Jour du mois",
  },
  "Shorter months use their final day.": {
    it: "Per i mesi più brevi viene usato l'ultimo giorno.",
    de: "Bei kürzeren Monaten wird der letzte Tag verwendet.",
    fr: "Le dernier jour est utilisé pour les mois plus courts.",
  },
  Month: { it: "Mese", de: "Monat", fr: "Mois" },
  Day: { it: "Giorno", de: "Tag", fr: "Jour" },
  Start: { it: "Inizio", de: "Beginn", fr: "Début" },
  "End (optional)": {
    it: "Fine (facoltativa)",
    de: "Ende (optional)",
    fr: "Fin (facultative)",
  },
  "Active rule": {
    it: "Regola attiva",
    de: "Aktive Regel",
    fr: "Règle active",
  },
  "Select a date": {
    it: "Seleziona una data",
    de: "Wähle ein Datum",
    fr: "Sélectionnez une date",
  },
  "Invalid amount": {
    it: "Importo non valido",
    de: "Ungültiger Betrag",
    fr: "Montant invalide",
  },
  "Event updated": {
    it: "Evento aggiornato",
    de: "Ereignis aktualisiert",
    fr: "Événement mis à jour",
  },
  "Event scheduled": {
    it: "Evento pianificato",
    de: "Ereignis geplant",
    fr: "Événement planifié",
  },
  "Delete the event \"{name}\"?": {
    it: "Eliminare l'evento \"{name}\"?",
    de: "Ereignis \"{name}\" löschen?",
    fr: "Supprimer l'événement \"{name}\" ?",
  },
  "Event deleted": {
    it: "Evento eliminato",
    de: "Ereignis gelöscht",
    fr: "Événement supprimé",
  },
  "Planned events": {
    it: "Eventi pianificati",
    de: "Geplante Ereignisse",
    fr: "Événements planifiés",
  },
  "One-off future expenses or income, such as annual tax, insurance, or gifts. They become real transactions on the selected date.": {
    it: "Spese o entrate future una tantum, come tassa annuale, assicurazione o regali. Diventano movimenti reali alla data selezionata.",
    de: "Einmalige zukünftige Ausgaben oder Einnahmen wie Jahressteuer, Versicherung oder Geschenke. Am gewählten Datum werden sie zu echten Transaktionen.",
    fr: "Dépenses ou revenus futurs ponctuels, comme une taxe annuelle, une assurance ou des cadeaux. Ils deviennent des transactions réelles à la date choisie.",
  },
  "New event": { it: "Nuovo evento", de: "Neues Ereignis", fr: "Nouvel événement" },
  "No planned events.": {
    it: "Nessun evento pianificato.",
    de: "Keine geplanten Ereignisse.",
    fr: "Aucun événement planifié.",
  },
  " · due today": {
    it: " · scade oggi",
    de: " · heute fällig",
    fr: " · dû aujourd'hui",
  },
  "Edit event": {
    it: "Modifica evento",
    de: "Ereignis bearbeiten",
    fr: "Modifier l'événement",
  },
  "New planned event": {
    it: "Nuovo evento pianificato",
    de: "Neues geplantes Ereignis",
    fr: "Nouvel événement planifié",
  },
  "One-off: it will be converted into a transaction on the selected date.": {
    it: "Una tantum: verrà convertito in un movimento alla data selezionata.",
    de: "Einmalig: Am gewählten Datum wird es in eine Transaktion umgewandelt.",
    fr: "Ponctuel : il sera converti en transaction à la date choisie.",
  },
  "For example, annual car tax": {
    it: "Ad esempio, bollo auto annuale",
    de: "Zum Beispiel jährliche Kfz-Steuer",
    fr: "Par exemple, taxe automobile annuelle",
  },
  "Event date": { it: "Data dell'evento", de: "Ereignisdatum", fr: "Date de l'événement" },
  "Could not create recurrence": {
    it: "Impossibile creare la ricorrenza",
    de: "Wiederholung konnte nicht erstellt werden",
    fr: "Impossible de créer la récurrence",
  },
  "Subscription added to recurring items": {
    it: "Abbonamento aggiunto ai movimenti ricorrenti",
    de: "Abonnement zu wiederkehrenden Posten hinzugefügt",
    fr: "Abonnement ajouté aux opérations récurrentes",
  },
  "Detected subscriptions": {
    it: "Abbonamenti rilevati",
    de: "Erkannte Abonnements",
    fr: "Abonnements détectés",
  },
  "Detected automatically from consistent descriptions, dates, and amounts.": {
    it: "Rilevati automaticamente da descrizioni, date e importi coerenti.",
    de: "Automatisch anhand gleichbleibender Beschreibungen, Daten und Beträge erkannt.",
    fr: "Détectés automatiquement à partir de descriptions, dates et montants cohérents.",
  },
  "Analyzing movements…": {
    it: "Analisi dei movimenti…",
    de: "Transaktionen werden analysiert…",
    fr: "Analyse des mouvements…",
  },
  "No sufficiently regular subscriptions detected.": {
    it: "Nessun abbonamento sufficientemente regolare rilevato.",
    de: "Keine ausreichend regelmäßigen Abonnements erkannt.",
    fr: "Aucun abonnement suffisamment régulier détecté.",
  },
  "{frequency}{interval} · {count} charges · next {date}": {
    it: "{frequency}{interval} · {count} addebiti · prossimo {date}",
    de: "{frequency}{interval} · {count} Abbuchungen · nächste am {date}",
    fr: "{frequency}{interval} · {count} prélèvements · prochain le {date}",
  },
  " every {count}": {
    it: " ogni {count}",
    de: " alle {count}",
    fr: " tous les {count}",
  },
  "Already tracked": {
    it: "Già monitorato",
    de: "Bereits erfasst",
    fr: "Déjà suivi",
  },
  "Create recurrence": {
    it: "Crea ricorrenza",
    de: "Wiederholung erstellen",
    fr: "Créer une récurrence",
  },
  "Enter a name": {
    it: "Inserisci un nome",
    de: "Gib einen Namen ein",
    fr: "Saisissez un nom",
  },
  "Creation failed": {
    it: "Creazione non riuscita",
    de: "Erstellung fehlgeschlagen",
    fr: "Échec de la création",
  },
  "Account added": {
    it: "Conto aggiunto",
    de: "Konto hinzugefügt",
    fr: "Compte ajouté",
  },
  "Balance for \"{name}\" updated": {
    it: "Saldo di \"{name}\" aggiornato",
    de: "Kontostand für \"{name}\" aktualisiert",
    fr: "Solde de \"{name}\" mis à jour",
  },
  "Delete the account \"{name}\"? This is allowed only when it contains no data.": {
    it: "Eliminare il conto \"{name}\"? È possibile solo se non contiene dati.",
    de: "Konto \"{name}\" löschen? Dies ist nur möglich, wenn es keine Daten enthält.",
    fr: "Supprimer le compte \"{name}\" ? Cela n'est possible que s'il ne contient aucune donnée.",
  },
  "Account deleted": {
    it: "Conto eliminato",
    de: "Konto gelöscht",
    fr: "Compte supprimé",
  },
  "Settings saved": {
    it: "Impostazioni salvate",
    de: "Einstellungen gespeichert",
    fr: "Paramètres enregistrés",
  },
  "The new passwords do not match": {
    it: "Le nuove password non corrispondono",
    de: "Die neuen Passwörter stimmen nicht überein",
    fr: "Les nouveaux mots de passe ne correspondent pas",
  },
  "Password change failed": {
    it: "Modifica della password non riuscita",
    de: "Passwortänderung fehlgeschlagen",
    fr: "Échec de la modification du mot de passe",
  },
  "Password updated": {
    it: "Password aggiornata",
    de: "Passwort aktualisiert",
    fr: "Mot de passe mis à jour",
  },
  "Enter the correct email address to confirm": {
    it: "Inserisci l'indirizzo email corretto per confermare",
    de: "Gib zur Bestätigung die richtige E-Mail-Adresse ein",
    fr: "Saisissez l'adresse e-mail correcte pour confirmer",
  },
  "Account deleted. Goodbye!": {
    it: "Account eliminato. A presto!",
    de: "Konto gelöscht. Auf Wiedersehen!",
    fr: "Compte supprimé. Au revoir !",
  },
  "Restoring will replace all current data with the backup. Continue?": {
    it: "Il ripristino sostituirà tutti i dati attuali con il backup. Continuare?",
    de: "Die Wiederherstellung ersetzt alle aktuellen Daten durch die Sicherung. Fortfahren?",
    fr: "La restauration remplacera toutes les données actuelles par la sauvegarde. Continuer ?",
  },
  "The backup exceeds the 15 MB limit": {
    it: "Il backup supera il limite di 15 MB",
    de: "Die Sicherung überschreitet das Limit von 15 MB",
    fr: "La sauvegarde dépasse la limite de 15 Mo",
  },
  "Restore failed": {
    it: "Ripristino non riuscito",
    de: "Wiederherstellung fehlgeschlagen",
    fr: "Échec de la restauration",
  },
  "Backup restored: {count} transactions": {
    it: "Backup ripristinato: {count} movimenti",
    de: "Sicherung wiederhergestellt: {count} Transaktionen",
    fr: "Sauvegarde restaurée : {count} transactions",
  },
  "Invalid JSON backup file": {
    it: "File di backup JSON non valido",
    de: "Ungültige JSON-Sicherungsdatei",
    fr: "Fichier de sauvegarde JSON invalide",
  },
  "The currency is locked because balances or movements already exist; changing it would reinterpret historical data.": {
    it: "La valuta è bloccata perché esistono già saldi o movimenti; cambiarla reinterpretarebbe i dati storici.",
    de: "Die Währung ist gesperrt, da bereits Salden oder Transaktionen vorhanden sind; eine Änderung würde historische Daten neu interpretieren.",
    fr: "La devise est verrouillée car des soldes ou des mouvements existent déjà ; la modifier réinterpréterait les données historiques.",
  },
  "Transactions in other currencies are converted to this currency for totals and statistics.": {
    it: "I movimenti in altre valute vengono convertiti in questa valuta per totali e statistiche.",
    de: "Transaktionen in anderen Währungen werden für Summen und Statistiken in diese Währung umgerechnet.",
    fr: "Les transactions dans d'autres devises sont converties dans cette devise pour les totaux et les statistiques.",
  },
  "Save profile": {
    it: "Salva profilo",
    de: "Profil speichern",
    fr: "Enregistrer le profil",
  },
  Accounts: { it: "Conti", de: "Konten", fr: "Comptes" },
  "Keep balances and movements separate for Revolut, banks, cash, and other accounts. Use the top-bar selector to switch the account shown throughout the app.": {
    it: "Mantieni separati saldi e movimenti di Revolut, banche, contanti e altri conti. Usa il selettore nella barra superiore per cambiare il conto mostrato nell'app.",
    de: "Halte Salden und Transaktionen für Revolut, Banken, Bargeld und andere Konten getrennt. Mit der Auswahl in der oberen Leiste wechselst du das angezeigte Konto in der gesamten App.",
    fr: "Séparez les soldes et mouvements de Revolut, des banques, des espèces et des autres comptes. Utilisez le sélecteur de la barre supérieure pour changer le compte affiché dans toute l'application.",
  },
  "Balance {name}": {
    it: "Saldo {name}",
    de: "Kontostand {name}",
    fr: "Solde {name}",
  },
  "Delete {name}": {
    it: "Elimina {name}",
    de: "{name} löschen",
    fr: "Supprimer {name}",
  },
  "Total across accounts:": {
    it: "Totale di tutti i conti:",
    de: "Gesamt über alle Konten:",
    fr: "Total de tous les comptes :",
  },
  "Account name (for example, Revolut)": {
    it: "Nome del conto (ad esempio, Revolut)",
    de: "Kontoname (zum Beispiel Revolut)",
    fr: "Nom du compte (par exemple, Revolut)",
  },
  "Add account": {
    it: "Aggiungi conto",
    de: "Konto hinzufügen",
    fr: "Ajouter un compte",
  },
  "Reconcile active account": {
    it: "Riconcilia il conto attivo",
    de: "Aktives Konto abgleichen",
    fr: "Rapprocher le compte actif",
  },
  "Data export": {
    it: "Esportazione dati",
    de: "Datenexport",
    fr: "Exportation des données",
  },
  "Download all transactions as CSV, compatible with Excel and Google Sheets.": {
    it: "Scarica tutti i movimenti in CSV, compatibile con Excel e Google Sheets.",
    de: "Lade alle Transaktionen als CSV herunter, kompatibel mit Excel und Google Sheets.",
    fr: "Téléchargez toutes les transactions au format CSV, compatible avec Excel et Google Sheets.",
  },
  "Export CSV": { it: "Esporta CSV", de: "CSV exportieren", fr: "Exporter en CSV" },
  Security: { it: "Sicurezza", de: "Sicherheit", fr: "Sécurité" },
  "Change your sign-in password": {
    it: "Cambia la password di accesso",
    de: "Ändere dein Anmeldepasswort",
    fr: "Modifiez votre mot de passe de connexion",
  },
  "Current password": {
    it: "Password attuale",
    de: "Aktuelles Passwort",
    fr: "Mot de passe actuel",
  },
  "Enter your current password": {
    it: "Inserisci la password attuale",
    de: "Gib dein aktuelles Passwort ein",
    fr: "Saisissez votre mot de passe actuel",
  },
  "Invalid confirmation": {
    it: "Conferma non valida",
    de: "Ungültige Bestätigung",
    fr: "Confirmation non valide",
  },
  "Invalid saved amount": {
    it: "Importo risparmiato non valido",
    de: "Ungültiger Sparbetrag",
    fr: "Montant épargné non valide",
  },
  "The amount cannot be converted to the primary currency": {
    it: "L'importo non può essere convertito nella valuta principale",
    de: "Der Betrag kann nicht in die Hauptwährung umgerechnet werden",
    fr: "Le montant ne peut pas être converti dans la devise principale",
  },
  "The amount cannot be stored in the primary currency": {
    it: "L'importo non può essere salvato nella valuta principale",
    de: "Der Betrag kann nicht in der Hauptwährung gespeichert werden",
    fr: "Le montant ne peut pas être enregistré dans la devise principale",
  },
  "The requested total would exceed an account's supported balance range": {
    it: "Il totale richiesto supererebbe l'intervallo di saldo supportato da un conto",
    de: "Die angeforderte Summe würde den unterstützten Kontostandsbereich überschreiten",
    fr: "Le total demandé dépasserait la plage de solde prise en charge par un compte",
  },
  "New password": { it: "Nuova password", de: "Neues Passwort", fr: "Nouveau mot de passe" },
  "Confirm new password": {
    it: "Conferma nuova password",
    de: "Neues Passwort bestätigen",
    fr: "Confirmer le nouveau mot de passe",
  },
  "Update password": {
    it: "Aggiorna password",
    de: "Passwort aktualisieren",
    fr: "Mettre à jour le mot de passe",
  },
  "Danger zone": { it: "Zona pericolosa", de: "Gefahrenbereich", fr: "Zone sensible" },
  "Irreversible actions. Export a backup first if you are unsure.": {
    it: "Azioni irreversibili. Se hai dubbi, esporta prima un backup.",
    de: "Nicht umkehrbare Aktionen. Exportiere im Zweifel zuerst eine Sicherung.",
    fr: "Actions irréversibles. En cas de doute, exportez d'abord une sauvegarde.",
  },
  "Complete backup (JSON)": {
    it: "Backup completo (JSON)",
    de: "Vollständige Sicherung (JSON)",
    fr: "Sauvegarde complète (JSON)",
  },
  "All your data in a readable file.": {
    it: "Tutti i tuoi dati in un file leggibile.",
    de: "Alle deine Daten in einer lesbaren Datei.",
    fr: "Toutes vos données dans un fichier lisible.",
  },
  "Download backup": {
    it: "Scarica backup",
    de: "Sicherung herunterladen",
    fr: "Télécharger la sauvegarde",
  },
  "Restore JSON backup": {
    it: "Ripristina backup JSON",
    de: "JSON-Sicherung wiederherstellen",
    fr: "Restaurer une sauvegarde JSON",
  },
  "Replaces categories, transactions, accounts, budgets, goals, recurring items, and events with the file contents.": {
    it: "Sostituisce categorie, movimenti, conti, budget, obiettivi, elementi ricorrenti ed eventi con il contenuto del file.",
    de: "Ersetzt Kategorien, Transaktionen, Konten, Budgets, Ziele, wiederkehrende Posten und Ereignisse durch den Dateiinhalt.",
    fr: "Remplace les catégories, transactions, comptes, budgets, objectifs, opérations récurrentes et événements par le contenu du fichier.",
  },
  "Restoring…": {
    it: "Ripristino…",
    de: "Wiederherstellung…",
    fr: "Restauration…",
  },
  "Restore is atomic: current data remains unchanged if an error occurs.": {
    it: "Il ripristino è atomico: in caso di errore i dati attuali restano invariati.",
    de: "Die Wiederherstellung ist atomar: Bei einem Fehler bleiben die aktuellen Daten unverändert.",
    fr: "La restauration est atomique : les données actuelles restent inchangées en cas d'erreur.",
  },
  "Permanently delete account": {
    it: "Elimina definitivamente l'account",
    de: "Konto dauerhaft löschen",
    fr: "Supprimer définitivement le compte",
  },
  "Transactions, categories, budgets, goals, recurring items, and accounts will be removed. Enter {email} to confirm.": {
    it: "Movimenti, categorie, budget, obiettivi, elementi ricorrenti e conti verranno rimossi. Inserisci {email} per confermare.",
    de: "Transaktionen, Kategorien, Budgets, Ziele, wiederkehrende Posten und Konten werden entfernt. Gib zur Bestätigung {email} ein.",
    fr: "Les transactions, catégories, budgets, objectifs, opérations récurrentes et comptes seront supprimés. Saisissez {email} pour confirmer.",
  },
  "Delete forever": {
    it: "Elimina per sempre",
    de: "Endgültig löschen",
    fr: "Supprimer définitivement",
  },
  "Could not create tag": {
    it: "Impossibile creare il tag",
    de: "Tag konnte nicht erstellt werden",
    fr: "Impossible de créer le tag",
  },
  "Tag created": { it: "Tag creato", de: "Tag erstellt", fr: "Tag créé" },
  "Delete the tag \"{name}\"? It will be removed from transactions.": {
    it: "Eliminare il tag \"{name}\"? Verrà rimosso dai movimenti.",
    de: "Tag \"{name}\" löschen? Er wird aus den Transaktionen entfernt.",
    fr: "Supprimer le tag \"{name}\" ? Il sera retiré des transactions.",
  },
  "Tag deleted": { it: "Tag eliminato", de: "Tag gelöscht", fr: "Tag supprimé" },
  "Group related movements, such as holidays, work, or renovations.": {
    it: "Raggruppa movimenti correlati, come vacanze, lavoro o ristrutturazioni.",
    de: "Gruppiere zusammengehörige Transaktionen, etwa Urlaub, Arbeit oder Renovierungen.",
    fr: "Regroupez les mouvements liés, comme les vacances, le travail ou les rénovations.",
  },
  "Delete tag {name}": {
    it: "Elimina tag {name}",
    de: "Tag {name} löschen",
    fr: "Supprimer le tag {name}",
  },
  "New tag or project": {
    it: "Nuovo tag o progetto",
    de: "Neuer Tag oder neues Projekt",
    fr: "Nouveau tag ou projet",
  },
  "Tag color": { it: "Colore del tag", de: "Tag-Farbe", fr: "Couleur du tag" },
  "Loading alerts…": {
    it: "Caricamento avvisi…",
    de: "Hinweise werden geladen…",
    fr: "Chargement des alertes…",
  },
  "Could not save alerts": {
    it: "Impossibile salvare gli avvisi",
    de: "Hinweise konnten nicht gespeichert werden",
    fr: "Impossible d'enregistrer les alertes",
  },
  "Alert preferences updated": {
    it: "Preferenze degli avvisi aggiornate",
    de: "Hinweiseinstellungen aktualisiert",
    fr: "Préférences d'alerte mises à jour",
  },
  Goals: { it: "Obiettivi", de: "Ziele", fr: "Objectifs" },
  Subscriptions: { it: "Abbonamenti", de: "Abonnements", fr: "Abonnements" },
  "When a category exceeds its threshold.": {
    it: "Quando una categoria supera la propria soglia.",
    de: "Wenn eine Kategorie ihren Schwellenwert überschreitet.",
    fr: "Lorsqu'une catégorie dépasse son seuil.",
  },
  "When a deadline approaches or is overdue.": {
    it: "Quando una scadenza si avvicina o è superata.",
    de: "Wenn eine Frist näher rückt oder überschritten ist.",
    fr: "Lorsqu'une échéance approche ou est dépassée.",
  },
  "When a price increase is detected.": {
    it: "Quando viene rilevato un aumento di prezzo.",
    de: "Wenn eine Preiserhöhung erkannt wird.",
    fr: "Lorsqu'une hausse de prix est détectée.",
  },
  "Active account alerts": {
    it: "Avvisi del conto attivo",
    de: "Hinweise für das aktive Konto",
    fr: "Alertes du compte actif",
  },
  "{account} · these settings follow the selected account.": {
    it: "{account} · queste impostazioni seguono il conto selezionato.",
    de: "{account} · diese Einstellungen gelten für das ausgewählte Konto.",
    fr: "{account} · ces paramètres suivent le compte sélectionné.",
  },
  "Upcoming deadlines": {
    it: "Scadenze imminenti",
    de: "Bevorstehende Fristen",
    fr: "Échéances à venir",
  },
  "Planned events within the selected number of days.": {
    it: "Eventi pianificati entro il numero di giorni selezionato.",
    de: "Geplante Ereignisse innerhalb der gewählten Anzahl von Tagen.",
    fr: "Événements planifiés dans le nombre de jours sélectionné.",
  },
  "Advance notice in days": {
    it: "Preavviso in giorni",
    de: "Vorlaufzeit in Tagen",
    fr: "Préavis en jours",
  },
  "Low balance": { it: "Saldo basso", de: "Niedriger Kontostand", fr: "Solde faible" },
  "Alert when the declared balance falls below the threshold.": {
    it: "Avvisa quando il saldo dichiarato scende sotto la soglia.",
    de: "Hinweis, wenn der angegebene Kontostand unter den Schwellenwert fällt.",
    fr: "Alerte lorsque le solde déclaré passe sous le seuil.",
  },
  "Balance threshold": {
    it: "Soglia del saldo",
    de: "Kontostandsgrenze",
    fr: "Seuil de solde",
  },
  "High expense": { it: "Spesa elevata", de: "Hohe Ausgabe", fr: "Dépense élevée" },
  "Flag recent movements above the selected amount.": {
    it: "Segnala i movimenti recenti superiori all'importo selezionato.",
    de: "Markiere aktuelle Transaktionen über dem gewählten Betrag.",
    fr: "Signale les mouvements récents supérieurs au montant sélectionné.",
  },
  "Minimum amount": {
    it: "Importo minimo",
    de: "Mindestbetrag",
    fr: "Montant minimum",
  },
  "Save alerts": {
    it: "Salva avvisi",
    de: "Hinweise speichern",
    fr: "Enregistrer les alertes",
  },
  "pending/not completed": {
    it: "in sospeso/non completati",
    de: "ausstehend/nicht abgeschlossen",
    fr: "en attente/non terminés",
  },
  "top-ups": { it: "ricariche", de: "Aufladungen", fr: "rechargements" },
  "currency exchanges": {
    it: "cambi valuta",
    de: "Währungsumtausch",
    fr: "changes de devises",
  },
  "internal pocket movements": {
    it: "movimenti interni dei pocket",
    de: "interne Pocket-Bewegungen",
    fr: "mouvements internes des pockets",
  },
  "RevPoints savings": {
    it: "risparmi RevPoints",
    de: "RevPoints-Ersparnisse",
    fr: "épargne RevPoints",
  },
  other: { it: "altro", de: "sonstige", fr: "autres" },
  "File analysis failed": {
    it: "Analisi del file non riuscita",
    de: "Dateianalyse fehlgeschlagen",
    fr: "Échec de l'analyse du fichier",
  },
  "Error while analyzing the file": {
    it: "Errore durante l'analisi del file",
    de: "Fehler bei der Dateianalyse",
    fr: "Erreur lors de l'analyse du fichier",
  },
  "Import failed": {
    it: "Importazione non riuscita",
    de: "Import fehlgeschlagen",
    fr: "Échec de l'importation",
  },
  "Imported {count} transactions": {
    it: "Importati {count} movimenti",
    de: "{count} Transaktionen importiert",
    fr: "{count} transactions importées",
  },
  ", {count} duplicates skipped": {
    it: ", {count} duplicati ignorati",
    de: ", {count} Duplikate übersprungen",
    fr: ", {count} doublons ignorés",
  },
  "Error during import": {
    it: "Errore durante l'importazione",
    de: "Fehler beim Import",
    fr: "Erreur pendant l'importation",
  },
  "Could not undo import": {
    it: "Impossibile annullare l'importazione",
    de: "Import konnte nicht rückgängig gemacht werden",
    fr: "Impossible d'annuler l'importation",
  },
  "Removed {count} imported transactions": {
    it: "Rimossi {count} movimenti importati",
    de: "{count} importierte Transaktionen entfernt",
    fr: "{count} transactions importées supprimées",
  },
  "CSV import": { it: "Importazione CSV", de: "CSV-Import", fr: "Importation CSV" },
  "Upload a": { it: "Carica un estratto conto", de: "Lade einen", fr: "Importez un relevé" },
  "statement, including the supported Italian-language format, or a generic CSV with columns": {
    it: "che può anche essere nel formato italiano supportato, oppure un CSV generico con le colonne",
    de: "Kontoauszug, auch im unterstützten italienischsprachigen Format, oder eine allgemeine CSV-Datei mit den Spalten",
    fr: "y compris dans le format italien pris en charge, ou un CSV générique avec les colonnes",
  },
  "You will preview rows, categories, and duplicates before importing.": {
    it: "Prima dell'importazione vedrai un'anteprima di righe, categorie e duplicati.",
    de: "Vor dem Import erhältst du eine Vorschau der Zeilen, Kategorien und Duplikate.",
    fr: "Vous pourrez prévisualiser les lignes, les catégories et les doublons avant l'importation.",
  },
  "Revolut statement options": {
    it: "Opzioni estratto conto Revolut",
    de: "Optionen für Revolut-Kontoauszüge",
    fr: "Options du relevé Revolut",
  },
  "Ignore top-ups": {
    it: "Ignora le ricariche",
    de: "Aufladungen ignorieren",
    fr: "Ignorer les rechargements",
  },
  "Ignore transfers and pockets": {
    it: "Ignora trasferimenti e pocket",
    de: "Umbuchungen und Pockets ignorieren",
    fr: "Ignorer les virements et les pockets",
  },
  "Ignore RevPoints spare change": {
    it: "Ignora gli arrotondamenti RevPoints",
    de: "RevPoints-Kleingeld ignorieren",
    fr: "Ignorer la petite monnaie RevPoints",
  },
  "Ignore currency exchanges": {
    it: "Ignora i cambi valuta",
    de: "Währungsumtausch ignorieren",
    fr: "Ignorer les changes de devises",
  },
  "Analyze file": {
    it: "Analizza file",
    de: "Datei analysieren",
    fr: "Analyser le fichier",
  },
  Result: { it: "Esito", de: "Ergebnis", fr: "Résultat" },
  Uncategorized: {
    it: "Senza categoria",
    de: "Nicht kategorisiert",
    fr: "Non catégorisé",
  },
  "Showing the first {shown} of {total} rows.": {
    it: "Visualizzate le prime {shown} righe su {total}.",
    de: "Die ersten {shown} von {total} Zeilen werden angezeigt.",
    fr: "Affichage des {shown} premières lignes sur {total}.",
  },
  "Close preview": {
    it: "Chiudi anteprima",
    de: "Vorschau schließen",
    fr: "Fermer l'aperçu",
  },
  "Import {count} rows": {
    it: "Importa {count} righe",
    de: "{count} Zeilen importieren",
    fr: "Importer {count} lignes",
  },
  "Recent account imports": {
    it: "Importazioni recenti del conto",
    de: "Letzte Kontoimporte",
    fr: "Importations récentes du compte",
  },
  "You can undo one batch without deleting other movements.": {
    it: "Puoi annullare un lotto senza eliminare altri movimenti.",
    de: "Du kannst einen Stapel rückgängig machen, ohne andere Transaktionen zu löschen.",
    fr: "Vous pouvez annuler un lot sans supprimer d'autres mouvements.",
  },
  "Loading history…": {
    it: "Caricamento cronologia…",
    de: "Verlauf wird geladen…",
    fr: "Chargement de l'historique…",
  },
  "{date} · {count} imported": {
    it: "{date} · {count} importati",
    de: "{date} · {count} importiert",
    fr: "{date} · {count} importées",
  },
  " · {count} still present": {
    it: " · {count} ancora presenti",
    de: " · {count} noch vorhanden",
    fr: " · {count} encore présentes",
  },
  Undone: { it: "Annullata", de: "Rückgängig", fr: "Annulée" },
  "No imports recorded for this account.": {
    it: "Nessuna importazione registrata per questo conto.",
    de: "Keine Importe für dieses Konto erfasst.",
    fr: "Aucune importation enregistrée pour ce compte.",
  },
  "Undo this import?": {
    it: "Annullare questa importazione?",
    de: "Diesen Import rückgängig machen?",
    fr: "Annuler cette importation ?",
  },
  "The {count} transactions still linked to {file} will be deleted. Manual transactions will not be changed.": {
    it: "I {count} movimenti ancora collegati a {file} verranno eliminati. I movimenti manuali non saranno modificati.",
    de: "Die {count} noch mit {file} verknüpften Transaktionen werden gelöscht. Manuelle Transaktionen bleiben unverändert.",
    fr: "Les {count} transactions encore liées à {file} seront supprimées. Les transactions manuelles ne seront pas modifiées.",
  },
  Keep: { it: "Mantieni", de: "Behalten", fr: "Conserver" },
  "Undo import": {
    it: "Annulla importazione",
    de: "Import rückgängig machen",
    fr: "Annuler l'importation",
  },
  "Revolut format": {
    it: "Formato Revolut",
    de: "Revolut-Format",
    fr: "Format Revolut",
  },
  "Generic format": {
    it: "Formato generico",
    de: "Allgemeines Format",
    fr: "Format générique",
  },
  "to import": { it: "da importare", de: "zu importieren", fr: "à importer" },
  imported: { it: "importati", de: "importiert", fr: "importées" },
  "{count} duplicates skipped": {
    it: "{count} duplicati ignorati",
    de: "{count} Duplikate übersprungen",
    fr: "{count} doublons ignorés",
  },
  "{count} invalid": {
    it: "{count} non validi",
    de: "{count} ungültig",
    fr: "{count} invalides",
  },
  "Excluded:": { it: "Esclusi:", de: "Ausgeschlossen:", fr: "Exclus :" },
  "Categories:": { it: "Categorie:", de: "Kategorien:", fr: "Catégories :" },
  "Row {row}: {message}": {
    it: "Riga {row}: {message}",
    de: "Zeile {row}: {message}",
    fr: "Ligne {row} : {message}",
  },
  "Budget updated": {
    it: "Budget aggiornato",
    de: "Budget aktualisiert",
    fr: "Budget mis à jour",
  },
  "Budget created": {
    it: "Budget creato",
    de: "Budget erstellt",
    fr: "Budget créé",
  },
  "Budget deleted": {
    it: "Budget eliminato",
    de: "Budget gelöscht",
    fr: "Budget supprimé",
  },
  "Delete failed": {
    it: "Eliminazione non riuscita",
    de: "Löschen fehlgeschlagen",
    fr: "Échec de la suppression",
  },
  "{account} · category spending limits and threshold alerts": {
    it: "{account} · limiti di spesa per categoria e avvisi di soglia",
    de: "{account} · Ausgabenlimits je Kategorie und Schwellenwerthinweise",
    fr: "{account} · limites de dépenses par catégorie et alertes de seuil",
  },
  "New budget": { it: "Nuovo budget", de: "Neues Budget", fr: "Nouveau budget" },
  "No budgets configured. Create one to monitor spending in a category.": {
    it: "Nessun budget configurato. Creane uno per monitorare le spese di una categoria.",
    de: "Keine Budgets eingerichtet. Erstelle eines, um Ausgaben in einer Kategorie zu überwachen.",
    fr: "Aucun budget configuré. Créez-en un pour suivre les dépenses d'une catégorie.",
  },
  "of {amount}": {
    it: "su {amount}",
    de: "von {amount}",
    fr: "sur {amount}",
  },
  "Limit exceeded by {amount}": {
    it: "Limite superato di {amount}",
    de: "Limit um {amount} überschritten",
    fr: "Limite dépassée de {amount}",
  },
  "Warning: {percent}% of the budget used": {
    it: "Attenzione: utilizzato il {percent}% del budget",
    de: "Warnung: {percent}% des Budgets verbraucht",
    fr: "Attention : {percent} % du budget utilisé",
  },
  "{amount} remaining ({percent}%)": {
    it: "{amount} rimanenti ({percent}%)",
    de: "{amount} verbleibend ({percent}%)",
    fr: "{amount} restants ({percent} %)",
  },
  "At this rate ≈ {amount} by the end of the {period}": {
    it: "A questo ritmo ≈ {amount} entro la fine del periodo {period}",
    de: "Bei diesem Tempo ≈ {amount} bis zum Ende des Zeitraums {period}",
    fr: "À ce rythme ≈ {amount} d'ici la fin de la période {period}",
  },
  " · forecast to exceed the limit on {date}": {
    it: " · superamento previsto del limite il {date}",
    de: " · voraussichtliche Limitüberschreitung am {date}",
    fr: " · dépassement de la limite prévu le {date}",
  },
  "Edit budget": {
    it: "Modifica budget",
    de: "Budget bearbeiten",
    fr: "Modifier le budget",
  },
  "Set a spending limit for a category.": {
    it: "Imposta un limite di spesa per una categoria.",
    de: "Lege ein Ausgabenlimit für eine Kategorie fest.",
    fr: "Définissez une limite de dépenses pour une catégorie.",
  },
  "Amount ({currency})": {
    it: "Importo ({currency})",
    de: "Betrag ({currency})",
    fr: "Montant ({currency})",
  },
  Period: { it: "Periodo", de: "Zeitraum", fr: "Période" },
  "Alert threshold (%)": {
    it: "Soglia di avviso (%)",
    de: "Hinweisschwelle (%)",
    fr: "Seuil d'alerte (%)",
  },
  "Delete this budget?": {
    it: "Eliminare questo budget?",
    de: "Dieses Budget löschen?",
    fr: "Supprimer ce budget ?",
  },
  "The “{name}” budget will be removed. Transactions will not be changed.": {
    it: "Il budget “{name}” verrà eliminato. I movimenti non saranno modificati.",
    de: "Das Budget „{name}“ wird entfernt. Transaktionen bleiben unverändert.",
    fr: "Le budget « {name} » sera supprimé. Les transactions ne seront pas modifiées.",
  },
  "Invalid goal amount": {
    it: "Importo dell'obiettivo non valido",
    de: "Ungültiger Zielbetrag",
    fr: "Montant de l'objectif invalide",
  },
  "Goal updated": {
    it: "Obiettivo aggiornato",
    de: "Ziel aktualisiert",
    fr: "Objectif mis à jour",
  },
  "Goal created": {
    it: "Obiettivo creato",
    de: "Ziel erstellt",
    fr: "Objectif créé",
  },
  "Delete the goal \"{name}\"?": {
    it: "Eliminare l'obiettivo \"{name}\"?",
    de: "Ziel \"{name}\" löschen?",
    fr: "Supprimer l'objectif \"{name}\" ?",
  },
  "Goal deleted": {
    it: "Obiettivo eliminato",
    de: "Ziel gelöscht",
    fr: "Objectif supprimé",
  },
  "Savings goals": {
    it: "Obiettivi di risparmio",
    de: "Sparziele",
    fr: "Objectifs d'épargne",
  },
  "Targets and deadlines: see what remains and the monthly amount needed": {
    it: "Obiettivi e scadenze: controlla quanto manca e l'importo mensile necessario",
    de: "Ziele und Fristen: Sieh, was noch fehlt und welcher Monatsbetrag nötig ist",
    fr: "Objectifs et échéances : voyez ce qu'il reste et le montant mensuel nécessaire",
  },
  "New goal": { it: "Nuovo obiettivo", de: "Neues Ziel", fr: "Nouvel objectif" },
  "No goals yet. Create one, such as “Summer holiday: €1,200 by July”.": {
    it: "Nessun obiettivo. Creane uno, ad esempio “Vacanze estive: 1.200 € entro luglio”.",
    de: "Noch keine Ziele. Erstelle eines, zum Beispiel „Sommerurlaub: 1.200 € bis Juli“.",
    fr: "Aucun objectif. Créez-en un, par exemple « Vacances d'été : 1 200 € d'ici juillet ».",
  },
  "by {date}": { it: "entro il {date}", de: "bis {date}", fr: "pour le {date}" },
  "no deadline": {
    it: "nessuna scadenza",
    de: "keine Frist",
    fr: "aucune échéance",
  },
  "Delete goal": {
    it: "Elimina obiettivo",
    de: "Ziel löschen",
    fr: "Supprimer l'objectif",
  },
  "Goal reached!": {
    it: "Obiettivo raggiunto!",
    de: "Ziel erreicht!",
    fr: "Objectif atteint !",
  },
  "{amount} remaining": {
    it: "{amount} rimanenti",
    de: "{amount} verbleibend",
    fr: "{amount} restants",
  },
  " · ~{amount}/month for {months}": {
    it: " · ~{amount}/mese per {months}",
    de: " · ~{amount}/Monat für {months}",
    fr: " · ~{amount}/mois pendant {months}",
  },
  "1 month": { it: "1 mese", de: "1 Monat", fr: "1 mois" },
  "{count} months": {
    it: "{count} mesi",
    de: "{count} Monate",
    fr: "{count} mois",
  },
  "Edit goal": {
    it: "Modifica obiettivo",
    de: "Ziel bearbeiten",
    fr: "Modifier l'objectif",
  },
  "Set a target and deadline.": {
    it: "Imposta un obiettivo e una scadenza.",
    de: "Lege ein Ziel und eine Frist fest.",
    fr: "Définissez un objectif et une échéance.",
  },
  Icon: { it: "Icona", de: "Symbol", fr: "Icône" },
  "Change icon": { it: "Cambia icona", de: "Symbol ändern", fr: "Changer l'icône" },
  "Goal ({currency})": {
    it: "Obiettivo ({currency})",
    de: "Ziel ({currency})",
    fr: "Objectif ({currency})",
  },
  "Already saved": {
    it: "Già risparmiato",
    de: "Bereits gespart",
    fr: "Déjà épargné",
  },
  "Deadline (optional)": {
    it: "Scadenza (facoltativa)",
    de: "Frist (optional)",
    fr: "Échéance (facultative)",
  },
  Groceries: { it: "Spesa alimentare", de: "Lebensmittel", fr: "Courses" },
  "Housing and rent": { it: "Casa e affitto", de: "Wohnen und Miete", fr: "Logement et loyer" },
  Transport: { it: "Trasporti", de: "Verkehr", fr: "Transport" },
  Utilities: { it: "Utenze", de: "Nebenkosten", fr: "Services publics" },
  Dining: { it: "Ristorazione", de: "Gastronomie", fr: "Restauration" },
  Health: { it: "Salute", de: "Gesundheit", fr: "Santé" },
  Entertainment: { it: "Svago", de: "Unterhaltung", fr: "Loisirs" },
  Clothing: { it: "Abbigliamento", de: "Kleidung", fr: "Vêtements" },
  Travel: { it: "Viaggi", de: "Reisen", fr: "Voyages" },
  Education: { it: "Istruzione", de: "Bildung", fr: "Éducation" },
  Other: { it: "Altro", de: "Sonstiges", fr: "Autre" },
  Salary: { it: "Stipendio", de: "Gehalt", fr: "Salaire" },
  Freelance: { it: "Lavoro autonomo", de: "Freiberuflich", fr: "Freelance" },
  Investments: { it: "Investimenti", de: "Investitionen", fr: "Investissements" },
  Gifts: { it: "Regali", de: "Geschenke", fr: "Cadeaux" },
  "Transport and travel": {
    it: "Trasporti e viaggi",
    de: "Verkehr und Reisen",
    fr: "Transport et voyages",
  },
  "Other income": {
    it: "Altre entrate",
    de: "Sonstige Einnahmen",
    fr: "Autres revenus",
  },
  "Category updated": {
    it: "Categoria aggiornata",
    de: "Kategorie aktualisiert",
    fr: "Catégorie mise à jour",
  },
  "Category created": {
    it: "Categoria creata",
    de: "Kategorie erstellt",
    fr: "Catégorie créée",
  },
  "Delete the category \"{name}\"? Linked transactions will remain uncategorized.": {
    it: "Eliminare la categoria \"{name}\"? I movimenti collegati resteranno senza categoria.",
    de: "Kategorie \"{name}\" löschen? Verknüpfte Transaktionen bleiben ohne Kategorie.",
    fr: "Supprimer la catégorie \"{name}\" ? Les transactions liées resteront non catégorisées.",
  },
  "Category deleted": {
    it: "Categoria eliminata",
    de: "Kategorie gelöscht",
    fr: "Catégorie supprimée",
  },
  "Could not create rule": {
    it: "Impossibile creare la regola",
    de: "Regel konnte nicht erstellt werden",
    fr: "Impossible de créer la règle",
  },
  "Customize categories with a name, color, and icon": {
    it: "Personalizza le categorie con nome, colore e icona",
    de: "Passe Kategorien mit Name, Farbe und Symbol an",
    fr: "Personnalisez les catégories avec un nom, une couleur et une icône",
  },
  "Automatic import rules": {
    it: "Regole automatiche di importazione",
    de: "Automatische Importregeln",
    fr: "Règles d'importation automatique",
  },
  "When an imported transaction description contains a keyword, it is categorized automatically. These rules take priority over defaults.": {
    it: "Quando la descrizione di un movimento importato contiene una parola chiave, viene categorizzato automaticamente. Queste regole hanno priorità sui valori predefiniti.",
    de: "Wenn die Beschreibung einer importierten Transaktion ein Schlüsselwort enthält, wird sie automatisch kategorisiert. Diese Regeln haben Vorrang vor den Standardwerten.",
    fr: "Lorsqu'une description de transaction importée contient un mot-clé, elle est catégorisée automatiquement. Ces règles sont prioritaires sur les valeurs par défaut.",
  },
  "Keyword (for example, Netflix)": {
    it: "Parola chiave (ad esempio, Netflix)",
    de: "Schlüsselwort (zum Beispiel Netflix)",
    fr: "Mot-clé (par exemple, Netflix)",
  },
  "Add rule": { it: "Aggiungi regola", de: "Regel hinzufügen", fr: "Ajouter une règle" },
  "Delete rule {keyword}": {
    it: "Elimina regola {keyword}",
    de: "Regel {keyword} löschen",
    fr: "Supprimer la règle {keyword}",
  },
  "Edit category": {
    it: "Modifica categoria",
    de: "Kategorie bearbeiten",
    fr: "Modifier la catégorie",
  },
  "New category": {
    it: "Nuova categoria",
    de: "Neue Kategorie",
    fr: "Nouvelle catégorie",
  },
  "Choose a name, icon, and color.": {
    it: "Scegli un nome, un'icona e un colore.",
    de: "Wähle einen Namen, ein Symbol und eine Farbe.",
    fr: "Choisissez un nom, une icône et une couleur.",
  },
  Color: { it: "Colore", de: "Farbe", fr: "Couleur" },
  "Color {color}": {
    it: "Colore {color}",
    de: "Farbe {color}",
    fr: "Couleur {color}",
  },
  "The type cannot be changed after creation.": {
    it: "Il tipo non può essere cambiato dopo la creazione.",
    de: "Der Typ kann nach der Erstellung nicht geändert werden.",
    fr: "Le type ne peut pas être modifié après la création.",
  },
  "Create a second account first": {
    it: "Crea prima un secondo conto",
    de: "Erstelle zuerst ein zweites Konto",
    fr: "Créez d'abord un deuxième compte",
  },
  "Transfer failed": {
    it: "Trasferimento non riuscito",
    de: "Umbuchung fehlgeschlagen",
    fr: "Échec du virement",
  },
  "Transfer recorded": {
    it: "Trasferimento registrato",
    de: "Umbuchung erfasst",
    fr: "Virement enregistré",
  },
  "Delete both records for this transfer?": {
    it: "Eliminare entrambi i movimenti di questo trasferimento?",
    de: "Beide Buchungen dieser Umbuchung löschen?",
    fr: "Supprimer les deux écritures de ce virement ?",
  },
  "Transfer deleted": {
    it: "Trasferimento eliminato",
    de: "Umbuchung gelöscht",
    fr: "Virement supprimé",
  },
  "{account} · move money without changing total income or expenses.": {
    it: "{account} · sposta denaro senza modificare il totale di entrate o spese.",
    de: "{account} · verschiebe Geld, ohne die gesamten Einnahmen oder Ausgaben zu verändern.",
    fr: "{account} · déplacez de l'argent sans modifier le total des revenus ou des dépenses.",
  },
  "New transfer": {
    it: "Nuovo trasferimento",
    de: "Neue Umbuchung",
    fr: "Nouveau virement",
  },
  "Two linked records are created, one for each account.": {
    it: "Vengono creati due movimenti collegati, uno per ciascun conto.",
    de: "Es werden zwei verknüpfte Buchungen erstellt, eine für jedes Konto.",
    fr: "Deux écritures liées sont créées, une pour chaque compte.",
  },
  "Create at least one more account in Settings before transferring money.": {
    it: "Crea almeno un altro conto nelle Impostazioni prima di trasferire denaro.",
    de: "Erstelle vor einer Umbuchung mindestens ein weiteres Konto in den Einstellungen.",
    fr: "Créez au moins un autre compte dans les Paramètres avant d'effectuer un virement.",
  },
  Outgoing: { it: "In uscita", de: "Ausgehend", fr: "Sortant" },
  Incoming: { it: "In entrata", de: "Eingehend", fr: "Entrant" },
  "For example, move to savings": {
    it: "Ad esempio, sposta sui risparmi",
    de: "Zum Beispiel auf das Sparkonto verschieben",
    fr: "Par exemple, transférer vers l'épargne",
  },
  "Record transfer": {
    it: "Registra trasferimento",
    de: "Umbuchung erfassen",
    fr: "Enregistrer le virement",
  },
  "Recent transfers": {
    it: "Trasferimenti recenti",
    de: "Letzte Umbuchungen",
    fr: "Virements récents",
  },
  "No transfers.": {
    it: "Nessun trasferimento.",
    de: "Keine Umbuchungen.",
    fr: "Aucun virement.",
  },
  "Internal transfer": {
    it: "Trasferimento interno",
    de: "Interne Umbuchung",
    fr: "Virement interne",
  },
  "Delete transfer": {
    it: "Elimina trasferimento",
    de: "Umbuchung löschen",
    fr: "Supprimer le virement",
  },
  "Enter the actual balance": {
    it: "Inserisci il saldo effettivo",
    de: "Gib den tatsächlichen Kontostand ein",
    fr: "Saisissez le solde réel",
  },
  "Reconciliation failed": {
    it: "Riconciliazione non riuscita",
    de: "Abgleich fehlgeschlagen",
    fr: "Échec du rapprochement",
  },
  "Balance reconciled": {
    it: "Saldo riconciliato",
    de: "Kontostand abgeglichen",
    fr: "Solde rapproché",
  },
  "Loading reconciliation…": {
    it: "Caricamento riconciliazione…",
    de: "Abgleich wird geladen…",
    fr: "Chargement du rapprochement…",
  },
  "Account reconciliation": {
    it: "Riconciliazione del conto",
    de: "Kontoabgleich",
    fr: "Rapprochement du compte",
  },
  "{account} · compare the recorded balance with the actual balance.": {
    it: "{account} · confronta il saldo registrato con quello effettivo.",
    de: "{account} · vergleiche den erfassten mit dem tatsächlichen Kontostand.",
    fr: "{account} · comparez le solde enregistré au solde réel.",
  },
  "Verify balance": {
    it: "Verifica saldo",
    de: "Kontostand prüfen",
    fr: "Vérifier le solde",
  },
  "Reconciliation updates the account's declared balance and keeps the difference in its history.": {
    it: "La riconciliazione aggiorna il saldo dichiarato del conto e conserva la differenza nella cronologia.",
    de: "Der Abgleich aktualisiert den angegebenen Kontostand und speichert die Differenz im Verlauf.",
    fr: "Le rapprochement met à jour le solde déclaré du compte et conserve l'écart dans l'historique.",
  },
  "Recorded balance": {
    it: "Saldo registrato",
    de: "Erfasster Kontostand",
    fr: "Solde enregistré",
  },
  "Actual balance": {
    it: "Saldo effettivo",
    de: "Tatsächlicher Kontostand",
    fr: "Solde réel",
  },
  "Difference:": { it: "Differenza:", de: "Differenz:", fr: "Écart :" },
  "Optional note": {
    it: "Nota facoltativa",
    de: "Optionale Notiz",
    fr: "Note facultative",
  },
  "For example, monthly statement balance": {
    it: "Ad esempio, saldo dell'estratto conto mensile",
    de: "Zum Beispiel Saldo des Monatsauszugs",
    fr: "Par exemple, solde du relevé mensuel",
  },
  "Reconcile balance": {
    it: "Riconcilia saldo",
    de: "Kontostand abgleichen",
    fr: "Rapprocher le solde",
  },
  "Reconciliation history": {
    it: "Cronologia riconciliazioni",
    de: "Abgleichsverlauf",
    fr: "Historique des rapprochements",
  },
  "No reconciliations recorded.": {
    it: "Nessuna riconciliazione registrata.",
    de: "Keine Abgleiche erfasst.",
    fr: "Aucun rapprochement enregistré.",
  },
  "Balance reconciliation": {
    it: "Riconciliazione saldo",
    de: "Kontostandsabgleich",
    fr: "Rapprochement du solde",
  },
  "Could not load forecasts": {
    it: "Impossibile caricare le previsioni",
    de: "Prognosen konnten nicht geladen werden",
    fr: "Impossible de charger les prévisions",
  },
  "Calculating cash flow…": {
    it: "Calcolo del flusso di cassa…",
    de: "Cashflow wird berechnet…",
    fr: "Calcul du flux de trésorerie…",
  },
  "Month end": { it: "Fine mese", de: "Monatsende", fr: "Fin du mois" },
  "Lowest point ({days}d)": {
    it: "Punto minimo ({days}g)",
    de: "Tiefster Stand ({days}T)",
    fr: "Point le plus bas ({days}j)",
  },
  "Expected movements (90d)": {
    it: "Movimenti previsti (90g)",
    de: "Erwartete Transaktionen (90T)",
    fr: "Mouvements attendus (90j)",
  },
  "Cash-flow forecasts": {
    it: "Previsioni del flusso di cassa",
    de: "Cashflow-Prognosen",
    fr: "Prévisions de trésorerie",
  },
  "Balance forecast based on recurring items, planned events, and future transactions. Update your balance in": {
    it: "Previsione del saldo basata su movimenti ricorrenti, eventi pianificati e movimenti futuri. Aggiorna il saldo nelle",
    de: "Kontostandsprognose auf Basis wiederkehrender Posten, geplanter Ereignisse und zukünftiger Transaktionen. Aktualisiere deinen Kontostand in den",
    fr: "Prévision du solde basée sur les opérations récurrentes, les événements planifiés et les transactions futures. Mettez à jour votre solde dans les",
  },
  "for greater accuracy.": {
    it: "per una maggiore precisione.",
    de: "für eine höhere Genauigkeit.",
    fr: "pour plus de précision.",
  },
  "{count} days": { it: "{count} giorni", de: "{count} Tage", fr: "{count} jours" },
  "Warning: forecast balance below zero": {
    it: "Attenzione: saldo previsto sotto zero",
    de: "Warnung: Prognostizierter Kontostand unter null",
    fr: "Attention : solde prévisionnel inférieur à zéro",
  },
  "With the current planned expenses, your balance would be negative for {days}.": {
    it: "Con le spese attualmente pianificate, il saldo sarebbe negativo per {days}.",
    de: "Mit den derzeit geplanten Ausgaben wäre dein Kontostand für {days} negativ.",
    fr: "Avec les dépenses actuellement prévues, votre solde serait négatif pendant {days}.",
  },
  " (minimum {amount} on {date})": {
    it: " (minimo {amount} il {date})",
    de: " (Minimum {amount} am {date})",
    fr: " (minimum de {amount} le {date})",
  },
  "Reduce some expenses or reschedule an event.": {
    it: "Riduci alcune spese o riprogramma un evento.",
    de: "Reduziere einige Ausgaben oder verschiebe ein Ereignis.",
    fr: "Réduisez certaines dépenses ou reprogrammez un événement.",
  },
  "Active account:": {
    it: "Conto attivo:",
    de: "Aktives Konto:",
    fr: "Compte actif :",
  },
  "Forecast balance": {
    it: "Saldo previsto",
    de: "Prognostizierter Kontostand",
    fr: "Solde prévisionnel",
  },
  "Balance (historical)": {
    it: "Saldo (storico)",
    de: "Kontostand (historisch)",
    fr: "Solde (historique)",
  },
  "Blue line = recent actual balance · dashed amber line = future forecast · red line = zero threshold. End-of-horizon balance: {amount}": {
    it: "Linea blu = saldo effettivo recente · linea ambra tratteggiata = previsione futura · linea rossa = soglia zero. Saldo a fine orizzonte: {amount}",
    de: "Blaue Linie = letzter tatsächlicher Kontostand · gestrichelte gelbe Linie = Zukunftsprognose · rote Linie = Nulllinie. Kontostand am Prognoseende: {amount}",
    fr: "Ligne bleue = solde réel récent · ligne orange en pointillés = prévision future · ligne rouge = seuil zéro. Solde en fin d'horizon : {amount}",
  },
  "Movements affecting the future": {
    it: "Movimenti che influenzano il futuro",
    de: "Transaktionen mit Einfluss auf die Zukunft",
    fr: "Mouvements influençant l'avenir",
  },
  "one-off event": {
    it: "evento una tantum",
    de: "einmaliges Ereignis",
    fr: "événement ponctuel",
  },
  recurring: { it: "ricorrente", de: "wiederkehrend", fr: "récurrent" },
  "future transaction": {
    it: "movimento futuro",
    de: "zukünftige Transaktion",
    fr: "transaction future",
  },
  "Forecast income": {
    it: "Entrata prevista",
    de: "Prognostizierte Einnahme",
    fr: "Revenu prévisionnel",
  },
  "Forecast expense": {
    it: "Spesa prevista",
    de: "Prognostizierte Ausgabe",
    fr: "Dépense prévisionnelle",
  },
  "Expense data from the last 90 days is required to simulate scenarios.": {
    it: "Per simulare gli scenari servono i dati di spesa degli ultimi 90 giorni.",
    de: "Für Szenarios werden Ausgabendaten der letzten 90 Tage benötigt.",
    fr: "Les données de dépenses des 90 derniers jours sont nécessaires pour simuler des scénarios.",
  },
  "Scenario simulator": {
    it: "Simulatore di scenari",
    de: "Szenario-Simulator",
    fr: "Simulateur de scénarios",
  },
  "90-day monthly average": {
    it: "media mensile su 90 giorni",
    de: "90-Tage-Monatsdurchschnitt",
    fr: "moyenne mensuelle sur 90 jours",
  },
  "Current monthly expenses": {
    it: "Spese mensili attuali",
    de: "Aktuelle monatliche Ausgaben",
    fr: "Dépenses mensuelles actuelles",
  },
  "With the selected scenario": {
    it: "Con lo scenario selezionato",
    de: "Mit dem gewählten Szenario",
    fr: "Avec le scénario sélectionné",
  },
  "Annual impact": {
    it: "Impatto annuale",
    de: "Jährliche Auswirkung",
    fr: "Impact annuel",
  },
  "/year": { it: "/anno", de: "/Jahr", fr: "/an" },
  "/month": { it: "/mese", de: "/Monat", fr: "/mois" },
  "Adjust {name}": {
    it: "Regola {name}",
    de: "{name} anpassen",
    fr: "Ajuster {name}",
  },
  "Move the sliders to simulate cuts or increases. The impact is calculated from your actual 90-day average.": {
    it: "Sposta i cursori per simulare riduzioni o aumenti. L'impatto è calcolato sulla media effettiva degli ultimi 90 giorni.",
    de: "Verschiebe die Regler, um Einsparungen oder Erhöhungen zu simulieren. Die Auswirkung wird anhand deines tatsächlichen 90-Tage-Durchschnitts berechnet.",
    fr: "Déplacez les curseurs pour simuler des baisses ou des hausses. L'impact est calculé à partir de votre moyenne réelle sur 90 jours.",
  },
  "No movements in this period": {
    it: "Nessun movimento in questo periodo",
    de: "Keine Transaktionen in diesem Zeitraum",
    fr: "Aucun mouvement sur cette période",
  },
  "The chart will appear when income or expenses are available.": {
    it: "Il grafico apparirà quando saranno disponibili entrate o spese.",
    de: "Das Diagramm erscheint, sobald Einnahmen oder Ausgaben vorhanden sind.",
    fr: "Le graphique apparaîtra lorsque des revenus ou des dépenses seront disponibles.",
  },
  "Forecast portion": {
    it: "Quota prevista",
    de: "Prognoseanteil",
    fr: "Part prévisionnelle",
  },
  "Forecast expenses": {
    it: "Spese previste",
    de: "Prognostizierte Ausgaben",
    fr: "Dépenses prévisionnelles",
  },
  "Dashed bars show the forecast portion of the month from recurring items that have not occurred yet.": {
    it: "Le barre tratteggiate mostrano la parte prevista del mese dovuta a elementi ricorrenti non ancora avvenuti.",
    de: "Gestrichelte Balken zeigen den prognostizierten Monatsanteil aus noch nicht erfolgten wiederkehrenden Posten.",
    fr: "Les barres en pointillés indiquent la part prévisionnelle du mois provenant d'opérations récurrentes non encore effectuées.",
  },
  "No data for this period": {
    it: "Nessun dato per questo periodo",
    de: "Keine Daten für diesen Zeitraum",
    fr: "Aucune donnée pour cette période",
  },
  "Previous year": {
    it: "Anno precedente",
    de: "Vorjahr",
    fr: "Année précédente",
  },
  "Current year": {
    it: "Anno corrente",
    de: "Aktuelles Jahr",
    fr: "Année en cours",
  },
  Today: { it: "Oggi", de: "Heute", fr: "Aujourd'hui" },
  "Forecast from tomorrow through month end:": {
    it: "Previsione da domani a fine mese:",
    de: "Prognose von morgen bis Monatsende:",
    fr: "Prévision de demain à la fin du mois :",
  },
  transaction: { it: "movimento", de: "Transaktion", fr: "transaction" },
  "Forecast, not yet occurred": {
    it: "Previsione, non ancora avvenuta",
    de: "Prognose, noch nicht erfolgt",
    fr: "Prévision, pas encore effectuée",
  },
  "Forecast transactions": {
    it: "Movimenti previsti",
    de: "Prognostizierte Transaktionen",
    fr: "Transactions prévisionnelles",
  },
  "yellow dashed = forecast recurring item, not yet occurred": {
    it: "tratteggio giallo = elemento ricorrente previsto, non ancora avvenuto",
    de: "gelb gestrichelt = prognostizierter wiederkehrender Posten, noch nicht erfolgt",
    fr: "pointillés jaunes = opération récurrente prévue, pas encore effectuée",
  },
  "recorded expenses": {
    it: "spese registrate",
    de: "erfasste Ausgaben",
    fr: "dépenses enregistrées",
  },
  "recorded income": {
    it: "entrate registrate",
    de: "erfasste Einnahmen",
    fr: "revenus enregistrés",
  },
  "No transactions on this day.": {
    it: "Nessun movimento in questo giorno.",
    de: "Keine Transaktionen an diesem Tag.",
    fr: "Aucune transaction ce jour-là.",
  },
  "{count} transactions": {
    it: "{count} movimenti",
    de: "{count} Transaktionen",
    fr: "{count} transactions",
  },
  " · {count} forecast": {
    it: " · {count} previsti",
    de: " · {count} prognostiziert",
    fr: " · {count} prévisionnelles",
  },
  "Forecast (not yet occurred)": {
    it: "Previsione (non ancora avvenuta)",
    de: "Prognose (noch nicht erfolgt)",
    fr: "Prévision (pas encore effectuée)",
  },
  "Manage recurrence rules →": {
    it: "Gestisci le regole di ricorrenza →",
    de: "Wiederholungsregeln verwalten →",
    fr: "Gérer les règles de récurrence →",
  },
  "Add on {date}": {
    it: "Aggiungi il {date}",
    de: "Am {date} hinzufügen",
    fr: "Ajouter le {date}",
  },
  "You are about to delete “{name}”. This action cannot be undone.": {
    it: "Stai per eliminare “{name}”. Questa azione non può essere annullata.",
    de: "Du bist dabei, „{name}“ zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.",
    fr: "Vous êtes sur le point de supprimer « {name} ». Cette action est irréversible.",
  },
  "Spent today": {
    it: "Speso oggi",
    de: "Heute ausgegeben",
    fr: "Dépensé aujourd'hui",
  },
  "This week": { it: "Questa settimana", de: "Diese Woche", fr: "Cette semaine" },
  "Monthly expenses": {
    it: "Spese mensili",
    de: "Monatliche Ausgaben",
    fr: "Dépenses mensuelles",
  },
  "Monthly income": {
    it: "Entrate mensili",
    de: "Monatliche Einnahmen",
    fr: "Revenus mensuels",
  },
  "+ forecast −{amount} by month end": {
    it: "+ previsione −{amount} entro fine mese",
    de: "+ Prognose −{amount} bis Monatsende",
    fr: "+ prévision −{amount} d'ici la fin du mois",
  },
  "Hello {name}": { it: "Ciao {name}", de: "Hallo {name}", fr: "Bonjour {name}" },
  "Last 6 months": {
    it: "Ultimi 6 mesi",
    de: "Letzte 6 Monate",
    fr: "6 derniers mois",
  },
  "Expenses by category · this month": {
    it: "Spese per categoria · questo mese",
    de: "Ausgaben nach Kategorie · diesen Monat",
    fr: "Dépenses par catégorie · ce mois-ci",
  },
  "Budgets under pressure": {
    it: "Budget sotto pressione",
    de: "Gefährdete Budgets",
    fr: "Budgets sous pression",
  },
  "{spent} of {limit}": {
    it: "{spent} su {limit}",
    de: "{spent} von {limit}",
    fr: "{spent} sur {limit}",
  },
  "Upcoming items · 30 days": {
    it: "Elementi in arrivo · 30 giorni",
    de: "Bevorstehende Posten · 30 Tage",
    fr: "Opérations à venir · 30 jours",
  },
  "Forecast: −{amount}": {
    it: "Previsione: −{amount}",
    de: "Prognose: −{amount}",
    fr: "Prévision : −{amount}",
  },
  "{count} more upcoming items in the": {
    it: "Altri {count} elementi in arrivo nel",
    de: "{count} weitere bevorstehende Posten im",
    fr: "{count} autres opérations à venir dans le",
  },
  calendar: { it: "calendario", de: "Kalender", fr: "calendrier" },
  "Latest transactions": {
    it: "Ultimi movimenti",
    de: "Letzte Transaktionen",
    fr: "Dernières transactions",
  },
  "View all": { it: "Vedi tutti", de: "Alle anzeigen", fr: "Tout afficher" },
  "No transactions yet. Add one with the “New” button.": {
    it: "Nessun movimento. Aggiungine uno con il pulsante “Nuovo”.",
    de: "Noch keine Transaktionen. Füge eine über die Schaltfläche „Neu“ hinzu.",
    fr: "Aucune transaction. Ajoutez-en une avec le bouton « Nouveau ».",
  },
  "3 months": { it: "3 mesi", de: "3 Monate", fr: "3 mois" },
  Year: { it: "Anno", de: "Jahr", fr: "Année" },
  "Other categories": {
    it: "Altre categorie",
    de: "Andere Kategorien",
    fr: "Autres catégories",
  },
  "Actual expenses": {
    it: "Spese effettive",
    de: "Tatsächliche Ausgaben",
    fr: "Dépenses réelles",
  },
  "Actual income": {
    it: "Entrate effettive",
    de: "Tatsächliche Einnahmen",
    fr: "Revenus réels",
  },
  "Actual net balance": {
    it: "Saldo netto effettivo",
    de: "Tatsächlicher Nettosaldo",
    fr: "Solde net réel",
  },
  "Average expenses/day": {
    it: "Spesa media/giorno",
    de: "Durchschnittliche Ausgaben/Tag",
    fr: "Dépenses moyennes/jour",
  },
  "Forecast by month end: −{amount}": {
    it: "Previsione entro fine mese: −{amount}",
    de: "Prognose bis Monatsende: −{amount}",
    fr: "Prévision d'ici la fin du mois : −{amount}",
  },
  "Forecast by month end: +{amount}": {
    it: "Previsione entro fine mese: +{amount}",
    de: "Prognose bis Monatsende: +{amount}",
    fr: "Prévision d'ici la fin du mois : +{amount}",
  },
  "Estimated month-end balance: {amount}": {
    it: "Saldo stimato a fine mese: {amount}",
    de: "Geschätzter Kontostand am Monatsende: {amount}",
    fr: "Solde estimé en fin de mois : {amount}",
  },
  "From {date} through today · {account} · values in {currency}": {
    it: "Dal {date} a oggi · {account} · valori in {currency}",
    de: "Vom {date} bis heute · {account} · Werte in {currency}",
    fr: "Du {date} à aujourd'hui · {account} · valeurs en {currency}",
  },
  "Include or exclude transactions forecast from recurrence rules": {
    it: "Includi o escludi i movimenti previsti dalle regole di ricorrenza",
    de: "Prognostizierte Transaktionen aus Wiederholungsregeln ein- oder ausschließen",
    fr: "Inclure ou exclure les transactions prévues par les règles de récurrence",
  },
  "Forecasts: {state}": {
    it: "Previsioni: {state}",
    de: "Prognosen: {state}",
    fr: "Prévisions : {state}",
  },
  ON: { it: "SÌ", de: "AN", fr: "OUI" },
  OFF: { it: "NO", de: "AUS", fr: "NON" },
  "Report PDF": { it: "Report PDF", de: "PDF-Bericht", fr: "Rapport PDF" },
  "Monthly trend": {
    it: "Andamento mensile",
    de: "Monatlicher Verlauf",
    fr: "Tendance mensuelle",
  },
  "with forecasts (+2 months)": {
    it: "con previsioni (+2 mesi)",
    de: "mit Prognosen (+2 Monate)",
    fr: "avec prévisions (+2 mois)",
  },
  "Expense comparison {previous} vs {current}": {
    it: "Confronto spese {previous} vs {current}",
    de: "Ausgabenvergleich {previous} vs. {current}",
    fr: "Comparaison des dépenses {previous} vs {current}",
  },
  "Change by category (current year vs previous year)": {
    it: "Variazione per categoria (anno corrente vs anno precedente)",
    de: "Veränderung nach Kategorie (aktuelles Jahr vs. Vorjahr)",
    fr: "Variation par catégorie (année en cours vs année précédente)",
  },
  new: { it: "nuova", de: "neu", fr: "nouvelle" },
  "Expenses by category": {
    it: "Spese per categoria",
    de: "Ausgaben nach Kategorie",
    fr: "Dépenses par catégorie",
  },
  "Income by category": {
    it: "Entrate per categoria",
    de: "Einnahmen nach Kategorie",
    fr: "Revenus par catégorie",
  },
  " · with forecasts": {
    it: " · con previsioni",
    de: " · mit Prognosen",
    fr: " · avec prévisions",
  },
  "Print / Save as PDF": {
    it: "Stampa / Salva come PDF",
    de: "Drucken / Als PDF speichern",
    fr: "Imprimer / Enregistrer en PDF",
  },
  "Privacy notice": {
    it: "Informativa sulla privacy",
    de: "Datenschutzerklärung",
    fr: "Politique de confidentialité",
  },
  "Last updated: {date}": {
    it: "Ultimo aggiornamento: {date}",
    de: "Zuletzt aktualisiert: {date}",
    fr: "Dernière mise à jour : {date}",
  },
  "Controller and contact details": {
    it: "Titolare del trattamento e contatti",
    de: "Verantwortlicher und Kontaktdaten",
    fr: "Responsable du traitement et coordonnées",
  },
  "The controller for this installation is {name}. For personal-data requests, contact {email}.": {
    it: "Il titolare del trattamento per questa installazione è {name}. Per richieste relative ai dati personali, contatta {email}.",
    de: "Verantwortlicher für diese Installation ist {name}. Bei Anfragen zu personenbezogenen Daten kontaktiere {email}.",
    fr: "Le responsable du traitement de cette installation est {name}. Pour toute demande relative aux données personnelles, contactez {email}.",
  },
  "The controller for this installation is {name}.": {
    it: "Il titolare del trattamento per questa installazione è {name}.",
    de: "Verantwortlicher für diese Installation ist {name}.",
    fr: "Le responsable du traitement de cette installation est {name}.",
  },
  "For personal-data requests, contact": {
    it: "Per richieste relative ai dati personali, contatta",
    de: "Bei Anfragen zu personenbezogenen Daten kontaktiere",
    fr: "Pour toute demande relative aux données personnelles, contactez",
  },
  "Data and purposes": {
    it: "Dati e finalità",
    de: "Daten und Zwecke",
    fr: "Données et finalités",
  },
  "WallettuTrack processes your email address, name, bcrypt-hashed password, and financial data to provide authentication, account and transaction management, budgets, forecasts, imports, and backups.": {
    it: "WallettuTrack tratta indirizzo email, nome, password con hash bcrypt e dati finanziari per fornire autenticazione, gestione di conti e movimenti, budget, previsioni, importazioni e backup.",
    de: "WallettuTrack verarbeitet deine E-Mail-Adresse, deinen Namen, das mit bcrypt gehashte Passwort und Finanzdaten, um Authentifizierung, Konto- und Transaktionsverwaltung, Budgets, Prognosen, Importe und Sicherungen bereitzustellen.",
    fr: "WallettuTrack traite votre adresse e-mail, votre nom, votre mot de passe haché avec bcrypt et vos données financières afin de fournir l'authentification, la gestion des comptes et transactions, les budgets, les prévisions, les importations et les sauvegardes.",
  },
  "Cookies are used only where technically necessary for sessions, CSRF protection, preferences, and account selection. The application includes no advertising cookies or profiling tools.": {
    it: "I cookie sono usati solo quando tecnicamente necessari per sessioni, protezione CSRF, preferenze e selezione del conto. L'applicazione non include cookie pubblicitari né strumenti di profilazione.",
    de: "Cookies werden nur verwendet, soweit sie technisch für Sitzungen, CSRF-Schutz, Einstellungen und Kontoauswahl erforderlich sind. Die Anwendung enthält keine Werbe-Cookies oder Profiling-Werkzeuge.",
    fr: "Les cookies sont utilisés uniquement lorsqu'ils sont techniquement nécessaires aux sessions, à la protection CSRF, aux préférences et à la sélection du compte. L'application ne contient aucun cookie publicitaire ni outil de profilage.",
  },
  "To prevent abuse, the app temporarily stores hashed fingerprints of the network address and email used for sign-in or registration. These counters expire automatically within one hour.": {
    it: "Per prevenire abusi, l'app memorizza temporaneamente impronte con hash dell'indirizzo di rete e dell'email usati per l'accesso o la registrazione. Questi contatori scadono automaticamente entro un'ora.",
    de: "Um Missbrauch zu verhindern, speichert die App vorübergehend gehashte Fingerabdrücke der Netzwerkadresse und E-Mail, die bei Anmeldung oder Registrierung verwendet werden. Diese Zähler verfallen automatisch innerhalb einer Stunde.",
    fr: "Pour prévenir les abus, l'application stocke temporairement des empreintes hachées de l'adresse réseau et de l'e-mail utilisés lors de la connexion ou de l'inscription. Ces compteurs expirent automatiquement sous une heure.",
  },
  "Retention and recipients": {
    it: "Conservazione e destinatari",
    de: "Speicherung und Empfänger",
    fr: "Conservation et destinataires",
  },
  "Data remains in this installation's database until the account is deleted. Operational backups are retained for up to {days} days, unless the operator is subject to different obligations.": {
    it: "I dati restano nel database di questa installazione fino all'eliminazione dell'account. I backup operativi sono conservati fino a {days} giorni, salvo obblighi diversi del gestore.",
    de: "Die Daten bleiben bis zur Löschung des Kontos in der Datenbank dieser Installation. Betriebliche Sicherungen werden bis zu {days} Tage aufbewahrt, sofern der Betreiber keinen anderen Pflichten unterliegt.",
    fr: "Les données restent dans la base de données de cette installation jusqu'à la suppression du compte. Les sauvegardes opérationnelles sont conservées jusqu'à {days} jours, sauf obligations différentes de l'opérateur.",
  },
  "Data is not sold. It may be processed by technical providers selected by the controller for hosting, networking, and backups. The exchange-rate service is queried by the server without sending the user's transactions.": {
    it: "I dati non vengono venduti. Possono essere trattati da fornitori tecnici scelti dal titolare per hosting, rete e backup. Il servizio dei tassi di cambio viene interrogato dal server senza inviare i movimenti dell'utente.",
    de: "Daten werden nicht verkauft. Sie können von technischen Dienstleistern verarbeitet werden, die der Verantwortliche für Hosting, Netzwerk und Sicherungen auswählt. Der Wechselkursdienst wird vom Server abgefragt, ohne Transaktionen des Benutzers zu übermitteln.",
    fr: "Les données ne sont pas vendues. Elles peuvent être traitées par des prestataires techniques choisis par le responsable pour l'hébergement, le réseau et les sauvegardes. Le service de taux de change est interrogé par le serveur sans transmettre les transactions de l'utilisateur.",
  },
  "Rights and control of your data": {
    it: "Diritti e controllo dei dati",
    de: "Rechte und Kontrolle über deine Daten",
    fr: "Droits et contrôle de vos données",
  },
  "Settings let you export a complete backup and permanently delete your account. For access, correction, restriction, objection, or other requests, contact the controller at the address above.": {
    it: "Le Impostazioni consentono di esportare un backup completo ed eliminare definitivamente l'account. Per accesso, rettifica, limitazione, opposizione o altre richieste, contatta il titolare all'indirizzo indicato sopra.",
    de: "In den Einstellungen kannst du eine vollständige Sicherung exportieren und dein Konto dauerhaft löschen. Wende dich für Auskunft, Berichtigung, Einschränkung, Widerspruch oder andere Anfragen an den Verantwortlichen unter der oben genannten Adresse.",
    fr: "Les Paramètres permettent d'exporter une sauvegarde complète et de supprimer définitivement votre compte. Pour toute demande d'accès, de rectification, de limitation, d'opposition ou autre, contactez le responsable à l'adresse ci-dessus.",
  },
  "This installation is configured as private. Before making it public, set the controller's real details in the environment variables.": {
    it: "Questa installazione è configurata come privata. Prima di renderla pubblica, imposta i dati reali del titolare nelle variabili d'ambiente.",
    de: "Diese Installation ist als privat konfiguriert. Trage vor der Veröffentlichung die echten Angaben des Verantwortlichen in den Umgebungsvariablen ein.",
    fr: "Cette installation est configurée comme privée. Avant de la rendre publique, renseignez les coordonnées réelles du responsable dans les variables d'environnement.",
  },
  "Use of the service": {
    it: "Uso del servizio",
    de: "Nutzung des Dienstes",
    fr: "Utilisation du service",
  },
  "WallettuTrack is a personal organization tool. It does not provide financial, tax, legal, or accounting advice and does not replace statements issued by financial institutions.": {
    it: "WallettuTrack è uno strumento di organizzazione personale. Non fornisce consulenza finanziaria, fiscale, legale o contabile e non sostituisce gli estratti conto emessi dagli istituti finanziari.",
    de: "WallettuTrack ist ein Werkzeug zur persönlichen Organisation. Es bietet keine Finanz-, Steuer-, Rechts- oder Buchhaltungsberatung und ersetzt keine Auszüge von Finanzinstituten.",
    fr: "WallettuTrack est un outil d'organisation personnelle. Il ne fournit aucun conseil financier, fiscal, juridique ou comptable et ne remplace pas les relevés émis par les établissements financiers.",
  },
  "User responsibilities": {
    it: "Responsabilità dell'utente",
    de: "Verantwortung der Benutzer",
    fr: "Responsabilités de l'utilisateur",
  },
  "You are responsible for the accuracy of entered data, safeguarding your credentials, and regularly checking your backups. Abuse, unauthorized access attempts, and unlawful use are prohibited.": {
    it: "Sei responsabile dell'accuratezza dei dati inseriti, della protezione delle credenziali e del controllo regolare dei backup. Sono vietati abusi, tentativi di accesso non autorizzato e usi illeciti.",
    de: "Du bist für die Richtigkeit der eingegebenen Daten, den Schutz deiner Zugangsdaten und die regelmäßige Prüfung deiner Sicherungen verantwortlich. Missbrauch, unbefugte Zugriffsversuche und rechtswidrige Nutzung sind untersagt.",
    fr: "Vous êtes responsable de l'exactitude des données saisies, de la protection de vos identifiants et de la vérification régulière de vos sauvegardes. Les abus, tentatives d'accès non autorisé et utilisations illicites sont interdits.",
  },
  "Availability and license": {
    it: "Disponibilità e licenza",
    de: "Verfügbarkeit und Lizenz",
    fr: "Disponibilité et licence",
  },
  "The service may be suspended for maintenance or security. The software is distributed under the GNU Affero General Public License 3.0; corresponding source code must be made available where required by the license.": {
    it: "Il servizio può essere sospeso per manutenzione o sicurezza. Il software è distribuito con licenza GNU Affero General Public License 3.0; il relativo codice sorgente deve essere reso disponibile quando richiesto dalla licenza.",
    de: "Der Dienst kann für Wartung oder Sicherheit ausgesetzt werden. Die Software wird unter der GNU Affero General Public License 3.0 verbreitet; der entsprechende Quellcode muss bereitgestellt werden, soweit die Lizenz dies verlangt.",
    fr: "Le service peut être suspendu pour maintenance ou sécurité. Le logiciel est distribué sous la GNU Affero General Public License 3.0 ; le code source correspondant doit être mis à disposition lorsque la licence l'exige.",
  },
  "Monthly report": {
    it: "Report mensile",
    de: "Monatsbericht",
    fr: "Rapport mensuel",
  },
  "Expense report · {month}": {
    it: "Report delle spese · {month}",
    de: "Ausgabenbericht · {month}",
    fr: "Rapport de dépenses · {month}",
  },
  "{user} · {account} · generated on {date} · values in {currency}": {
    it: "{user} · {account} · generato il {date} · valori in {currency}",
    de: "{user} · {account} · erstellt am {date} · Werte in {currency}",
    fr: "{user} · {account} · généré le {date} · valeurs en {currency}",
  },
  "← Previous month": {
    it: "← Mese precedente",
    de: "← Vorheriger Monat",
    fr: "← Mois précédent",
  },
  "Next month →": {
    it: "Mese successivo →",
    de: "Nächster Monat →",
    fr: "Mois suivant →",
  },
  "Net balance": { it: "Saldo netto", de: "Nettosaldo", fr: "Solde net" },
  "Previous month: expenses {expenses} · income {income}": {
    it: "Mese precedente: spese {expenses} · entrate {income}",
    de: "Vorheriger Monat: Ausgaben {expenses} · Einnahmen {income}",
    fr: "Mois précédent : dépenses {expenses} · revenus {income}",
  },
  " · expense change {percent}%": {
    it: " · variazione spese {percent}%",
    de: " · Ausgabenänderung {percent}%",
    fr: " · variation des dépenses {percent} %",
  },
  "Expenses by category ({count})": {
    it: "Spese per categoria ({count})",
    de: "Ausgaben nach Kategorie ({count})",
    fr: "Dépenses par catégorie ({count})",
  },
  "Previous month": {
    it: "Mese precedente",
    de: "Vorheriger Monat",
    fr: "Mois précédent",
  },
  Share: { it: "Quota", de: "Anteil", fr: "Part" },
  "Monthly budgets": {
    it: "Budget mensili",
    de: "Monatliche Budgets",
    fr: "Budgets mensuels",
  },
  "Next 30 days (forecast)": {
    it: "Prossimi 30 giorni (previsione)",
    de: "Nächste 30 Tage (Prognose)",
    fr: "30 prochains jours (prévision)",
  },
  "{count} planned movements · forecast expenses {expenses} · income {income}": {
    it: "{count} movimenti pianificati · spese previste {expenses} · entrate {income}",
    de: "{count} geplante Transaktionen · prognostizierte Ausgaben {expenses} · Einnahmen {income}",
    fr: "{count} mouvements planifiés · dépenses prévues {expenses} · revenus {income}",
  },
  Movement: { it: "Movimento", de: "Transaktion", fr: "Mouvement" },
  event: { it: "evento", de: "Ereignis", fr: "événement" },
  "…and {count} more": {
    it: "…e altri {count}",
    de: "…und {count} weitere",
    fr: "…et {count} autres",
  },
  "Note: forecasts include planned movements only; ordinary future spending is not included.": {
    it: "Nota: le previsioni includono solo i movimenti pianificati; le normali spese future non sono incluse.",
    de: "Hinweis: Prognosen enthalten nur geplante Transaktionen; gewöhnliche zukünftige Ausgaben sind nicht enthalten.",
    fr: "Remarque : les prévisions incluent uniquement les mouvements planifiés ; les dépenses futures ordinaires ne sont pas incluses.",
  },
  "Generated with WallettuTrack · forecast included: {amount}": {
    it: "Generato con WallettuTrack · previsione inclusa: {amount}",
    de: "Erstellt mit WallettuTrack · Prognose enthalten: {amount}",
    fr: "Généré avec WallettuTrack · prévision incluse : {amount}",
  },
  "Generated with WallettuTrack · no forecast in this period": {
    it: "Generato con WallettuTrack · nessuna previsione in questo periodo",
    de: "Erstellt mit WallettuTrack · keine Prognose in diesem Zeitraum",
    fr: "Généré avec WallettuTrack · aucune prévision sur cette période",
  },
};

export function resolveLocale(value?: string | null): AppLocale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace("_", "-");
  const language = normalized.split("-")[0];
  return SUPPORTED_LOCALES.find((locale) => locale === language) ?? null;
}

export function resolvePreferredLocale(
  acceptLanguage?: string | null
): AppLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferences = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((part) =>
        part.trim().startsWith("q=")
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      return {
        locale: resolveLocale(tag),
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.locale && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  return preferences[0]?.locale ?? DEFAULT_LOCALE;
}

export function getIntlLocale(locale: AppLocale): string {
  return (
    LOCALE_OPTIONS.find((option) => option.value === locale)?.intlLocale ??
    "en-GB"
  );
}

export function translate(
  locale: AppLocale,
  message: string,
  values?: TranslationValues
): string {
  const template =
    locale === "en" ? message : (MESSAGES[message]?.[locale] ?? message);

  if (!values) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match
  );
}

export function hasCompleteTranslation(message: string): boolean {
  const translation = MESSAGES[message];
  return Boolean(translation?.it && translation?.de && translation?.fr);
}

export function getRegisteredMessages(): ReadonlyArray<string> {
  return Object.keys(MESSAGES);
}
