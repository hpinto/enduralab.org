const mathematicalNoises = ['white', 'pink', 'brown', 'grey'];

const baseSlider = document.getElementById('baseHz');
const volAmbientSlider = document.getElementById('volAmbient');
const ambientSelect = document.getElementById('ambientSound');

const baseVal = document.getElementById('baseVal');
const diffVal = document.getElementById('diffVal');
const volAmbVal = document.getElementById('volAmbVal');

const freqLDisplay = document.getElementById('freqLDisplay');
const freqRDisplay = document.getElementById('freqRDisplay');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const tableRows = document.querySelectorAll('#waveLattice tr');
const waveLatticeBody = document.getElementById('waveLattice');

const markerMin = document.getElementById('markerMin');
const markerMax = document.getElementById('markerMax');

const lblRecommended = document.getElementById('timeRecommended');
const lblElapsed = document.getElementById('timeElapsed');
const lblRemaining = document.getElementById('timeRemaining');

let currentDiffHz = 2.0; 
let recommendedMinutes = 90; 

let timerInterval = null;
let secondsElapsed = 0;

let audioCtx = null;
let oscL = null;
let oscR = null;
let gainL = null;
let gainR = null;
let ambientGainNode = null;
let ambientSourceNode = null;
let isPlaying = false;
let wakeLock = null;

const volBinaural = 0.35; 

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.warn(`Wake Lock denegado: ${err.message}`);
    }
}

