<template>
  <b-modal 
    :active.sync="isModalActive" 
    has-modal-card 
    :on-cancel="cancel"
    :can-cancel="['escape', 'x']"
    :width="960"
  >
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">
          {{ actionLabel }}
          <span v-if="successCount > 0" class="tag is-success ml-3">
            {{ successCount }} processades
          </span>
        </p>
      </header>
      <section class="modal-card-body scanner-body">
        <div class="columns">
          <!-- Left: Camera Preview -->
          <div class="column is-half">
            <div class="scanner-container">
              <div v-if="!isScanning && !error" class="scanner-loading">
                <b-loading :active="true" :is-full-page="false"></b-loading>
                <p class="mt-4">Iniciant càmera...</p>
              </div>
              <div v-if="error" class="notification is-danger">
                <p><strong>Error:</strong> {{ error }}</p>
                <p class="mt-2">Assegura't que has donat permís per utilitzar la càmera.</p>
              </div>
              <div 
                id="qr-reader" 
                :class="{ 'scan-success-flash': showFlash }"
              ></div>
              
              <!-- Camera switch button -->
              <b-button
                v-if="isScanning && availableCameras.length > 1"
                class="camera-switch-button"
                type="is-light"
                icon-left="sync"
                size="is-small"
                @click="switchCamera"
                title="Canviar càmera"
              >
              </b-button>
              
              <div v-if="isProcessing" class="processing-overlay">
                <b-loading :active="true" :is-full-page="false"></b-loading>
              </div>
            </div>
          </div>
          
          <!-- Right: Scan History -->
          <div class="column is-half">
            <div class="history-container">
              <h3 class="subtitle is-6 mb-3">
                Historial d'escaneig
                <span class="tag is-light ml-2">{{ scannedHistory.length }}</span>
              </h3>
              
              <div v-if="scannedHistory.length === 0" class="has-text-centered has-text-grey py-5">
                <p>Encara no s'ha escanejat cap comanda</p>
                <p class="is-size-7 mt-2">Apunta la càmera a un codi QR per començar</p>
              </div>
              
              <div v-else class="history-list">
                <div 
                  v-for="(item, index) in scannedHistory" 
                  :key="index"
                  class="history-item"
                  :class="`history-item-${item.status}`"
                >
                  <div class="history-item-header">
                    <strong>#{{ item.orderId }}</strong>
                    <b-tag 
                      :type="getStatusTagType(item.status)"
                      size="is-small"
                    >
                      {{ getStatusLabel(item.status) }}
                    </b-tag>
                  </div>
                  <div class="history-item-message">
                    {{ item.message }}
                  </div>
                  <div class="history-item-time">
                    {{ formatTime(item.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer class="modal-card-foot">
        <b-button @click="cancel">Tancar</b-button>
        <b-button 
          v-if="scannedHistory.length > 0"
          type="is-light"
          @click="clearHistory"
        >
          Netejar historial
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
import { Html5Qrcode } from "html5-qrcode";

export default {
  name: "QRScannerModal",
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    actionLabel: {
      type: String,
      default: "Escanejar comandes"
    }
  },
  data() {
    return {
      isModalActive: false,
      isScanning: false,
      isProcessing: false,
      scannerInstance: null,
      scannedHistory: [],
      lastScannedCode: null,
      lastScanTime: null,
      error: null,
      showFlash: false,
      availableCameras: [],
      currentCameraIndex: 0
    };
  },
  computed: {
    successCount() {
      return this.scannedHistory.filter(item => item.status === 'success').length;
    }
  },
  watch: {
    isActive(newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        this.$nextTick(() => {
          this.startScanner();
        });
      } else {
        this.stopScanner();
      }
    },
    isModalActive(newValue) {
      if (!newValue) {
        this.cancel();
      }
    }
  },
  beforeDestroy() {
    this.stopScanner();
  },
  methods: {
    async getAvailableCameras() {
      try {
        const cameras = await Html5Qrcode.getCameras();
        this.availableCameras = cameras;
        return cameras;
      } catch (err) {
        console.error("Error getting cameras:", err);
        this.availableCameras = [];
        return [];
      }
    },

    async startScanner() {
      this.error = null;
      try {
        // Check if element exists
        const element = document.getElementById("qr-reader");
        if (!element) {
          console.error("QR reader element not found");
          return;
        }

        // Get available cameras
        const cameras = await this.getAvailableCameras();

        this.scannerInstance = new Html5Qrcode("qr-reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        // Determine which camera to use
        let cameraId;
        if (cameras.length > 0 && this.currentCameraIndex < cameras.length) {
          // Use specific camera by ID
          cameraId = cameras[this.currentCameraIndex].id;
        } else {
          // Fallback to environment facing mode
          cameraId = { facingMode: "environment" };
        }

        await this.scannerInstance.start(
          cameraId,
          config,
          this.onScanSuccess,
          this.onScanError
        );
        
        this.isScanning = true;
      } catch (err) {
        console.error("Error starting scanner:", err);
        this.error = err.message || "No s'ha pogut iniciar la càmera";
        this.isScanning = false;
      }
    },
    
    async stopScanner() {
      if (this.scannerInstance && this.isScanning) {
        try {
          await this.scannerInstance.stop();
          this.scannerInstance.clear();
          this.scannerInstance = null;
          this.isScanning = false;
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
    },
    
    onScanSuccess(decodedText) {
      // Check for duplicate scan (within 3 seconds)
      const now = Date.now();
      if (
        this.lastScannedCode === decodedText && 
        this.lastScanTime && 
        now - this.lastScanTime < 3000
      ) {
        return; // Ignore duplicate
      }
      
      this.lastScannedCode = decodedText;
      this.lastScanTime = now;
      
      console.debug("Scanned QR code:", decodedText);
      // Extract order ID from URL
      const orderId = this.extractOrderId(decodedText);

      console.debug("Extracted order ID:", orderId);
      
      if (orderId) {
        // Visual feedback
        this.flashSuccess();
        
        // Emit event to parent with orderId and callback to add to history
        this.$emit('scanned', orderId, this.addToHistory);
      } else {
        // Invalid format
        this.addToHistory(null, 'warning', 'Format de codi QR invàlid');
      }
    },
    
    onScanError(error) {
      // Ignore scan errors (they happen constantly while scanning)
      // Only log to console for debugging
      // console.debug("Scan error:", error);
    },
    
    extractOrderId(url) {
      // Match patterns like:
      // http://localhost:8081/stats/#/order/view/15397
      // http://localhost:8081/stats/#/order/15397
      // or any domain with /order/view/{id} or /order/{id}
      const match = url.match(/\/order\/(?:view\/)?(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    },
    
    addToHistory(orderId, status, message) {
      this.scannedHistory.unshift({
        orderId,
        status, // 'success', 'error', 'warning'
        message,
        timestamp: new Date()
      });
      
      // Keep only last 20 items
      if (this.scannedHistory.length > 20) {
        this.scannedHistory = this.scannedHistory.slice(0, 20);
      }
    },
    
    flashSuccess() {
      this.showFlash = true;
      setTimeout(() => {
        this.showFlash = false;
      }, 300);
      
      // Optional: Play beep sound
      this.playBeep();
    },
    
    playBeep() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (err) {
        // Ignore audio errors
        console.debug("Could not play beep:", err);
      }
    },
    
    getStatusTagType(status) {
      const types = {
        success: 'is-success',
        error: 'is-danger',
        warning: 'is-warning'
      };
      return types[status] || 'is-light';
    },
    
    getStatusLabel(status) {
      const labels = {
        success: 'OK',
        error: 'ERROR',
        warning: 'AVÍS'
      };
      return labels[status] || status;
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ca-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    },
    
    clearHistory() {
      this.scannedHistory = [];
    },
    
    async switchCamera() {
      if (this.availableCameras.length <= 1) {
        // No other cameras to switch to
        this.$buefy.toast.open({
          message: 'No hi ha altres càmeres disponibles',
          type: 'is-info',
          duration: 2000
        });
        return;
      }

      try {
        // Stop current scanner
        await this.stopScanner();
        
        // Move to next camera (cycle through)
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        
        // Restart scanner with new camera
        await this.$nextTick();
        await this.startScanner();
        
        const cameraLabel = this.availableCameras[this.currentCameraIndex]?.label || 
                           `Càmera ${this.currentCameraIndex + 1}`;
        this.$buefy.toast.open({
          message: `Canviat a: ${cameraLabel}`,
          type: 'is-success',
          duration: 2000
        });
      } catch (err) {
        console.error("Error switching camera:", err);
        this.$buefy.toast.open({
          message: 'Error al canviar de càmera',
          type: 'is-danger',
          duration: 2000
        });
      }
    },
    
    cancel() {
      this.stopScanner();
      this.currentCameraIndex = 0; // Reset to default camera
      this.$emit('cancel');
    }
  }
};
</script>

<style lang="scss" scoped>
.scanner-body {
  min-height: 500px;
  padding: 1.5rem;
}

.scanner-container {
  position: relative;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 10;
}

#qr-reader {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.scan-success-flash {
  box-shadow: 0 0 20px 5px #48c774 !important;
}

.camera-switch-button {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 100;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background-color: rgba(255, 255, 255, 0.9) !important;
  
  &:hover {
    background-color: rgba(255, 255, 255, 1) !important;
    transform: scale(1.1);
  }
  
  .icon {
    margin: 0 !important;
  }
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.history-container {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 1rem;
  height: 100%;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.history-item {
  background-color: white;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-left: 4px solid #dbdbdb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.history-item-success {
  border-left-color: #48c774;
}

.history-item-error {
  border-left-color: #f14668;
}

.history-item-warning {
  border-left-color: #ffdd57;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.history-item-message {
  font-size: 0.875rem;
  color: #4a4a4a;
  margin-bottom: 0.25rem;
}

.history-item-time {
  font-size: 0.75rem;
  color: #7a7a7a;
}

// Scrollbar styling
.history-list::-webkit-scrollbar {
  width: 8px;
}

.history-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>

<style lang="scss">
// Override html5-qrcode default styles
#qr-reader {
  border: none !important;
  
  video {
    border-radius: 8px;
  }
  
  // Hide the default scan region border
  #qr-shaded-region {
    border: 2px solid rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.5) !important;
  }
}
</style>
