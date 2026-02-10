import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import AdminReportDetails from "./components/AdminReportDetails";
import {
  LayoutDashboard, FileText, Bell, Users, Search, BellRing, LogOut, TrendingUp, Clock, CheckCircle, MapPin,
  Plus, Minus, Locate, Pencil, Trash2, ChevronLeft, ChevronRight, Circle, X, AlertTriangle, Info,
  View, Eye, Trees, Copy, Upload
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

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsView, setAnnouncementsView] = useState("list");
  const [announcementForm, setAnnouncementForm] = useState({
     title: '',
      description: '',
      category: 'general_news',
      status: 'published',
      scheduled_date: '',
      location: '',
      author: ''
  });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementFilterCategory, setAnnouncementFilterCategory] = useState("all");
  const [announcementFilterStatus, setAnnouncementFilterStatus] = useState("all");
  const [announcementCurrentPage, setAnnouncementCurrentPage] = useState(1);
  const announcementsPerPage = 10;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [viewingAnnouncementId, setViewingAnnouncementId] = useState<string | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [mapMarker, setMapMarker] = useState<any>(null);
  const announcementMapRef = useRef<HTMLDivElement>(null);
  const announcementMapInstanceRef = useRef<any>(null);

  // Add filtering logic (place this before the return statement):
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesCategory = announcementFilterCategory === "all" || announcement.category === announcementFilterCategory;
    const matchesStatus = announcementFilterStatus === "all" || announcement.status === announcementFilterStatus;
    return matchesCategory && matchesStatus;
  });

  // Calculate pagination
  const indexOfLastAnnouncement = announcementCurrentPage * announcementsPerPage;
  const indexOfFirstAnnouncement = indexOfLastAnnouncement - announcementsPerPage;
  const currentAnnouncements = filteredAnnouncements.slice(indexOfFirstAnnouncement, indexOfLastAnnouncement);
  const totalAnnouncementPages = Math.ceil(filteredAnnouncements.length / announcementsPerPage);
  
  const [showParkLocationMap, setShowParkLocationMap] = useState(false);
  const [parkMapMarker, setParkMapMarker] = useState<any>(null);
  const parkMapRef = useRef<HTMLDivElement>(null);
  const parkMapInstanceRef = useRef<any>(null);


  // User Management state
const [users, setUsers] = useState<any[]>([]);
const [usersView, setUsersView] = useState("list");
const [userFilterStatus, setUserFilterStatus] = useState("all");
const [userFilterRole, setUserFilterRole] = useState("all");
const [userSearchQuery, setUserSearchQuery] = useState("");
const [userCurrentPage, setUserCurrentPage] = useState(1);
const usersPerPage = 10;
const [viewingUserId, setViewingUserId] = useState<string | null>(null);


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

  // Parks state - ADD THIS
const [parks, setParks] = useState<any[]>([]);
const [parksView, setParksView] = useState("list");
const [editingParkId, setEditingParkId] = useState<string | null>(null);
const [parkForm, setParkForm] = useState({
  name: '',
  physical_address: '',
  description: '',
  amenities: [] as string[],
  operating_hours: '',  // Simple text field now!
  images: [] as string[],
  is_active: true
});
const [parkImages, setParkImages] = useState<File[]>([]);
const [uploadingImages, setUploadingImages] = useState(false);
const [existingImagesToDelete, setExistingImagesToDelete] = useState<string[]>([]);
const [newImagesToUpload, setNewImagesToUpload] = useState<File[]>([]);

const availableAmenities = [
  'Hiking Trails', 'Benches', 'Lake', 'Garden', 'Picnic Area',
  'Public Restroom', 'WiFi Zone', 'Parking Lot', 'Playground', 'Sports Court'
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
      await fetchAnnouncements(); 
      await fetchParks();
      await fetchUsers();
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

  useEffect(() => {
  if (showLocationMap && announcementMapRef.current) {
    setTimeout(() => initAnnouncementMap(), 100);
  }
}, [showLocationMap]);

useEffect(() => {
  if (showParkLocationMap && parkMapRef.current) {
    setTimeout(() => initParkMap(), 100);
  }
}, [showParkLocationMap]);


const initParkMap = () => {
  if (!parkMapRef.current) return;
  
  const L = (window as any).L;
  if (!L) {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => renderParkMap();
    document.head.appendChild(script);
  } else {
    renderParkMap();
  }
};

const renderParkMap = () => {
  if (!parkMapRef.current) return;
  
  const L = (window as any).L;
  if (!L) return;

  if (parkMapInstanceRef.current) {
    parkMapInstanceRef.current.remove();
  }

  parkMapRef.current.innerHTML = '<div id="park-map-container" style="width: 100%; height: 100%;"></div>';

  setTimeout(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('park-map-container').setView([14.8815, 120.8671], 13);
    parkMapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let marker: any = null;

    map.on('click', function(e: any) {
      const { lat, lng } = e.latlng;
      
      if (marker) {
        map.removeLayer(marker);
      }
      
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      setParkMapMarker(marker);
      
      marker.on('dragend', function(e: any) {
        const position = e.target.getLatLng();
        reverseGeocodeForPark(position.lat, position.lng);
      });
      
      reverseGeocodeForPark(lat, lng);
    });

    setTimeout(() => map.invalidateSize(), 100);
  }, 50);
};

