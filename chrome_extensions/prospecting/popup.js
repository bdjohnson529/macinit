// Injected into the LinkedIn page via chrome.scripting.executeScript.
// Runs in the page context, so no extension APIs are available here.
function scrapeLinkedInProfile() {

  // LinkedIn injects visually-hidden skip links (e.g. "Click to skip the experience card")
  // into the DOM for keyboard/screen-reader navigation. Their text leaks into .textContent
  // on parent nodes. Strip those nodes from a clone before reading any text.
  function cleanText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll([
      '[class*="visually-hidden"]',
      '[class*="sr-only"]',
      '[class*="a11y-text"]',
      '[class*="screen-reader"]',
      '[class*="t-0"]',   // LinkedIn's own zero-opacity utility
    ].join(',')).forEach(n => n.remove());
    // Belt-and-suspenders: drop any remaining node whose text is purely a skip instruction
    clone.querySelectorAll('*').forEach(n => {
      if (/\bskip\b/i.test(n.textContent) && n.children.length === 0) n.remove();
    });
    return (clone.innerText || clone.textContent || '').trim();
  }

  const result = { firstName: 'there', company: '[Company]' };

  // --- First name from <h1> ---
  const h1 = document.querySelector('main h1') || document.querySelector('h1');
  if (h1) {
    result.firstName = cleanText(h1).split(/\s+/)[0] || 'there';
  }

  // --- Current company: four strategies in order of reliability ---

  // S1: aria-label="Current company: …" — read from the attribute itself, not text content
  const ariaEl = document.querySelector(
    '[aria-label*="Current company"], [aria-label*="current company"]'
  );
  if (ariaEl) {
    const label = ariaEl.getAttribute('aria-label') || '';
    const parsed = label.replace(/current company:\s*/i, '').trim();
    if (parsed && !/\bskip\b/i.test(parsed)) {
      result.company = parsed;
      return result;
    }
    const text = cleanText(ariaEl).split('\n')[0].trim();
    if (text && !/\bskip\b/i.test(text)) {
      result.company = text;
      return result;
    }
  }

  // S2: Experience section — first list item whose date range says "Present"
  const expSection = document.getElementById('experience');
  if (expSection) {
    const section = expSection.closest('section') || expSection.parentElement;
    if (section) {
      for (const li of section.querySelectorAll('li')) {
        if (!/present/i.test(li.innerText || li.textContent)) continue;

        // 2a: a direct /company/ link inside the item is the most precise signal
        const compLink = li.querySelector('a[href*="/company/"]');
        if (compLink) {
          const t = cleanText(compLink).split('\n')[0].trim();
          if (t && !/\bskip\b/i.test(t)) { result.company = t; return result; }
        }

        // 2b: aria-hidden="true" spans are LinkedIn's visual-only text duplicates;
        //     the company name lives here before the role title
        for (const span of li.querySelectorAll('span[aria-hidden="true"]')) {
          const t = span.textContent.trim();
          if (
            t.length > 2 &&
            !/^\d{4}/.test(t) &&
            t !== '·' &&
            !/\bskip\b/i.test(t)
          ) {
            result.company = t.split('\n')[0].trim();
            return result;
          }
        }
        break;
      }
    }
  }

  // S3: /company/ link inside the profile top-card
  const topCard =
    document.querySelector('[data-view-name="profile-card"]') ||
    document.querySelector('.pv-top-card') ||
    document.querySelector('main section:first-of-type');
  if (topCard) {
    const companyLink = topCard.querySelector('a[href*="/company/"]');
    if (companyLink) {
      const t = cleanText(companyLink).split('\n')[0].trim();
      if (t && !/\bskip\b/i.test(t)) { result.company = t; return result; }
    }
  }

  // S4: First /company/ link anywhere on the page
  const firstCompanyLink = document.querySelector('a[href*="/company/"]');
  if (firstCompanyLink) {
    const t = cleanText(firstCompanyLink).split('\n')[0].trim();
    if (t && !/\bskip\b/i.test(t)) result.company = t;
  }

  return result;
}

function buildMessage(firstName, company, teamName) {
  const team = (teamName || 'Engineering').trim() || 'Engineering';
  return `Hi ${firstName}, came across your profile when researching the ${team} team at ${company}. I'm really impressed by the work your team is doing. Would love to connect.`;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = isError ? 'error' : '';
}

async function generate() {
  const btn = document.getElementById('btn-generate');
  const output = document.getElementById('output');
  const teamName = document.getElementById('team-name').value;

  btn.disabled = true;
  btn.textContent = 'Scraping…';
  setStatus('');
  output.value = '';

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    setStatus('Could not access the current tab.', true);
    btn.disabled = false;
    btn.textContent = 'Generate';
    return;
  }

  if (!tab?.url?.includes('linkedin.com/in/')) {
    setStatus('Navigate to a LinkedIn profile page first.', true);
    output.value = '';
    btn.disabled = false;
    btn.textContent = 'Generate';
    return;
  }

  try {
    const [{ result: data }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeLinkedInProfile,
    });

    output.value = buildMessage(data.firstName, data.company, teamName);

    const missing = [];
    if (data.firstName === 'there') missing.push('name');
    if (data.company === '[Company]') missing.push('company');
    if (missing.length) {
      setStatus(`Could not detect ${missing.join(' or ')} — placeholders used.`, true);
    } else {
      setStatus('Ready.');
    }
  } catch (err) {
    setStatus(`Error: ${err.message}`, true);
  }

  btn.disabled = false;
  btn.textContent = 'Regenerate';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-generate').addEventListener('click', generate);

  document.getElementById('btn-copy').addEventListener('click', () => {
    const text = document.getElementById('output').value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  });

  // Auto-scrape when the side panel first opens
  generate();

  // Re-scrape whenever the active tab finishes loading a LinkedIn profile page.
  // This keeps the panel current as the user browses from profile to profile.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url?.includes('linkedin.com/in/')) return;
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (activeTab?.id === tabId) generate();
    });
  });

  // Re-scrape when the user switches to a tab that's already on a LinkedIn profile.
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab.url?.includes('linkedin.com/in/') && tab.status === 'complete') generate();
    });
  });
});
