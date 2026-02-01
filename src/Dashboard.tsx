import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import FileReport from "./components/FileReport";
import MyReports from "./components/MyReports";
import { useRef } from "react";

// Import all icons from lucide-react library
import { 
  Home, FileText, Bell, MessageSquare, Search,
  Image, MapPin, Smile, AlertTriangle, Plus, MoreVertical,
  ThumbsUp, ThumbsDown, Share2, LogOut, Calendar,
  Activity, CheckCircle, Clock, Megaphone, Trees, Send, Flame,
  ShieldCheck, Ambulance, Building2, Phone, Backpack, UserRound, Users,
   ChevronDown, ChevronUp, Info, ChevronLeft, ChevronRight, X
} from "lucide-react";

// TypeScript interface defining the structure of a Post object
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  location: string | null;
  mood: string | null;
  is_anonymous: boolean;
  upvotes?: number; // Calculated from votes
  downvotes?: number; // Calculated from votes
  userVote?: 'upvote' | 'downvote' | null;
  commentCount?: number; 
  created_at: string;
  users?: {
    full_name: string;
    email: string;
    username: string;
  };
}



// TypeScript interface for comments
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null; // Add this for replies
  users?: {
    full_name: string;
    email: string;
    username: string;
  };
  replies?: Comment[]; // Add this to hold nested replies
}

// TypeScript interface for location search results from OpenStreetMap API
interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
}


const Dashboard = () => {

  // ========== STATE MANAGEMENT ==========
  // User authentication and profile data
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Posts-related state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  // Modal visibility controls
  const [showPostModal, setShowPostModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  // Media handling
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);
  // Post editing and menu controls
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  // Location search functionality
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationResult[]>([]);
  const locationSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mood selection
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Comment-related state
const [showComments, setShowComments] = useState<string | null>(null);
const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
const [commentContent, setCommentContent] = useState("");
const [postingComment, setPostingComment] = useState(false);
const [replyingTo, setReplyingTo] = useState<string | null>(null); 
const [replyContent, setReplyContent] = useState(""); 
const [showReplies, setShowReplies] = useState<{ [commentId: string]: boolean }>({}); 

// Share modal state
const [showShareModal, setShowShareModal] = useState<string | null>(null); 
const [copySuccess, setCopySuccess] = useState(false);

const [showFileReport, setShowFileReport] = useState(false);
const [showMyReports, setShowMyReports] = useState(false); 

// My active reports
const [userReports, setUserReports] = useState<any[]>([]);
const [loadingReports, setLoadingReports] = useState(false);


const [activeTab, setActiveTab] = useState<'feed' | 'alerts' | 'announcements' | 'parks'>('feed');

const [alerts, setAlerts] = useState<any[]>([]);
const [alertsLoading, setAlertsLoading] = useState(true);

const [announcements, setAnnouncements] = useState<any[]>([]);
const [announcementsLoading, setAnnouncementsLoading] = useState(true);
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [currentMonth, setCurrentMonth] = useState(new Date());
const [viewingAnnouncementId, setViewingAnnouncementId] = useState<string | null>(null);

const getRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (hours < 48) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return null; // fallback to full date
};

const INITIAL_COUNT = 3;
const LOAD_STEP = 3;
const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

const dashboardAnnouncements = announcements
  .filter(a => a.status === 'published')
  .sort(
    (a, b) =>
      new Date(b.scheduled_date || b.created_at).getTime() -
      new Date(a.scheduled_date || a.created_at).getTime()
  )
  .slice(0, 2); // show only 2 on dashboard


    // ========== LIFECYCLE HOOKS ==========
  // Run once when component mounts
 useEffect(() => {
  checkUser();
}, []);

useEffect(() => {
  if (user) {
    fetchPosts();
    fetchUserReports();
  }
}, [user]);

useEffect(() => {
  fetchAlerts();
  
  // Subscribe to real-time updates so alerts update automatically
  const subscription = supabase
    .channel('local_alerts_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'local_alerts' },
      () => {
        fetchAlerts();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);


useEffect(() => {
  fetchAnnouncements();
  
  // Subscribe to real-time updates
  const subscription = supabase
    .channel('announcements_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'announcements' },
      () => {
        fetchAnnouncements();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  setVisibleCount(3);
}, [selectedDate]);



  // ========== USER AUTHENTICATION ==========
  // Check current authenticated user and fetch their profile data
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
    
    setLoading(false);
  };

 // ========== POST FETCHING ==========
  // Fetch all posts from database and join with user information
const fetchPosts = async () => {
  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching posts:", postsError);
    return;
  }

  // Get all votes for all posts in one query
  const postIds = postsData?.map(p => p.id) || [];
  const { data: allVotes } = await supabase
    .from("votes")
    .select("post_id, vote_type, user_id")
    .in("post_id", postIds);

  // For each post, calculate votes and check user vote
  const postsWithUsers = await Promise.all(
    (postsData || []).map(async (post) => {
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, username")
        .eq("id", post.user_id)
        .maybeSingle();
      
      // Filter votes for this specific post
      const postVotes = allVotes?.filter(v => v.post_id === post.id) || [];
      
      // Count upvotes and downvotes
      const upvotes = postVotes.filter(v => v.vote_type === 'upvote').length;
      const downvotes = postVotes.filter(v => v.vote_type === 'downvote').length;
      
      // Check if current user voted
      const userVote = user 
        ? postVotes.find(v => v.user_id === user.id)?.vote_type || null
        : null;
      
        // Get comment count
      const { count: commentCount } = await supabase
        .from("comments")
        .select("*", { count: 'exact', head: true })
        .eq("post_id", post.id);


      return {
        ...post,
        users: userData || null,
        upvotes,
        downvotes,
        userVote,
        commentCount: commentCount || 0,
      };
    })
  );

  // Sort posts by upvotes (highest first), then by created_at
  const sortedPosts = postsWithUsers.sort((a, b) => {
    const upvotesA = a.upvotes || 0;
    const upvotesB = b.upvotes || 0;
    
    if (upvotesB !== upvotesA) {
      return upvotesB - upvotesA; // Sort by upvotes descending
    }
    
    // If upvotes are equal, sort by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  setPosts(postsWithUsers);
};


const fetchUserReports = async () => {
  if (!user) return;
  
  setLoadingReports(true);
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3); // Only show latest 3 reports

    if (error) throw error;
    setUserReports(data || []);
  } catch (error) {
    console.error("Error fetching user reports:", error);
  } finally {
    setLoadingReports(false);
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'PENDING' };
    case 'in_progress':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'IN PROGRESS' };
    case 'resolved':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'RESOLVED' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'UNKNOWN' };
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-orange-500" />;
    case 'in_progress':
      return <Activity className="w-4 h-4 text-blue-500" />;
    case 'resolved':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-500" />;
  }
};


 // ========== IMAGE/VIDEO UPLOAD HANDLING ==========
  // Handle file selection and upload to Supabase storage
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      alert("Please select an image or video file");
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size should be less than ${isVideo ? '50MB' : '5MB'}`);
      return;
    }

    setUploadingImage(true);

    try {
      if (editingPost && editingPost.image_url && editingPost.image_url.includes('post-images')) {
        const oldMediaPath = editingPost.image_url.split('post-images/')[1];
        await supabase.storage.from('post-images').remove([oldMediaPath]);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedMediaType(isVideo ? 'video' : 'image');
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      setSelectedImage(publicUrl);
      setSelectedMediaType(isVideo ? 'video' : 'image');
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file: " + error.message);
      setSelectedImage(null);
      setSelectedMediaType(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setSelectedMediaType(null);
  };


// ========== POST DELETION ==========
  // Delete a post and its associated media from storage
  const handleDeletePost = async (postId: string, imageUrl: string | null) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      if (imageUrl) {
        try {
          let filePath = '';
          
          if (imageUrl.includes('/storage/v1/object/public/post-images/')) {
            filePath = imageUrl.split('/storage/v1/object/public/post-images/')[1];
          } else if (imageUrl.includes('post-images/')) {
            const parts = imageUrl.split('post-images/');
            filePath = parts[parts.length - 1];
          }
          
          filePath = decodeURIComponent(filePath);
          
          if (filePath) {
            await supabase.storage.from('post-images').remove([filePath]);
          }
        } catch (storageError) {
          console.error("Error deleting media from storage:", storageError);
        }
      }

      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      setPosts(posts.filter(post => post.id !== postId));
      setOpenMenuId(null);
      alert("Post deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post: " + error.message);
    }
  };

  // ========== POST EDITING ==========
  // Load post data into the edit form
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setPostContent(post.content);
    setSelectedImage(post.image_url);
    if (post.image_url) {
      const isVideo = post.image_url.match(/\.(mp4|webm|ogg|mov)$/i);
      setSelectedMediaType(isVideo ? 'video' : 'image');
    }
    setIsAnonymous(post.is_anonymous);
    setSelectedLocation(post.location);
    setSelectedMood(post.mood);
    setShowPostModal(true);
    setOpenMenuId(null);
  };

  // Update existing post in database
  const handleUpdatePost = async () => {
    if (!editingPost) return;
    if (!postContent.trim() && !selectedImage) {
      alert("Post cannot be empty!");
      return;
    }

    setPosting(true);

    try {
      if (editingPost.image_url && !selectedImage && editingPost.image_url.includes('post-images')) {
        const oldImagePath = editingPost.image_url.split('post-images/')[1];
        await supabase.storage.from('post-images').remove([oldImagePath]);
      }

      const { data, error } = await supabase
        .from("posts")
        .update({
          content: postContent,
          image_url: selectedImage,
          is_anonymous: isAnonymous,
          location: selectedLocation,
          mood: selectedMood,
        })
        .eq("id", editingPost.id)
        .select()
        .single();

      if (error) throw error;

      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, username")
        .eq("id", user.id)
        .maybeSingle();

      setPosts(posts.map(p => 
      p.id === editingPost.id 
        ? { 
            ...data, 
            users: userData || null,
            upvotes: editingPost.upvotes,      // Keep existing upvotes
            downvotes: editingPost.downvotes,  // Keep existing downvotes
            userVote: editingPost.userVote,     // Keep existing userVote
            commentCount: editingPost.commentCount // Keep existing commentCount
          } 
        : p
    ));
      
      setPostContent("");
      setIsAnonymous(false);
      setSelectedImage(null);
      setSelectedMediaType(null);
      setSelectedLocation(null);
      setSelectedMood(null);
      setEditingPost(null);
      setShowPostModal(false);
    } catch (error: any) {
      console.error("Error updating post:", error);
      alert("Failed to update post: " + error.message);
    } finally {
      setPosting(false);
    }
  };

// ========== POST CREATION ==========
  // Create new post in database
  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedImage) {
      alert("Please write something or add media before posting!");
      return;
    }

    setPosting(true);

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([{
          user_id: user.id,
          content: postContent,
          image_url: selectedImage,
          location: selectedLocation,
          mood: selectedMood,
          is_anonymous: isAnonymous,
        }])
        .select()
        .single();

      if (error) throw error;

      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, username")
        .eq("id", user.id)
        .maybeSingle();

      setPosts([{ ...data, users: userData }, ...posts]);
      setPostContent("");
      setIsAnonymous(false);
      setSelectedImage(null);
      setSelectedMediaType(null);
      setSelectedLocation(null);
      setSelectedMood(null);
      setShowPostModal(false);
    } catch (error: any) {
      console.error("Error creating post:", error);
      alert("Failed to create post: " + error.message);
    } finally {
      setPosting(false);
    }
  };


  // ========== USER LOGOUT ==========
  // Sign out user and clear all stored data
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  // ========== VOTING SYSTEM ==========
// Handle upvote/downvote on a post
const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
  if (!user) {
    alert("Please log in to vote");
    return;
  }

  try {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from("votes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    let newUpvotes = post.upvotes || 0;
    let newDownvotes = post.downvotes || 0;
    let newUserVote: 'upvote' | 'downvote' | null = voteType;

    if (existingVote) {
      // User already voted
      if (existingVote.vote_type === voteType) {
        // Clicking same vote - remove vote
        await supabase
          .from("votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (voteType === 'upvote') {
          newUpvotes--;
        } else {
          newDownvotes--;
        }
        newUserVote = null;
      } else {
        // Switching vote type
        await supabase
          .from("votes")
          .update({ vote_type: voteType })
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (voteType === 'upvote') {
          newUpvotes++;
          newDownvotes--;
        } else {
          newDownvotes++;
          newUpvotes--;
        }
      }
    } else {
      // New vote
      await supabase
        .from("votes")
        .insert([{
          post_id: postId,
          user_id: user.id,
          vote_type: voteType
        }]);

      if (voteType === 'upvote') {
        newUpvotes++;
      } else {
        newDownvotes++;
      }
    }

   // Update local state immediately and re-sort
    const updatedPosts = posts.map(p => 
      p.id === postId 
        ? { ...p, upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote }
        : p
    );

    // Sort posts by upvotes (highest first), then by created_at
    const sortedPosts = updatedPosts.sort((a, b) => {
      const upvotesA = a.upvotes || 0;
      const upvotesB = b.upvotes || 0;
      
      if (upvotesB !== upvotesA) {
        return upvotesB - upvotesA; // Sort by upvotes descending
      }
      
      // If upvotes are equal, sort by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(sortedPosts);

  } catch (error: any) {
    console.error("Error voting:", error);
    alert("Failed to vote: " + error.message);
    // Refresh on error to get correct state
    await fetchPosts();
  }
};

// ========== COMMENT SYSTEM ==========
// Fetch comments for a specific post
const fetchComments = async (postId: string) => {
  const { data: commentsData, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return;
  }

  // Fetch user data for each comment
  const commentsWithUsers = await Promise.all(
    (commentsData || []).map(async (comment) => {
      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, username")
        .eq("id", comment.user_id)
        .maybeSingle();
      
      return {
        ...comment,
        users: userData || null
      };
    })
  );

  // Organize comments into parent comments and replies
  const parentComments = commentsWithUsers.filter(c => !c.parent_id);
  const repliesMap: { [key: string]: Comment[] } = {};
  
  commentsWithUsers.forEach(comment => {
    if (comment.parent_id) {
      if (!repliesMap[comment.parent_id]) {
        repliesMap[comment.parent_id] = [];
      }
      repliesMap[comment.parent_id].push(comment);
    }
  });

  // Attach replies to their parent comments
  const organizedComments = parentComments.map(comment => ({
    ...comment,
    replies: repliesMap[comment.id] || []
  }));

  setComments(prev => ({
    ...prev,
    [postId]: organizedComments
  }));
};

// Toggle comment section visibility
const handleToggleComments = async (postId: string) => {
  if (showComments === postId) {
    setShowComments(null);
  } else {
    setShowComments(postId);
    if (!comments[postId]) {
      await fetchComments(postId);
    }
  }
};

// Post a new comment
const handlePostComment = async (postId: string) => {
  if (!user) {
    alert("Please log in to comment");
    return;
  }

  if (!commentContent.trim()) {
    alert("Comment cannot be empty");
    return;
  }

  setPostingComment(true);

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert([{
        post_id: postId,
        user_id: user.id,
        content: commentContent
      }])
      .select()
      .single();

    if (error) throw error;

    const { data: userData } = await supabase
      .from("users")
      .select("full_name, email, username")
      .eq("id", user.id)
      .maybeSingle();

    // Add new comment to local state
    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), { ...data, users: userData }]
    }));

    // Update comment count
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, commentCount: (p.commentCount || 0) + 1 }
        : p
    ));

    setCommentContent("");
  } catch (error: any) {
    console.error("Error posting comment:", error);
    alert("Failed to post comment: " + error.message);
  } finally {
    setPostingComment(false);
  }
};


// Post a reply to a comment
const handlePostReply = async (postId: string, parentCommentId: string) => {
  if (!user) {
    alert("Please log in to reply");
    return;
  }

  if (!replyContent.trim()) {
    alert("Reply cannot be empty");
    return;
  }

  setPostingComment(true);

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert([{
        post_id: postId,
        user_id: user.id,
        content: replyContent,
        parent_id: parentCommentId
      }])
      .select()
      .single();

    if (error) throw error;

    const { data: userData } = await supabase
      .from("users")
      .select("full_name, email, username")
      .eq("id", user.id)
      .maybeSingle();

    const newReply = { ...data, users: userData };

    // Add reply to the parent comment in local state
    setComments(prev => {
      const postComments = prev[postId] || [];
      return {
        ...prev,
        [postId]: postComments.map(comment => 
          comment.id === parentCommentId
            ? { ...comment, replies: [...(comment.replies || []), newReply] }
            : comment
        )
      };
    });

    // Update comment count (replies count as comments too)
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, commentCount: (p.commentCount || 0) + 1 }
        : p
    ));

    // Auto-show replies when posting a new reply
    setShowReplies(prev => ({
      ...prev,
      [parentCommentId]: true
    }));

    setReplyContent("");
    setReplyingTo(null);
  } catch (error: any) {
    console.error("Error posting reply:", error);
    alert("Failed to post reply: " + error.message);
  } finally {
    setPostingComment(false);
  }
};

// Toggle reply input
const handleToggleReply = (commentId: string) => {
  if (replyingTo === commentId) {
    setReplyingTo(null);
    setReplyContent("");
  } else {
    setReplyingTo(commentId);
  }
};

// Toggle replies visibility
const handleToggleReplies = (commentId: string) => {
  setShowReplies(prev => ({
    ...prev,
    [commentId]: !prev[commentId]
  }));
};


// Delete a comment (and all its replies)
const handleDeleteComment = async (postId: string, commentId: string) => {
  if (!confirm("Are you sure you want to delete this comment? All replies will also be deleted.")) return;

  try {
    // Get all reply IDs for this comment
    const repliesToDelete = comments[postId]?.find(c => c.id === commentId)?.replies || [];
    const totalDeleted = 1 + repliesToDelete.length;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;

    // Remove comment from local state
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
    }));

    // Update comment count
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, commentCount: Math.max((p.commentCount || 0) - totalDeleted, 0) }
        : p
    ));

    alert("Comment deleted successfully!");
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    alert("Failed to delete comment: " + error.message);
  }
};

// Delete a reply
const handleDeleteReply = async (postId: string, parentCommentId: string, replyId: string) => {
  if (!confirm("Are you sure you want to delete this reply?")) return;

  try {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", replyId);

    if (error) throw error;

    // Remove reply from local state
    setComments(prev => {
      const postComments = prev[postId] || [];
      return {
        ...prev,
        [postId]: postComments.map(comment => 
          comment.id === parentCommentId
            ? { ...comment, replies: (comment.replies || []).filter(r => r.id !== replyId) }
            : comment
        )
      };
    });

    // Update comment count
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, commentCount: Math.max((p.commentCount || 0) - 1, 0) }
        : p
    ));

    alert("Reply deleted successfully!");
  } catch (error: any) {
    console.error("Error deleting reply:", error);
    alert("Failed to delete reply: " + error.message);
  }
};


// ========== SHARE SYSTEM ==========
// Generate shareable link for a post
const getPostLink = (postId: string) => {
  return `${window.location.origin}/post/${postId}`;
};

// Copy link to clipboard
const handleCopyLink = async (postId: string) => {
  try {
    await navigator.clipboard.writeText(getPostLink(postId));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  } catch (error) {
    console.error("Failed to copy:", error);
    alert("Failed to copy link");
  }
};

// Share to social media
const handleShareToSocial = (platform: string, postId: string, postContent: string) => {
  const url = getPostLink(postId);
  const text = postContent.slice(0, 100) + (postContent.length > 100 ? '...' : '');
  
  let shareUrl = '';
  
  switch(platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      break;
    case 'telegram':
      shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      break;
    case 'messenger':
      shareUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
      break;
  }
  
  window.open(shareUrl, '_blank', 'width=600,height=400');
};

const fetchAlerts = async () => {
  setAlertsLoading(true);
  const { data, error } = await supabase
    .from("local_alerts")
    .select("*")
    .eq("status", "live")
    .order("created_at", { ascending: false });

  if (!error && data) {
    // Optional: Filter by user's barangay
    // If you have user.barangay field, uncomment below:
    // const filteredAlerts = user?.barangay 
    //   ? data.filter(alert => alert.affected_areas.includes(user.barangay))
    //   : data;
    setAlerts(data);
  }
  setAlertsLoading(false);
};

const fetchAnnouncements = async () => {
  setAnnouncementsLoading(true);
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("scheduled_date", { ascending: false });

  if (!error && data) {
    setAnnouncements(data);
  }
  setAnnouncementsLoading(false);
};


const getCategoryLabel = (category: string) => {
  const labels: { [key: string]: string } = {
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
    case 'critical': 
      return { 
        bg: 'bg-red-500', 
        text: 'text-red-600', 
        badge: 'bg-red-600', 
        light: 'bg-red-100' 
      };
    case 'warning': 
      return { 
        bg: 'bg-orange-400', 
        text: 'text-orange-600', 
        badge: 'bg-orange-600', 
        light: 'bg-orange-100' 
      };
    case 'advisory': 
      return { 
        bg: 'bg-blue-500', 
        text: 'text-blue-600', 
        badge: 'bg-blue-600', 
        light: 'bg-blue-100' 
      };
    default: 
      return { 
        bg: 'bg-gray-500', 
        text: 'text-gray-600', 
        badge: 'bg-gray-600', 
        light: 'bg-gray-100' 
      };
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  }
};
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  return {
    daysInMonth: lastDay.getDate(),
    startingDayOfWeek: firstDay.getDay()
  };
};

const getAnnouncementsForDate = (date: Date) => {
  return announcements.filter(ann => {
    const annDate = new Date(ann.scheduled_date || ann.created_at);
    return annDate.toDateString() === date.toDateString();
  });
};

const goToPreviousMonth = () => {
  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
};

const goToNextMonth = () => {
  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
};

const getCategoryBadge = (category: string) => {
  const badges: { [key: string]: { bg: string; text: string } } = {
    council_meeting: { bg: 'bg-blue-50', text: 'text-blue-600' },
    utility_update: { bg: 'bg-gray-100', text: 'text-gray-600' },
    general_news: { bg: 'bg-green-50', text: 'text-green-600' },
    event: { bg: 'bg-purple-50', text: 'text-purple-600' },
    maintenance: { bg: 'bg-orange-50', text: 'text-orange-600' }
  };
  
  const badge = badges[category] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  const labels: { [key: string]: string } = {
    general_news: 'General News',
    council_meeting: 'Council Meeting',
    utility_update: 'Utility Update',
    event: 'Event',
    maintenance: 'Maintenance'
  };
  const label = labels[category] || category;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.bg} ${badge.text} uppercase`}>
      {label}
    </span>
  );
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  };
};


// ========== TIME FORMATTING ==========
  // Convert timestamp to human-readable "time ago" format
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffInMs = now.getTime() - posted.getTime();

    const diffInSeconds = Math.floor(diffInMs / 1000);
    if (diffInSeconds < 60) return "Just now";

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };


  // ========== ANONYMOUS NAME GENERATION ==========
  // Generate consistent anonymous name from post ID (e.g., "Anonymous1234")
  const getAnonymousName = (postId: string) => {
    let hash = 0;
    for (let i = 0; i < postId.length; i++) {
      hash = ((hash << 5) - hash) + postId.charCodeAt(i);
      hash = hash & hash;
    }
    const fourDigits = Math.abs(hash % 10000).toString().padStart(4, '0');
    return `Anonymous${fourDigits}`;
  };


  // ========== MOOD OPTIONS ==========
  // Available moods with emojis and colors
  const moods = [
    { emoji: "😊", label: "Happy", color: "bg-yellow-100" },
    { emoji: "😢", label: "Sad", color: "bg-blue-100" },
    { emoji: "😠", label: "Angry", color: "bg-red-100" },
    { emoji: "😰", label: "Worried", color: "bg-orange-100" },
    { emoji: "😌", label: "Grateful", color: "bg-green-100" },
    { emoji: "😤", label: "Frustrated", color: "bg-purple-100" },
    { emoji: "🤔", label: "Thoughtful", color: "bg-gray-100" },
    { emoji: "😃", label: "Excited", color: "bg-pink-100" },
  ];

