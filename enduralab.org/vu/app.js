let audioContext, analyser, microphone;
let isMonitoring = false;
let chart;
let sampleInterval = null;
let rawDbValues = [];
let secondsElapsed = 0;

const toggleBtn = document.getElementById('toggleBtn');
const avgDbSpan = document.getElementById('avgDb');

// Inicializar Gráfica
const ctx = document.getElementById('audioChart').getContext('2d');
chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Volumen (dBFS)',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            tension: 0.1,
            fill: true
        }]
    },
    options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
            y: {
                title: { display: true, text: 'dBFS' },
                min: -60,
                max: 0
            },
            x: {
                title: { display: true, text: 'Tiempo (s)' }
            }
        }
    }
});

async function toggleMonitoring() {
    if (!isMonitoring) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            // Limpiar gráfica y variables
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();

            rawDbValues = [];
            secondsElapsed = 0;
            avgDbSpan.innerText = "--";

            isMonitoring = true;
            toggleBtn.innerText = "Parar Monitoreo";
            toggleBtn.classList.add('stop');

            // Tomar una muestra exacta cada 1 segundo (500 ms)
            sampleInterval = setInterval(sampleAudio, 500);

        } catch (err) {
            alert('Error de acceso al micrófono: ' + err);
        }
    } else {
        stopMonitoring();
    }
}

function sampleAudio() {
    if (!isMonitoring) return;

    const array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(array);

    let sumSquares = 0.0;
    for (let i = 0; i < array.length; i++) {
        let norm = (array[i] - 128) / 128;
        sumSquares += norm * norm;
    }
    let rms = Math.sqrt(sumSquares / array.length);

    let db = rms > 0 ? 20 * Math.log10(rms) : -60;
    if (db < -60) db = -60;
    if (db > 0) db = 0;

    secondsElapsed++;
    rawDbValues.push(db);

    // Agregar etiqueta exacta en segundos enteros
    chart.data.labels.push(secondsElapsed + 's');
    chart.data.datasets[0].data.push(parseFloat(db.toFixed(2)));

    // Mantener una ventana fija de los últimos 30 segundos en pantalla
    if (chart.data.labels.length > 30) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}

function stopMonitoring() {
    isMonitoring = false;
    toggleBtn.innerText = "Iniciar Monitoreo";
    toggleBtn.classList.remove('stop');

    if (sampleInterval) {
        clearInterval(sampleInterval);
    }

    if (audioContext) {
        audioContext.close();
    }

    if (rawDbValues.length > 0) {
        let sumPower = 0;
        rawDbValues.forEach(val => {
            sumPower += Math.pow(10, val / 10);
        });
        let avgPower = sumPower / rawDbValues.length;
        let finalAvgDb = 10 * Math.log10(avgPower);
        avgDbSpan.innerText = finalAvgDb.toFixed(2);
    }
}
