import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, MapPin, User, Bell, Users, LayoutDashboard, FileText,
  CheckCircle, Eye, Edit, LogOut, Check
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
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
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

  useEffect(() => {
    checkUser();
    fetchReport();
  }, [reportId]);

  useEffect(() => {
    if (report && !mapLoaded) {
      initMap();
    }
  }, [report]);

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
        .select(`
          *,
          users (full_name, email, barangay)
        `)
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
    if (!report) return;
    
    setUpdating(true);
    setShowStatusDropdown(false);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", report.id);

      if (error) throw error;

      setReport({ ...report, status: newStatus as any });
      alert("Status updated successfully!");
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert("Failed to update status: " + error.message);
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
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'in_progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
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
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Report Submitted</div>
                          <div className="text-sm text-gray-600">Citizen {report.users?.full_name} submitted the report via mobile app.</div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-500">{formatDate(report.created_at).split('•')[0].trim()}</div>
                          <div className="font-semibold text-gray-900">{formatDate(report.created_at).split('•')[1].trim()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Report Viewed</div>
                          <div className="text-sm text-gray-600">System Admin viewed the report details.</div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-500">{formatDate(report.created_at).split('•')[0].trim()}</div>
                          <div className="font-semibold text-gray-900">10:02 AM</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Edit className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Priority Updated</div>
                          <div className="text-sm text-gray-600">Priority changed from 'Medium' to 'High' by Admin Sarah.</div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-500">{formatDate(report.created_at).split('•')[0].trim()}</div>
                          <div className="font-semibold text-gray-900">10:15 AM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Official Response */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
                  </svg>
                  <h3 className="font-bold text-gray-900">Official Response</h3>
                </div>
                <p className="text-xs text-gray-600 mb-4">This update will be visible to the resident and the public portal.</p>
                <textarea
                  value={officialResponse}
                  onChange={(e) => setOfficialResponse(e.target.value)}
                  placeholder="Write an update to the citizen..."
                  className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                  rows={5}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifySMS}
                      onChange={(e) => setNotifySMS(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    Notify citizen via SMS
                  </label>
                  <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800">
                    Post Update
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

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-900">Admin Sarah</span>
                    <span className="text-xs text-gray-500">OCT 24, 10:15 AM</span>
                  </div>
                  <p className="text-sm text-gray-700">Dispatched a maintenance crew for an initial assessment. Likely a transformer issue.</p>
                </div>

                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add a private staff comment..."
                  className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                  rows={3}
                />
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
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