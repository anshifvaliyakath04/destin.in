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
});

function updateNavForAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const authLink = document.getElementById('auth-link');
    
    if (authLink) {
        if (token && user) {
            authLink.innerHTML = `<a href="#" onclick="logout()" class="btn btn-outline" style="padding: 0.5rem 1.5rem; margin-left: 1rem;">Logout (${user.name})</a>`;
            if (user.role === 'admin') {
                authLink.innerHTML += `<a href="admin.html" style="margin-left:1rem; color:var(--bg-white);">Admin Panel</a>`;
            }
        } else {
            authLink.innerHTML = `<a href="login.html" class="btn btn-outline" style="padding: 0.5rem 1.5rem; margin-left: 1rem;">Login</a>`;
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
            { name: "Kolukkumalai", img: "assets/kolukkumalai.png" }
        ]
    },
    alleppey: {
        title: "Alleppey",
        subtitle: "Venice of the East",
        image: "assets/alleppey.png",
        description: "Famous for its serene backwaters, beautiful houseboats, and interconnected network of canals.",
        bestTime: "October to February",
        activities: ["Houseboat Cruise", "Village Walks", "Canoeing", "Ayurvedic Spa"],
        places: [
            { name: "Vembanad Lake", img: "https://images.unsplash.com/photo-1621215320573-0414f48b11a5?auto=format&fit=crop&w=600&q=80" },
            { name: "Marari Beach", img: "https://images.unsplash.com/photo-1598288825838-8422791cc352?auto=format&fit=crop&w=600&q=80" },
            { name: "Alleppey Beach", img: "assets/beach.png" }
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
