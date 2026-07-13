// =======================================================
// PRESET DATA — setiap tim punya ID TETAP.
// Mengubah nama tim di web TIDAK mengubah ID ini, jadi
// urutan pemenang di bawah tetap valid walau nama diedit.
// =======================================================

const presetTeams = [
  { id:"t1",  name:"Choice 1" },
  { id:"t2",  name:"Choice 2" },
  { id:"t3",  name:"Choice 3" },
  { id:"t4",  name:"Choice 4" },
  { id:"t5",  name:"Choice 5" },
  { id:"t6",  name:"Choice 6" },
  { id:"t7",  name:"Choice 7" },
  { id:"t8",  name:"Choice 8" },
  { id:"t9",  name:"Choice 9" },
  { id:"t10", name:"Choice 10" },
  { id:"t11", name:"Choice 11" },
  { id:"t12", name:"Choice 12" },
  { id:"t13", name:"Choice 13" },
  { id:"t14", name:"Choice 14" },
  { id:"t15", name:"Choice 15" },
  { id:"t16", name:"Choice 16" },
];

// =======================================================
// >>> HASIL UNDIAN SUDAH DITENTUKAN DI SINI <<<
// Ini urutan SLOT (posisi ke berapa di daftar, dihitung dari 0)
// yang akan "menang" setiap kali spin ditekan, diputar berulang
// kalau sudah habis.
//
// Contoh: angka 8 di posisi pertama artinya "tim urutan ke-9 di
// daftar" yang menang duluan — TIDAK PEDULI nama apa yang diisi
// di slot itu, dan TIDAK PEDULI apakah itu tim preset atau tim
// yang kamu ketik sendiri setelah klik "Kosongkan".
//
// Kalau jumlah tim di daftar lebih sedikit dari posisi yang
// diminta (misalnya baru ada 5 tim tapi urutan minta slot ke-9),
// slot itu dilewati dan lanjut ke slot berikutnya yang valid.
//
// Ganti angka-angka di bawah ini untuk mengatur urutan hasil.
// =======================================================
const winOrder = [8,2,1,6,13,0,5,3,11,7,12,4,10,14,9,15];

let winPointer = 0; // posisi berikutnya di winOrder yang akan diambil

const wheelPalette = [
  "#E8B94D","#0F4830","#E15C4F","#1C6B45",
  "#FFD873","#134429","#5AAFDD","#0A2E1F"
];

let teams = [];        // array aktif {id, name} di roda
let history_log = [];  // { name, ts }
let angle = 0;
let spinning = false;
let idCounter = presetTeams.length;

// =======================================================
// ELEMENTS
// =======================================================

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const DPR_SIZE = 460;

const spinBtn = document.getElementById("spinBtn");
const centerSpin = document.getElementById("centerSpin");
const resetBtn = document.getElementById("resetBtn");
const removeOnWin = document.getElementById("removeOnWin");

const popup = document.getElementById("popup");
const finishPopup = document.getElementById("finishPopup");
const emptyPopup = document.getElementById("emptyPopup");

const winnerEl = document.getElementById("winner");
const historyEl = document.getElementById("history");
const teamLeftEl = document.getElementById("teamLeft");
const totalPickedEl = document.getElementById("totalPicked");
const tickerList = document.getElementById("tickerList");

const playAgain = document.getElementById("playAgain");
const closeFinish = document.getElementById("closeFinish");
const closeEmpty = document.getElementById("closeEmpty");

const addForm = document.getElementById("addForm");
const teamInput = document.getElementById("teamInput");
const teamListEl = document.getElementById("teamList");
const listCount = document.getElementById("listCount");
const loadPreset = document.getElementById("loadPreset");
const clearList = document.getElementById("clearList");

// =======================================================
// TEAM LIST MANAGEMENT (nama tim = editable input)
// =======================================================

function renderTeamList(){
  teamListEl.innerHTML = "";
  listCount.innerText = teams.length;

  if(teams.length === 0){
    const li = document.createElement("li");
    li.className = "list-empty";
    li.innerText = "Daftar kosong. Tambahkan tim atau muat contoh.";
    teamListEl.appendChild(li);
    return;
  }

  teams.forEach((team, i) => {
    const li = document.createElement("li");

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = wheelPalette[i % wheelPalette.length];

    // input teks yang bisa diedit langsung
    const nameInput = document.createElement("input");
    nameInput.className = "t-name-input";
    nameInput.type = "text";
    nameInput.value = team.name;
    nameInput.maxLength = 24;
    nameInput.setAttribute("aria-label", "Edit nama tim");

    nameInput.addEventListener("input", () => {
      team.name = nameInput.value;
      drawWheel(); // update label di roda secara live
    });
    nameInput.addEventListener("blur", () => {
      if(nameInput.value.trim() === ""){
        nameInput.value = team.name = "Tanpa Nama";
        drawWheel();
      }
    });

    const remove = document.createElement("button");
    remove.className = "t-remove";
    remove.innerText = "✕";
    remove.setAttribute("aria-label", "Hapus " + team.name);
    remove.addEventListener("click", () => {
      teams = teams.filter(t => t.id !== team.id);
      renderTeamList();
      updateInfo();
      drawWheel();
    });

    li.appendChild(swatch);
    li.appendChild(nameInput);
    li.appendChild(remove);
    teamListEl.appendChild(li);
  });
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = teamInput.value.trim();
  if(!val) return;

  idCounter++;
  const newId = "custom" + idCounter;
  teams.push({ id:newId, name:val });

  teamInput.value = "";
  renderTeamList();
  updateInfo();
  drawWheel();
});

loadPreset.addEventListener("click", () => {
  teams = presetTeams.map(t => ({ ...t }));
  renderTeamList();
  updateInfo();
  drawWheel();
});

