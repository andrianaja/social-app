import { useEffect, useState,} from "react";
import { Link,} from "react-router-dom";
import { supabase } from "../lib/supabase";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import PostCard from "../components/posts/PostCard";

function Profile() {
  const [user, setUser] =
    useState(null);

  const [posts, setPosts] =
    useState([]);

  const [bio, setBio] =
    useState("");

  const [avatar, setAvatar] =
    useState("");

  const [cover, setCover] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    followersCount,
    setFollowersCount,
  ] = useState(0);

  const [
    followingCount,
    setFollowingCount,
  ] = useState(0);

  // =========================
  // GET USER
  // =========================
  const getUser = async () => {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    setUser(user);

    // PROFILE
    const { data: profile } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single();

    if (profile) {
      setBio(profile.bio || "");

      setAvatar(
        profile.avatar || ""
      );

      setCover(
        profile.cover || ""
      );

      setUsername(
        profile.username || ""
      );
    }

    fetchPosts(user.email);

    fetchFollowCounts(
      user.email
    );

    setLoading(false);
  };

  // =========================
  // FETCH POSTS
  // =========================
  const fetchPosts = async (
    email
  ) => {
    const { data, error } =
      await supabase
        .from("posts")
        .select("*")
        .or(
          `author.eq.${email},user_email.eq.${email}`
        )
        .order("id", {
          ascending: false,
        });

    if (error) {
      console.log(error);
      return;
    }

    setPosts(data || []);
  };

  // =========================
  // FOLLOW COUNTS
  // =========================
  const fetchFollowCounts =
    async (email) => {
      // FOLLOWERS
      const {
        data: followers,
      } = await supabase
        .from("follows")
        .select("*")
        .eq(
          "following_email",
          email
        );

      // FOLLOWING
      const {
        data: following,
      } = await supabase
        .from("follows")
        .select("*")
        .eq(
          "follower_email",
          email
        );

      setFollowersCount(
        followers?.length || 0
      );

      setFollowingCount(
        following?.length || 0
      );
    };

  // =========================
  // UPLOAD AVATAR
  // =========================
  const uploadAvatar =
    async (e) => {
      const file =
        e.target.files[0];

      if (!file) return;

      const fileName =
        Date.now() +
        "-" +
        file.name;

      const { error } =
        await supabase.storage
          .from("avatars")
          .upload(
            fileName,
            file
          );

      if (error) {
        alert(error.message);
        return;
      }

      const {
        data: {
          publicUrl,
        },
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(
          fileName
        );

      setAvatar(publicUrl);
    };

  // =========================
  // UPLOAD COVER
  // =========================
  const uploadCover =
    async (e) => {
      const file =
        e.target.files[0];

      if (!file) return;

      const fileName =
        Date.now() +
        "-" +
        file.name;

      const { error } =
        await supabase.storage
          .from("covers")
          .upload(
            fileName,
            file
          );

      if (error) {
        alert(error.message);
        return;
      }

      const {
        data: {
          publicUrl,
        },
      } = supabase.storage
        .from("covers")
        .getPublicUrl(
          fileName
        );

      setCover(publicUrl);
    };

  // =========================
  // SAVE PROFILE
  // =========================
  const saveProfile =
    async () => {
      if (!user) return;

      const { data } =
        await supabase
          .from("profiles")
          .select("*")
          .eq(
            "email",
            user.email
          );

      if (
        data &&
        data.length > 0
      ) {
        await supabase
          .from("profiles")
          .update({
            username,
            bio,
            avatar,
            cover,
          })
          .eq(
            "email",
            user.email
          );
      } else {
        await supabase
          .from("profiles")
          .insert([
            {
              email:
                user.email,
              username,
              bio,
              avatar,
              cover,
            },
          ]);
      }

      alert(
        "Profile updated 🔥"
      );
    };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    getUser();
  }, []);

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
        <Navbar />

        <div className="p-10 text-center text-xl dark:text-white">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar />

      <div className="flex pt-24">
        {/* SIDEBAR */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* PROFILE */}
        <div className="flex-1 max-w-5xl mx-auto p-4 md:p-8">
          {/* PROFILE CARD */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg overflow-hidden mb-8">
            {/* COVER */}
            <div className="h-72 bg-gray-300 dark:bg-gray-800 relative">
              {cover && (
                <img
                  src={cover}
                  alt="cover"
                  className="w-full h-full object-cover"
                />
              )}

              <label className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white px-5 py-3 rounded-2xl cursor-pointer transition">
                Change Cover

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={
                    uploadCover
                  }
                />
              </label>
            </div>

            {/* CONTENT */}
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                {/* LEFT */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                  {/* AVATAR */}
                  <div className="-mt-28 relative">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="avatar"
                        className="w-44 h-44 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-2xl bg-black"
                      />
                    ) : (
                      <div className="w-44 h-44 rounded-full bg-blue-600 flex items-center justify-center text-6xl font-bold text-white border-4 border-white dark:border-gray-900">
                        {user?.email?.charAt(
                          0
                        )}
                      </div>
                    )}

                    <label className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                      📷

                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={
                          uploadAvatar
                        }
                      />
                    </label>
                  </div>

                  {/* INFO */}
                  <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold dark:text-white break-all">
                      {username ||
                        "No Username"}
                    </h1>

                    <p className="text-gray-500 mt-2 break-all">
                      {user?.email}
                    </p>

                    {bio && (
                      <p className="dark:text-white mt-4 max-w-2xl">
                        {bio}
                      </p>
                    )}

                    {/* STATS */}
                    <div className="flex gap-6 mt-5 justify-center md:justify-start flex-wrap">
                      <div className="bg-gray-100 dark:bg-gray-800 px-5 py-3 rounded-2xl">
                        <p className="font-bold text-xl dark:text-white">
                          {
                            posts.length
                          }
                        </p>

                        <p className="text-gray-500 text-sm">
                          Posts
                        </p>
                      </div>

                      <div className="bg-gray-100 dark:bg-gray-800 px-5 py-3 rounded-2xl">
                        <p className="font-bold text-xl dark:text-white">
                          {
                            followersCount
                          }
                        </p>

                        <p className="text-gray-500 text-sm">
                          Followers
                        </p>
                      </div>

                      <div className="bg-gray-100 dark:bg-gray-800 px-5 py-3 rounded-2xl">
                        <p className="font-bold text-xl dark:text-white">
                          {
                            followingCount
                          }
                        </p>

                        <p className="text-gray-500 text-sm">
                          Following
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 flex-wrap justify-center">
                  <Link
                    to={`/user/${user?.email}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl transition"
                  >
                    View Public Profile
                  </Link>

                  <button
                    onClick={
                      saveProfile
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition"
                  >
                    Save Profile
                  </button>
                </div>
              </div>

              {/* EDIT SECTION */}
              <div className="mt-10 grid md:grid-cols-2 gap-6">
                {/* USERNAME */}
                <div>
                  <label className="font-bold dark:text-white block mb-3">
                    Username
                  </label>

                  <input
                    type="text"
                    value={
                      username
                    }
                    onChange={(e) =>
                      setUsername(
                        e.target
                          .value
                      )
                    }
                    placeholder="Username..."
                    className="w-full border p-4 rounded-2xl dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* BIO */}
                <div>
                  <label className="font-bold dark:text-white block mb-3">
                    Bio
                  </label>

                  <textarea
                    value={bio}
                    onChange={(e) =>
                      setBio(
                        e.target
                          .value
                      )
                    }
                    placeholder="Write your bio..."
                    className="w-full border p-4 rounded-2xl dark:bg-gray-800 dark:text-white"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* POSTS */}
          <div>
            <h2 className="text-3xl font-bold mb-6 dark:text-white">
              My Posts
            </h2>

            {posts.length ===
            0 ? (
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl text-center text-gray-500 shadow-md">
                No posts yet
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={
                    post.id
                  }
                  fetchPosts={() =>
                    fetchPosts(
                      user.email
                    )
                  }
                  post={post}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;