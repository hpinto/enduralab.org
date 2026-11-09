const textInput = document.getElementById('text-input');
const qrContainer = document.getElementById('qrcode');
let qrcode;

// Inicializar el código QR
function generateQR() {
    // Limpiar contenedor previo
    qrContainer.innerHTML = "";
    
    qrcode = new QRCode(qrContainer, {
        text: textInput.value,
        width: 300,
        height: 300,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H // Nivel alto para mejor lectura en móviles
    });
}

// Escuchar cambios en el input en tiempo real
textInput.addEventListener('input', generateQR);

// Render inicial
window.onload = generateQR;

// Función para procesar y descargar en el formato correcto
function downloadQR(format) {
    // Obtener el elemento canvas generado por la librería
    const sourceCanvas = qrContainer.querySelector('canvas');
    if (!sourceCanvas) return;

    // Crear un canvas temporal para asegurar el tamaño y el fondo plano
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = sourceCanvas.width;
    downloadCanvas.height = sourceCanvas.height;
    const ctx = downloadCanvas.getContext('2d');

    // IMPORTANTE: Dibujar fondo blanco (esencial para el JPG, si no queda transparente/negro)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    
    // Dibujar el QR encima del fondo
    ctx.drawImage(sourceCanvas, 0, 0);

    // Configurar la descarga del archivo
    const link = document.createElement('a');
    const filename = 'codigo-qr.' + format;
    
    if (format === 'jpg' || format === 'jpeg') {
        link.href = downloadCanvas.toDataURL('image/jpeg', 0.9);
    } else {
        link.href = downloadCanvas.toDataURL('image/png');
    }

    link.download = filename;
    link.click();
}