clearList.addEventListener("click", () => {
  teams = [];
  renderTeamList();
  updateInfo();
  drawWheel();
});

// =======================================================
// DRAW WHEEL
// =======================================================

function drawWheel(){
  ctx.clearRect(0,0,DPR_SIZE,DPR_SIZE);
  const cx = DPR_SIZE/2, cy = DPR_SIZE/2, r = 210;

  if(teams.length === 0){
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle = "#F4F1E4";
    ctx.fill();

    ctx.fillStyle = "#0A2E1F";
    ctx.font = "bold 22px Inter";
    ctx.textAlign = "center";
    ctx.fillText("Tambahkan tim", cx, cy);
    return;
  }

  const slice = (Math.PI*2) / teams.length;

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(angle);

  teams.forEach((team, index) => {
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.fillStyle = wheelPalette[index % wheelPalette.length];
    ctx.arc(0,0,r, index*slice, (index+1)*slice);
    ctx.fill();

    ctx.save();
    ctx.rotate(index*slice + slice/2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#F4F1E4";
    ctx.font = "600 14px Inter";
    ctx.fillText(team.name, r - 22, 5);
    ctx.restore();
  });

  // center circle
  ctx.beginPath();
  ctx.arc(0,0,58,0,Math.PI*2);
  ctx.fillStyle = "#F4F1E4";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0A2E1F";
  ctx.stroke();

  ctx.restore();
}

drawWheel();

// =======================================================
// INFO / TICKER
// =======================================================

function updateInfo(){
  teamLeftEl.innerText = teams.length;
}

function pushTicker(name){
  if(tickerList.querySelector(".ticker-empty")){
    tickerList.innerHTML = "";
  }
  const li = document.createElement("li");
  const label = document.createElement("span");
  label.innerText = name;
  const idx = document.createElement("span");
  idx.className = "t-index";
  idx.innerText = "#" + history_log.length;
  li.appendChild(label);
  li.appendChild(idx);
  tickerList.prepend(li);
}

// =======================================================
// PILIH PEMENANG BERDASARKAN winOrder (bukan acak)
// =======================================================

function pickWinnerIndex(){
  // cari posisi berikutnya di winOrder yang masih valid untuk
  // panjang daftar tim saat ini
  for(let step = 0; step < winOrder.length; step++){
    const idx = (winPointer + step) % winOrder.length;
    const candidatePos = winOrder[idx];
    if(candidatePos < teams.length){
      winPointer = idx + 1; // lanjut dari sini next spin
      return candidatePos;
    }
  }
  // fallback: kalau tidak ada posisi winOrder yang valid untuk
  // jumlah tim saat ini, ambil acak
  return Math.floor(Math.random() * teams.length);
}

// =======================================================
// SPIN (hasil ditentukan oleh winOrder di atas)
// =======================================================

function spin(){
  if(spinning) return;

  if(teams.length === 0){
    emptyPopup.style.display = "flex";
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  centerSpin.disabled = true;

  const pickIndex = pickWinnerIndex();
  const winnerId = teams[pickIndex].id;
  const result = teams[pickIndex].name;

  const slice = (Math.PI*2) / teams.length;
  const targetSliceCenter = pickIndex*slice + slice/2;
  const extraSpins = 5 + Math.floor(Math.random()*3); // 5-7 putaran penuh
  const finalAngle = (Math.PI*2*extraSpins) - targetSliceCenter - Math.PI/2;

  const startAngle = angle;
  const totalDelta = finalAngle - (startAngle % (Math.PI*2));
  const duration = 4200;
  const startTime = performance.now();

  function easeOutQuint(t){ return 1 - Math.pow(1-t, 5); }

  function frame(now){
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutQuint(t);
    angle = startAngle + totalDelta * eased;
    drawWheel();

    if(t < 1){
      requestAnimationFrame(frame);
    } else {
      spinning = false;
      spinBtn.disabled = false;
      centerSpin.disabled = false;

      winnerEl.innerText = result;
      historyEl.innerText = result;
      popup.style.display = "flex";

      history_log.push({ name: result, ts: Date.now() });
      totalPickedEl.innerText = history_log.length;
      pushTicker(result);

      if(removeOnWin.checked){
        teams = teams.filter(t => t.id !== winnerId);
        renderTeamList();
      }

      updateInfo();
      drawWheel();

      if(removeOnWin.checked && teams.length === 0){
        setTimeout(() => {
          popup.style.display = "none";
          finishPopup.style.display = "flex";
        }, 900);
      }
    }
  }

  requestAnimationFrame(frame);
}

// =======================================================
// RESET
// =======================================================

function resetGame(){
  teams = presetTeams.map(t => ({ ...t }));
  history_log = [];
  angle = 0;
  winPointer = 0;

  historyEl.innerText = "-";
  totalPickedEl.innerText = "0";
  tickerList.innerHTML = '<li class="ticker-empty">Belum ada undian &mdash; tekan Putar Roda</li>';

  popup.style.display = "none";
  finishPopup.style.display = "none";
  emptyPopup.style.display = "none";

  renderTeamList();
  updateInfo();
  drawWheel();
}

// =======================================================
// EVENTS
// =======================================================

spinBtn.addEventListener("click", spin);
centerSpin.addEventListener("click", spin);
resetBtn.addEventListener("click", resetGame);

playAgain.addEventListener("click", () => { popup.style.display = "none"; });
closeFinish.addEventListener("click", () => { finishPopup.style.display = "none"; });
closeEmpty.addEventListener("click", () => { emptyPopup.style.display = "none"; });

// =======================================================
// START
// =======================================================

teams = presetTeams.map(t => ({ ...t }));
renderTeamList();
updateInfo();
drawWheel();
