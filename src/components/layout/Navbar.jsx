import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useState,
  useEffect,
  useRef,
} from "react";

import { supabase } from "../../lib/supabase";

function Navbar() {

  const navigate =
    useNavigate();

  const notifRef =
    useRef(null);

  const [darkMode, setDarkMode] =
    useState(false);

  const [notifications, setNotifications] =
    useState([]);

  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  const [currentUser, setCurrentUser] =
    useState(null);

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {

    const init = async () => {

      // DARK MODE
      const savedMode =
        localStorage.getItem(
          "darkMode"
        );

      if (savedMode === "true") {

        document.documentElement.classList.add(
          "dark"
        );

        setDarkMode(true);
      }

      // USER
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {

        setCurrentUser(user);

        fetchNotifications(
          user.email
        );
      }
    };

    init();

    // =========================
    // REALTIME NOTIFICATIONS
    // =========================
    const channel =
      supabase
        .channel(
          "notifications-navbar"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notifications",
          },
          async (
            payload
          ) => {

            const {
              data: { user },
            } =
              await supabase.auth.getUser();

            if (!user) return;

            // INSERT
            if (
              payload.new
                ?.receiver ===
              user.email
            ) {

              fetchNotifications(
                user.email
              );
            }

            // UPDATE
            if (
              payload.old
                ?.receiver ===
              user.email
            ) {

              fetchNotifications(
                user.email
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

  }, []);

  // =========================
  // CLOSE WHEN CLICK OUTSIDE
  // =========================
  useEffect(() => {

    const handleClickOutside =
      (event) => {

        if (
          notifRef.current &&
          !notifRef.current.contains(
            event.target
          )
        ) {

          setShowNotifications(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };

  }, []);

  // =========================
  // FETCH NOTIFICATIONS
  // =========================
  const fetchNotifications =
    async (email) => {

      const {
        data,
        error,
      } = await supabase
        .from(
          "notifications"
        )
        .select("*")
        .eq(
          "receiver",
          email
        )
        .order("id", {
          ascending: false,
        });

      if (error) {

        console.log(
          "NOTIF ERROR",
          error
        );

        return;
      }

      setNotifications(
        data || []
      );
    };

  // =========================
  // MARK AS READ
  // =========================
  const markAsRead =
    async () => {

      if (!currentUser)
        return;

      const { error } =
        await supabase
          .from(
            "notifications"
          )
          .update({
            is_read: true,
          })
          .eq(
            "receiver",
            currentUser.email
          )
          .eq(
            "is_read",
            false
          );

      if (error) {

        console.log(
          "READ ERROR",
          error
        );
      }

      fetchNotifications(
        currentUser.email
      );
    };

  // =========================
  // TOGGLE NOTIFICATIONS
  // =========================
  const toggleNotifications =
    async () => {

      const newState =
        !showNotifications;

      setShowNotifications(
        newState
      );

      if (newState) {

        await markAsRead();
      }
    };

  // =========================
  // UNREAD COUNT
  // =========================
  const unreadCount =
    notifications.filter(
      (notif) =>
        notif.is_read ===
        false
    ).length;

  // =========================
  // DARK MODE
  // =========================
  const toggleDarkMode =
    () => {

      if (darkMode) {

        document.documentElement.classList.remove(
          "dark"
        );

        localStorage.setItem(
          "darkMode",
          "false"
        );

      } else {

        document.documentElement.classList.add(
          "dark"
        );

        localStorage.setItem(
          "darkMode",
          "true"
        );
      }

      setDarkMode(
        !darkMode
      );
    };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout =
    async () => {

      await supabase.auth.signOut();

      navigate("/login");
    };

  return (

    <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b dark:border-gray-800 shadow-md">

      <div className="max-w-7xl mx-auto px-6 py-4 relative flex items-center justify-center">

        {/* LOGO */}
        <Link
          to="/"
          className="absolute left-6 text-3xl font-extrabold text-blue-600 tracking-tight"
        >
          SocialApp
        </Link>

        {/* CENTER MENU */}
        <div className="flex items-center gap-5">

          {/* PROFILE */}
          <Link
            to="/profile"
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition hover:scale-105 shadow-sm"
          >
            🧑
          </Link>

          {/* NOTIFICATIONS */}
          <div
            className="relative"
            ref={notifRef}
          >

            <button
              onClick={
                toggleNotifications
              }
              className="relative bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition hover:scale-105 shadow-sm"
            >
              🔔

              {/* BADGE */}
              {unreadCount >
                0 && (
                <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse shadow-lg">
                  {
                    unreadCount
                  }
                </div>
              )}
            </button>

            {/* DROPDOWN */}
            {showNotifications && (
              <div className="absolute right-0 mt-4 w-[380px] max-h-[500px] overflow-y-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border dark:border-gray-700 p-5">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-5">

                  <h2 className="text-xl font-bold dark:text-white">
                    Notifications
                  </h2>

                  <span className="text-sm text-gray-500">
                    {
                      notifications.length
                    } total
                  </span>

                </div>

                {/* EMPTY */}
                {notifications.length ===
                0 ? (

                  <div className="text-center py-10">

                    <p className="text-gray-500">
                      No notifications
                    </p>

                  </div>

                ) : (

                  <div className="space-y-3">

                    {notifications.map(
                      (
                        notif
                      ) => (

                        <div
                          key={
                            notif.id
                          }
                          className={`p-4 rounded-2xl border transition ${
                            notif.is_read
                              ? "bg-gray-100 dark:bg-gray-700 border-transparent"
                              : "bg-blue-100 dark:bg-blue-900 border-blue-400"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-3">

                            {/* CONTENT */}
                            <div className="flex-1">

                              <p className="dark:text-white text-sm leading-6 break-words">
                                {
                                  notif.content
                                }
                              </p>

                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(
                                  notif.created_at
                                ).toLocaleString()}
                              </p>

                            </div>

                            {/* ACTIONS */}
                            <div className="flex flex-col gap-2">

                              {/* OPEN POST */}
                              {notif.post_id && (

                                <Link
                                  to={`/post/${notif.post_id}`}
                                  onClick={() =>
                                    setShowNotifications(
                                      false
                                    )
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs whitespace-nowrap transition text-center"
                                >
                                  Open
                                </Link>

                              )}

                              {/* OPEN FRIEND REQUEST */}
                              {(notif.type === "friend" ||
                                notif.type ===
                                  "friend_accept") && (

                                <Link
                                  to="/friends"
                                  onClick={() =>
                                    setShowNotifications(
                                      false
                                    )
                                  }
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs whitespace-nowrap transition text-center"
                                >
                                  Open
                                </Link>

                              )}

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>
            )}

          </div>

          {/* DARK MODE */}
          <button
            onClick={
              toggleDarkMode
            }
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition hover:scale-105 shadow-sm"
          >
            {darkMode
              ? "☀️"
              : "🌙"}
          </button>

          {/* LOGOUT */}
          <button
            onClick={
              handleLogout
            }
            className="bg-red-500 hover:bg-red-600 text-white px-6 h-14 rounded-2xl transition shadow-md font-semibold"
          >
            Logout
          </button>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;