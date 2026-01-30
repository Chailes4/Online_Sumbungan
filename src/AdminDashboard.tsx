import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import AdminReportDetails from "./components/AdminReportDetails";
import {
  LayoutDashboard, FileText, Bell, Users, Search, BellRing, LogOut, TrendingUp, Clock, CheckCircle, MapPin,
  Plus, Minus, Locate, Pencil, Trash2, ChevronLeft, ChevronRight, Circle, X, AlertTriangle, Info
} from "lucide-react";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPending: 0,
    inProgress: 0,
    totalResolved: 0,
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

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 6;

  const [alertsView, setAlertsView] = useState("list");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  
  // Alert filters
  const [alertFilterType, setAlertFilterType] = useState("all");
  const [alertFilterStatus, setAlertFilterStatus] = useState("all");
  const [alertFilterSearch, setAlertFilterSearch] = useState("");
  const [alertCurrentPage, setAlertCurrentPage] = useState(1);
  const alertsPerPage = 10;

  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);


  // Alert form state
  const [alertForm, setAlertForm] = useState({
    urgency: 'critical',
    category: 'water_interruption',
    title: '',
    description: '',
    estimated_resolution: '',
    required_action: '',
    affected_areas: [] as string[],
    status: 'live',
    scheduled_date: ''
  });

  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  const barangayList = [
    'Agnaya', 'Bagong Silang', 'Banga I', 'Banga II', 'Bintog', 
    'Bulihan', 'Culianin', 'Dampol', 'Lagundi', 'Lalangan',
    'Lumang Bayan', 'Parulan', 'Poblacion', 'Rueda', 'San Jose',
    'Santa Ines', 'Santo Niño', 'Sipat', 'Tabang'
  ];

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
      await fetchAlerts();
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (!loading && mapRef.current && !selectedReportId) {
      const timer = setTimeout(() => {
        initMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedReportId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearch, filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    setAlertCurrentPage(1);
  }, [alertFilterSearch, alertFilterType, alertFilterStatus]);

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    const { data, error } = await supabase
      .from("local_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAlerts(data);
    }
    setAlertsLoading(false);
  };

  // Auto-publish scheduled alerts when their time arrives
