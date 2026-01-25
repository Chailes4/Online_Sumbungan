import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, MapPin, AlertTriangle, Send, RefreshCw, Edit, XCircle
} from "lucide-react";

interface Report {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  address: string;
  description: string;
  media_urls: string[];
  latitude: number;
  longitude: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
}

const ReportDetails = ({ reportId, onBack }: { reportId: string; onBack: () => void }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
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

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('map-container').setView([report.latitude, report.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([report.latitude, report.longitude]).addTo(map);
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Submitted', completed: true },
      { key: 'pending', label: 'Under Review', completed: report?.status !== 'pending' },
      { key: 'in_progress', label: 'Assigned', completed: report?.status === 'in_progress' || report?.status === 'resolved' },
      { key: 'in_progress', label: 'In Progress', completed: report?.status === 'in_progress' || report?.status === 'resolved' },
      { key: 'resolved', label: 'Resolved', completed: report?.status === 'resolved' }
    ];
    return steps;
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-semibold">High Priority</span>;
      case 'medium':
        return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-xs font-semibold">Medium Priority</span>;
      case 'low':
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs font-semibold">Low Priority</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs font-semibold">Unknown</span>;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
      default:
        return 'Unknown Priority';
    }
  };

  const getPriorityIcon = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-orange-600',
      low: 'text-gray-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
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
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Report not found</h2>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Go back to reports
          </button>
        </div>
      </div>
    );
  }

  const steps = getStatusSteps();
  const currentStepIndex = steps.findIndex(step => 
    (report.status === 'pending' && step.label === 'Under Review') ||
    (report.status === 'in_progress' && step.label === 'In Progress') ||
    (report.status === 'resolved' && step.label === 'Resolved')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to My Reports
              </button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">Resident</p>
              <p className="text-sm font-semibold">{userData?.full_name || "User"}</p>
              <div className="w-10 h-10 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title & Actions */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
              {getPriorityBadge(report.priority)}
            </div>
            <p className="text-gray-600">
              {getReportId(report.id)} · Submitted on {formatDate(report.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Report
            </button>
            <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-blue-600 text-white' 
                      : index === currentStepIndex 
                        ? 'border-4 border-blue-600 bg-white'
                        : 'bg-gray-200 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : index === currentStepIndex ? (
                      <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    )}
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${
                    step.completed || index === currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step.completed ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Report Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Report Information</h2>

              {/* Category */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Category</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <p className="text-gray-900">{getCategoryLabel(report.category)}</p>
                </div>
              </div>

              {/* Priority */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Priority</p>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${getPriorityIcon(report.priority)}`} />
                  <p className={`font-semibold ${getPriorityIcon(report.priority)}`}>{getPriorityText(report.priority)}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
              </div>

              {/* Location */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Location</p>
                <div className="flex items-start gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-900">{report.address}</p>
                </div>
                <div ref={mapRef} className="w-full h-80 bg-gray-200 rounded-lg relative z-0"></div>
              </div>

              {/* Attached Photos */}
              {report.media_urls && report.media_urls.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase mb-4">Attached Photos</p>
                  <div className="grid grid-cols-4 gap-4">
                    {report.media_urls.map((url, index) => {
                      const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                      return (
                        <div
                          key={index}
                          className="relative cursor-pointer group"
                          onClick={() => setSelectedImage(url)}
                        >
                          {isVideo ? (
                            <div className="relative">
                              <video
                                src={url}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Activity & Updates */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Activity & Updates</h2>
                <RefreshCw className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
              </div>

              <div className="space-y-6 mb-6">
                {/* Status Update */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      Status changed to <span className="font-semibold">In Progress</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago · System</p>
                  </div>
                </div>

                {/* Department Update */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Public Works Dept</p>
                    <p className="text-sm text-gray-700">
                      Technical crew has been dispatched to assess the light fixture. Replacement bulb is on order. Estimated completion by tomorrow evening.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">4 hours ago</p>
                  </div>
                </div>

                {/* Assignment Update */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      Report <span className="font-semibold">Assigned</span> to Electrical Maintenance Unit
                    </p>
                    <p className="text-xs text-gray-500 mt-1">6 hours ago · Mark Thompson</p>
                  </div>
                </div>

                {/* User Comment */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-green-400 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900">You</p>
                        <p className="text-xs text-gray-500">Oct 24, 2:15 PM</p>
                      </div>
                      <p className="text-sm text-gray-700">
                        Thank you for looking into this. It's quite dangerous at night for kids coming back from practice.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comment Input */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment or follow up..."
                    className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="absolute right-2 top-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Public Works staff will see your message.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-[70]"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {selectedImage.match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <video
              src={selectedImage}
              controls
              className="max-w-full max-h-full rounded-lg relative z-[70]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full rounded-lg relative z-[70]"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            © 2024 Online Sumbungan · Need help? <a href="#" className="text-blue-600 hover:text-blue-700">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReportDetails;