import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const intervals = [
  { label: "1 Minute", value: "1m" },
  { label: "3 Minutes", value: "3m" },
  { label: "5 Minutes", value: "5m" },
  { label: "15 Minutes", value: "15m" },
  { label: "30 Minutes", value: "30m" },
  { label: "45 Minutes", value: "45m" },
  { label: "1 Day", value: "1d" },
  { label: "1 Week", value: "1w" },
  { label: "1 Month", value: "1M" },
  { label: "3 Months", value: "3M" },
  { label: "6 Months", value: "6M" },
  { label: "1 Year", value: "1Y" },
];

function formatDate(date) {
  // Format as YYYY-MM-DDTHH:mm:ss+05:30
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    "+05:30"
  );
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}

async function fetchStockSuggestions(query) {
  if (!query) return [];
  try {
    const url = `https://api-prod.strike.money/v1/api/search?q=${encodeURIComponent(query)}&limit=10&skip=0`;
    const res = await fetch(url);
    const json = await res.json();
    console.log('Search API response:', json); // Debug log
    return json.stocks || [];
  } catch (error) {
    console.error('Error fetching stock suggestions:', error);
    return [];
  }
}

async function fetchStockDetails(symbol) {
  if (!symbol) return null;
  try {
    const url = `https://api-prod.strike.money/v1/api/quote/${symbol}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.quote || null;
  } catch (error) {
    console.error('Error fetching stock details:', error);
    return null;
  }
}

import { Link } from 'react-router-dom';

export default function PriceTicks() {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  
  const [from, setFrom] = useState(sixMonthsAgo);
  const [to, setTo] = useState(today);
  const [interval, setInterval] = useState("1w");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetails, setStockDetails] = useState(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const dropdownRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const results = await fetchStockSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(true); // Always show dropdown when there are results
      setActiveSuggestionIndex(-1);
    } catch (error) {
      console.error('Error fetching stock suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && search.length >= 2) {
        // Trigger search on Enter if there are no suggestions but there's a search term
        e.preventDefault();
        if (suggestions.length > 0) {
          handleSuggestionClick(suggestions[0]);
        }
      }
      return;
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          handleSuggestionClick(suggestions[activeSuggestionIndex]);
        } else if (suggestions.length > 0) {
          handleSuggestionClick(suggestions[0]);
        }
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the entire component
      const componentNode = document.querySelector('.search-container');
      if (componentNode && !componentNode.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    // Use mousedown instead of click to handle the event before other click handlers
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle input focus
  const handleInputFocus = () => {
    if (search.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Auto-focus search input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSuggestionClick = async (s) => {
    if (!s) return;
    console.log('Selected stock:', s); // Debug log
    setSymbol(s.symbol);
    setSearch(s.symbol);
    setShowSuggestions(false);
    setSelectedStock(s);
    setActiveSuggestionIndex(-1);
    
    // Fetch stock details
    const details = await fetchStockDetails(s.symbol);
    if (details) {
      // Use circuit limit from search result if available and not 0, otherwise use 10%
      const DEFAULT_CIRCUIT_LIMIT = 10;
      const circuitLimit = (s.circuit_limit !== undefined && s.circuit_limit !== 0) 
        ? s.circuit_limit 
        : DEFAULT_CIRCUIT_LIMIT;
      
      console.log('Setting circuit limit:', circuitLimit); // Debug log
      
      const stockDetails = {
        ...details,
        circuit_limits: [{
          limit_percent: circuitLimit,
          type: 'Circuit Limit',
          upper_limit: details.current_price + (details.current_price * (circuitLimit / 100)),
          lower_limit: details.current_price - (details.current_price * (circuitLimit / 100))
        }]
      };
      
      console.log('Setting stock details:', stockDetails); // Debug log
      setStockDetails(stockDetails);
    }
    
    // Focus back on the input after selection
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Trigger data fetch
    fetchTicks(s.symbol);
  };

  const fetchTicks = async (symbolToFetch = symbol) => {
    if (!symbolToFetch) return; // Don't fetch if no symbol is provided
    
    setLoading(true);
    setData([]);
    const url = `https://api-prod-v21.strike.money/v2/api/equity/priceticks?candleInterval=${interval}&from=${encodeURIComponent(
      formatDate(from)
    )}&to=${encodeURIComponent(formatDate(to))}&securities=EQ%3A${encodeURIComponent(symbol)}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const ticks = json.data?.ticks?.[symbol] || [];
      setData(ticks);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch data when symbol, interval, from, or to changes
  useEffect(() => {
    fetchTicks();
  }, [symbol, interval, from, to]);

  // Styles
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      boxSizing: 'border-box',
      overflow: 'auto'
    },
    contentWrapper: {
      width: '100%',
      maxWidth: '1800px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '40px',
      margin: '20px',
      boxSizing: 'border-box',
      flex: '1 1 100%',
      minWidth: '0'  // Prevents flex items from overflowing
    },
    header: {
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #eaeaea'
    },
    stockHeader: {
      marginTop: '24px',
      padding: '16px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    stockTitle: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '12px',
      flexWrap: 'wrap',
      gap: '8px'
    },
    stockSymbol: {
      fontSize: '24px',
      fontWeight: '600',
      margin: 0,
      color: '#1e293b'
    },
    stockName: {
      fontSize: '14px',
      color: '#64748b',
      marginLeft: '4px'
    },
    stockPrice: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '12px',
      gap: '12px'
    },
    currentPrice: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#1e293b'
    },
    priceChange: {
      fontSize: '16px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    stockInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: '12px',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #e2e8f0'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    infoLabel: {
      fontSize: '12px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#1a1a1a',
      margin: '0 0 8px 0'
    },
    subtitle: {
      color: '#666',
      margin: '0 0 24px 0',
      fontSize: '15px'
    },
    controls: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '24px',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f0f0f0'
    },
    controlGroup: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '200px',
      flex: '1 1 200px'
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      marginBottom: '6px',
      color: '#555',
      display: 'block'
    },
    input: {
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '14px',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      ':focus': {
        outline: 'none',
        borderColor: '#4a90e2',
        boxShadow: '0 0 0 2px rgba(74, 144, 226, 0.2)'
      }
    },
    select: {
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '14px',
      backgroundColor: 'white',
      width: '100%',
      cursor: 'pointer'
    },
    dropdown: {
      position: 'relative',
      width: '100%'
    },
    suggestionsList: {
      position: 'absolute',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      listStyle: 'none',
      margin: '4px 0 0 0',
      padding: '8px 0',
      width: '100%',
      maxHeight: '300px',
      overflowY: 'auto',
      zIndex: 10,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      animation: 'fadeIn 0.15s ease-out'
    },
    suggestionItem: {
      padding: '10px 16px',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
      ':hover': {
        backgroundColor: '#f8f9fa'
      }
    },
    loading: {
      padding: '12px 0',
      color: '#666',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    '@keyframes fadeIn': {
      from: { opacity: 0, transform: 'translateY(-4px)' },
      to: { opacity: 1, transform: 'translateY(0)' }
    }
  };

  return (
    <div style={styles.container}>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '20px',
        gap: '10px'
      }}>
        <Link 
          to="/strike-deals" 
          style={{
            padding: '8px 16px',
            backgroundColor: '#4f46e5',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#4338ca'
            }
          }}
        >
          View Strike Deals
        </Link>
      </div>
      <div style={styles.contentWrapper}>
        <header style={styles.header}>
          <h1 style={styles.title}>Stock Market Data</h1>
          <p style={styles.subtitle}>Analyze historical price data with ease</p>
          
          {stockDetails && selectedStock && (
            <div style={styles.stockHeader}>
              <div style={styles.stockTitle}>
                <h2 style={styles.stockSymbol}>{selectedStock.symbol}</h2>
                <span style={styles.stockName}>{selectedStock.company_name}</span>
              </div>
              <div style={styles.stockPrice}>
                <span style={styles.currentPrice}>
                  ${stockDetails.current_price?.toFixed(2) || 'N/A'}
                </span>
                <span style={{
                  ...styles.priceChange,
                  color: (stockDetails.change_percent || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {stockDetails.change_percent >= 0 ? '+' : ''}{stockDetails.change_percent?.toFixed(2) || '0.00'}% 
                  ({stockDetails.change >= 0 ? '+' : ''}{stockDetails.change?.toFixed(2) || '0.00'})
                </span>
              </div>
              <div style={styles.stockInfo}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Open</span>
                  <span>${stockDetails.open?.toFixed(2) || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>High</span>
                  <span style={{ color: '#10b981' }}>${stockDetails.high?.toFixed(2) || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Low</span>
                  <span style={{ color: '#ef4444' }}>${stockDetails.low?.toFixed(2) || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Volume</span>
                  <span>{(stockDetails.volume || 0).toLocaleString()}</span>
                </div>
                {stockDetails.circuit_limits?.length > 0 && (
                  stockDetails.circuit_limits[0]?.limit_percent === 0 ? (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Circuit Limit</span>
                      <span style={{ 
                        color: '#64748b',
                        fontStyle: 'italic'
                      }}>
                        No Band
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Circuit Limit</span>
                        <span style={{ 
                          color: '#3b82f6',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {stockDetails.circuit_limits[0]?.limit_percent}%
                          <span style={{
                            fontSize: '12px',
                            backgroundColor: '#eff6ff',
                            color: '#3b82f6',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            {stockDetails.circuit_limits[0]?.type}
                          </span>
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Upper Limit</span>
                        <span style={{ color: '#10b981', fontWeight: '500' }}>
                          ${stockDetails.circuit_limits[0]?.upper_limit?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Lower Limit</span>
                        <span style={{ color: '#ef4444', fontWeight: '500' }}>
                          ${stockDetails.circuit_limits[0]?.lower_limit?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                    </>
                  )
                )}
              </div>
            </div>
          )}
        </header>
        
        <div style={styles.controls}>
          <div style={styles.controlGroup}>
          <label style={styles.label} htmlFor="symbol-search">Search Symbol</label>
          <div ref={dropdownRef} style={styles.dropdown} className="search-container">
            <input
              id="symbol-search"
              ref={inputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="e.g., AAPL, MSFT, GOOGL"
              style={styles.input}
              aria-haspopup="listbox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="stock-suggestions"
              role="combobox"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul 
                id="stock-suggestions"
                role="listbox"
                style={styles.suggestionsList}
              >
                {suggestions.map((s, index) => (
                  <li
                    key={s.symbol}
                    role="option"
                    className="suggestion-item"
                    aria-selected={index === activeSuggestionIndex}
                    style={{
                      ...styles.suggestionItem,
                      backgroundColor: index === activeSuggestionIndex ? '#f0f0f0' : 'transparent',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSuggestionClick(s);
                    }}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                  >
                    <div><b>{s.symbol}</b> - {s.company_name}</div>
                    <div style={{ fontSize: '0.9em', color: '#666', marginTop: '2px' }}>
                      {s.exchange_group} • {s.industry_sector?.sector || 'N/A'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label} htmlFor="from-date">From Date</label>
          <DatePicker
            id="from-date"
            selected={from}
            onChange={setFrom}
            showTimeSelect
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-picker"
            wrapperClassName="date-picker-wrapper"
            customInput={
              <input 
                style={{ ...styles.input, cursor: 'pointer' }} 
                readOnly 
              />
            }
          />
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label} htmlFor="to-date">To Date</label>
          <DatePicker
            id="to-date"
            selected={to}
            onChange={setTo}
            showTimeSelect
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-picker"
            wrapperClassName="date-picker-wrapper"
            customInput={
              <input 
                style={{ ...styles.input, cursor: 'pointer' }} 
                readOnly 
              />
            }
          />
        </div>

        <div style={{ ...styles.controlGroup, flex: '0 1 200px' }}>
          <label style={styles.label} htmlFor="interval">Interval</label>
          <select
            id="interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            style={styles.select}
          >
            {intervals.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
        </div>
        
        {loading && (
          <div style={styles.loading}>
            <span>Loading data...</span>
          </div>
        )}
        {selectedStock && data.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '22px',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{selectedStock.symbol}</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'normal',
                  color: '#666'
                }}>
                  {selectedStock.company_name}
                </span>
              </h2>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '13px',
                color: '#555'
              }}>
                <span>Exchange: <strong>{selectedStock.exchange_group || 'N/A'}</strong></span>
                <span>•</span>
                <span>F&O: <strong>{selectedStock.fno ? 'Yes' : 'No'}</strong></span>
                <span>•</span>
                <span>F&O Stock: <strong>{selectedStock.fno_stock ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                color: '#4a5568',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#4caf50'
                }}></span>
                <span>Market Open</span>
              </div>
            </div>
          </div>
          
          {selectedStock.industry_sector && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '13px',
              color: '#555',
              padding: '12px 0',
              borderTop: '1px solid #f0f0f0',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: '16px'
            }}>
              <div>
                <span style={{ color: '#888' }}>Sector:</span>{' '}
                <strong>{selectedStock.industry_sector.sector || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Industry:</span>{' '}
                <strong>{selectedStock.industry_sector.industry || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Group:</span>{' '}
                <strong>{selectedStock.industry_sector.industry_group || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Subgroup:</span>{' '}
                <strong>{selectedStock.industry_sector.industry_sub_group || 'N/A'}</strong>
              </div>
            </div>
          )}
        </div>
      )}

        <div style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f0f0f0',
          marginBottom: '24px',
          width: '100%'
        }}>
        {data.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '1000px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f8f9fa',
                  borderBottom: '1px solid #eaeaea'
                }}>
                  <th style={styles.tableHeader}>Date</th>
                  <th style={styles.tableHeader}>Open</th>
                  <th style={styles.tableHeader}>High</th>
                  <th style={styles.tableHeader}>Low</th>
                  <th style={styles.tableHeader}>Close</th>
                  <th style={styles.tableHeader}>Volume</th>
                  <th style={styles.tableHeader}>Delivery Vol</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr 
                    key={idx}
                    style={{
                      borderBottom: '1px solid #f5f5f5',
                      transition: 'background-color 0.15s',
                      ':hover': {
                        backgroundColor: '#f9f9f9'
                      }
                    }}
                  >
                      <td style={styles.tableCell}>
                        <div style={{ color: '#4a5568' }}>{formatDateTime(row[0])}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ fontWeight: '500' }}>{row[1]}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ color: '#10b981', fontWeight: '500' }}>{row[2]}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ color: '#ef4444', fontWeight: '500' }}>{row[3]}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ 
                          fontWeight: '600',
                          color: row[4] > row[1] ? '#10b981' : row[4] < row[1] ? '#ef4444' : '#4a5568'
                        }}>
                          {row[4]}
                          {row[4] > row[1] ? ' ▲' : row[4] < row[1] ? ' ▼' : ''}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div>{row[5]?.toLocaleString() || 'N/A'}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div>{row[6]?.toLocaleString() || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loading && search ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#718096'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: 0.7
              }}>
                📊
              </div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                color: '#2d3748'
              }}>
                No data available
              </h3>
              <p style={{
                margin: '0',
                fontSize: '14px',
                maxWidth: '400px',
                margin: '0 auto',
                lineHeight: '1.5'
              }}>
                Try adjusting your date range or check if the symbol is correct.
              </p>
            </div>
          ) : null}
          </div>
      </div>
    </div>
  );
} 