const byId = (id) => document.getElementById(id);

function readingDays(days) {
  return days + (days === 1 ? ' den' : days >= 2 && days <= 4 ? ' dny' : ' dní');
}

function reader(name, style, rate, day, previousDay) {
  const bookLength = 120;
  const pages = Math.min(day * rate, bookLength);
  const previousPages = Math.min(previousDay * rate, bookLength);
  const turnsPage = pages !== previousPages;
  const explanation = style === 'hana'
    ? '10 stran za den'
    : '10 + 5 = 15 stran za den';
  let today = 'Ještě nezačala číst.';
  if (day > 0) {
    today = day * rate > bookLength ? 'Knihu už dočetla.' :
      day + '. den přečetla ' + rate + ' stran.';
    if (day * rate === bookLength) today += ' Dnes dočetla.';
  }
  const illustration = '<div class="reading-desk" aria-hidden="true"><div class="reader-person">' +
    '<span class="reader-shirt"></span><span class="reader-hair"></span><span class="reader-face"></span>' +
    '<span class="reader-fringe"></span><span class="reader-arm"></span></div>' +
    '<div class="open-book"><span class="book-left"></span><span class="book-right"></span>' +
    '<span class="book-turn"></span></div></div>';
  const reason = style === 'adela'
    ? '<p class="reader-reason">Polovina z Haniných 10 stran je 5. Adéla je přičte k deseti.</p>'
    : '';
  return '<article class="reader ' + style + (turnsPage ? ' turning' : '') +
    (day < previousDay ? ' backwards' : '') + '"><h3>' + name + '</h3>' + illustration +
    '<p class="reader-rate">' + explanation + '</p>' + reason +
    '<p class="reader-today">' + today + '</p>' +
    bar('Přečteno', pages + ' / ' + bookLength + ' stran', pages / bookLength * 100,
      style === 'hana' ? 'blue' : 'rose') + '</article>';
}

function bar(label, value, percent, color) {
  return '<div class="bar-row"><div class="bar-label"><span>' + label + '</span><strong>' + value +
    '</strong></div><div class="bar" aria-hidden="true"><span class="' + color + '" style="width:' + percent + '%"></span></div></div>';
}

const slider = byId('model');
const answer = byId('days');
const feedback = byId('feedback');
const modes = document.querySelectorAll('[data-mode]');
let currentDay = Number(slider.value);
const hanaFinish = 12;

function setMode(mode) {
  byId('simulator').hidden = mode !== 'simulator';
  byId('schema').hidden = mode !== 'schema';
  byId('layout').classList.toggle('solo', mode === 'solo');
  for (const button of modes) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  }
}

function showDay(day) {
  slider.value = day;
  byId('value').value = readingDays(day);
  slider.setAttribute('aria-valuetext', readingDays(day));
  byId('scene').innerHTML = '<div class="readers">' +
    reader('Hana', 'hana', 10, day, currentDay) +
    reader('Adéla', 'adela', 15, day, currentDay) + '</div>';
  currentDay = day;
}

for (const button of modes) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}
slider.addEventListener('input', () => showDay(Number(slider.value)));
showDay(currentDay);

byId('answers').addEventListener('submit', (event) => {
  event.preventDefault();
  if (answer.disabled) return;
  const correct = answer.valueAsNumber === hanaFinish;
  answer.dataset.correct = correct ? 'yes' : 'no';
  answer.disabled = true;
  byId('submit').hidden = true;
  byId('retry').hidden = false;
  feedback.textContent = (correct ? 'Správně.' : 'Zkus to ještě jednou.') +
    ' Výsledek si můžeš prohlédnout v simulátoru.';
  feedback.hidden = false;
  setMode('simulator');
  showDay(hanaFinish);
  feedback.focus();
});

byId('retry').addEventListener('click', () => {
  byId('answers').reset();
  answer.disabled = false;
  delete answer.dataset.correct;
  feedback.hidden = true;
  byId('submit').hidden = false;
  byId('retry').hidden = true;
  showDay(Number(slider.defaultValue));
  answer.focus();
});
