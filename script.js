const canvas = document.querySelector('#garden');
const scene = document.querySelector('.scene');
const cover = document.querySelector('#cover');
const openSurprise = document.querySelector('#openSurprise');
const ctx = canvas.getContext('2d');
const soundToggle = document.querySelector('#soundToggle');
const soundLabel = document.querySelector('#soundLabel');
const replayButton = document.querySelector('#replay');
const youtubeMusic = document.querySelector('#youtubeMusic');
const hint = document.querySelector('#hint');

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let startTime = performance.now();
let flowers = [];
let particles = [];
let audioContext;
let masterGain;
let musicTimer;
let musicOn = true;

const notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 392];

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seedGarden();
}

function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function seedGarden() {
  flowers = [];
  const count = Math.round(clamp(width / 13, 42, 92));
  for (let index = 0; index < count; index += 1) {
    const depth = Math.random();
    const baseY = height * (0.56 + depth * 0.52);
    flowers.push({
      x: random(-30, width + 30),
      baseY,
      height: random(75, 245) * (0.72 + depth * 0.42),
      size: random(7, 17) * (0.7 + depth * 0.7),
      sway: random(7, 25) * (0.8 + depth),
      phase: random(0, Math.PI * 2),
      speed: random(0.65, 1.25),
      depth,
      born: random(0, 1.3),
      petals: Math.floor(random(8, 13)),
      hue: random(-4, 9),
    });
  }
  flowers.sort((a, b) => a.depth - b.depth);
}

function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#72ad7a');
  sky.addColorStop(.44, '#c7dc8b');
  sky.addColorStop(.72, '#e7bd58');
  sky.addColorStop(1, '#734729');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * .82, height * .13, 0, width * .82, height * .13, width * .6);
  glow.addColorStop(0, 'rgba(255, 247, 175, .55)');
  glow.addColorStop(.25, 'rgba(255, 224, 110, .16)');
  glow.addColorStop(1, 'rgba(255, 215, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const haze = ctx.createLinearGradient(0, height * .45, 0, height * .85);
  haze.addColorStop(0, 'rgba(246, 236, 164, .1)');
  haze.addColorStop(1, 'rgba(245, 181, 43, .03)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * .4, width, height * .5);

  const breeze = Math.sin(time * .00015) * 3;
  ctx.strokeStyle = 'rgba(247, 238, 157, .11)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.moveTo(width * .36 + index * 46 + breeze, height * (.62 + index * .035));
    ctx.quadraticCurveTo(width * .57, height * (.56 + index * .04), width + 20, height * (.63 + index * .028));
    ctx.stroke();
  }
}

