class MonitorPresetManager {
    constructor() {
        this.initializeForm();
        this.setupEventListeners();
    }

    initializeForm() {
        this.form = document.getElementById('monitorPresetForm');
        this.updateDisplayValues();
    }

    setupEventListeners() {
        // Update range input values
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(input => {
            input.addEventListener('input', () => this.updateDisplayValues());
        });

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    updateDisplayValues() {
        document.getElementById('brightnessValue').textContent = 
            `${document.getElementById('brightness').value}%`;
        document.getElementById('contrastValue').textContent = 
            `${document.getElementById('contrast').value}%`;
        document.getElementById('intensityValue').textContent = 
            `${document.getElementById('colorIntensity').value}%`;
    }

    handleSubmit(event) {
        event.preventDefault();

        const preset = {
            brand: document.getElementById('monitorBrand').value,
            model: document.getElementById('monitorModel').value,
            settings: {
                colorGamut: document.getElementById('colorGamut').value,
                colorSpace: document.getElementById('colorSpace').value,
                brightness: parseInt(document.getElementById('brightness').value),
                contrast: parseInt(document.getElementById('contrast').value),
                colorTemperature: document.getElementById('colorTemp').value,
                colorIntensity: parseInt(document.getElementById('colorIntensity').value)
            },
            id: `${document.getElementById('monitorBrand').value.toLowerCase()}_${
                document.getElementById('monitorModel').value.toLowerCase()}`
                .replace(/[^a-z0-9]/g, '_')
        };

        // Save to localStorage
        this.savePreset(preset);

        // Show success message and redirect
        alert('Monitor added successfully!');
        window.location.href = 'index.html';
    }

    savePreset(preset) {
        let presets = JSON.parse(localStorage.getItem('monitorPresets') || '{}');
        presets[preset.id] = preset;
        localStorage.setItem('monitorPresets', JSON.stringify(presets));
        
        // Debug: Log the saved presets
        console.log('Saved presets:', presets);
    }
}

// Initialize the preset manager
document.addEventListener('DOMContentLoaded', () => {
    new MonitorPresetManager();
}); 