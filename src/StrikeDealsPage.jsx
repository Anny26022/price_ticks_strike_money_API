import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';

const DEAL_TYPES = {
  BULK: 'bulk',
  BLOCK: 'block',
  INSIDER: 'insider'
};

const API_ENDPOINTS = {
  [DEAL_TYPES.BULK]: 'https://api-prod.strike.money/v1/api/deals/bulkdeal',
  [DEAL_TYPES.BLOCK]: 'https://api-prod.strike.money/v1/api/deals/blockdeal',
  [DEAL_TYPES.INSIDER]: 'https://api-prod.strike.money/v1/api/insidertrading'
};

const StrikeDealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(DEAL_TYPES.BULK);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 1500;
  const loadingRef = useRef(false);
  const tableRef = useRef(null);
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({
    symbol: '',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  const navigate = useNavigate();
  
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Searching for:', searchKeyword);
      
      // If search is empty, reset to show all deals
      if (!searchKeyword.trim()) {
        fetchDeals(1, true);
        return;
      }
      
      // Filter deals based on search keyword
      const filtered = deals.filter(deal => 
        Object.values(deal).some(value => 
          String(value).toLowerCase().includes(searchKeyword.toLowerCase())
        )
      );
      
      setDeals(filtered);
      setCurrentPage(1);
    }
  };

  const fetchDeals = useCallback(async (page = 1, force = false) => {
    if (loadingRef.current && !force) return;
    
    loadingRef.current = true;
    setLoading(page === 1);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      // Format dates for API
      const params = {
        limit: itemsPerPage,
        offset: offset
      };
      
      // Add date filters if they exist
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        params.startDate = format(startDate, 'yyyyMMdd');
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        params.endDate = format(endDate, 'yyyyMMdd');
      }
      
      // Add symbol filter if it exists
      if (filters.symbol && filters.symbol.trim() !== '') {
        params.symbol = filters.symbol.trim().toUpperCase();
      }
      
      console.log('Fetching page:', page, 'with params:', params);
      
      const response = await axios.post(
        API_ENDPOINTS[activeTab],
        params,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
            'Content-Type': 'application/json',
            'Origin': 'https://web.strike.money'
          }
        }
      );

      const newDeals = Array.isArray(response.data) ? response.data : [response.data];
      
      // Update pagination info
      const total = response.headers['x-total-count'] || newDeals.length * page; // Estimate total if not provided
      const calculatedTotalPages = Math.ceil(total / itemsPerPage);
      
      console.log('Fetched', newDeals.length, 'deals. Total items:', total, 'Total pages:', calculatedTotalPages);
      
      // Update state in the correct order
      setDeals(newDeals);
      setTotalItems(total);
      setTotalPages(calculatedTotalPages);
      setCurrentPage(page);
      
      // Scroll to top when page changes
      if (page > 1) {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.error('Error in fetchDeals:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [filters, activeTab, itemsPerPage]); // Added itemsPerPage to dependencies
  
  // Handle tab change
  const handleTabChange = (tab) => {
    // Prevent unnecessary re-renders if clicking the same tab
    if (activeTab === tab) return;
    
    // Update the active tab
    setActiveTab(tab);
    
    // Reset the state
    setDeals([]);
    setCurrentPage(1);
    setLoading(true);
    
    // Force fetch new data for the selected tab
    fetchDeals(1, true);
  };
  
  // Initial load and when filters/tab changes
  useEffect(() => {
    console.log('Filters or active tab changed, resetting to page 1');
    fetchDeals(1, true); // Force initial load
  }, [filters, activeTab]); // Removed fetchDeals from dependencies to prevent infinite loops
  
  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    console.log('Page change requested to:', newPage, 'Current page:', currentPage, 'Total pages:', totalPages);
    if (newPage < 1 || newPage > totalPages) {
      console.log('Invalid page:', newPage);
      return;
    }
    fetchDeals(newPage, true); // Force fetch even if loading
  }, [fetchDeals, totalPages, currentPage]);
  
  // Add debug effect
  useEffect(() => {
    console.log('Current page state:', currentPage, 'Total pages:', totalPages);
  }, [currentPage, totalPages]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate dates
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const today = new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please enter valid dates');
      return;
    }
    
    if (start > end) {
      setError('Start date cannot be after end date');
      return;
    }
    
    if (end > today) {
      setError('End date cannot be in the future');
      return;
    }
    
    // Reset to first page when filters change
    setCurrentPage(1);
    fetchDeals(1, true);
  };

  // Mobile-first responsive styles
  const styles = {
    container: {
      padding: '10px',
      maxWidth: '100%',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f5f7fa',
      minHeight: '100vh',
      boxSizing: 'border-box',
      fontSize: '14px',
      lineHeight: '1.5',
      color: '#333',
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: '1px solid #eaeaea',
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1a202c',
      margin: 0,
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      paddingBottom: '8px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
    tab: {
      padding: '8px 12px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: '#e9ecef',
      },
    },
    activeTab: {
      backgroundColor: '#4f46e5',
      color: 'white',
      borderColor: '#4f46e5',
    },
    searchContainer: {
      margin: '16px 0',
      width: '100%',
    },
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '24px',
      WebkitOverflowScrolling: 'touch',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '800px',
    },
    th: {
      backgroundColor: '#f8f9fa',
      padding: '10px 8px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#4a5568',
      borderBottom: '2px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 1,
      fontSize: '13px',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #f0f0f0',
      verticalAlign: 'middle',
      fontSize: '13px',
      lineHeight: '1.4',
      wordBreak: 'break-word',
    },
    tr: {
      '&:hover': {
        backgroundColor: '#f8fafc',
      },
    },
    loading: {
      padding: '40px',
      textAlign: 'center',
      color: '#666',
    },
    error: {
      padding: '20px',
      backgroundColor: '#ffebee',
      color: '#c62828',
      borderRadius: '4px',
      margin: '20px 0',
      textAlign: 'center',
    },
    paginationContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '12px',
      borderTop: '1px solid #e2e8f0',
      backgroundColor: '#f9f9f9',
      alignItems: 'center',
    },
    paginationButton: {
      padding: '8px 16px',
      backgroundColor: '#4f46e5',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      '&:disabled': {
        backgroundColor: '#cbd5e0',
        cursor: 'not-allowed',
      },
    },
    pageInfo: {
      fontSize: '14px',
      color: '#4a5568',
    },
    // Media queries for larger screens
    '@media (min-width: 640px)': {
      container: {
        padding: '16px',
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      tabs: {
        flexWrap: 'wrap',
        overflowX: 'visible',
      },
      th: {
        padding: '12px 12px',
      },
      td: {
        padding: '12px 12px',
      },
      paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
    },
    '@media (min-width: 1024px)': {
      container: {
        maxWidth: '1400px',
        padding: '24px',
      },
      th: {
        padding: '14px 16px',
      },
      td: {
        padding: '14px 16px',
      },
    },
    paginationContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      marginBottom: '20px'
    },
    paginationButton: {
      padding: '8px 16px',
      backgroundColor: '#4f46e5',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      '&:disabled': {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
      },
      '&:hover:not(:disabled)': {
        backgroundColor: '#4338ca',
      },
    },
    pageInfo: {
      fontSize: '14px',
      color: '#333',
    },
    container: {
      padding: '20px',
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #eaeaea'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#333'
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    filterForm: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#555'
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      alignSelf: 'flex-end',
      height: '36px'
    },
    tableContainer: {
      flex: 1,
      overflow: 'auto',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      backgroundColor: 'white',
      marginBottom: '20px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    th: {
      backgroundColor: '#f5f5f5',
      padding: '12px 16px',
      textAlign: 'left',
      borderBottom: '1px solid #e0e0e0',
      fontWeight: '600',
      color: '#333',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '12px 16px',
      borderBottom: '1px solid #f0f0f0',
      verticalAlign: 'top'
    },
    tr: {
      '&:hover': {
        backgroundColor: '#f9f9f9'
      }
    },
    loading: {
      padding: '40px',
      textAlign: 'center',
      color: '#666'
    },
    error: {
      padding: '20px',
      backgroundColor: '#ffebee',
      color: '#c62828',
      borderRadius: '4px',
      margin: '20px 0',
      textAlign: 'center',
      flex: 1
    },
    paginationContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#f9f9f9'
    },
    pageSizeSelector: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    pageSizeLabel: {
      fontSize: '14px',
      color: '#666'
    },
    select: {
      padding: '4px 8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      backgroundColor: 'white'
    },
    pageInfo: {
      fontSize: '14px',
      color: '#666'
    },
    pageButtons: {
      display: 'flex',
      gap: '4px'
    },
    pageButton: {
      padding: '4px 10px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
      borderRadius: '4px',
      cursor: 'pointer',
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      },
      '&:hover:not(:disabled)': {
        backgroundColor: '#f0f0f0'
      }
    },
    activePageButton: {
      backgroundColor: '#4f46e5',
      color: 'white',
      borderColor: '#4f46e5'
    },
    refreshButton: {
      marginLeft: '10px',
      padding: '4px 8px',
      fontSize: '12px',
      backgroundColor: '#e0e0e0',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }
  };

  const highlightMatch = (text) => {
    if (!searchKeyword || !text) return text;
    
    const searchRegex = new RegExp(`(${searchKeyword})`, 'gi');
    const parts = String(text).split(searchRegex);
    
    return parts.map((part, index) => 
      part.toLowerCase() === searchKeyword.toLowerCase() 
        ? <span key={index} style={{ backgroundColor: '#ffeb3b', padding: '2px 0', borderRadius: '2px' }}>{part}</span>
        : part
    );
  };

  const formatValue = (value, key) => {
    if (value === null || value === undefined) return '-';
    
    // Format dates
    if ((key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) && value) {
      try {
        const formattedDate = format(new Date(value), 'dd MMM yyyy HH:mm');
        return searchKeyword ? highlightMatch(formattedDate) : formattedDate;
      } catch (e) {
        return value;
      }
    }
    
    // Format numbers with commas
    if (typeof value === 'number') {
      const formattedNumber = value.toLocaleString();
      return searchKeyword ? highlightMatch(formattedNumber) : formattedNumber;
    }
    
    // Handle objects
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    const stringValue = String(value);
    return searchKeyword ? highlightMatch(stringValue) : stringValue;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Strike Deals</h1>
        <div style={styles.tabs}>
          {Object.values(DEAL_TYPES).map((type) => (
            <button
              key={type}
              style={{
                ...styles.tab,
                ...(activeTab === type ? styles.activeTab : {})
              }}
              onClick={() => handleTabChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ margin: '20px 0', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Search by keyword..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyPress={handleSearch}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '16px',
            outline: 'none',
            boxSizing: 'border-box',
            ':focus': {
              borderColor: '#1a73e8',
              boxShadow: '0 0 0 2px rgba(26,115,232,0.2)'
            }
          }}
        />
      </div>
      
      {loading ? (
        <div style={styles.loading}>
          <div className="spinner"></div>
          <p>Loading {activeTab} deals...</p>
        </div>
      ) : error ? (
        <div style={styles.error}>
          <p>Error: {error}</p>
          <button 
            onClick={() => fetchDeals(currentPage)}
            style={styles.retryButton}
          >
            Retry
          </button>
        </div>
      ) : (
        <div>
          <div style={styles.paginationContainer}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {currentPage} of {totalPages} (Total: {totalItems} items)
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={styles.paginationButton}
            >
              Next
            </button>
          </div>
          
          <div style={styles.tableContainer} ref={tableRef}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {deals.length > 0 && 
                    Object.keys(deals[0])
                      .filter(key => ![
                        'id', 'security_code', 'stock_id', 'deleted', 'company_id', 'slug',
                        'buy', 'sell', 'buy_unit', 'sell_unit', 'modified_at', 'ticker'
                      ].includes(key))
                      .map((key) => (
                        <th key={key} style={styles.th}>
                          {key.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </th>
                      ))
                  }
                </tr>
              </thead>
              <tbody>
                {deals.map((deal, index) => (
                  <tr key={index} style={styles.tr}>
                    {Object.entries(deal)
                      .filter(([key]) => ![
                        'id', 'security_code', 'stock_id', 'deleted', 'company_id', 'slug',
                        'buy', 'sell', 'buy_unit', 'sell_unit', 'modified_at', 'ticker'
                      ].includes(key))
                      .map(([key, value]) => (
                        <td key={key} style={styles.td}>
                          {formatValue(value, key)}
                        </td>
                      ))
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={styles.paginationContainer}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {currentPage} of {totalPages} (Total: {totalItems} items)
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={styles.paginationButton}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrikeDealsPage;
