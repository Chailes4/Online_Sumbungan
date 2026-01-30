import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import EditReport from "./EditReport";
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
  status: 'pending' | 'in_progress' | 'resolved' | 'withdrawn';
  created_at: string;
  withdraw_reason?: string;
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
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedReasonType, setSelectedReasonType] = useState("");
  const [customReason, setCustomReason] = useState("");

  
  useEffect(() => {
    checkUser();
    fetchReport();
    fetchComments(); 
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

  const handleSendComment = async () => {
    if (!comment.trim() || !user) return;
    
    setSendingComment(true);
    try {
      const { error } = await supabase
        .from("report_comments")
        .insert({
          report_id: reportId,
          user_id: user.id,
          message: comment.trim()
        });

      if (error) throw error;
      
      setComment("");
      await fetchComments();
    } catch (error) {
      console.error("Error sending comment:", error);
      alert("Failed to send comment");
    } finally {
      setSendingComment(false);
    }
  };

  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = async () => {
    // Get the final reason - either selected reason or custom reason
    const finalReason = selectedReasonType === 'other' 
      ? customReason.trim() 
      : selectedReasonType;

    if (!finalReason) {
      alert("Please select or provide a reason for withdrawing this report.");
      return;
    }

    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ 
          status: 'withdrawn',
          withdraw_reason: finalReason
        })
        .eq("id", reportId)
        .select()     
        .single();    
      
      if (error) {
        console.error("Withdraw error:", error);
        throw error;
      }

      setReport(prev => prev ? { ...prev, status: 'withdrawn', withdraw_reason: finalReason } : null);
      setShowWithdrawModal(false);
      setSelectedReasonType("");
      setCustomReason("");

      alert("Report withdrawn successfully");
      onBack();
    } catch (error: any) {
      console.error("Error withdrawing report:", error);
      alert(`Failed to withdraw report: ${error.message || "Please try again."}`);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdrawCancel = () => {
    setShowWithdrawModal(false);
    setSelectedReasonType("");
    setCustomReason("");
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
    if (report?.status === 'withdrawn') {
      return [
        { key: 'pending', label: 'Submitted', completed: true },
        { key: 'withdrawn', label: 'Withdrawn', completed: true }
      ];
    }

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

  // 1. FIRST: Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. SECOND: Handle report not found
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

  // 3. THIRD: Handle editing mode (after we know report exists)
  if (isEditing) {
    return (
      <EditReport 
        reportId={reportId}
        onBack={() => setIsEditing(false)}
        onSave={() => {
          setIsEditing(false);
          fetchReport();
        }}
      />
    );
  }

  // 4. FINALLY: Calculate variables and render main content
  const steps = getStatusSteps();
  const currentStepIndex = report.status === 'withdrawn' 
    ? 1  
    : steps.findIndex(step => 
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
              <div className="w-10 h-10 bg-green-400 rounded-full"></div>
              <div className="text-left">
                <p className="text-sm font-semibold">{userData?.full_name || user?.email?.split('@')[0] || "User"}</p>
                <p className="text-xs text-gray-500">{userData?.barangay}</p>
              </div>
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
            <button 
              onClick={() => setIsEditing(true)}
              disabled={report.status !== 'pending'}
              className={`px-4 py-2 border rounded-lg font-semibold flex items-center gap-2 ${
                report.status === 'pending' 
                  ? 'border-gray-300 hover:bg-gray-50 cursor-pointer' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Edit className="w-4 h-4" />
              Edit Report
            </button>

            <button 
              onClick={handleWithdrawClick}
              disabled={report.status !== 'pending'}
              className={`px-4 py-2 border rounded-lg font-semibold flex items-center gap-2 ${
                report.status === 'pending' 
                  ? 'border-red-300 text-red-600 hover:bg-red-50 cursor-pointer' 
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Status Timeline */}
        {report.status === 'withdrawn' ? (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600 text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="mt-2 text-sm font-semibold text-blue-600">Submitted</p>
              </div>

              <div className="w-32 h-1 bg-red-400"></div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-600 text-white">
                  <XCircle className="w-6 h-6" />
                </div>
                <p className="mt-2 text-sm font-semibold text-red-600">Withdrawn</p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">This report has been withdrawn and is no longer active.</p>
              {report.withdraw_reason && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 max-w-2xl mx-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Reason for Withdrawal</p>
                  <p className="text-sm text-gray-700">{report.withdraw_reason}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
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
        )}

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
                <RefreshCw 
                  onClick={fetchComments}
                  className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" 
                />              
              </div>

              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {loadingComments ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</p>
                ) : (
                  comments.map((msg) => {
                    const isUser = msg.user_id === user?.id;
                    const senderName = msg.users?.full_name || msg.users?.email?.split('@')[0] || 'User';
                    const isAdmin = msg.users?.is_admin === true;
                    
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                          isAdmin ? 'bg-orange-100' : 'bg-green-400'
                        }`}>
                          {isAdmin ? (
                            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                            </svg>
                          ) : (
                            <span className="text-white text-sm font-semibold">
                              {isUser ? (userData?.full_name?.[0] || 'U') : senderName[0]}
                            </span>
                          )}
                        </div>
                        <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`${isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3`}>
                            <p className={`text-xs font-semibold mb-1 ${isUser ? 'text-blue-100' : 'text-gray-600'}`}>
                              {isUser ? 'You' : (isAdmin ? 'Admin' : senderName)}
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

              {/* Comment Input */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    placeholder="Add a comment or follow up..."
                    className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={handleSendComment}
                    disabled={!comment.trim() || sendingComment}
                    className="absolute right-2 top-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingComment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Public Works staff will see your message.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Withdraw Report</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              This action cannot be undone. The report will be marked as withdrawn and removed from active reports.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for withdrawal <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReasonType}
                onChange={(e) => {
                  setSelectedReasonType(e.target.value);
                  if (e.target.value !== 'other') {
                    setCustomReason('');
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason...</option>
                <option value="Issue already resolved">Issue already resolved</option>
                <option value="Reported by mistake">Reported by mistake</option>
                <option value="Duplicate report">Duplicate report</option>
                <option value="Wrong location">Wrong location</option>
                <option value="No longer an issue">No longer an issue</option>
                <option value="Prefer to handle privately">Prefer to handle privately</option>
                <option value="other">Other (please specify)</option>
              </select>
            </div>

            {selectedReasonType === 'other' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Please specify <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please explain your reason for withdrawing..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customReason.length}/500 characters
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleWithdrawCancel}
                disabled={withdrawing}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawConfirm}
                disabled={withdrawing || !selectedReasonType || (selectedReasonType === 'other' && !customReason.trim())}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Withdrawing...
                  </div>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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