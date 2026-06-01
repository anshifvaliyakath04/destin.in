document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------
    // UI Interactions (Navbar, Slider, Destination Dynamic load)
    // -------------------------------------------------------------------

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Hero Slider
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        function nextSlide() {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }
        setInterval(nextSlide, 5000);
    }

    // Destination Card Click
    const destCards = document.querySelectorAll('.dest-card');
    destCards.forEach(card => {
        card.addEventListener('click', () => {
            const destId = card.getAttribute('data-id');
            if(destId) {
                window.location.href = `destination.html?id=${destId}`;
            }
        });
    });

    // Initialize 3D Tilt Effect
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".dest-card"), {
            max: 15,
            speed: 400,
            glare: true,
            "max-glare": 0.3,
            scale: 1.05
        });
        
        VanillaTilt.init(document.querySelectorAll(".pkg-card"), {
            max: 10,
            speed: 400,
            glare: true,
            "max-glare": 0.2,
            scale: 1.02
        });
        
        VanillaTilt.init(document.querySelectorAll(".service-card"), {
            max: 15,
            speed: 400,
            glare: true,
            "max-glare": 0.1
        });
    }

    // Destination Page Data Loading
    if (window.location.pathname.includes('destination.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const destId = urlParams.get('id');
        if (destId) {
            loadDestinationData(destId);
        }
    }

    // -------------------------------------------------------------------
    // Authentication & API Logic (Node.js/Sybase Backend Integration)
    // -------------------------------------------------------------------
    const API_URL = window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';

    // Handle Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-message');
            const loginBtn = document.getElementById('loginBtn');

            loginBtn.textContent = 'Logging in...';
            errorMsg.style.display = 'none';

            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.accessToken);
                    localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role }));
                    
                    if(data.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    errorMsg.textContent = data.error || 'Login failed.';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                errorMsg.textContent = 'Server connection failed. Is the Node.js server running?';
                errorMsg.style.display = 'block';
            } finally {
                loginBtn.textContent = 'Log In';
            }
        });
    }

    // Handle Signup
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorMsg = document.getElementById('error-message');
            const successMsg = document.getElementById('success-message');
            const signupBtn = document.getElementById('signupBtn');

            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';

            if (password !== confirmPassword) {
                errorMsg.textContent = "Passwords don't match!";
                errorMsg.style.display = 'block';
                return;
            }

            signupBtn.textContent = 'Signing up...';

            try {
                const res = await fetch(`${API_URL}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    successMsg.textContent = 'Registration successful! You can now log in.';
                    successMsg.style.display = 'block';
                    signupForm.reset();
                } else {
                    errorMsg.textContent = data.error || 'Signup failed.';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                errorMsg.textContent = 'Server connection failed. Is the Node.js server running?';
                errorMsg.style.display = 'block';
            } finally {
                signupBtn.textContent = 'Sign Up';
            }
        });
    }

    // Trip Planner Logic moved to planner.js


    // Auth Check for Navigation
    updateNavForAuth();

    // Fetch Public Settings (WhatsApp Number)
    fetchSettings();
});

async function fetchSettings() {
    try {
        const BASE_URL = window.location.port === '5000' ? '' : 'http://localhost:5000';
        const res = await fetch(`${BASE_URL}/api/settings`);
        if (res.ok) {
            const data = await res.json();
            if (data.whatsapp_number) {
                const floatingWA = document.getElementById('whatsapp-floating');
                const footerWA = document.getElementById('whatsapp-footer-link');
                const footerText = document.getElementById('whatsapp-footer-text');
                
                const waLink = `https://wa.me/${data.whatsapp_number}`;
                
                if (floatingWA) floatingWA.href = waLink;
                if (footerWA) footerWA.href = waLink;
                if (footerText) footerText.textContent = `+${data.whatsapp_number}`;
            }
        }
    } catch (err) {
        console.error('Failed to fetch settings:', err);
    }
}

function updateNavForAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const authLink = document.getElementById('auth-link');
    
    if (authLink) {
        if (token && user && user.role === 'admin') {
            authLink.style.display = 'inline-block';
            authLink.innerHTML = `<a href="admin.html" class="btn btn-outline" style="padding: 0.5rem 1.5rem; margin-left: 1rem; color:white;">Admin Panel</a> <a href="#" onclick="logout()" style="margin-left:1rem; color:white;">Logout</a>`;
        } else {
            // Hide the login link entirely for regular users
            authLink.style.display = 'none';
        }
    }
}

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Destination Data (Mock Database for the frontend)
const destinationData = {
    munnar: {
        title: "Munnar",
        subtitle: "Where misty hills meet endless tea gardens",
        image: "assets/munnar.png",
        description: "From rolling green plantations and cool mountain air to breathtaking viewpoints and waterfalls, Munnar is a perfect escape into nature. Explore Eravikulam National Park and spot the Nilgiri Tahr, enjoy peaceful moments at Mattupetty Dam & Kundala Lake, witness the magical sunrise at Top Station, and experience Kolukkumalai - the world's highest tea estate.",
        bestTime: "September to March",
        activities: ["Tea Estate Tours", "Trekking", "Wildlife Spotting", "Camping"],
        places: [
            { name: "Tea Gardens", img: "assets/tea_gardens.png" },
            { name: "Eravikulam National Park", img: "assets/eravikulam.png" },
            { name: "Echo Point", img: "assets/echo_point.png" },
            { name: "Top Station", img: "assets/top_station.png" },
            { name: "Mattupetty Dam", img: "assets/mattupetty_dam.png" },
            { name: "Kundala Lake", img: "assets/kundala_lake.png" },
            { name: "Attukad Waterfalls", img: "assets/attukad_waterfalls.png" },
            { name: "Kolukkumalai", img: "assets/kolukkumalai.png" },
            { name: "Anayirankal Dam", img: "assets/vagamon_anayirankal_dam.png" },
            { name: "Marayoor", img: "assets/vagamon_marayoor.png" },
            { name: "Devikulam", img: "assets/vagamon_devikulam.png" }
        ]
    },
    wayanad: {
        title: "Wayanad",
        subtitle: "Where forests whisper and mountains touch the clouds",
        image: "assets/wayanad.png",
        description: "Wayanad is a serene hill destination known for its lush forests, misty mountains, waterfalls, and rich history. Perfect for nature lovers and adventure seekers, it offers a refreshing escape into the heart of Kerala.",
        bestTime: "October to May",
        activities: ["Cave Exploration", "Mountain Trekking", "Wildlife Safaris", "Camping"],
        places: [
            { name: "Kuruva Island", img: "assets/kuruva_island.png" },
            { name: "Lakkidi View Point", img: "assets/lakkidi_viewpoint.png" },
            { name: "Tholpetty Wildlife Sanctuary", img: "assets/tholpetty_wildlife.png" },
            { name: "Edakkal Caves", img: "assets/edakkal_caves.png" },
            { name: "Pookode Lake", img: "assets/pookode_lake.png" },
            { name: "Chembra Peak", img: "assets/chembra_peak.png" },
            { name: "Soochipara Waterfalls", img: "assets/soochipara_waterfalls.png" },
            { name: "Banasura Sagar Dam", img: "assets/banasura_dam.png" }
        ]
    },
    vattavada: {
        title: "Vattavada",
        subtitle: "Experience the Beauty of Endless Valleys and Fresh Harvests",
        image: "assets/vattavada.png",
        description: "Vattavada is a beautiful hill village located near Munnar in the Western Ghats. Surrounded by lush green mountains, mist-covered valleys, and fertile farmlands, it is one of Kerala's most peaceful and scenic destinations. Often referred to as the \"Kashmir of Kerala\", Vattavada offers a refreshing climate, breathtaking landscapes, and a unique rural charm away from crowded tourist spots.",
        bestTime: "September to April",
        activities: ["Farm Tours", "Trekking", "Nature Trails", "National Park Safaris", "Camping"],
        places: [
            { name: "Organic Vegetable & Strawberry Farms", img: "assets/vattavada_farms.png" },
            { name: "Silent Valley Trails", img: "assets/vattavada_silent_valley.png" },
            { name: "Pampadum Shola National Park", img: "assets/vattavada_pampadum.png" },
            { name: "Kurinjimala Sanctuary", img: "assets/vattavada_kurinjimala.png" },
            { name: "Vattavada Viewpoint", img: "assets/vattavada_viewpoint.png" }
        ]
    },
    vagamon: {
        title: "Vagamon",
        subtitle: "A peaceful escape into rolling meadows and misty valleys",
        image: "assets/vagamon.png",
        description: "Vagamon is a peaceful hill station located in the Idukki district of Kerala. Surrounded by rolling green meadows, tea plantations, pine forests, and mist-covered hills, it is one of Kerala's most beautiful offbeat destinations. With its cool climate and serene atmosphere, Vagamon is perfect for nature lovers, couples, families, and adventure seekers.",
        bestTime: "September to May",
        activities: ["Pine Forest Trekking", "Hill Climbing", "Meadow Walks", "Paragliding", "Offroad Jeep Safari"],
        places: [
            { name: "Pine Forest", img: "assets/vagamon_pine_forest.png" },
            { name: "Thangalpara", img: "assets/vagamon_thangalpara.png" },
            { name: "Kurisumala", img: "assets/vagamon_kurisumala.png" }
        ]
    },
    alleppey: {
        title: "Alleppey",
        subtitle: "Sail through the enchanting backwaters of Kerala",
        image: "assets/alleppey.png",
        description: "Alappuzha is a popular tourist destination, especially famed for its houseboat cruises that offer an immersive experience of Kerala's enchanting backwaters. This coastal city provides a perfect blend of natural beauty, cultural heritage, and serene water-based activities.",
        bestTime: "October to February",
        activities: ["Houseboat Cruise", "Village Walks", "Sunrise & Sunset Viewing", "Canoeing"],
        places: [
            { name: "Kuttanad", img: "assets/kuttanad.png" },
            { name: "Vembanad Lake Houseboat Cruise", img: "assets/vembanad_houseboat.png" },
            { name: "Alappuzha Beach", img: "assets/alappuzha_beach.png" },
            { name: "Marari Beach", img: "assets/marari_beach.png" },
            { name: "Pathiramanal Island", img: "assets/pathiramanal.png" }
        ]
    },
    ponmudi: {
        title: "Ponmudi",
        subtitle: "The Golden Peak of Kerala",
        image: "assets/ponmudi.png",
        description: "Escape to the misty hills of Ponmudi, one of the most scenic hill stations in Kerala. Surrounded by lush greenery, winding roads, waterfalls, and breathtaking viewpoints, Ponmudi is perfect for a peaceful nature getaway.",
        bestTime: "October to March",
        activities: ["Trekking", "Nature Walks", "Cool Mountain Escapes"],
        places: [
            { name: "Peppara Wildlife Sanctuary", img: "assets/ponmudi_peppara.png" },
            { name: "Tea Estates", img: "assets/ponmudi_tea_estates.jpg" },
            { name: "Meenmutty Waterfalls", img: "assets/ponmudi_meenmutty.png" },
            { name: "Golden Valley", img: "assets/ponmudi_golden_valley.jpg" },
            { name: "Agasthyakoodam Trek Route", img: "assets/ponmudi_agasthyakoodam.png" }
        ]
    },
    peermade: {
        title: "Peermade",
        subtitle: "Vast tea and spice plantations",
        image: "assets/peermade.png",
        description: "Peermade is also famous for eco-tourism. The breathtaking sights of the coffee, tea, pepper and cardamom plantations, waterfalls etc is something unique, which you can only experience here at this hill station.",
        bestTime: "September to April",
        activities: ["Trekking", "Cycling", "Horse Riding"],
        places: [
            { name: "Pattumala Church", img: "assets/pattumala_church.png" },
            { name: "Coffee & Tea Plantations", img: "assets/peermade_plantations.png" },
            { name: "Scenic Waterfalls", img: "assets/peermade_waterfalls.png" }
        ]
    }
};

