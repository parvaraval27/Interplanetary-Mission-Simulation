// Planetary data and constants
const PLANETS = {
    mercury: { name: 'Mercury', radius: 0.39, color: '#8C7853', mass: 0.055, period: 88 },
    venus: { name: 'Venus', radius: 0.72, color: '#FFC649', mass: 0.815, period: 225 },
    earth: { name: 'Earth', radius: 1.0, color: '#4A90E2', mass: 1.0, period: 365 },
    mars: { name: 'Mars', radius: 1.52, color: '#CD5C5C', mass: 0.107, period: 687 },
    jupiter: { name: 'Jupiter', radius: 5.2, color: '#DAA520', mass: 317.8, period: 4333 },
    saturn: { name: 'Saturn', radius: 9.5, color: '#F4E4C1', mass: 95.2, period: 10759 },
    uranus: { name: 'Uranus', radius: 19.2, color: '#4FD0E0', mass: 14.5, period: 30687 },
    neptune: { name: 'Neptune', radius: 30.1, color: '#4169E1', mass: 17.1, period: 60190 }
};

const PROPULSION_SYSTEMS = {
    chemical: { 
        name: 'Chemical Rocket', 
        isp: 350, 
        thrust: 50000, 
        efficiency: 0.35,
        description: 'High thrust, lower efficiency'
    },
    electric: { 
        name: 'Electric Propulsion', 
        isp: 3000, 
        thrust: 0.5, 
        efficiency: 0.70,
        description: 'Low thrust, high efficiency'
    },
    nuclear: { 
        name: 'Nuclear Thermal', 
        isp: 900, 
        thrust: 30000, 
        efficiency: 0.45,
        description: 'Balance of thrust and efficiency'
    },
    'solar-sail': { 
        name: 'Solar Sail', 
        isp: Infinity, 
        thrust: 0.01, 
        efficiency: 0.90,
        description: 'No propellant, continuous thrust'
    }
};

const G0 = 9.81; // Standard gravity (m/s²)
const AU = 149597870.7; // Astronomical Unit in km

