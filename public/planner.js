document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Please login to use the Trip Planner!");
        window.location.href = 'login.html';
        return;
    }

    // Wizard State
    let currentStep = 1;
    const totalSteps = 8;
    
    // UI Elements
    const steps = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressFill = document.getElementById('progressFill');
    const stepNumDisplay = document.getElementById('currentStepNum');

    // Data Store
    const tripData = {
        destinations: [],
        start_date: '',
        duration: '',
        adults: 2,
        children: 0,
        travel_type: 'Couple',
        budget_range: '25000',
        package_type: 'Standard',
        hotel_category: '3 Star',
        transport: 'Private Cab',
        activities: [],
        food_pref: 'Any',
        special_requests: '',
        estimated_price: 0
    };

    // Card Selection Logic (Multi & Single)
    document.querySelectorAll('.select-card').forEach(card => {
        card.addEventListener('click', function() {
            const container = this.parentElement;
            
            // Single Select Mode
            if(container.classList.contains('single-select')) {
                container.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                
                // Update Data instantly
                if(container.classList.contains('type-selector')) tripData.travel_type = this.dataset.val;
                if(container.classList.contains('pkg-selector')) tripData.package_type = this.dataset.val;
            } 
            // Multi Select Mode
            else {
                this.classList.toggle('selected');
            }
        });
    });

    // Budget Slider sync
    const budgetSlider = document.getElementById('p_budget');
    const budgetValue = document.getElementById('budgetValue');
    budgetSlider.addEventListener('input', (e) => {
        budgetValue.textContent = parseInt(e.target.value).toLocaleString();
        tripData.budget_range = e.target.value;
    });

    // Navigation Logic
    function updateWizard() {
        // Hide all, show current
        steps.forEach((step, index) => {
            if(index + 1 === currentStep) step.classList.add('active');
            else step.classList.remove('active');
        });

        // Update Progress
        stepNumDisplay.textContent = currentStep;
        progressFill.style.width = `${(currentStep / totalSteps) * 100}%`;

        // Buttons
        if (currentStep === 1) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-block';
        }

        if (currentStep === totalSteps) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
            generateSummary(); // Final calculation
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
            nextBtn.innerHTML = `Continue to Step ${currentStep + 1} <i class="fa-solid fa-arrow-right"></i>`;
            
            // If arriving at step 7, generate itinerary mock
            if (currentStep === 7) generateItineraryMock();
        }
    }

    // Validation & Data Collection
    function validateAndCollectStep() {
        if (currentStep === 1) {
            const selectedDests = Array.from(document.querySelectorAll('.dest-selector .selected')).map(c => c.dataset.val);
            if (selectedDests.length === 0) {
                alert("Please select at least one destination!");
                return false;
            }
            tripData.destinations = selectedDests;
        }
        else if (currentStep === 2) {
            tripData.start_date = document.getElementById('p_start_date').value;
            tripData.duration = document.getElementById('p_duration').value;
            if (!tripData.start_date || !tripData.duration) {
                alert("Please fill all date fields.");
                return false;
            }
        }
        else if (currentStep === 3) {
            tripData.adults = parseInt(document.getElementById('p_adults').value);
            tripData.children = parseInt(document.getElementById('p_children').value);
        }
        else if (currentStep === 5) {
            tripData.hotel_category = document.getElementById('p_hotel').value;
            tripData.transport = document.getElementById('p_transport').value;
        }
        else if (currentStep === 6) {
            tripData.activities = Array.from(document.querySelectorAll('.act-selector .selected')).map(c => c.dataset.val);
            tripData.food_pref = document.getElementById('p_food').value;
            tripData.special_requests = document.getElementById('p_requests').value;
        }
        return true;
    }

    nextBtn.addEventListener('click', () => {
        if (validateAndCollectStep()) {
            currentStep++;
            updateWizard();
            window.scrollTo(0,0);
        }
    });

    prevBtn.addEventListener('click', () => {
        currentStep--;
        updateWizard();
        window.scrollTo(0,0);
    });

    // -----------------------------------------
    // Smart Itinerary Generation (Mock)
    // -----------------------------------------
    function generateItineraryMock() {
        const timeline = document.getElementById('itineraryTimeline');
        timeline.innerHTML = '';
        
        let days = 4; // Default
        if(tripData.duration.includes('3N')) days = 4;
        if(tripData.duration.includes('4N')) days = 5;
        if(tripData.duration.includes('5N')) days = 6;
        if(tripData.duration.includes('7N')) days = 8;
        
        const destCount = tripData.destinations.length;
        
        for(let i=1; i<=days; i++) {
            let desc = "";
            let currentDest = tripData.destinations[(i-1) % destCount]; // Cycle through picked places
            
            if(i === 1) desc = `Arrival in Kerala. Transfer to ${currentDest} in your ${tripData.transport}. Check-in to your ${tripData.hotel_category} and relax.`;
            else if(i === days) desc = `Breakfast at hotel. Proceed for departure with sweet memories of Kerala.`;
            else {
                const act = tripData.activities.length > 0 ? tripData.activities[i % tripData.activities.length] : 'Local Sightseeing';
                desc = `Full day exploring ${currentDest}. Enjoy ${act} as part of your custom package.`;
            }

            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-day">Day ${i}</div>
                <div class="timeline-desc">${desc}</div>
            `;
            timeline.appendChild(item);
        }
    }

    // -----------------------------------------
    // Price Calculation
    // -----------------------------------------
    function generateSummary() {
        // Base Price per adult
        let basePerAdult = 12000; 
        if(tripData.package_type === 'Budget') basePerAdult = 8000;
        if(tripData.package_type === 'Luxury') basePerAdult = 25000;

        let durationMultiplier = parseInt(tripData.duration.charAt(0)) || 4; // e.g. 4N -> 4
        
        const baseTotal = (basePerAdult * durationMultiplier * tripData.adults) + (basePerAdult * durationMultiplier * tripData.children * 0.5);
        
        // Hotel Upgrades
        let hotelMarkup = 0;
        if(tripData.hotel_category === '4 Star') hotelMarkup = 5000 * durationMultiplier;
        if(tripData.hotel_category === '5 Star') hotelMarkup = 12000 * durationMultiplier;
        if(tripData.hotel_category === 'Resort') hotelMarkup = 15000 * durationMultiplier;

        const subtotal = baseTotal + hotelMarkup;
        const tax = subtotal * 0.05; // 5% GST
        const finalPrice = Math.round(subtotal + tax);

        tripData.estimated_price = finalPrice;

        // UI Update
        document.getElementById('sumPax').textContent = `${tripData.adults} Adults, ${tripData.children} Children`;
        document.getElementById('sumBasePrice').textContent = `₹${baseTotal.toLocaleString()}`;
        document.getElementById('sumHotel').textContent = tripData.hotel_category;
        document.getElementById('sumHotelPrice').textContent = `₹${hotelMarkup.toLocaleString()}`;
        document.getElementById('sumTax').textContent = `₹${Math.round(tax).toLocaleString()}`;
        document.getElementById('sumTotal').textContent = `₹${finalPrice.toLocaleString()}`;
    }

    // -----------------------------------------
    // Submit
    // -----------------------------------------
    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing...';

        try {
            const res = await fetch('http://localhost:5000/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(tripData)
            });

            if(res.ok) {
                alert('Success! Your incredible Kerala trip request has been submitted. Our team will contact you shortly.');
                window.location.href = 'index.html';
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to submit plan');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Booking Request';
            }
        } catch(error) {
            console.error(error);
            alert("Network error occurred.");
            submitBtn.disabled = false;
        }
    });
});
