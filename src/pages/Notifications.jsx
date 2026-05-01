import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { supabase } from "../lib/supabase";

function Notifications() {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // FETCH NOTIFICATIONS
  // =========================
  const fetchNotifications =
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } =
        await supabase
          .from("notifications")
          .select("*")
          .eq(
            "receiver",
            user.email
          )
          .order("id", {
            ascending: false,
          });

      if (error) {
        console.log(error);
        return;
      }

      setNotifications(data || []);

      setLoading(false);
    };

  // =========================
  // MARK AS READ
  // =========================
  const markAsRead =
    async (id) => {
      await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", id);

      fetchNotifications();
    };

  // =========================
  // READ ALL
  // =========================
  const readAll = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq(
        "receiver",
        user.email
      );

    fetchNotifications();
  };

  // =========================
  // REALTIME
  // =========================
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(
        "notifications-channel"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-2xl dark:text-white">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-blue-600">
            Notifications
          </h1>

          <div className="flex gap-3">
            <button
              onClick={readAll}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl"
            >
              Read all
            </button>

            <Link
              to="/"
              className="bg-gray-300 dark:bg-gray-800 dark:text-white px-4 py-2 rounded-xl"
            >
              Home
            </Link>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="space-y-4">
          {notifications.length ===
          0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 text-center shadow">
              <p className="text-gray-500 text-lg">
                No notifications
              </p>
            </div>
          ) : (
            notifications.map(
              (notif) => (
                <div
                  key={notif.id}
                  className={`p-5 rounded-2xl shadow transition border ${
                    notif.is_read
                      ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      : "bg-blue-50 dark:bg-blue-950 border-blue-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="dark:text-white text-lg">
                        {
                          notif.content
                        }
                      </p>

                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(
                          notif.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!notif.is_read && (
                        <button
                          onClick={() =>
                            markAsRead(
                              notif.id
                            )
                          }
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm"
                        >
                          Read
                        </button>
                      )}

                      {notif.post_id && (
                        <Link
                          to={`/post/${notif.post_id}`}
                          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm"
                        >
                          Open
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;