// ========== LOCATION SEARCH ==========
  // Search for locations using OpenStreetMap Nominatim API with debouncing
  const handleLocationSearch = (query: string) => {
    setLocationSearch(query);

    // Clear any previous timeout
    if (locationSearchTimeout.current) {
      clearTimeout(locationSearchTimeout.current);
    }

    // If query is too short, clear suggestions
    if (query.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    // Wait 500ms after typing stops before fetching
    locationSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5`
        );
        const data = await res.json();
        setLocationSuggestions(data);
      } catch (error) {
        console.error("Location search failed", error);
      }
    }, 500); // 500ms debounce
  };
  // Select a location from search results
  const handleSelectLocation = (location: string) => {
    setSelectedLocation(location);
    setLocationSearch(location); // keep the selected text visible
    setLocationSuggestions([]);  // hide only the suggestion list
  };
  // Select a mood and close modal
  const handleSelectMood = (mood: string) => {
    setSelectedMood(mood);
    setShowMoodModal(false);
  };


  
  // ========== LOADING STATE ==========
  // Show loading indicator while checking user authentication
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

     // Show File Report page if active
  if (showFileReport) {
    return <FileReport onBack={() => setShowFileReport(false)} />;
  }

  // Show My Reports page if active
if (showMyReports) {
  return <MyReports onBack={() => setShowFileReport(true)} onNavigateHome={() => setShowMyReports(false)} />;
}
  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

           {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Online Sumbungan</h1>
          </div>

          {/* Search bar */}
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

          {/* User profile and notifications */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell className="w-6 h-6" />
            </button>
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


      {/* ========== MAIN CONTENT ========== */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* ========== LEFT SIDEBAR ========== */}
          <aside className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">

              {/* Navigation menu */}
        <button 
          onClick={() => setActiveTab('feed')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold ${
            activeTab === 'feed' 
              ? 'bg-blue-50 text-blue-600' 
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <Home className="w-5 h-5" />
          Home Feed
        </button>

              <button 
                onClick={() => setShowMyReports(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <FileText className="w-5 h-5" />
                My Reports
              </button>

              {/* Local services section */}
                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-4 mb-3">
                    Local Services
                  </p>

                  {/* Local Alerts */}
                  <button 
                    onClick={() => setActiveTab('alerts')}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left ${
                      activeTab === 'alerts' ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${activeTab === 'alerts' ? 'bg-red-200' : 'bg-red-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
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
                  <button 
                    onClick={() => setActiveTab('announcements')}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left ${
                      activeTab === 'announcements' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${activeTab === 'announcements' ? 'bg-blue-200' : 'bg-blue-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
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
                  <button 
                    onClick={() => setActiveTab('parks')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                      activeTab === 'parks' ? 'bg-green-50 text-green-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${activeTab === 'parks' ? 'bg-green-200' : 'bg-green-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Trees className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="font-semibold text-gray-900">
                      Parks & Recreation
                    </p>
                  </button>
                </div>




              {/* Logout button */}
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

         {/* ========== CENTER FEED ========== */}
<main className="col-span-6">
  {/* ========== CREATE/EDIT POST MODAL ========== */}
  {showPostModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-xl font-bold">{editingPost ? "Edit Post" : "Create Post"}</h3>
          <button
            onClick={() => {
              setShowPostModal(false);
              setPostContent("");
              setIsAnonymous(false);
              setSelectedImage(null);
              setSelectedMediaType(null);
              setSelectedLocation(null);
              setSelectedMood(null);
              setEditingPost(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6">
          <div className="flex gap-3 mb-4">
            <div className="w-10 h-10 bg-green-400 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <p className="font-semibold">{userData?.full_name || "User"}</p>
              <p className="text-sm text-gray-500">Public</p>
            </div>
          </div>

          {/* Post content textarea */}
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-gray-50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[150px]"
            autoFocus
          />

          {/* Media preview (image or video) */}
          {selectedImage && (
            <div className="relative mt-4">
              {selectedMediaType === 'video' ? (
                <video
                  src={selectedImage}
                  controls
                  className="w-full rounded-lg max-h-96"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              )}
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white rounded-full p-2 hover:bg-opacity-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {uploadingImage && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-blue-600">Uploading {selectedMediaType === 'video' ? 'video' : 'image'}...</span>
            </div>
          )}

          <div className="mt-4 p-4 border rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-3">Add to your post</p>
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer">
                <Image className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Photo/Video</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>

              <button 
                onClick={() => setShowLocationModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <MapPin className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium">Location</span>
              </button>

              <button 
                onClick={() => setShowMoodModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <Smile className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium">Mood</span>
              </button>
            </div>

            {selectedLocation && (
              <div className="mt-3 flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-700">{selectedLocation}</span>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {selectedMood && (
              <div className="mt-3 flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                <span className="text-lg">{moods.find(m => m.label === selectedMood)?.emoji}</span>
                <span className="text-sm text-gray-700">Feeling {selectedMood}</span>
                <button
                  onClick={() => setSelectedMood(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Post anonymously</span>
          </label>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={editingPost ? handleUpdatePost : handleCreatePost}
            disabled={posting || (!postContent.trim() && !selectedImage) || uploadingImage}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {posting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {editingPost ? "Updating..." : "Posting..."}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {editingPost ? "Update" : "Post"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )}

  {/* ========== LOCATION MODAL ========== */}
  {showLocationModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-xl font-bold">Add Location</h3>
          <button
            onClick={() => {
              setShowLocationModal(false);
              setLocationSearch("");
              setLocationSuggestions([]);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => handleLocationSearch(e.target.value)}
              placeholder="Search any city, barangay, or street..."
              className="w-full bg-gray-50 rounded-lg px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {locationSuggestions.map((loc) => (
              <button
                key={`${loc.lat}-${loc.lon}`}
                onClick={() => handleSelectLocation(loc.display_name)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
              >
                <MapPin className="w-5 h-5 text-red-600" />
                <span className="text-gray-900">{loc.display_name}</span>
              </button>
            ))}
            
            {locationSearch && locationSuggestions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No locations found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* ========== MOOD MODAL ========== */}
  {showMoodModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold">How are you feeling?</h3>
          <button
            onClick={() => setShowMoodModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-3">
          {moods.map((mood) => (
            <button
              key={mood.label}
              onClick={() => handleSelectMood(mood.label)}
              className={`${mood.color} p-4 rounded-lg hover:opacity-80 transition-opacity flex items-center gap-3`}
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className="font-medium text-gray-800">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )}

  {/* ========== FEED TAB ========== */}
  {activeTab === 'feed' && (
    <>
      <button
        onClick={() => setShowPostModal(true)}
        className="w-full bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 bg-green-400 rounded-full flex-shrink-0"></div>
        <span className="text-gray-500 text-left flex-1">Share something with your neighbors...</span>
      </button>

      {/* ========== CALL-TO-ACTION BANNER ========== */}
      <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">See a local issue?</p>
            <p className="text-sm text-gray-600">Help your community by reporting it now.</p>
          </div>
        </div>

        <button 
          onClick={() => setShowFileReport(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          File a New Report
        </button>
      </div>

      {/* ========== POSTS FEED ========== */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
          <p className="text-gray-500">Be the first to share something with your community!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex gap-4">
              {/* ========== VOTING SECTION (LEFT SIDE) ========== */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleVote(post.id, 'upvote')}
                  className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                    post.userVote === 'upvote' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4l-8 8h5v8h6v-8h5z" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  {post.upvotes ?? 0}
                </span>
                <button
                  onClick={() => handleVote(post.id, 'downvote')}
                  className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                    post.userVote === 'downvote' ? 'text-red-600' : 'text-gray-400'
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 20l8-8h-5V4H9v8H4z" />
                  </svg>
                </button>
              </div>

              {/* ========== POST CONTENT ========== */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 w-full">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${post.is_anonymous ? 'bg-gray-400' : 'bg-orange-300'} flex items-center justify-center text-white font-bold text-lg`}>
                      {post.is_anonymous ? getAnonymousName(post.id).slice(0, 2) : (post.users?.full_name?.slice(0, 2) || "U")}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col min-w-0">
                      {/* Row 1: Full Name + Mood */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate max-w-xs">
                          {post.is_anonymous 
                            ? getAnonymousName(post.id)
                            : (post.users?.full_name || post.users?.username || post.users?.email?.split('@')[0] || "User")
                          }
                        </h3>

                        {post.mood && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            {moods.find(m => m.label === post.mood)?.emoji} Feeling {post.mood}
                          </span>
                        )}
                      </div>

                      {/* Row 2: Time + Public */}
                      <span className="text-xs text-gray-500 mt-1">
                        {getTimeAgo(post.created_at)} • Public
                      </span>

                      {/* Row 3: Location */}
                      {post.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-600 mt-1 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-red-500" />
                          {post.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete Menu */}
                  {user?.id === post.user_id && (
                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                      >
                        <MoreVertical className="w-6 h-6" />
                      </button>
                      
                      {openMenuId === post.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                          <button
                            onClick={() => handleEditPost(post)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                          >
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="font-medium">Edit post</span>
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id, post.image_url)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 text-left rounded-b-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="font-medium">Delete post</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Post Text Content */}
                <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

                {/* Post Media */}
                {post.image_url && (
                  <>
                    {post.image_url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video
                        src={post.image_url}
                        controls
                        className="w-full rounded-lg mb-4 max-h-96"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full rounded-lg mb-4"
                      />
                    )}
                  </>
                )}

                {/* ========== POST ACTIONS (COMMENT & SHARE ONLY) ========== */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <button 
                    onClick={() => handleToggleComments(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Comment {post.commentCount ? `(${post.commentCount})` : ''}
                  </button>

                  <button 
                    onClick={() => setShowShareModal(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              </div>
            </div>

            {/* ========== COMMENTS SECTION ========== */}
            {showComments === post.id && (
              <div className="mt-4 pt-4 border-t">
                {/* Comment Input */}
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-400 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handlePostComment(post.id)}
                        disabled={postingComment || !commentContent.trim()}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {postingComment ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments[post.id]?.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
                  ) : (
                    comments[post.id]?.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        {/* Main Comment */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 bg-purple-300 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                            {comment.users?.full_name?.slice(0, 2) || "U"}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-100 rounded-lg px-3 py-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">
                                  {comment.users?.full_name || comment.users?.username || "User"}
                                </h4>
                                {user?.id === comment.user_id && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-4 ml-3 mt-1">
                              <span className="text-xs text-gray-500">
                                {getTimeAgo(comment.created_at)}
                              </span>
                              <button
                                onClick={() => handleToggleReply(comment.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                Reply
                              </button>
                              {/* Show/Hide Replies Button - only if there are replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <button
                                  onClick={() => handleToggleReplies(comment.id)}
                                  className="text-xs text-gray-600 hover:text-gray-800 font-semibold flex items-center gap-1"
                                >
                                  {showReplies[comment.id] ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                              <div className="flex gap-2 mt-3">
                                <div className="w-6 h-6 bg-green-400 rounded-full flex-shrink-0"></div>
                                <div className="flex-1">
                                  <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button
                                      onClick={() => {
                                        setReplyingTo(null);
                                        setReplyContent("");
                                      }}
                                      className="text-gray-600 px-3 py-1 rounded-lg text-sm hover:bg-gray-100"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handlePostReply(post.id, comment.id)}
                                      disabled={postingComment || !replyContent.trim()}
                                      className="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                      {postingComment ? "Posting..." : "Reply"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Replies - Only show if showReplies[comment.id] is true */}
                        {comment.replies && comment.replies.length > 0 && showReplies[comment.id] && (
                          <div className="ml-11 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <div className="w-7 h-7 bg-indigo-300 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                                  {reply.users?.full_name?.slice(0, 2) || "U"}
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-sm">
                                        {reply.users?.full_name || reply.users?.username || "User"}
                                      </h4>
                                      {user?.id === reply.user_id && (
                                        <button
                                          onClick={() => handleDeleteReply(post.id, comment.id, reply.id)}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-800 mt-1">{reply.content}</p>
                                  </div>
                                  <span className="text-xs text-gray-500 ml-3 mt-1">
                                    {getTimeAgo(reply.created_at)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ========== SHARE MODAL ========== */}
            {showShareModal === post.id && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                onClick={() => setShowShareModal(null)}
              >
                <div 
                  className="bg-white rounded-xl shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold">Share Post</h3>
                    <button
                      onClick={() => setShowShareModal(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Social Media Share Buttons */}
                    <p className="text-sm font-semibold text-gray-700 mb-3">Share to social media</p>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {/* Facebook */}
                      <button
                        onClick={() => handleShareToSocial('facebook', post.id, post.content)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Facebook</span>
                      </button>

                      {/* Telegram */}
                      <button
                        onClick={() => handleShareToSocial('telegram', post.id, post.content)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Telegram</span>
                      </button>

                      {/* Messenger */}
                      <button
                        onClick={() => handleShareToSocial('messenger', post.id, post.content)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Messenger</span>
                      </button>
                    </div>

                    {/* Copy Link Section */}
                    <p className="text-sm font-semibold text-gray-700 mb-3">Or copy link</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={getPostLink(post.id)}
                        readOnly
                        className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600"
                      />
                      <button
                        onClick={() => handleCopyLink(post.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
                      >
                        {copySuccess ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </>
  )}

{/* ========== ALERTS TAB ========== */}
{activeTab === 'alerts' && (
  <div className="space-y-6">

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold">LOCAL ALERTS</h2>
        <p className="text-sm text-gray-500">
          Verified real-time alerts for your immediate area.
        </p>
      </div>
      {alerts.length > 0 && (
        <span className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
          {alerts.filter(a => a.urgency === 'critical').length || alerts.length} CRITICAL ALERT{alerts.length !== 1 ? 'S' : ''}
        </span>
      )}
    </div>

    {/* Loading State */}
    {alertsLoading && (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 mt-2">Loading alerts...</p>
      </div>
    )}

    {/* No Alerts */}
    {!alertsLoading && alerts.length === 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Alerts</h3>
        <p className="text-sm text-gray-500">
          There are currently no emergency alerts for your area. Check back later for updates.
        </p>
      </div>
    )}

    {/* Alert Cards */}
    {!alertsLoading && alerts.map((alert) => {
      const urgencyStyle = getUrgencyColor(alert.urgency);
      
      return (
        <div key={alert.id} className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Left accent */}
          <div className={`absolute left-0 top-0 h-full w-1.5 ${urgencyStyle.bg}`} />

          <div className="p-6 space-y-4">
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${urgencyStyle.light} flex items-center justify-center`}>
                  <AlertTriangle className={`w-5 h-5 ${urgencyStyle.text}`} />
                </div>
                <div>
                  <span className={`text-xs font-semibold text-white ${urgencyStyle.badge} px-2 py-0.5 rounded uppercase`}>
                    {alert.urgency}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(alert.created_at)} • {getCategoryLabel(alert.category)}
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold">
              {alert.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-700 leading-relaxed">
              {alert.description}
            </p>

            {/* Content grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {alert.required_action && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className={`text-xs font-semibold ${urgencyStyle.text} mb-1`}>
                    REQUIRED ACTION
                  </p>
                  <p className="text-sm text-gray-700">
                    {alert.required_action}
                  </p>
                </div>
              )}

              {alert.affected_areas && alert.affected_areas.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    AFFECTED AREAS
                  </p>
                  <p className="text-sm text-gray-700">
                    {alert.affected_areas.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {alert.estimated_resolution && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500">
                  Estimated Resolution: <span className="font-medium text-gray-700">{alert.estimated_resolution}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      );
    })}

  </div>
)}


{activeTab === "announcements" && (
  <div className="space-y-6">

    {/* ===== HEADER ===== */}
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-bold">Local Announcements</h2>
        <p className="text-sm text-gray-500 max-w-md">
          The latest official updates, policies, and press releases for our community.
        </p>
      </div>
    </div>

    {/* ===== LOADING STATE ===== */}
    {announcementsLoading && (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 mt-2">Loading announcements...</p>
      </div>
    )}

    {/* ===== EMPTY STATE ===== */}
    {!announcementsLoading && announcements.length === 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Announcements Yet</h3>
        <p className="text-sm text-gray-500">
          Check back later for community updates and announcements.
        </p>
      </div>
    )}

    {/* ===== ANNOUNCEMENTS LIST ===== */}
    {!announcementsLoading &&
      announcements.map((announcement) => {
        const postedDate = formatDateTime(announcement.created_at);
        const eventDate = announcement.scheduled_date
          ? formatDateTime(announcement.scheduled_date)
          : null;

        return (
          <div
            key={announcement.id}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
          >
            {/* META (DATE POSTED) */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {getCategoryBadge(announcement.category)}
              <span>•</span>
            <span>
              {" "}
              {getRelativeTime(announcement.created_at) ? (
                <span className="font-medium">
                  {getRelativeTime(announcement.created_at)}
                </span>
              ) : (
                `on ${postedDate.date}`
              )}
            </span>
            </div>

            {/* TITLE */}
            <h3 className="text-lg font-bold text-gray-900">
              {announcement.title}
            </h3>

            {/* DESCRIPTION */}
            <p className="text-sm text-gray-600">
              {announcement.description}
            </p>

            {/* FOOTER (EVENT INFO) */}
            <div className="flex flex-wrap gap-6 pt-3 text-xs text-gray-500">
              {announcement.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {announcement.location}
                </div>
              )}

              {eventDate && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {eventDate.date} • {eventDate.time}
                </div>
              )}
            </div>
          </div>
        );
      })}

    {/* ===== VIEW ANNOUNCEMENT MODAL ===== */}
    {viewingAnnouncementId && (() => {
      const announcement = announcements.find(
        (a) => a.id === viewingAnnouncementId
      );
      if (!announcement) return null;

      const postedDate = formatDateTime(announcement.created_at);
      const eventDate = announcement.scheduled_date
        ? formatDateTime(announcement.scheduled_date)
        : null;

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* MODAL HEADER */}
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Announcement Details
              </h2>
              <button
                onClick={() => setViewingAnnouncementId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryBadge(announcement.category)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {announcement.title}
                </h3>
              </div>

              {/* EVENT + LOCATION */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    Event Schedule
                  </div>
                  {eventDate ? (
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {eventDate.date} at {eventDate.time}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      No event date provided
                    </span>
                  )}
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

              {/* DESCRIPTION */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Description</div>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {announcement.description}
                </p>
              </div>

              {/* POSTED INFO */}
              <div className="pt-4 border-t">
                <div className="text-xs text-gray-500">
                  Posted{" "}
                  {getRelativeTime(announcement.created_at) ||
                    `on ${postedDate.date}`}{" "}
                  by {announcement.author || "Admin"}

                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setViewingAnnouncementId(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    })()}
  </div>
)}



  {/* ========== PARKS & RECREATION TAB ========== */}
  {activeTab === 'parks' && (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <Trees className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Parks & Recreation</h2>
          <p className="text-sm text-gray-600">Facilities, events, and outdoor activities</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-3">
            <Trees className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Central Park</h3>
              <p className="text-sm text-gray-700 mt-2">Our main community park featuring a children's playground, basketball court, jogging path, and covered pavilion for events.</p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-600">🕐 Open daily: 6:00 AM - 8:00 PM</p>
                <p className="text-xs text-gray-600">📍 Main Street, Barangay Center</p>
                <p className="text-xs text-gray-600">♿ Wheelchair accessible</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-3">
            <Trees className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Riverside Recreation Area</h3>
              <p className="text-sm text-gray-700 mt-2">Scenic riverside park with walking trails, picnic areas, and fishing spots. Perfect for family outings and nature walks.</p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-600">🕐 Open daily: 5:00 AM - 7:00 PM</p>
                <p className="text-xs text-gray-600">📍 River Road, East District</p>
                <p className="text-xs text-gray-600">🎣 Fishing permit required</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Community Sports Complex</h3>
              <p className="text-sm text-gray-700 mt-2">Multi-purpose sports facility with basketball courts, volleyball courts, and a covered gym. Available for public use and private rentals.</p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-600">🕐 Open: Mon-Sun 6:00 AM - 9:00 PM</p>
                <p className="text-xs text-gray-600">📍 Sports Avenue, North District</p>
                <p className="text-xs text-gray-600">💰 Rental: ₱500/hour for private events</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</main>

          {/* ========== RIGHT SIDEBAR ========== */}
          <aside className="col-span-3">
            {/* Show different content based on active tab */}
            {activeTab === 'feed' && (
              <>
                {/* ========== LOCAL ANNOUNCEMENTS WIDGET ========== */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Local Announcements</h3>
                    <button 
                      onClick={() => setActiveTab('announcements')}
                      className="text-blue-600 text-sm font-semibold hover:underline"
                    >
                      See All
                    </button>
                  </div>
                  <div className="space-y-4">
                      {dashboardAnnouncements.length === 0 ? (
                        <p className="text-sm text-gray-500">No announcements available.</p>
                      ) : (
                        dashboardAnnouncements.map((announcement) => {
                          const date = new Date(
                            announcement.scheduled_date || announcement.created_at
                          );

                          return (
                            <div key={announcement.id} className="flex gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-blue-600" />
                              </div>

                              <div>
                                <h4 className="font-semibold text-sm">
                                  {announcement.title}
                                </h4>

                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {announcement.description}
                                </p>

                                <p className="text-[11px] text-gray-400 mt-1">
                                  {date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    timeZone: 'Asia/Manila'
                                  })}{' '}
                                  •{' '}
                                  {date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                    timeZone: 'Asia/Manila'
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                </div>

                {/* ========== ACTIVE REPORTS WIDGET ========== */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">My Active Reports</h3>
                    <button 
                      onClick={() => setShowMyReports(true)}
                      className="text-blue-600 text-sm font-semibold hover:underline"
                    >
                      Track Status
                    </button>
                  </div>
                  
                  {loadingReports ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : userReports.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No active reports</p>
                      <button
                        onClick={() => setShowFileReport(true)}
                        className="text-blue-600 text-sm font-semibold mt-2 hover:underline"
                      >
                        File your first report
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userReports.map((report) => {
                        const badge = getStatusBadge(report.status);
                        return (
                          <div key={report.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getStatusIcon(report.status)}
                              <span className="text-sm truncate">{report.title}</span>
                            </div>
                            <span className={`text-xs ${badge.bg} ${badge.text} px-2 py-1 rounded-full font-semibold whitespace-nowrap ml-2`}>
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ========== COMMUNITY MISSION WIDGET ========== */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-6 h-6 text-blue-600" />
                    <h3 className="font-bold">Community Mission</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    We aim to build a safer, more connected neighborhood through active participation and transparent communication.
                  </p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">Respectful</span>
                    <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">Helpful</span>
                    <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">Verified</span>
                  </div>
                </div>
              </>
            )}

     {activeTab === "alerts" && (
  <div className="space-y-6">

    {/* ===== QUICK HOTLINES ===== */}
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold tracking-wide text-gray-700">
          QUICK HOTLINES
        </h3>
        <span className="text-[10px] font-semibold text-red-600">
          24/7 ACTIVE
        </span>
      </div>

      <div className="space-y-3">

        {/* Fire */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">FIRE DEPARTMENT</p>
              <p className="text-sm font-semibold">911</p>
            </div>
          </div>
          <a href="tel:911" className="text-gray-300 hover:text-red-600">
            <Phone className="w-4 h-4" />
          </a>
        </div>

        {/* Police */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">POLICE STATION</p>
              <p className="text-sm font-semibold">117</p>
            </div>
          </div>
          <a href="tel:117" className="text-gray-300 hover:text-blue-600">
            <Phone className="w-4 h-4" />
          </a>
        </div>

        {/* Medical */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center">
              <Ambulance className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">MEDICAL EMERGENCY</p>
              <p className="text-sm font-semibold">166</p>
            </div>
          </div>
          <a href="tel:166" className="text-gray-300 hover:text-sky-600">
            <Phone className="w-4 h-4" />
          </a>
        </div>

        {/* Barangay */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">BARANGAY HALL</p>
              <p className="text-sm font-semibold">555-1234</p>
            </div>
          </div>
          <a href="tel:5551234" className="text-gray-300 hover:text-green-600">
            <Phone className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>

    {/* ===== SAFETY TIPS ===== */}
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold tracking-wide text-gray-700">
          SAFETY TIPS & PREPAREDNESS
        </h3>
        <span className="text-[10px] font-semibold text-blue-600">
          COMMUNITY
        </span>
      </div>

      <div className="space-y-3">

        <div className="flex gap-3 p-3 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Backpack className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Prepare a 72-hour emergency kit
            </p>
            <p className="text-xs text-gray-600">
              Include water, non-perishable food, flashlights, and first-aid.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-3 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <UserRound className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Check on elderly neighbors
            </p>
            <p className="text-xs text-gray-600">
              Ensure access to heat, water, and medicine.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-3 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Establish a contact plan
            </p>
            <p className="text-xs text-gray-600">
              Designate an out-of-town contact.
            </p>
          </div>
        </div>

      </div>
    </div>

    {/* ===== PUBLIC SAFETY NOTICE ===== */}
 <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 flex gap-3 p-4">
  {/* Left icon */}
  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />

  {/* Content */}
  <div>
    <p className="text-xs font-semibold text-red-600">
      PUBLIC SAFETY NOTICE
    </p>
    <p className="text-xs text-gray-600">
      Verified information is updated every 15 minutes. For immediate
      life-threatening emergencies, dial 911 directly.
    </p>
  </div>
</div>

  </div>
)}


{activeTab === "announcements" && (
  <>
    {/* ===== COMMUNITY CALENDAR ===== */}
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-xs text-gray-500 uppercase">
            Community Calendar
          </p>
        </div>
        <div className="flex gap-2 text-gray-400 text-lg">
          <button 
            onClick={goToPreviousMonth}
            className="hover:text-gray-600"
          >
            ‹
          </button>
          <button 
            onClick={goToNextMonth}
            className="hover:text-gray-600"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-xs text-center text-gray-500 mb-2">
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(day => (
          <div key={day} className="font-semibold">
            {day}
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7 gap-1 text-sm text-center">
        {(() => {
          const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
          const days = [];
          
          // Empty cells for days before month starts
          for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="py-1.5"></div>);
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
                className={`py-1.5 rounded-lg font-medium cursor-pointer transition-colors relative ${
                  isToday
                    ? "bg-blue-600 text-white"
                    : isSelected 
                    ? "bg-blue-100 text-blue-600 ring-2 ring-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {day}
                {hasEvents && !isToday && !isSelected && (
                  <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
              </button>
            );
          }
          
          return days;
        })()}
      </div>
    </div>

    {/* ===== UPCOMING EVENTS (FIXED UI) ===== */}
    <div className="bg-white rounded-xl shadow-sm border p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
          {selectedDate 
            ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
            : 'Upcoming Events'
          }
        </h3>
        {selectedDate && (
          <button 
            onClick={() => setSelectedDate(null)}
            className="text-xs text-blue-600 font-semibold hover:underline mt-1"
          >
            ← Back to all events
          </button>
        )}
      </div>

      {/* Events List */}
  <div className="space-y-3">
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
              .slice(0, visibleCount);

          
          if (eventsToShow.length === 0) {
            return (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">
                  {selectedDate 
                    ? 'No events on this date'
                    : 'No upcoming events'
                  }
                </p>
              </div>
            );
          }

          return eventsToShow.map(announcement => {
            const eventDate = new Date(announcement.scheduled_date || announcement.created_at);
            const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day = eventDate.getDate();
            const time = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            
            return (
              <div 
                key={announcement.id} 
                className="border rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                onClick={() => setViewingAnnouncementId(announcement.id)}
              >
                <div className="flex gap-3">
                  {/* Date Badge */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex flex-col items-center justify-center">
                      <div className="text-[10px] font-semibold leading-none">{month}</div>
                      <div className="text-lg font-bold leading-none mt-0.5">{day}</div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                        {announcement.title}
                      </h4>
                    </div>

                    {/* Category Badge */}
                    <div className="mb-2">
                      {getCategoryBadge(announcement.category)}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{time}</span>
                    </div>
                    
                    {/* Location */}
                    {announcement.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{announcement.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>

     {/* LOAD MORE BUTTON */}
        {!selectedDate && (() => {
  const total = announcements.filter(ann => ann.status === 'published').length;

  // SHOW LESS
  if (visibleCount > INITIAL_COUNT) {
    return (
      <button
        onClick={() => setVisibleCount(INITIAL_COUNT)}
        className="w-full text-sm text-gray-600 font-semibold py-3 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-1 mt-3 border-t pt-3"
      >
        Show less
        <ChevronUp className="w-4 h-4" />
      </button>
    );
  }

  // LOAD MORE
  if (total > visibleCount) {
    return (
      <button
        onClick={() => setVisibleCount(prev => prev + LOAD_STEP)}
        className="w-full text-sm text-blue-600 font-semibold py-3 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 mt-3 border-t pt-3"
      >
        Load more
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return null;
})()}


    </div>
  </>
)}


            {activeTab === 'parks' && (
              <>
                {/* ========== QUICK FACILITIES WIDGET ========== */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Trees className="w-6 h-6 text-green-600" />
                    <h3 className="font-bold">Quick Access</h3>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Trees className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Find Nearest Park</p>
                        <p className="text-xs text-gray-600">View map & directions</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Book Facilities</p>
                        <p className="text-xs text-gray-600">Reserve for events</p>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Activity Programs</p>
                        <p className="text-xs text-gray-600">Classes & workshops</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ========== PARK HOURS WIDGET ========== */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <h3 className="font-bold mb-3">Operating Hours</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Central Park</span>
                      <span className="font-semibold text-gray-900">6AM - 8PM</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Riverside Area</span>
                      <span className="font-semibold text-gray-900">5AM - 7PM</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Sports Complex</span>
                      <span className="font-semibold text-gray-900">6AM - 9PM</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-800">
                      <span className="font-semibold">🌟 Pro Tip:</span> Visit early morning for quieter outdoor activities!
                    </p>
                  </div>
                </div>

                {/* ========== ACTIVITIES & AMENITIES WIDGET ========== */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="font-bold mb-3">Available Amenities</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Basketball Courts (3)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Playgrounds (2)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Jogging Paths (5km)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Picnic Areas (4)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Event Pavilions (2)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Restrooms (6)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      {/* ========== FOOTER ========== */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2024 Online Sumbungan - Residents' Portal</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-600">Privacy</a>
              <a href="#" className="hover:text-blue-600">Terms</a>
              <a href="#" className="hover:text-blue-600">Guidelines</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;