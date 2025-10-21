// Simple script to extract QR code from logs and save as image
const QRCode = require('qrcode');
const { exec } = require('child_process');

console.log('🔍 Monitoring Docker logs for QR code...\n');

const logProcess = exec('docker-compose logs -f hajiri-attendance-bot', { cwd: __dirname });

let qrBuffer = '';
let capturing = false;

logProcess.stdout.on('data', async (data) => {
    const lines = data.toString().split('\n');
    
    for (const line of lines) {
        // Detect QR code start
        if (line.includes('WhatsApp QR Code')) {
            capturing = true;
            qrBuffer = '';
            continue;
        }
        
        // Detect QR code end
        if (capturing && (line.includes('QR code refreshes') || line.trim() === '')) {
            if (qrBuffer.length > 100) {
                // Extract the actual QR data from whatsapp-web.js
                // This is a placeholder - in reality, we'd need to intercept the actual QR string
                console.log('✅ QR code detected in logs');
                console.log('💡 To get a clear QR code image:');
                console.log('   1. The terminal QR should work if you zoom out');
                console.log('   2. Or scan directly from your terminal\n');
            }
            capturing = false;
            qrBuffer = '';
        }
        
        if (capturing) {
            qrBuffer += line + '\n';
        }
    }
});

console.log('Press Ctrl+C to stop monitoring\n');
