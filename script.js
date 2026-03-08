let ppmHistory = [];
let ntuHistory = [];
let labels = [];

const ppmChart = new Chart(document.getElementById("ppmChart"), {
  type: "line",
  data: {
    labels: labels,
    datasets: [{
      data: ppmHistory,
      borderColor: "blue",
      tension: 0.2
    }]
  },
  options: {
    animation:false,
    plugins:{
      legend:{ display:false }
    },
    scales:{
      y:{
        beginAtZero:true,
        title:{
          display:true,
          text:"PPM"
        }
      }
    }
  }
});

const ntuChart = new Chart(document.getElementById("ntuChart"), {
  type: "line",
  data: {
    labels: labels,
    datasets: [{
      data: ntuHistory,
      borderColor: "red",
      tension: 0.2
    }]
  },
  options: {
    animation:false,
    plugins:{
      legend:{ display:false }
    },
    scales:{
      y:{
        beginAtZero:true,
        title:{
          display:true,
          text:"NTU"
        }
      }
    }
  }
});

const connectionEl = document.getElementById("connection");
const ppmEl = document.getElementById("ppm");
const ntuEl = document.getElementById("ntu");
const cleanEl = document.getElementById("clean");
const activeEl = document.getElementById("active");

const arrow = document.getElementById("clean-arrow");
const popup = document.getElementById("clean-popup");

const timeEl = document.getElementById("time");
timeEl.textContent = "0 s"; // prevent default clock display

// Toggle popup
arrow.addEventListener("click", (e) => {
  popup.classList.toggle("open");
  arrow.classList.toggle("open");
  e.stopPropagation();
});

// Close popup if clicked outside
document.addEventListener("click", (e) => {
  if (!popup.contains(e.target) && !arrow.contains(e.target)) {
    popup.classList.remove("open");
    arrow.classList.remove("open");
  }
});

let cycleSeconds = 0;   // seconds since last cycle started
let timerInterval = null;

function startCycleTimer() {
  if (timerInterval) clearInterval(timerInterval);
  cycleSeconds = 0;

  document.getElementById("time").textContent = `${cycleSeconds} s`;

  timerInterval = setInterval(() => {
    if (window.currentStage !== 1) {
      cycleSeconds += 1;
      totalUsageSeconds += 1;

      if (window.currentStage === 2) recycledStage2Seconds += 1;
      if (window.currentStage === 3) recycledStage3Seconds += 1;
    }

    document.getElementById("time").textContent = `${cycleSeconds} s`;
    updateStats();
  }, 1000);
}

//constants
let SetCycleTime = 60;
let FlowRateLperMin = 2.5;
let CostperL = 1;

let totalMoney = 0;
let totalWater = 0;
let totalTime = 0;
let numCycles = 0;
let prevActive = true;

let recycledStage2Seconds = 0;
let recycledStage3Seconds = 0;
let totalUsageSeconds = 0;

// Start counting immediately
startCycleTimer();

function updateStats() {
  document.getElementById("total-money").textContent = `$${totalMoney.toFixed(2)}`;
  document.getElementById("total-water").textContent = `${totalWater.toFixed(1)} L`;
  document.getElementById("total-time").textContent = `${totalTime.toFixed(1)} min`;
  document.getElementById("num-cycles").textContent = numCycles;

  document.getElementById("recycled-stage2").textContent = `${(recycledStage2Seconds * FlowRateLperMin / 60).toFixed(1)} L`;
  document.getElementById("recycled-stage3").textContent = `${(recycledStage3Seconds * FlowRateLperMin / 60).toFixed(1)} L`;
  document.getElementById("total-usage").textContent = `${(totalUsageSeconds * FlowRateLperMin / 60).toFixed(1)} L`;

  updateJug();
}

function updateJug() {
  const stage2Liters = recycledStage2Seconds * FlowRateLperMin / 60;
  const stage3Liters = recycledStage3Seconds * FlowRateLperMin / 60;
  const totalLiters = totalUsageSeconds * FlowRateLperMin / 60;
  const wastewaterLiters = Math.max(0, totalLiters - stage2Liters - stage3Liters);

  let stage2Percent = 0;
  let stage3Percent = 0;
  let wastewaterPercent = 0;

  if (totalLiters > 0) {
    stage2Percent = (stage2Liters / totalLiters) * 100;
    stage3Percent = (stage3Liters / totalLiters) * 100;
    wastewaterPercent = (wastewaterLiters / totalLiters) * 100;
  }

  document.getElementById("stage2-percent").textContent =
  `${stage2Percent.toFixed(1)}%`;

  document.getElementById("stage3-percent").textContent =
    `${stage3Percent.toFixed(1)}%`;

  document.getElementById("wastewater-percent").textContent =
    `${wastewaterPercent.toFixed(1)}%`;

  const stage2Fill = document.getElementById("stage2-fill");
  const stage3Fill = document.getElementById("stage3-fill");
  const wastewaterFill = document.getElementById("wastewater-fill");

  wastewaterFill.style.height = `${wastewaterPercent}%`;
  wastewaterFill.style.bottom = `0%`;

  stage3Fill.style.height = `${stage3Percent}%`;
  stage3Fill.style.bottom = `${wastewaterPercent}%`;

  stage2Fill.style.height = `${stage2Percent}%`;
  stage2Fill.style.bottom = `${wastewaterPercent + stage3Percent}%`;
}

