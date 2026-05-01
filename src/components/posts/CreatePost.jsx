import { useState } from "react";
import { supabase } from "../../lib/supabase";

function CreatePost({ addPost }) {
  const [content, setContent] =
    useState("");

  const [file, setFile] =
    useState(null);

  const handlePost = async () => {
    if (!content && !file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let imageUrl = "";
    let videoUrl = "";

    // =========================
    // UPLOAD FILE
    // =========================
    if (file) {
      const fileExt =
        file.name.split(".").pop();

      const fileName =
        `${Date.now()}.${fileExt}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("posts")
        .upload(fileName, file);

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("posts")
        .getPublicUrl(fileName);

      // IMAGE
      if (
        file.type.startsWith(
          "image/"
        )
      ) {
        imageUrl = publicUrl;
      }

      // VIDEO
      if (
        file.type.startsWith(
          "video/"
        )
      ) {
        videoUrl = publicUrl;
      }
    }

    // =========================
    // INSERT POST
    // =========================
    const { error } = await supabase
      .from("posts")
      .insert([
        {
          content,
          image: imageUrl,
          video: videoUrl,
          user_email: user.email,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    // RESET
    setContent("");
    setFile(null);

    addPost();

    alert("Post published 🔥");
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-md mb-6">
      {/* TEXTAREA */}
      <textarea
        placeholder="What's on your mind?"
        className="w-full border rounded-lg p-4 outline-none resize-none bg-white dark:bg-gray-800 text-black dark:text-white"
        rows="4"
        value={content}
        onChange={(e) =>
          setContent(e.target.value)
        }
      ></textarea>

      {/* FILE INPUT */}
      <input
        type="file"
        accept="image/*,video/*"
        className="mt-4 text-black dark:text-white"
        onChange={(e) =>
          setFile(e.target.files[0])
        }
      />

      {/* PREVIEW IMAGE */}
      {file &&
        file.type.startsWith(
          "image/"
        ) && (
          <img
            src={URL.createObjectURL(
              file
            )}
            alt="preview"
            className="mt-4 rounded-xl max-h-[400px] w-full object-contain"
          />
        )}

      {/* PREVIEW VIDEO */}
      {file &&
        file.type.startsWith(
          "video/"
        ) && (
          <video
            controls
            className="mt-4 rounded-xl max-h-[400px] w-full bg-black"
          >
            <source
              src={URL.createObjectURL(
                file
              )}
            />
          </video>
        )}

      {/* BUTTON */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handlePost}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Post
        </button>
      </div>
    </div>
  );
}

export default CreatePost;