const reverseGeocodeForPark = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    if (data.display_name) {
      setParkForm({...parkForm, physical_address: data.display_name});
    }
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    setParkForm({...parkForm, physical_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`});
  }
};

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

  const fetchAnnouncements = async () => {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    setAnnouncements(data);
  }
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

  // Update yesterday pending to exclude resolved
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




const handleCreateAnnouncement = async () => {
  if (!announcementForm.title || !announcementForm.description) {
    alert("Please fill in all required fields.");
    return;
  }

  // Validate scheduled date if status is scheduled
  if (announcementForm.status === 'scheduled' && !announcementForm.scheduled_date) {
    alert("Please select a date and time for the scheduled announcement.");
    return;
  }

  // Use scheduled_date if provided, otherwise use current time
  let scheduledDate = announcementForm.scheduled_date 
    ? new Date(announcementForm.scheduled_date).toISOString()
    : new Date().toISOString();

  const { error } = await supabase
    .from("announcements")
    .insert([{
      title: announcementForm.title,
      description: announcementForm.description,
      category: announcementForm.category,
      status: announcementForm.status,
      scheduled_date: scheduledDate,
      location: announcementForm.location,
      author: user.full_name,
      created_by: user.id
    }]);

 if (error) {
  console.error("Error creating announcement:", error);
  alert("Failed to create announcement.");
} else {
  alert("Announcement created successfully!");
  setAnnouncementsView("list");
  
  // Clean up map
  setShowLocationMap(false);
  if (mapMarker && announcementMapInstanceRef.current) {
    announcementMapInstanceRef.current.removeLayer(mapMarker);
    setMapMarker(null);
  }
  if (announcementMapInstanceRef.current) {
    announcementMapInstanceRef.current.remove();
    announcementMapInstanceRef.current = null;
  }
  
  setAnnouncementForm({
    title: '',
    description: '',
    category: 'general_news',
    status: 'published',
    scheduled_date: '',
    location: '', 
    author: ''
  });
  await fetchAnnouncements();
}
};


const handleEditAnnouncement = (announcement: any) => {
  let scheduledDateLocal = '';
  if (announcement.scheduled_date) {
const date = new Date(announcement.scheduled_date);

scheduledDateLocal = `${date.getFullYear()}-${String(
  date.getMonth() + 1
).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(
  date.getHours()
).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  setAnnouncementForm({
    title: announcement.title,
    description: announcement.description,
    category: announcement.category,
    status: announcement.status,
    scheduled_date: scheduledDateLocal,
     location: announcement.location || '',
    author: announcement.author
  });
  setEditingAnnouncementId(announcement.id);
  setAnnouncementsView("create");
};

const handleUpdateAnnouncement = async () => {
  if (!announcementForm.title || !announcementForm.description) {
    alert("Please fill in all required fields.");
    return;
  }

  let scheduledDate = announcementForm.scheduled_date 
    ? new Date(announcementForm.scheduled_date).toISOString()
    : null;

  const { error } = await supabase
    .from("announcements")
    .update({
      title: announcementForm.title,
      description: announcementForm.description,
      category: announcementForm.category,
      status: announcementForm.status,
      scheduled_date: scheduledDate,
      location: announcementForm.location, 
    })
    .eq("id", editingAnnouncementId);

  if (error) {
    console.error("Error updating announcement:", error);
    alert("Failed to update announcement.");
  } else {
    alert("Announcement updated successfully!");
    setAnnouncementsView("list");
    setEditingAnnouncementId(null);
    
    // Clean up map
    setShowLocationMap(false);
    if (mapMarker && announcementMapInstanceRef.current) {
      announcementMapInstanceRef.current.removeLayer(mapMarker);
      setMapMarker(null);
    }
    if (announcementMapInstanceRef.current) {
      announcementMapInstanceRef.current.remove();
      announcementMapInstanceRef.current = null;
    }
    
    setAnnouncementForm({
      title: '',
      description: '',
      category: 'general_news',
      status: 'published',
      scheduled_date: '',
      location: '', 
      author: ''
    });
    await fetchAnnouncements();
  }
};

const handleDeleteAnnouncement = async (announcementId: string) => {
  if (!window.confirm("Are you sure you want to delete this announcement?")) return;

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) {
    console.error("Error deleting announcement:", error);
    alert("Failed to delete announcement.");
  } else {
    alert("Announcement deleted successfully!");
    await fetchAnnouncements();
  }
};

const getCategoryBadge = (category: string) => {
  const badges: { [key: string]: { bg: string, text: string, label: string } } = {
    council_meeting: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'COUNCIL MEETING' },
    utility_update: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'UTILITY UPDATE' },
    general_news: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'GENERAL NEWS' },
    event: { bg: 'bg-green-100', text: 'text-green-700', label: 'EVENT' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'MAINTENANCE' }
  };
  
  const badge = badges[category] || badges.general_news;
  return <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>{badge.label}</span>;
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

  const initAnnouncementMap = () => {
  if (!announcementMapRef.current) return;
  
  const L = (window as any).L;
  if (!L) {
    // Load Leaflet if not already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => renderAnnouncementMap();
    document.head.appendChild(script);
  } else {
    renderAnnouncementMap();
  }
};

const renderAnnouncementMap = () => {
  if (!announcementMapRef.current) return;
  
  const L = (window as any).L;
  if (!L) return;

  if (announcementMapInstanceRef.current) {
    announcementMapInstanceRef.current.remove();
  }

  // Clear and setup container
  announcementMapRef.current.innerHTML = '<div id="announcement-map-container" style="width: 100%; height: 100%;"></div>';

  // Wait a bit for DOM to be ready
  setTimeout(() => {
    // Fix Leaflet default icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('announcement-map-container').setView([14.8815, 120.8671], 13);
    announcementMapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Create initial marker (can be null to start without one)
    let marker: any = null;

    // Click on map to place/move marker
    map.on('click', function(e: any) {
      const { lat, lng } = e.latlng;
      
      // Remove old marker if exists
      if (marker) {
        map.removeLayer(marker);
      }
      
      // Create new marker at clicked position
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      setMapMarker(marker);
      
      // Enable marker dragging
      marker.on('dragend', function(e: any) {
        const position = e.target.getLatLng();
        reverseGeocodeForAnnouncement(position.lat, position.lng);
      });
      
      // Reverse geocode to get address
      reverseGeocodeForAnnouncement(lat, lng);
    });

    setTimeout(() => map.invalidateSize(), 100);
  }, 50);
};