// Stage thresholds for normalization (can edit freely)
const stageThresholds = {
  ppm: [0, 10, 500, 1000, 5000],
  ntu: [0, 1, 5, 100, 2000],
};

// Convert raw value to normalized percent along bar (evenly spaced)
function getNormalizedHeight(value, thresholds) {
  if (value > thresholds[thresholds.length - 1]) value = thresholds[thresholds.length - 1];
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (value <= thresholds[i + 1]) {
      const stageFraction = (value - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);
      const percentPerStage = 100 / (thresholds.length - 1);
      return i * percentPerStage + stageFraction * percentPerStage;
    }
  }
  return 100;
}

// Update a bar's height and color
function updateBar(barId, value) {
  const thresholds = stageThresholds[barId];
  const percent = getNormalizedHeight(value, thresholds);
  const hue = 120 - percent * 1.2; // green to red
  const bar = document.getElementById(barId + "-bar");
  bar.style.height = percent + "%";
  bar.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
}

// Draw evenly spaced stage lines
function addStageLines(barId) {
  const barTrack = document.getElementById(barId + "-bar").parentElement;
  barTrack.querySelectorAll(".bar-stage-line, .bar-stage-label").forEach(el => el.remove());

  const thresholds = stageThresholds[barId];
  const lastIndex = thresholds.length - 1;

  for (let i = 1; i <= lastIndex; i++) { // skip bottom 0
    const percent = (i / lastIndex) * 100;

    // Stage line
    const line = document.createElement("div");
    line.className = "bar-stage-line";
    line.style.bottom = percent + "%";
    barTrack.appendChild(line);

    // Label
    const label = document.createElement("div");
    label.className = "bar-stage-label";
    label.textContent = thresholds[i]; // show numeric value
    label.style.position = "absolute";
    label.style.left = "110%"; // slightly to the right of the bar
    label.style.bottom = percent + "%";
    label.style.fontSize = "12px";
    label.style.transform = "translateY(50%)"; // center vertically
    barTrack.appendChild(label);
  }
}

// Map value to stage index
function getStage(value, thresholds) {
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (value <= thresholds[i + 1]) return i + 1;
  }
  return thresholds.length - 1;
}

// Update Clean / Flow stage text and CSS classes
function updateClean(ppm, ntu) {
  const ppmStage = getStage(ppm, stageThresholds.ppm);
  const ntuStage = getStage(ntu, stageThresholds.ntu);
  const finalStage = Math.max(ppmStage, ntuStage);
  window.currentStage = finalStage;

  const stageNames = ["Pure", "Low", "Moderate", "High"];
  const flowDestinations = [
    "Flow Stopped",
    "Drinking Water Storage",
    "Agricultural Water Storage",
    "Wastewater"
  ];

const stageText = stageNames[finalStage - 1];
const flowText = flowDestinations[finalStage - 1];

  cleanEl.textContent = stageText;

const flowEl = document.getElementById("flow-direction");

cleanEl.className = "stage-" + finalStage;

if (flowEl) {
  flowEl.textContent = flowText;
  flowEl.className = "stage-" + finalStage;
}

  updateActive(finalStage);
}

// Update Active status based on stage and temp
function updateActive(stage) {
  const active = stage === 1;
  activeEl.textContent = active ? "True" : "False";

  // Increment numCycles ONLY when active goes from false → true
  if (!prevActive && active) {
    numCycles += 1;
    
    //calculate stats
    totalTime += ((SetCycleTime - cycleSeconds)/60);
    totalWater += (FlowRateLperMin * (SetCycleTime - cycleSeconds)/60);
    totalMoney += (CostperL * FlowRateLperMin * (SetCycleTime - cycleSeconds)/60);

    startCycleTimer();

    updateStats(); // refresh the stats box
  }

  prevActive = active; // store current state for next update
}

// Unified update function for all bars and status
function updateAll(ppm, ntu) {
  ppmEl.textContent = ppm.toFixed(1);
  ntuEl.textContent = ntu.toFixed(1);

  updateBar("ppm", ppm);
  updateBar("ntu", ntu);

  addStageLines("ppm");
  addStageLines("ntu");

  updateClean(ppm, ntu);

    labels.push("");
  ppmHistory.push(ppm);
  ntuHistory.push(ntu);

  if (labels.length > 30) {
    labels.shift();
    ppmHistory.shift();
    ntuHistory.shift();
  }

  ppmChart.update();
  ntuChart.update();
}
const socket = new WebSocket("ws://localhost:5000/ws");

socket.onopen = () => {
  connectionEl.textContent = "Connected";
};

socket.onclose = () => {
  connectionEl.textContent = "Disconnected";
};

socket.onerror = () => {
  connectionEl.textContent = "Error";
};

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    const ppm = Number(data.PPM ?? 0);
    const ntu = Number(data.NTU ?? 0);
    updateAll(ppm, ntu);
    updateStats();
  } catch (error) {
    console.error("Invalid websocket payload:", error, event.data);
  }
};

updateAll(0, 0);
updateStats();
