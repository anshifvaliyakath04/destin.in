document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Token Check (Optional)
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    // Auto-prefill user info if logged in
    if (userStr) {
        try {
            const loggedInUser = JSON.parse(userStr);
            if (loggedInUser) {
                if (loggedInUser.name) {
                    const nameInput = document.getElementById('p_name');
                    if (nameInput) nameInput.value = loggedInUser.name;
                }
                if (loggedInUser.email) {
                    const emailInput = document.getElementById('p_email');
                    if (emailInput) emailInput.value = loggedInUser.email;
                }
            }
        } catch (e) {
            console.error("Error parsing logged-in user info for pre-fill:", e);
        }
    }

    // Wizard State
    let currentStep = 1;
    const totalSteps = 6;
    
    // UI Elements
    const steps = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressFill = document.getElementById('progressFill');
    const stepNumDisplay = document.getElementById('currentStepNum');

    // Data Store
    const tripData = {
        customer_name: '',
        customer_phone: '',
        customer_whatsapp: '',
        customer_email: '',
        customer_address: '',
        pickup_location: '',
        destinations: [],
        start_date: '',
        duration: '',
        adults: 2,
        children: 0,
        travel_type: 'Couple',
        food_pref: 'Any',
        special_requests: '',
        // Payload compatibility for backend models
        budget_range: 'Not specified',
        package_type: 'Not specified',
        hotel_category: 'Not specified',
        transport: 'Not specified',
        activities: [],
        estimated_price: 0
    };

    // Pre-select destination if passed via URL (e.g. planner.html?dest=Munnar)
    const urlParams = new URLSearchParams(window.location.search);
    const preselectDest = urlParams.get('dest');
    if (preselectDest) {
        // Find by lower casing dataset value match
        const cards = document.querySelectorAll('.dest-selector .select-card');
        cards.forEach(card => {
            if(card.dataset.val.toLowerCase() === preselectDest.toLowerCase()) {
                card.classList.add('selected');
            }
        });
    }

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
            } 
            // Multi Select Mode
            else {
                this.classList.toggle('selected');
            }
        });
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
            generateSummary(); // Final data aggregation
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
            nextBtn.innerHTML = `Continue to Step ${currentStep + 1} <i class="fa-solid fa-arrow-right"></i>`;
            

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
            let dur = document.getElementById('p_duration').value;
            if (dur === 'Custom') {
                const n = document.getElementById('p_custom_nights').value;
                const d = document.getElementById('p_custom_days').value;
                if (!n || !d) {
                    alert("Please specify the number of custom nights and days.");
                    return false;
                }
                dur = `${n} Nights / ${d} Days`;
            }
            tripData.duration = dur;
            if (!tripData.start_date || !tripData.duration) {
                alert("Please fill all date fields.");
                return false;
            }
        }
        else if (currentStep === 3) {
            tripData.adults = parseInt(document.getElementById('p_adults').value);
            tripData.children = parseInt(document.getElementById('p_children').value);
        }
        else if (currentStep === 4) {
            tripData.food_pref = document.getElementById('p_food').value;
            tripData.special_requests = document.getElementById('p_requests').value;
        }
        else if (currentStep === 5) {
            const name = document.getElementById('p_name').value.trim();
            const phone = document.getElementById('p_phone').value.trim();
            const whatsapp = document.getElementById('p_whatsapp').value.trim();
            const email = document.getElementById('p_email').value.trim();
            const pickup = document.getElementById('p_pickup').value.trim();
            
            if (!name || !phone || !whatsapp || !email || !pickup) {
                alert("Please fill in all contact and pickup details before proceeding.");
                return false;
            }
            
            tripData.customer_name = name;
            tripData.customer_phone = phone;
            tripData.customer_whatsapp = whatsapp;
            tripData.customer_email = email;
            tripData.customer_address = '';
            tripData.pickup_location = pickup;
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
    // Generate Summary
    // -----------------------------------------
    function generateSummary() {
        // UI Update
        document.getElementById('sumName').textContent = tripData.customer_name;
        document.getElementById('sumDest').textContent = tripData.destinations.join(', ');
        document.getElementById('sumDuration').textContent = tripData.duration;
        document.getElementById('sumPax').textContent = `${tripData.adults} Adults, ${tripData.children} Children (${tripData.travel_type})`;
        document.getElementById('sumFood').textContent = tripData.food_pref;
        document.getElementById('sumEmail').textContent = tripData.customer_email;
        document.getElementById('sumPhone').textContent = `${tripData.customer_phone} / ${tripData.customer_whatsapp}`;
        document.getElementById('sumPickup').textContent = tripData.pickup_location;
    }

    // -----------------------------------------
    // Submit
    // -----------------------------------------
    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Processing...';

        try {
            const API_URL = window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';
            const res = await fetch(`${API_URL}/trips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(tripData)
            });

            if(res.ok) {
                alert('Success! Your incredible Kerala trip request has been submitted. Our team will contact you shortly with a quotation.');
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
            submitBtn.innerHTML = 'Submit Booking Request';
        }
    });
});