function getRecommendedDuration(hz) {
    if (hz === 2.0) return 90;  
    if (hz === 6.0) return 45;  
    if (hz === 10.0) return 60; 
    if (hz === 15.0) return 45; 
    if (hz === 40.0) return 20; 
    return 60;
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplays() {
    const totalRecommendedSeconds = recommendedMinutes * 60;
    let remainingSeconds = totalRecommendedSeconds - secondsElapsed;
    if (remainingSeconds < 0) remainingSeconds = 0;

    lblRecommended.textContent = `${recommendedMinutes}:00`;
    lblElapsed.textContent = formatTime(secondsElapsed);
    lblRemaining.textContent = formatTime(remainingSeconds);
}

function startTimer() {
    secondsElapsed = 0;
    updateTimerDisplays();
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const totalRecommendedSeconds = recommendedMinutes * 60;
        updateTimerDisplays();
        if (secondsElapsed >= totalRecommendedSeconds) {
            btnStop.click(); 
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateDynamicMarkers(hz) {
    let minHz, maxHz;
    if (hz === 2.0 || hz === 6.0) { minHz = 60; maxHz = 150; } 
    else if (hz === 10.0 || hz === 15.0) { minHz = 150; maxHz = 250; } 
    else if (hz === 40.0) { minHz = 250; maxHz = 350; }

    const sliderMin = 60;
    const sliderMax = 350;
    const range = sliderMax - sliderMin;

    const posMin = ((minHz - sliderMin) / range) * 100;
    const posMax = ((maxHz - sliderMin) / range) * 100;

    markerMin.style.left = `calc(${posMin}% - 1px)`;
    markerMax.style.left = `calc(${posMax}% - 1px)`;
}

function updateFrequencies() {
    const base = parseFloat(baseSlider.value);
    baseVal.textContent = `${base} Hz`;
    diffVal.textContent = `${currentDiffHz.toFixed(1)} Hz`;

    const fL = base - (currentDiffHz / 2);
    const fR = base + (currentDiffHz / 2);

    freqLDisplay.textContent = `${fL.toFixed(1)} Hz`;
    freqRDisplay.textContent = `${fR.toFixed(1)} Hz`;

    if (isPlaying && audioCtx) {
        oscL.frequency.setValueAtTime(fL, audioCtx.currentTime);
        oscR.frequency.setValueAtTime(fR, audioCtx.currentTime);
    }
}

function updateAmbientVolume() {
    const vol = parseFloat(volAmbientSlider.value) / 100;
    volAmbVal.textContent = `${volAmbientSlider.value}%`;
    if (audioCtx && ambientGainNode) {
        ambientGainNode.gain.setValueAtTime(vol * 0.7, audioCtx.currentTime);
    }
}

function createNoiseBufferNode(type) {
    const bufferSize = 2 * audioCtx.sampleRate; 
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    generateNoiseArray(type, output, audioCtx.sampleRate);
    
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    return source;
}

function generateNoiseArray(type, array, sampleRate) {
    const size = array.length;
    if (type === 'white') {
        for (let i = 0; i < size; i++) array[i] = (Math.random() * 2 - 1) * 0.15;
    } 
    else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < size; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            array[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            array[i] *= 0.11;
            b6 = white * 0.115926;
        }
    } 
    else if (type === 'brown') {
        let lastOut = 0.0;
        for (let i = 0; i < size; i++) {
            let white = Math.random() * 2 - 1;
            array[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = array[i];
            array[i] *= 3.5;
        }
    } 
    else if (type === 'grey') {
        let z1 = 0, z2 = 0, z3 = 0;
        for (let i = 0; i < size; i++) {
            let white = Math.random() * 2 - 1;
            z1 = 0.997 * z1 + white * 0.045;
            z2 = 0.950 * z2 + z1 * 0.120;
            z3 = 0.850 * z3 + z2 * 0.280;
            let greySample = white * 0.18 + z1 * 0.35 - z2 * 0.42 + z3 * 0.15;
            array[i] = greySample * 0.32;
        }
    }
}

function handleAmbientAudio() {
    if (ambientSourceNode) {
        try { ambientSourceNode.stop(); } catch(e){}
        ambientSourceNode.disconnect();
        ambientSourceNode = null;
    }
    const selection = ambientSelect.value;
    if (selection === "none" || !isPlaying) return;

    if (mathematicalNoises.includes(selection)) {
        ambientSourceNode = createNoiseBufferNode(selection);
        ambientSourceNode.connect(ambientGainNode);
        const volTarget = (parseFloat(volAmbientSlider.value) / 100) * 0.7;
        ambientGainNode.gain.setValueAtTime(volTarget, audioCtx.currentTime);
        ambientSourceNode.start();
    }
}

async function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await requestWakeLock();

    const merger = audioCtx.createChannelMerger(2);
    oscL = audioCtx.createOscillator();
    oscR = audioCtx.createOscillator();
    gainL = audioCtx.createGain();
    gainR = audioCtx.createGain();
    ambientGainNode = audioCtx.createGain();

    oscL.type = 'sine';
    oscR.type = 'sine';

    gainL.gain.setValueAtTime(volBinaural, audioCtx.currentTime);
    gainR.gain.setValueAtTime(volBinaural, audioCtx.currentTime);

    oscL.connect(gainL);
    oscR.connect(gainR);
    gainL.connect(merger, 0, 0); 
    gainR.connect(merger, 0, 1); 

    ambientGainNode.connect(audioCtx.destination);
    merger.connect(audioCtx.destination);

    updateFrequencies();
    updateAmbientVolume();

    oscL.start();
    oscR.start();
    handleAmbientAudio();
}

function enforceSmartNoiseRestrictions(hz) {
    const options = ambientSelect.options;
    let allowedValues = [];

    if (hz === 2.0) allowedValues = ['brown', 'none'];
    else if (hz === 6.0) allowedValues = ['pink', 'none'];
    else if (hz === 10.0) allowedValues = ['grey', 'none'];
    else if (hz === 15.0 || hz === 40.0) allowedValues = ['white', 'grey', 'none'];

    let currentSelectionIsAllowed = false;
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (allowedValues.includes(option.value)) {
            option.disabled = false;
            if (option.value === ambientSelect.value) currentSelectionIsAllowed = true;
        } else {
            option.disabled = true;
        }
    }
    if (!currentSelectionIsAllowed) {
        ambientSelect.value = allowedValues[0] !== 'none' ? allowedValues[0] : 'none';
        if (isPlaying) handleAmbientAudio();
    }
}

// --- CONTROL DE UI INTERACTIVA CON CAPA DE PROTECCIÓN COMPLETA ---
// --- CONTROL DE UI INTERACTIVA CON BLOQUEO ABSOLUTO ---
tableRows.forEach(row => {
    row.addEventListener('click', (e) => {
        // CAPA ULTRA-BLINDADA: Si el audio está corriendo, frena el evento en seco
        if (isPlaying === true) {
            e.preventDefault();
            e.stopPropagation();
            return false; 
        }

        // Todo este código de abajo SOLO se ejecuta si isPlaying es false
        tableRows.forEach(r => r.classList.remove('active-row'));
        currentDiffHz = parseFloat(row.getAttribute('data-hz'));
        row.classList.add('active-row');
        
        if (currentDiffHz === 2.0 || currentDiffHz === 6.0) baseSlider.value = 90;  
        else if (currentDiffHz === 10.0 || currentDiffHz === 15.0) baseSlider.value = 180; 
        else if (currentDiffHz === 40.0) baseSlider.value = 300; 

        recommendedMinutes = getRecommendedDuration(currentDiffHz);
        
        secondsElapsed = 0;
        updateTimerDisplays();

        updateDynamicMarkers(currentDiffHz);
        enforceSmartNoiseRestrictions(currentDiffHz);
        updateFrequencies();
    });
});

baseSlider.addEventListener('input', updateFrequencies);
volAmbientSlider.addEventListener('input', updateAmbientVolume);
ambientSelect.addEventListener('change', () => { handleAmbientAudio(); });

btnStart.addEventListener('click', () => {
    if (!isPlaying) { 
        isPlaying = true; 
        initAudio(); 
        startTimer(); 
        
        // Capa de Bloqueo CSS: Congela clics y baja opacidad nativamente en la UI
        waveLatticeBody.classList.add('table-blocked');
        
        btnStart.disabled = true; 
        btnStop.disabled = false; 
    }
});

btnStop.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false;
        stopTimer(); 
        
        // Capa de Desbloqueo CSS: Restaura el brillo y libera los clics
        waveLatticeBody.classList.remove('table-blocked');
        
        if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
        oscL.stop(); oscR.stop();
        if (ambientSourceNode) { try { ambientSourceNode.stop(); } catch(e){} ambientSourceNode.disconnect(); ambientSourceNode = null; }
        audioCtx.close(); audioCtx = null;
        btnStart.disabled = false; btnStop.disabled = true;
    }
});

// --- INICIALIZACIÓN DE ARRANQUE UNIFICADA ---
baseSlider.value = 90;
recommendedMinutes = getRecommendedDuration(currentDiffHz);
updateTimerDisplays();
updateDynamicMarkers(currentDiffHz);
enforceSmartNoiseRestrictions(currentDiffHz);
updateFrequencies();