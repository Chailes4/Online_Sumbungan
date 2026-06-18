import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, MapPin, User, Bell, Users, LayoutDashboard, FileText,
  CheckCircle, Eye, Edit, LogOut, Check, XCircle, AlertTriangle
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
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  withdraw_reason?: string;
  users?: {
    full_name: string;
    email: string;
    barangay: string;
  };
}

const AdminReportDetails = ({ reportId, onBack }: { reportId: string; onBack: () => void }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [officialResponse, setOfficialResponse] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [notifySMS, setNotifySMS] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [internalNotes, setInternalNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    checkUser();
    fetchReport();
    fetchComments(); 
    fetchInternalNotes(); 
    fetchActivityLogs(); 
  }, [reportId]);

  useEffect(() => {
    if (report && !mapLoaded) {
      initMap();
    }
  }, [report]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);


  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setUser(userData);
    }
  };

  const fetchReport = async () => {
    try {
     const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

      if (error) throw error;
      setReport(data);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("report_comments")
        .select(`
          *,
          users:user_id (
            full_name,
            email,
            is_admin
          )
        `)
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchInternalNotes = async () => {
    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from("internal_notes")
        .select(`
          *,
          users:user_id (
            full_name,
            email
          )
        `)
        .eq("report_id", reportId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInternalNotes(data || []);
    } catch (error) {
      console.error("Error fetching internal notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveNote = async () => {
    if (!internalNote.trim() || !user) return;
    
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from("internal_notes")
        .insert({
          report_id: reportId,
          user_id: user.id,
          note: internalNote.trim()
        });

      if (error) throw error;
      
      setInternalNote("");
      await fetchInternalNotes();
      alert("Note saved successfully!");
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };


  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          users:user_id (
            full_name,
            email
          )
        `)
        .eq("report_id", reportId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };


  const handleSendComment = async () => {
    if (!adminComment.trim() || !user) return;
    
    setSendingComment(true);
    try {
      const { error } = await supabase
        .from("report_comments")
        .insert({
          report_id: reportId,
          user_id: user.id,
          message: adminComment.trim()
        });

      if (error) throw error;
      
      setAdminComment("");
      await fetchComments();
    } catch (error) {
      console.error("Error sending comment:", error);
      alert("Failed to send comment");
    } finally {
      setSendingComment(false);
    }
  };


  const initMap = () => {
    if (!mapRef.current || !report) return;

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

  const renderMap = () => {
    if (!mapRef.current || !report) return;
    
    const L = (window as any).L;
    if (!L) return;

    mapRef.current.innerHTML = '<div id="map-container" style="width: 100%; height: 100%;"></div>';

    const map = L.map('map-container').setView([report.latitude, report.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Determine marker color based on priority
    const markerColor = 
      report.priority === 'high' ? '#ef4444' :   // Red for high priority
      report.priority === 'medium' ? '#f97316' : // Orange for medium priority
      '#6b7280';                                 // Gray for low priority

    // Create custom colored marker icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${markerColor}; 
        width: 30px; 
        height: 30px; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        border: 3px solid white; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    // Add marker with custom color
    L.marker([report.latitude, report.longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width: 200px;">
          <p style="font-size: 12px;">Status: ${getStatusLabel(report.status)}</p>
        </div>
      `)
      .openPopup();
  };

const handleStatusChange = async (newStatus: string) => {
  if (!report || !user) return;

  setUpdating(true);
  setShowStatusDropdown(false);

  const oldStatus = report.status;

  try {
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", report.id);

    if (error) throw error;

    // ❗ DO NOT re-fetch immediately (this is causing rollback issue)
    setReport(prev => prev ? { ...prev, status: newStatus as any } : prev);

    await supabase.from("activity_logs").insert({
      report_id: report.id,
      user_id: user.id,
      action: "status_change",
      description: `Status changed from '${oldStatus}' to '${newStatus}'`,
      old_value: oldStatus,
      new_value: newStatus
    });

    await fetchActivityLogs();

    alert("Status updated!");
  } catch (error: any) {
    console.error(error);
    alert("Failed: " + error.message);
  } finally {
    setUpdating(false);
  }
};

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'withdrawn': return 'Withdrawn';  
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'in_progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      case 'withdrawn': return 'bg-gray-500';  
      default: return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      infrastructure: 'INFRASTRUCTURE',
      street_lighting: 'INFRASTRUCTURE',
      waste_management: 'WASTE MANAGEMENT',
      road_damage: 'ROAD DAMAGE',
      flooding: 'FLOODING',
      public_safety: 'PUBLIC SAFETY',
      noise_pollution: 'NOISE POLLUTION',
      illegal_activity: 'ILLEGAL ACTIVITY',
      park_maintenance: 'PARK MAINTENANCE',
      other: 'OTHER'
    };
    return labels[category] || category.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    }) + ' • ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getReportId = (id: string) => {
    return `REF-2026-${id.slice(0, 4).toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Report not found</h2>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700 font-semibold">
            Go back
          </button>
        </div>
      </div>
    );
  }

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
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 mb-2"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 mb-2">
            <FileText className="w-5 h-5" />
            <span className="font-medium">All Reports</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 mb-2">
            <Bell className="w-5 h-5" />
            <span className="font-medium">Local Alerts</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50">
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
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Reports</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Report #{getReportId(report.id)}</h1>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`px-4 py-2 ${getStatusColor(report.status)} text-white rounded-lg text-sm font-semibold`}>
                {getStatusLabel(report.status)}
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={updating}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 flex items-center gap-2"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showStatusDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => handleStatusChange('pending')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                    >
                      <span className="text-sm font-medium text-gray-900">Pending</span>
                      {report.status === 'pending' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => handleStatusChange('in_progress')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                    >
                      <span className="text-sm font-medium text-gray-900">In Progress</span>
                      {report.status === 'in_progress' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => handleStatusChange('resolved')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left rounded-b-lg"
                    >
                      <span className="text-sm font-medium text-gray-900">Resolved</span>
                      {report.status === 'resolved' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => handleStatusChange('withdrawn')}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left rounded-b-lg border-t"
                    >
                      <span className="text-sm font-medium text-gray-900">Withdrawn</span>
                      {report.status === 'withdrawn' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {/* Withdrawn Alert Banner - Show at the very top if status is withdrawn */}
          {report.status === 'withdrawn' && report.withdraw_reason && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 mb-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-red-900 mb-1">⚠️ Report Withdrawn by Citizen</h3>
                      <p className="text-sm text-red-800">
                        This report has been withdrawn and is no longer active. No further action is required.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-red-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Reason for Withdrawal</p>
                        <p className="text-sm text-gray-900 leading-relaxed">{report.withdraw_reason}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="col-span-2 space-y-6">
              {/* Title & Category */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{report.title}</h2>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold uppercase">
                    {getCategoryLabel(report.category)}
                  </span>
                  <span className={`px-3 py-1 rounded text-xs font-semibold uppercase ${
                    report.priority === 'high' ? 'bg-red-100 text-red-700' :
                    report.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    ● {report.priority} PRIORITY
                  </span>
                </div>
              </div>

              {/* Citizen Information & Location */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Citizen Information</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{report.users?.full_name || 'N/A'}</div>
                        <div className="text-sm text-gray-600">Verified Resident • Brgy. {report.users?.barangay || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Location</h3>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                      <div>
                        <div className="font-semibold text-gray-900 mb-1">{report.address.split(',')[0]}</div>
                        <div className="text-sm text-gray-600">{report.address.split(',').slice(1).join(',')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div ref={mapRef} className="w-full h-64 bg-gray-200 rounded-lg"></div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Description</h3>
                <p className="text-gray-700 leading-relaxed">{report.description}</p>
              </div>

              {/* Attached Photos */}
              {report.media_urls && report.media_urls.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Attached Photos</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {report.media_urls.map((url, index) => (
                      <div
                        key={index}
                        className="relative cursor-pointer group aspect-video"
                        onClick={() => setSelectedImage(url)}
                      >
                        {url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                          <video src={url} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg group-hover:opacity-90" />
                        )}
                      </div>
                    ))}
                    {report.media_urls.length < 3 && (
                      <div className="aspect-video border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-gray-400">No more photos</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Report History */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">Report History & Audit Log</h3>
                </div>

                <div className="space-y-4">
                  {loadingLogs ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">Report Submitted</div>
                            <div className="text-sm text-gray-600">Citizen {report.users?.full_name} submitted the report.</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-gray-500">{formatDate(report.created_at).split('•')[0].trim()}</div>
                            <div className="font-semibold text-gray-900">{formatDate(report.created_at).split('•')[1].trim()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Initial submission - always show */}
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">Report Submitted</div>
                              <div className="text-sm text-gray-600">Citizen {report.users?.full_name} submitted the report.</div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="text-gray-500">{formatDate(report.created_at).split('•')[0].trim()}</div>
                              <div className="font-semibold text-gray-900">{formatDate(report.created_at).split('•')[1].trim()}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Activity logs - Show in reverse order (newest first is already handled by the query) */}
                      {activityLogs.slice().reverse().map((log) => {
                        const getIcon = () => {
                          if (log.action === 'status_change') {
                            if (log.new_value === 'resolved') {
                              return { 
                                icon: CheckCircle, 
                                bg: 'bg-green-100', 
                                color: 'text-green-600',
                                label: 'Status Updated'
                              };
                            }
                            if (log.new_value === 'withdrawn') {
                              return { 
                                icon: XCircle, 
                                bg: 'bg-red-100', 
                                color: 'text-red-600',
                                label: 'Report Withdrawn'
                              };
                            }
                            if (log.new_value === 'in_progress') {
                              return { 
                                icon: () => (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                ), 
                                bg: 'bg-blue-100', 
                                color: 'text-blue-600',
                                label: 'Status Updated'
                              };
                            }
                            if (log.new_value === 'pending') {
                              return { 
                                icon: () => (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ), 
                                bg: 'bg-orange-100', 
                                color: 'text-orange-600',
                                label: 'Status Updated'
                              };
                            }
                          }
                          return { 
                            icon: Edit, 
                            bg: 'bg-gray-100', 
                            color: 'text-gray-600',
                            label: 'Activity'
                          };
                        };

                        const iconData = getIcon();
                        const IconComponent = iconData.icon;

                        return (
                          <div key={log.id} className="flex gap-4">
                            <div className={`w-10 h-10 ${iconData.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                              <IconComponent className={`w-5 h-5 ${iconData.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {iconData.label}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {log.description} by {log.users?.full_name || 'Admin'}
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  <div className="text-gray-500">
                                    {new Date(log.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="font-semibold text-gray-900">
                                    {new Date(log.created_at).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Activity & Updates - Chat */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                    </svg>
                    <h3 className="font-bold text-gray-900">Chat with Reporter</h3>
                  </div>
                  <button
                    onClick={fetchComments}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {loadingComments ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">No messages yet</p>
                  ) : (
                    comments.map((msg) => {
                      const isAdmin = msg.users?.is_admin === true;
                      const senderName = msg.users?.full_name || msg.users?.email?.split('@')[0] || 'User';
                      
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                            isAdmin ? 'bg-blue-100' : 'bg-green-400'
                          }`}>
                            {isAdmin ? (
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                              </svg>
                            ) : (
                              <span className="text-white text-xs font-semibold">{senderName[0]}</span>
                            )}
                          </div>
                          <div className={`max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`${isAdmin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3`}>
                              <p className={`text-xs font-semibold mb-1 ${isAdmin ? 'text-blue-100' : 'text-gray-600'}`}>
                                {isAdmin ? 'You' : senderName}
                              </p>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 px-1">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="relative">
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    placeholder="Type a message to the reporter..."
                    className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!adminComment.trim() || sendingComment}
                    className="absolute right-2 bottom-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingComment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  <h3 className="font-bold text-gray-900">Internal Notes</h3>
                </div>

                <div className="mb-4 space-y-3 max-h-60 overflow-y-auto">
                  {loadingNotes ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : internalNotes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No internal notes yet</p>
                  ) : (
                    internalNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-semibold text-sm text-gray-900">
                            {note.users?.full_name || note.users?.email?.split('@')[0] || 'Admin'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}, {new Date(note.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>

                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add a private staff comment..."
                  className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                  rows={3}
                />
                <button 
                  onClick={handleSaveNote}
                  disabled={!internalNote.trim() || savingNote}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[1000] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl"
          >
            ×
          </button>
          {selectedImage.match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <video src={selectedImage} controls className="max-w-full max-h-full rounded-lg" />
          ) : (
            <img src={selectedImage} alt="Full size" className="max-w-full max-h-full rounded-lg" />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReportDetails;
