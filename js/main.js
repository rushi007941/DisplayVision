class ImageCalibrator {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.originalImage = null;
        this.loadMonitorPresets();
    }

    initializeElements() {
        this.resolutionSelect = document.getElementById('resolutionSelect');
        this.colorSpace = document.getElementById('colorSpace');
        this.colorIntensity = document.getElementById('colorIntensity');
        this.intensityValue = document.getElementById('intensityValue');
        this.imageUpload = document.getElementById('imageUpload');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.calibratedCanvas = document.getElementById('calibratedCanvas');
        this.brightness = document.getElementById('brightness');
        this.brightnessValue = document.getElementById('brightnessValue');
        this.contrast = document.getElementById('contrast');
        this.contrastValue = document.getElementById('contrastValue');
        this.colorTemp = document.getElementById('colorTemp');
        this.colorGamut = document.getElementById('colorGamut');
        this.monitorSelect = document.getElementById('monitorSelect');
    }

    setupEventListeners() {
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.monitorSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.applyMonitorPreset(e.target.value);
                this.processImage();
            }
        });

        // Add live update listeners for range inputs
        this.brightness.addEventListener('input', () => {
            this.brightnessValue.textContent = `${this.brightness.value}%`;
            if (this.originalImage) this.processImage();
        });

        this.contrast.addEventListener('input', () => {
            this.contrastValue.textContent = `${this.contrast.value}%`;
            if (this.originalImage) this.processImage();
        });

        this.colorIntensity.addEventListener('input', () => {
            this.intensityValue.textContent = `${this.colorIntensity.value}%`;
            if (this.originalImage) this.processImage();
        });

        // Add change listeners for select elements
        this.colorTemp.addEventListener('change', () => {
            if (this.originalImage) this.processImage();
        });

        this.colorGamut.addEventListener('change', () => {
            if (this.originalImage) this.processImage();
        });

        this.colorSpace.addEventListener('change', () => {
            if (this.originalImage) this.processImage();
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.originalImage = new Image();
                this.originalImage.onload = () => {
                    this.processImage(); // Process immediately after loading
                };
                this.originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    drawOriginalImage() {
        const ctx = this.originalCanvas.getContext('2d');
        this.originalCanvas.width = this.originalImage.width;
        this.originalCanvas.height = this.originalImage.height;
        ctx.drawImage(this.originalImage, 0, 0);
    }

    processImage() {
        if (!this.originalImage) return;

        // Get selected monitor specs
        const selectedMonitor = MONITOR_SPECS[this.monitorSelect.value];
        
        // Use original image dimensions
        const width = this.originalImage.width;
        const height = this.originalImage.height;

        // Clear previous canvases
        const originalCtx = this.originalCanvas.getContext('2d');
        const calibratedCtx = this.calibratedCanvas.getContext('2d');

        // Enable image smoothing for better quality
        originalCtx.imageSmoothingEnabled = true;
        originalCtx.imageSmoothingQuality = 'high';
        calibratedCtx.imageSmoothingEnabled = true;
        calibratedCtx.imageSmoothingQuality = 'high';

        // Set canvas sizes
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.calibratedCanvas.width = width;
        this.calibratedCanvas.height = height;

        // Draw images
        originalCtx.drawImage(this.originalImage, 0, 0, width, height);
        calibratedCtx.drawImage(this.originalImage, 0, 0, width, height);

        // Get image data for processing
        const imageData = calibratedCtx.getImageData(0, 0, width, height);
        
        // Apply color adjustments
        const intensity = this.colorIntensity.value / 100;
        this.adjustColors(imageData.data, intensity);
        
        // Put processed image data back
        calibratedCtx.putImageData(imageData, 0, 0);

        // Force a repaint
        this.calibratedCanvas.style.opacity = '0.99';
        setTimeout(() => {
            this.calibratedCanvas.style.opacity = '1';
        }, 0);
    }

    adjustColors(pixels, intensity) {
        const brightnessValue = this.brightness.value / 100;
        const contrastValue = this.contrast.value / 100;
        const colorTemp = parseInt(this.colorTemp.value);
        const gamut = this.colorGamut.value;

        // Color temperature adjustments
        const tempMultipliers = this.getColorTempMultipliers(colorTemp);

        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];

            // Apply brightness
            r = Math.min(255, r * brightnessValue);
            g = Math.min(255, g * brightnessValue);
            b = Math.min(255, b * brightnessValue);

            // Apply contrast
            r = this.applyContrast(r, contrastValue);
            g = this.applyContrast(g, contrastValue);
            b = this.applyContrast(b, contrastValue);

            // Apply color temperature
            r *= tempMultipliers.r;
            g *= tempMultipliers.g;
            b *= tempMultipliers.b;

            // Apply color space transformations
            if (this.colorSpace.value === 'srgb') {
                [r, g, b] = this.applySRGBTransform([r, g, b]);
            } else if (this.colorSpace.value === 'cmyk') {
                [r, g, b] = this.applyCMYKSimulation([r, g, b]);
            }

            // Apply color gamut transformation
            [r, g, b] = this.applyGamutTransform([r, g, b], gamut);

            // Apply final intensity
            r *= intensity;
            g *= intensity;
            b *= intensity;

            // Clamp values
            pixels[i] = Math.min(255, Math.max(0, r));
            pixels[i + 1] = Math.min(255, Math.max(0, g));
            pixels[i + 2] = Math.min(255, Math.max(0, b));
        }
    }

    applyContrast(value, contrast) {
        return ((value / 255 - 0.5) * contrast + 0.5) * 255;
    }

    getColorTempMultipliers(temp) {
        // Simplified color temperature adjustment
        const tempRatio = temp / 6500;
        return {
            r: tempRatio > 1 ? 1 : tempRatio,
            g: 1,
            b: tempRatio < 1 ? 1 : 1/tempRatio
        };
    }

    applySRGBTransform(rgb) {
        return rgb.map(value => {
            value = value / 255;
            value = value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
            return value * 255;
        });
    }

    applyCMYKSimulation(rgb) {
        // Simple CMYK simulation
        return rgb.map(value => {
            value = value / 255;
            value = 1 - (1 - value) * 0.95; // Simulate ink absorption
            return value * 255;
        });
    }

    applyGamutTransform(rgb, gamut) {
        // Simplified gamut mapping
        const gamutMultipliers = {
            'srgb': { r: 1, g: 1, b: 1 },
            'p3': { r: 1.2, g: 1.15, b: 1.15 },
            'adobe': { r: 1.17, g: 1.05, b: 1.05 },
            'rec2020': { r: 1.3, g: 1.2, b: 1.2 }
        };

        const multiplier = gamutMultipliers[gamut];
        return [
            rgb[0] * multiplier.r,
            rgb[1] * multiplier.g,
            rgb[2] * multiplier.b
        ];
    }

    loadMonitorPresets() {
        const presets = JSON.parse(localStorage.getItem('monitorPresets') || '{}');
        const monitorSelect = document.getElementById('monitorSelect');
        
        // Clear existing custom presets (keep the default ones)
        const customOptgroups = monitorSelect.querySelectorAll('optgroup[data-custom="true"]');
        customOptgroups.forEach(group => group.remove());
        
        // Add presets to select options
        Object.values(presets).forEach(preset => {
            const optgroup = document.querySelector(`optgroup[label="${preset.brand}"]`) || 
                this.createOptgroup(preset.brand);
            
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = `${preset.model}`;
            optgroup.appendChild(option);
        });
    }

    createOptgroup(label) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = label;
        optgroup.setAttribute('data-custom', 'true'); // Mark as custom optgroup
        document.getElementById('monitorSelect').appendChild(optgroup);
        return optgroup;
    }

    applyMonitorPreset(presetId) {
        const presets = JSON.parse(localStorage.getItem('monitorPresets') || '{}');
        const preset = presets[presetId];
        
        if (preset) {
            document.getElementById('colorGamut').value = preset.settings.colorGamut;
            document.getElementById('colorSpace').value = preset.settings.colorSpace;
            document.getElementById('brightness').value = preset.settings.brightness;
            document.getElementById('contrast').value = preset.settings.contrast;
            document.getElementById('colorTemp').value = preset.settings.colorTemperature;
            document.getElementById('colorIntensity').value = preset.settings.colorIntensity;
            
            // Update display values
            this.updateDisplayValues();
            // Process image if one is loaded
            if (this.originalImage) {
                this.processImage();
            }
        }
    }

    updateDisplayValues() {
        document.getElementById('brightnessValue').textContent = `${this.brightness.value}%`;
        document.getElementById('contrastValue').textContent = `${this.contrast.value}%`;
        document.getElementById('colorTempValue').textContent = `${this.colorTemp.value}K`;
        document.getElementById('intensityValue').textContent = `${this.colorIntensity.value}%`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ImageCalibrator();
});