// Add reverse geocoding function for announcements
const reverseGeocodeForAnnouncement = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    if (data.display_name) {
      setAnnouncementForm({...announcementForm, location: data.display_name});
    }
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    setAnnouncementForm({...announcementForm, location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`});
  }
};

const handleToggleAnnouncementStatus = async (announcementId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'published' ? 'draft' : 'published';
  
  const { error } = await supabase
    .from("announcements")
    .update({ status: newStatus })
    .eq("id", announcementId);

  if (error) {
    console.error("Error updating announcement status:", error);
    alert("Failed to update status. Please try again.");
  } else {
    const message = newStatus === 'published' 
      ? "Announcement published successfully!" 
      : "Announcement saved as draft.";
    alert(message);
    await fetchAnnouncements();
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
      .select("*")
      .eq("status", "pending"); 

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

  const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  return { daysInMonth, startingDayOfWeek };
};

const goToNextMonth = () => {
  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
};

const goToPreviousMonth = () => {
  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
};

const getAnnouncementsForDate = (date: Date) => {
  return announcements.filter(ann => {
    if (ann.status !== 'published') return false;
    const annDate = new Date(ann.scheduled_date || ann.created_at);
    return annDate.getDate() === date.getDate() &&
           annDate.getMonth() === date.getMonth() &&
           annDate.getFullYear() === date.getFullYear();
  });
};

// ADD THIS FUNCTION
const fetchParks = async () => {
  const { data, error } = await supabase
    .from("parks")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    setParks(data);
  }
};

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    setUsers(data);
  }
};
// Parks functions - ADD ALL OF THESE

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  const fileArray = Array.from(files);
  
  // Validate file sizes (max 5MB each)
  const validFiles = fileArray.filter(file => {
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} is too large. Max size is 5MB.`);
      return false;
    }
    return true;
  });

  setParkImages(prev => [...prev, ...validFiles]);
};

const removeImage = (index: number) => {
  setParkImages(prev => prev.filter((_, i) => i !== index));
};

const toggleAmenity = (amenity: string) => {
  setParkForm(prev => ({
    ...prev,
    amenities: prev.amenities.includes(amenity)
      ? prev.amenities.filter(a => a !== amenity)
      : [...prev.amenities, amenity]
  }));
};

const handleCreatePark = async () => {
  if (!parkForm.name || !parkForm.physical_address) {
    alert("Please fill in required fields (name and address).");
    return;
  }

  if (parkImages.length === 0) {
    const confirm = window.confirm("No images selected. Continue without images?");
    if (!confirm) return;
  }

  setUploadingImages(true);

  try {
    const imageUrls: string[] = [];
    
    console.log('🚀 Starting upload process...');
    console.log(`📦 Files to upload: ${parkImages.length}`);
    
    // Upload each image to Supabase Storage
    for (let i = 0; i < parkImages.length; i++) {
      const file = parkImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `parks/${fileName}`;

      console.log(`📤 Uploading ${i + 1}/${parkImages.length}: ${file.name}`);
      console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Path: ${filePath}`);

      // CRITICAL: Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('park-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        console.error('   Error message:', uploadError.message);
        console.error('   Error details:', JSON.stringify(uploadError, null, 2));
        
        // Show specific error to user
        alert(`Failed to upload ${file.name}: ${uploadError.message}`);
        throw uploadError;
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('park-images')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', urlData?.publicUrl);

      if (urlData?.publicUrl) {
        imageUrls.push(urlData.publicUrl);
      } else {
        console.error('❌ Failed to get public URL');
        throw new Error('Failed to get public URL for uploaded image');
      }
    }

    console.log('✅ All images uploaded successfully!');
    console.log('📋 Image URLs:', imageUrls);

    // Create park record with image URLs
    const { error: dbError } = await supabase
      .from("parks")
      .insert([{
        name: parkForm.name,
        physical_address: parkForm.physical_address,
        description: parkForm.description,
        amenities: parkForm.amenities,
        operating_hours: parkForm.operating_hours,
        images: imageUrls,
        is_active: parkForm.is_active,
        created_by: user.id
      }]);

    setUploadingImages(false);

    if (dbError) {
      console.error("❌ Database error:", dbError);
      alert("Images uploaded but failed to save park. Please try again.");
      
      // Clean up uploaded images
      for (const url of imageUrls) {
        const path = url.split('/').pop();
        if (path) {
          await supabase.storage.from('park-images').remove([`parks/${path}`]);
        }
      }
    } else {
      console.log('🎉 Park created successfully!');
      alert("Park created successfully with images!");
      // Clean up map
      setShowParkLocationMap(false);
      if (parkMapMarker && parkMapInstanceRef.current) {
        parkMapInstanceRef.current.removeLayer(parkMapMarker);
        setParkMapMarker(null);
      }
      if (parkMapInstanceRef.current) {
        parkMapInstanceRef.current.remove();
        parkMapInstanceRef.current = null;
      }
      setParksView("list");
      
      // Reset form
      setParkForm({
        name: '',
        physical_address: '',
        description: '',
        amenities: [],
        operating_hours: '',
        images: [],
        is_active: true
      });
      setParkImages([]);
      setExistingImagesToDelete([]);
      setNewImagesToUpload([]);
      await fetchParks();
    }
  } catch (error: any) {
    setUploadingImages(false);
    console.error("💥 Fatal error:", error);
    alert(`Failed to create park: ${error.message || 'Unknown error'}`);
  }
};

const handleEditPark = (park: any) => {
  setParkForm({
    name: park.name,
    physical_address: park.physical_address,
    description: park.description || '',
    amenities: park.amenities || [],
    operating_hours: park.operating_hours || '',  // Simple string!
    images: park.images || [],
    is_active: park.is_active
  });
  setEditingParkId(park.id);
  setParkImages([]);
  setExistingImagesToDelete([]);
  setParksView("create");
};;

const handleUpdatePark = async () => {
  if (!parkForm.name || !parkForm.physical_address) {
    alert("Please fill in required fields (name and address).");
    return;
  }

  setUploadingImages(true);

  try {
    const newImageUrls: string[] = [];
    
    console.log('🚀 Starting update process...');
    console.log(`📦 New files to upload: ${parkImages.length}`);
    
    // Upload new images
    for (let i = 0; i < parkImages.length; i++) {
      const file = parkImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `parks/${fileName}`;

      console.log(`📤 Uploading ${i + 1}/${parkImages.length}: ${file.name}`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('park-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        alert(`Failed to upload ${file.name}: ${uploadError.message}`);
        throw uploadError;
      }

      console.log('✅ Upload successful');

      const { data: urlData } = supabase.storage
        .from('park-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        newImageUrls.push(urlData.publicUrl);
      }
    }

    console.log(`🗑️  Deleting ${existingImagesToDelete.length} old images...`);

    // Delete removed images from storage
    for (const imageUrl of existingImagesToDelete) {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `parks/${fileName}`;
      
      console.log(`🗑️  Deleting: ${fileName}`);
      
      const { error: deleteError } = await supabase.storage
        .from('park-images')
        .remove([filePath]);
        
      if (deleteError) {
        console.error('⚠️  Delete failed (non-critical):', deleteError);
      } else {
        console.log('✅ Deleted successfully');
      }
    }

    // Combine existing images with new ones
    const finalImages = [...parkForm.images, ...newImageUrls];

    console.log(`📊 Final image count: ${finalImages.length}`);

    // Update park record
    const { error: dbError } = await supabase
      .from("parks")
      .update({
        name: parkForm.name,
        physical_address: parkForm.physical_address,
        description: parkForm.description,
        amenities: parkForm.amenities,
        operating_hours: parkForm.operating_hours,
        images: finalImages,
        is_active: parkForm.is_active
      })
      .eq("id", editingParkId);

    setUploadingImages(false);

    if (dbError) {
      console.error("❌ Database error:", dbError);
      alert("Failed to update park.");
    } else {
      console.log('🎉 Park updated successfully!');
      alert("Park updated successfully!");
      // Clean up map
      setShowParkLocationMap(false);
      if (parkMapMarker && parkMapInstanceRef.current) {
        parkMapInstanceRef.current.removeLayer(parkMapMarker);
        setParkMapMarker(null);
      }
      if (parkMapInstanceRef.current) {
        parkMapInstanceRef.current.remove();
        parkMapInstanceRef.current = null;
      }
      setParksView("list");
      setEditingParkId(null);
      
      // Reset form
      setParkForm({
        name: '',
        physical_address: '',
        description: '',
        amenities: [],
        operating_hours: '',
        images: [],
        is_active: true
      });
      setParkImages([]);
      setExistingImagesToDelete([]);
      setNewImagesToUpload([]);
      await fetchParks();
    }
  } catch (error: any) {
    setUploadingImages(false);
    console.error("💥 Fatal error:", error);
    alert(`Failed to update park: ${error.message || 'Unknown error'}`);
  }
};

const handleDeletePark = async (parkId: string) => {
  if (!window.confirm("Are you sure you want to delete this park?")) return;

  const { error } = await supabase
    .from("parks")
    .delete()
    .eq("id", parkId);

  if (error) {
    console.error("Error deleting park:", error);
    alert("Failed to delete park.");
  } else {
    alert("Park deleted successfully!");
    await fetchParks();
  }
};

const toggleParkStatus = async (parkId: string, currentStatus: boolean) => {
  const { error } = await supabase
    .from("parks")
    .update({ is_active: !currentStatus })
    .eq("id", parkId);

  if (error) {
    console.error("Error updating park status:", error);
    alert("Failed to update status.");
  } else {
    alert(`Park ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    await fetchParks();
  }
};


const handleToggleAdminStatus = async (userId: string, currentStatus: boolean) => {
  if (!window.confirm(`Are you sure you want to ${currentStatus ? 'remove admin privileges from' : 'grant admin privileges to'} this user?`)) return;

  const { error } = await supabase
    .from("users")
    .update({ is_admin: !currentStatus })
    .eq("id", userId);

  if (error) {
    console.error("Error updating admin status:", error);
    alert("Failed to update admin status.");
  } else {
    alert(`User ${!currentStatus ? 'promoted to' : 'removed from'} admin successfully!`);
    await fetchUsers();
  }
};

const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
  if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;

  const { error } = await supabase
    .from("users")
    .update({ is_active: !currentStatus })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user status:", error);
    alert("Failed to update user status.");
  } else {
    alert(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    await fetchUsers();
  }
};

