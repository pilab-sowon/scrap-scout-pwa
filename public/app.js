import { estimateScrapValue } from './calculator.js';

const MATERIALS = {
  steel: { label: '고철 · 철', min: 250, max: 450 },
  stainless: { label: '스테인리스', min: 1100, max: 1900 },
  aluminum: { label: '알루미늄', min: 1500, max: 2400 },
  brass: { label: '황동', min: 6000, max: 8000 },
  copper: { label: '구리 · 동관', min: 9000, max: 12000 },
  wire: { label: '피복 전선', min: 3000, max: 7000 },
};

const VERDICTS = {
  worth_it: { badge: '주울 가치 있음', text: '보수적으로 계산해도 희망수익을 넘습니다.', tone: 'good' },
  maybe: { badge: '묶음 수거 추천', text: '상단 가격을 받거나 다른 고물과 함께 가져갈 때 수익이 납니다.', tone: 'maybe' },
  not_worth_it: { badge: '지나치기', text: '운반비를 고려하면 손해일 가능성이 높습니다.', tone: 'bad' },
};

const $ = (selector) => document.querySelector(selector);
const form = $('#estimateForm');
const material = $('#material');
const minRate = $('#minRate');
const maxRate = $('#maxRate');
const weight = $('#weight');
const transportCost = $('#transportCost');
const minimumProfit = $('#minimumProfit');
const locationInput = $('#location');
const result = $('#result');
const formError = $('#formError');
const historyList = $('#historyList');
const installButton = $('#installButton');
let deferredInstallPrompt = null;
let lastShareText = '';
let previewUrl = null;

const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('ko-KR');

function setMaterialRates() {
  const preset = MATERIALS[material.value];
  minRate.value = preset.min;
  maxRate.value = preset.max;
}

function selectedRecoveryRate() {
  return Number(document.querySelector('input[name="condition"]:checked').value);
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function hideError() {
  formError.hidden = true;
  formError.textContent = '';
}

function readEstimateInput() {
  return {
    weightKg: Number(weight.value),
    minRate: Number(minRate.value),
    maxRate: Number(maxRate.value),
    recoveryRate: selectedRecoveryRate(),
    transportCost: Number(transportCost.value || 0),
    minimumProfit: Number(minimumProfit.value || 0),
  };
}

function renderResult(input, estimate) {
  const verdict = VERDICTS[estimate.verdict];
  result.dataset.tone = verdict.tone;
  $('#resultBadge').textContent = verdict.badge;
  $('#netValue').textContent = `${won.format(estimate.netMin)} ~ ${won.format(estimate.netMax)}`;
  $('#verdictText').textContent = verdict.text;
  $('#grossValue').textContent = `${won.format(estimate.grossMin)} ~ ${won.format(estimate.grossMax)}`;
  $('#recoveryValue').textContent = `${Math.round(input.recoveryRate * 100)}%`;
  $('#rateValue').textContent = `${number.format(input.minRate)}~${number.format(input.maxRate)}원/kg`;
  $('#weightValue').textContent = `${number.format(input.weightKg)}kg`;
  $('#safetyNote').hidden = input.recoveryRate > 0.35;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const materialLabel = MATERIALS[material.value].label;
  lastShareText = `[줍줍값] ${materialLabel} ${input.weightKg}kg\n예상 매입가 ${won.format(estimate.grossMin)}~${won.format(estimate.grossMax)}\n운반비 차감 ${won.format(estimate.netMin)}~${won.format(estimate.netMax)}\n판정: ${verdict.badge}`;

  saveHistory({
    id: Date.now(),
    material: materialLabel,
    location: locationInput.value.trim(),
    weight: input.weightKg,
    netMin: estimate.netMin,
    netMax: estimate.netMax,
    verdict: verdict.badge,
    tone: verdict.tone,
  });
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem('scrap-scout-history') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => (
      entry && typeof entry.material === 'string' && typeof entry.verdict === 'string'
      && Number.isFinite(entry.weight) && Number.isFinite(entry.netMin) && Number.isFinite(entry.netMax)
    ));
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  try {
    const history = [entry, ...getHistory()].slice(0, 8);
    localStorage.setItem('scrap-scout-history', JSON.stringify(history));
  } catch {
    // 저장 공간을 사용할 수 없어도 현재 계산 결과는 정상 표시한다.
  }
  renderHistory();
}

function appendTextElement(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function renderHistory() {
  const history = getHistory();
  historyList.replaceChildren();
  if (!history.length) {
    appendTextElement(historyList, 'p', '아직 계산한 물건이 없습니다.', 'empty-state');
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement('article');
    item.className = 'history-item';

    const icon = appendTextElement(item, 'span', entry.material.slice(0, 1), 'history-icon');
    icon.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('div');
    copy.className = 'history-copy';
    appendTextElement(copy, 'strong', `${entry.material} · ${entry.weight}kg`);
    appendTextElement(copy, 'small', entry.location || '지역 미입력');
    item.append(copy);

    const price = document.createElement('div');
    price.className = 'history-price';
    appendTextElement(price, 'strong', `${won.format(entry.netMin)}~${won.format(entry.netMax)}`);
    const badge = appendTextElement(price, 'small', entry.verdict);
    badge.dataset.tone = entry.tone;
    item.append(price);
    historyList.append(item);
  });
}

material.addEventListener('change', setMaterialRates);

document.querySelectorAll('[data-weight]').forEach((button) => {
  button.addEventListener('click', () => {
    weight.value = button.dataset.weight;
    weight.focus();
  });
});

$('#photoInput').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showError('이미지 파일만 선택할 수 있습니다.');
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  const preview = $('#photoPreview');
  preview.src = previewUrl;
  preview.hidden = false;
  $('#cameraPrompt').hidden = true;
  hideError();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  hideError();

  if (!form.reportValidity()) return;
  try {
    const input = readEstimateInput();
    const estimate = estimateScrapValue(input);
    renderResult(input, estimate);
  } catch (error) {
    showError(error instanceof Error ? error.message : '입력값을 다시 확인해 주세요.');
  }
});

$('#resetButton').addEventListener('click', () => {
  result.hidden = true;
  weight.value = '';
  weight.focus();
  window.scrollTo({ top: form.offsetTop - 20, behavior: 'smooth' });
});

$('#shareButton').addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: '줍줍값 계산 결과', text: lastShareText });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(lastShareText);
    $('#shareButton').textContent = '복사됨';
    window.setTimeout(() => { $('#shareButton').textContent = '공유'; }, 1500);
  } catch {
    showError('공유할 수 없습니다. 결과를 직접 선택해 복사해 주세요.');
  }
});

$('#clearHistory').addEventListener('click', () => {
  try {
    localStorage.removeItem('scrap-scout-history');
  } catch {
    showError('이 브라우저에서는 기록을 삭제할 수 없습니다.');
  }
  renderHistory();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  deferredInstallPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

setMaterialRates();
renderHistory();
