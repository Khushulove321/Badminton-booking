// History Calendar Functions

console.log('📅 History.js loaded');

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedHistoryItem = null;

// Color mapping for different event types
const EVENT_COLORS = {
  'played': '#48bb78',      // Green
  'penalty_received': '#f6e05e',  // Yellow
  'replacement': '#ed8936',  // Orange
  'penalty_paid': '#fc8181'  // Red
};

const EVENT_LABELS = {
  'played': 'Played',
  'penalty_received': 'Penalty Received',
  'replacement': 'Replaced Someone',
  'penalty_paid': 'Paid Penalty'
};

// Initialize history page
async function initHistoryPage() {
  console.log('📅 Initializing History page');
  await renderCalendar();
  await loadHistoryForMonth(currentYear, currentMonth);
}

// Render the calendar
async function renderCalendar() {
  const container = document.getElementById('historyCalendar');
  if (!container) return;
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = (today.getMonth() === currentMonth && today.getFullYear() === currentYear);
  const currentDay = today.getDate();
  
  // Get history data for this month
  const historyData = await getMonthlyHistory(currentYear, currentMonth);
  
  // Build calendar HTML
  let html = `
    <div class="calendar-header">
      <button id="prevMonth" class="btn btn-secondary btn-sm">◀</button>
      <h3>${monthNames[currentMonth]} ${currentYear}</h3>
      <button id="nextMonth" class="btn btn-secondary btn-sm">▶</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-weekdays">
  `;
  
  // Weekday headers
  for (let i = 0; i < dayNames.length; i++) {
    html += `<div class="calendar-weekday">${dayNames[i]}</div>`;
  }
  html += `</div><div class="calendar-days">`;
  
  // Empty days before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = historyData.filter(item => {
      const itemDate = new Date(item.event_date);
      return itemDate.getDate() === day;
    });
    
    const isToday = isCurrentMonth && day === currentDay;
    const hasEvents = dayEvents.length > 0;
    
    let eventColors = '';
    let eventLabels = '';
    if (hasEvents) {
      const uniqueColors = [...new Set(dayEvents.map(e => EVENT_COLORS[e.action_type]))];
      eventColors = uniqueColors.map(c => `<span class="event-dot" style="background-color:${c};"></span>`).join('');
      eventLabels = dayEvents.map(e => EVENT_LABELS[e.action_type] || e.action_type).join(', ');
    }
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}" 
           data-date="${dateStr}"
           onclick="openHistoryDetails('${dateStr}')">
        <span class="day-number">${day}</span>
        <div class="day-events">
          ${eventColors}
        </div>
        ${hasEvents ? `<div class="event-tooltip">${eventLabels}</div>` : ''}
      </div>
    `;
  }
  
  html += `</div></div>`;
  
  // Color Key
  html += `
    <div class="calendar-legend">
      <h4>Legend:</h4>
      <div class="legend-items">
        <div class="legend-item"><span class="legend-color" style="background-color:#48bb78;"></span> Played</div>
        <div class="legend-item"><span class="legend-color" style="background-color:#f6e05e;"></span> Penalty Received</div>
        <div class="legend-item"><span class="legend-color" style="background-color:#ed8936;"></span> Replaced Someone</div>
        <div class="legend-item"><span class="legend-color" style="background-color:#fc8181;"></span> Paid Penalty</div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Event listeners for month navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
    loadHistoryForMonth(currentYear, currentMonth);
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
    loadHistoryForMonth(currentYear, currentMonth);
  });
}

// Get history for a specific month
async function getMonthlyHistory(year, month) {
  const token = window.getToken();
  if (!token) return [];
  
  try {
    const response = await fetch(`${window.API_URL}/booking/monthly-history?year=${year}&month=${month + 1}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch history');
    return await response.json();
  } catch (error) {
    console.error('Error fetching monthly history:', error);
    return [];
  }
}

// Load history for month
async function loadHistoryForMonth(year, month) {
  const historyData = await getMonthlyHistory(year, month);
  const container = document.getElementById('historyDetailsList');
  if (!container) return;
  
  if (historyData.length === 0) {
    container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No events for this month.</p>';
    return;
  }
  
  let html = '<h4>Events this month:</h4><ul>';
  for (let item of historyData) {
    const date = new Date(item.event_date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const color = EVENT_COLORS[item.action_type] || '#888';
    const label = EVENT_LABELS[item.action_type] || item.action_type;
    html += `
      <li style="border-left: 4px solid ${color}; padding: 8px 12px; margin-bottom: 8px; background: #f7fafc; border-radius: 4px;">
        <strong>${dateStr}</strong> - ${label}
        <span style="float: right; color: #888; font-size: 0.85rem; cursor: pointer;" onclick="openHistoryDetails('${item.event_date}')">📖 View</span>
      </li>
    `;
  }
  html += '</ul>';
  container.innerHTML = html;
}

// Open history details popup
async function openHistoryDetails(dateStr) {
  console.log('📖 Opening details for:', dateStr);
  
  const token = window.getToken();
  if (!token) return;
  
  try {
    const response = await fetch(`${window.API_URL}/booking/monthly-history?year=${dateStr.split('-')[0]}&month=${dateStr.split('-')[1]}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch details');
    
    const historyData = await response.json();
    const dayEvents = historyData.filter(item => item.event_date.startsWith(dateStr));
    
    if (dayEvents.length === 0) {
      alert('No events for this day.');
      return;
    }
    
    let html = `
      <div style="padding: 10px;">
        <h3>📅 ${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
        <hr style="margin: 10px 0;">
    `;
    
    for (let event of dayEvents) {
      const color = EVENT_COLORS[event.action_type] || '#888';
      const label = EVENT_LABELS[event.action_type] || event.action_type;
      html += `
        <div style="border-left: 4px solid ${color}; padding: 10px; margin-bottom: 10px; background: #f7fafc; border-radius: 4px;">
          <strong>${label}</strong>
          ${event.day ? `<br>📆 Day: ${event.day}` : ''}
          ${event.description ? `<br>📝 ${event.description}` : ''}
          ${event.amount > 0 ? `<br>💰 Amount: $${event.amount}` : ''}
          ${event.related_user ? `<br>👤 Related User: ${event.related_user}` : ''}
          ${event.created_at ? `<br>🕐 Recorded: ${new Date(event.created_at).toLocaleString()}` : ''}
        </div>
      `;
    }
    
    html += `<button onclick="this.closest('.modal').style.display='none'" class="btn btn-secondary btn-sm" style="margin-top:10px;">Close</button>`;
    html += `</div>`;
    
    // Show in modal
    const modal = document.getElementById('historyDetailModal');
    const content = document.getElementById('historyDetailContent');
    if (modal && content) {
      content.innerHTML = html;
      modal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error opening history details:', error);
    alert('Failed to load details.');
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('dashboard.html')) {
    // Check if history view is active
    const historyView = document.getElementById('historyView');
    if (historyView) {
      // When history view is shown, initialize calendar
      const observer = new MutationObserver(function(mutations) {
        for (let mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            if (historyView.style.display !== 'none') {
              initHistoryPage();
            }
          }
        }
      });
      observer.observe(historyView, { attributes: true });
    }
  }
});

// Also initialize when panelHistory is clicked
document.addEventListener('DOMContentLoaded', function() {
  const historyBtn = document.getElementById('panelHistory');
  if (historyBtn) {
    historyBtn.addEventListener('click', function() {
      // Initialize after a short delay to ensure view is shown
      setTimeout(initHistoryPage, 100);
    });
  }
});
