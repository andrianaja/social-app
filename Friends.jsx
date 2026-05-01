import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import { supabase } from "../lib/supabase";

function Friends() {
  const [currentUser, setCurrentUser] =
    useState(null);

  const [friends, setFriends] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [search, setSearch] =
    useState("");

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

        fetchFriends(user.email);

        fetchRequests(user.email);
      }
    };

  // =========================
  // FETCH FRIENDS
  // =========================
  const fetchFriends =
    async (email) => {
      const { data, error } =
        await supabase
          .from("friends")
          .select("*")
          .or(
            `sender.eq.${email},receiver.eq.${email}`
          )
          .eq(
            "status",
            "accepted"
          );

      if (error) {
        console.log(error);
        return;
      }

      setFriends(data || []);
    };

  // =========================
  // FETCH REQUESTS
  // =========================
  const fetchRequests =
    async (email) => {
      const { data, error } =
        await supabase
          .from("friends")
          .select("*")
          .eq(
            "receiver",
            email
          )
          .eq(
            "status",
            "pending"
          );

      if (error) {
        console.log(error);
        return;
      }

      setRequests(data || []);
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
        console.log(error);
        return;
      }

      setUsers(data || []);
    };

  // =========================
  // ACCEPT FRIEND
  // =========================
  const acceptFriend =
    async (id, sender) => {

      const { error } =
        await supabase
          .from("friends")
          .update({
            status: "accepted",
          })
          .eq("id", id);

      if (error) {
        console.log(error);
        return;
      }

      // notification
      if (currentUser) {
        await supabase
          .from(
            "notifications"
          )
          .insert([
            {
              sender:
                currentUser.email,

              receiver:
                sender,

              type:
                "friend_accept",

              content: `${currentUser.email} accepted your friend request`,
            },
          ]);
      }

      fetchFriends(
        currentUser.email
      );

      fetchRequests(
        currentUser.email
      );
    };

  // =========================
  // REJECT FRIEND
  // =========================
  const rejectFriend =
    async (id) => {

      const { error } =
        await supabase
          .from("friends")
          .delete()
          .eq("id", id);

      if (error) {
        console.log(error);
        return;
      }

      fetchRequests(
        currentUser.email
      );
    };

  // =========================
  // ADD FRIEND
  // =========================
  const addFriend =
    async (email) => {

      if (!currentUser)
        return;

      if (
        email ===
        currentUser.email
      )
        return;

      // CHECK EXISTING
      const { data: existing } =
        await supabase
          .from("friends")
          .select("*")
          .or(
            `and(sender.eq.${currentUser.email},receiver.eq.${email}),and(sender.eq.${email},receiver.eq.${currentUser.email})`
          );

      if (
        existing &&
        existing.length > 0
      ) {
        alert(
          "Already friends or pending request"
        );

        return;
      }

      const { error } =
        await supabase
          .from("friends")
          .insert([
            {
              sender:
                currentUser.email,

              receiver: email,

              status:
                "pending",
            },
          ]);

      if (error) {
        console.log(error);
        return;
      }

      // notification
      await supabase
        .from("notifications")
        .insert([
          {
            sender:
              currentUser.email,

            receiver: email,

            type: "friend",

            content: `${currentUser.email} sent you a friend request`,
          },
        ]);

      alert(
        "Friend request sent 🔥"
      );
    };

  // =========================
  // REMOVE FRIEND
  // =========================
  const removeFriend =
    async (friendId) => {

      const confirmDelete =
        window.confirm(
          "Remove this friend?"
        );

      if (!confirmDelete)
        return;

      const { error } =
        await supabase
          .from("friends")
          .delete()
          .eq("id", friendId);

      if (error) {
        console.log(error);
        return;
      }

      fetchFriends(
        currentUser.email
      );
    };

  // =========================
  // CHECK RELATIONSHIP
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

      if (relation)
        return "friends";

      const pending =
        requests.find(
          (r) =>
            r.sender ===
            email
        );

      if (pending)
        return "request";

      return null;
    };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    getCurrentUser();

    fetchUsers();

    // REALTIME
    const channel =
      supabase
        .channel(
          "friends-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friends",
          },
          () => {
            if (
              currentUser
            ) {
              fetchFriends(
                currentUser.email
              );

              fetchRequests(
                currentUser.email
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [currentUser]);

  // =========================
  // FILTER USERS
  // =========================
  const filteredUsers =
    users.filter((user) => {

      const username =
        user.username || "";

      const email =
        user.email || "";

      return (
        username
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        email
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      );
    });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">

      <Navbar />

      <div className="flex pt-24">

        {/* SIDEBAR */}
        <div className="hidden md:block w-72">

          <div className="fixed top-24 left-0 w-72 h-screen bg-white dark:bg-gray-900 border-r dark:border-gray-800 p-6">

            <div className="space-y-4">

              <Link
                to="/"
                className="flex items-center gap-3 text-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 p-3 rounded-xl transition"
              >
                🏠 Home
              </Link>

              <Link
                to="/chat"
                className="flex items-center gap-3 text-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 p-3 rounded-xl transition"
              >
                💬 Messages
              </Link>

              <Link
                to="/friends"
                className="flex items-center gap-3 text-lg bg-blue-600 text-white p-3 rounded-xl"
              >
                👥 Friends
              </Link>

            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 max-w-5xl mx-auto p-6">

          {/* SEARCH */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-md mb-6">

            <input
              type="text"
              placeholder="Search username or email..."
              className="w-full p-4 rounded-2xl border dark:bg-gray-800 dark:text-white outline-none"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

          </div>

          {/* FRIEND REQUESTS */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-md mb-6">

            <h2 className="text-2xl font-bold mb-5 dark:text-white">
              Friend Requests
            </h2>

            {requests.length ===
            0 ? (
              <p className="text-gray-500">
                No requests
              </p>
            ) : (
              <div className="space-y-4">

                {requests.map(
                  (request) => (

                    <div
                      key={
                        request.id
                      }
                      className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl"
                    >

                      <Link
                        to={`/user/${request.sender}`}
                        className="font-bold dark:text-white hover:text-blue-500 break-all"
                      >
                        {
                          request.sender
                        }
                      </Link>

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            acceptFriend(
                              request.id,
                              request.sender
                            )
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition"
                        >
                          Accept
                        </button>

                        <button
                          onClick={() =>
                            rejectFriend(
                              request.id
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition"
                        >
                          Reject
                        </button>

                      </div>
                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* FRIENDS */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-md mb-6">

            <h2 className="text-2xl font-bold mb-5 dark:text-white">
              My Friends
            </h2>

            {friends.length ===
            0 ? (
              <p className="text-gray-500">
                No friends
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">

                {friends.map(
                  (friend) => {

                    const friendEmail =
                      friend.sender ===
                      currentUser?.email
                        ? friend.receiver
                        : friend.sender;

                    const profile =
                      users.find(
                        (u) =>
                          u.email ===
                          friendEmail
                      );

                    return (
                      <div
                        key={
                          friend.id
                        }
                        className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl flex items-center justify-between"
                      >

                        <Link
                          to={`/user/${friendEmail}`}
                          className="flex items-center gap-3"
                        >

                          {profile?.avatar ? (
                            <img
                              src={
                                profile.avatar
                              }
                              alt=""
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              {friendEmail?.charAt(
                                0
                              )}
                            </div>
                          )}

                          <div>

                            <p className="font-bold dark:text-white">
                              {profile?.username ||
                                friendEmail}
                            </p>

                            <p className="text-sm text-gray-500 break-all">
                              {
                                friendEmail
                              }
                            </p>

                          </div>
                        </Link>

                        <button
                          onClick={() =>
                            removeFriend(
                              friend.id
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition"
                        >
                          Remove
                        </button>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* DISCOVER USERS */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-md">

            <h2 className="text-2xl font-bold mb-5 dark:text-white">
              Discover Users
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {filteredUsers
                .filter(
                  (user) =>
                    user.email !==
                    currentUser?.email
                )
                .map((user) => {

                  const status =
                    getFriendStatus(
                      user.email
                    );

                  return (
                    <div
                      key={
                        user.email
                      }
                      className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl flex items-center justify-between gap-4"
                    >

                      <Link
                        to={`/user/${user.email}`}
                        className="flex items-center gap-3 flex-1"
                      >

                        {user.avatar ? (
                          <img
                            src={
                              user.avatar
                            }
                            alt=""
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {user.email?.charAt(
                              0
                            )}
                          </div>
                        )}

                        <div>

                          <p className="font-bold dark:text-white">
                            {user.username ||
                              user.email}
                          </p>

                          <p className="text-sm text-gray-500 break-all">
                            {user.email}
                          </p>

                        </div>
                      </Link>

                      {status ===
                      "friends" ? (
                        <div className="bg-green-600 text-white px-4 py-2 rounded-xl">
                          Friends
                        </div>
                      ) : status ===
                        "request" ? (
                        <div className="bg-yellow-500 text-white px-4 py-2 rounded-xl">
                          Pending
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            addFriend(
                              user.email
                            )
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl whitespace-nowrap transition"
                        >
                          Add
                        </button>
                      )}

                    </div>
                  );
                })}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Friends;