document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Authentication Check
    if (!token || !user || user.role !== 'admin') {
        alert('Access Denied. You must be an admin to view this page.');
        window.location.href = 'login.html';
        return;
    }

    const API_URL = window.location.port === '5000' ? '/api' : 'http://localhost:5000/api';
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
                
                let actionContent = '';
                if (user && u.id === user.id) {
                    actionContent = `<span style="color: #777; font-size: 0.85rem; font-style: italic; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-user-check"></i> You</span>`;
                } else if (u.role === 'admin') {
                    actionContent = `<span style="color: #777; font-size: 0.85rem; font-style: italic; display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-shield-halved"></i> System Admin</span>`;
                } else {
                    actionContent = `<button class="action-btn btn-reject" style="padding: 0.3rem 0.6rem; border-radius: 4px;" onclick="deleteUser('${u.id}', '${u.email}')"><i class="fa-solid fa-user-minus"></i> Remove</button>`;
                }

                let contactInfo = `${u.name}`;
                if (u.phone) {
                    contactInfo += `<br><small style="color:#555; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;"><i class="fa-solid fa-phone" style="font-size:0.75rem;"></i> ${u.phone}</small>`;
                }
                if (u.whatsapp) {
                    contactInfo += `<br><small style="color:#2ecc71; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;"><i class="fa-brands fa-whatsapp" style="font-size:0.85rem; font-weight:bold;"></i> ${u.whatsapp}</small>`;
                }
                if (u.address) {
                    contactInfo += `<br><small style="color:#777; display: inline-flex; align-items: flex-start; gap: 4px; margin-top: 2px; line-height: 1.2; max-width: 250px; white-space: normal;"><i class="fa-solid fa-location-dot" style="font-size:0.75rem; margin-top:2px;"></i> ${u.address}</small>`;
                }

                tr.innerHTML = `
                    <td>${u.id.substring(0, 8)}...</td>
                    <td>${contactInfo}</td>
                    <td>${u.email}</td>
                    <td><span style="background:${u.role==='admin'?'var(--accent-gold)':'#eee'}; padding:2px 8px; border-radius:10px; font-size:0.8rem;">${u.role}</span></td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    <td>${actionContent}</td>
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

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            const stats = await res.json();
            
            document.getElementById('statTotalBookings').textContent = stats.totalBookings;
            document.getElementById('statPendingApprovals').textContent = stats.pendingApprovals;
            document.getElementById('statUpcomingTrips').textContent = stats.upcomingTrips;
        } catch (error) {
            console.error(error);
        }
    }

    // Render Trips to Separate Tables grouped by Travel Type
    function renderTrips(trips) {
        const container = document.getElementById('tripsContainer');
        if (!container) return; // safeguard if called before HTML loads
        container.innerHTML = '';
        
        // Group trips
        const groups = {
            'Couple / Honeymoon Trips': [],
            'Family Trips': [],
            'Solo Trips': [],
            'Group & Other Trips': []
        };
        
        trips.forEach(t => {
            const type = (t.travel_type || '').toLowerCase();
            if (type.includes('couple') || type.includes('honeymoon')) groups['Couple / Honeymoon Trips'].push(t);
            else if (type.includes('family')) groups['Family Trips'].push(t);
            else if (type.includes('solo')) groups['Solo Trips'].push(t);
            else groups['Group & Other Trips'].push(t);
        });

        let hasAnyTrips = false;

        for (const [groupName, groupTrips] of Object.entries(groups)) {
            if (groupTrips.length === 0) continue;
            hasAnyTrips = true;
            
            const groupHeader = document.createElement('h4');
            groupHeader.style.margin = '1.5rem 0 0.5rem 0';
            groupHeader.style.color = 'var(--primary-color)';
            groupHeader.style.borderBottom = '2px solid var(--accent-color)';
            groupHeader.style.paddingBottom = '0.5rem';
            groupHeader.textContent = `${groupName} (${groupTrips.length})`;
            
            const tableWrapper = document.createElement('div');
            tableWrapper.style.overflowX = 'auto';
            
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Place</th>
                        <th>People</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            
            groupTrips.forEach(t => {
                let peopleText = '';
                if (t.adults) peopleText += `${t.adults} Adults`;
                if (t.children) peopleText += (peopleText ? ', ' : '') + `${t.children} Children`;
                if (!peopleText) peopleText = 'N/A';

                const destFormatted = t.destinations ? t.destinations.split(', ').join('<br>') : '';
                
                const tr = document.createElement('tr');
                
                let contactInfo = `${t.user_name} <br> <small style="color:#777">${t.user_email}</small>`;
                if (t.user_phone) {
                    contactInfo += `<br><small style="color:#555; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;"><i class="fa-solid fa-phone" style="font-size:0.75rem;"></i> ${t.user_phone}</small>`;
                }
                if (t.user_whatsapp) {
                    contactInfo += `<br><small style="color:#2ecc71; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;"><i class="fa-brands fa-whatsapp" style="font-size:0.85rem; font-weight:bold;"></i> ${t.user_whatsapp}</small>`;
                }
                if (t.pickup_location) {
                    contactInfo += `<br><small style="color:#e67e22; display: inline-flex; align-items: flex-start; gap: 4px; margin-top: 3px; line-height:1.3; max-width:220px; white-space:normal;"><i class="fa-solid fa-location-dot" style="font-size:0.75rem; margin-top:2px;"></i> <span>${t.pickup_location}</span></small>`;
                }

                tr.innerHTML = `
                    <td>${t.id.substring(0,6)}...</td>
                    <td>${contactInfo}</td>
                    <td style="font-weight:600; color:var(--primary-green); max-width:150px;">${destFormatted}</td>
                    <td>${peopleText}</td>
                    <td>${new Date(t.created_at).toLocaleDateString()}</td>
                    <td><span style="background:${t.status==='Approved'?'#2ecc71':(t.status==='Rejected'?'#e74c3c':'#f39c12')}; color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem;">${t.status || 'Pending'}</span></td>
                    <td>
                        <select onchange="updatePayment('${t.id}', this.value)" style="padding:2px; font-size:0.8rem;">
                            <option value="Pending" ${t.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Paid" ${t.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
                        </select>
                    </td>
                    <td>
                        ${t.status !== 'Approved' ? `<button class="action-btn btn-approve" onclick="updateStatus('${t.id}', 'Approved')" title="Accept"><i class="fa-solid fa-check"></i> Accept</button>` : ''}
                        ${t.status !== 'Rejected' ? `<button class="action-btn btn-reject" onclick="updateStatus('${t.id}', 'Rejected')" title="Reject"><i class="fa-solid fa-xmark"></i> Reject</button>` : ''}
                        <button class="action-btn" style="background:#27ae60;" onclick="exportRowExcel('${t.id}')" title="Export Excel"><i class="fa-solid fa-file-excel"></i> Excel</button>
                        <button class="action-btn btn-reject" style="background:#d35400; padding: 0.3rem 0.6rem; border-radius: 4px;" onclick="deleteTrip('${t.id}')" title="Delete Booking"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            tableWrapper.appendChild(table);
            container.appendChild(groupHeader);
            container.appendChild(tableWrapper);
        }
        
        if (!hasAnyTrips) {
            container.innerHTML = '<p style="text-align:center; padding: 2rem; color: #777;">No trips found matching the criteria.</p>';
        }
    }

    // Filters
    document.getElementById('filterDestination').addEventListener('input', applyFilters);
    document.getElementById('filterCustomer').addEventListener('input', applyFilters);
    document.getElementById('filterDateFrom').addEventListener('change', applyFilters);
    document.getElementById('filterDateTo').addEventListener('change', applyFilters);

    function applyFilters() {
        const destQuery = document.getElementById('filterDestination').value.toLowerCase();
        const custQuery = document.getElementById('filterCustomer').value.toLowerCase();
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;

        const filtered = allTrips.filter(t => {
            const dests = t.destinations ? t.destinations.toLowerCase() : '';
            const matchDest = dests.includes(destQuery);
            const matchCust = t.user_name ? t.user_name.toLowerCase().includes(custQuery) : false;

            // Date filter based on booking created_at date (local timezone adjusted)
            let tripDate = '';
            if (t.created_at) {
                const d = new Date(t.created_at);
                tripDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            }
            const matchFrom = dateFrom ? tripDate >= dateFrom : true;
            const matchTo = dateTo ? tripDate <= dateTo : true;

            return matchDest && matchCust && matchFrom && matchTo;
        });
        renderTrips(filtered);
    }

    window.clearDateFilter = () => {
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        applyFilters();
    };

    window.exportToExcel = () => {
        // Determine currently filtered trips
        const destQuery = document.getElementById('filterDestination').value.toLowerCase();
        const custQuery = document.getElementById('filterCustomer').value.toLowerCase();
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;

        const filtered = allTrips.filter(t => {
            const dests = t.destinations ? t.destinations.toLowerCase() : '';
            const matchDest = dests.includes(destQuery);
            const matchCust = t.user_name ? t.user_name.toLowerCase().includes(custQuery) : false;
            let tripDate = '';
            if (t.created_at) {
                const d = new Date(t.created_at);
                tripDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            }
            const matchFrom = dateFrom ? tripDate >= dateFrom : true;
            const matchTo = dateTo ? tripDate <= dateTo : true;
            return matchDest && matchCust && matchFrom && matchTo;
        });

        if (filtered.length === 0) {
            alert('No trips to export. Please adjust your filters.');
            return;
        }

        // Build row-wise data
        const rows = filtered.map(t => ({
            'Booking ID': t.id,
            'Customer Name': t.user_name || '',
            'Email': t.user_email || '',
            'Phone': t.user_phone || '',
            'WhatsApp': t.user_whatsapp || '',
            'Address': t.user_address || '',
            'Pickup Location': t.pickup_location || '',
            'Destinations': t.destinations || '',
            'Duration': t.duration || '',
            'Travel Type': t.travel_type || '',
            'Adults': t.adults || 0,
            'Children': t.children || 0,
            'Booking Status': t.status || 'Pending',
            'Payment Status': t.payment_status || 'Pending',
            'Booked On': t.created_at ? new Date(t.created_at).toLocaleDateString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);

        // Auto-size columns
        const colWidths = Object.keys(rows[0]).map(key => ({
            wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Planned Trips');

        const fromLabel = dateFrom || 'All';
        const toLabel = dateTo || 'All';
        XLSX.writeFile(wb, `Destin_Trips_${fromLabel}_to_${toLabel}.xlsx`);
    };

    // Global Functions for Actions
    let currentTripId = null;

    window.updateStatus = (id, action) => {
        currentTripId = id;
        const modal = document.getElementById('statusModal');
        const title = document.getElementById('modalTitle');
        const desc = document.getElementById('modalDesc');
        const reasonGroup = document.getElementById('rejectReasonGroup');
        const reasonInput = document.getElementById('rejectReason');
        const btnAccept = document.getElementById('modalBtnAccept');
        const btnReject = document.getElementById('modalBtnReject');

        reasonInput.value = '';

        if (action === 'Approved') {
            title.textContent = 'Accept Booking';
            desc.innerHTML = `Are you sure you want to <strong>Accept</strong> this booking?`;
            reasonGroup.style.display = 'none';
            btnAccept.style.display = 'inline-block';
            btnReject.style.display = 'none';
        } else if (action === 'Rejected') {
            title.textContent = 'Reject Booking';
            desc.innerHTML = `You are about to <strong>Reject</strong> this booking.<br>If you clicked this by mistake, you can choose to Accept it below or Cancel.`;
            reasonGroup.style.display = 'block';
            btnAccept.style.display = 'inline-block';
            btnReject.style.display = 'inline-block';
        }

        modal.style.display = 'flex';
    };

    window.closeStatusModal = () => {
        document.getElementById('statusModal').style.display = 'none';
        currentTripId = null;
    };

    window.submitStatus = async (status) => {
        if (!currentTripId) return;

        const reasonGroup = document.getElementById('rejectReasonGroup');
        const reasonInput = document.getElementById('rejectReason');
        let reason = '';

        if (status === 'Rejected') {
            reason = reasonInput.value.trim();
            if (!reason) {
                alert('A reason is required when rejecting a booking.');
                reasonInput.focus();
                return;
            }
        }

        try {
            const res = await fetch(`${API_URL}/admin/trips/${currentTripId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, reason })
            });
            if(res.ok) {
                closeStatusModal();
                
                // Server-side will now send confirmation email automatically in the background.
                alert('Status updated successfully! Confirmation email is being sent.');
                fetchTrips();
                fetchStats();
            } else {
                const data = await res.json();
                alert(data.error || 'Error updating status');
            }
        } catch (e) { 
            alert('Error updating status'); 
        }
    };


    window.updatePayment = async (id, payment_status) => {
        try {
            const res = await fetch(`${API_URL}/admin/trips/${id}/payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ payment_status })
            });
            if(res.ok) {
                fetchTrips();
                fetchStats();
            } else {
                alert('Error updating payment');
            }
        } catch (e) { alert('Error updating payment'); }
    };

    window.exportRowExcel = (id) => {
        const trip = allTrips.find(t => t.id === id);
        if (!trip) return;

        let peopleText = '';
        if (trip.adults) peopleText += `${trip.adults} Adults`;
        if (trip.children) peopleText += (peopleText ? ', ' : '') + `${trip.children} Children`;
        if (!peopleText) peopleText = 'N/A';

        // Two-column layout: Label | Value
        const rows = [
            ['Booking Detail',      'Information'],
            ['Booking ID',          trip.id],
            ['Customer Name',       trip.user_name || ''],
            ['Email',               trip.user_email || ''],
            ['Phone',               trip.user_phone || ''],
            ['WhatsApp',            trip.user_whatsapp || ''],
            ['Address',             trip.user_address || ''],
            ['Pickup Location',     trip.pickup_location || ''],
            ['Destinations',        trip.destinations || ''],
            ['Duration',            trip.duration || ''],
            ['Travel Type',         trip.travel_type || ''],
            ['Travelers',           peopleText],
            ['Booking Status',      trip.status || 'Pending'],
            ['Payment Status',      trip.payment_status || 'Pending'],
            ['Booked On',           trip.created_at ? new Date(trip.created_at).toLocaleDateString() : '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Style header row
        ws['A1'].s = { font: { bold: true }, fill: { fgColor: { rgb: '173D2F' } } };
        ws['B1'].s = { font: { bold: true } };

        // Auto-size columns
        ws['!cols'] = [
            { wch: 22 },  // Label column
            { wch: Math.max(...rows.map(r => String(r[1] || '').length)) + 4 }  // Value column
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Booking Details');
        XLSX.writeFile(wb, `Booking_${trip.user_name || trip.id}.xlsx`);
    };
    
    // User Management Modal Handlers & API Operations
    window.openAddUserModal = () => {
        document.getElementById('addUserForm').reset();
        document.getElementById('addUserModal').style.display = 'flex';
    };

    window.closeAddUserModal = () => {
        document.getElementById('addUserModal').style.display = 'none';
    };

    window.submitAddUser = async (event) => {
        event.preventDefault();
        
        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const phone = document.getElementById('newUserPhone') ? document.getElementById('newUserPhone').value.trim() : '';
        const whatsapp = document.getElementById('newUserWhatsapp') ? document.getElementById('newUserWhatsapp').value.trim() : '';
        const address = document.getElementById('newUserAddress') ? document.getElementById('newUserAddress').value.trim() : '';
        const password = document.getElementById('newUserPassword').value.trim();
        const role = document.getElementById('newUserRole').value;

        if (!name || !email || !password) {
            alert('Name, email, and password are required.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, password, phone, whatsapp, address, role })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || 'User created successfully!');
                closeAddUserModal();
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create user.');
            }
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Server error occurred while adding user.');
        }
    };

    window.deleteUser = async (id, email) => {
        if (!confirm(`Are you sure you want to completely remove the registered user "${email}"?\nThis action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || 'User deleted successfully!');
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user.');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Server error occurred while deleting user.');
        }
    };

    window.deleteTrip = async (id) => {
        if (!confirm('Are you sure you want to completely remove this planned trip booking?\nThis action cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/admin/trips/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || 'Trip deleted successfully!');
                fetchTrips();
                fetchStats();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete trip.');
            }
        } catch (error) {
            console.error('Error deleting trip:', error);
            alert('Server error occurred while deleting trip.');
        }
    };

    window.openAddTripModal = () => {
        document.getElementById('addTripForm').reset();
        document.getElementById('addTripModal').style.display = 'flex';
    };

    window.closeAddTripModal = () => {
        document.getElementById('addTripModal').style.display = 'none';
    };

    window.submitAddTrip = async (event) => {
        event.preventDefault();

        const customer_name = document.getElementById('newTripCustName').value.trim();
        const customer_phone = document.getElementById('newTripPhone').value.trim();
        const customer_whatsapp = document.getElementById('newTripWhatsapp').value.trim();
        const customer_email = document.getElementById('newTripEmail').value.trim();
        const customer_address = '';
        const pickup_location = document.getElementById('newTripPickup').value.trim();
        const destString = document.getElementById('newTripDestinations').value.trim();
        const start_date = document.getElementById('newTripStartDate').value;
        const duration = document.getElementById('newTripDuration').value;
        const adults = parseInt(document.getElementById('newTripAdults').value);
        const children = parseInt(document.getElementById('newTripChildren').value);
        const travel_type = document.getElementById('newTripTravelType').value;
        const food_pref = document.getElementById('newTripFoodPref').value;
        const special_requests = document.getElementById('newTripRequests').value.trim();
        const status = document.getElementById('newTripStatus').value;
        const payment_status = document.getElementById('newTripPayment').value;

        if (!customer_name || !customer_phone || !customer_email || !destString || !start_date) {
            alert('Name, Phone, Email, Destinations, and Start Date are required.');
            return;
        }

        const destinations = destString.split(',').map(d => d.trim()).filter(Boolean);

        try {
            const res = await fetch(`${API_URL}/admin/trips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customer_name, customer_phone, customer_whatsapp, customer_email, customer_address, pickup_location,
                    destinations, start_date, duration,
                    adults, children, travel_type, food_pref,
                    special_requests, status, payment_status
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || 'Trip booking created successfully!');
                closeAddTripModal();
                fetchTrips();
                fetchStats();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create trip booking.');
            }
        } catch (error) {
            console.error('Error creating trip booking:', error);
            alert('Server error occurred while creating trip.');
        }
    };


    // ----- Change Admin Credentials -----
    window.openChangeCredModal = () => {
        document.getElementById('changeCredForm').reset();
        document.getElementById('credErrorMsg').style.display = 'none';
        document.getElementById('credSuccessMsg').style.display = 'none';
        document.getElementById('changeCredModal').style.display = 'flex';
    };

    window.closeChangeCredModal = () => {
        document.getElementById('changeCredModal').style.display = 'none';
    };

    window.submitChangeCred = async (event) => {
        event.preventDefault();

        const currentPassword = document.getElementById('credCurrentPassword').value.trim();
        const newEmail        = document.getElementById('credNewEmail').value.trim();
        const newPassword     = document.getElementById('credNewPassword').value.trim();
        const confirmPassword = document.getElementById('credConfirmPassword').value.trim();
        const errorMsg        = document.getElementById('credErrorMsg');
        const successMsg      = document.getElementById('credSuccessMsg');
        const submitBtn       = document.getElementById('credSubmitBtn');

        errorMsg.style.display   = 'none';
        successMsg.style.display = 'none';

        // Must provide at least one thing to change
        if (!newEmail && !newPassword) {
            errorMsg.textContent = 'Please enter a new email or a new password to update.';
            errorMsg.style.display = 'block';
            return;
        }

        // Confirm password match
        if (newPassword && newPassword !== confirmPassword) {
            errorMsg.textContent = 'New password and confirm password do not match.';
            errorMsg.style.display = 'block';
            return;
        }

        submitBtn.disabled   = true;
        submitBtn.textContent = 'Saving...';

        try {
            const res = await fetch(`${API_URL}/admin/change-credentials`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newEmail: newEmail || undefined, newPassword: newPassword || undefined })
            });

            const data = await res.json();

            if (res.ok) {
                successMsg.textContent = '✅ Credentials updated successfully! Please log out and log in again with your new credentials.';
                successMsg.style.display = 'block';
                document.getElementById('changeCredForm').reset();
            } else {
                errorMsg.textContent = data.error || 'Failed to update credentials.';
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.textContent = 'Network error. Please try again.';
            errorMsg.style.display = 'block';
        } finally {
            submitBtn.disabled    = false;
            submitBtn.innerHTML   = '<i class="fa-solid fa-save"></i> Save Changes';
        }
    };

    // Initial Fetch
    fetchUsers();
    fetchTrips();
    fetchStats();
});
