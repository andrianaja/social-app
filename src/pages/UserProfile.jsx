import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  Link,
} from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PostCard from "../components/posts/PostCard";

import { supabase } from "../lib/supabase";

function UserProfile() {

  const { email } = useParams();

  const [posts, setPosts] =
    useState([]);

  const [stories, setStories] =
    useState([]);

  const [isOnline, setIsOnline] =
    useState(false);

  const [
    followersCount,
    setFollowersCount,
  ] = useState(0);

  const [
    followingCount,
    setFollowingCount,
  ] = useState(0);

  const [
    isFollowing,
    setIsFollowing,
  ] = useState(false);

  const [profile, setProfile] =
    useState(null);

  const [
    friendStatus,
    setFriendStatus,
  ] = useState(null);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [
    incomingRequest,
    setIncomingRequest,
  ] = useState(false);

  // =========================
  // GET CURRENT USER
  // =========================
  const getCurrentUser =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {
        setCurrentUser(user);
      }
    };

  // =========================
  // FETCH PROFILE
  // =========================
  const fetchProfile =
    async () => {

      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("email", email)
          .single();

      if (error) {
        console.log(error);
        return;
      }

      setProfile(data);
    };

  // =========================
  // FETCH POSTS
  // =========================
  const fetchPosts =
    async () => {

      const { data, error } =
        await supabase
          .from("posts")
          .select("*")
          .or(
            `user_email.eq.${email},author.eq.${email}`
          )
          .order("id", {
            ascending: false,
          });

      if (error) {
        console.log(error);
        return;
      }

      const formatted =
        (data || []).map(
          (post) => ({
            ...post,
            user_email:
              post.user_email ||
              post.author,
          })
        );

      setPosts(formatted);
    };

  // =========================
  // FETCH STORIES
  // =========================
  const fetchStories =
    async () => {

      const { data, error } =
        await supabase
          .from("stories")
          .select("*")
          .eq(
            "user_email",
            email
          )
          .order("id", {
            ascending: false,
          });

      if (error) {
        console.log(error);
        return;
      }

      setStories(data || []);
    };

  // =========================
  // ONLINE STATUS
  // =========================
  const fetchOnlineStatus =
    async () => {

      const { data, error } =
        await supabase
          .from("online_users")
          .select("*")
          .eq("email", email)
          .maybeSingle();

      if (error) {
        console.log(error);
        return;
      }

      setIsOnline(
        data?.is_online || false
      );
    };

  // =========================
  // FOLLOW COUNTS
  // =========================
  const fetchFollowCounts =
    async () => {

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
  // CHECK FOLLOWING
  // =========================
  const checkFollowing =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      if (user.email === email) {
        setIsFollowing(false);
        return;
      }

      const { data } =
        await supabase
          .from("follows")
          .select("*")
          .eq(
            "follower_email",
            user.email
          )
          .eq(
            "following_email",
            email
          );

      setIsFollowing(
        data &&
          data.length > 0
      );
    };

  // =========================
  // FOLLOW / UNFOLLOW
  // =========================
  const toggleFollow =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      if (user.email === email)
        return;

      // UNFOLLOW
      if (isFollowing) {

        await supabase
          .from("follows")
          .delete()
          .eq(
            "follower_email",
            user.email
          )
          .eq(
            "following_email",
            email
          );

        setIsFollowing(false);

      } else {

        // FOLLOW
        await supabase
          .from("follows")
          .insert([
            {
              follower_email:
                user.email,

              following_email:
                email,
            },
          ]);

        // NOTIFICATION
        await supabase
          .from(
            "notifications"
          )
          .insert([
            {
              sender:
                user.email,

              receiver:
                email,

              type: "follow",

              content: `${user.email} followed you`,
            },
          ]);

        setIsFollowing(true);
      }

      fetchFollowCounts();
    };

  // =========================
  // CHECK FRIEND STATUS
  // =========================
  const checkFriendStatus =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { data } =
        await supabase
          .from("friends")
          .select("*")
          .or(
            `and(sender.eq.${user.email},receiver.eq.${email}),and(sender.eq.${email},receiver.eq.${user.email})`
          )
          .maybeSingle();

      if (data) {

        setFriendStatus(
          data.status
        );

        // incoming request
        if (
          data.sender === email &&
          data.receiver === user.email &&
          data.status === "pending"
        ) {
          setIncomingRequest(
            true
          );
        }

      } else {

        setFriendStatus(null);

        setIncomingRequest(
          false
        );
      }
    };

  // =========================
  // ADD FRIEND
  // =========================
  const addFriend =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      if (user.email === email)
        return;

      const { error } =
        await supabase
          .from("friends")
          .insert([
            {
              sender:
                user.email,

              receiver:
                email,

              status:
                "pending",
            },
          ]);

      if (error) {
        console.log(error);
        return;
      }

      // NOTIFICATION
      await supabase
        .from("notifications")
        .insert([
          {
            sender:
              user.email,

            receiver:
              email,

            type: "friend",

            content: `${user.email} sent you a friend request`,
          },
        ]);

      setFriendStatus(
        "pending"
      );
    };

  // =========================
  // ACCEPT FRIEND
  // =========================
  const acceptFriend =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from("friends")
        .update({
          status: "accepted",
        })
        .eq(
          "sender",
          email
        )
        .eq(
          "receiver",
          user.email
        );

      // notification
      await supabase
        .from("notifications")
        .insert([
          {
            sender:
              user.email,

            receiver:
              email,

            type:
              "friend_accept",

            content: `${user.email} accepted your friend request`,
          },
        ]);

      setFriendStatus(
        "accepted"
      );

      setIncomingRequest(
        false
      );
    };

  // =========================
  // REMOVE FRIEND
  // =========================
  const removeFriend =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from("friends")
        .delete()
        .or(
          `and(sender.eq.${user.email},receiver.eq.${email}),and(sender.eq.${email},receiver.eq.${user.email})`
        );

      setFriendStatus(null);

      setIncomingRequest(
        false
      );
    };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {

    getCurrentUser();

    fetchProfile();

    fetchPosts();

    fetchStories();

    fetchOnlineStatus();

    fetchFollowCounts();

    checkFollowing();

    checkFriendStatus();

    // REALTIME POSTS
    const postsChannel =
      supabase
        .channel(
          "profile-posts"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "posts",
          },
          () => {
            fetchPosts();
          }
        )
        .subscribe();

    // REALTIME ONLINE
    const onlineChannel =
      supabase
        .channel(
          "online-profile"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "online_users",
          },
          () => {
            fetchOnlineStatus();
          }
        )
        .subscribe();

    // REALTIME FRIENDS
    const friendsChannel =
      supabase
        .channel(
          "friends-profile"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "friends",
          },
          () => {
            checkFriendStatus();
          }
        )
        .subscribe();

    return () => {

      supabase.removeChannel(
        postsChannel
      );

      supabase.removeChannel(
        onlineChannel
      );

      supabase.removeChannel(
        friendsChannel
      );
    };

  }, [email]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">

      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-28 pb-10">

        {/* PROFILE */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg overflow-hidden mb-8">

          {/* COVER */}
          <div className="h-56 bg-gray-300 dark:bg-gray-800">

            {profile?.cover && (
              <img
                src={
                  profile.cover
                }
                alt="cover"
                className="w-full h-full object-cover"
              />
            )}

          </div>

          <div className="p-6">

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">

              {/* LEFT */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-5">

                {/* AVATAR */}
                <div className="-mt-24">

                  {profile?.avatar ? (
                    <img
                      src={
                        profile.avatar
                      }
                      alt="avatar"
                      className="w-40 h-40 rounded-full border-4 border-white dark:border-gray-900 object-cover bg-black"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-gray-400 border-4 border-white dark:border-gray-900"></div>
                  )}

                </div>

                {/* INFO */}
                <div className="text-center md:text-left">

                  <h1 className="text-3xl font-bold dark:text-white break-all">
                    {profile?.username ||
                      email}
                  </h1>

                  <p className="text-gray-500 mt-2 break-all">
                    {email}
                  </p>

                  {profile?.bio && (
                    <p className="mt-3 dark:text-white">
                      {
                        profile.bio
                      }
                    </p>
                  )}

                  {/* ONLINE */}
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-4">

                    <div
                      className={`w-3 h-3 rounded-full ${
                        isOnline
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    ></div>

                    <p className="dark:text-white">
                      {isOnline
                        ? "Online"
                        : "Offline"}
                    </p>

                  </div>

                  {/* STATS */}
                  <div className="flex gap-6 mt-5 dark:text-white flex-wrap justify-center md:justify-start">

                    <p>
                      <span className="font-bold">
                        {
                          followersCount
                        }
                      </span>{" "}
                      Followers
                    </p>

                    <p>
                      <span className="font-bold">
                        {
                          followingCount
                        }
                      </span>{" "}
                      Following
                    </p>

                    <p>
                      <span className="font-bold">
                        {
                          posts.length
                        }
                      </span>{" "}
                      Posts
                    </p>

                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              {currentUser?.email !==
                email && (

                <div className="flex flex-wrap gap-3">

                  {/* FOLLOW */}
                  <button
                    onClick={
                      toggleFollow
                    }
                    className={`px-5 py-3 rounded-2xl text-white font-semibold ${
                      isFollowing
                        ? "bg-red-500"
                        : "bg-blue-600"
                    }`}
                  >
                    {isFollowing
                      ? "Unfollow"
                      : "Follow"}
                  </button>

                  {/* FRIEND */}

                  {friendStatus ===
                  null ? (

                    <button
                      onClick={
                        addFriend
                      }
                      className="bg-purple-600 text-white px-5 py-3 rounded-2xl"
                    >
                      Add Friend
                    </button>

                  ) : friendStatus ===
                      "pending" &&
                    incomingRequest ? (

                    <button
                      onClick={
                        acceptFriend
                      }
                      className="bg-green-600 text-white px-5 py-3 rounded-2xl"
                    >
                      Accept Request
                    </button>

                  ) : friendStatus ===
                    "pending" ? (

                    <button className="bg-yellow-500 text-white px-5 py-3 rounded-2xl">
                      Pending
                    </button>

                  ) : (

                    <button
                      onClick={
                        removeFriend
                      }
                      className="bg-green-600 text-white px-5 py-3 rounded-2xl"
                    >
                      Friends
                    </button>

                  )}

                  {/* CHAT */}
                  <Link
                    to="/chat"
                    className="bg-green-600 text-white px-5 py-3 rounded-2xl"
                  >
                    Message
                  </Link>

                </div>
              )}
            </div>
          </div>
        </div>

        {/* STORIES */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6 mb-8">

          <h2 className="text-2xl font-bold mb-5 dark:text-white">
            Stories
          </h2>

          <div className="flex gap-4 overflow-x-auto">

            {stories.length ===
            0 ? (
              <p className="text-gray-500">
                No stories
              </p>
            ) : (
              stories.map(
                (story) => (
                  <img
                    key={
                      story.id
                    }
                    src={
                      story.image
                    }
                    alt="story"
                    className="w-32 h-56 rounded-2xl object-cover border-4 border-pink-500"
                  />
                )
              )
            )}

          </div>
        </div>

        {/* POSTS */}
        <div>

          <h2 className="text-2xl font-bold mb-5 dark:text-white">
            Posts
          </h2>

          {posts.length ===
          0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6">
              <p className="text-gray-500">
                No posts
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                fetchPosts={
                  fetchPosts
                }
                post={post}
              />
            ))
          )}

        </div>
      </div>
    </div>
  );
}

export default UserProfile;