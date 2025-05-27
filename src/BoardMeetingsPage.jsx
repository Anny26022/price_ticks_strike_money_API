import React, { useState, useEffect } from 'react';
import './BoardMeetingsPage.css';

const BoardMeetingsPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Minimum date set to January 1, 2010
  const MIN_DATE = new Date('2010-01-01');

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date to DD-MM-YYYY for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  };

  // Get date range for quick selection
  const getDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start, end };
  };

  // Initialize date range with current date for both from and to
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    return {
      startDate: todayStr,
      endDate: todayStr
    };
  });
  const [companyName, setCompanyName] = useState('all');
  const [indexSymbol, setIndexSymbol] = useState('all');
  
  // Quick date range options
  const dateRanges = [
    { label: 'Next 1 Week', days: 7 },
    { label: 'Next 10 Days', days: 10 },
    { label: 'Next 15 Days', days: 15 },
  ];
  
  const handleQuickRangeSelect = (days) => {
    let startDate = new Date();
    const endDate = new Date();
    
    // Set start date to today or MIN_DATE, whichever is later
    startDate.setHours(0, 0, 0, 0);
    if (startDate < MIN_DATE) {
      startDate = new Date(MIN_DATE);
    }
    
    // Set end date to start date + number of days
    endDate.setDate(startDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);
    
    setDateRange({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    });
  };

  const fetchBoardMeetings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api-prod.strike.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiY3VzdG9tZXIiXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiY3VzdG9tZXIiLCJ4LWhhc3VyYS11c2VyLWlkIjoiOTgyYjFkMTEtMjMyZS00OGIzLThlMWMtZmI4YWY2M2VmMTk5IiwieC1oYXN1cmEtdXNlci1pcy1hbm9ueW1vdXMiOiJmYWxzZSJ9LCJzdWIiOiI5ODJiMWQxMS0yMzJlLTQ4YjMtOGUxYy1mYjhhZjYzZWYxOTkiLCJpYXQiOjE3NDgzNDE3ODQsImV4cCI6MTc0ODUxNDU4NCwiaXNzIjoiaGFzdXJhLWF1dGgifQ.bKb-16dNLn10ufceOe0AVrewar-X_2jS1V1U_LQfgsU'
        },
        body: JSON.stringify({
          operationName: 'GetBoardMeetings',
          query: `
            query GetBoardMeetings($end_date: date, $start_date: date, $company_name: String, $index_symbol: String) {
              meetings: indiacharts_board_meeting_fun(
                order_by: {company: {name: asc}}
                args: {end_date: $end_date, start_date: $start_date, company_name: $company_name, index_symbol: $index_symbol}
              ) {
                company_code
                company_id
                meeting_date
                purpose
                remarks
                deleted
                updated_at
                company {
                  name
                  __typename
                }
                __typename
              }
            }
          `,
          variables: {
            start_date: dateRange.startDate,
            end_date: dateRange.endDate,
            company_name: companyName === 'all' ? null : companyName,
            index_symbol: indexSymbol === 'all' ? null : indexSymbol
          }
        })
      });


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // Sort meetings by date in ascending order
      const sortedMeetings = [...(result.data?.meetings || [])].sort((a, b) => {
        return new Date(a.meeting_date) - new Date(b.meeting_date);
      });
      setMeetings(sortedMeetings);
    } catch (err) {
      console.error('Error fetching board meetings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardMeetings();
  }, [dateRange, companyName, indexSymbol]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="loading">Loading board meetings...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="board-meetings-container">
      <h1>Upcoming Board Meetings</h1>
      
      <div className="filters">
        <div className="quick-date-ranges">
          {dateRanges.map(({ label, days }) => (
            <button
              key={label}
              className="quick-range-btn"
              onClick={() => handleQuickRangeSelect(days)}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className="date-range-pickers">
          <div className="filter-group">
            <label>From:</label>
            <input 
              type="date" 
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              min={formatDate(MIN_DATE)}
              max={dateRange.endDate}
            />
          </div>
          
          <div className="filter-group">
            <label>To:</label>
            <input 
              type="date" 
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              min={formatDate(MIN_DATE)}
              max={formatDate(new Date())}
            />
          </div>
        </div>
        
        <div className="filter-group">
          <label>Company:</label>
          <input 
            type="text" 
            placeholder="Search company..."
            value={companyName === 'all' ? '' : companyName}
            onChange={(e) => setCompanyName(e.target.value || 'all')}
          />
        </div>
      </div>
      
      <div className="meetings-list">
        {meetings.length > 0 ? (
          <table className="meetings-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Meeting Date</th>
                <th>Purpose</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting, index) => (
                <tr key={`${meeting.company_code}-${index}`}>
                  <td>{meeting.company?.name || 'N/A'}</td>
                  <td>{formatDisplayDate(meeting.meeting_date)}</td>
                  <td>{meeting.purpose || 'N/A'}</td>
                  <td>{meeting.remarks || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>No upcoming board meetings found.</div>
        )}
      </div>
    </div>
  );
};

export default BoardMeetingsPage;