function drawFlower(flower, time) {
  const birth = clamp((time - startTime) / 1000 - flower.born, 0, 1);
  if (birth <= 0) return;
  const ease = 1 - Math.pow(1 - birth, 3);
  const wind = Math.sin(time * .001 * flower.speed + flower.phase) * flower.sway;
  const x = flower.x + wind;
  const topY = flower.baseY - flower.height * ease;
  const stemColor = `rgba(${38 + flower.depth * 25}, ${91 + flower.depth * 45}, ${48 + flower.depth * 18}, ${.78 + flower.depth * .2})`;

  ctx.save();
  ctx.globalAlpha = .48 + flower.depth * .52;
  ctx.lineCap = 'round';
  ctx.strokeStyle = stemColor;
  ctx.lineWidth = 1.2 + flower.depth * 1.5;
  ctx.beginPath();
  ctx.moveTo(flower.x, flower.baseY + 14);
  ctx.bezierCurveTo(flower.x - wind * .15, flower.baseY - flower.height * .32, x + wind * .1, topY + flower.height * .28, x, topY);
  ctx.stroke();

  const leafY = flower.baseY - flower.height * .35;
  ctx.fillStyle = stemColor;
  ctx.beginPath();
  ctx.ellipse(flower.x - 9, leafY, 12 + flower.depth * 4, 4, -.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(flower.x + 7, leafY - 18, 13 + flower.depth * 3, 4, .5, 0, Math.PI * 2);
  ctx.fill();

  if (birth < .58) { ctx.restore(); return; }
  const bloom = clamp((birth - .58) / .42, 0, 1);
  const petalRadius = flower.size * bloom;
  const centerRadius = flower.size * .34 * bloom;
  ctx.translate(x, topY);
  ctx.rotate(Math.sin(flower.phase) * .1 + wind * .008);
  ctx.globalAlpha *= bloom;
  ctx.shadowColor = 'rgba(114, 63, 12, .22)';
  ctx.shadowBlur = 8;
  for (let petal = 0; petal < flower.petals; petal += 1) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * petal) / flower.petals);
    const shade = Math.round(194 + flower.depth * 34 + flower.hue);
    ctx.fillStyle = `rgb( ${Math.min(255, shade + 42)}, ${Math.min(245, shade - 26)}, ${Math.max(18, shade - 164)} )`;
    ctx.beginPath();
    ctx.ellipse(0, -petalRadius * .72, petalRadius * .39, petalRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 3;
  ctx.fillStyle = flower.depth > .45 ? '#ac6812' : '#8f5718';
  ctx.beginPath();
  ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 213, 69, .65)';
  for (let dot = 0; dot < 5; dot += 1) {
    const angle = dot * 1.25;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * centerRadius * .55, Math.sin(angle) * centerRadius * .55, Math.max(1, flower.size * .08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function makeParticle(x, y) {
  particles.push({ x, y, vx: random(-.45, .45), vy: random(-1.1, -.2), life: 1, size: random(1, 3), hue: random(39, 58) });
}

function drawParticles(time) {
  if (Math.random() < .24) makeParticle(random(0, width), random(height * .2, height * .8));
  particles = particles.filter((particle) => particle.life > 0);
  for (const particle of particles) {
    particle.x += particle.vx + Math.sin(time * .001 + particle.y) * .12;
    particle.y += particle.vy;
    particle.life -= .004;
    ctx.globalAlpha = particle.life * .55;
    ctx.fillStyle = `hsl(${particle.hue}, 90%, 75%)`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function animate(time) {
  drawBackground(time);
  for (const flower of flowers) drawFlower(flower, time);
  drawParticles(time);
  requestAnimationFrame(animate);
}

function triggerBloom(x, y) {
  for (let index = 0; index < 12; index += 1) makeParticle(x + random(-22, 22), y + random(-22, 22));
}

function playNote(frequency, delay) {
  if (!audioContext || !masterGain) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, audioContext.currentTime + delay);
  gain.gain.linearRampToValueAtTime(.07, audioContext.currentTime + delay + .05);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + delay + 1.9);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(audioContext.currentTime + delay);
  oscillator.stop(audioContext.currentTime + delay + 2);
}

function startMusic() {
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  masterGain = masterGain || audioContext.createGain();
  masterGain.gain.value = .42;
  masterGain.connect(audioContext.destination);
  let index = 0;
  const play = () => {
    if (!musicOn) return;
    playNote(notes[index % notes.length], 0);
    playNote(notes[(index + 2) % notes.length] / 2, .05);
    index += 1;
    musicTimer = window.setTimeout(play, 1350);
  };
  play();
}

async function attemptAutoplay() {
  musicOn = true;
  soundToggle.setAttribute('aria-pressed', 'true');
  soundLabel.textContent = 'pausar música';
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    startMusic();
  } catch (error) {
    musicOn = false;
    soundToggle.setAttribute('aria-pressed', 'false');
    soundLabel.textContent = 'encender música';
  }
}

function toggleMusic() {
  musicOn = !musicOn;
  soundToggle.setAttribute('aria-pressed', String(musicOn));
  soundLabel.textContent = musicOn ? 'pausar música' : 'encender música';
  youtubeMusic.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: musicOn ? 'playVideo' : 'pauseVideo',
    args: [],
  }), '*');
  hint.style.opacity = '0';
}

function unlockAudio() {
  if (!musicOn) return;
  if (!audioContext) {
    startMusic();
    return;
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function openTheSurprise() {
  scene.classList.add('cover-open');
  cover.setAttribute('aria-hidden', 'true');
  startTime = performance.now();
  unlockAudio();
  youtubeMusic.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: 'playVideo',
    args: [],
  }), '*');
}

function replay() {
  startTime = performance.now();
  particles = [];
  hint.style.opacity = '0';
  window.setTimeout(() => { hint.style.opacity = ''; }, 1400);
}

window.addEventListener('resize', resize);
soundToggle.addEventListener('click', toggleMusic);
replayButton.addEventListener('click', replay);
openSurprise.addEventListener('click', openTheSurprise);
canvas.addEventListener('pointerdown', (event) => triggerBloom(event.clientX, event.clientY));
document.addEventListener('pointerdown', unlockAudio);
resize();
requestAnimationFrame(animate);