function loadDestinationData(id) {
    const data = destinationData[id];
    if (!data) return;

    document.getElementById('dest-title').textContent = data.title;
    document.getElementById('dest-subtitle').textContent = data.subtitle;
    document.getElementById('dest-header-bg').style.backgroundImage = `url('${data.image}')`;
    document.getElementById('dest-desc').textContent = data.description;
    document.getElementById('dest-time').textContent = data.bestTime;
    
    const activitiesList = document.getElementById('dest-activities');
    activitiesList.innerHTML = '';
    data.activities.forEach(act => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fa-solid fa-check text-gold"></i> ${act}`;
        li.style.marginBottom = '10px';
        activitiesList.appendChild(li);
    });

    const placesGrid = document.getElementById('must-visit-grid');
    placesGrid.innerHTML = '';
    data.places.forEach(place => {
        placesGrid.innerHTML += `
            <div class="place-card">
                <img src="${place.img}" alt="${place.name}" class="place-img">
                <div class="place-info">
                    <h4>${place.name}</h4>
                </div>
            </div>
        `;
    });
}

// -------------------------------------------------------------------
// Dynamic Testimonials
// -------------------------------------------------------------------

function openReviewModal() {
    document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('reviewModal');
    if (e.target === modal) {
        closeReviewModal();
    }
});

