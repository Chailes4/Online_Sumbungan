import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, MapPin, Upload, X, Loader, ChevronDown
} from "lucide-react";

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
}

const FileReport = ({ onBack }: { onBack: () => void }) => {
  // User state
  const [user, setUser] = useState<any>(null);
  
  // Form fields - Updated default coordinates to Plaridel, Bulacan
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number>(14.8815);
  const [longitude, setLongitude] = useState<number>(120.8671);
  
  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<LocationResult[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const categories = [
    { value: "infrastructure", label: "Infrastructure" },
    { value: "street_lighting", label: "Street Lighting" },
    { value: "waste_management", label: "Waste Management" },
    { value: "road_damage", label: "Road Damage" },
    { value: "flooding", label: "Flooding" },
    { value: "public_safety", label: "Public Safety" },
    { value: "noise_pollution", label: "Noise Pollution" },
    { value: "illegal_activity", label: "Illegal Activity" },
    { value: "park_maintenance", label: "Park Maintenance" },
    { value: "other", label: "Other" },
  ];

  const priorities = [
    { value: "low", label: "Low", color: "text-green-600" },
    { value: "medium", label: "Medium", color: "text-yellow-600" },
    { value: "high", label: "High", color: "text-red-600" },
  ];

  useEffect(() => {
    checkUser();
    initMap();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  // Initialize Leaflet map
  const initMap = () => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
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
  if (!mapRef.current) return;
  
  const L = (window as any).L;
  if (!L) return;

  // Clear existing map
  mapRef.current.innerHTML = '<div id="map-container" style="width: 100%; height: 100%;"></div>';

  // Fix Leaflet default icon issue
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  const map = L.map('map-container').setView([latitude, longitude], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);

  marker.on('dragend', function(e: any) {
    const position = e.target.getLatLng();
    setLatitude(position.lat);
    setLongitude(position.lng);
    reverseGeocode(position.lat, position.lng);
  });

  map.on('click', function(e: any) {
    const { lat, lng } = e.latlng;
    marker.setLatLng([lat, lng]);
    setLatitude(lat);
    setLongitude(lng);
    reverseGeocode(lat, lng);
  });
};

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name);
        setAddressSearch(data.display_name);
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }
  };

  // Search for address
  const handleAddressSearch = (query: string) => {
    setAddressSearch(query);
    setShowAddressSuggestions(true);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5`
        );
        const data = await res.json();
        setAddressSuggestions(data);
      } catch (error) {
        console.error("Address search failed", error);
      }
    }, 500);
  };

  const handleSelectAddress = (location: LocationResult) => {
    setAddress(location.display_name);
    setAddressSearch(location.display_name);
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lon);
    setLatitude(lat);
    setLongitude(lng);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);

    // Update map
    if (mapLoaded) {
      const L = (window as any).L;
      const mapContainer = document.getElementById('map-container');
      if (mapContainer && L) {
        renderMap();
      }
    }
  };

  // Handle media upload
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (mediaFiles.length + files.length > 5) {
      alert("You can only upload up to 5 files");
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) {
        alert(`${file.name} is not a valid image or video file`);
        return;
      }

      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Max size: ${isVideo ? '50MB' : '5MB'}`);
        return;
      }

      validFiles.push(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setMediaPreviews([...mediaPreviews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setMediaFiles([...mediaFiles, ...validFiles]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !category || !priority || !address.trim() || !description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setUploadingMedia(true);

    try {
      // Upload media files
      const mediaUrls: string[] = [];
      
      for (const file of mediaFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        mediaUrls.push(publicUrl);
      }

      setUploadingMedia(false);

      // Insert report
      const { error } = await supabase
        .from("reports")
        .insert([{
          user_id: user.id,
          title,
          category,
          priority,
          address,
          description,
          media_urls: mediaUrls,
          latitude,
          longitude,
          status: 'pending'
        }]);

      if (error) throw error;

      alert("Report submitted successfully!");
      onBack();
    } catch (error: any) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report: " + error.message);
    } finally {
      setSubmitting(false);
      setUploadingMedia(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[430px] bg-white shadow-lg overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b p-6">
          <button
            onClick={onBack}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Submit a Report</h1>
          <p className="text-sm text-gray-600 mt-1">Help improve our community by reporting issues.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title of Issue
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the issue (e.g. Large pothole on Main St.)"
              className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Priority Level
            </label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                <option value="">Select priority level</option>
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
            {priority && (
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  priority === 'low' ? 'bg-green-500' :
                  priority === 'medium' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  priority === 'low' ? 'text-green-600' :
                  priority === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {priorities.find(p => p.value === priority)?.label} Priority
                </span>
              </div>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Exact Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressSearch}
                onChange={(e) => handleAddressSearch(e.target.value)}
                onFocus={() => setShowAddressSuggestions(true)}
                placeholder="e.g. 123 Maple Avenue, Barangay San Pedro"
                className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-4" />

              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {addressSuggestions.map((location, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectAddress(location)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 text-left border-b last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{location.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about the issue..."
              className="w-full bg-gray-50 border-0 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={6}
              required
            />
          </div>

          {/* Upload Photos/Videos */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Upload Photos/Videos
            </label>
            
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {mediaFiles[index].type.startsWith('video/') ? (
                      <video
                        src={preview}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mediaFiles.length < 5 && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 mb-2 text-gray-400">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 15v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3M17 8l-5-5-5 5M12 3v12"/>
                      <circle cx="9" cy="9" r="2"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Drag and drop or click to upload
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG, MP4 up to 50MB
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || uploadingMedia}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {uploadingMedia ? 'Uploading...' : 'Submitting...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Panel - Map */}
      <div className="hidden lg:block flex-1 relative">
        {/* Search Bar on Map */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-md px-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search address or landmark..."
              value={addressSearch}
              onChange={(e) => handleAddressSearch(e.target.value)}
              className="w-full bg-white shadow-lg border-0 rounded-full px-6 py-3 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
          </div>
        </div>

        {/* Drop Pin Button */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-12 z-10 flex flex-col items-center">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg mb-2">
            DROP PIN HERE
          </div>
          <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>

        {/* Map Container */}
        <div ref={mapRef} className="w-full h-full bg-gray-200"></div>

        {/* Map Controls */}
        <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
          <button className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.657 14.828l-1.414-1.414L15 14.657l1.414 1.414 1.243-1.243zM12 6v2c-2.76 0-5 2.24-5 5h2c0-1.66 1.34-3 3-3V8l4 4-4 4v-2c-2.76 0-5-2.24-5-5 0-2.76 2.24-5 5-5z"/>
            </svg>
          </button>
        </div>

        {/* Current Location Button */}
        <div className="absolute bottom-6 right-6 z-10">
          <button className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileReport;