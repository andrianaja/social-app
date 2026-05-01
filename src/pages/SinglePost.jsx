import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import Sidebar from "../components/layout/Sidebar";

import PostCard from "../components/posts/PostCard";

import { supabase } from "../lib/supabase";

function SinglePost() {

  const { id } = useParams();

  const [post, setPost] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // FETCH POST
  // =========================
  const fetchPost =
    async () => {

      const { data, error } =
        await supabase
          .from("posts")
          .select("*")
          .eq("id", Number(id))
          .single();

      if (error) {
        console.log(error);

        setLoading(false);

        return;
      }

      setPost(data);

      setLoading(false);
    };

  useEffect(() => {
    fetchPost();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">

      <Navbar />

      <div className="flex pt-24">

        {/* SIDEBAR */}
        <div className="hidden lg:block w-[280px]">
          <Sidebar />
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex justify-center px-4">

          <div className="w-full max-w-3xl">

            {loading ? (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl text-center dark:text-white">
                Loading...
              </div>
            ) : !post ? (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl text-center text-red-500">
                Post not found
              </div>
            ) : (
              <PostCard
                post={post}
                fetchPosts={fetchPost}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default SinglePost;