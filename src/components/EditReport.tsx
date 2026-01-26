import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, MapPin, Upload, X, AlertCircle, Save, Loader
} from "lucide-react";

export interface Report {
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
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
}

const EditReport = ({ reportId, onBack, onSave }: { 
  reportId: string; 
  onBack: () => void;
  onSave: () => void;
}) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [newMedia, setNewMedia] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
  
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [marker, setMarker] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      if (data.status !== 'pending') {
        alert("Only pending reports can be edited");
        onBack();
        return;
      }

      setReport(data);
      setTitle(data.title);
      setCategory(data.category);
      setPriority(data.priority);
      setDescription(data.description);
      setAddress(data.address);
      setLatitude(data.latitude);
      setLongitude(data.longitude);
      setExistingMedia(data.media_urls || []);
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Failed to load report");
      onBack();
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

    mapRef.current.innerHTML = '<div id="edit-map-container" style="width: 100%; height: 100%;"></div>';

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map('edit-map-container').setView([latitude, longitude], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const newMarker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
    setMarker(newMarker);

    newMarker.on('dragend', async function(e: any) {
      const position = e.target.getLatLng();
      setLatitude(position.lat);
      setLongitude(position.lng);
      
      // Reverse geocode
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
        );
        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
      }
    });

    map.on('click', async function(e: any) {
      const { lat, lng } = e.latlng;
      newMarker.setLatLng([lat, lng]);
      setLatitude(lat);
      setLongitude(lng);
      
      // Reverse geocode
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      } catch (error) {
        console.error("Error reverse geocoding:", error);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isUnder10MB = file.size <= 10 * 1024 * 1024;
      return (isImage || isVideo) && isUnder10MB;
    });

    if (validFiles.length !== files.length) {
      alert("Some files were skipped. Only images and videos under 10MB are allowed.");
    }

    const totalMedia = existingMedia.length + newMedia.length + validFiles.length;
    if (totalMedia > 5) {
      alert("Maximum 5 media files allowed");
      return;
    }

    setNewMedia([...newMedia, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingMedia = (index: number) => {
    setExistingMedia(existingMedia.filter((_, i) => i !== index));
  };

  const removeNewMedia = (index: number) => {
    setNewMedia(newMedia.filter((_, i) => i !== index));
    setNewMediaPreviews(newMediaPreviews.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 10) {
      newErrors.title = "Title must be at least 10 characters";
    }

    if (!category) {
      newErrors.category = "Category is required";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    if (!address.trim()) {
      newErrors.address = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadNewMedia = async () => {
    const uploadedUrls: string[] = [];

    for (const file of newMedia) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-media')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload ${file.name}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('report-media')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Upload new media files
      const newMediaUrls = await uploadNewMedia();
      const allMediaUrls = [...existingMedia, ...newMediaUrls];

      // Update report
      const { data, error } = await supabase
        .from("reports")
        .update({
          title: title.trim(),
          category,
          priority,
          description: description.trim(),
          address: address.trim(),
          latitude,
          longitude,
          media_urls: allMediaUrls
        })
        .eq("id", reportId)
        .eq("user_id", user.id) // Ensure user owns this report
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("No report was updated. You may not have permission to edit this report.");
      }

      alert("Report updated successfully!");
      onSave();
    } catch (error: any) {
      console.error("Error updating report:", error);
      alert(`Failed to update report: ${error.message || "Please try again."}`);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'street_lighting', label: 'Street Lighting & Public Utilities' },
    { value: 'waste_management', label: 'Waste Management' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'flooding', label: 'Flooding' },
    { value: 'public_safety', label: 'Public Safety' },
    { value: 'noise_pollution', label: 'Noise Pollution' },
    { value: 'illegal_activity', label: 'Illegal Activity' },
    { value: 'park_maintenance', label: 'Park Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                Cancel
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Report</h1>
          <p className="text-gray-600">Make changes to your report before it's reviewed by staff</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief, descriptive title of the issue"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.title && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.title}</span>
              </div>
            )}
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.category}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority Level *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('low')}
                  className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                    priority === 'low'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Low
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('medium')}
                  className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                    priority === 'medium'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                    priority === 'high'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  High
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue..."
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.description && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.description}</span>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2">{description.length} characters</p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Location *
            </label>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address or location"
                className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
            </div>
            {errors.address && (
              <div className="flex items-center gap-2 mb-3 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.address}</span>
              </div>
            )}
            <div ref={mapRef} className="w-full h-96 bg-gray-200 rounded-lg"></div>
            <p className="text-sm text-gray-500 mt-2">
              Click on the map or drag the marker to update the location
            </p>
          </div>

          {/* Media */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Photos & Videos
            </label>
            
            {/* Existing Media */}
            {existingMedia.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current media:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingMedia.map((url, index) => {
                    const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                    return (
                      <div key={index} className="relative group">
                        {isVideo ? (
                          <video src={url} className="w-full h-32 object-cover rounded-lg" />
                        ) : (
                          <img src={url} alt={`Media ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeExistingMedia(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Media */}
            {newMediaPreviews.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">New media to upload:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {newMediaPreviews.map((preview, index) => {
                    const isVideo = newMedia[index].type.startsWith('video/');
                    return (
                      <div key={index} className="relative group">
                        {isVideo ? (
                          <video src={preview} className="w-full h-32 object-cover rounded-lg" />
                        ) : (
                          <img src={preview} alt={`New ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewMedia(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Button */}
            {(existingMedia.length + newMedia.length) < 5 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">
                    Click to upload photos or videos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Max 5 files, up to 10MB each
                  </p>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditReport;