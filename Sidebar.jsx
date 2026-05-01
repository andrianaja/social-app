import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

function Sidebar() {
  const location = useLocation();

  const [unreadCount, setUnreadCount] =
    useState(0);

  const menu = [
    {
      name: "Home",
      path: "/",
      icon: "🏠",
    },
    {
      name: "Messages",
      path: "/chat",
      icon: "💬",
    },
    {
      name: "Friends",
      path: "/friends",
      icon: "👥",
    },
  ];

  // =========================
  // FETCH UNREAD
  // =========================
  const fetchUnreadMessages =
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } =
        await supabase
          .from("messages")
          .select("*")
          .eq("receiver", user.email)
          .eq("is_read", false);

      if (error) {
        console.log(error);
        return;
      }

      setUnreadCount(data.length || 0);
    };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    fetchUnreadMessages();

    // EVENT LISTENER
    window.addEventListener(
      "messages-read",
      fetchUnreadMessages
    );

    // REALTIME
    const channel = supabase
      .channel("messages-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async () => {
          await fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(
        "messages-read",
        fetchUnreadMessages
      );

      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-64 fixed left-0 top-16 h-screen bg-white dark:bg-gray-900 shadow-lg p-5 overflow-y-auto">
      {/* LOGO */}
      <h1 className="text-2xl font-bold mb-8 text-blue-600">
        SocialApp
      </h1>

      {/* MENU */}
      <div className="flex flex-col gap-3">
        {menu.map((item) => {
          const active =
            location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition text-lg font-medium ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>

                <span>{item.name}</span>
              </div>

              {/* BADGE */}
              {item.name ===
                "Messages" &&
                unreadCount > 0 && (
                  <div className="bg-red-500 text-white text-sm px-2 py-1 rounded-full min-w-[28px] text-center">
                    {unreadCount}
                  </div>
                )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;