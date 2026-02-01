import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ReportDetails from "./ReportDetails";

import { 
  Search, ChevronDown, MapPin, Calendar, Home, FileText,
  AlertTriangle, CheckCircle, Clock, Eye, Bell, MessageSquare,
  Megaphone, Trees, LogOut, XCircle
} from "lucide-react";

interface Report {
  id: string;
  user_id: string;
  title: string;
  category: string;
  address: string;
  description: string;
  media_urls: string[];
  latitude: number;
  longitude: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'withdrawn';
  created_at: string;
}

const MyReports = ({ onBack, onNavigateHome }: { onBack: () => void; onNavigateHome: () => void }) => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 5;

  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  const dashboardAnnouncements = announcements
  .filter(a => a.status === 'published')
  .sort(
    (a, b) =>
      new Date(b.scheduled_date || b.created_at).getTime() -
      new Date(a.scheduled_date || a.created_at).getTime()
  )
  .slice(0, 2); // show only 2 on dashboard


  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortReports();
  }, [reports, searchQuery, statusFilter, sortBy]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserData(userData);
    }
  };

    useEffect(() => {
      setCurrentPage(1);
    }, [searchQuery, statusFilter, sortBy]);


  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchAnnouncements();
}, []);


  const fetchAnnouncements = async () => {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .order("scheduled_date", { ascending: false });

    if (error) throw error;
    setAnnouncements(data || []);
  } catch (error) {
    console.error("Error fetching announcements:", error);
  }
};


  const filterAndSortReports = () => {
    let filtered = [...reports];

    if (searchQuery.trim()) {
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredReports(filtered);
  };

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(
    indexOfFirstReport,
    indexOfLastReport
  );

  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'IN PROGRESS',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          icon: <Clock className="w-4 h-4" />
        };
      case 'resolved':
        return {
          label: 'RESOLVED',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'withdrawn':
        return {
          label: 'WITHDRAWN',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          icon: <XCircle className="w-4 h-4" />
        };
      default:
        return {
          label: 'UNDER REVIEW',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
          icon: <Eye className="w-4 h-4" />
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      infrastructure: '🏗️',
      street_lighting: '💡',
      waste_management: '🗑️',
      road_damage: '🚧',
      flooding: '🌊',
      public_safety: '🚨',
      noise_pollution: '🔊',
      illegal_activity: '⚠️',
      park_maintenance: '🌳',
      other: '📋'
    };
    return icons[category] || '📋';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getReportId = (id: string) => {
    return `REF-2026-${id.slice(0, 4).toUpperCase()}`;
  };

  // Show report details if a report is selected
if (selectedReportId) {
    return (
      <ReportDetails 
        reportId={selectedReportId} 
        onBack={() => {
          setSelectedReportId(null);
          fetchReports(); // Refresh reports list when coming back
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Online Sumbungan</h1>
          </div>

          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search community posts or reports"
                className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
                <Bell className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-400 rounded-full"></div>
                <div className="text-right">
                {userData ? (
                    <p className="text-sm font-semibold">{userData.full_name}</p>
                ) : (
                    <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
                )}
                 <p className="text-xs text-gray-500">{userData?.barangay}</p>
                </div>
            </div>
            </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* ========== LEFT SIDEBAR ========== */}
          <aside className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
              <button 
                onClick={onNavigateHome}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <Home className="w-5 h-5" />
                Home Feed
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-semibold">
                <FileText className="w-5 h-5" />
                My Reports
              </button>

            {/* Local services section */}
            <div className="pt-4 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase px-4 mb-3">
                Local Services
              </p>

              {/* Local Alerts */}
              <button className="w-full flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-left">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 leading-tight">
                    Local Alerts
                  </p>
                  <p className="text-xs font-semibold text-red-600">
                    EMERGENCY
                  </p>
                </div>
              </button>

              {/* Announcements */}
              <button className="w-full flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-left">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 leading-tight">
                    Announcements
                  </p>
                  <p className="text-xs font-semibold text-gray-500">
                    COMMUNITY
                  </p>
                </div>
              </button>

              {/* Parks & Recreation */}
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-left">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trees className="w-5 h-5 text-green-600" />
                </div>
                <p className="font-semibold text-gray-900">
                  Parks & Recreation
                </p>
              </button>
            </div>

              <div className="pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-50 text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* ========== MAIN CONTENT ========== */}
          <main className="col-span-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">My Personal Reports List</h1>
                  <p className="text-sm text-gray-600">Track and manage your community grievance submissions.</p>
                </div>
                <button
                  onClick={onBack}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                  </svg>
                  File a New Report
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your reports by title or ID..."
                    className="w-full bg-gray-50 border-0 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-gray-50 border-0 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Under Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-gray-50 border-0 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="status">Sort by Status</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Reports List */}
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No reports found</h3>
                <p className="text-gray-500">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "Start by filing your first report!"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
              {currentReports.map((report) => {
                  const statusConfig = getStatusConfig(report.status);
                  return (
                    <div
                        key={report.id}
                        onClick={() => setSelectedReportId(report.id)}
                        className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                        >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl">
                          {getCategoryIcon(report.category)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {report.title}
                            </h3>
                            <span className={`${statusConfig.bgColor} ${statusConfig.textColor} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              # {getReportId(report.id)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(report.created_at)}
                            </span>
                          </div>

                          <div className="flex items-start gap-1 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{report.address}</span>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-gray-600">
                  Showing {indexOfFirstReport + 1}–
                  {Math.min(indexOfLastReport, filteredReports.length)} of{" "}
                  {filteredReports.length} reports
                </p>

                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border rounded-lg disabled:opacity-40"
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-lg border
                        ${currentPage === page
                          ? "bg-blue-600 text-white border-blue-600"
                          : "hover:bg-gray-50"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border rounded-lg disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

          </main>

          {/* ========== RIGHT SIDEBAR ========== */}
          <aside className="col-span-3 space-y-4">
            <div className="bg-blue-50 rounded-lg shadow-sm p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Reporting Guidelines</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Ensure your reports include a precise location and clear photos. This helps our city maintenance teams resolve issues up to 30% faster.
              </p>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">RESPONSE TIME</p>
                <p className="text-sm font-bold text-gray-900">Typical review: 24-48 hours</p>
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg shadow-sm p-4">
              <h3 className="font-bold text-gray-900 mb-2">Need urgent help?</h3>
              <p className="text-sm text-gray-600 mb-3">
                For emergencies, please contact the 24/7 city hotline directly.
              </p>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                Call City Hotline
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MyReports;