import ptTranslations from './pt.json';
import enTranslations from './en.json';

const translations = {
  pt: ptTranslations,
  en: enTranslations
};

const STORAGE_KEY = 'portfolio-lang';

/**
 * Detects preferred language based on timezone.
 * Brazil (America/Sao_Paulo, etc.) and Portugal (Europe/Lisbon) → pt
 * Everything else → en
 */
function detectLanguageFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Brazilian timezones
    const ptTimezones = [
      'America/Sao_Paulo', 'America/Rio_Branco', 'America/Manaus',
      'America/Cuiaba', 'America/Campo_Grande', 'America/Belem',
      'America/Fortaleza', 'America/Recife', 'America/Araguaina',
      'America/Maceio', 'America/Bahia', 'America/Noronha',
      'America/Porto_Velho', 'America/Boa_Vista', 'America/Eirunepe',
      'America/Santarem',
      // Portuguese timezone
      'Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores'
    ];
    if (ptTimezones.includes(tz)) {
      return 'pt';
    }
  } catch (e) {
    // fallback
  }
  return 'en';
}

/**
 * Gets the current language: user preference > timezone detection
 */
export function getCurrentLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && translations[stored]) {
    return stored;
  }
  return detectLanguageFromTimezone();
}

/**
 * Sets the language preference and applies translations
 */
export function setLanguage(lang) {
  if (!translations[lang]) return;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(lang);
  updateLanguageSelector(lang);
  // Update html lang attribute
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  // Update meta tags
  const t = translations[lang];
  document.title = t.meta.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t.meta.description);
}

/**
 * Custom text scrambler
 */
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
export function scrambleText(element, targetText = null, duration = 800) {
  const finalString = targetText || element.textContent;
  const length = finalString.length;
  let start = Date.now();
  
  function update() {
    let now = Date.now();
    let progress = (now - start) / duration;
    if (progress > 1) progress = 1;
    
    let scrambled = "";
    for (let i = 0; i < length; i++) {
      if (finalString[i] === ' ' || finalString[i] === '✦' || finalString[i] === '→') {
        scrambled += finalString[i];
        continue;
      }
      if (Math.random() < progress) {
        scrambled += finalString[i];
      } else {
        scrambled += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    element.textContent = scrambled;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = finalString;
    }
  }
  requestAnimationFrame(update);
}

/**
 * Traverses all elements with data-i18n and updates their text
 */
function applyTranslations(lang) {
  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = getNestedValue(t, key);
    if (value !== undefined) {
      if (el.classList.contains('hero-word')) {
        el.textContent = value;
      } else {
        scrambleText(el, value);
      }
    }
  });
}

/**
 * Accesses nested object properties via dot notation string
 * e.g., "nav.about" → translations.nav.about
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

/**
 * Updates the visual state of the language selector buttons
 */
function updateLanguageSelector(lang) {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

/**
 * Initializes the i18n system
 */
export function initI18n() {
  const lang = getCurrentLanguage();
  applyTranslations(lang);
  updateLanguageSelector(lang);
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

  // Update meta on init
  const t = translations[lang];
  document.title = t.meta.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t.meta.description);

  // Bind language selector buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
    });
  });
}
