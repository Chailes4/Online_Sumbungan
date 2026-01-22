import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { 
  Home, FileText, Bell, MessageSquare, Search,
  Image, MapPin, Smile, AlertTriangle, Plus, MoreVertical,
  ThumbsUp, ThumbsDown, Share2, LogOut, Calendar,
  Activity, CheckCircle, Clock, Megaphone, Trees, Send
} from "lucide-react";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  location: string | null;
  mood: string | null;
  is_anonymous: boolean;
  upvotes: number;
  downvotes: number;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
    username: string;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    checkUser();
    fetchPosts();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Fetch user data from users table
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserData(userData);
    }
    
    setLoading(false);
  };

  const fetchPosts = async () => {
    // First get posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      return;
    }

    // Then get user data for each post
    const postsWithUsers = await Promise.all(
      (postsData || []).map(async (post) => {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("full_name, email, username")
          .eq("id", post.user_id)
          .maybeSingle(); // Use maybeSingle instead of single
        
        if (userError) {
          console.error("Error fetching user data:", userError);
        }
        
        console.log("User data for post:", userData); // Debug log
        
        return {
          ...post,
          users: userData || null
        };
      })
    );

    setPosts(postsWithUsers);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      alert("Please write something before posting!");
      return;
    }

    setPosting(true);

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            user_id: user.id,
            content: postContent,
            image_url: null,
            location: null,
            mood: null,
            is_anonymous: isAnonymous,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Get user data for the new post
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name, email, username")
        .eq("id", user.id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      // Add new post to the top of the list with user data
      setPosts([{ ...data, users: userData }, ...posts]);
      setPostContent("");
      setIsAnonymous(false); // Reset to default
      
    } catch (error: any) {
      console.error("Error creating post:", error);
      alert("Failed to create post: " + error.message);
    } finally {
      setPosting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffInMs = now.getTime() - posted.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const getAnonymousName = (postId: string) => {
    // Generate consistent 4-digit number from post ID
    let hash = 0;
    for (let i = 0; i < postId.length; i++) {
      hash = ((hash << 5) - hash) + postId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const fourDigits = Math.abs(hash % 10000).toString().padStart(4, '0');
    return `Anonymous${fourDigits}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Online Sumbungan</h1>
          </div>

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

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <Bell className="w-6 h-6" />
            </button>
            <button className="relative p-2 hover:bg-gray-100 rounded-full">
              <MessageSquare className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-500">Resident</p>
                <p className="text-sm font-semibold">{userData?.full_name || user?.email?.split('@')[0] || "User"}</p>
              </div>
              <div className="w-10 h-10 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR */}
          <aside className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-semibold">
                <Home className="w-5 h-5" />
                Home Feed
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700">
                <FileText className="w-5 h-5" />
                My Reports
              </button>

              <div className="pt-4 border-t">
                <p className="text-xs font-semibold text-gray-500 uppercase px-4 mb-2">Local Services</p>
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Megaphone className="w-5 h-5" />
                  Local Alerts
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Trees className="w-5 h-5" />
                  Parks & Recreation
                </button>
              </div>

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

          {/* CENTER FEED */}
          <main className="col-span-6">
            {/* CREATE POST */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 bg-green-400 rounded-full flex-shrink-0"></div>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share something with your neighbors..."
                  className="flex-1 bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between ml-13">
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-green-600">
                    <Image className="w-5 h-5" />
                    <span className="text-sm font-medium">Photo/Video</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm font-medium">Tag Location</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-yellow-600">
                    <Smile className="w-5 h-5" />
                    <span className="text-sm font-medium">Mood</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium">Post anonymously</span>
                  </label>
                  <button
                    onClick={handleCreatePost}
                    disabled={posting || !postContent.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {/* FILE REPORT CTA */}
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
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                File a New Report
              </button>
            </div>

            {/* POSTS FEED */}
            {posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts yet</h3>
                <p className="text-gray-500">Be the first to share something with your community!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm p-6 mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-3">
                      <div className={`w-12 h-12 ${post.is_anonymous ? 'bg-gray-400' : 'bg-orange-300'} rounded-full`}></div>
                      <div>
                        <h3 className="font-semibold">
                          {post.is_anonymous 
                            ? getAnonymousName(post.id)
                            : (post.users?.full_name || post.users?.username || post.users?.email?.split('@')[0] || "User")
                          }
                        </h3>
                        <p className="text-sm text-gray-500">{getTimeAgo(post.created_at)} • Public</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-6 h-6" />
                    </button>
                  </div>

                  <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full rounded-lg mb-4"
                    />
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4 fill-blue-500 text-blue-500" />
                      {post.upvotes} upvotes
                    </span>
                    <span>• {post.downvotes} downvotes</span>
                    <span className="ml-auto">0 comments</span>
                    <span>0 shares</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50">
                      <ThumbsUp className="w-5 h-5" />
                      <span className="font-semibold">{post.upvotes - post.downvotes}</span>
                      <ThumbsDown className="w-5 h-5" />
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50">
                      <MessageSquare className="w-5 h-5" />
                      Comment
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50">
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </div>
              ))
            )}
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="col-span-3">
            {/* LOCAL ANNOUNCEMENTS */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Local Announcements</h3>
                <button className="text-blue-600 text-sm font-semibold">See All</button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Water Main Repair</h4>
                    <p className="text-xs text-gray-600">Disruption on North Blvd: Tomorrow 8am-4pm.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Town Hall Meeting</h4>
                    <p className="text-xs text-gray-600">Join us this Thursday for the new park proposal.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MY ACTIVE REPORTS */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">My Active Reports</h3>
                <button className="text-blue-600 text-sm font-semibold">Track Status</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Street light malfunction</span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">IN PROGRESS</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Pothole repair #992</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">RESOLVED</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Sidewalk debris</span>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">REVIEWING</span>
                </div>
              </div>
            </div>

            {/* COMMUNITY MISSION */}
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
          </aside>
        </div>
      </div>

      {/* FOOTER */}
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