async function fetchTestimonials() {
    const slider = document.querySelector('.testimonials-slider');
    if (!slider) return;

    try {
        const API_URL = window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';
        const BASE_URL = window.location.port === '5000' ? '' : 'http://localhost:5000';
        const res = await fetch(`${API_URL}/testimonials`);
        const testimonials = await res.json();

        if (testimonials && testimonials.length > 0) {
            slider.innerHTML = ''; // clear static ones
            
            // Get recent review from localStorage
            let recentReview = null;
            try {
                recentReview = JSON.parse(localStorage.getItem('recentReview'));
            } catch(e) {}

            testimonials.forEach(t => {
                const avatarStyle = `background-image: url('https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random');`;
                
                let starsHtml = '';
                for(let i=1; i<=5; i++) {
                    if (i <= t.rating) {
                        starsHtml += '<i class="fa-solid fa-star"></i>';
                    } else {
                        starsHtml += '<i class="fa-regular fa-star"></i>';
                    }
                }

                let attachedImageHtml = '';
                if (t.images && t.images.length > 0) {
                    let imagesContent = t.images.map(img => `<img src="${BASE_URL}${img}" alt="Traveler Photo" class="review-attached-image">`).join('');
                    attachedImageHtml = `
                        <div class="gallery-wrapper">
                            ${t.images.length > 1 ? `<button class="gallery-scroll-btn gallery-scroll-left" onclick="scrollGallery(this, -160)"><i class="fa-solid fa-chevron-left"></i></button>` : ''}
                            <div class="review-images-gallery">${imagesContent}</div>
                            ${t.images.length > 1 ? `<button class="gallery-scroll-btn gallery-scroll-right" onclick="scrollGallery(this, 160)"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
                        </div>
                    `;
                } else if (t.image_url) {
                    attachedImageHtml = `<div class="gallery-wrapper"><div class="review-images-gallery"><img src="${BASE_URL}${t.image_url}" alt="Traveler Photo" class="review-attached-image"></div></div>`;
                }

                // Format the review date
                let formattedDate = '';
                if (t.createdAt) {
                    const dateObj = new Date(t.createdAt);
                    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                }

                // Check if user owns this review and within 60s
                let editBtnHtml = '';
                if (recentReview && recentReview.id === t._id) {
                    const ageInSeconds = (Date.now() - recentReview.timestamp) / 1000;
                    if (ageInSeconds < 60) {
                        // Pass JSON string properly escaped
                        const tJson = JSON.stringify(t).replace(/"/g, '&quot;');
                        editBtnHtml = `<button class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; margin-top: 0.5rem;" onclick="editReview(event, '${tJson}')"><i class="fa-solid fa-pen"></i> Edit (1m)</button>`;
                        
                        // Automatically re-fetch after the window expires to hide the button
                        setTimeout(() => { fetchTestimonials(); }, (60 - ageInSeconds) * 1000);
                    } else {
                        localStorage.removeItem('recentReview');
                    }
                }

                slider.innerHTML += `
                    <div class="testimonial-card">
                        <i class="fa-solid fa-quote-left quote-icon"></i>
                        <p class="testimonial-text">${t.review_text}</p>
                        ${attachedImageHtml}
                        <div class="testimonial-footer">
                            <div class="testimonial-user">
                                <div class="user-avatar" style="${avatarStyle}"></div>
                                <div class="user-info">
                                    <h4>${t.name}</h4>
                                    <span style="display:flex; flex-direction:column; gap:2px;">
                                        <span>${t.trip_type}</span>
                                        ${formattedDate ? `<span style="font-size: 0.8rem; color: #888;">${formattedDate}</span>` : ''}
                                    </span>
                                </div>
                            </div>
                            <div class="testimonial-rating" style="display:flex; flex-direction:column; align-items:flex-end;">
                                <div class="stars">
                                    ${starsHtml}
                                </div>
                                <span class="rating-text">${t.rating}.0 Ratings</span>
                                ${editBtnHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error('Failed to load testimonials:', err);
    }
}

// Global variable to hold editing review ID
let editingReviewId = null;

function scrollGallery(btn, amount) {
    const gallery = btn.parentElement.querySelector('.review-images-gallery');
    if (gallery) {
        gallery.scrollBy({ left: amount, behavior: 'smooth' });
    }
}

function editReview(e, testimonialJson) {
    e.preventDefault();
    const t = JSON.parse(testimonialJson);
    editingReviewId = t._id;
    
    document.getElementById('reviewName').value = t.name;
    document.getElementById('reviewTripType').value = t.trip_type;
    document.getElementById('reviewText').value = t.review_text;
    const starInput = document.getElementById('star' + t.rating);
    if (starInput) starInput.checked = true;
    
    // Clear file input
    const fileInput = document.getElementById('reviewImages');
    if (fileInput) fileInput.value = '';
    
    document.getElementById('submitReviewBtn').textContent = 'Update Review';
    openReviewModal();
}


document.addEventListener('DOMContentLoaded', () => {
    fetchTestimonials();

    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitReviewBtn');
            const errorMsg = document.getElementById('reviewError');
            errorMsg.style.display = 'none';

            const name = document.getElementById('reviewName').value;
            const tripType = document.getElementById('reviewTripType').value;
            const text = document.getElementById('reviewText').value;
            const ratingRadio = document.querySelector('input[name="rating"]:checked');
            const rating = ratingRadio ? ratingRadio.value : 5;
            const imageFiles = document.getElementById('reviewImages').files;

            if (imageFiles.length > 5) {
                errorMsg.textContent = 'You can upload a maximum of 5 photos.';
                errorMsg.style.display = 'block';
                return;
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('trip_type', tripType);
            formData.append('rating', rating);
            formData.append('review_text', text);
            for (let i = 0; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i]);
            }

            submitBtn.textContent = editingReviewId ? 'Updating...' : 'Submitting...';
            submitBtn.disabled = true;

            try {
                const API_URL = window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';
                const endpoint = editingReviewId ? `${API_URL}/testimonials/${editingReviewId}` : `${API_URL}/testimonials`;
                const method = editingReviewId ? 'PUT' : 'POST';

                const res = await fetch(endpoint, {
                    method: method,
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // Save to localstorage for edit window
                    if (!editingReviewId) {
                        localStorage.setItem('recentReview', JSON.stringify({
                            id: data.testimonial._id,
                            timestamp: Date.now()
                        }));
                    }

                    reviewForm.reset();
                    editingReviewId = null;
                    submitBtn.textContent = 'Submit Review';
                    closeReviewModal();
                    fetchTestimonials(); // reload testimonials
                } else {
                    const data = await res.json();
                    errorMsg.textContent = data.error || 'Failed to submit review.';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                errorMsg.textContent = 'Server error. Try again later.';
                errorMsg.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                if (!editingReviewId) submitBtn.textContent = 'Submit Review';
            }
        });
    }
});