// Add these functions at the end of main.js
function toggleAddMonitorForm() {
    const previewSection = document.getElementById('previewSection');
    const addMonitorSection = document.getElementById('addMonitorSection');
    
    previewSection.classList.add('d-none');
    addMonitorSection.classList.remove('d-none');
}

// Add event listener for cancel button
document.getElementById('cancelAddBtn').addEventListener('click', () => {
    const previewSection = document.getElementById('previewSection');
    const addMonitorSection = document.getElementById('addMonitorSection');
    
    previewSection.classList.remove('d-none');
    addMonitorSection.classList.add('d-none');
});

// Add event listener for form submission
document.getElementById('monitorPresetForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const preset = {
        brand: document.getElementById('monitorBrand').value,
        model: document.getElementById('monitorModel').value,
        settings: {
            colorGamut: document.getElementById('newMonitorColorGamut').value,
            colorSpace: document.getElementById('newMonitorColorSpace').value,
            brightness: parseInt(document.getElementById('newBrightness').value),
            contrast: parseInt(document.getElementById('newContrast').value),
            colorTemperature: document.getElementById('newColorTemp').value,
            colorIntensity: parseInt(document.getElementById('newColorIntensity').value)
        },
        id: `${document.getElementById('monitorBrand').value.toLowerCase()}_${
            document.getElementById('monitorModel').value.toLowerCase()}`
            .replace(/[^a-z0-9]/g, '_')
    };

    // Add event listeners for live updates of values
    document.getElementById('newBrightness').addEventListener('input', function() {
        document.getElementById('newBrightnessValue').textContent = `${this.value}%`;
    });

    document.getElementById('newContrast').addEventListener('input', function() {
        document.getElementById('newContrastValue').textContent = `${this.value}%`;
    });

    document.getElementById('newColorIntensity').addEventListener('input', function() {
        document.getElementById('newIntensityValue').textContent = `${this.value}%`;
    });

    // Save to localStorage
    let presets = JSON.parse(localStorage.getItem('monitorPresets') || '{}');
    presets[preset.id] = preset;
    localStorage.setItem('monitorPresets', JSON.stringify(presets));

    // Show success message
    alert('Monitor added successfully!');

    // Reset form and show preview
    e.target.reset();
    document.getElementById('previewSection').classList.remove('d-none');
    document.getElementById('addMonitorSection').classList.add('d-none');

    // Reload monitor list
    window.location.reload();
});