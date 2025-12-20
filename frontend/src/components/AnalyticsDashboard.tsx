import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Filter, Download, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown,
  Loader2, Sun, Moon, Users, Package, Building2,
  Calendar, AlertCircle, CheckCircle2, X, BarChart3
} from 'lucide-react';

interface DataItem {
  [key: string]: any;
}

const AnalyticsDashboard = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
    timeDimension: 'month',
    employeeDimension: 'EMPLOYE',
    productDimension: 'produit',
    clientDimension: 'client'
  });
  const [allTime, setAllTime] = useState(false);
  const [allEmployee, setAllEmployee] = useState(false);
  const [allProduct, setAllProduct] = useState(false);
  const [allClient, setAllClient] = useState(false);

  const generateMockData = () => {
    const mockData: DataItem[] = [];
    for (let i = 1; i <= 100; i++) {
      const row: DataItem = { id: i };

      // Add columns based on selected dimensions
      if (!allTime) {
        if (filters.timeDimension === 'month') {
          row.NUM_MOIS = `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}`;
        } else if (filters.timeDimension === 'year') {
          row.NUM_ANNEE = 2023 + Math.floor(Math.random() * 3);
        } else if (filters.timeDimension === 'saison') {
          row.NUM_SAISON = Math.floor(Math.random() * 4) + 1;
        }
      }

      if (!allEmployee) {
        if (filters.employeeDimension === 'EMPLOYE') {
          row.NUM_EMP = Math.floor(Math.random() * 100) + 1;
        } else if (filters.employeeDimension === 'DEPARTEMENT') {
          row.NUM_DEPT = Math.floor(Math.random() * 10) + 1;
        }
      }

      if (!allProduct) {
        if (filters.productDimension === 'produit') {
          row.NUM_PROD = Math.floor(Math.random() * 1000) + 1;
        } else if (filters.productDimension === 'categorie') {
          row.NUM_CAT = Math.floor(Math.random() * 50) + 1;
        } else if (filters.productDimension === 'fournisseur') {
          row.NUM_FOURN = Math.floor(Math.random() * 20) + 1;
        }
      }

      if (!allClient) {
        if (filters.clientDimension === 'client') {
          row.CODE_CLIENT = `CLT${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        } else if (filters.clientDimension === 'pays') {
          row.NUM_PAYS = Math.floor(Math.random() * 50) + 1;
        }
      }

      mockData.push(row);
    }
    return mockData;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    // تحقق من أن ليس كل الأبعاد محددة كـ "All"
    if (allTime && allEmployee && allProduct && allClient) {
      setError("Please select at least one dimension for analysis.");
      setLoading(false);
      return;
    }

    try {
      // إعداد المعاملات للـ API
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: rowsPerPage.toString(),
        temp: allTime ? '' : filters.timeDimension,
        clie: allClient ? '' : filters.clientDimension,
        emp: allEmployee ? '' : filters.employeeDimension,
        prod: allProduct ? '' : filters.productDimension,
      });

      // إضافة البحث إذا كان موجوداً
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // استدعاء API من Django
      const response = await fetch(`http://localhost:8000/analyse_app/api/analyse/?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // معالجة البيانات من الباك اند
      let apiData = result.data || [];

      // تطبيق البحث محلياً على البيانات المستلمة
      if (searchTerm) {
        apiData = apiData.filter((row: any) =>
          Object.values(row).some((val: any) =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }

      // تطبيق الترتيب على البيانات المفلترة
      if (sortColumn) {
        apiData.sort((a: any, b: any) => {
          const aVal = a[sortColumn];
          const bVal = b[sortColumn];
          const multiplier = sortDirection === 'asc' ? 1 : -1;

          if (typeof aVal === 'number') {
            return (aVal - bVal) * multiplier;
          }
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }

      setData(apiData);
      setTotalRows(result.total_rows || 0);
      setTotalPages(Math.ceil((result.total_rows || 0) / rowsPerPage));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data. Please try again.';
      setError(errorMessage);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, filters, searchTerm, sortColumn, sortDirection, rowsPerPage, allTime, allEmployee, allProduct, allClient]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
  };

  const handlePageJump = () => {
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageInput('');
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Period', 'Employee', 'Product', 'Region', 'Revenue', 'Units', 'Growth', 'Status'].join(',');
    const rows = data.map(row =>
      [row.id, row.period, row.employee, row.product, row.region, row.revenue, row.units, row.growth, row.status].join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getGrowthColor = (growth: string) => {
    const val = parseFloat(growth);
    if (val > 20) return isDarkMode ? 'text-green-400' : 'text-green-600';
    if (val > 0) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
    if (val > -10) return isDarkMode ? 'text-amber-400' : 'text-amber-600';
    return isDarkMode ? 'text-red-400' : 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return styles[status] || styles['Pending'];
  };

  const theme = {
    bg: isDarkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100',
    cardBg: isDarkMode ? 'bg-slate-800' : 'bg-white',
    border: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    textSecondary: isDarkMode ? 'text-slate-400' : 'text-slate-600',
    hover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
    input: isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900',
    tableBg: isDarkMode ? 'bg-slate-900' : 'bg-slate-50',
    headerBg: isDarkMode ? 'bg-slate-800/50' : 'bg-gradient-to-r from-slate-50 to-blue-50'
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 p-4 md:p-6`}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className={`${theme.cardBg} rounded-2xl shadow-xl border ${theme.border} p-6 mb-6 transition-all duration-300`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  Analytics Dashboard
                </h1>
              </div>
              <p className={`${theme.textSecondary} text-sm`}>
                Real-time business intelligence and performance metrics
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2.5 ${theme.cardBg} border ${theme.border} rounded-xl ${theme.hover} transition-all duration-200 shadow-sm hover:shadow-md`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>

              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Dimensions */}
        <div className={`${theme.cardBg} rounded-2xl shadow-xl border ${theme.border} p-6 mb-6 transition-all duration-300`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-bold ${theme.text}`}>Filters & Dimensions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group">
              <label className={`block text-sm font-semibold ${theme.text} mb-2 flex items-center gap-2`}>
                <Calendar className="w-4 h-4 text-blue-500" />
                Time Period
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={allTime}
                  onChange={(e) => setAllTime(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className={`text-sm ${theme.text}`}>All</label>
              </div>
              <select
                value={filters.timeDimension}
                onChange={(e) => handleFilterChange('timeDimension', e.target.value)}
                disabled={allTime}
                className={`w-full px-4 py-2 border ${theme.border} ${theme.input} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm hover:shadow-md transition-all`}
              >
                <option value="month">By Month</option>
                <option value="year">By Year</option>
                <option value="saison">By Season</option>
              </select>
            </div>

            <div className="group">
              <label className={`block text-sm font-semibold ${theme.text} mb-2 flex items-center gap-2`}>
                <Users className="w-4 h-4 text-purple-500" />
                Employee
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={allEmployee}
                  onChange={(e) => setAllEmployee(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className={`text-sm ${theme.text}`}>All</label>
              </div>
              <select
                value={filters.employeeDimension}
                onChange={(e) => handleFilterChange('employeeDimension', e.target.value)}
                disabled={allEmployee}
                className={`w-full px-4 py-2 border ${theme.border} ${theme.input} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm hover:shadow-md transition-all`}
              >
                <option value="EMPLOYE">By Employee</option>
                <option value="DEPARTEMENT">By Department</option>
              </select>
            </div>

            <div className="group">
              <label className={`block text-sm font-semibold ${theme.text} mb-2 flex items-center gap-2`}>
                <Package className="w-4 h-4 text-emerald-500" />
                Product
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={allProduct}
                  onChange={(e) => setAllProduct(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className={`text-sm ${theme.text}`}>All</label>
              </div>
              <select
                value={filters.productDimension}
                onChange={(e) => handleFilterChange('productDimension', e.target.value)}
                disabled={allProduct}
                className={`w-full px-4 py-2 border ${theme.border} ${theme.input} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm hover:shadow-md transition-all`}
              >
                <option value="produit">By Product</option>
                <option value="categorie">By Category</option>
                <option value="fournisseur">By Supplier</option>
              </select>
            </div>

            <div className="group">
              <label className={`block text-sm font-semibold ${theme.text} mb-2 flex items-center gap-2`}>
                <Building2 className="w-4 h-4 text-orange-500" />
                Client
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={allClient}
                  onChange={(e) => setAllClient(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className={`text-sm ${theme.text}`}>All</label>
              </div>
              <select
                value={filters.clientDimension}
                onChange={(e) => handleFilterChange('clientDimension', e.target.value)}
                disabled={allClient}
                className={`w-full px-4 py-2 border ${theme.border} ${theme.input} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm hover:shadow-md transition-all`}
              >
                <option value="client">By Client</option>
                <option value="pays">By Country</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className={`${theme.cardBg} rounded-2xl shadow-xl border ${theme.border} p-5 mb-6 transition-all duration-300`}>
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
              <input
                type="text"
                placeholder="Search across all columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 border ${theme.border} ${theme.input} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm hover:shadow-md transition-all`}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className={`text-sm font-medium ${theme.textSecondary} whitespace-nowrap`}>
                Rows per page:
              </label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 border ${theme.border} ${theme.input} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm hover:shadow-md transition-all`}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className={`${theme.cardBg} rounded-2xl shadow-xl border ${theme.border} overflow-hidden transition-all duration-300`}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 m-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${theme.headerBg} border-b ${theme.border}`}>
                <tr>
                  {data.length > 0 && Object.keys(data[0]).map((columnKey) => (
                    <th key={columnKey} className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort(columnKey)}
                        className={`flex items-center gap-2 text-xs font-bold ${theme.text} uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors group`}
                      >
                        {columnKey}
                        <div className="relative w-4 h-4">
                          {sortColumn === columnKey ? (
                            sortDirection === 'asc' ?
                              <ArrowUp className="w-4 h-4 text-blue-600 dark:text-blue-400" /> :
                              <ArrowDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {loading ? (
                  <tr>
                    <td colSpan={data.length > 0 ? Object.keys(data[0]).length : 1} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                          <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse"></div>
                        </div>
                        <p className={`${theme.textSecondary} text-lg font-medium`}>Loading analytics data...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={data.length > 0 ? Object.keys(data[0]).length : 1} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <AlertCircle className="w-12 h-12 text-slate-400" />
                        </div>
                        <div className="text-center">
                          <p className={`${theme.text} text-lg font-semibold mb-1`}>No data found</p>
                          <p className={`${theme.textSecondary} text-sm`}>
                            {searchTerm ? 'Try adjusting your search term or filters' : 'Try adjusting your filters'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr key={index} className={`${theme.hover} transition-colors duration-150`}>
                      {Object.keys(row).map((columnKey) => (
                        <td key={columnKey} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {row[columnKey]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.length > 0 && (
            <div className={`${theme.tableBg} px-6 py-5 border-t ${theme.border}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Showing</span>
                  <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span>
                  <span>to</span>
                  <span className="font-medium">{Math.min(currentPage * rowsPerPage, totalRows)}</span>
                  <span>of</span>
                  <span className="font-medium">{totalRows}</span>
                  <span>results</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronsLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handlePageJump()}
                      placeholder={currentPage.toString()}
                      className={`w-12 px-2 py-1 text-center border ${theme.border} ${theme.input} rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm`}
                    />
                    <span className={`text-sm ${theme.textSecondary}`}>of {totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronsRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;