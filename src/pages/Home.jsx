import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import CreatePost from "../components/posts/CreatePost";
import PostCard from "../components/posts/PostCard";
import Stories from "../components/stories/Stories";

import { supabase } from "../lib/supabase";

function Home() {
  const [users, setUsers] =
    useState([]);

  const [posts, setPosts] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [onlineUsers, setOnlineUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [friends, setFriends] =
    useState([]);

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

        fetchFriends(
          user.email
        );
      }
    };

  // =========================
  // FETCH FRIENDS
  // =========================
  const fetchFriends =
    async (email) => {
      const { data } =
        await supabase
          .from("friends")
          .select("*")
          .or(
            `sender.eq.${email},receiver.eq.${email}`
          );

      setFriends(data || []);
    };

  // =========================
  // SEND FRIEND REQUEST
  // =========================
  const sendFriendRequest =
    async (receiver) => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      // TSY AZO TENANY
      if (
        user.email ===
        receiver
      ) {
        return;
      }

      // CHECK EXISTING
      const {
        data: existing,
      } = await supabase
        .from("friends")
        .select("*")
        .or(
          `and(sender.eq.${user.email},receiver.eq.${receiver}),
           and(sender.eq.${receiver},receiver.eq.${user.email})`
        );

      if (
        existing &&
        existing.length > 0
      ) {
        alert(
          "Already friends or pending"
        );

        return;
      }

      // INSERT
      const { error } =
        await supabase
          .from("friends")
          .insert([
            {
              sender:
                user.email,

              receiver,

              status:
                "pending",
            },
          ]);

      if (error) {
        console.log(error);

        alert(
          "Error sending request"
        );

        return;
      }

      alert(
        "Friend request sent 🔥"
      );

      fetchFriends(
        user.email
      );
    };

  // =========================
  // CHECK FRIEND STATUS
  // =========================
  const getFriendStatus =
    (email) => {

      const relation =
        friends.find(
          (f) =>
            (f.sender ===
              currentUser?.email &&
              f.receiver ===
                email) ||
            (f.receiver ===
              currentUser?.email &&
              f.sender ===
                email)
        );

      if (!relation)
        return null;

      return relation.status;
    };

  // =========================
  // FETCH POSTS
  // =========================
  const fetchPosts = async () => {
    const { data, error } =
      await supabase
        .from("posts")
        .select("*")
        .order("id", {
          ascending: false,
        });

    if (error) {
      console.log(
        "POSTS ERROR",
        error
      );
      return;
    }

    const formattedPosts =
      (data || []).map(
        (post) => ({
          ...post,
          author:
            post.author ||
            post.user_email ||
            "Unknown",
        })
      );

    setPosts(formattedPosts);
  };

  // =========================
  // FETCH USERS
  // =========================
  const fetchUsers =
    async () => {
      const { data, error } =
        await supabase
          .from("profiles")
          .select("*");

      if (error) {
        console.log(
          "USERS ERROR",
          error
        );
        return;
      }

      setUsers(data || []);
    };

  // =========================
  // FETCH ONLINE USERS
  // =========================
  const fetchOnlineUsers =
    async () => {
      const { data, error } =
        await supabase
          .from("online_users")
          .select("*")
          .eq(
            "is_online",
            true
          );

      if (error) {
        console.log(
          "ONLINE ERROR",
          error
        );
        return;
      }

      setOnlineUsers(data || []);
    };

  // =========================
  // SET USER ONLINE
  // =========================
  const setUserOnline =
    async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { data } =
        await supabase
          .from("online_users")
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
          .from("online_users")
          .update({
            is_online: true,
          })
          .eq(
            "email",
            user.email
          );
      } else {
        await supabase
          .from("online_users")
          .insert([
            {
              email:
                user.email,
              is_online: true,
            },
          ]);
      }
    };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    const loadData =
      async () => {
        setLoading(true);

        await Promise.all([
          fetchPosts(),
          fetchUsers(),
          fetchOnlineUsers(),
          setUserOnline(),
          getCurrentUser(),
        ]);

        setLoading(false);
      };

    loadData();

    // REALTIME POSTS
    const postsChannel =
      supabase
        .channel(
          "posts-channel"
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

    // REALTIME USERS
    const usersChannel =
      supabase
        .channel(
          "profiles-channel"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "profiles",
          },
          () => {
            fetchUsers();
          }
        )
        .subscribe();

    // REALTIME ONLINE
    const onlineChannel =
      supabase
        .channel(
          "online-users-channel"
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
            fetchOnlineUsers();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        postsChannel
      );

      supabase.removeChannel(
        usersChannel
      );

      supabase.removeChannel(
        onlineChannel
      );
    };
  }, []);

  // =========================
  // FILTER POSTS
  // =========================
  const filteredPosts =
    posts.filter((post) =>
      (
        post.content || ""
      )
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* NAVBAR */}
      <Navbar />

      <div className="flex pt-20">

        {/* SIDEBAR */}
        <div className="hidden lg:block w-[280px] sticky top-20 h-screen">
          <Sidebar />
        </div>

        {/* MAIN */}
        <div className="flex-1 flex justify-center px-3 md:px-6">
          <div className="w-full max-w-3xl">

            {/* STORIES */}
            <div className="mt-4">
              <Stories />
            </div>

            {/* SEARCH */}
            <div className="mt-5 mb-6">
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-md p-3">
                <input
                  type="text"
                  placeholder="🔍 Search posts..."
                  className="w-full bg-transparent outline-none p-2 dark:text-white"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target
                        .value
                    )
                  }
                />
              </div>
            </div>

            {/* USERS */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-md p-5 mb-6">

              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg dark:text-white">
                  Discover Users
                </h2>

                <div className="text-sm text-gray-500">
                  {
                    users.length
                  } users
                </div>
              </div>

              {users.length ===
              0 ? (
                <p className="text-gray-500">
                  No users found
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">

                  {users.map(
                    (u) => {

                      const friendStatus =
                        getFriendStatus(
                          u.email
                        );

                      return (
                        <div
                          key={
                            u.email
                          }
                          className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl"
                        >

                          <Link
                            to={`/user/${u.email}`}
                            className="flex items-center gap-4"
                          >

                            {u.avatar ? (
                              <img
                                src={
                                  u.avatar
                                }
                                alt=""
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                                {u.email?.charAt(
                                  0
                                )}
                              </div>
                            )}

                            <div className="overflow-hidden">
                              <p className="font-bold dark:text-white truncate">
                                {u.username ||
                                  u.email}
                              </p>

                              <p className="text-sm text-gray-500 truncate">
                                {u.bio ||
                                  "No bio"}
                              </p>
                            </div>

                          </Link>

                          {/* BUTTON */}
                          {u.email !==
                            currentUser?.email && (
                            <div className="mt-4">

                              {!friendStatus ? (
                                <button
                                  onClick={() =>
                                    sendFriendRequest(
                                      u.email
                                    )
                                  }
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-2xl transition"
                                >
                                  Add Friend
                                </button>
                              ) : friendStatus ===
                                "pending" ? (
                                <button
                                  className="w-full bg-yellow-500 text-white py-2 rounded-2xl"
                                >
                                  Pending
                                </button>
                              ) : (
                                <button
                                  className="w-full bg-green-600 text-white py-2 rounded-2xl"
                                >
                                  Friends
                                </button>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>
              )}
            </div>

            {/* CREATE POST */}
            <CreatePost
              addPost={fetchPosts}
            />

            {/* POSTS */}
            <div className="mt-6 pb-10">
              {loading ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-md p-10 text-center">
                  <p className="dark:text-white text-lg">
                    Loading posts...
                  </p>
                </div>
              ) : filteredPosts.length ===
                0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-md p-10 text-center">
                  <p className="text-gray-500 text-lg">
                    No posts found
                  </p>
                </div>
              ) : (
                filteredPosts.map(
                  (post) => (
                    <PostCard
                      key={post.id}
                      fetchPosts={
                        fetchPosts
                      }
                      post={post}
                    />
                  )
                )
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;