useEffect(() => {
  const checkScheduledAlerts = async () => {
    const now = new Date().toISOString();
    
    console.log("Checking scheduled alerts at:", now);
    
    const { data: scheduledAlerts, error } = await supabase
      .from("local_alerts")
      .select("*")
      .eq("status", "scheduled")
      .not("scheduled_date", "is", null);

    if (error) {
      console.error("Error fetching scheduled alerts:", error);
      return;
    }

    console.log("All scheduled alerts:", scheduledAlerts);

    if (scheduledAlerts && scheduledAlerts.length > 0) {
      // Filter alerts that should be published
      const alertsToPublish = scheduledAlerts.filter(alert => {
        const scheduledTime = new Date(alert.scheduled_date).getTime();
        const currentTime = new Date().getTime();
        return scheduledTime <= currentTime;
      });

      console.log("Alerts to publish:", alertsToPublish);

      if (alertsToPublish.length > 0) {
        for (const alert of alertsToPublish) {
          console.log(`Publishing: "${alert.title}" (scheduled for ${alert.scheduled_date})`);
          
          const { error: updateError } = await supabase
            .from("local_alerts")
            .update({ status: "live" })
            .eq("id", alert.id);
          
          if (updateError) {
            console.error("Error publishing alert:", updateError);
          } else {
            console.log(`✓ Published: ${alert.title}`);
          }
        }
        
        await fetchAlerts();
      }
    }
  };

  // Check immediately
  checkScheduledAlerts();

  // Check every 30 seconds
  const interval = setInterval(checkScheduledAlerts, 30000);

  return () => clearInterval(interval);
}, []);


 const handleCreateAlert = async () => {
  if (!alertForm.title || !alertForm.description || selectedAreas.length === 0) {
    alert("Please fill in all required fields and select at least one affected area.");
    return;
  }

  // Format scheduled_date properly
  let scheduledDate = null;
  if (alertForm.status === 'scheduled' && alertForm.scheduled_date) {
    // Convert datetime-local to ISO string
    scheduledDate = new Date(alertForm.scheduled_date).toISOString();
  }

  const { data, error } = await supabase
    .from("local_alerts")
    .insert([{
      urgency: alertForm.urgency,
      category: alertForm.category,
      title: alertForm.title,
      description: alertForm.description,
      estimated_resolution: alertForm.estimated_resolution,
      required_action: alertForm.required_action,
      affected_areas: selectedAreas,
      status: alertForm.status,
      scheduled_date: scheduledDate,  // Use the formatted date
      created_by: user.id
    }]);

  if (error) {
    console.error("Error creating alert:", error);
    alert("Failed to create alert. Please try again.");
  } else {
    alert("Alert created successfully!");
    setAlertsView("list");
    setAlertForm({
      urgency: 'critical',
      category: 'water_interruption',
      title: '',
      description: '',
      estimated_resolution: '',
      required_action: '',
      affected_areas: [],
      status: 'live',
      scheduled_date: ''
    });
    setSelectedAreas([]);
    await fetchAlerts();
  }
};
  const handleDeleteAlert = async (alertId: string) => {
    if (!window.confirm("Are you sure you want to delete this alert?")) return;

    const { error } = await supabase
      .from("local_alerts")
      .delete()
      .eq("id", alertId);

    if (error) {
      console.error("Error deleting alert:", error);
      alert("Failed to delete alert.");
    } else {
      alert("Alert deleted successfully!");
      await fetchAlerts();
    }
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        users (full_name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data);
    }
  };

  const fetchStats = async () => {
    const { count: pendingCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: progressCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    const { count: totalResolvedCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved");

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

    const change = yesterdayPending
      ? Math.round(((pendingCount || 0) - yesterdayPending) / yesterdayPending * 100)
      : 0;

    setStats({
      totalPending: pendingCount || 0,
      inProgress: progressCount || 0,
      totalResolved: totalResolvedCount || 0,
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
      other: 'Other',
      water_interruption: 'Water Interruption',
      power_outage: 'Power Outage',
      road_closure: 'Road Closure',
      weather: 'Weather Alert',
      health: 'Health Advisory',
      emergency: 'Emergency'
    };
    return labels[category] || category;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-orange-600';
      case 'advisory': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getUrgencyBg = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      case 'advisory': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

const handleEditAlert = (alert: any) => {
  // Convert ISO date back to datetime-local format for the input
  let scheduledDateLocal = '';
  if (alert.scheduled_date) {
    const date = new Date(alert.scheduled_date);
    // Format: YYYY-MM-DDTHH:mm (datetime-local format)
    scheduledDateLocal = date.toISOString().slice(0, 16);
  }

  setAlertForm({
    urgency: alert.urgency,
    category: alert.category,
    title: alert.title,
    description: alert.description,
    estimated_resolution: alert.estimated_resolution || '',
    required_action: alert.required_action || '',
    affected_areas: alert.affected_areas || [],
    status: alert.status,
    scheduled_date: scheduledDateLocal
  });
  setSelectedAreas(alert.affected_areas || []);
  setEditingAlertId(alert.id);
  setAlertsView("create");
};

const handleUpdateAlert = async () => {
  if (!alertForm.title || !alertForm.description || selectedAreas.length === 0) {
    alert("Please fill in all required fields and select at least one affected area.");
    return;
  }

  // Format scheduled_date properly
  let scheduledDate = null;
  if (alertForm.status === 'scheduled' && alertForm.scheduled_date) {
    scheduledDate = new Date(alertForm.scheduled_date).toISOString();
  }

  const { error } = await supabase
    .from("local_alerts")
    .update({
      urgency: alertForm.urgency,
      category: alertForm.category,
      title: alertForm.title,
      description: alertForm.description,
      estimated_resolution: alertForm.estimated_resolution,
      required_action: alertForm.required_action,
      affected_areas: selectedAreas,
      status: alertForm.status,
      scheduled_date: scheduledDate,  // Use the formatted date
    })
    .eq("id", editingAlertId);

  if (error) {
    console.error("Error updating alert:", error);
    alert("Failed to update alert. Please try again.");
  } else {
    alert("Alert updated successfully!");
    setAlertsView("list");
    setEditingAlertId(null);
    setAlertForm({
      urgency: 'critical',
      category: 'water_interruption',
      title: '',
      description: '',
      estimated_resolution: '',
      required_action: '',
      affected_areas: [],
      status: 'live',
      scheduled_date: ''
    });
    setSelectedAreas([]);
    await fetchAlerts();
  }
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

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    markersRef.current = [];

    mapRef.current.innerHTML = '<div id="admin-map" style="width: 100%; height: 100%;"></div>';

    await new Promise(resolve => setTimeout(resolve, 50));

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('admin-map').setView([14.8815, 120.8671], 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

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
      markersRef.current.forEach(({ marker }) => {
        marker.setOpacity(1);
      });
      mapInstanceRef.current.setView([14.8815, 120.8671], 12);
      setSelectedPriority(null);
    } else {
      const matchingMarkers: any[] = [];
      
      markersRef.current.forEach(({ marker, priority: markerPriority }) => {
        if (markerPriority === priority) {
          marker.setOpacity(1);
          matchingMarkers.push(marker);
        } else {
          marker.setOpacity(0.15);
        }
      });

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
      case 'withdrawn':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">WITHDRAWN</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">LIVE</span>;
      case 'scheduled':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">SCHEDULED</span>;
      case 'draft':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">DRAFT</span>;
      case 'expired':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">EXPIRED</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
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

  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    const matchesPriority = filterPriority === "all" || report.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || report.category === filterCategory;
    const matchesSearch = filterSearch === "" || report.users?.full_name?.toLowerCase().includes(filterSearch.toLowerCase());
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = alertFilterType === "all" || alert.urgency === alertFilterType;
    const matchesStatus = alertFilterStatus === "all" || alert.status === alertFilterStatus;
    const matchesSearch = alertFilterSearch === "" || alert.title?.toLowerCase().includes(alertFilterSearch.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const indexOfLastAlert = alertCurrentPage * alertsPerPage;
  const indexOfFirstAlert = indexOfLastAlert - alertsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstAlert, indexOfLastAlert);
  const totalAlertPages = Math.ceil(filteredAlerts.length / alertsPerPage);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
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

        {/* Dashboard Tab */}
        <main className={`flex-1 overflow-auto p-8 ${activeTab === "dashboard" ? "block" : "hidden"}`}>
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-6 mb-6">
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

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-xs font-medium text-green-600">All Time</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Total Resolved</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalResolved}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Reports</h2>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Citizen</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.slice(0, 4).map((report) => (
                        <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                                {report.users?.full_name?.[0] || 'U'}
                              </div>
                              <span className="font-medium text-gray-900 text-sm">{report.users?.full_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700 text-sm">{getCategoryLabel(report.category)}</td>
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

            <div className="w-96">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">Live Map View</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-red-600">LIVE</span>
                  </div>
                </div>

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

                <div className="relative">
                  <div ref={mapRef} className="w-full h-96 bg-gray-100"></div>
                  
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

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <main className="flex-1 overflow-auto p-8">
            <h1 className="text-2xl font-bold mb-6">All Reports</h1>

            <div className="bg-white rounded-xl shadow border p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search citizen..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">All Category</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="street_lighting">Street Lighting</option>
                  <option value="waste_management">Waste Management</option>
                  <option value="road_damage">Road Damage</option>
                  <option value="flooding">Flooding</option>
                  <option value="public_safety">Public Safety</option>
                  <option value="noise_pollution">Noise Pollution</option>
                  <option value="illegal_activity">Illegal Activity</option>
                  <option value="park_maintenance">Park Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="p-4 text-left">Citizen</th>
                    <th className="p-4 text-left">Category</th>
                    <th className="p-4 text-left">Priority</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReports.map(report => (
                    <tr key={report.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{report.users?.full_name}</td>
                      <td className="p-4">{getCategoryLabel(report.category)}</td>
                      <td className="p-4 capitalize">{report.priority}</td>
                      <td className="p-4">{getStatusBadge(report.status)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedReportId(report.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center px-6 py-4 border-t">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">{indexOfFirstReport + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(indexOfLastReport, filteredReports.length)}</span> of{" "}
                  <span className="font-medium">{filteredReports.length}</span> reports
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-lg border transition ${
                        currentPage === page ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <main className="flex-1 overflow-auto p-8">
            {alertsView === "list" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Local Alert Management</h1>
                    <p className="text-sm text-gray-500">Manage community alerts and emergency notifications</p>
                  </div>
                  <button
                    onClick={() => setAlertsView("create")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Alert
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow border p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search alerts..."
                        value={alertFilterSearch}
                        onChange={(e) => setAlertFilterSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <select
                      value={alertFilterType}
                      onChange={(e) => setAlertFilterType(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="all">All Urgency Levels</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="advisory">Advisory</option>
                    </select>
                    <select
                      value={alertFilterStatus}
                      onChange={(e) => setAlertFilterStatus(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="all">All Statuses</option>
                      <option value="live">Live</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="draft">Draft</option>  
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                        <th className="p-4 text-left">Title</th>
                        <th className="p-4 text-left">Category</th>
                        <th className="p-4 text-left">Urgency</th>
                        <th className="p-4 text-left">Date Created</th>
                        <th className="p-4 text-left">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAlerts.map(alert => {
                        const dateTime = formatDateTime(alert.created_at);
                        return (
                          <tr key={alert.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 font-medium text-gray-900">{alert.title}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {getCategoryLabel(alert.category)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className={`flex items-center gap-2 text-sm font-medium ${getUrgencyColor(alert.urgency)}`}>
                                <Circle className={`w-2.5 h-2.5 fill-current`} />
                                {alert.urgency.charAt(0).toUpperCase() + alert.urgency.slice(1)}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {dateTime.date}<br />
                              <span className="text-xs">{dateTime.time}</span>
                            </td>
                            <td className="p-4">{getAlertStatusBadge(alert.status)}</td>
                          <td className="p-4">
                            <div className="flex justify-center gap-3">
                              {/* Show edit button for all alerts */}
                              <button 
                                className="p-2 rounded hover:bg-blue-50 text-blue-600"
                                onClick={() => handleEditAlert(alert)}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 rounded hover:bg-red-50 text-red-600"
                                onClick={() => handleDeleteAlert(alert.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {indexOfFirstAlert + 1} to {Math.min(indexOfLastAlert, filteredAlerts.length)} of {filteredAlerts.length} alerts
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAlertCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={alertCurrentPage === 1}
                        className="p-2 border rounded hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalAlertPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setAlertCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm ${
                            alertCurrentPage === page ? "bg-blue-600 text-white" : "border hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setAlertCurrentPage(p => Math.min(p + 1, totalAlertPages))}
                        disabled={alertCurrentPage === totalAlertPages}
                        className="p-2 border rounded hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {alertsView === "create" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => {
                      setAlertsView("list");
                      setEditingAlertId(null);
                    }}
                    className="p-2 rounded-lg border hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {editingAlertId ? 'Edit Alert' : 'Create Emergency Alert'}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {editingAlertId ? 'Update alert information' : 'Broadcast important information to residents'}
                    </p>
                  </div>
                </div>

                <div className="max-w-5xl space-y-6">
                  <div className="bg-white rounded-xl shadow border p-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Alert Classification</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Urgency Level *</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAlertForm({...alertForm, urgency: 'critical'})}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                              alertForm.urgency === 'critical' 
                                ? 'border-red-500 bg-red-50 text-red-600' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            ● Critical
                          </button>
                          <button
                            onClick={() => setAlertForm({...alertForm, urgency: 'warning'})}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                              alertForm.urgency === 'warning' 
                                ? 'border-orange-500 bg-orange-50 text-orange-600' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            ● Warning
                          </button>
                          <button
                            onClick={() => setAlertForm({...alertForm, urgency: 'advisory'})}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                              alertForm.urgency === 'advisory' 
                                ? 'border-blue-500 bg-blue-50 text-blue-600' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            ● Advisory
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Alert Category *</label>
                        <select
                          value={alertForm.category}
                          onChange={(e) => setAlertForm({...alertForm, category: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="water_interruption">Water Interruption</option>
                          <option value="power_outage">Power Outage</option>
                          <option value="road_closure">Road Closure</option>
                          <option value="weather">Weather Alert</option>
                          <option value="health">Health Advisory</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={`relative bg-white rounded-xl shadow border p-6 space-y-4`}>
                    <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${getUrgencyBg(alertForm.urgency)}`} />
                    <h2 className="text-sm font-semibold text-gray-700">Alert Content</h2>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Alert Title *</label>
                      <input
                        value={alertForm.title}
                        onChange={(e) => setAlertForm({...alertForm, title: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="e.g., Emergency Water Main Repair"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Detailed Description *</label>
                      <textarea
                        value={alertForm.description}
                        onChange={(e) => setAlertForm({...alertForm, description: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Describe the situation and provide important details..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <label className="block text-xs font-medium text-blue-700 mb-1">Estimated Resolution</label>
                        <input
                          value={alertForm.estimated_resolution}
                          onChange={(e) => setAlertForm({...alertForm, estimated_resolution: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                          placeholder="e.g., 10:00 PM Tonight"
                        />
                      </div>

                      <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                        <label className="block text-xs font-medium text-red-700 mb-1">Required Action</label>
                        <input
                          value={alertForm.required_action}
                          onChange={(e) => setAlertForm({...alertForm, required_action: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                          placeholder="e.g., Store water for emergency use"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow border p-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Affected Areas *</h2>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Select Barangay(s)</label>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedAreas.map(area => (
                        <span key={area} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs flex items-center gap-1">
                          {area}
                          <button onClick={() => toggleArea(area)} className="hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setShowAreaDropdown(!showAreaDropdown)}
                        className="px-3 py-1 border border-dashed rounded-full text-xs text-gray-500 hover:bg-gray-50"
                      >
                        + Add Area
                      </button>
                    </div>

                    {showAreaDropdown && (
                      <div className="border rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50">
                        <div className="grid grid-cols-2 gap-1">
                          {barangayList.map(area => (
                            <label key={area} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedAreas.includes(area)}
                                onChange={() => toggleArea(area)}
                                className="rounded"
                              />
                              <span className="text-sm">{area}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Residents in selected areas will receive notifications
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow border p-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Publishing Options</h2>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={alertForm.status === 'live'}
                          onChange={() => setAlertForm({...alertForm, status: 'live', scheduled_date: ''})}
                          className="text-blue-600"
                        />
                        <span className="text-sm">Post Immediately</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={alertForm.status === 'scheduled'}
                          onChange={() => setAlertForm({...alertForm, status: 'scheduled'})}
                          className="text-blue-600"
                        />
                        <span className="text-sm">Schedule for Later</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={alertForm.status === 'draft'}
                          onChange={() => setAlertForm({...alertForm, status: 'draft'})}
                          className="text-blue-600"
                        />
                        <span className="text-sm">Save as Draft</span>
                      </label>
                    </div>

                    {alertForm.status === 'scheduled' && (
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Schedule Date & Time</label>
                        <input
                          type="datetime-local"
                          value={alertForm.scheduled_date}
                          onChange={(e) => setAlertForm({...alertForm, scheduled_date: e.target.value})}
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>

                 <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setAlertsView("list");
                        setEditingAlertId(null);
                      }}
                      className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingAlertId ? handleUpdateAlert : handleCreateAlert}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      {editingAlertId 
                        ? 'Update Alert' 
                        : alertForm.status === 'live' 
                          ? 'Post Alert' 
                          : alertForm.status === 'scheduled' 
                            ? 'Schedule Alert' 
                            : 'Save Draft'
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;