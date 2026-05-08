document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Authentication Check
    if (!token || !user || user.role !== 'admin') {
        alert('Access Denied. You must be an admin to view this page.');
        window.location.href = 'login.html';
        return;
    }

    const API_URL = 'http://localhost:5000/api';
    let allTrips = [];

    // Fetch and Render Users
    async function fetchUsers() {
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const users = await res.json();
            
            const tbody = document.querySelector('#usersTable tbody');
            tbody.innerHTML = '';
            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span style="background:${u.role==='admin'?'var(--accent-gold)':'#eee'}; padding:2px 8px; border-radius:10px; font-size:0.8rem;">${u.role}</span></td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
        }
    }

    // Fetch and Render Trips
    async function fetchTrips() {
        try {
            const res = await fetch(`${API_URL}/admin/trips`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch trips');
            allTrips = await res.json();
            renderTrips(allTrips);
        } catch (error) {
            console.error(error);
        }
    }

    // Render Trips to Table
    function renderTrips(trips) {
        const tbody = document.querySelector('#tripsTable tbody');
        tbody.innerHTML = '';
        trips.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.id.substring(0,6)}...</td>
                <td>${t.user_name}</td>
                <td>${t.user_email}</td>
                <td style="font-weight:600; color:var(--primary-green); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.destinations}</td>
                <td>${t.duration}</td>
                <td>${t.travel_type}</td>
                <td>${t.package_type || 'Standard'}</td>
                <td style="font-weight:bold;">₹${t.estimated_price ? t.estimated_price.toLocaleString() : 'TBD'}</td>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Filters
    document.getElementById('filterDestination').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const type = document.getElementById('filterType').value;
        filterData(query, type);
    });

    document.getElementById('filterType').addEventListener('change', (e) => {
        const type = e.target.value;
        const query = document.getElementById('filterDestination').value.toLowerCase();
        filterData(query, type);
    });

    function filterData(destQuery, typeQuery) {
        const filtered = allTrips.filter(t => {
            const dests = t.destinations ? t.destinations.toLowerCase() : '';
            const matchDest = dests.includes(destQuery);
            const matchType = typeQuery === '' || t.travel_type === typeQuery;
            return matchDest && matchType;
        });
        renderTrips(filtered);
    }

    // Initial Fetch
    fetchUsers();
    fetchTrips();
});