class MissionSimulator {
    constructor() {
        this.canvas = document.getElementById('solar-system-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectedPropulsion = 'chemical';
        this.missionData = null;
        this.animationId = null;
        this.trajectoryPoints = [];
        this.planetScreenPositions = {};
        
        this.setupCanvas();
        this.initializeEventListeners();
        this.drawSolarSystem();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth - 40;
            this.canvas.height = 400;
            this.drawSolarSystem();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    initializeEventListeners() {
        // Range input listeners
        document.getElementById('payload-mass').addEventListener('input', (e) => {
            document.getElementById('payload-mass-value').textContent = `${e.target.value} kg`;
            this.updateRangeBackground(e.target);
        });

        document.getElementById('mission-duration').addEventListener('input', (e) => {
            const input = e.target;
            const isMax = input.value === input.max;
            document.getElementById('mission-duration-value').textContent = isMax ? '∞ days' : `${input.value} days`;
            this.updateRangeBackground(input);
        });

        // Initialize slider backgrounds
        ['payload-mass', 'mission-duration'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                this.updateRangeBackground(input);
            }
        });

        // Custom select listeners
        this.initializeCustomSelects();

        // Propulsion selection
        document.querySelectorAll('.propulsion-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.propulsion-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedPropulsion = card.dataset.type;
            });
        });

        // Button listeners
        document.getElementById('calculate-mission').addEventListener('click', () => this.calculateMission());
        document.getElementById('animate-trajectory').addEventListener('click', () => this.animateTrajectory());
        document.getElementById('reset-mission').addEventListener('click', () => this.resetMission());
    }

    initializeCustomSelects() {
        document.querySelectorAll('.custom-select').forEach(select => {
            const selected = select.querySelector('.select-selected');
            const options = select.querySelector('.select-options');

            // Toggle dropdown
            selected.addEventListener('click', () => {
                // Close other dropdowns
                document.querySelectorAll('.custom-select').forEach(s => {
                    if (s !== select) s.classList.remove('open');
                });
                select.classList.toggle('open');
            });

            // Select option
            options.querySelectorAll('.select-option').forEach(option => {
                option.addEventListener('click', () => {
                    const value = option.dataset.value;
                    const text = option.textContent;

                    selected.textContent = text;
                    selected.dataset.value = value;

                    // Update selected class
                    options.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');

                    select.classList.remove('open');
                });
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select')) {
                document.querySelectorAll('.custom-select').forEach(select => {
                    select.classList.remove('open');
                });
            }
        });
    }

    drawSolarSystem() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Clear canvas with cosmic background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Add cosmic gradient
        const gradient = ctx.createRadialGradient(width, centerY, 0, width, centerY, Math.max(width, height) / 1.2);
        gradient.addColorStop(0, 'rgba(26, 26, 46, 0.9)');
        gradient.addColorStop(0.5, 'rgba(10, 10, 15, 0.95)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw enhanced stars
        this.drawStars();

        // Sun on the right side as a larger half-visible disc
        const sunRadius = Math.min(width, height) * 0.12;
        const sunX = width + sunRadius * 0.4; // center slightly off-canvas so only left side shows
        const sunY = centerY;
        this.drawSun(sunX, sunY, sunRadius);

        // Planets laid out in a single horizontal line to the left of the sun
        this.drawPlanets(sunX, sunY);

        // Draw trajectory if calculated
        if (this.trajectoryPoints.length > 0) {
            this.drawTrajectory();
        }
    }

    drawSun(x, y, radius = 15) {
        const ctx = this.ctx;
        
        // Simple sun
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        sunGradient.addColorStop(0, '#FFFFFF');
        sunGradient.addColorStop(0.3, '#FFFF00');
        sunGradient.addColorStop(1, '#888888');
        ctx.fillStyle = sunGradient;
        ctx.fill();
    }

    drawPlanets(sunX, sunY) {
        const ctx = this.ctx;
        this.planetScreenPositions = {};

        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        const planetKeys = Object.keys(PLANETS); // Preserves declaration order (Mercury ... Neptune)

        // Use simple index-based spacing so all planets are clearly visible
        const maxVisibleWidth = width * 0.7; // portion of canvas used for planets
        const step = maxVisibleWidth / (planetKeys.length + 1);

        // Faux perspective parameters (about 37 degrees)
        const tiltRadians = 37 * Math.PI / 180;
        const depthScale = 0.18; // how far planets spread vertically

        planetKeys.forEach((key, index) => {
            const planet = PLANETS[key];

            // Horizontal distance from the sun
            const offset = step * (index + 1);
            const baseX = sunX - offset;

            // Give each planet a small "depth" based on its index
            const depthIndex = index - (planetKeys.length - 1) / 2; // centered around 0
            const depth = depthIndex * step * depthScale;

            // Project depth into screen Y using a simple tilt
            const projectedY = centerY + depth * Math.sin(tiltRadians);

            const planetX = baseX;
            const planetY = projectedY;
            this.planetScreenPositions[key] = { x: planetX, y: planetY };

            // Draw a slightly brighter elliptical orbit for depth perception
            const rx = offset;
            const ry = offset * 0.35; // flattened for perspective look
            ctx.beginPath();
            ctx.setLineDash([4, 10]);
            ctx.ellipse(sunX, centerY, rx, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw planet with slightly realistic relative sizes (not to scale)
            let planetSize = 8;
            switch (key) {
                case 'mercury':
                    planetSize = 5;
                    break;
                case 'venus':
                case 'earth':
                    planetSize = 7;
                    break;
                case 'mars':
                    planetSize = 6;
                    break;
                case 'jupiter':
                    planetSize = 12;
                    break;
                case 'saturn':
                    planetSize = 11;
                    break;
                case 'uranus':
                case 'neptune':
                    planetSize = 9;
                    break;
            }
            ctx.beginPath();
            ctx.arc(planetX, planetY, planetSize, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();

            // Draw planet name above
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(planet.name.toUpperCase(), planetX, planetY - planetSize - 8);
        });
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
            (G > 0 ? G : 0) * 0x100 +
            (B > 0 ? B : 0)).toString(16).slice(1);
    }

    drawStars() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Draw simple white stars
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.5;
            const brightness = Math.random() * 0.8 + 0.2;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    updateRangeBackground(input) {
        const min = input.min ? parseFloat(input.min) : 0;
        const max = input.max ? parseFloat(input.max) : 100;
        const value = parseFloat(input.value);
        const percent = ((value - min) / (max - min)) * 100;

        input.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percent}%, rgba(255, 255, 255, 0.1) ${percent}%, rgba(255, 255, 255, 0.1) 100%)`;
    }

    calculateMission() {
        const origin = document.querySelector('#origin-select .select-selected').dataset.value;
        const destination = document.querySelector('#destination-select .select-selected').dataset.value;
        const payloadMass = parseFloat(document.getElementById('payload-mass').value);
        const missionDurationInput = document.getElementById('mission-duration');
        const maxDurationValue = missionDurationInput.value;
        const maxDuration = maxDurationValue === missionDurationInput.max ? Infinity : parseFloat(maxDurationValue);
        const trajectoryType = document.querySelector('input[name="trajectory"]:checked').value;

        // Check if origin and destination are the same
        if (origin === destination) {
            this.updateMissionStatus('Origin and destination cannot be the same planet. Please select different planets.', 'error');
            return;
        }

        // Update status
        this.updateMissionStatus('Calculating mission parameters...', 'loading');

        // Calculate mission parameters
        const originPlanet = PLANETS[origin];
        const destPlanet = PLANETS[destination];
        const propulsion = PROPULSION_SYSTEMS[this.selectedPropulsion];

        // Calculate transfer orbit parameters
        const transferOrbit = this.calculateTransferOrbit(originPlanet, destPlanet, trajectoryType);
        
        // Calculate delta-v requirements
        const deltaV = this.calculateDeltaV(transferOrbit, propulsion);
        
        // Calculate mass requirements using rocket equation
        const massRequirements = this.calculateMassRequirements(deltaV, propulsion, payloadMass);
        
        // Calculate mission duration
        const missionDuration = this.calculateMissionDuration(transferOrbit, propulsion);
        
        // Calculate arrival conditions
        const arrivalConditions = this.calculateArrivalConditions(destPlanet, transferOrbit);

        // Store mission data
        this.missionData = {
            origin,
            destination,
            payloadMass,
            propulsion: this.selectedPropulsion,
            trajectoryType,
            transferOrbit,
            deltaV,
            massRequirements,
            missionDuration,
            arrivalConditions,
            success: (maxDuration === Infinity || missionDuration <= maxDuration) && massRequirements.totalMass < 1000000
        };

        // Generate trajectory points for visualization
        this.generateTrajectoryPoints(transferOrbit);

        // Update UI with results
        this.updateResults();
        if (this.missionData.success) {
            this.updateMissionStatus('Mission calculation complete! Mission is feasible with current parameters.', 'success');
        } else {
            this.updateMissionStatus('Mission calculation complete. Current configuration fails constraints (time or mass). Try adjusting payload, duration, propulsion, or trajectory.', 'info');
        }
        
        // Enable animation button
        document.getElementById('animate-trajectory').disabled = false;

        // Update trade-off chart
        this.updateTradeoffChart();
    }

    calculateTransferOrbit(origin, destination, type) {
        const r1 = origin.radius;
        const r2 = destination.radius;
        
        let a, e, period;
        
        switch(type) {
            case 'hohmann':
                a = (r1 + r2) / 2;
                e = Math.abs(r2 - r1) / (r2 + r1);
                period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / 1); // Simplified
                break;
            case 'bi-elliptic':
                a = (r1 + r2 * 2) / 3;
                e = 0.6;
                period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / 1);
                break;
            case 'brachistochrone':
                a = (r1 + r2) / 2;
                e = 0.3;
                period = Math.PI * Math.sqrt(Math.pow(a, 3) / 1);
                break;
            default:
                a = (r1 + r2) / 2;
                e = Math.abs(r2 - r1) / (r2 + r1);
                period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / 1);
        }
        
        return { a, e, period, r1, r2 };
    }

    calculateDeltaV(transferOrbit, propulsion) {
        const { a, r1, r2 } = transferOrbit;
        
        // Simplified delta-v calculation
        const v1 = Math.sqrt(1 / r1); // Circular velocity at origin
        const vTransfer1 = Math.sqrt(2 / r1 - 1 / a); // Transfer velocity at origin
        const vTransfer2 = Math.sqrt(2 / r2 - 1 / a); // Transfer velocity at destination
        const v2 = Math.sqrt(1 / r2); // Circular velocity at destination
        
        const deltaV1 = Math.abs(vTransfer1 - v1);
        const deltaV2 = Math.abs(v2 - vTransfer2);
        
        // Adjust for propulsion efficiency
        const efficiencyFactor = propulsion.efficiency;
        const totalDeltaV = (deltaV1 + deltaV2) / efficiencyFactor;
        
        return {
            departure: deltaV1 * 30, // Convert to km/s
            arrival: deltaV2 * 30,
            total: totalDeltaV * 30
        };
    }

    calculateMassRequirements(deltaV, propulsion, payloadMass) {
        const { total } = deltaV;
        const isp = propulsion.isp;
        
        if (isp === Infinity) {
            // Solar sail - no propellant needed
            return {
                propellantMass: 0,
                structuralMass: payloadMass * 0.2,
                totalMass: payloadMass * 1.2
            };
        }
        
        // Rocket equation: Δv = Isp * g0 * ln(m0 / mf)
        const massRatio = Math.exp(total / (isp * G0));
        const propellantMass = payloadMass * (massRatio - 1);
        const structuralMass = payloadMass * 0.15; // 15% structural mass
        const totalMass = payloadMass + propellantMass + structuralMass;
        
        return {
            propellantMass,
            structuralMass,
            totalMass
        };
    }

    calculateMissionDuration(transferOrbit, propulsion) {
        const { period } = transferOrbit;
        const thrustFactor = PROPULSION_SYSTEMS[this.selectedPropulsion].thrust / 1000;
        
        // Adjust duration based on propulsion thrust
        let baseDuration = (period / 2) * 365; // Half orbit in days
        
        if (this.selectedPropulsion === 'electric') {
            baseDuration *= 2.5; // Electric propulsion takes longer
        } else if (this.selectedPropulsion === 'solar-sail') {
            baseDuration *= 3; // Solar sail takes even longer
        } else if (this.selectedPropulsion === 'nuclear') {
            baseDuration *= 0.8; // Nuclear is faster
        }
        
        return Math.round(baseDuration);
    }

    calculateArrivalConditions(destination, transferOrbit) {
        const { r2 } = transferOrbit;
        const planet = destination;
        
        // Simplified arrival conditions
        const approachVelocity = Math.sqrt(1 / r2) * 30; // km/s
        const insertionDeltaV = approachVelocity * 0.3; // 30% of approach velocity
        const orbitalAltitude = 400 + Math.random() * 200; // km
        
        return {
            approachVelocity: approachVelocity.toFixed(2),
            insertionDeltaV: insertionDeltaV.toFixed(2),
            orbitalAltitude: orbitalAltitude.toFixed(0)
        };
    }

    generateTrajectoryPoints(transferOrbit) {
        this.trajectoryPoints = [];

        if (!this.missionData) return;

        const originKey = this.missionData.origin;
        const destKey = this.missionData.destination;
        const originPos = this.planetScreenPositions[originKey];
        const destPos = this.planetScreenPositions[destKey];

        if (!originPos || !destPos) return;

        // Simple smooth arc between origin and destination along the line layout
        const startX = originPos.x;
        const startY = originPos.y;
        const endX = destPos.x;
        const endY = destPos.y;

        const midX = (startX + endX) / 2;
        const verticalOffset = Math.min(this.canvas.height, this.canvas.width) * 0.18;
        const controlY = startY - verticalOffset; // Arc upwards

        // Quadratic Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t C + t^2 P1
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const oneMinusT = 1 - t;

            const x = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * midX + t * t * endX;
            const y = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * endY;
            this.trajectoryPoints.push({ x, y });
        }
    }

    drawTrajectory() {
        const ctx = this.ctx;
        
        if (this.trajectoryPoints.length < 2) return;
        
        // Simple white trajectory
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.trajectoryPoints[0].x, this.trajectoryPoints[0].y);
        
        for (let i = 1; i < this.trajectoryPoints.length; i++) {
            ctx.lineTo(this.trajectoryPoints[i].x, this.trajectoryPoints[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }

    animateTrajectory() {
        if (!this.missionData || this.trajectoryPoints.length === 0) return;
        
        let currentPoint = 0;
        const spacecraft = { x: this.trajectoryPoints[0].x, y: this.trajectoryPoints[0].y };
        let trail = [];
        const maxTrailLength = 15;
        
        const animate = () => {
            this.drawSolarSystem();
            
            // Draw spacecraft trail
            if (trail.length > 1) {
                const ctx = this.ctx;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(trail[0].x, trail[0].y);
                for (let i = 1; i < trail.length; i++) {
                    ctx.lineTo(trail[i].x, trail[i].y);
                }
                ctx.stroke();
            }
            
            // Draw spacecraft with glow effect
            const ctx = this.ctx;
            
            // Spacecraft glow
            const glowGradient = ctx.createRadialGradient(spacecraft.x, spacecraft.y, 0, spacecraft.x, spacecraft.y, 12);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.fillRect(spacecraft.x - 12, spacecraft.y - 12, 24, 24);
            
            // Spacecraft body
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(spacecraft.x, spacecraft.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add to trail
            trail.push({ x: spacecraft.x, y: spacecraft.y });
            if (trail.length > maxTrailLength) {
                trail.shift();
            }
            
            // Move spacecraft along trajectory with smooth animation
            if (currentPoint < this.trajectoryPoints.length - 1) {
                currentPoint += 1; // Slower speed for smoother animation
                if (currentPoint >= this.trajectoryPoints.length) {
                    currentPoint = this.trajectoryPoints.length - 1;
                }
                spacecraft.x = this.trajectoryPoints[currentPoint].x;
                spacecraft.y = this.trajectoryPoints[currentPoint].y;
                this.animationId = requestAnimationFrame(animate);
            } else {
                // Simple arrival effect at destination planet position if available
                const destinationKey = this.missionData.destination;
                const destPos = this.planetScreenPositions[destinationKey];
                const finalX = destPos ? destPos.x : spacecraft.x;
                const finalY = destPos ? destPos.y : spacecraft.y;

                // Draw one last frame with spacecraft snapped to planet
                this.drawSolarSystem();
                const ctx2 = this.ctx;
                const glowGradient2 = ctx2.createRadialGradient(finalX, finalY, 0, finalX, finalY, 12);
                glowGradient2.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                glowGradient2.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
                glowGradient2.addColorStop(1, 'transparent');
                ctx2.fillStyle = glowGradient2;
                ctx2.fillRect(finalX - 12, finalY - 12, 24, 24);
                ctx2.fillStyle = '#ffffff';
                ctx2.beginPath();
                ctx2.arc(finalX, finalY, 5, 0, Math.PI * 2);
                ctx2.fill();

                this.drawArrivalEffect(finalX, finalY);
                this.updateMissionStatus('Animation complete! Spacecraft arrived at destination.', 'success');
            }
        };
        
        this.updateMissionStatus('Launching spacecraft...', 'loading');
        animate();
    }

    drawArrivalEffect(x, y) {
        const ctx = this.ctx;
        
        // Simple white burst effect
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const distance = Math.random() * 20 + 10;
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, Math.random() * 2 + 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
            ctx.fill();
        }
        
        // Central flash
        const flashGradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        flashGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        flashGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        flashGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = flashGradient;
        ctx.fillRect(x - 30, y - 30, 60, 60);
    }


    updateResults() {
        if (!this.missionData) return;
        
        const { deltaV, massRequirements, missionDuration, arrivalConditions, propulsion } = this.missionData;
        const propulsionSystem = PROPULSION_SYSTEMS[propulsion];
        
        // Update mission parameters
        document.getElementById('travel-time').textContent = `${missionDuration} days`;
        document.getElementById('total-delta-v').textContent = `${deltaV.total.toFixed(2)} km/s`;
        document.getElementById('propellant-mass').textContent = `${massRequirements.propellantMass.toFixed(0)} kg`;
        document.getElementById('total-mass').textContent = `${massRequirements.totalMass.toFixed(0)} kg`;
        
        // Update performance metrics
        const thrustWeight = (propulsionSystem.thrust / massRequirements.totalMass).toFixed(4);
        document.getElementById('thrust-weight').textContent = `${thrustWeight} N/kg`;
        document.getElementById('specific-impulse').textContent = `${propulsionSystem.isp} s`;
        document.getElementById('efficiency').textContent = `${(propulsionSystem.efficiency * 100).toFixed(1)}%`;
        
        // Calculate cost estimate (simplified)
        const costPerKg = 10000; // $10,000 per kg to LEO
        const costEstimate = massRequirements.totalMass * costPerKg;
        document.getElementById('cost-estimate').textContent = `$${(costEstimate / 1e9).toFixed(2)} billion`;
        
        // Update arrival conditions
        document.getElementById('approach-velocity').textContent = `${arrivalConditions.approachVelocity} km/s`;
        document.getElementById('insertion-delta-v').textContent = `${arrivalConditions.insertionDeltaV} km/s`;
        document.getElementById('orbital-altitude').textContent = `${arrivalConditions.orbitalAltitude} km`;
        document.getElementById('mission-success').textContent = this.missionData.success ? 'Success' : 'Failed';
        
        // Add success/failure styling
        const successElement = document.getElementById('mission-success');
        successElement.style.color = this.missionData.success ? '#00ff88' : '#ff6b6b';
    }

    updateTradeoffChart() {
        if (!this.missionData) return;
        
        const ctx = document.getElementById('tradeoff-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.tradeoffChart) {
            this.tradeoffChart.destroy();
        }
        
        // Compare different propulsion systems
        const propulsionTypes = Object.keys(PROPULSION_SYSTEMS);
        const labels = propulsionTypes.map(type => PROPULSION_SYSTEMS[type].name);
        const durationData = [];
        const costData = [];
        const efficiencyData = [];
        
        propulsionTypes.forEach(type => {
            // Simulate different propulsion performance
            const propulsion = PROPULSION_SYSTEMS[type];
            let durationFactor = 1;
            let costFactor = 1;
            
            if (type === 'electric') {
                durationFactor = 2.5;
                costFactor = 0.7;
            } else if (type === 'solar-sail') {
                durationFactor = 3;
                costFactor = 0.5;
            } else if (type === 'nuclear') {
                durationFactor = 0.8;
                costFactor = 1.5;
            }
            
            durationData.push(this.missionData.missionDuration * durationFactor);
            costData.push(this.missionData.massRequirements.totalMass * costFactor * 10000 / 1e9);
            efficiencyData.push(propulsion.efficiency * 100);
        });
        
        this.tradeoffChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Mission Duration (days)', 'Cost (Billion $)', 'Efficiency (%)'],
                datasets: labels.map((label, index) => ({
                    label: label,
                    data: [
                        durationData[index] / Math.max(...durationData) * 100,
                        costData[index] / Math.max(...costData) * 100,
                        efficiencyData[index]
                    ],
                    backgroundColor: `hsla(${index * 90}, 70%, 50%, 0.2)`,
                    borderColor: `hsla(${index * 90}, 70%, 50%, 1)`,
                    borderWidth: 2
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#b8c5d6'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }

    updateMissionStatus(message, type = 'info') {
        const statusElement = document.getElementById('mission-status');
        statusElement.innerHTML = `<p>${message}</p>`;
        
        // Add visual feedback
        const infoCard = statusElement.parentElement;
        infoCard.classList.remove('success', 'loading');
        if (type === 'success') {
            infoCard.classList.add('success');
        } else if (type === 'loading') {
            statusElement.innerHTML = `<p>${message} <span class="loading"></span></p>`;
        }
    }

    resetMission() {
        // Cancel animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Reset data
        this.missionData = null;
        this.trajectoryPoints = [];
        
        // Reset UI
        document.getElementById('payload-mass').value = 5000;
        document.getElementById('payload-mass-value').textContent = '5000 kg';
        document.getElementById('mission-duration').value = 500;
        document.getElementById('mission-duration-value').textContent = '500 days';

        // Reset slider backgrounds
        ['payload-mass', 'mission-duration'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                this.updateRangeBackground(input);
            }
        });

        // Reset custom selects
        const originSelect = document.querySelector('#origin-select .select-selected');
        const destinationSelect = document.querySelector('#destination-select .select-selected');
        originSelect.textContent = 'Earth';
        originSelect.dataset.value = 'earth';
        destinationSelect.textContent = 'Mars';
        destinationSelect.dataset.value = 'mars';

        // Reset selected classes in options
        document.querySelectorAll('#origin-select .select-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.value === 'earth') opt.classList.add('selected');
        });
        document.querySelectorAll('#destination-select .select-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.value === 'mars') opt.classList.add('selected');
        });

        document.querySelector('input[value="hohmann"]').checked = true;
        
        // Reset propulsion selection
        document.querySelectorAll('.propulsion-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.type === 'chemical') {
                card.classList.add('selected');
            }
        });
        this.selectedPropulsion = 'chemical';
        
        // Clear results
        ['travel-time', 'total-delta-v', 'propellant-mass', 'total-mass',
         'thrust-weight', 'specific-impulse', 'efficiency', 'cost-estimate',
         'approach-velocity', 'insertion-delta-v', 'orbital-altitude', 'mission-success'].forEach(id => {
            document.getElementById(id).textContent = '--';
        });
        
        // Disable animation button
        document.getElementById('animate-trajectory').disabled = true;
        
        // Reset status
        this.updateMissionStatus('Ready to calculate mission');
        
        // Redraw solar system
        this.drawSolarSystem();
        
        // Clear tradeoff chart
        if (this.tradeoffChart) {
            this.tradeoffChart.destroy();
            this.tradeoffChart = null;
        }
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new MissionSimulator();
});
