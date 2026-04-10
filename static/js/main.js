document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        name: '',
        gender: 'Male',
        steps: 0,
        height: 0,
        weight: 0,
        water: 0.0, // Liters
        calories: 0
    };

    let previousScore = 0.0;

    // --- DOM Elements ---
    const onboardingScreen = document.getElementById('onboardingScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const onboardingForm = document.getElementById('onboardingForm');
    const displayUser = document.getElementById('displayUser');
    
    const scoreCircle = document.getElementById('scoreCircle');
    const totalScore = document.getElementById('totalScore');
    
    const stepsInput = document.getElementById('stepsInput');
    const stepsProgress = document.getElementById('stepsProgress');
    
    const heightInput = document.getElementById('heightInput');
    const weightInput = document.getElementById('weightInput');
    const bmiValue = document.getElementById('bmiValue');
    
    const waterLevel = document.getElementById('waterLevel');
    const waterText = document.getElementById('waterText');
    const waterBtns = document.querySelectorAll('.btn-water');
    
    const calInput = document.getElementById('calInput');
    const calTarget = document.getElementById('calTarget');
    const calProgress = document.getElementById('calProgress');
    
    // New Elements
    const scoreMessage = document.getElementById('scoreMessage');
    const calendarList = document.getElementById('calendarList');
    
    let fetchTimer; // For debouncing inputs

    // --- Onboarding Flow ---
    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.name = document.getElementById('name').value;
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        if(genderRadio) state.gender = genderRadio.value;
        
        displayUser.textContent = state.name;
        
        // Define calorie target dynamically based on gender
        let targetCal = 2500;
        if(state.gender === 'Female') targetCal = 2000;
        if(state.gender === 'Other') targetCal = 2250;
        calTarget.textContent = targetCal + ' kcal';

        // Trigger SPA transition
        onboardingScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        
        // Initialize score to 0 on dashboard load based on 0 stats
        triggerUpdate();
    });

    // --- Event Listeners: Steps ---
    stepsInput.addEventListener('input', (e) => {
        state.steps = parseInt(e.target.value) || 0;
        let pct = Math.min((state.steps / 10000) * 100, 100);
        stepsProgress.style.width = `${pct}%`;
        triggerUpdate();
    });

    // --- Event Listeners: BMI ---
    const updateBMI = () => {
        state.height = parseFloat(heightInput.value) || 0;
        state.weight = parseFloat(weightInput.value) || 0;
        
        if(state.height > 0 && state.weight > 0) {
            let heightMeters = state.height / 100.0;
            let bmi = state.weight / (heightMeters * heightMeters);
            bmiValue.textContent = bmi.toFixed(1);
            
            // Color code based on BMI categories
            if(bmi >= 18.5 && bmi <= 24.9) {
                bmiValue.style.color = 'var(--water-green)';
            } else if(bmi < 18.5) {
                bmiValue.style.color = '#fde047'; // Yellow-ish
            } else {
                bmiValue.style.color = 'var(--danger)'; // Red for overweight/obese
            }
        } else {
            bmiValue.textContent = '--';
            bmiValue.style.color = 'white';
        }
        triggerUpdate();
    };
    heightInput.addEventListener('input', updateBMI);
    weightInput.addEventListener('input', updateBMI);

    // --- Event Listeners: Calories ---
    calInput.addEventListener('input', (e) => {
        state.calories = parseInt(e.target.value) || 0;
        let targetCal = state.gender === 'Female' ? 2000 : (state.gender === 'Other' ? 2250 : 2500);
        
        let pct = Math.min((state.calories / targetCal) * 100, 100);
        calProgress.style.width = `${pct}%`;
        
        // Color transition logic explicitly handling ±10% safe range
        if (state.calories >= targetCal * 0.9 && state.calories <= targetCal * 1.1) {
            calProgress.style.backgroundColor = 'var(--water-green)';
        } else if (state.calories > targetCal * 1.1) {
            calProgress.style.backgroundColor = 'var(--danger)';
        } else {
            calProgress.style.backgroundColor = 'var(--accent)';
        }
        
        triggerUpdate();
    });

    // --- Event Listeners: Water Wave Animation ---
    waterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const addAmount = parseFloat(btn.dataset.add);
            state.water += addAmount;
            
            // UI Update for wave scaling
            let basePct = (state.water / 4.0) * 100;
            let displayPct = Math.min(basePct, 100);
            
            waterLevel.style.height = `${displayPct}%`;
            waterText.textContent = state.water.toFixed(1);
            
            if(state.water >= 4.0) {
                waterLevel.classList.add('success');
            } else {
                waterLevel.classList.remove('success');
            }
            
            triggerUpdate();
        });
    });

    // --- Backend Sync via Fetch API ---
    function triggerUpdate() {
        clearTimeout(fetchTimer);
        // Debounce to prevent slamming backend with requests on every keystroke
        fetchTimer = setTimeout(updateScore, 400); 
    }

    function updateScore() {
        // Local calculation logic (Offline Mode)
        let stepsScore = state.steps >= 10000 ? 10.0 : (state.steps / 10000.0) * 10;
        
        let bmiScore = 0.0;
        if (state.height > 0 && state.weight > 0) {
            let hm = state.height / 100.0;
            let bmi = state.weight / (hm * hm);
            if (bmi >= 18.5 && bmi <= 24.9) bmiScore = 10.0;
            else if (bmi >= 25.0 && bmi <= 29.9) bmiScore = 3.0;
            else if (bmi >= 30.0) bmiScore = 1.0;
            else bmiScore = 3.0;
        }
        
        let waterScore = 2.0;
        if (state.water >= 4.0) waterScore = 10.0;
        else if (state.water >= 2.0) waterScore = 5.0 + (state.water - 2.0) * 2.5;
        
        let targetCal = state.gender === 'Female' ? 2000 : (state.gender === 'Other' ? 2250 : 2500);
        let calScore = 10.0;
        let lower = targetCal * 0.9;
        let upper = targetCal * 1.1;
        
        if (state.calories < lower || state.calories > upper) {
            let deviation = state.calories > upper ? state.calories - upper : lower - state.calories;
            calScore = Math.max(0.0, 10.0 - (deviation / 100.0));
        }
        
        let totalScore = (stepsScore + bmiScore + waterScore + calScore) / 4.0;
        renderScore(totalScore);
    }

    // --- Dynamic Score UI ---
    function renderScore(newScore) {
        let strokeColor = 'var(--accent)';
        if(newScore >= 8.5) strokeColor = '#00f0ff'; 
        else if (newScore >= 6.0) strokeColor = '#10b981'; 
        else if (newScore >= 4.0) strokeColor = '#f59e0b';
        else strokeColor = '#ef4444'; 
        
        // Update Motivational Text
        if(newScore >= 7.5) {
            scoreMessage.textContent = "Good job!";
            scoreMessage.style.color = '#10b981';
        } else if (newScore >= 5.0) {
            scoreMessage.textContent = "I know you can do better for your health!";
            scoreMessage.style.color = '#fde047';
        } else {
            scoreMessage.textContent = "You gotta do more for your health, check your statistics and work on it !";
            scoreMessage.style.color = '#ef4444';
        }
        
        // Save to History
        saveTodayScore(newScore);

        scoreCircle.style.stroke = strokeColor;
        
        // Circular progress logic
        // dasharray = percentage_value * 100 max
        const percentage = (newScore / 10.0) * 100;
        scoreCircle.setAttribute('stroke-dasharray', `${percentage}, 100`);
        totalScore.style.fill = strokeColor;
        
        // Count up animation implementation
        let startTimestamp = null;
        const duration = 1000;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            const currentScore = (progress * (newScore - previousScore) + previousScore).toFixed(1);
            totalScore.textContent = currentScore;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                totalScore.textContent = newScore.toFixed(1);
                previousScore = newScore;
            }
        };
        
        window.requestAnimationFrame(step);
    }

    // --- Calendar Persistence Logic ---
    function saveTodayScore(score) {
        let history = JSON.parse(localStorage.getItem('aerohealth_history')) || {};
        const today = new Date().toISOString().split('T')[0];
        history[today] = parseFloat(score.toFixed(1));
        localStorage.setItem('aerohealth_history', JSON.stringify(history));
        renderCalendar();
    }

    function renderCalendar() {
        if (!calendarList) return;
        let history = JSON.parse(localStorage.getItem('aerohealth_history')) || {};
        calendarList.innerHTML = '';
        
        // Render last 7 days
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', {weekday: 'short'});
            
            let val = history[dateStr] !== undefined ? history[dateStr] : '--';
            let color = 'white';
            if(val !== '--') {
                if(val >= 7.5) color = '#10b981';
                else if (val >= 5.0) color = '#fde047';
                else color = '#ef4444';
            }
            
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.innerHTML = `<span class="day-lbl">${dayName}</span><span class="day-score" style="color: ${color}">${val}</span>`;
            calendarList.appendChild(div);
        }
    }
    
    // Initial Render
    renderCalendar();
});
