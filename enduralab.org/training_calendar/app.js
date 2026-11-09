// Forzamos la ruta al mismo directorio actual
const RUTA_ARCHIVO = 'training_calendar.ics'; 

function log(mensaje) {
    document.getElementById('debug').innerHTML += "<br>> " + mensaje;
}

document.addEventListener("DOMContentLoaded", async () => {
    const output = document.getElementById('calendarOutput');
    const errorLog = document.getElementById('errorLog');

    log("DOM Cargado. Renderizando título para: " + RUTA_ARCHIVO);
    generarTituloDinamico(RUTA_ARCHIVO);

    try {
        log("Intentando hacer fetch a: " + RUTA_ARCHIVO);
        const response = await fetch(RUTA_ARCHIVO, { cache: "no-store" });
        
        log("Respuesta del servidor recibida. Status: " + response.status + " (" + response.statusText + ")");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}. ¿Subiste el archivo 'athletica.ics' a la carpeta 'training_calendar'?`);
        }
        
        const data = await response.text();
        log("Archivo leído con éxito. Tamaño: " + data.length + " caracteres.");
        
        log("Iniciando parseo del archivo ICS...");
        const eventos = parseICS(data);
        log("Parseo finalizado. Eventos encontrados: " + eventos.length);
        
        renderEventos(eventos);
        // Si todo sale bien, ocultamos la consola de debug
        document.getElementById('debug').style.display = 'none';
    } catch (err) {
        log("CRITICAL ERROR: " + err.message);
        errorLog.innerHTML = "Error al cargar el calendario: " + err.message;
        errorLog.style.display = "block";
        output.innerHTML = "";
        console.error(err);
    }
});

function generarTituloDinamico(ruta) {
    const contenedorTexto = document.getElementById('txtTitulo');
    if (!contenedorTexto) return; // Control de seguridad

    try {
        const nombreArchivo = ruta.substring(ruta.lastIndexOf('/') + 1);
        let nombreLimpio = nombreArchivo.split('.')[0];
        nombreLimpio = nombreLimpio.charAt(0).toUpperCase() + nombreLimpio.slice(1);
        nombreLimpio = nombreLimpio.replaceAll("_", " ");
        
        contenedorTexto.innerText = `Mis Entrenamientos de ${nombreLimpio}`;
    } catch (e) {
        contenedorTexto.innerText = "Mis Entrenamientos";
    }
}

function parseICS(icsText) {
    const lines = icsText.split(/\r?\n/);
    const eventos = [];
    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        while (i + 1 < lines.length && (lines[i+1].startsWith(" ") || lines[i+1].startsWith("\t"))) {
            line += lines[i+1].substring(1);
            i++;
        }

        if (line.startsWith("BEGIN:VEVENT")) {
            currentEvent = { minutos: 0 }; // Inicializamos los minutos en 0
        } else if (line.startsWith("END:VEVENT")) {
            if (currentEvent) eventos.push(currentEvent);
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith("SUMMARY:")) {
                currentEvent.title = line.replace("SUMMARY:", "").trim();
            } else if (line.startsWith("DTSTART")) {
                const match = line.match(/VALUE=DATE:(\d{8})/);
                if (match) {
                    currentEvent.rawDate = match[1]; // Guardamos AAAAMMDD puro para ordenar fácilmente
                    currentEvent.date = `${match[1].substring(6,8)}/${match[1].substring(4,6)}/${match[1].substring(0,4)}`;
                }
            } else if (line.startsWith("DESCRIPTION:")) {
                let desc = line.replace("DESCRIPTION:", "").trim();
                desc = desc.replace(/\\n/g, "\n").replace(/\\,/g, ",");
                currentEvent.description = desc;

                // Lógica experta: Extraer la duración usando Expresiones Regulares
                const durationMatch = desc.match(/Duration:\s*(\d+):(\d+):?(\d+)?/i);
                if (durationMatch) {
                    if (durationMatch[3] !== undefined) {
                        // Formato H:MM:SS (ej: 1:10:00)
                        currentEvent.minutos = (parseInt(durationMatch[1]) * 60) + parseInt(durationMatch[2]);
                    } else {
                        // Formato MM:SS (ej: 39:08)
                        currentEvent.minutos = parseInt(durationMatch[1]);
                    }
                }
            }
        }
    }
    return eventos;
}

function obtenerClaseDisciplina(titulo) {
    if (!titulo) return '';
    const t = titulo.toLowerCase();
    if (t.includes('swim') || t.includes('natación') || t.includes('nado')) return 'swim';
    if (t.includes('bike') || t.includes('ciclismo') || t.includes('bici')) return 'bike';
    if (t.includes('run') || t.includes('trote') || t.includes('carrera')) return 'run';
    if (t.includes('strength') || t.includes('fuerza') || t.includes('conditioning') || t.includes('gimnasio')) return 'strength';
    return '';
}

function renderEventos(eventos) {
    const hoy = new Date();
    const fechaHoy =
        hoy.getFullYear().toString() +
        String(hoy.getMonth() + 1).padStart(2, '0') +
        String(hoy.getDate()).padStart(2, '0');

    let encontroHoy = false;

    const output = document.getElementById('calendarOutput');
    if (eventos.length === 0) {
        output.innerHTML = "<p>No hay entrenamientos programados en el archivo.</p>";
        return;
    }

    // MULTI-SORT EFICIENTE: Fecha (AAAAMMDD) -> Duración (Minutos) -> Nombre (Alfabético)
    eventos.sort((a, b) => {
        if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
        if (a.minutos !== b.minutos) return a.minutos - b.minutos;
        return (a.title || "").localeCompare(b.title || "");
    });

    let htmlGenerado = "";
    let ultimaFecha = "";

    eventos.forEach((ev) => {
        const claseDisciplina = obtenerClaseDisciplina(ev.title);
        
        // Si la fecha cambia y no es el primer elemento, inyectamos la barra gris horizontal de 6px
        if (ultimaFecha && ultimaFecha !== ev.date) {
            htmlGenerado += `
                <div style="
                    height: 6px; 
                    background-color: #cbd5e1; 
                    border-radius: 3px; 
                    margin: 30px 0 20px 0; 
                    width: 100%;
                    clear: both;
                "></div>`;
        }

        // LÓGICA EXPERTA: Obtener el día de la semana en español
        let fechaFormateada = ev.date || 'Fecha no definida';
        if (ev.rawDate) {
            // Convertimos AAAAMMDD (ej: 20260601) a un objeto Date real (año, mes de 0 a 11, día)
            const año = parseInt(ev.rawDate.substring(0, 4));
            const mes = parseInt(ev.rawDate.substring(4, 6)) - 1;
            const dia = parseInt(ev.rawDate.substring(6, 8));
            const fechaObj = new Date(año, mes, dia);

            // Extraemos el día de la semana con la primera letra en mayúscula (ej: "Lunes")
            const diaSemana = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(fechaObj);
            const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
            
            // Armamos el string final: "Lunes 01/06/2026"
            fechaFormateada = `${diaSemanaCapitalizado} ${ev.date}`;
        }
        
    const idHoy = (!encontroHoy && ev.rawDate === fechaHoy)
        ? 'id="today-training"'
        : '';

    if (ev.rawDate === fechaHoy) {
        encontroHoy = true;
    }

    htmlGenerado += `
        <div ${idHoy} class="workout-card ${claseDisciplina}">
            <div class="workout-date">${fechaFormateada}</div>
            <div class="workout-title">${ev.title || 'Entrenamiento'}</div>
            <div class="workout-desc">${ev.description || 'Sin detalles.'}</div>
        </div>
    `;

        ultimaFecha = ev.date;
    });

    output.innerHTML = htmlGenerado;
    setTimeout(() => {
        const hoyCard = document.getElementById('today-training');

        if (hoyCard) {
            hoyCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, 100);

}
