import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

function PostCard({
  post,
  fetchPosts,
}) {
  const [likes, setLikes] =
    useState([]);

  const [comments, setComments] =
    useState([]);

  const [commentText, setCommentText] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [editing, setEditing] =
    useState(false);

  const [editText, setEditText] =
    useState(
      post.content || ""
    );

  const [showComments, setShowComments] =
    useState(false);

  const [profiles, setProfiles] =
    useState({});

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
  // FETCH PROFILES
  // =========================
  const fetchProfiles =
    async () => {
      const users = [
        post.user_email,
        ...comments.map(
          (c) =>
            c.user_email
        ),
      ];

      const uniqueUsers = [
        ...new Set(users),
      ];

      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .in(
            "email",
            uniqueUsers
          );

      if (error) {
        console.log(error);
        return;
      }

      const formatted = {};

      data?.forEach(
        (profile) => {
          formatted[
            profile.email
          ] = profile;
        }
      );

      setProfiles(formatted);
    };

  // =========================
  // FETCH LIKES
  // =========================
  const fetchLikes =
    async () => {
      const {
        data,
        error,
      } = await supabase
        .from("likes")
        .select("*")
        .eq(
          "post_id",
          Number(post.id)
        );

      if (error) {
        console.log(error);
        return;
      }

      setLikes(data || []);
    };

  // =========================
  // FETCH COMMENTS
  // =========================
  const fetchComments =
    async () => {
      const {
        data,
        error,
      } = await supabase
        .from("comments")
        .select("*")
        .eq(
          "post_id",
          Number(post.id)
        )
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.log(error);
        return;
      }

      setComments(data || []);
    };

  // =========================
  // ADD NOTIFICATION
  // =========================
  const addNotification =
    async ({
      receiver,
      type,
      content,
    }) => {
      if (
        !currentUser ||
        currentUser.email ===
          receiver
      )
        return;

      const { error } =
        await supabase
          .from(
            "notifications"
          )
          .insert([
            {
              sender:
                currentUser.email,

              receiver,

              type,

              post_id:
                post.id,

              content,

              is_read: false,
            },
          ]);

      if (error) {
        console.log(
          "NOTIFICATION ERROR",
          error
        );
      }
    };

  // =========================
  // ADD REACTION
  // =========================
  const addReaction =
    async (reaction) => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const {
        data: existing,
      } = await supabase
        .from("likes")
        .select("*")
        .eq(
          "post_id",
          Number(post.id)
        )
        .eq(
          "user_email",
          user.email
        );

      // UPDATE REACTION
      if (
        existing &&
        existing.length > 0
      ) {
        const oldReaction =
          existing[0]
            .reaction;

        // REMOVE REACTION
        if (
          oldReaction ===
          reaction
        ) {
          await supabase
            .from("likes")
            .delete()
            .eq(
              "post_id",
              Number(post.id)
            )
            .eq(
              "user_email",
              user.email
            );
        } else {
          // CHANGE REACTION
          await supabase
            .from("likes")
            .update({
              reaction,
            })
            .eq(
              "post_id",
              Number(post.id)
            )
            .eq(
              "user_email",
              user.email
            );
        }
      } else {
        // INSERT REACTION
        const { error } =
          await supabase
            .from("likes")
            .insert([
              {
                post_id:
                  Number(
                    post.id
                  ),

                user_email:
                  user.email,

                reaction,
              },
            ]);

        if (error) {
          console.log(error);
          return;
        }

        // NOTIFICATION
        await addNotification({
          receiver:
            post.user_email,

          type: "like",

          content: `${user.email} reacted ${reaction} to your post`,
        });
      }

      fetchLikes();
    };

  // =========================
  // COUNT REACTIONS
  // =========================
  const reactionCount = (
    emoji
  ) => {
    return likes.filter(
      (like) =>
        like.reaction ===
        emoji
    ).length;
  };

  // =========================
  // USER REACTION
  // =========================
  const myReaction =
    likes.find(
      (like) =>
        like.user_email ===
        currentUser?.email
    )?.reaction || "";

  // =========================
  // ADD COMMENT
  // =========================
  const addComment =
    async () => {
      if (
        !commentText.trim()
      )
        return;

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { error } =
        await supabase
          .from("comments")
          .insert([
            {
              post_id:
                Number(
                  post.id
                ),

              user_email:
                user.email,

              content:
                commentText,
            },
          ]);

      if (error) {
        console.log(error);
        return;
      }

      // NOTIFICATION
      await addNotification({
        receiver:
          post.user_email,

        type: "comment",

        content: `${user.email} commented on your post`,
      });

      setCommentText("");

      fetchComments();

      setShowComments(
        true
      );
    };

  // =========================
  // DELETE COMMENT
  // =========================
  const deleteComment =
    async (id) => {
      const { error } =
        await supabase
          .from("comments")
          .delete()
          .eq("id", id);

      if (error) {
        console.log(error);
        return;
      }

      fetchComments();
    };

  // =========================
  // DELETE POST
  // =========================
  const deletePost =
    async () => {
      const confirmDelete =
        window.confirm(
          "Delete this post?"
        );

      if (
        !confirmDelete
      )
        return;

      await supabase
        .from("comments")
        .delete()
        .eq(
          "post_id",
          Number(post.id)
        );

      await supabase
        .from("likes")
        .delete()
        .eq(
          "post_id",
          Number(post.id)
        );

      await supabase
        .from(
          "notifications"
        )
        .delete()
        .eq(
          "post_id",
          Number(post.id)
        );

      const { error } =
        await supabase
          .from("posts")
          .delete()
          .eq(
            "id",
            Number(post.id)
          );

      if (error) {
        alert(
          error.message
        );
        return;
      }

      if (fetchPosts) {
        fetchPosts();
      }
    };

  // =========================
  // UPDATE POST
  // =========================
  const updatePost =
    async () => {
      if (
        !editText.trim()
      )
        return;

      const { error } =
        await supabase
          .from("posts")
          .update({
            content:
              editText,
          })
          .eq(
            "id",
            Number(post.id)
          );

      if (error) {
        alert(
          error.message
        );
        return;
      }

      setEditing(false);

      if (fetchPosts) {
        fetchPosts();
      }
    };

  // =========================
  // SHARE POST
  // =========================
  const sharePost =
    async () => {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { error } =
        await supabase
          .from("posts")
          .insert([
            {
              user_email:
                user.email,

              content:
                post.content,

              image:
                post.image,

              video:
                post.video,

              shared_from:
                post.user_email,
            },
          ]);

      if (error) {
        alert(
          error.message
        );
        return;
      }

      // NOTIFICATION
      await addNotification({
        receiver:
          post.user_email,

        type: "share",

        content: `${user.email} shared your post`,
      });

      alert(
        "Post shared 🔥"
      );
    };

  // =========================
  // COPY LINK
  // =========================
  const copyLink =
    async () => {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${post.id}`
      );

      alert(
        "Link copied 🔥"
      );
    };

  // =========================
  // FORMAT DATE
  // =========================
  const formatDate = (
    date
  ) => {
    return new Date(
      date
    ).toLocaleString();
  };

  // =========================
  // USE EFFECT
  // =========================
  useEffect(() => {
    if (!post?.id) return;

    getCurrentUser();

    fetchLikes();

    fetchComments();

    // REALTIME LIKES
    const likesChannel =
      supabase
        .channel(
          `likes-${post.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "likes",

            filter: `post_id=eq.${post.id}`,
          },
          () => {
            fetchLikes();
          }
        )
        .subscribe();

    // REALTIME COMMENTS
    const commentsChannel =
      supabase
        .channel(
          `comments-${post.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "comments",

            filter: `post_id=eq.${post.id}`,
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        likesChannel
      );

      supabase.removeChannel(
        commentsChannel
      );
    };
  }, [post.id]);

  useEffect(() => {
    fetchProfiles();
  }, [comments]);

  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-lg mb-6 border border-gray-200 dark:border-gray-800">
      
      {/* AUTHOR */}
      <div className="flex items-center justify-between mb-4">
        
        <div className="flex items-center gap-3">
          
          <Link
            to={`/user/${post.user_email}`}
          >
            {profiles[
              post.user_email
            ]?.avatar ? (
              <img
                src={
                  profiles[
                    post
                      .user_email
                  ]?.avatar
                }
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                {post.user_email?.charAt(
                  0
                )}
              </div>
            )}
          </Link>

          <div>
            <Link
              to={`/user/${post.user_email}`}
              className="font-bold text-lg dark:text-white hover:text-blue-500"
            >
              {profiles[
                post.user_email
              ]?.username ||
                post.user_email}
            </Link>

            <p className="text-sm text-gray-500">
              {formatDate(
                post.created_at
              )}
            </p>

            {post.shared_from && (
              <p className="text-sm text-blue-500">
                Shared from{" "}
                {
                  post.shared_from
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {editing ? (
        <div className="mb-4">
          <textarea
            value={editText}
            onChange={(e) =>
              setEditText(
                e.target
                  .value
              )
            }
            className="w-full border p-4 rounded-2xl dark:bg-gray-800 dark:text-white"
            rows={4}
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={
                updatePost
              }
              className="bg-green-600 text-white px-5 py-2 rounded-xl"
            >
              Save
            </button>

            <button
              onClick={() =>
                setEditing(
                  false
                )
              }
              className="bg-gray-500 text-white px-5 py-2 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="dark:text-white mb-4 whitespace-pre-wrap text-[16px] leading-7">
          {post.content}
        </p>
      )}

      {/* IMAGE */}
      {post.image && (
        <img
          src={post.image}
          alt="post"
          className="rounded-3xl mb-4 max-h-[700px] w-full object-cover bg-black"
        />
      )}

      {/* VIDEO */}
      {post.video && (
        <video
          controls
          className="w-full rounded-3xl mb-4 max-h-[700px] bg-black"
        >
          <source
            src={post.video}
            type="video/mp4"
          />
        </video>
      )}

      {/* STATS */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <p>
          👍❤️😂😮😢🔥{" "}
          {likes.length} reactions
        </p>

        <p>
          {
            comments.length
          }{" "}
          comments
        </p>
      </div>

      {/* ACTIONS */}
      <div className="border-y dark:border-gray-700 py-3 flex items-center justify-between flex-wrap gap-2 mb-4">
        
        <div className="flex flex-wrap gap-2">
          {[
            "👍",
            "❤️",
            "😂",
            "😮",
            "😢",
            "🔥",
          ].map((emoji) => (
            <button
              key={emoji}
              onClick={() =>
                addReaction(
                  emoji
                )
              }
              className={`px-3 py-2 rounded-xl transition hover:scale-110 ${
                myReaction ===
                emoji
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 dark:text-white"
              }`}
            >
              {emoji}{" "}
              {reactionCount(
                emoji
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          
          <button
            onClick={() =>
              setShowComments(
                !showComments
              )
            }
            className="bg-gray-200 dark:bg-gray-700 dark:text-white px-4 py-2 rounded-xl"
          >
            💬 Comment
          </button>

          <button
            onClick={
              sharePost
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-xl"
          >
            🔁 Share
          </button>

          <button
            onClick={
              copyLink
            }
            className="bg-purple-600 text-white px-4 py-2 rounded-xl"
          >
            🔗 Copy
          </button>

          {currentUser?.email ===
            post.user_email && (
            <>
              <button
                onClick={() =>
                  setEditing(
                    true
                  )
                }
                className="bg-yellow-500 text-white px-4 py-2 rounded-xl"
              >
                ✏️ Edit
              </button>

              <button
                onClick={
                  deletePost
                }
                className="bg-red-600 text-white px-4 py-2 rounded-xl"
              >
                🗑 Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* COMMENT INPUT */}
      <div className="flex gap-2 mb-4">
        
        <input
          type="text"
          placeholder="Write a comment..."
          className="flex-1 border p-3 rounded-2xl dark:bg-gray-800 dark:text-white"
          value={commentText}
          onChange={(e) =>
            setCommentText(
              e.target
                .value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key ===
              "Enter"
            ) {
              addComment();
            }
          }}
        />

        <button
          onClick={
            addComment
          }
          className="bg-blue-600 text-white px-5 rounded-2xl"
        >
          Send
        </button>
      </div>

      {/* COMMENTS */}
      {showComments && (
        <div className="space-y-3">
          
          {comments.length ===
          0 ? (
            <p className="text-gray-500">
              No comments yet
            </p>
          ) : (
            comments.map(
              (
                comment
              ) => (
                <div
                  key={
                    comment.id
                  }
                  className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    <div className="flex gap-3">
                      
                      <Link
                        to={`/user/${comment.user_email}`}
                      >
                        {profiles[
                          comment
                            .user_email
                        ]
                          ?.avatar ? (
                          <img
                            src={
                              profiles[
                                comment
                                  .user_email
                              ]
                                ?.avatar
                            }
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            {comment.user_email?.charAt(
                              0
                            )}
                          </div>
                        )}
                      </Link>

                      <div>
                        <Link
                          to={`/user/${comment.user_email}`}
                          className="font-bold dark:text-white hover:text-blue-500"
                        >
                          {profiles[
                            comment
                              .user_email
                          ]
                            ?.username ||
                            comment.user_email}
                        </Link>

                        <p className="text-xs text-gray-500 mb-1">
                          {formatDate(
                            comment.created_at
                          )}
                        </p>

                        <p className="dark:text-white whitespace-pre-wrap">
                          {
                            comment.content
                          }
                        </p>
                      </div>
                    </div>

                    {(currentUser?.email ===
                      comment.user_email ||
                      currentUser?.email ===
                        post.user_email) && (
                      <button
                        onClick={() =>
                          deleteComment(
                            comment.id
                          )
                        }
                        className="text-red-500 text-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

export default PostCard;