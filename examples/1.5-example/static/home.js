// Fetch uptime from API and update display
fetch('/api/stats')
    .then(res => res.json())
    .then(data => {
        document.getElementById('uptime').textContent = data.uptime
    })
