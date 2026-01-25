import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import AdminReportDetails from "./components/AdminReportDetails";
import {
  LayoutDashboard,
  FileText,
  Bell,
  Users,
  Search,
  BellRing,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle,
  MapPin,
  Plus,
  Minus,
  Locate
} from "lucide-react";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPending: 0,
    inProgress: 0,
    resolvedToday: 0,
    pendingChange: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);


  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        navigate("/login");
        return;
      }
      const sessionUser = session.user;
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sessionUser.id)
        .single();
      if (userError || !userData) {
        console.error(userError);
        navigate("/login");
        return;
      }
      if (!userData.is_admin) {
        navigate("/dashboard");
        return;
      }
      setUser(userData);
      await fetchReports();
      await fetchStats();
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  // Separate effect for map initialization after loading completes
  useEffect(() => {
    if (!loading && mapRef.current && !selectedReportId) {
      // Small delay to ensure DOM is fully ready
      const timer = setTimeout(() => {
        initMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedReportId]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        users (full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(4);

    if (!error && data) {
      setReports(data);
    }
  };

  const fetchStats = async () => {
    // Total pending
    const { count: pendingCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // In progress
    const { count: progressCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    // resolved
    const { count: resolvedCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved");

    // Yesterday's pending for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const { count: yesterdayPending } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", yesterday.toISOString())
      .lte("created_at", yesterdayEnd.toISOString());

    const change = yesterdayPending ? Math.round(((pendingCount || 0) - yesterdayPending) / yesterdayPending * 100) : 0;

    setStats({
      totalPending: pendingCount || 0,
      inProgress: progressCount || 0,
      resolvedToday: resolvedCount || 0,
      pendingChange: change
    });
  };

 const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      infrastructure: 'Infrastructure',
      street_lighting: 'Street Lighting & Public Utilities',
      waste_management: 'Waste Management',
      road_damage: 'Road Damage',
      flooding: 'Flooding',
      public_safety: 'Public Safety',
      noise_pollution: 'Noise Pollution',
      illegal_activity: 'Illegal Activity',
      park_maintenance: 'Park Maintenance',
      other: 'Other'
    };
    return labels[category] || category;
  };
  
  const initMap = () => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setMapLoaded(true);
        renderMap();
      };
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
      renderMap();
    }
  };

  const renderMap = async () => {
    if (!mapRef.current) return;
    
    const L = (window as any).L;
    if (!L) return;

    // Remove existing map if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Clear markers array
    markersRef.current = [];

    mapRef.current.innerHTML = '<div id="admin-map" style="width: 100%; height: 100%;"></div>';

    // Wait for the div to be in the DOM
    await new Promise(resolve => setTimeout(resolve, 50));

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('admin-map').setView([14.5547, 121.0244], 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Force map to invalidate size after a short delay
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Fetch all reports and add markers
    const { data: allReports } = await supabase
      .from("reports")
      .select("*");

    if (allReports) {
      allReports.forEach((report: any) => {
        if (report.latitude && report.longitude) {
          const markerColor = 
            report.priority === 'high' ? '#ef4444' :
            report.priority === 'medium' ? '#f97316' :
            '#6b7280';

          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${markerColor}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });

          const marker = L.marker([report.latitude, report.longitude], { icon: customIcon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 200px;">
                <p style="font-size: 12px;">Status: ${report.status}</p>
              </div>
            `);

          // Store marker with priority info
          markersRef.current.push({
            marker: marker,
            priority: report.priority
          });
        }
      });
    }
  };

  const filterMapByPriority = (priority: string | null) => {
    if (!markersRef.current.length || !mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    if (priority === null) {
      // Show all markers and reset view
      markersRef.current.forEach(({ marker }) => {
        marker.setOpacity(1);
      });
      mapInstanceRef.current.setView([14.5547, 121.0244], 12);
      setSelectedPriority(null);
    } else {
      // Filter and zoom to selected priority markers
      const matchingMarkers: any[] = [];
      
      markersRef.current.forEach(({ marker, priority: markerPriority }) => {
        if (markerPriority === priority) {
          marker.setOpacity(1);
          matchingMarkers.push(marker);
        } else {
          marker.setOpacity(0.15);
        }
      });

      // Zoom to fit all matching markers
      if (matchingMarkers.length > 0) {
        const group = L.featureGroup(matchingMarkers);
        mapInstanceRef.current.fitBounds(group.getBounds(), {
          padding: [50, 50],
          maxZoom: 15
        });
      }

      setSelectedPriority(priority);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-orange-600';
      case 'low': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">PENDING</span>;
      case 'in_progress':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">IN PROGRESS</span>;
      case 'resolved':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">RESOLVED</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const priorityCounts = {
    high: reports.filter(r => r.priority === 'high').length,
    medium: reports.filter(r => r.priority === 'medium').length,
    low: reports.filter(r => r.priority === 'low').length
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (selectedReportId) {
    return <AdminReportDetails reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Online Sumbungan</div>
              <div className="text-xs text-gray-600">Admin</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
              activeTab === "dashboard" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
              activeTab === "reports" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">All Reports</span>
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
              activeTab === "alerts" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="font-medium">Local Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
              activeTab === "users" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">User Management</span>
          </button>
        </nav>

        {/* Admin User */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Admin User</div>
              <div className="text-xs text-gray-600">LGU Official</div>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <BellRing className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="flex gap-6">
            {/* Left Column - Stats & Reports */}
            <div className="flex-1">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Total Pending */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                      <TrendingUp className="w-4 h-4" />
                      {stats.pendingChange > 0 ? '+' : ''}{stats.pendingChange}% from yesterday
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Total Pending</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalPending}</div>
                </div>

                {/* In Progress */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-xs font-medium text-blue-600">Active now</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">In Progress</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.inProgress}</div>
                </div>

                {/* Resolved Today */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-xs font-medium text-green-600">Target: 25</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Resolved Today</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.resolvedToday}</div>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Reports</h2>
                  <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Citizen
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr 
                          key={report.id} 
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >                          
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                                {report.users?.full_name?.[0] || 'U'}
                              </div>
                              <span className="font-medium text-gray-900 text-sm">{report.users?.full_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700 text-sm"> {getCategoryLabel(report.category)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getPriorityDot(report.priority)}`}></div>
                              <span className={`font-medium capitalize text-sm ${getPriorityColor(report.priority)}`}>
                                {report.priority}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(report.status)}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedReportId(report.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column - Live Map */}
            <div className="w-96">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">Live Map View</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-red-600">LIVE</span>
                  </div>
                </div>

                {/* Map Search */}
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Locate area..."
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Map Container */}
                <div className="relative">
                  <div ref={mapRef} className="w-full h-96 bg-gray-100"></div>
                  
                  {/* Map Controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
                      <Plus className="w-5 h-5 text-gray-700" />
                    </button>
                    <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
                      <Minus className="w-5 h-5 text-gray-700" />
                    </button>
                    <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
                      <Locate className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Map Legend */}
                <div className="p-4 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                    Active Issue Map Legend
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => filterMapByPriority(selectedPriority === 'high' ? null : 'high')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedPriority === 'high' ? 'bg-red-50 ring-2 ring-red-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">High Priority</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{priorityCounts.high}</span>
                    </button>
                    <button
                      onClick={() => filterMapByPriority(selectedPriority === 'medium' ? null : 'medium')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedPriority === 'medium' ? 'bg-orange-50 ring-2 ring-orange-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Medium Priority</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{priorityCounts.medium}</span>
                    </button>
                    <button
                      onClick={() => filterMapByPriority(selectedPriority === 'low' ? null : 'low')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedPriority === 'low' ? 'bg-gray-50 ring-2 ring-gray-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Low Priority</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{priorityCounts.low}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;