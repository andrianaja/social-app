import {
  useEffect,
  useState,
  useRef,
} from "react";

import { Link } from "react-router-dom";

import { supabase } from "../lib/supabase";

function Chat() {
  const [profiles, setProfiles] =
    useState([]);

  const [messages, setMessages] =
    useState([]);

  const [content, setContent] =
    useState("");

  const [receiver, setReceiver] =
    useState("");

  const [newUser, setNewUser] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [image, setImage] =
    useState(null);

  const [conversations, setConversations] =
    useState([]);

  const [unreadUsers, setUnreadUsers] =
    useState([]);

  const [
    isFriend,
    setIsFriend,
  ] = useState(false);

  const messagesEndRef = useRef(null);

  // =========================
  // AUTO SCROLL
  // =========================
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // =========================
  // GET PROFILE
  // =========================
  const getProfile = (email) => {
    return profiles.find(
      (p) => p.email === email
    );
  };

  // =========================
  // FETCH PROFILES
  // =========================
  const fetchProfiles =
    async () => {
      const { data, error } =
        await supabase
          .from("profiles")
          .select("*");

      if (error) {
        console.log(error);
        return;
      }

      setProfiles(data || []);
    };

  // =========================
  // FETCH CONVERSATIONS
  // =========================
  const fetchConversations =
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setCurrentUser(user);

      const { data, error } =
        await supabase
          .from("messages")
          .select("*")
          .or(
            `sender.eq.${user.email},receiver.eq.${user.email}`
          )
          .order("id", {
            ascending: false,
          });

      if (error) {
        console.log(error);
        return;
      }

      const uniqueUsers = [];

      data.forEach((msg) => {
        const otherUser =
          msg.sender === user.email
            ? msg.receiver
            : msg.sender;

        if (
          !uniqueUsers.includes(
            otherUser
          )
        ) {
          uniqueUsers.push(
            otherUser
          );
        }
      });

      setConversations(
        uniqueUsers
      );

      // UNREAD
      const unread = [];

      data.forEach((msg) => {
        if (
          msg.receiver ===
            user.email &&
          msg.is_read === false
        ) {
          if (
            !unread.includes(
              msg.sender
            )
          ) {
            unread.push(
              msg.sender
            );
          }
        }
      });

      setUnreadUsers(unread);
    };

  // =========================
  // CHECK FRIENDSHIP
  // =========================
  const checkFriendship =
    async (
      senderEmail,
      receiverEmail
    ) => {
      const { data } =
        await supabase
          .from("friends")
          .select("*")
          .or(
            `and(sender.eq.${senderEmail},receiver.eq.${receiverEmail}),and(sender.eq.${receiverEmail},receiver.eq.${senderEmail})`
          )
          .eq(
            "status",
            "accepted"
          );

      return (
        data &&
        data.length > 0
      );
    };

  // =========================
  // UPDATE FRIEND STATUS
  // =========================
  const updateFriendStatus =
    async () => {
      if (
        !currentUser ||
        !receiver
      ) {
        setIsFriend(false);
        return;
      }

      const accepted =
        await checkFriendship(
          currentUser.email,
          receiver
        );

      setIsFriend(accepted);
    };

  // =========================
  // MARK READ
  // =========================
  const markMessagesAsRead =
    async () => {
      if (!receiver) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from("messages")
        .update({
          is_read: true,
        })
        .eq(
          "sender",
          receiver
        )
        .eq(
          "receiver",
          user.email
        )
        .eq(
          "is_read",
          false
        );

      fetchConversations();
    };

  // =========================
  // FETCH MESSAGES
  // =========================
  const fetchMessages =
    async () => {
      if (!receiver) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user);

      await markMessagesAsRead();

      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender.eq.${user.email},receiver.eq.${receiver}),and(sender.eq.${receiver},receiver.eq.${user.email})`
        )
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.log(error);
        return;
      }

      setMessages(data || []);
    };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage =
    async () => {
      if (!content && !image)
        return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // CHECK FRIEND
      const accepted =
        await checkFriendship(
          user.email,
          receiver
        );

      if (!accepted) {
        alert(
          "You must be friends to send messages"
        );

        return;
      }

      let imageUrl = "";

      // IMAGE
      if (image) {
        const fileName = `${Date.now()}-${
          image.name
        }`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("posts")
          .upload(
            fileName,
            image
          );

        if (uploadError) {
          alert(
            uploadError.message
          );
          return;
        }

        const { data } =
          supabase.storage
            .from("posts")
            .getPublicUrl(
              fileName
            );

        imageUrl =
          data.publicUrl;
      }

      const { error } =
        await supabase
          .from("messages")
          .insert([
            {
              sender:
                user.email,
              receiver,
              content,
              image: imageUrl,
              is_read: false,
            },
          ]);

      if (error) {
        alert(error.message);
        return;
      }

      setContent("");
      setImage(null);

      fetchMessages();
      fetchConversations();
    };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    fetchProfiles();

    fetchConversations();

    fetchMessages();

    updateFriendStatus();

    // REALTIME
    const channel = supabase
      .channel(
        "messages-channel"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchMessages();

          fetchConversations();
        }
      )
      .subscribe();

    // FRIENDS REALTIME
    const friendsChannel =
      supabase
        .channel(
          "friends-chat"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friends",
          },
          () => {
            updateFriendStatus();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );

      supabase.removeChannel(
        friendsChannel
      );
    };
  }, [receiver]);

  // =========================
  // AUTO SCROLL
  // =========================
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
      {/* SIDEBAR */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r dark:border-gray-800 p-4 fixed left-0 top-0 h-screen overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-600">
            Messages
          </h1>

          <Link
            to="/"
            className="bg-gray-200 dark:bg-gray-800 dark:text-white px-4 py-2 rounded-xl"
          >
            ← Home
          </Link>
        </div>

        {/* NEW MESSAGE */}
        <div className="mb-5">
          <input
            type="email"
            placeholder="User email..."
            value={newUser}
            onChange={(e) =>
              setNewUser(
                e.target.value
              )
            }
            className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:text-white"
          />

          <button
            onClick={() => {
              if (!newUser)
                return;

              setReceiver(
                newUser
              );

              setNewUser("");
            }}
            className="w-full mt-2 bg-blue-600 text-white p-3 rounded-xl"
          >
            + New Message
          </button>
        </div>

        {/* CONVERSATIONS */}
        <div className="space-y-3">
          {conversations.length ===
          0 ? (
            <p className="text-gray-500">
              No conversations
            </p>
          ) : (
            conversations.map(
              (user) => (
                <button
                  key={user}
                  onClick={() =>
                    setReceiver(
                      user
                    )
                  }
                  className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between ${
                    receiver ===
                    user
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 dark:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getProfile(
                      user
                    )?.avatar ? (
                      <img
                        src={
                          getProfile(
                            user
                          )?.avatar
                        }
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-400"></div>
                    )}

                    <div>
                      <p className="font-bold">
                        {getProfile(
                          user
                        )
                          ?.username ||
                          user}
                      </p>

                      <p className="text-xs opacity-70">
                        {user}
                      </p>
                    </div>
                  </div>

                  {unreadUsers.includes(
                    user
                  ) && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </button>
              )
            )
          )}
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 ml-80 flex justify-center p-6">
        <div className="w-full max-w-4xl">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl h-[92vh] flex flex-col overflow-hidden">
            {/* HEADER */}
            <div className="border-b dark:border-gray-700 p-5">
              {receiver ? (
                <div className="flex items-center gap-4">
                  {getProfile(
                    receiver
                  )?.avatar ? (
                    <img
                      src={
                        getProfile(
                          receiver
                        )?.avatar
                      }
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-400"></div>
                  )}

                  <div>
                    <h2 className="text-2xl font-bold text-blue-600">
                      {getProfile(
                        receiver
                      )
                        ?.username ||
                        receiver}
                    </h2>

                    <p className="text-gray-500 text-sm">
                      {receiver}
                    </p>

                    {!isFriend && (
                      <p className="text-red-500 text-xs mt-1">
                        You are not friends
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <h2 className="text-2xl font-bold text-blue-600">
                  Select
                  conversation
                </h2>
              )}
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-950">
              {messages.map(
                (
                  msg,
                  index
                ) => {
                  const isMine =
                    msg.sender ===
                    currentUser?.email;

                  return (
                    <div
                      key={
                        msg.id
                      }
                      className={`flex ${
                        isMine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-md px-5 py-3 rounded-3xl shadow-md text-white ${
                          isMine
                            ? "bg-blue-600"
                            : "bg-gray-500"
                        }`}
                      >
                        {msg.content && (
                          <p className="mb-2 whitespace-pre-wrap">
                            {
                              msg.content
                            }
                          </p>
                        )}

                        {msg.image && (
                          <img
                            src={
                              msg.image
                            }
                            alt=""
                            className="rounded-2xl max-h-80"
                          />
                        )}

                        <p className="text-[10px] opacity-70 mt-2">
                          {new Date(
                            msg.created_at
                          ).toLocaleTimeString()}
                        </p>

                        {/* VU */}
                        {isMine &&
                          index ===
                            messages.length -
                              1 && (
                            <p className="text-xs mt-1 opacity-80">
                              {msg.is_read
                                ? "Vu"
                                : "Envoyé"}
                            </p>
                          )}
                      </div>
                    </div>
                  );
                }
              )}

              <div
                ref={
                  messagesEndRef
                }
              ></div>
            </div>

            {/* INPUT */}
            {receiver &&
              isFriend && (
                <div className="border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImage(
                        e.target
                          .files[0]
                      )
                    }
                    className="mb-3 dark:text-white"
                  />

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Write message..."
                      className="flex-1 border p-4 rounded-2xl dark:bg-gray-800 dark:text-white"
                      value={content}
                      onChange={(e) =>
                        setContent(
                          e.target
                            .value
                        )
                      }
                    />

                    <button
                      onClick={
                        sendMessage
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-bold"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;