const getUserStats = () => {
  return {
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    admins: users.filter(u => u.is_admin).length,
    regular: users.filter(u => !u.is_admin).length
  };
};0

const priorityCounts = {
  high: reports.filter(r => r.priority === 'high' && r.status === 'pending').length,
  medium: reports.filter(r => r.priority === 'medium' && r.status === 'pending').length,
  low: reports.filter(r => r.priority === 'low' && r.status === 'pending').length
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
            onClick={() => setActiveTab("announcements")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
              activeTab === "announcements" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="font-medium">Announcements</span>
          </button>
          <button
            onClick={() => setActiveTab("parks")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
              activeTab === "parks" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Trees className="w-5 h-5" />
            <span className="font-medium">Local Attractions</span>
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
                  {reports.filter(r => r.status !== 'resolved').slice(0, 4).map((report) => (
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Date & Time</label>
                      <input
                        type="datetime-local"
                        value={announcementForm.scheduled_date}
                        onChange={(e) => setAnnouncementForm({...announcementForm, scheduled_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">This will appear on the community calendar</p>
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

        
        {/* Announcements Tab */}
            {activeTab === "announcements" && (
              <main className="flex-1 overflow-auto p-8">
                <div className="flex gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    {announcementsView === "list" && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h1 className="text-2xl font-bold text-gray-900">Published Announcements</h1>
                            <p className="text-sm text-gray-500">Create, edit and manage community-wide broadcasts.</p>
                          </div>
                          <button
                            onClick={() => setAnnouncementsView("create")}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                            Create New
                          </button>
                        </div>

                      <div className="bg-white rounded-xl shadow border p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <select
                            value={announcementFilterCategory}
                            onChange={(e) => {
                              setAnnouncementFilterCategory(e.target.value);
                              setAnnouncementCurrentPage(1); 
                            }}
                            className="px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="all">All Categories</option>
                            <option value="general_news">General News</option>
                            <option value="council_meeting">Council Meeting</option>
                            <option value="utility_update">Utility Update</option>
                            <option value="event">Event</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                          <select
                            value={announcementFilterStatus}
                            onChange={(e) => {
                              setAnnouncementFilterStatus(e.target.value);
                              setAnnouncementCurrentPage(1); 
                            }}
                            className="px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                          </select>
                        </div>
                      </div>

                    <div className="bg-white rounded-xl shadow border overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Announcement Details</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Author</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                     <tbody>
                        {currentAnnouncements.map(announcement => {
                          const dateTime = formatDateTime(announcement.created_at);
                          return (
                            <tr key={announcement.id} className="border-b hover:bg-gray-50">
                              <td className="p-4">
                                <div className="font-semibold text-gray-900">{announcement.title}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Published {dateTime.date} • ID: ANN-{announcement.id.slice(0, 4)}
                                </div>
                              </td>
                              <td className="p-4">{getCategoryBadge(announcement.category)}</td>
                              <td className="p-4 text-sm text-gray-700">{announcement.author || 'Admin'}</td>
                              <td className="p-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={announcement.status === 'published'}
                                    onChange={() => handleToggleAnnouncementStatus(announcement.id, announcement.status)}
                                    className="sr-only peer" 
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <div className={`text-xs font-medium mt-1 ${announcement.status === 'published' ? 'text-blue-600' : 'text-gray-600'}`}>
                                  {announcement.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex justify-center gap-2">
                                  <button 
                                    onClick={() => setViewingAnnouncementId(announcement.id)}
                                    className="p-2 rounded hover:bg-blue-50 text-blue-600"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                                    className="p-2 rounded hover:bg-red-50 text-red-600"
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
                          Showing <span className="font-medium">{indexOfFirstAnnouncement + 1}</span> to{" "}
                          <span className="font-medium">{Math.min(indexOfLastAnnouncement, filteredAnnouncements.length)}</span> of{" "}
                          <span className="font-medium">{filteredAnnouncements.length}</span> announcements
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAnnouncementCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={announcementCurrentPage === 1}
                            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          {Array.from({ length: totalAnnouncementPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setAnnouncementCurrentPage(page)}
                              className={`px-3 py-1 rounded text-sm ${
                                announcementCurrentPage === page 
                                  ? "bg-blue-600 text-white" 
                                  : "border hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setAnnouncementCurrentPage(p => Math.min(p + 1, totalAnnouncementPages))}
                            disabled={announcementCurrentPage === totalAnnouncementPages}
                            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

            {announcementsView === "create" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => {
                      setAnnouncementsView("list");
                      setEditingAnnouncementId(null);
                      setShowLocationMap(false);

                      // Clean up map
                    if (mapMarker && announcementMapInstanceRef.current) {
                      announcementMapInstanceRef.current.removeLayer(mapMarker);
                      setMapMarker(null);
                    }
                    if (announcementMapInstanceRef.current) {
                      announcementMapInstanceRef.current.remove();
                      announcementMapInstanceRef.current = null;
                    }
                  }}
              
                    className="p-2 rounded-lg border hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {editingAnnouncementId ? 'Edit Announcement' : 'Create New Announcement'}
                    </h1>
                    <p className="text-sm text-gray-500">Broadcast information to the community</p>
                  </div>
                </div>

                <div className="max-w-3xl space-y-6">
                  <div className="bg-white rounded-xl shadow border p-6 space-y-4">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                      <input
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter announcement title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                      <textarea
                        value={announcementForm.description}
                        onChange={(e) => setAnnouncementForm({...announcementForm, description: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter announcement details"
                      />
                    </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <div className="flex gap-2">
                          <input
                            value={announcementForm.location}
                            onChange={(e) => {
                              setAnnouncementForm({...announcementForm, location: e.target.value});
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            placeholder="e.g., City Hall Conference Room B, West Park Main Entry"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowLocationMap(!showLocationMap);
                              if (!showLocationMap) {
                                // Wait for map to show, then render it
                                setTimeout(() => {
                                  if (announcementMapRef.current) {
                                    renderAnnouncementMap();
                                  }
                                }, 100);
                              }
                            }}
                            className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                              showLocationMap ? 'bg-blue-50 border-blue-500 text-blue-600' : 'hover:bg-gray-50'
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                            {showLocationMap ? 'Hide Map' : 'Pick on Map'}
                          </button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {showLocationMap 
                            ? 'Click anywhere on the map or drag the marker to select the event location' 
                            : 'Type the location or use the map picker'}
                        </p>
                            
                          {showLocationMap && (
                        <div className="mt-3 border rounded-lg overflow-hidden relative">
                          {/* Drop Pin Indicator */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-12 z-10 flex flex-col items-center pointer-events-none">
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg mb-1">
                              CLICK TO PIN LOCATION
                            </div>
                            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                          </div>

                          {/* Map Container */}
                          <div ref={announcementMapRef} className="w-full h-80"></div>
                          
                          {/* Map Footer */}
                          <div className="bg-gray-50 p-3 border-t flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              {mapMarker ? '✓ Location selected - Drag marker to adjust' : 'Click anywhere on the map to select location'}
                            </span>
                            {mapMarker && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (announcementMapInstanceRef.current && mapMarker) {
                                    announcementMapInstanceRef.current.removeLayer(mapMarker);
                                    setMapMarker(null);
                                    setAnnouncementForm({...announcementForm, location: ''});
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 font-medium text-xs"
                              >
                                Clear Location
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                          <select
                            value={announcementForm.category}
                            onChange={(e) => setAnnouncementForm({...announcementForm, category: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="general_news">General News</option>
                            <option value="council_meeting">Council Meeting</option>
                            <option value="utility_update">Utility Update</option>
                            <option value="event">Event</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Date & Time {announcementForm.status === 'scheduled' && '*'}
                    </label>
                    <input
                      type="datetime-local"
                      value={announcementForm.scheduled_date}
                      onChange={(e) => setAnnouncementForm({...announcementForm, scheduled_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={new Date().toISOString().slice(0, 16)} // Prevents selecting past dates
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {announcementForm.scheduled_date 
                        ? `This event will appear on ${new Date(announcementForm.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(announcementForm.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                        : 'Select when this event will take place (appears on community calendar)'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publishing Status</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={announcementForm.status === 'published'}
                          onChange={() => setAnnouncementForm({...announcementForm, status: 'published'})}
                        />
                        <span>Publish Now</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={announcementForm.status === 'draft'}
                          onChange={() => setAnnouncementForm({...announcementForm, status: 'draft'})}
                        />
                        <span>Save as Draft</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {announcementForm.status === 'published' && 'Announcement will be visible immediately'}
                      {announcementForm.status === 'draft' && 'Save without publishing'}
                    </p>
                  </div>

              </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        setAnnouncementsView("list");
                        setEditingAnnouncementId(null);
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingAnnouncementId ? handleUpdateAnnouncement : handleCreateAnnouncement}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingAnnouncementId ? 'Update' : 'Create'} Announcement
                    </button>
                  </div>
            </div>
          </>
        )}
      </div>

        {/* Calendar Sidebar */}
        <div className="w-80">
          <div className="bg-white rounded-xl shadow border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-gray-500">COMMUNITY CALENDAR</p>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={goToPreviousMonth}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={goToNextMonth}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mini Calendar */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">{day}</div>
              ))}
              
              {(() => {
                const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
                const days = [];
                
                // Empty cells for days before month starts
                for (let i = 0; i < startingDayOfWeek; i++) {
                  days.push(<div key={`empty-${i}`} className="text-center text-sm py-2"></div>);
                }
                
                // Actual days of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  const hasEvents = getAnnouncementsForDate(date).length > 0;
                  
                  days.push(
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`text-center text-sm py-2 rounded hover:bg-gray-100 relative transition-colors ${
                        isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : 
                        isSelected ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600' :
                        'text-gray-700'
                      }`}
                    >
                      {day}
                      {hasEvents && !isToday && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                      )}
                    </button>
                  );
                }
                
                return days;
              })()}
            </div>

          <div className="border-t pt-4">
            <div className="mb-3">
              <h4 className="font-semibold text-sm text-gray-900">
                {selectedDate 
                  ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                  : 'UPCOMING EVENTS'
                }
              </h4>
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  View all events
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                const eventsToShow = selectedDate 
                  ? getAnnouncementsForDate(selectedDate)
                  : announcements
                      .filter(ann => ann.status === 'published')
                      .sort((a, b) => {
                        const dateA = new Date(a.scheduled_date || a.created_at).getTime();
                        const dateB = new Date(b.scheduled_date || b.created_at).getTime();
                        return dateA - dateB;
                      })
                      .slice(0, 3);

                if (eventsToShow.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {selectedDate 
                        ? 'No events scheduled for this date'
                        : 'No scheduled events'
                      }
                    </div>
                  );
                }

              return eventsToShow.map(announcement => {
                const eventDate = new Date(announcement.scheduled_date || announcement.created_at);
                const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day = eventDate.getDate();
                const time = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                
                  return (
                    <div key={announcement.id} className="flex gap-3">
                      <div className="text-center bg-blue-600 text-white rounded-lg p-2 w-12 h-12 flex flex-col items-center justify-center flex-shrink-0">
                        <div className="text-xs font-medium">{month}</div>
                        <div className="text-lg font-bold">{day}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{announcement.title}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 flex-shrink-0" /> {time}
                        </div>
                        {announcement.location && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> 
                            <span className="truncate">{announcement.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {!selectedDate && announcements.filter(ann => ann.status === 'published').length > 5 && (
              <button className="w-full mt-4 text-center text-sm text-blue-600 hover:underline">
                View Full Schedule →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* View Announcement Modal */}
          {viewingAnnouncementId && (() => {
            const announcement = announcements.find(a => a.id === viewingAnnouncementId);
            if (!announcement) return null;
            
            const dateTime = formatDateTime(announcement.scheduled_date || announcement.created_at);
            
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Announcement Details</h2>
                    <button
                      onClick={() => setViewingAnnouncementId(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryBadge(announcement.category)}
                        {getAlertStatusBadge(announcement.status)}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{announcement.title}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Date</div>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {dateTime.date} at {dateTime.time}
                        </div>
                      </div>
                      {announcement.location && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Location</div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {announcement.location}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-2">Description</div>
                      <p className="text-gray-700 whitespace-pre-wrap">{announcement.description}</p>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-xs text-gray-500">
                        Posted by {announcement.author || 'Admin'} on {dateTime.date}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t bg-gray-50 flex justify-between">
                    <button
                      onClick={() => setViewingAnnouncementId(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-white"
                    >
                      Close
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setViewingAnnouncementId(null);
                          handleEditAnnouncement(announcement);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this announcement?')) {
                            handleDeleteAnnouncement(announcement.id);
                            setViewingAnnouncementId(null);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
  </main>
)}

{/* Parks Tab - ADD THIS ENTIRE SECTION */}
{activeTab === "parks" && (
  <main className="flex-1 overflow-auto p-8">
    {parksView === "list" && (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Local Attractions Directory</h1>
            <p className="text-sm text-gray-500">Manage public parks, facilities, and recreational areas</p>
          </div>
          <button
            onClick={() => setParksView("create")}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add New Attractions
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {parks.map(park => (
            <div key={park.id} className="bg-white rounded-xl shadow border overflow-hidden group hover:shadow-lg transition-shadow">
              {/* Park Image */}
              <div className="h-48 bg-gradient-to-br from-green-400 to-emerald-600 relative">
                 {park.images && park.images.length > 0 ? (
                <img 
                  src={park.images[0]} 
                  alt={park.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient if image fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Trees className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={park.is_active}
                      onChange={() => toggleParkStatus(park.id, park.is_active)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              {/* Park Details */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{park.name}</h3>
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 line-clamp-2">{park.physical_address}</p>
                </div>

                {park.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{park.description}</p>
                )}

                {/* Amenities */}
                {park.amenities && park.amenities.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {park.amenities.slice(0, 3).map((amenity: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                          {amenity}
                        </span>
                      ))}
                      {park.amenities.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{park.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Operating Hours Today */}
                <div className="flex items-start gap-2 text-xs text-gray-500 mb-4">
                  <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div className="whitespace-pre-line line-clamp-2">
                    {park.operating_hours || 'Hours not specified'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button 
                    onClick={() => handleEditPark(park)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeletePark(park.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {parks.length === 0 && (
          <div className="text-center py-16">
            <Trees className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No parks added yet. Click "Add New Attractions" to get started.</p>
          </div>
        )}
      </>
    )}

    {parksView === "create" && (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setParksView("list");
              setEditingParkId(null);
            }}
            className="p-2 rounded-lg border hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {editingParkId ? 'Edit Attractions Details' : 'Add New Attractions Details'}
            </h1>
            <p className="text-sm text-gray-500">
              {editingParkId ? 'Update attractions information' : 'Create a new public attractions listing for the directory'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information */}
            <div className="bg-white rounded-xl shadow border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">General Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Park Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={parkForm.name}
                    onChange={(e) => setParkForm({...parkForm, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Westside Botanical Park"
                  />
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Physical Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={parkForm.physical_address}
                        onChange={(e) => setParkForm({...parkForm, physical_address: e.target.value})}
                        className="flex-1 px-4 py-2 border rounded-lg"
                        placeholder="Street name, District, Zip Code"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowParkLocationMap(!showParkLocationMap);
                          if (!showParkLocationMap) {
                            setTimeout(() => {
                              if (parkMapRef.current) {
                                renderParkMap();
                              }
                            }, 100);
                          }
                        }}
                        className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                          showParkLocationMap ? 'bg-green-50 border-green-500 text-green-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        {showParkLocationMap ? 'Hide Map' : 'Pick on Map'}
                      </button>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {showParkLocationMap 
                        ? 'Click anywhere on the map or drag the marker to select the park location' 
                        : 'Type the address or use the map picker'}
                    </p>
                        
                    {showParkLocationMap && (
                      <div className="mt-3 border rounded-lg overflow-hidden relative">
                        {/* Drop Pin Indicator */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-12 z-10 flex flex-col items-center pointer-events-none">
                          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg mb-1">
                            CLICK TO PIN LOCATION
                          </div>
                          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </div>

                        {/* Map Container */}
                        <div ref={parkMapRef} className="w-full h-80"></div>
                        
                        {/* Map Footer */}
                        <div className="bg-gray-50 p-3 border-t flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {parkMapMarker ? '✓ Location selected - Drag marker to adjust' : 'Click anywhere on the map to select location'}
                          </span>
                          {parkMapMarker && (
                            <button
                              type="button"
                              onClick={() => {
                                if (parkMapInstanceRef.current && parkMapMarker) {
                                  parkMapInstanceRef.current.removeLayer(parkMapMarker);
                                  setParkMapMarker(null);
                                  setParkForm({...parkForm, physical_address: ''});
                                }
                              }}
                              className="text-red-600 hover:text-red-700 font-medium text-xs"
                            >
                              Clear Location
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={parkForm.description}
                    onChange={(e) => setParkForm({...parkForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Describe the park, features, history, and unique highlights..."
                  />
                </div>
              </div>
            </div>

            {/* Amenities & Facilities */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities & Facilities</h2>
              <div className="grid grid-cols-2 gap-3">
                {availableAmenities.map(amenity => (
                  <label key={amenity} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={parkForm.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Media Management */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Management</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="park-images"
                />
                <label htmlFor="park-images" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">Upload Attraction Gallery</p>
                  <p className="text-xs text-gray-400">Drag and drop images here, or click to browse. Max 5MB per file.</p>
                </label>
              </div>

          {/* Existing Images (when editing) */}
{editingParkId && parkForm.images.length > 0 && (
  <div className="mt-4">
    <p className="text-sm font-medium text-gray-700 mb-2">Current Images</p>
    <div className="grid grid-cols-4 gap-3">
      {parkForm.images.map((imageUrl, index) => (
        <div key={`existing-${index}`} className="relative group">
          <img
            src={imageUrl}
            alt={`Park ${index + 1}`}
            className="w-full h-24 object-cover rounded-lg"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
          <button
            type="button"
            onClick={() => {
              // Mark for deletion
              setExistingImagesToDelete(prev => [...prev, imageUrl]);
              setParkForm(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== index)
              }));
            }}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  </div>
)}

{/* New Images to Upload */}
{parkImages.length > 0 && (
  <div className="mt-4">
    <p className="text-sm font-medium text-gray-700 mb-2">
      New Images to Upload ({parkImages.length})
    </p>
    <div className="grid grid-cols-4 gap-3">
      {parkImages.map((img, index) => (
        <div key={`new-${index}`} className="relative group">
          <img
            src={URL.createObjectURL(img)}
            alt={`Preview ${index + 1}`}
            className="w-full h-24 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={() => removeImage(index)}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
            NEW
          </div>
        </div>
      ))}
    </div>
  </div>
)}
            </div>
          </div>

          {/* Right Column - Operating Hours & Status */}
          <div className="space-y-6">
            {/* Initial Status */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Initial Status</h2>
              <label className="flex items-center gap-3">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={parkForm.is_active}
                    onChange={(e) => setParkForm({...parkForm, is_active: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Publishing Status:</p>
                  <p className="text-sm text-gray-500">
                    {parkForm.is_active ? 'Active - Visible to public' : 'Inactive - Hidden from public'}
                  </p>
                </div>
              </label>
            </div>

            {/* Operating Hours */}
     {/* Operating Hours */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attraction Hours
                </label>
                <textarea
                  value={parkForm.operating_hours}
                  onChange={(e) => setParkForm({...parkForm, operating_hours: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g.,
            Monday - Friday: 8:00 AM - 5:00 PM
            Saturday: 9:00 AM - 6:00 PM
            Sunday: Closed

            Or simply: Open Daily 24/7"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the attraction's operating hours in any format
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 bg-white rounded-xl shadow border p-6">
          <button
              onClick={() => {
                setParksView("list");
                setEditingParkId(null);
                
                // Clean up map
                setShowParkLocationMap(false);
                if (parkMapMarker && parkMapInstanceRef.current) {
                  parkMapInstanceRef.current.removeLayer(parkMapMarker);
                  setParkMapMarker(null);
                }
                if (parkMapInstanceRef.current) {
                  parkMapInstanceRef.current.remove();
                  parkMapInstanceRef.current = null;
                }
              }}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          <button
            onClick={editingParkId ? handleUpdatePark : handleCreatePark}
            disabled={uploadingImages}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {uploadingImages ? 'Uploading...' : (editingParkId ? 'Update Attraction' : 'Create Attraction Listing')}
          </button>
        </div>
      </>
    )}
  </main>
)}


{/* User Management Tab */}
{activeTab === "users" && (
  <main className="flex-1 overflow-auto p-8">
    {usersView === "list" && (
      <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Manage user accounts and permissions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{getUserStats().total}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{getUserStats().active}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{getUserStats().admins}</div>
            <div className="text-sm text-gray-600">Administrators</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{getUserStats().regular}</div>
            <div className="text-sm text-gray-600">Regular Users</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setUserCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <select
              value={userFilterRole}
              onChange={(e) => {
                setUserFilterRole(e.target.value);
                setUserCurrentPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="user">Regular Users</option>
            </select>
            <select
              value={userFilterStatus}
              onChange={(e) => {
                setUserFilterStatus(e.target.value);
                setUserCurrentPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredUsers = users.filter(u => {
                  const matchesSearch = userSearchQuery === "" || 
                    u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                  const matchesRole = userFilterRole === "all" || 
                    (userFilterRole === "admin" ? u.is_admin : !u.is_admin);
                  const matchesStatus = userFilterStatus === "all" ||
                    (userFilterStatus === "active" ? u.is_active !== false : u.is_active === false);
                  return matchesSearch && matchesRole && matchesStatus;
                });

                const indexOfLastUser = userCurrentPage * usersPerPage;
                const indexOfFirstUser = indexOfLastUser - usersPerPage;
                const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
                const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);

                return (
                  <>
                    {currentUsers.map(u => {
                      const joinDate = new Date(u.created_at);
                      return (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {u.full_name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{u.full_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">ID: {u.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-700">{u.email}</td>
                          <td className="p-4">
                            {u.is_admin ? (
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                ADMIN
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                USER
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {joinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={u.is_active !== false}
                                onChange={() => handleToggleUserStatus(u.id, u.is_active !== false)}
                                className="sr-only peer" 
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <div className={`text-xs font-medium mt-1 ${u.is_active !== false ? 'text-blue-600' : 'text-gray-600'}`}>
                              {u.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => setViewingUserId(u.id)}
                                className="p-2 rounded hover:bg-blue-50 text-blue-600"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleToggleAdminStatus(u.id, u.is_admin)}
                                className={`p-2 rounded ${u.is_admin ? 'hover:bg-red-50 text-red-600' : 'hover:bg-purple-50 text-purple-600'}`}
                                title={u.is_admin ? 'Remove Admin' : 'Make Admin'}
                              >
                                <Users className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-600">
              Showing users {((userCurrentPage - 1) * usersPerPage) + 1} to {Math.min(userCurrentPage * usersPerPage, users.filter(u => {
                const matchesSearch = userSearchQuery === "" || 
                  u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                const matchesRole = userFilterRole === "all" || 
                  (userFilterRole === "admin" ? u.is_admin : !u.is_admin);
                const matchesStatus = userFilterStatus === "all" ||
                  (userFilterStatus === "active" ? u.is_active !== false : u.is_active === false);
                return matchesSearch && matchesRole && matchesStatus;
              }).length)} of {users.filter(u => {
                const matchesSearch = userSearchQuery === "" || 
                  u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                const matchesRole = userFilterRole === "all" || 
                  (userFilterRole === "admin" ? u.is_admin : !u.is_admin);
                const matchesStatus = userFilterStatus === "all" ||
                  (userFilterStatus === "active" ? u.is_active !== false : u.is_active === false);
                return matchesSearch && matchesRole && matchesStatus;
              }).length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserCurrentPage(p => Math.max(p - 1, 1))}
                disabled={userCurrentPage === 1}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setUserCurrentPage(p => p + 1)}
                disabled={userCurrentPage >= Math.ceil(users.filter(u => {
                  const matchesSearch = userSearchQuery === "" || 
                    u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                  const matchesRole = userFilterRole === "all" || 
                    (userFilterRole === "admin" ? u.is_admin : !u.is_admin);
                  const matchesStatus = userFilterStatus === "all" ||
                    (userFilterStatus === "active" ? u.is_active !== false : u.is_active === false);
                  return matchesSearch && matchesRole && matchesStatus;
                }).length / usersPerPage)}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </>
    )}

    {/* View User Details Modal */}
    {viewingUserId && (() => {
      const viewUser = users.find(u => u.id === viewingUserId);
      if (!viewUser) return null;

      const joinDate = formatDateTime(viewUser.created_at);
      const userReports = reports.filter(r => r.user_id === viewingUserId);

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setViewingUserId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {viewUser.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{viewUser.full_name || 'Unknown User'}</h3>
                  <p className="text-gray-600">{viewUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {viewUser.is_admin && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        ADMIN
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      viewUser.is_active !== false 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {viewUser.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{userReports.length}</div>
                  <div className="text-xs text-gray-600">Total Reports</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {userReports.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userReports.filter(r => r.status === 'resolved').length}
                  </div>
                  <div className="text-xs text-gray-600">Resolved</div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Account Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">User ID</div>
                    <div className="text-sm font-medium text-gray-900">{viewUser.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Joined Date</div>
                    <div className="text-sm font-medium text-gray-900">{joinDate.date}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Email Verified</div>
                    <div className="text-sm font-medium text-gray-900">
                      {viewUser.email_verified ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Last Sign In</div>
                    <div className="text-sm font-medium text-gray-900">
                      {viewUser.last_sign_in_at 
                        ? formatDateTime(viewUser.last_sign_in_at).date
                        : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reports */}
              {userReports.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Recent Reports</h4>
                  <div className="space-y-2">
                    {userReports.slice(0, 5).map(report => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {getCategoryLabel(report.category)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(report.created_at)}
                          </div>
                        </div>
                        <div>{getStatusBadge(report.status)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setViewingUserId(null)}
                className="px-4 py-2 border rounded-lg hover:bg-white"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleToggleAdminStatus(viewUser.id, viewUser.is_admin);
                    setViewingUserId(null);
                  }}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    viewUser.is_admin 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {viewUser.is_admin ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button
                  onClick={() => {
                    handleToggleUserStatus(viewUser.id, viewUser.is_active !== false);
                    setViewingUserId(null);
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    viewUser.is_active !== false
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {viewUser.is_active !== false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
  </main>
)}
        
      </div>
    </div>
  );
};

export default AdminDashboard;