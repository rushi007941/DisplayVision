class ImageCalibrator {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.originalImage = null;
    }

    initializeElements() {
        this.resolutionSelect = document.getElementById('resolutionSelect');
        this.colorSpace = document.getElementById('colorSpace');
        this.colorIntensity = document.getElementById('colorIntensity');
        this.intensityValue = document.getElementById('intensityValue');
        this.imageUpload = document.getElementById('imageUpload');
        this.processButton = document.getElementById('processButton');
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
        this.processButton.addEventListener('click', () => this.processImage());
        this.colorIntensity.addEventListener('input', () => {
            this.intensityValue.textContent = this.colorIntensity.value;
        });
        this.brightness.addEventListener('input', () => {
            this.brightnessValue.textContent = this.brightness.value;
            this.processImage();
        });

        this.contrast.addEventListener('input', () => {
            this.contrastValue.textContent = this.contrast.value;
            this.processImage();
        });

        this.colorTemp.addEventListener('change', () => this.processImage());

        this.colorGamut.addEventListener('change', () => this.processImage());

        this.monitorSelect.addEventListener('change', () => this.handleMonitorSelection());

        this.colorSpace.addEventListener('change', () => this.processImage());
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.originalImage = new Image();
                this.originalImage.onload = () => {
                    console.log('Image loaded:', {
                        width: this.originalImage.width,
                        height: this.originalImage.height
                    });
                    this.processImage(); // Process immediately after loading
                    this.processButton.disabled = false;
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
        if (!this.originalImage) {
            console.error("No image loaded.");
            return;
        }

        // Get selected monitor specs
        const selectedMonitor = MONITOR_SPECS[this.monitorSelect.value];
        
        // Calculate aspect ratio of original image
        const aspectRatio = this.originalImage.width / this.originalImage.height;
        
        // Set base dimensions (you can adjust these values)
        let maxWidth = 600;
        let maxHeight = 400;
        
        // Calculate dimensions maintaining aspect ratio
        let width = maxWidth;
        let height = width / aspectRatio;
        
        // If height is too large, scale based on height instead
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        // Clear previous canvases
        const originalCtx = this.originalCanvas.getContext('2d');
        const calibratedCtx = this.calibratedCanvas.getContext('2d');

        // Set canvas sizes
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.calibratedCanvas.width = width;
        this.calibratedCanvas.height = height;

        // Draw original image maintaining aspect ratio
        originalCtx.drawImage(
            this.originalImage,
            0, 0,
            this.originalImage.width, this.originalImage.height,
            0, 0,
            width, height
        );

        // Draw image to be calibrated
        calibratedCtx.drawImage(
            this.originalImage,
            0, 0,
            this.originalImage.width, this.originalImage.height,
            0, 0,
            width, height
        );

        // Get image data for processing
        const imageData = calibratedCtx.getImageData(0, 0, width, height);
        
        // Apply color adjustments
        const intensity = this.colorIntensity.value / 100;
        this.adjustColors(imageData.data, intensity);
        
        // Put processed image data back
        calibratedCtx.putImageData(imageData, 0, 0);

        console.log('Image processed:', {
            originalSize: `${this.originalImage.width}x${this.originalImage.height}`,
            newSize: `${width}x${height}`,
            aspectRatio: aspectRatio,
            colorSpace: this.colorSpace.value,
            intensity: intensity
        });
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
            r *= brightnessValue;
            g *= brightnessValue;
            b *= brightnessValue;

            // Apply contrast
            r = this.applyContrast(r, contrastValue);
            g = this.applyContrast(g, contrastValue);
            b = this.applyContrast(b, contrastValue);

            // Apply color temperature
            r *= tempMultipliers.r;
            g *= tempMultipliers.g;
            b *= tempMultipliers.b;

            // Apply color space and gamut transformations
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
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ImageCalibrator();
});